// Single source of truth for the screen vocabulary.
// Shared by the NL parser, screening engine, and UI so behavior stays aligned.

export type FieldKind = "num" | "cat";

export interface FieldMeta {
  key: string;
  col: string;
  label: string;
  kind: FieldKind;
  unit?: string;
}

export const FIELDS: Record<string, FieldMeta> = {
  pe:          { key: "pe",          col: "pe",            label: "P/E",        kind: "num" },
  pb:          { key: "pb",          col: "pb",            label: "P/B",        kind: "num" },
  ps:          { key: "ps",          col: "ps",            label: "P/S",        kind: "num" },
  divYield:    { key: "divYield",    col: "div_yield",     label: "Div yield",  kind: "num", unit: "%" },
  beta:        { key: "beta",        col: "beta",          label: "Beta",       kind: "num" },
  marketCap:   { key: "marketCap",   col: "market_cap",    label: "Market cap", kind: "num", unit: "$B" },
  revGrowth:   { key: "revGrowth",   col: "rev_growth",    label: "Rev growth", kind: "num", unit: "%" },
  rsi:         { key: "rsi",         col: "rsi",           label: "RSI",        kind: "num" },
  from52wHigh: { key: "from52wHigh", col: "from_52w_high", label: "% off high", kind: "num", unit: "%" },
  chg1w:       { key: "chg1w",       col: "chg_1w",        label: "1W change",  kind: "num", unit: "%" },
  sector:      { key: "sector",      col: "sector",        label: "Sector",     kind: "cat" },
};

export type Op = "<" | "<=" | ">" | ">=" | "==" | "!=";
export const OPS: Op[] = ["<", "<=", ">", ">=", "==", "!="];

export interface Filter {
  id: string;
  field: string;
  op: Op;
  value: number | string;
  source: "ai" | "user" | "default";
}

// Ranking keys the model may choose. `score` returns a value sorted ascending,
// so lower = better rank; negate to put "more is better" metrics on top.
export interface Ranking {
  key: string;
  label: string;
  score: (s: StockRow) => number;
}

export interface StockRow {
  symbol: string;
  name: string;
  sector: string | null;
  price: number | null;
  market_cap: number | null;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  div_yield: number | null;
  beta: number | null;
  rev_growth: number | null;
  rsi: number | null;
  from_52w_high: number | null;
  chg_1w: number | null;
  chg_1d: number | null;
}

const inv = (v: number | null, cap: number) => (!v || v <= 0 ? 0 : Math.max(0, cap - v));
const n = (v: number | null) => (v == null ? 0 : v);

export const RANKINGS: Record<string, Ranking> = {
  value:     { key: "value",     label: "Cheapest first",      score: (s) => -(inv(s.pe, 60) + inv(s.pb, 80) + inv(s.ps, 30)) },
  quality:   { key: "quality",   label: "Highest growth",      score: (s) => -n(s.rev_growth) },
  dividend:  { key: "dividend",  label: "Highest yield",       score: (s) => -n(s.div_yield) },
  momentum:  { key: "momentum",  label: "Strongest momentum", score: (s) => -(n(s.chg_1w) * 2 + (100 + n(s.from_52w_high))) },
  decline:   { key: "decline",   label: "Most beaten-down",    score: (s) => n(s.chg_1w) },
  marketCap: { key: "marketCap", label: "Largest first",       score: (s) => -n(s.market_cap) },
};

export const SECTORS = [
  "Technology", "Financials", "Healthcare", "Consumer",
  "Energy", "Industrials", "Communications", "Utilities", "Materials", "Real Estate",
];
