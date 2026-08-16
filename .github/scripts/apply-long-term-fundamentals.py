from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    s = read(path)
    if old not in s:
        raise RuntimeError(f"target not found in {path}: {old[:120]!r}")
    write(path, s.replace(old, new, 1))


# lib/finnhub.ts -------------------------------------------------------------
replace_once(
    "lib/finnhub.ts",
    "  revGrowth?: number;\n  high52?: number;",
    """  revGrowth?: number;
  roic?: number;
  operatingMargin?: number;
  fcfMargin?: number;
  fcfYield?: number;
  debtEquity?: number;
  interestCoverage?: number;
  revGrowth3Y?: number;
  epsGrowth3Y?: number;
  evEbitda?: number;
  high52?: number;""",
)

replace_once(
    "lib/finnhub.ts",
    """export async function fetchMetrics(symbol: string, key: string): Promise<Metrics> {
  const d = await get(`/stock/metric?symbol=${symbol}&metric=all`, key);
  const m = d?.metric ?? {};
  return {""",
    """export async function fetchMetrics(symbol: string, key: string): Promise<Metrics> {
  const d = await get(`/stock/metric?symbol=${symbol}&metric=all`, key);
  const m = d?.metric ?? {};
  const marketCap = num(m.marketCapitalization);
  const enterpriseValue = num(m.enterpriseValue);
  const evFcf = num(m["currentEv/freeCashFlowTTM"]);
  const roicAnnual = latestAnnual(d?.series, "roic");
  const fcfMarginAnnual = latestAnnual(d?.series, "fcfMargin");
  const fcfYield = enterpriseValue != null && marketCap != null && marketCap > 0 && evFcf != null && evFcf !== 0
    ? (enterpriseValue / evFcf / marketCap) * 100
    : undefined;
  return {""",
)

replace_once(
    "lib/finnhub.ts",
    """    marketCap: num(m.marketCapitalization),                 // millions
    pe: num(m.peTTM ?? m.peBasicExclExtraTTM),
    pb: num(m.pbQuarterly ?? m.pbAnnual),
    ps: num(m.psTTM),
    divYield: num(m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM),
    beta: num(m.beta),
    revGrowth: num(m.revenueGrowthTTMYoy),
    high52: num(m["52WeekHigh"]),""",
    """    marketCap,                                               // millions
    pe: num(m.peTTM ?? m.peBasicExclExtraTTM),
    pb: num(m.pbQuarterly ?? m.pbAnnual),
    ps: num(m.psTTM),
    divYield: num(m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM),
    beta: num(m.beta),
    revGrowth: num(m.revenueGrowthTTMYoy),
    roic: roicAnnual == null ? undefined : roicAnnual * 100,
    operatingMargin: num(m.operatingMarginTTM),
    fcfMargin: fcfMarginAnnual == null ? undefined : fcfMarginAnnual * 100,
    fcfYield,
    debtEquity: num(m["totalDebt/totalEquityQuarterly"]),
    interestCoverage: num(m.netInterestCoverageTTM),
    revGrowth3Y: num(m.revenueGrowth3Y),
    epsGrowth3Y: num(m.epsGrowth3Y),
    evEbitda: num(m.evEbitdaTTM),
    high52: num(m["52WeekHigh"]),""",
)

replace_once(
    "lib/finnhub.ts",
    """function num(v: any): number | undefined {
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}
""",
    """function num(v: any): number | undefined {
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

function latestAnnual(series: any, key: string): number | undefined {
  const rows = series?.annual?.[key];
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const latest = [...rows].sort((a, b) => String(b?.period ?? "").localeCompare(String(a?.period ?? "")))[0];
  return num(latest?.v);
}
""",
)

# scripts/ingest.ts ----------------------------------------------------------
replace_once(
    "scripts/ingest.ts",
    """  div_yield: number | null; beta: number | null; rev_growth: number | null;
  rsi: number | null; sma50: number | null; sma200: number | null;""",
    """  div_yield: number | null; beta: number | null; rev_growth: number | null;
  roic: number | null; operating_margin: number | null; fcf_margin: number | null; fcf_yield: number | null;
  debt_equity: number | null; interest_coverage: number | null; rev_growth_3y: number | null; eps_growth_3y: number | null; ev_ebitda: number | null;
  rsi: number | null; sma50: number | null; sma200: number | null;""",
)

replace_once(
    "scripts/ingest.ts",
    """      div_yield: round(metrics.divYield), beta: round(metrics.beta, 2),
      rev_growth: round(metrics.revGrowth),
      rsi: round(rsiVal),""",
    """      div_yield: round(metrics.divYield), beta: round(metrics.beta, 2),
      rev_growth: round(metrics.revGrowth),
      roic: round(metrics.roic), operating_margin: round(metrics.operatingMargin),
      fcf_margin: round(metrics.fcfMargin), fcf_yield: round(metrics.fcfYield),
      debt_equity: round(metrics.debtEquity, 2), interest_coverage: round(metrics.interestCoverage, 1),
      rev_growth_3y: round(metrics.revGrowth3Y), eps_growth_3y: round(metrics.epsGrowth3Y), ev_ebitda: round(metrics.evEbitda, 1),
      rsi: round(rsiVal),""",
)

# lib/fields.ts --------------------------------------------------------------
replace_once(
    "lib/fields.ts",
    '  revGrowth:   { key: "revGrowth",   col: "rev_growth",    label: "Rev growth", kind: "num", unit: "%" },\n  rsi:',
    '''  revGrowth:   { key: "revGrowth",   col: "rev_growth",    label: "Rev growth", kind: "num", unit: "%" },
  roic:        { key: "roic",        col: "roic",              label: "ROIC (FY)",          kind: "num", unit: "%" },
  operatingMargin:{ key: "operatingMargin", col: "operating_margin", label: "Operating margin", kind: "num", unit: "%" },
  fcfMargin:   { key: "fcfMargin",   col: "fcf_margin",        label: "FCF margin (FY)",    kind: "num", unit: "%" },
  fcfYield:    { key: "fcfYield",    col: "fcf_yield",         label: "FCF yield",          kind: "num", unit: "%" },
  debtEquity:  { key: "debtEquity",  col: "debt_equity",       label: "Debt / equity",      kind: "num" },
  interestCoverage:{ key: "interestCoverage", col: "interest_coverage", label: "Interest coverage", kind: "num", unit: "×" },
  revGrowth3Y: { key: "revGrowth3Y", col: "rev_growth_3y",     label: "Revenue growth 3Y",  kind: "num", unit: "%" },
  epsGrowth3Y: { key: "epsGrowth3Y", col: "eps_growth_3y",     label: "EPS growth 3Y",      kind: "num", unit: "%" },
  evEbitda:    { key: "evEbitda",    col: "ev_ebitda",         label: "EV / EBITDA",        kind: "num", unit: "×" },
  rsi:''',
)

replace_once(
    "lib/fields.ts",
    "  rev_growth: number | null;\n  rsi: number | null;",
    """  rev_growth: number | null;
  roic: number | null;
  operating_margin: number | null;
  fcf_margin: number | null;
  fcf_yield: number | null;
  debt_equity: number | null;
  interest_coverage: number | null;
  rev_growth_3y: number | null;
  eps_growth_3y: number | null;
  ev_ebitda: number | null;
  rsi: number | null;""",
)

# lib/fallback-parse.ts ------------------------------------------------------
replace_once(
    "lib/fallback-parse.ts",
    "function fieldMention(q: string): string | null {\n  const tests:",
    r'''const FUNDAMENTAL_TERMS: [string, string][] = [
  ["revGrowth3Y", "(?:3[- ]?year revenue growth|3y revenue growth|revenue growth (?:over )?(?:3[- ]?years|3y)|3[- ]?year revenue cagr|3y revenue cagr)"],
  ["epsGrowth3Y", "(?:3[- ]?year (?:eps|earnings) growth|3y (?:eps|earnings) growth|(?:eps|earnings) growth (?:over )?(?:3[- ]?years|3y)|3[- ]?year (?:eps|earnings) cagr|3y (?:eps|earnings) cagr)"],
  ["roic", "(?:\\broic\\b|return on invested capital)"],
  ["operatingMargin", "(?:operating margin|operating profit margin)"],
  ["fcfMargin", "(?:free cash flow margin|\\bfcf margin\\b)"],
  ["fcfYield", "(?:free cash flow yield|\\bfcf yield\\b)"],
  ["debtEquity", "(?:debt\\s*(?:to|/)\\s*equity|debt[- ]?equity ratio)"],
  ["interestCoverage", "(?:interest coverage|interest cover)"],
  ["evEbitda", "(?:ev\\s*(?:to|/)\\s*ebitda|enterprise value\\s*(?:to|/)\\s*ebitda)"],
];

function fieldMention(q: string): string | null {
  const fundamental = FUNDAMENTAL_TERMS.find(([, term]) => new RegExp(term).test(q));
  if (fundamental) return fundamental[0];
  const tests:''',
)

replace_once(
    "lib/fallback-parse.ts",
    r'''function hasKnownUnsupportedMetric(q: string): boolean {
  return /\broic\b|return on invested capital|\broe\b|return on equity|\broa\b|return on assets|free cash flow|\bfcf\b|debt\s*(?:to|\/)\s*ebitda|ev\s*(?:to|\/)\s*ebitda|\bpeg\b|current ratio|interest coverage|earnings growth|eps growth|profit growth|debt\s*(?:to|\/)\s*equity/.test(q);
}''',
    r'''function hasKnownUnsupportedMetric(q: string): boolean {
  return /\broe\b|return on equity|\broa\b|return on assets|(?:free cash flow|\bfcf\b)(?!\s+(?:margin|yield))|debt\s*(?:to|\/)\s*ebitda|\bpeg\b|current ratio|profit growth/.test(q);
}''',
)

replace_once(
    "lib/fallback-parse.ts",
    r'''  addRange(out, "rsi", q.match(/\brsi\b[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));

  if (!out.some((f) => f.field === "pe"))''',
    r'''  addRange(out, "rsi", q.match(/\brsi\b[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  for (const [field, term] of FUNDAMENTAL_TERMS) {
    if (!out.some((f) => f.field === field)) addRange(out, field, q.match(new RegExp(`${term}[^\\d-]*between\\s*(-?\\d+(?:\\.\\d+)?)\\s*(?:and|to)\\s*(-?\\d+(?:\\.\\d+)?)`)));
  }

  if (!out.some((f) => f.field === "pe"))''',
)

needle = '  if (!out.some((f) => f.field === "rsi")) addThreshold(out, "rsi", q.match(new RegExp(`\\\\brsi\\\\b[^\\\\d-]*?(${cmp})\\\\s*(-?\\\\d+(?:\\\\.\\\\d+)?)`)));\n'
s = read("lib/fallback-parse.ts")
if needle not in s:
    raise RuntimeError("RSI threshold insertion target not found")
s = s.replace(
    needle,
    needle + '  for (const [field, term] of FUNDAMENTAL_TERMS) {\n    if (!out.some((f) => f.field === field)) addThreshold(out, field, q.match(new RegExp(`${term}[^\\\\d-]*?(${cmp})\\\\s*(-?\\\\d+(?:\\\\.\\\\d+)?)`)));\n  }\n',
    1,
)
s = s.replace(
    '  if (!out.some((f) => f.field === "revGrowth")) addThreshold(out, "revGrowth",',
    '  if (!out.some((f) => f.field === "revGrowth") && !out.some((f) => f.field === "revGrowth3Y")) addThreshold(out, "revGrowth",',
    1,
)
s = s.replace(
    '    if (!out.some((f) => f.field === "revGrowth") && !/highest growth/.test(q)) addUnique(out, mk("revGrowth", ">", 15));',
    '    if (!out.some((f) => f.field === "revGrowth") && !out.some((f) => f.field === "revGrowth3Y") && !/highest growth/.test(q)) addUnique(out, mk("revGrowth", ">", 15));',
    1,
)
write("lib/fallback-parse.ts", s)

# app/page.tsx ---------------------------------------------------------------
replace_once(
    "app/page.tsx",
    'function formatFilter(f: Pick<Filter, "field" | "op" | "value">) { const m = FIELDS[f.field]; if (!m) return `${f.field} ${f.op} ${f.value}`; if (m.kind === "cat") return `${m.label} ${f.op === "!=" ? "is not" : "is"} ${f.value}`; return `${m.label} ${f.op} ${f.value}${m.unit === "%" ? "%" : ""}`; }',
    'function formatFilter(f: Pick<Filter, "field" | "op" | "value">) { const m = FIELDS[f.field]; if (!m) return `${f.field} ${f.op} ${f.value}`; if (m.kind === "cat") return `${m.label} ${f.op === "!=" ? "is not" : "is"} ${f.value}`; return `${m.label} ${f.op} ${f.value}${m.unit ?? ""}`; }',
)

replace_once(
    "app/page.tsx",
    '''const pct = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "%";
const ALL_COLS: Record<string, Col> = {
  market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct }, rsi: { key: "rsi", label: "RSI", fmt: (v) => fmtNum(v, 0) }, from_52w_high: { key: "from_52w_high", label: "% off high", fmt: pct },
};''',
    '''const pct = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "%";
const mult = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "×";
const ALL_COLS: Record<string, Col> = {
  market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct },
  roic: { key: "roic", label: "ROIC FY", fmt: pct }, operating_margin: { key: "operating_margin", label: "Op. margin", fmt: pct }, fcf_margin: { key: "fcf_margin", label: "FCF margin FY", fmt: pct }, fcf_yield: { key: "fcf_yield", label: "FCF yield", fmt: pct }, debt_equity: { key: "debt_equity", label: "Debt/equity", fmt: (v) => fmtNum(v, 2) }, interest_coverage: { key: "interest_coverage", label: "Interest cover", fmt: mult }, rev_growth_3y: { key: "rev_growth_3y", label: "Rev gr. 3Y", fmt: pct }, eps_growth_3y: { key: "eps_growth_3y", label: "EPS gr. 3Y", fmt: pct }, ev_ebitda: { key: "ev_ebitda", label: "EV/EBITDA", fmt: mult },
  rsi: { key: "rsi", label: "RSI", fmt: (v) => fmtNum(v, 0) }, from_52w_high: { key: "from_52w_high", label: "% off high", fmt: pct },
};''',
)

# app/try/page.tsx -----------------------------------------------------------
replace_once(
    "app/try/page.tsx",
    "  const displayedResults = useMemo(() => {",
    '''  const activeMetricCols = useMemo(() => Array.from(new Set(filters.flatMap((f) => {
    const meta = FIELDS[f.field];
    if (!meta || meta.kind !== "num" || ["price", "market_cap", "pe", "chg_1w"].includes(meta.col)) return [];
    return [meta.col as keyof StockRow];
  }))).slice(0, 4), [filters]);

  const displayedResults = useMemo(() => {''',
)

replace_once(
    "app/try/page.tsx",
    '''          <th aria-sort={ariaSort("pe")} onClick={() => toggleSort("pe")} style={headerStyle("right")}>P/E{sortArrow("pe")}</th>
          <th aria-sort={ariaSort("chg_1w")}''',
    '''          <th aria-sort={ariaSort("pe")} onClick={() => toggleSort("pe")} style={headerStyle("right")}>P/E{sortArrow("pe")}</th>
          {activeMetricCols.map((col) => <th key={String(col)} aria-sort={ariaSort(col)} onClick={() => toggleSort(col)} style={headerStyle("right")}>{fieldMetaForColumn(col)?.label || String(col)}{sortArrow(col)}</th>)}
          <th aria-sort={ariaSort("chg_1w")}''',
)

replace_once(
    "app/try/page.tsx",
    '''</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13, color: (r.chg_1w ?? 0) >= 0 ? T.gain : T.loss }}>{r.chg_1w''',
    '''</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td>{activeMetricCols.map((col) => <td key={String(col)} style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{formatMetricCell(col, r[col])}</td>)}<td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13, color: (r.chg_1w ?? 0) >= 0 ? T.gain : T.loss }}>{r.chg_1w''',
)

replace_once(
    "app/try/page.tsx",
    "function FilterChip({ f, onEdit, onRemove }:",
    '''function fieldMetaForColumn(col: keyof StockRow) { return Object.values(FIELDS).find((m) => m.col === col); }
function formatMetricCell(col: keyof StockRow, value: any) {
  if (value == null) return "—";
  const meta = fieldMetaForColumn(col);
  if (meta?.unit === "%") return `${Number(value).toFixed(1)}%`;
  if (meta?.unit === "×") return `${Number(value).toFixed(1)}×`;
  if (meta?.unit === "$B") return `$${Number(value).toFixed(1)}B`;
  return Number(value).toFixed(2);
}

function FilterChip({ f, onEdit, onRemove }:''',
)

# supabase/schema.sql --------------------------------------------------------
replace_once(
    "supabase/schema.sql",
    "  rev_growth     numeric,          -- percent YoY\n  rsi            numeric,",
    """  rev_growth     numeric,          -- percent YoY
  roic           numeric,          -- percent; latest fiscal-year value
  operating_margin numeric,        -- percent TTM
  fcf_margin     numeric,          -- percent; latest fiscal-year value
  fcf_yield      numeric,          -- percent; derived from Finnhub EV/FCF and market cap
  debt_equity    numeric,          -- total debt / total equity
  interest_coverage numeric,       -- TTM multiple
  rev_growth_3y  numeric,          -- percent 3-year CAGR
  eps_growth_3y  numeric,          -- percent 3-year CAGR
  ev_ebitda      numeric,          -- TTM multiple
  rsi            numeric,""",
)

replace_once(
    "supabase/schema.sql",
    "alter table public.stocks enable row level security;",
    """alter table public.stocks add column if not exists roic numeric;
alter table public.stocks add column if not exists operating_margin numeric;
alter table public.stocks add column if not exists fcf_margin numeric;
alter table public.stocks add column if not exists fcf_yield numeric;
alter table public.stocks add column if not exists debt_equity numeric;
alter table public.stocks add column if not exists interest_coverage numeric;
alter table public.stocks add column if not exists rev_growth_3y numeric;
alter table public.stocks add column if not exists eps_growth_3y numeric;
alter table public.stocks add column if not exists ev_ebitda numeric;

alter table public.stocks enable row level security;""",
)

# Migration generated by `supabase migration new` in the workflow.
migrations = sorted((ROOT / "supabase/migrations").glob("*_long_term_fundamentals.sql"), key=lambda p: p.stat().st_mtime, reverse=True)
if not migrations:
    raise RuntimeError("long_term_fundamentals migration was not generated")
migrations[0].write_text("""alter table public.stocks add column if not exists roic numeric;
alter table public.stocks add column if not exists operating_margin numeric;
alter table public.stocks add column if not exists fcf_margin numeric;
alter table public.stocks add column if not exists fcf_yield numeric;
alter table public.stocks add column if not exists debt_equity numeric;
alter table public.stocks add column if not exists interest_coverage numeric;
alter table public.stocks add column if not exists rev_growth_3y numeric;
alter table public.stocks add column if not exists eps_growth_3y numeric;
alter table public.stocks add column if not exists ev_ebitda numeric;
""")

# eval/cases.json ------------------------------------------------------------
p = ROOT / "eval/cases.json"
data = json.loads(p.read_text())
new_cases = [
    {"query": "ROIC above 12%", "expect": {"filters": [{"field": "roic", "op": ">", "value": 12}]}},
    {"query": "Operating margin above 15%", "expect": {"filters": [{"field": "operatingMargin", "op": ">", "value": 15}]}},
    {"query": "FCF margin over 10%", "expect": {"filters": [{"field": "fcfMargin", "op": ">", "value": 10}]}},
    {"query": "Free cash flow yield above 3%", "expect": {"filters": [{"field": "fcfYield", "op": ">", "value": 3}]}},
    {"query": "Debt to equity below 1", "expect": {"filters": [{"field": "debtEquity", "op": "<", "value": 1}]}},
    {"query": "Interest coverage above 5", "expect": {"filters": [{"field": "interestCoverage", "op": ">", "value": 5}]}},
    {"query": "3-year revenue growth above 8%", "expect": {"filters": [{"field": "revGrowth3Y", "op": ">", "value": 8}]}},
    {"query": "3-year EPS growth above 10%", "expect": {"filters": [{"field": "epsGrowth3Y", "op": ">", "value": 10}]}},
    {"query": "EV/EBITDA under 15", "expect": {"filters": [{"field": "evEbitda", "op": "<", "value": 15}]}},
    {"query": "ROIC above 10%, FCF margin above 8%, and debt/equity below 1", "expect": {"filters": [{"field": "roic", "op": ">", "value": 10}, {"field": "fcfMargin", "op": ">", "value": 8}, {"field": "debtEquity", "op": "<", "value": 1}], "filterCount": 3}},
    {"query": "Remove ROIC", "mode": "refine", "previous": [{"field": "roic", "op": ">", "value": 10}, {"field": "pe", "op": "<", "value": 25}], "expect": {"filters": [{"field": "pe", "op": "<", "value": 25}], "filterCount": 1}, "reject": [{"field": "roic"}]},
]
existing = {c.get("query") for c in data["cases"]}
data["cases"].extend(c for c in new_cases if c["query"] not in existing)
p.write_text(json.dumps(data, indent=2) + "\n")

print("Long-term fundamentals patch applied")
