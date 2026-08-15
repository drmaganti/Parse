import { FIELDS, RANKINGS, type Filter, type Op } from "./fields";

export type RefinementAction =
  | { type: "add" | "replace"; field: string; op: Op; value: number | string }
  | { type: "remove"; field: string; op?: Op; value?: number | string };

let actionCounter = 0;

function nextId(field: string, op: Op, source: Filter["source"]) {
  return `${field}_${op}_${source}_${Date.now()}_${actionCounter++}`;
}

export function sameFilter(a: Pick<Filter, "field" | "op" | "value">, b: Pick<Filter, "field" | "op" | "value">) {
  return a.field === b.field && a.op === b.op && String(a.value).toLowerCase() === String(b.value).toLowerCase();
}

export function makeFilter(field: string, op: Op, value: number | string, source: Filter["source"] = "ai"): Filter {
  return { id: nextId(field, op, source), field, op, value, source };
}

export function applyRefinement(previous: Filter[], actions: RefinementAction[], source: Filter["source"] = "ai"): Filter[] {
  let next = [...previous];
  const replacedFields = new Set<string>();

  for (const action of actions) {
    if (!FIELDS[action.field]) continue;

    if (action.type === "remove") {
      next = next.filter((f) => {
        if (f.field !== action.field) return true;
        if (!action.op && action.value === undefined) return false;
        if (action.op && f.op !== action.op) return true;
        if (action.value !== undefined && String(f.value).toLowerCase() !== String(action.value).toLowerCase()) return true;
        return false;
      });
      continue;
    }

    // A replacement can contain multiple bounds for the same metric. Clear the
    // previous metric only once, then treat subsequent replacement actions for
    // that field as additions to the new definition.
    if (action.type === "replace" && !replacedFields.has(action.field)) {
      next = next.filter((f) => f.field !== action.field);
      replacedFields.add(action.field);
    }

    const candidate = makeFilter(action.field, action.op, action.value, source);
    if (!next.some((f) => sameFilter(f, candidate))) next.push(candidate);
  }

  return next;
}

export function mergeDefaults(filters: Filter[], defaults: Filter[]): Filter[] {
  const explicitFields = new Set(filters.map((f) => f.field));
  const additions = defaults
    .filter((d) => !explicitFields.has(d.field))
    .filter((d, index, arr) => arr.findIndex((x) => sameFilter(x, d)) === index)
    .map((d) => ({ ...d, id: d.id || nextId(d.field, d.op, "default"), source: "default" as const }));
  return [...filters, ...additions];
}

export function validRanking(key: unknown): string | undefined {
  return typeof key === "string" && RANKINGS[key] ? key : undefined;
}

export function findFilterConflict(filters: Filter[]): string | null {
  for (const [field, meta] of Object.entries(FIELDS)) {
    const group = filters.filter((f) => f.field === field);
    if (group.length < 2) continue;

    if (meta.kind === "cat") {
      const equals = group.filter((f) => f.op === "==").map((f) => String(f.value).toLowerCase());
      const notEquals = new Set(group.filter((f) => f.op === "!=").map((f) => String(f.value).toLowerCase()));
      if (new Set(equals).size > 1) return `${meta.label} cannot equal more than one value at the same time.`;
      if (equals.some((v) => notEquals.has(v))) return `${meta.label} is both included and excluded.`;
      continue;
    }

    let lower = -Infinity;
    let lowerStrict = false;
    let upper = Infinity;
    let upperStrict = false;
    let equal: number | null = null;

    for (const f of group) {
      const value = Number(f.value);
      if (!Number.isFinite(value)) continue;
      if (f.op === ">" || f.op === ">=") {
        if (value > lower || (value === lower && f.op === ">")) {
          lower = value;
          lowerStrict = f.op === ">";
        }
      } else if (f.op === "<" || f.op === "<=") {
        if (value < upper || (value === upper && f.op === "<")) {
          upper = value;
          upperStrict = f.op === "<";
        }
      } else if (f.op === "==") {
        if (equal !== null && equal !== value) return `${meta.label} has conflicting exact values.`;
        equal = value;
      }
    }

    if (lower > upper || (lower === upper && (lowerStrict || upperStrict))) {
      return `${meta.label} has a lower bound that conflicts with its upper bound.`;
    }
    if (equal !== null) {
      if (equal < lower || equal > upper || (equal === lower && lowerStrict) || (equal === upper && upperStrict)) {
        return `${meta.label} has an exact value outside its allowed range.`;
      }
    }
  }

  return null;
}
