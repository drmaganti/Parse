import { FIELDS, OPS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { complete } from "./llm";
import { fallbackParse, type ParsedScreen } from "./fallback-parse";
import { applyRefinement, validRanking, type RefinementAction } from "./filter-ops";

export interface ParseResult extends ParsedScreen {
  source: "model" | "fallback";
  actions?: RefinementAction[];
}

function vocab() {
  return Object.values(FIELDS)
    .map((m) => `${m.key} (${m.label}${m.unit ? ", " + m.unit : ""}${m.kind === "cat" ? ", one of: " + SECTORS.join("/") : ""})`)
    .join("; ");
}

function rankVocab() {
  return Object.values(RANKINGS).map((r) => `${r.key} (${r.label})`).join("; ");
}

function buildNewSystem(): string {
  return [
    "You convert a plain-English US stock screen into strict JSON.",
    `Only use these filter fields: ${vocab()}.`,
    "Numeric operators: <, <=, >, >=, ==. Categorical sector operators: == and !=.",
    "A range is represented as two filters on the same field. Example: P/E between 10 and 20 => pe>=10 and pe<=20.",
    "For exclusions such as 'exclude Energy', use sector != Energy.",
    `Ranking must be exactly one of: ${rankVocab()}.`,
    "When the request is vague, translate only into supported concrete filters and record each judgment in assumptions.",
    'Respond ONLY with minified JSON: {"filters":[{"field":"pe","op":"<","value":15}],"ranking":"value","interpretation":"one short sentence","assumptions":[]}',
  ].join(" ");
}

function buildRefineSystem(previous: Filter[]): string {
  return [
    "You update an existing stock screen from one short user instruction. This is NOT a conversation and you must not regenerate unrelated criteria.",
    `Only use these filter fields: ${vocab()}.`,
    "Numeric operators: <, <=, >, >=, ==. Categorical sector operators: == and !=.",
    `Current filters: ${JSON.stringify(previous.map(({ field, op, value, source }) => ({ field, op, value, source })))}.`,
    "Return only changes as actions. Allowed action types: add, remove, replace.",
    "Use add for a new criterion. Keep every unrelated existing filter exactly as-is.",
    "Use remove only when the user explicitly asks to remove/drop/delete a criterion. A remove action may specify only field to remove all conditions on that metric.",
    "Use replace only when the user explicitly changes an existing criterion or says 'instead'. Replace removes existing conditions for that field before adding the new one.",
    "Never change a numeric threshold merely because a new criterion was added.",
    "Ranges are two add actions on the same field unless the user explicitly replaces that field.",
    "Exclusions such as 'exclude Energy' use sector != Energy.",
    `If ranking changes, ranking must be one of: ${rankVocab()}; otherwise return null.`,
    'Respond ONLY with minified JSON: {"actions":[{"type":"add","field":"revGrowth","op":">","value":10}],"ranking":null,"interpretation":"one short sentence","assumptions":[]}',
  ].join(" ");
}

function extractJson(text: string): any {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in model output");
  return JSON.parse(clean.slice(start, end + 1));
}

let counter = 0;
function coerceFilter(raw: any, source: Filter["source"] = "ai"): Filter | null {
  const meta = FIELDS[raw?.field];
  if (!meta) return null;
  if (!OPS.includes(raw?.op)) return null;
  const op = raw.op as Op;
  if (meta.kind === "cat" && op !== "==" && op !== "!=") return null;
  if (meta.kind === "num" && op === "!=") return null;

  let value: number | string = raw?.value;
  if (meta.kind === "num") {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    value = n;
  } else {
    const hit = SECTORS.find((s) => s.toLowerCase() === String(value).toLowerCase());
    if (!hit) return null;
    value = hit;
  }
  return { id: `${raw.field}_${op}_${counter++}`, field: raw.field, op, value, source };
}

function coerceFilters(rawFilters: any[]): Filter[] {
  return (rawFilters ?? []).map((f) => coerceFilter(f)).filter(Boolean) as Filter[];
}

function coerceActions(rawActions: any[]): RefinementAction[] {
  const actions: RefinementAction[] = [];
  for (const raw of rawActions ?? []) {
    if (!["add", "remove", "replace"].includes(raw?.type) || !FIELDS[raw?.field]) continue;
    if (raw.type === "remove") {
      const action: RefinementAction = { type: "remove", field: raw.field };
      if (raw.op && OPS.includes(raw.op)) (action as any).op = raw.op;
      if (raw.value !== undefined) (action as any).value = raw.value;
      actions.push(action);
      continue;
    }
    const filter = coerceFilter(raw);
    if (!filter) continue;
    actions.push({ type: raw.type, field: filter.field, op: filter.op, value: filter.value });
  }
  return actions;
}

export async function parseQuery(
  query: string,
  prev: Filter[] = [],
  _lockedIds: string[] = []
): Promise<ParseResult> {
  const isRefine = prev.length > 0;
  try {
    const rawText = await complete({ system: isRefine ? buildRefineSystem(prev) : buildNewSystem(), user: query });
    const parsed = extractJson(rawText);

    if (isRefine) {
      const actions = coerceActions(parsed.actions);
      if (!actions.length && !validRanking(parsed.ranking)) throw new Error("no valid refinement actions");
      const filters = applyRefinement(prev, actions, "ai");
      return {
        filters,
        ranking: validRanking(parsed.ranking) ?? "marketCap",
        interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : "Updated the screen.",
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: any) => typeof a === "string") : [],
        actions,
        source: "model",
      };
    }

    const filters = coerceFilters(parsed.filters);
    if (!filters.length) throw new Error("no valid filters");
    return {
      filters,
      ranking: validRanking(parsed.ranking) ?? "marketCap",
      interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : "Interpreted your request into the filters below.",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: any) => typeof a === "string") : [],
      source: "model",
    };
  } catch {
    return { ...fallbackParse(query, prev), source: "fallback" };
  }
}
