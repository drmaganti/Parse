from pathlib import Path

# Signed-in screener: always show price, distance from 52-week high, and market cap;
# then show every active numeric filter metric. Keep the ranking column when useful.
p = Path('app/page.tsx')
s = p.read_text()
s = s.replace(
'''const ALL_COLS: Record<string, Col> = {\n  market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct },''',
'''const ALL_COLS: Record<string, Col> = {\n  price: { key: "price", label: "Price", fmt: (v) => v == null ? "—" : `$${Number(v).toFixed(2)}` }, market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct },''')
old = '''function buildColumns(filters: Filter[], ranking: string): Col[] { const order: string[] = []; const add = (c?: string) => { if (c && c !== "chg_1w" && ALL_COLS[c] && !order.includes(c)) order.push(c); }; filters.forEach((f) => { const m = FIELDS[f.field]; if (m?.kind === "num") add(m.col); }); add(RANK_COL[ranking] as string); ["market_cap", "pe", "div_yield", "beta"].forEach(add); return order.slice(0, 6).map((c) => ALL_COLS[c]); }'''
new = '''function buildColumns(filters: Filter[], ranking: string): Col[] { const order: string[] = []; const add = (c?: string) => { if (c && c !== "chg_1w" && ALL_COLS[c] && !order.includes(c)) order.push(c); }; ["price", "from_52w_high", "market_cap"].forEach(add); filters.forEach((f) => { const m = FIELDS[f.field]; if (m?.kind === "num") add(m.col); }); add(RANK_COL[ranking] as string); return order.map((c) => ALL_COLS[c]); }'''
if old not in s:
    raise SystemExit('signed-in buildColumns target not found')
s = s.replace(old, new)
p.write_text(s)

# Guest screener: remove the active-filter cap, avoid duplicates with always-visible columns,
# and add 52-week-high distance as a permanent sortable result column.
p = Path('app/try/page.tsx')
s = p.read_text()
old = '''  const activeMetricCols = useMemo(() => Array.from(new Set(filters.flatMap((f) => {\n    const meta = FIELDS[f.field];\n    if (!meta || meta.kind !== "num" || ["price", "market_cap", "pe", "chg_1w"].includes(meta.col)) return [];\n    return [meta.col as keyof StockRow];\n  }))).slice(0, 4), [filters]);'''
new = '''  const activeMetricCols = useMemo(() => Array.from(new Set(filters.flatMap((f) => {\n    const meta = FIELDS[f.field];\n    if (!meta || meta.kind !== "num" || ["price", "market_cap", "from_52w_high", "pe", "chg_1w"].includes(meta.col)) return [];\n    return [meta.col as keyof StockRow];\n  }))), [filters]);'''
if old not in s:
    raise SystemExit('guest activeMetricCols target not found')
s = s.replace(old, new)
s = s.replace(
'''          <th aria-sort={ariaSort("market_cap")} onClick={() => toggleSort("market_cap")} style={headerStyle("right")}>Market cap{sortArrow("market_cap")}</th>\n          <th aria-sort={ariaSort("pe")} onClick={() => toggleSort("pe")} style={headerStyle("right")}>P/E{sortArrow("pe")}</th>''',
'''          <th aria-sort={ariaSort("market_cap")} onClick={() => toggleSort("market_cap")} style={headerStyle("right")}>Market cap{sortArrow("market_cap")}</th>\n          <th aria-sort={ariaSort("from_52w_high")} onClick={() => toggleSort("from_52w_high")} style={headerStyle("right")}>% off 52W high{sortArrow("from_52w_high")}</th>\n          <th aria-sort={ariaSort("pe")} onClick={() => toggleSort("pe")} style={headerStyle("right")}>P/E{sortArrow("pe")}</th>''')
s = s.replace(
'''</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.market_cap == null ? "—" : `$${Number(r.market_cap).toFixed(1)}B`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td>{activeMetricCols.map''',
'''</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.market_cap == null ? "—" : `$${Number(r.market_cap).toFixed(1)}B`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.from_52w_high == null ? "—" : `${Number(r.from_52w_high).toFixed(1)}%`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td>{activeMetricCols.map''')
p.write_text(s)

# Remove temporary implementation artifacts before committing the product change.
Path('scripts/patch-results-columns.py').unlink(missing_ok=True)
Path('.github/workflows/patch-results-columns.yml').unlink(missing_ok=True)
