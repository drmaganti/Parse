import { FIELDS, RANKINGS, type Filter, type FilterValue, type Op } from "./fields";

export type RefinementAction =
  | { type: "add" | "replace"; field: string; op: Op; value: FilterValue }
  | { type: "remove"; field: string; op?: Op; value?: FilterValue };

let actionCounter = 0;

function nextId(field: string, op: Op, source: Filter["source"]) {
  return `${field}_${op}_${source}_${Date.now()}_${actionCounter++}`;
}

function valueKey(value: FilterValue): string {
  if (Array.isArray(value)) return [...value].map((v) => String(v).toLowerCase()).sort().join("|");
  return String(value).toLowerCase();
}

export function sameFilter(a: Pick<Filter, "field" | "op" | "value">, b: Pick<Filter, "field" | "op" | "value">) {
  return a.field === b.field && a.op === b.op && valueKey(a.value) === valueKey(b.value);
}

export function makeFilter(field: string, op: Op, value: FilterValue, source: Filter["source"] = "ai"): Filter {
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
        if (action.value !== undefined && valueKey(f.value) !== valueKey(action.value)) return true;
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

function intersectAllowed(current: Set<string> | null, next: Set<string>): Set<string> {
  if (current == null) return new Set(next);
  return new Set([...current].filter((value) => next.has(value)));
}

export function findFilterConflict(filters: Filter[]): string | null {
  for (const [field, meta] of Object.entries(FIELDS)) {
    const group = filters.filter((f) => f.field === field);
    if (group.length < 2) continue;

    if (meta.kind === "cat") {
      let allowed: Set<string> | null = null;
      const excluded = new Set<string>();

      for (const f of group) {
        if (f.op === "==") {
          allowed = intersectAllowed(allowed, new Set([String(f.value).toLowerCase()]));
        } else if (f.op === "in" && Array.isArray(f.value)) {
          allowed = intersectAllowed(allowed, new Set(f.value.map((v) => String(v).toLowerCase())));
        } else if (f.op === "!=") {
          excluded.add(String(f.value).toLowerCase());
        }
      }

      if (allowed && allowed.size === 0) return `${meta.label} inclusion filters do not overlap.`;
      if (allowed && [...allowed].every((value) => excluded.has(value))) return `${meta.label} is both included and excluded.`;
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
