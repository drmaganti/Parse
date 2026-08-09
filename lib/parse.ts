import { FIELDS, OPS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { complete } from "./llm";
import { fallbackParse, type ParsedScreen } from "./fallback-parse";

// One model call turns a sentence into a structured screen. No orchestration,
// no routing. Locked (user-edited) filters are preserved on refinement so
// natural-language edits patch the set rather than regenerate it.

export interface ParseResult extends ParsedScreen {
  source: "model" | "fallback";
}

function buildSystem(locked: Filter[]): string {
  const vocab = Object.values(FIELDS)
    .map((m) => `${m.key} (${m.label}${m.unit ? ", " + m.unit : ""}${m.kind === "cat" ? ", one of: " + SECTORS.join("/") : ""})`)
    .join("; ");
  const rankKeys = Object.values(RANKINGS).map((r) => `${r.key} (${r.label})`).join("; ");

  return [
    "You convert a plain-English US stock screen into a strict JSON object.",
    `Only use these filter fields: ${vocab}.`,
    "Operators: <, <=, >, >=, == (use == only for sector).",
    `Ranking must be exactly one of: ${rankKeys}.`,
    locked.length
      ? `This is a refinement. Keep these locked filters EXACTLY and only add or change others: ${JSON.stringify(locked.map(({ field, op, value }) => ({ field, op, value })))}.`
      : "",
    "When the request is vague (e.g. 'safe', 'quality'), translate it into concrete filters and record each leap in \"assumptions\".",
    'Respond with ONLY minified JSON of shape: {"filters":[{"field":"pe","op":"<","value":15}],"ranking":"value","interpretation":"one short sentence","assumptions":["..."]}',
  ].filter(Boolean).join(" ");
}

function extractJson(text: string): any {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in model output");
  return JSON.parse(clean.slice(start, end + 1));
}

let counter = 0;
function coerce(rawFilters: any[], locked: Filter[]): Filter[] {
  const valid: Filter[] = [];
  for (const f of rawFilters ?? []) {
    const meta = FIELDS[f?.field];
    if (!meta) continue;
    if (!OPS.includes(f?.op)) continue;
    let value: number | string = f?.value;
    if (meta.kind === "num") {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      value = n;
    } else {
      // sector: snap to a known sector, case-insensitively
      const hit = SECTORS.find((s) => s.toLowerCase() === String(value).toLowerCase());
      if (!hit) continue;
      value = hit;
    }
    valid.push({ id: `${f.field}_${f.op}_${counter++}`, field: f.field, op: f.op as Op, value, source: "ai" });
  }
  // Sticky merge: locked filters win, model may add non-conflicting fields.
  const lockedFields = new Set(locked.map((f) => f.field));
  return [...locked, ...valid.filter((f) => !lockedFields.has(f.field))];
}

export async function parseQuery(
  query: string,
  prev: Filter[] = [],
  lockedIds: string[] = []
): Promise<ParseResult> {
  const locked = prev.filter((f) => lockedIds.includes(f.id));
  try {
    const raw = await complete({ system: buildSystem(locked), user: query });
    const parsed = extractJson(raw);
    const filters = coerce(parsed.filters, locked);
    if (!filters.length) throw new Error("no valid filters");
    return {
      filters,
      ranking: RANKINGS[parsed.ranking] ? parsed.ranking : "marketCap",
      interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : "Interpreted your request into the filters below.",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: any) => typeof a === "string") : [],
      source: "model",
    };
  } catch {
    return { ...fallbackParse(query, prev, lockedIds), source: "fallback" };
  }
}
