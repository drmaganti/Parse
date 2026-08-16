"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { FIELDS, RANKINGS, type Filter, type StockRow } from "../lib/fields";
import { runScreen } from "../lib/screen";
import { normalizeFilters, applyRefinement, type RefinementAction } from "../lib/refinement";
import { screenFingerprint, screenSlug } from "../lib/screen-state";
import { trackEvent } from "../lib/analytics";

// Design tokens
const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", borderStrong: "#D4D8DF",
  ink: "#15171C", inkSoft: "#565C67", inkFaint: "#8B919C", accent: "#2C36A8", accentSoft: "#ECEEFA", accentInk: "#232A85",
  gain: "#177A4B", loss: "#B93A3A", amber: "#9A6400",
};

const EXAMPLES = [
  "Large tech companies with P/E under 25",
  "Dividend stocks yielding over 3% with low volatility",
  "Cheap stocks with positive revenue growth",
];

const DEFAULT_FILTERS: Filter[] = [];

type SavedRow = {
  id: string; name: string; query: string; filters: Filter[]; ranking: string;
  createdAt?: string; updatedAt?: string; lastRunAt?: string | null; lastResultCount?: number | null; lastResultSymbols?: string[];
  criteriaFingerprint?: string; universe?: string;
};
type PreferenceRow = Filter & { prefId: string };

type SharedVisibility = "unlisted" | "public";

function safeFilters(raw: unknown): Filter[] { return Array.isArray(raw) ? normalizeFilters(raw as Filter[]) : []; }
function arraysEqual(a: string[], b: string[]) { return a.length === b.length && a.every((x, i) => x === b[i]); }

export default function Page() {
  const params = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>(DEFAULT_FILTERS);
  const [ranking, setRanking] = useState("marketCap");
  const [interpretation, setInterpretation] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [saveName, setSaveName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"screen" | "saved" | "preferences">("screen");
  const [sort, setSort] = useState<{ col: keyof StockRow; dir: "asc" | "desc" } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthEmail(data.session?.user.email ?? null);
      const meta = data.session?.user.user_metadata;
      setPreferences(Array.isArray(meta?.screening_defaults) ? meta.screening_defaults : []);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null); setAuthEmail(session?.user.email ?? null);
      const meta = session?.user.user_metadata;
      setPreferences(Array.isArray(meta?.screening_defaults) ? meta.screening_defaults : []);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.from("stocks").select("*").then(({ data }) => setStocks((data ?? []) as StockRow[]));
  }, []);

  useEffect(() => { if (userId) loadSaved(); else setSaved([]); }, [userId]);

  useEffect(() => {
    const stateParam = params.get("state");
    if (stateParam) {
      const decoded = decodeScreen(stateParam);
      if (decoded) {
        setQuery(decoded.q); setFilters(decoded.filters); setRanking(decoded.ranking); setInterpretation("Loaded an exact shared screen.");
      }
    } else {
      const q = params.get("q");
      if (q) { setQuery(q); void parseQuery(q, [], "marketCap", true); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSaved() {
    if (!userId) return;
    const { data } = await supabase.from("saved_screens").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setSaved((data ?? []).map((r: any) => ({
      id: r.id, name: r.name, query: r.query ?? "", filters: safeFilters(r.filters), ranking: r.ranking ?? "marketCap",
      createdAt: r.created_at, updatedAt: r.updated_at, lastRunAt: r.last_run_at, lastResultCount: r.last_result_count,
      lastResultSymbols: r.last_result_symbols ?? [], criteriaFingerprint: r.criteria_fingerprint ?? "", universe: r.universe ?? "default",
    })));
  }

  async function parseQuery(q: string, prev = filters, currentRank = ranking, reset = false) {
    if (!q.trim()) return;
    setLoading(true); setToast("");
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, previousFilters: reset ? [] : prev, currentRanking: currentRank, mode: reset ? "new" : (prev.length ? "refine" : "new") }) });
      if (!res.ok) throw new Error("Could not parse screen");
      const d = await res.json();
      setFilters(safeFilters(d.filters)); setRanking(d.ranking || "marketCap"); setInterpretation(d.interpretation || ""); setAssumptions(Array.isArray(d.assumptions) ? d.assumptions : []);
      if (reset) setActiveSavedId(null);
    } catch (e) { setToast((e as Error).message); }
    finally { setLoading(false); }
  }

  async function submitQuery(e?: React.FormEvent) { e?.preventDefault(); await parseQuery(query); }

  function editFilter(id: string, patch: Partial<Filter>) {
    setFilters((cur) => normalizeFilters(cur.map((f) => f.id === id ? { ...f, ...patch, source: "user" as const } : f)));
    setInterpretation("Updated the screen directly.");
  }
  function removeFilter(id: string) { setFilters((cur) => cur.filter((f) => f.id !== id)); setInterpretation("Removed a condition."); }

  const results = useMemo(() => runScreen(stocks, filters, ranking, Infinity), [stocks, filters, ranking]);
  const displayedResults = useMemo(() => {
    if (!sort) return results;
    return [...results].sort((a, b) => {
      const av = a[sort.col] as any, bv = b[sort.col] as any;
      if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? c : -c;
    });
  }, [results, sort]);
  const columns = useMemo(() => buildColumns(filters, ranking), [filters, ranking]);

  function toggleSort(col: keyof StockRow) { setSort((s) => s?.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }); }

  async function saveScreen() {
    if (!userId) { location.href = "/account?mode=signup"; return; }
    const name = saveName.trim() || query.trim().slice(0, 70) || "My screen";
    const symbols = results.map((r) => r.symbol);
    const fingerprint = screenFingerprint(filters, ranking, { type: "default" });
    const payload = { user_id: userId, name, query, filters, ranking, updated_at: new Date().toISOString(), last_run_at: new Date().toISOString(), last_result_count: symbols.length, last_result_symbols: symbols, criteria_fingerprint: fingerprint, universe: "default" };
    if (activeSavedId) {
      const current = saved.find((s) => s.id === activeSavedId);
      const sameCriteria = current?.criteriaFingerprint === fingerprint;
      const prevSymbols = sameCriteria ? (current?.lastResultSymbols ?? []) : [];
      const added = sameCriteria ? symbols.filter((x) => !prevSymbols.includes(x)) : [];
      const removed = sameCriteria ? prevSymbols.filter((x) => !symbols.includes(x)) : [];
      const { error } = await supabase.from("saved_screens").update({ ...payload, last_added_symbols: added, last_removed_symbols: removed }).eq("id", activeSavedId).eq("user_id", userId);
      if (error) return setToast(error.message);
      trackEvent("saved_screen_updated", { screen_id: activeSavedId, match_count: symbols.length });
      setToast("Screen updated");
    } else {
      const { data, error } = await supabase.from("saved_screens").insert({ ...payload, last_added_symbols: [], last_removed_symbols: [] }).select("id").single();
      if (error) return setToast(error.message);
      if (data?.id) setActiveSavedId(data.id);
      trackEvent("saved_screen_created", { match_count: symbols.length });
      setToast("Screen saved");
    }
    setSaveName(""); await loadSaved();
  }

  async function runSaved(s: SavedRow) {
    setTab("screen"); setActiveSavedId(s.id); setQuery(s.query); setFilters(s.filters); setRanking(s.ranking); setInterpretation("Loaded saved criteria exactly. No re-parsing needed."); setAssumptions([]);
    const next = runScreen(stocks, s.filters, s.ranking, Infinity).map((r) => r.symbol);
    const fingerprint = screenFingerprint(s.filters, s.ranking, { type: "default" });
    const sameCriteria = !s.criteriaFingerprint || s.criteriaFingerprint === fingerprint;
    const previous = sameCriteria ? (s.lastResultSymbols ?? []) : [];
    const added = previous.length ? next.filter((x) => !previous.includes(x)) : [];
    const removed = previous.length ? previous.filter((x) => !next.includes(x)) : [];
    if (userId) await supabase.from("saved_screens").update({ last_run_at: new Date().toISOString(), last_result_count: next.length, last_result_symbols: next, last_added_symbols: added, last_removed_symbols: removed, criteria_fingerprint: fingerprint, updated_at: new Date().toISOString() }).eq("id", s.id).eq("user_id", userId);
    trackEvent("saved_screen_run", { screen_id: s.id, match_count: next.length, added: added.length, removed: removed.length });
    await loadSaved();
  }
  async function renameSaved(s: SavedRow) { const name = prompt("Rename screen", s.name)?.trim(); if (!name || !userId) return; const { error } = await supabase.from("saved_screens").update({ name, updated_at: new Date().toISOString() }).eq("id", s.id).eq("user_id", userId); if (error) setToast(error.message); else await loadSaved(); }
  async function deleteSaved(id: string) { if (!userId || !confirm("Delete this saved screen?")) return; const { error } = await supabase.from("saved_screens").delete().eq("id", id).eq("user_id", userId); if (error) setToast(error.message); else { if (activeSavedId === id) setActiveSavedId(null); await loadSaved(); } }

  async function saveDefault(f: Filter) {
    if (!userId) { location.href = "/account?mode=signup"; return; }
    const next: PreferenceRow[] = [...preferences.filter((p) => p.field !== f.field), { ...f, id: `default_${Date.now()}`, prefId: `default_${Date.now()}`, source: "default" }];
    const { error } = await supabase.auth.updateUser({ data: { screening_defaults: next } });
    if (error) setToast(error.message); else { setPreferences(next); setToast("Default saved"); }
  }
  async function removeDefault(prefId: string) { const next = preferences.filter((p) => p.prefId !== prefId && p.id !== prefId); const { error } = await supabase.auth.updateUser({ data: { screening_defaults: next } }); if (error) setToast(error.message); else setPreferences(next); }

  async function createSharedScreen(visibility: SharedVisibility) {
    if (!userId) { location.href = "/account?mode=signup"; return; }
    const slug = screenSlug(saveName.trim() || query.trim() || "Parse screen");
    const title = saveName.trim() || query.trim().slice(0, 90) || "Parse screen";
    const { error } = await supabase.from("shared_screens").insert({ owner_id: userId, source_saved_screen_id: activeSavedId, slug, title, query, filters, ranking, universe: "default", visibility });
    if (error) return setToast(error.message);
    const url = `${location.origin}/s/${slug}`; setShareUrl(url); await navigator.clipboard?.writeText(url).catch(() => {});
    trackEvent(visibility === "public" ? "screen_published" : "screen_shared", { slug, match_count: results.length });
    setToast(visibility === "public" ? "Public screen published and link copied" : "Share link copied");
  }

  function guestShare() {
    const state = encodeScreen(query, filters, ranking); const url = `${location.origin}/screens/share?state=${state}`;
    setShareUrl(url); void navigator.clipboard?.writeText(url).catch(() => {}); setToast("Exact screen link copied"); trackEvent("screen_shared", { guest: true, match_count: results.length });
  }

  return <div className="app-shell">
    <style>{styles}</style>
    <header className="topbar"><a className="brand" href="/"><Logo /><span>Parse</span></a><nav className="topnav"><a href="/screens">Screen ideas</a>{userId ? <><button onClick={() => setTab("saved")}>Saved</button><button onClick={() => setTab("preferences")}>Defaults</button><a href="/account">{authEmail?.split("@")[0] || "Account"}</a></> : <><a href="/account?mode=signin">Sign in</a><a className="btn btn-primary btn-sm" href="/account?mode=signup">Create account</a></>}</nav></header>
    <main className="main">
      {tab === "screen" && <>
        <section className="hero"><div className="eyebrow">Natural-language stock screener</div><h1>Describe the companies you want to find.</h1><p>Parse turns your words into explicit filters you can inspect, change, and run.</p><form onSubmit={submitQuery} className="searchrow"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Large healthcare companies with low P/E" aria-label="Describe your stock screen"/><button className="btn btn-primary" disabled={loading}>{loading ? "Parsing…" : filters.length ? "Refine" : "Build screen"}</button></form><div className="examples">{EXAMPLES.map((x) => <button key={x} onClick={() => { setQuery(x); void parseQuery(x, [], "marketCap", true); }}>{x}</button>)}</div></section>
        {toast && <div className="toast">{toast}</div>}
        {(filters.length > 0 || interpretation) && <section className="panel"><div className="panelhead"><div><h2>Your screen</h2>{interpretation && <p>{interpretation}</p>}</div><div className="panelactions">{userId ? <><button className="btn btn-neutral btn-sm" onClick={() => void createSharedScreen("unlisted")}>Share exact</button><button className="btn btn-neutral btn-sm" onClick={() => void createSharedScreen("public")}>Publish</button></> : <button className="btn btn-neutral btn-sm" onClick={guestShare}>Share</button>}</div></div>{assumptions.length > 0 && <div className="assumptions">{assumptions.map((a) => <div key={a}>Assumption: {a}</div>)}</div>}<div className="chips">{filters.map((f) => <FilterChip key={f.id} f={f} onEdit={editFilter} onRemove={removeFilter} onSaveDefault={saveDefault} signedIn={!!userId} />)}</div><div className="ranking"><span>Sort results:</span><select value={ranking} onChange={(e) => setRanking(e.target.value)}>{Object.entries(RANKINGS).map(([k, r]) => <option value={k} key={k}>{r.label}</option>)}</select></div><div className="savebar">{userId && <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={activeSavedId ? "Update saved screen" : "Optional screen name"}/>}<button className="btn btn-primary" onClick={() => void saveScreen()}>{activeSavedId ? "Update saved screen" : userId ? "Save screen" : "Save screen"}</button>{shareUrl && <input className="shareurl" readOnly value={shareUrl}/>}</div></section>}
        <Results rows={displayedResults} columns={columns} sort={sort} onSort={toggleSort} />
      </>}
      {tab === "saved" && <SavedScreens saved={saved} onLoad={runSaved} onRename={renameSaved} onDelete={deleteSaved} />}
      {tab === "preferences" && <Preferences preferences={preferences} onDelete={removeDefault} />}
    </main>
  </div>;
}

function Results({ rows, columns, sort, onSort }: { rows: StockRow[]; columns: Col[]; sort: { col: keyof StockRow; dir: "asc" | "desc" } | null; onSort: (c: keyof StockRow) => void }) {
  return <section className="results"><div className="resultshead"><h2>{rows.length} matches</h2><span>Daily-refreshed data</span></div>{rows.length === 0 ? <Empty title="No companies match this screen." body="Try adjusting a threshold or removing a condition." /> : <div className="tablewrap"><table><thead><tr><Th>Company</Th>{columns.map((c) => <Th key={String(c.key)} onClick={() => onSort(c.key)} hot={sort?.col === c.key}>{c.label}{sort?.col === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}</Th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.symbol}><td><div className="ticker">{r.symbol}</div><div className="co">{r.name}</div></td>{columns.map((c) => <td key={String(c.key)} className="mono">{c.fmt(r[c.key])}</td>)}</tr>)}</tbody></table></div>}</section>;
}

function FilterChip({ f, onEdit, onRemove, onSaveDefault, signedIn }: { f: Filter; onEdit: (id: string, p: Partial<Filter>) => void; onRemove: (id: string) => void; onSaveDefault: (f: Filter) => void; signedIn: boolean }) {
  const m = FIELDS[f.field]; if (!m) return null;
  return <div className={`chip ${f.source === "user" ? "chip-user" : f.source === "default" ? "chip-default" : ""}`}><span>{m.label}</span>{m.kind === "cat" ? <><select value={f.op} onChange={(e) => onEdit(f.id, { op: e.target.value as any })}><option value="==">is</option><option value="!=">is not</option></select><select value={String(f.value)} onChange={(e) => onEdit(f.id, { value: e.target.value })}>{m.options?.map((x) => <option key={x}>{x}</option>)}</select></> : <><select value={f.op} onChange={(e) => onEdit(f.id, { op: e.target.value as any })}>{[">", ">=", "<", "<="].map((o) => <option key={o}>{o}</option>)}</select><input type="number" step="any" value={Number(f.value)} onChange={(e) => onEdit(f.id, { value: Number(e.target.value) })}/><span className="unit">{m.unit}</span></>}{signedIn && f.source !== "default" && <button title="Use as default" className="iconbtn" onClick={() => onSaveDefault(f)}>☆</button>}<button title="Remove" className="iconbtn" onClick={() => onRemove(f.id)}>×</button></div>;
}

function SavedScreens({ saved, onLoad, onRename, onDelete }: { saved: SavedRow[]; onLoad: (s: SavedRow) => void; onRename: (s: SavedRow) => void; onDelete: (id: string) => void }) {
  return <section><h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Saved screens</h2>{saved.length === 0 ? <Empty title="No saved screens yet." body="Build one above, then save it to run it again anytime." /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>{saved.map((s) => <div key={s.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 10 }}><div style={{ fontSize: 14, fontWeight: 550 }}>{s.name}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{s.filters.slice(0, 3).map((f) => <span key={f.id} className="mono" style={{ fontSize: 11.5, padding: "3px 7px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.inkSoft }}>{formatFilter(f)}</span>)}{s.filters.length > 3 && <span style={{ fontSize: 11.5, color: T.inkFaint }}>+{s.filters.length - 3}</span>}</div><div style={{ fontSize: 11.5, color: T.inkFaint }}>{s.lastResultCount == null ? "No baseline yet" : `${s.lastResultCount} matches`}{s.lastRunAt ? ` · Last run ${formatAsOf(s.lastRunAt)}` : ""}</div><div style={{ display: "flex", gap: 8, marginTop: "auto" }}><button className="btn btn-primary btn-sm" onClick={() => onLoad(s)} style={{ flex: 1 }}>Run</button><button className="btn btn-neutral btn-sm" onClick={() => onRename(s)}>Rename</button><button className="btn btn-neutral btn-sm" onClick={() => onDelete(s.id)}>Delete</button></div></div>)}</div>}</section>;
}

function Preferences({ preferences, onDelete }: { preferences: PreferenceRow[]; onDelete: (id: string) => void }) {
  return <section><h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 5px" }}>My defaults</h2><p style={{ margin: "0 0 12px", color: T.inkSoft, fontSize: 13.5 }}>Defaults are applied to new screens unless the request already specifies that metric.</p>{preferences.length === 0 ? <Empty title="No defaults saved." body="Use “Save default” on a filter you want Parse to apply to future screens." /> : <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>{preferences.map((p, i) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < preferences.length - 1 ? `1px solid ${T.border}` : "none" }}><span className="mono" style={{ fontSize: 13 }}>{formatFilter(p)}</span><button className="btn btn-neutral btn-sm" onClick={() => onDelete(p.id)}>Remove default</button></div>)}</div>}</section>;
}

function Empty({ title, body }: { title: string; body: string }) { return <div style={{ background: T.surface, border: `1px dashed ${T.borderStrong}`, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}><div className="disp" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div><div style={{ fontSize: 14, color: T.inkSoft }}>{body}</div></div>; }
function Th({ children, style, hot, onClick }: { children: React.ReactNode; style?: React.CSSProperties; hot?: boolean; onClick?: () => void }) { return <th onClick={onClick} className={onClick ? "sortable" : undefined} style={{ padding: "10px 8px", fontSize: 11.5, fontWeight: 600, letterSpacing: ".04em", color: hot ? T.accent : T.inkFaint, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</th>; }

function formatFilter(f: Pick<Filter, "field" | "op" | "value">) { const m = FIELDS[f.field]; if (!m) return `${f.field} ${f.op} ${f.value}`; if (m.kind === "cat") return `${m.label} ${f.op === "!=" ? "is not" : "is"} ${f.value}`; return `${m.label} ${f.op} ${f.value}${m.unit ?? ""}`; }
function fmtNum(v: number | null, dp = 1) { return v == null ? "—" : v.toFixed(dp); }
type Col = { key: keyof StockRow; label: string; fmt: (v: any) => string };
const pct = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "%";
const mult = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "×";
const ALL_COLS: Record<string, Col> = {
  market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct },
  roic: { key: "roic", label: "ROIC FY", fmt: pct }, operating_margin: { key: "operating_margin", label: "Op. margin", fmt: pct }, fcf_margin: { key: "fcf_margin", label: "FCF margin FY", fmt: pct }, fcf_yield: { key: "fcf_yield", label: "FCF yield", fmt: pct }, debt_equity: { key: "debt_equity", label: "Debt/equity", fmt: (v) => fmtNum(v, 2) }, interest_coverage: { key: "interest_coverage", label: "Interest cover", fmt: mult }, rev_growth_3y: { key: "rev_growth_3y", label: "Rev gr. 3Y", fmt: pct }, eps_growth_3y: { key: "eps_growth_3y", label: "EPS gr. 3Y", fmt: pct }, ev_ebitda: { key: "ev_ebitda", label: "EV/EBITDA", fmt: mult },
  rsi: { key: "rsi", label: "RSI", fmt: (v) => fmtNum(v, 0) }, from_52w_high: { key: "from_52w_high", label: "% off high", fmt: pct },
};
const RANK_COL: Record<string, keyof StockRow> = { value: "pe", quality: "rev_growth", dividend: "div_yield", momentum: "chg_1w", decline: "from_52w_high", marketCap: "market_cap" };
function buildColumns(filters: Filter[], ranking: string): Col[] { const order: string[] = []; const add = (c?: string) => { if (c && c !== "chg_1w" && ALL_COLS[c] && !order.includes(c)) order.push(c); }; filters.forEach((f) => { const m = FIELDS[f.field]; if (m?.kind === "num") add(m.col); }); add(RANK_COL[ranking] as string); ["market_cap", "pe", "div_yield", "beta"].forEach(add); return order.slice(0, 6).map((c) => ALL_COLS[c]); }

function encodeScreen(q: string, filters: Filter[], ranking: string): string { const payload = { q, r: ranking, f: filters.map((f) => [f.field, f.op, f.value, f.source === "user" ? 1 : f.source === "default" ? 2 : 0]) }; return encodeURIComponent(JSON.stringify(payload)); }
function decodeScreen(s: string): { q: string; ranking: string; filters: Filter[] } | null { try { const j = JSON.parse(decodeURIComponent(s)); const filters: Filter[] = (j.f || []).map((a: any[], i: number) => ({ id: `${a[0]}_${a[1]}_url_${i}`, field: a[0], op: a[1], value: a[2], source: a[3] === 2 ? "default" : a[3] === 1 ? "user" : "ai" })); return { q: j.q || "", ranking: j.r || "marketCap", filters }; } catch { return null; } }
function formatAsOf(iso: string) { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

function Logo() { return <div className="logo"><span/><span/><span/></div>; }

const styles = `
:root{--radius:12px}
*{box-sizing:border-box}
body{margin:0;background:${T.bg};color:${T.ink}}
.app-shell{min-height:100vh;font-family:var(--font-body),'Inter',system-ui,sans-serif;background:${T.bg}}
.topbar{height:60px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${T.surface};position:sticky;top:0;z-index:20}
.brand{display:flex;align-items:center;gap:9px;text-decoration:none;color:${T.ink};font-family:var(--font-display),'Instrument Sans',system-ui,sans-serif;font-size:17px;font-weight:600}.logo{width:26px;height:26px;border-radius:7px;background:${T.accent};position:relative}.logo span{position:absolute;bottom:6px;width:3px;border-radius:1px;background:white}.logo span:nth-child(1){left:6px;height:8px}.logo span:nth-child(2){left:11.5px;height:13px}.logo span:nth-child(3){left:17px;height:5px;opacity:.6}
.topnav{display:flex;align-items:center;gap:5px}.topnav>a,.topnav>button{font-family:inherit;font-size:13.5px;color:${T.inkSoft};text-decoration:none;background:none;border:0;padding:7px 9px;cursor:pointer;border-radius:8px}.topnav>a:hover,.topnav>button:hover{background:${T.surfaceAlt};color:${T.ink}}
.main{max-width:1100px;margin:0 auto;padding:38px 24px 70px}.hero{max-width:760px;margin-bottom:26px}.eyebrow{color:${T.accent};font-size:12px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px}.hero h1,.disp{font-family:var(--font-display),'Instrument Sans',system-ui,sans-serif}.hero h1{font-size:34px;line-height:1.12;letter-spacing:-.025em;margin:0 0 10px;font-weight:600}.hero p{color:${T.inkSoft};font-size:15.5px;line-height:1.5;margin:0 0 18px}.searchrow{display:flex;gap:9px}.searchrow input{flex:1;min-width:0;height:44px;border:1px solid ${T.borderStrong};border-radius:11px;padding:0 13px;font:inherit;font-size:14.5px;background:${T.surface};color:${T.ink};outline:none}.searchrow input:focus{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentSoft}}.examples{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.examples button{border:0;background:transparent;color:${T.inkSoft};font:inherit;font-size:12.5px;cursor:pointer;padding:3px 0;margin-right:7px}.examples button:hover{color:${T.accent}}
.btn{height:40px;padding:0 16px;border-radius:10px;border:1px solid transparent;font:inherit;font-size:14px;font-weight:550;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.btn-primary{background:${T.accent};color:white}.btn-primary:hover{background:${T.accentInk}}.btn-primary:disabled{opacity:.55;cursor:default}.btn-neutral{background:${T.surface};border-color:${T.border};color:${T.inkSoft}}.btn-neutral:hover{border-color:${T.borderStrong};color:${T.ink}.btn-sm{height:34px;padding:0 12px;font-size:13px}
.panel{background:${T.surface};border:1px solid ${T.border};border-radius:15px;padding:19px;margin-bottom:22px}.panelhead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.panelhead h2{font-family:var(--font-display),'Instrument Sans',system-ui,sans-serif;font-size:17px;font-weight:600;margin:0 0 3px}.panelhead p{font-size:13px;color:${T.inkSoft};margin:0}.panelactions{display:flex;gap:6px}.assumptions{font-size:12.5px;color:${T.amber};margin:10px 0 0}.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.chip{display:flex;align-items:center;gap:5px;border:1px solid ${T.border};border-radius:9px;background:${T.surfaceAlt};padding:5px 7px 5px 9px;font-size:12.5px}.chip>span:first-child{font-weight:550}.chip select,.chip input{font:inherit;font-size:12px;border:1px solid ${T.border};border-radius:6px;background:white;color:${T.ink};height:27px;padding:0 5px}.chip input{width:72px}.unit{color:${T.inkFaint};font-size:11px}.chip-user{border-color:#B8C0E8;background:#F5F6FC}.chip-default{border-style:dashed}.iconbtn{border:0;background:none;color:${T.inkFaint};cursor:pointer;font-size:15px;padding:2px}.iconbtn:hover{color:${T.ink}.ranking{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12.5px;color:${T.inkSoft}.ranking select{font:inherit;border:1px solid ${T.border};border-radius:7px;padding:5px 7px;background:white}.savebar{display:flex;gap:8px;margin-top:14px;align-items:center;flex-wrap:wrap}.savebar>input:not(.shareurl){height:38px;border:1px solid ${T.borderStrong};border-radius:9px;padding:0 10px;font:inherit;min-width:210px}.shareurl{height:34px;flex:1;min-width:200px;border:1px solid ${T.border};border-radius:8px;padding:0 9px;font-size:12px;color:${T.inkSoft}}
.results{margin-top:10px}.resultshead{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 9px}.resultshead h2{font-family:var(--font-display),'Instrument Sans',system-ui,sans-serif;font-size:17px;font-weight:600;margin:0}.resultshead span{font-size:11.5px;color:${T.inkFaint}.tablewrap{background:${T.surface};border:1px solid ${T.border};border-radius:13px;overflow:auto}.tablewrap table{border-collapse:collapse;width:100%;min-width:680px}.tablewrap th{text-align:right;border-bottom:1px solid ${T.border};background:${T.surfaceAlt}.tablewrap th:first-child{text-align:left}.sortable{cursor:pointer}.tablewrap td{padding:10px 8px;border-bottom:1px solid ${T.border};text-align:right;font-size:13px}.tablewrap td:first-child{text-align:left;padding-left:12px}.tablewrap tr:last-child td{border-bottom:0}.ticker{font-family:var(--font-mono),'JetBrains Mono',monospace;font-size:12.5px;font-weight:650}.co{font-size:11.5px;color:${T.inkSoft};margin-top:2px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mono{font-family:var(--font-mono),'JetBrains Mono',monospace}
.toast{font-size:13px;color:${T.accentInk};background:${T.accentSoft};border-radius:9px;padding:9px 11px;margin:0 0 12px;display:inline-block}
@media(max-width:720px){.topbar{padding:0 14px}.topnav>a:not(:last-child),.topnav>button{display:none}.main{padding:28px 14px 60px}.hero h1{font-size:29px}.searchrow{flex-direction:column}.searchrow .btn{width:100%}.panelhead{flex-direction:column}.panelactions{width:100%}.savebar{align-items:stretch}.savebar>*{width:100%!important}.tablewrap{margin-left:-14px;margin-right:-14px;border-radius:0;border-left:0;border-right:0}}
`;
