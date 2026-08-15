import { FIELDS, RANKINGS, type Filter, type StockRow } from "./fields";

function passes(stock: StockRow, f: Filter): boolean {
  const meta = FIELDS[f.field];
  if (!meta) return true;

  if (meta.kind === "cat") {
    const actual = String((stock as any)[meta.col] ?? "").toLowerCase();
    const expected = String(f.value).toLowerCase();
    if (f.op === "!=") return actual !== expected;
    return actual === expected;
  }

  const v = (stock as any)[meta.col] as number | null;
  if (v == null) return false;
  const t = Number(f.value);
  switch (f.op) {
    case "<":  return v < t;
    case "<=": return v <= t;
    case ">":  return v > t;
    case ">=": return v >= t;
    case "==": return v === t;
    case "!=": return v !== t;
    default:   return true;
  }
}

export interface ScreenResult extends StockRow {
  _score: number;
}

export function runScreen(
  rows: StockRow[],
  filters: Filter[],
  rankingKey: string,
  limit = 25
): ScreenResult[] {
  const active = filters.filter(
    (f) => f.field && f.value !== "" && f.value !== undefined && f.value !== null
  );
  const ranking = RANKINGS[rankingKey] ?? RANKINGS.marketCap;

  return rows
    .filter((s) => active.every((f) => passes(s, f)))
    .map((s) => ({ ...s, _score: ranking.score(s) }))
    .sort((a, b) => a._score - b._score)
    .slice(0, limit);
}

export function explain(stock: StockRow, filters: Filter[]) {
  return filters
    .filter((f) => f.field && f.value !== "" && f.value != null)
    .map((f) => ({ filter: f, passed: passes(stock, f) }));
}
