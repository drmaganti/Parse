"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { FIELDS, SECTORS, type Filter, type StockRow } from "../../lib/fields";
import { findFilterConflict, sameFilter } from "../../lib/filter-ops";
import { runScreen, type ScreenResult } from "../../lib/screen";
import { trackEvent } from "../../lib/analytics";
import { decodeScreenState, encodeScreenState, type ScreenUniverse } from "../../lib/screen-state";

const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", borderStrong: "#D4D8DF",
  ink: "#15171C", inkSoft: "#565C67", inkFaint: "#68707D", accent: "#2C36A8", accentSoft: "#ECEEFA",
  accentInk: "#232A85", gain: "#0B8A5B", loss: "#C33328",
};
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";

function acquisitionSource() {
  if (typeof window === "undefined") return "unknown";
  return new URLSearchParams(window.location.search).get("source") || "direct";
}

function nextId(field: string, op: Filter["op"]) {
  return `${field}_${op}_guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function TryPage() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [input, setInput] = useState("");
  const [screenQuery, setScreenQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [ranking, setRanking] = useState("marketCap");
  const [sort, setSort] = useState<{ col: keyof StockRow; dir: "asc" | "desc" } | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [runs, setRuns] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [universe, setUniverse] = useState<ScreenUniverse | undefined>();
  const [universeLabel, setUniverseLabel] = useState("S&P 500 + Nasdaq 100");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    const exact = decodeScreenState(params.get("state"));
    const collectionSlug = params.get("collection") || exact?.universe?.slug;
    (async () => {
      const { data, error } = await supabase.from("stocks").select("*");
      if (error) { setError("Could not load the stock universe."); return; }
      let rows = (data ?? []) as StockRow[];
      let nextUniverse = exact?.universe;
      if (collectionSlug) {
        const { data: holdings } = await supabase.from("investor_holdings").select("ticker,report_date").eq("collection_slug", collectionSlug).order("report_date", { ascending: false }).limit(250);
        const latest = holdings?.[0]?.report_date;
        const symbols = new Set((holdings || []).filter((h: any) => h.report_date === latest && h.ticker).map((h: any) => h.ticker));
        rows = rows.filter((s) => symbols.has(s.symbol));
        nextUniverse = { type: "collection", slug: collectionSlug, label: exact?.universe?.label || (collectionSlug === "warren-buffett" ? "Berkshire Hathaway reported holdings" : collectionSlug) };
        setUniverseLabel(nextUniverse.label || collectionSlug); setUniverse(nextUniverse);
      }
      setStocks(rows);
      if (exact) {
        const issue = findFilterConflict(exact.filters);
        setScreenQuery(exact.q); setFilters(exact.filters); setRanking(exact.ranking); setConflict(issue || "");
        setResults(issue ? [] : runScreen(rows, exact.filters, exact.ranking, 25)); setHasRun(true); setInterpretation("Loaded an exact shared screen.");
      } else if (initialQuery) setInput(initialQuery.slice(0, 320));
    })();
  }, []);

  const applyFilters = (next: Filter[], nextRanking = ranking) => {
    const issue = findFilterConflict(next);
    setConflict(issue || "");
    setFilters(next);
    setResults(issue ? [] : runScreen(stocks, next, nextRanking, 25));
    setSort(null);
  };

  const execute = async () => {
    const instruction = input.trim();
    if (!instruction || loading || runs >= 3) return;
    setLoading(true); setError(""); setShareNote("");
    const isRefine = hasRun;
    trackEvent("screen_run_started", { guest_run: runs + 1, refine: isRefine, source: acquisitionSource() });
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: instruction, filters: isRefine ? filters : [], ranking, mode: isRefine ? "refine" : "new" }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || "Could not interpret that screen.");
      const next = (body.filters || []) as Filter[];
      const nextRanking = body.ranking || ranking || "marketCap";
      const issue = findFilterConflict(next);
      setFilters(next); setRanking(nextRanking); setInterpretation(body.interpretation || ""); setAssumptions(body.assumptions || []);
      setConflict(issue || "");
      setResults(issue ? [] : runScreen(stocks, next, nextRanking, 25));
      setSort(null);
      if (!hasRun) setScreenQuery(instruction);
      setHasRun(true);
      setInput("");
      setRuns((n) => n + 1);
      trackEvent("screen_run_success", { guest_run: runs + 1, refine: isRefine, filter_count: next.length, result_count: issue ? 0 : runScreen(stocks, next, nextRanking, 25).length, source: acquisitionSource() });
    } catch (e: any) {
      const message = e?.message || "Could not interpret that screen.";
      setError(message);
      trackEvent("screen_run_error", { guest_run: runs + 1, source: acquisitionSource() });
    } finally { setLoading(false); }
  };

  const resetScreen = () => {
    setInput(""); setScreenQuery(""); setFilters([]); setResults([]); setRanking("marketCap"); setSort(null);
    setInterpretation(""); setAssumptions([]); setConflict(""); setError(""); setHasRun(false); setAdding(false);
  };

  const updateFilter = (id: string, patch: Partial<Filter>) => {
    const next = filters.map((f) => f.id === id ? { ...f, ...patch, source: "user" as const } : f);
    applyFilters(next);
    trackEvent("screen_filter_edited", { filter_count: next.length });
  };
  const removeFilter = (id: string) => {
    const next = filters.filter((f) => f.id !== id);
    applyFilters(next);
    trackEvent("screen_filter_removed", { filter_count: next.length });
  };
  const addFilter = (field: string, op: Filter["op"], value: number | string) => {
    const candidate: Filter = { id: nextId(field, op), field, op, value, source: "user" };
    const next = filters.some((f) => sameFilter(f, candidate)) ? filters : [...filters, candidate];
    applyFilters(next);
    setAdding(false);
    trackEvent("screen_filter_added", { field, op, filter_count: next.length });
  };

  const toggleSort = (col: keyof StockRow) => {
    setSort((cur) => {
      const next = !cur || cur.col !== col ? { col, dir: "desc" as const } : cur.dir === "desc" ? { col, dir: "asc" as const } : null;
      trackEvent("screen_results_sorted", { column: String(col), direction: next?.dir || "ranking", source: acquisitionSource() });
      return next;
    });
  };

  const displayedResults = useMemo(() => {
    if (!sort) return results;
    const { col, dir } = sort;
    const d = dir === "asc" ? 1 : -1;
    return [...results].sort((a, b) => {
      const av = a[col] as any, bv = b[col] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return cmp * d;
    });
  }, [results, sort]);

  const sortArrow = (col: keyof StockRow) => sort?.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
  const ariaSort = (col: keyof StockRow): "ascending" | "descending" | "none" => sort?.col === col ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  const shareScreen = async () => {
    const q = screenQuery || input.trim();
    if (!q || typeof window === "undefined") return;
    const shareUrl = new URL("/screens/share", window.location.origin);
    shareUrl.searchParams.set("state", encodeScreenState({ q: q.slice(0, 320), filters, ranking, universe }));
    try {
      if (navigator.share) {
        await navigator.share({ title: "A stock screen from Parse", text: q, url: shareUrl.toString() });
        setShareNote("Shared.");
        trackEvent("screen_shared", { method: "native", source: acquisitionSource() });
      } else {
        await navigator.clipboard.writeText(shareUrl.toString());
        setShareNote("Link copied.");
        trackEvent("screen_shared", { method: "clipboard", source: acquisitionSource() });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setShareNote("Could not copy the link.");
    }
  };

  const headerStyle = (align: "left" | "right"): React.CSSProperties => ({ textAlign: align, padding: "8px", borderBottom: `1px solid ${T.border}`, color: T.inkSoft, fontSize: 11.5, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" });
  const limitReached = runs >= 3;

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif" }}>
    <style>{`.p-btn{height:40px;padding:0 16px;border-radius:10px;border:0;background:${T.accent};color:#fff;font:550 14px Inter,system-ui,sans-serif;cursor:pointer}.p-btn:disabled{opacity:.6}.p-btn-neutral{height:36px;padding:0 13px;border-radius:9px;border:1px solid ${T.border};background:#fff;color:${T.ink};font:550 13.5px Inter,system-ui,sans-serif;cursor:pointer}.p-link{color:${T.accent};text-decoration:none;font-size:14px}.p-query{width:100%;box-sizing:border-box;border:1px solid ${T.borderStrong};border-radius:13px;background:#fff;padding:14px 15px;font:15.5px Inter,system-ui,sans-serif;resize:vertical;min-height:56px}.p-query:focus{outline:none;border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentSoft}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 14, alignItems: "center" }}><a className="p-link" href="/screens">Screen ideas</a><a className="p-link" href="/methodology">How it works</a><a className="p-link" href="/account?mode=signin">Sign in</a></div></div></header>
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ maxWidth: 760 }}>
        <h1 style={{ fontFamily: DISP, fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{hasRun ? "Refine this screen" : "Describe the screen you want"}</h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, margin: "0 0 16px" }}>{hasRun ? "Add or remove a criterion below. Edit a chip directly to change a number." : "Try three screen updates without creating an account. Current universe: {universeLabel}, refreshed daily."}</p>
        <textarea className="p-query" value={input} onChange={(e) => setInput(e.target.value)} placeholder={hasRun ? "Example: also require revenue growth above 10%" : "Example: large companies with low P/E ratios"} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execute(); } }} />
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ color: T.inkSoft, fontSize: 12.5 }}>{runs}/3 guest updates used</span><div style={{ display: "flex", gap: 8 }}>{hasRun && <button className="p-btn-neutral" onClick={resetScreen}>New screen</button>}<button className="p-btn" onClick={execute} disabled={!stocks.length || loading || limitReached || !input.trim()}>{loading ? "Reading…" : limitReached ? "Guest limit reached" : hasRun ? "Update screen" : "Run screen"}</button></div></div>
        {error && <div style={{ color: T.loss, marginTop: 10, fontSize: 13.5 }}>{error}</div>}
      </section>

      {hasRun && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}><div style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft }}>HOW PARSE READ THIS</div>{interpretation && <div style={{ color: T.inkFaint, fontSize: 13 }}>{interpretation}</div>}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{filters.map((f) => <FilterChip key={f.id} f={f} onEdit={updateFilter} onRemove={removeFilter} />)}<button className="p-btn-neutral" onClick={() => setAdding((v) => !v)}>+ Add filter</button></div>
        {adding && <AddFilter onAdd={addFilter} onCancel={() => setAdding(false)} />}
        {conflict && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#FFF0EE", color: T.loss, fontSize: 13.5 }}>{conflict} Change or remove one of the filters.</div>}
        {assumptions.length > 0 && <div style={{ marginTop: 12, background: T.accentSoft, color: T.inkSoft, borderRadius: 9, padding: "10px 12px", fontSize: 13 }}>{assumptions.map((a, i) => <div key={i}>· {a}</div>)}</div>}
      </section>}

      {hasRun && !conflict && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}><div style={{ fontFamily: DISP, fontSize: 18, fontWeight: 600 }}>{results.length} matches{sort ? ` · sorted ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}</div><div style={{ display: "flex", gap: 9, alignItems: "center" }}><button className="p-btn-neutral" onClick={shareScreen}>Share screen</button>{shareNote && <span style={{ color: T.inkSoft, fontSize: 12.5 }}>{shareNote}</span>}</div></div>
        {results.length === 0 ? <div style={{ padding: "28px 4px", color: T.inkSoft, fontSize: 14 }}>No names match this screen. Loosen or remove a filter to widen it.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}><thead><tr>
          <th aria-sort={ariaSort("symbol")} onClick={() => toggleSort("symbol")} style={headerStyle("left")}>Symbol{sortArrow("symbol")}</th>
          <th aria-sort={ariaSort("name")} onClick={() => toggleSort("name")} style={headerStyle("left")}>Company{sortArrow("name")}</th>
          <th aria-sort={ariaSort("price")} onClick={() => toggleSort("price")} style={headerStyle("right")}>Price{sortArrow("price")}</th>
          <th aria-sort={ariaSort("market_cap")} onClick={() => toggleSort("market_cap")} style={headerStyle("right")}>Market cap{sortArrow("market_cap")}</th>
          <th aria-sort={ariaSort("pe")} onClick={() => toggleSort("pe")} style={headerStyle("right")}>P/E{sortArrow("pe")}</th>
          <th aria-sort={ariaSort("chg_1w")} onClick={() => toggleSort("chg_1w")} style={headerStyle("right")}>1W change{sortArrow("chg_1w")}</th>
        </tr></thead><tbody>{displayedResults.map((r) => <tr key={r.symbol}><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, fontFamily: MONO, fontSize: 13 }}>{r.symbol}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>{r.name}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.price == null ? "—" : `$${Number(r.price).toFixed(2)}`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.market_cap == null ? "—" : `$${Number(r.market_cap).toFixed(1)}B`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13, color: (r.chg_1w ?? 0) >= 0 ? T.gain : T.loss }}>{r.chg_1w == null ? "—" : `${Number(r.chg_1w).toFixed(1)}%`}</td></tr>)}</tbody></table></div>}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ color: T.inkSoft, fontSize: 13.5 }}>Research tool only; these are screen matches, not investment recommendations.</span><a href="/account?mode=signup" className="p-link">Create account to save →</a></div>
      </section>}

      {limitReached && <section style={{ marginTop: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}><div style={{ fontFamily: DISP, fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Continue with an account</div><div style={{ color: T.inkSoft, fontSize: 14, marginBottom: 12 }}>Create an account to keep screening and save screens for later.</div><a href="/account?mode=signup" className="p-link">Create account →</a></section>}
    </main>
  </div>;
}

function FilterChip({ f, onEdit, onRemove }: { f: Filter; onEdit: (id: string, patch: Partial<Filter>) => void; onRemove: (id: string) => void }) {
  const meta = FIELDS[f.field];
  const sector = meta?.kind === "cat";
  return <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${f.source === "user" ? "#C9CEF3" : T.border}`, background: f.source === "user" ? T.accentSoft : T.surfaceAlt, borderRadius: 9, padding: "6px 8px" }}>
    <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{meta?.label || f.field} {f.op}</span>
    {sector ? <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{String(f.value)}</span> : <input type="number" value={String(f.value)} onChange={(e) => onEdit(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })} style={{ width: 62, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 5px", fontFamily: MONO, fontSize: 12.5 }} />}
    <button onClick={() => onRemove(f.id)} aria-label="Remove filter" style={{ border: 0, background: "transparent", color: T.inkSoft, padding: 0 }}>×</button>
  </div>;
}

function AddFilter({ onAdd, onCancel }: { onAdd: (field: string, op: Filter["op"], value: number | string) => void; onCancel: () => void }) {
  const [field, setField] = useState("pe");
  const [op, setOp] = useState<Filter["op"]>("<");
  const [value, setValue] = useState("");
  const [sector, setSector] = useState(SECTORS[0]);
  const meta = FIELDS[field];
  const categorical = meta?.kind === "cat";
  const submit = () => {
    if (categorical) return onAdd(field, op === "!=" ? "!=" : "==", sector);
    if (value === "" || !Number.isFinite(Number(value))) return;
    onAdd(field, op, Number(value));
  };
  return <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", padding: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10 }}>
    <select value={field} onChange={(e) => { const next = e.target.value; setField(next); setOp(FIELDS[next]?.kind === "cat" ? "==" : "<"); }} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.border}` }}>{Object.values(FIELDS).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
    {categorical ? <><select value={op} onChange={(e) => setOp(e.target.value as Filter["op"])} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.border}` }}><option value="==">is</option><option value="!=">is not</option></select><select value={sector} onChange={(e) => setSector(e.target.value)} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.border}` }}>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></> : <><select value={op} onChange={(e) => setOp(e.target.value as Filter["op"])} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.border}` }}>{["<", "<=", ">", ">=", "=="].map((o) => <option key={o}>{o}</option>)}</select><input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" style={{ width: 78, padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.border}` }} /></>}
    <button className="p-btn-neutral" onClick={submit}>Add</button><button onClick={onCancel} style={{ border: 0, background: "transparent", color: T.inkSoft }}>Cancel</button>
  </div>;
}
