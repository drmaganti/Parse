import { FIELDS, RANKINGS, type Filter, type StockRow } from "./fields";

function sectorSet(value: number | string): string[] {
  return String(value).split("|").map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function passes(stock: StockRow, f: Filter): boolean {
  const meta = FIELDS[f.field];
  if (!meta) return true;

  if (meta.kind === "cat") {
    const actual = String((stock as any)[meta.col] ?? "").toLowerCase();
    if (f.op === "in") return sectorSet(f.value).includes(actual);
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
    default:   return false;
  }
}

function issuerKey(stock: StockRow): string {
  const name = stock.name?.trim().toLowerCase();
  return name || `symbol:${stock.symbol.toUpperCase()}`;
}

function preferredListing(a: StockRow, b: StockRow): StockRow {
  const av = a.avg_volume_20d ?? -1;
  const bv = b.avg_volume_20d ?? -1;
  if (av !== bv) return av > bv ? a : b;
  const am = a.market_cap ?? -1;
  const bm = b.market_cap ?? -1;
  if (am !== bm) return am > bm ? a : b;
  return a.symbol.localeCompare(b.symbol) <= 0 ? a : b;
}

export function dedupeIssuers(rows: StockRow[]): StockRow[] {
  const byIssuer = new Map<string, StockRow>();
  for (const row of rows) {
    const key = issuerKey(row);
    const current = byIssuer.get(key);
    byIssuer.set(key, current ? preferredListing(current, row) : row);
  }
  return [...byIssuer.values()];
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

  const matches = rows.filter((s) => active.every((f) => passes(s, f)));
  return dedupeIssuers(matches)
    .map((s) => ({ ...s, _score: ranking.score(s) }))
    .sort((a, b) => a._score - b._score)
    .slice(0, limit);
}

export function explain(stock: StockRow, filters: Filter[]) {
  return filters
    .filter((f) => f.field && f.value !== "" && f.value != null)
    .map((f) => ({ filter: f, passed: passes(stock, f) }));
}
