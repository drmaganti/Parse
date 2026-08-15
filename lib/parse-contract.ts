import { FIELDS, OPS, SECTORS, type Filter, type Op } from "./fields";
import { sameFilter, type RefinementAction } from "./filter-ops";

const hasField = (field: unknown): field is string =>
  typeof field === "string" && Object.prototype.hasOwnProperty.call(FIELDS, field);

export function extractJsonObject(text: string): any {
  const clean = text.replace(/```(?:json)?/gi, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in model output");
  return JSON.parse(clean.slice(start, end + 1));
}

let counter = 0;
export function coerceFilter(raw: any, source: Filter["source"] = "ai"): Filter | null {
  if (!hasField(raw?.field)) return null;
  const meta = FIELDS[raw.field];
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
    const hit = SECTORS.find((s) => s.toLowerCase() === String(value).trim().toLowerCase());
    if (!hit) return null;
    value = hit;
  }

  return { id: `${raw.field}_${op}_${counter++}`, field: raw.field, op, value, source };
}

export function coerceFilters(rawFilters: unknown): Filter[] {
  if (!Array.isArray(rawFilters)) return [];
  const out: Filter[] = [];
  for (const raw of rawFilters) {
    const filter = coerceFilter(raw);
    if (filter && !out.some((f) => sameFilter(f, filter))) out.push(filter);
  }
  return out;
}

export function coerceActions(rawActions: unknown): RefinementAction[] {
  if (!Array.isArray(rawActions)) return [];
  const out: RefinementAction[] = [];

  for (const raw of rawActions) {
    if (!["add", "remove", "replace"].includes(raw?.type) || !hasField(raw?.field)) continue;

    if (raw.type === "remove") {
      if (raw.op !== undefined && !OPS.includes(raw.op)) continue;
      if (raw.op === "!=" && FIELDS[raw.field].kind === "num") continue;
      const action: RefinementAction = { type: "remove", field: raw.field };
      if (raw.op !== undefined) action.op = raw.op as Op;
      if (raw.value !== undefined) action.value = raw.value;
      if (!out.some((a) => JSON.stringify(a) === JSON.stringify(action))) out.push(action);
      continue;
    }

    const filter = coerceFilter(raw);
    if (!filter) continue;
    const action: RefinementAction = { type: raw.type, field: filter.field, op: filter.op, value: filter.value };
    if (!out.some((a) => JSON.stringify(a) === JSON.stringify(action))) out.push(action);
  }

  return out;
}

export function enforceRefinementIntent(query: string, actions: RefinementAction[]): RefinementAction[] {
  const q = query.toLowerCase();
  const removeAllowed = /\b(remove|drop|delete)\b/.test(q);
  const replaceAllowed = /\b(instead|replace|change|set)\b/.test(q) || /\buse\b.*\binstead\b/.test(q);

  return actions.flatMap((action) => {
    if (action.type === "remove" && !removeAllowed) return [];
    if (action.type === "replace" && !replaceAllowed) {
      return [{ ...action, type: "add" as const }];
    }
    return [action];
  });
}
