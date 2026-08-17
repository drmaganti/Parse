"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import Landing from "../components/Landing";
import FeedbackButton from "../components/FeedbackButton";
import { FIELDS, RANKINGS, SECTORS, type Filter, type StockRow } from "../lib/fields";
import { findFilterConflict, mergeDefaults, sameFilter } from "../lib/filter-ops";
import { runScreen, type ScreenResult } from "../lib/screen";
import { screenFingerprint, screenSlug } from "../lib/screen-state";
import { trackEvent } from "../lib/analytics";

const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E6E8EC", borderStrong: "#D4D8DF",
  ink: "#15171C", inkSoft: "#565C67", inkFaint: "#68707D",
  accent: "#2C36A8", accentSoft: "#ECEEFA", accentInk: "#232A85",
  gain: "#0B8A5B", loss: "#C33328",
};
const FONT_DISPLAY = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
const FONT_MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";
const DEFAULTS_METADATA_KEY = "parse_screening_defaults";

const EXAMPLES = [
  "Cheap large caps with a P/E under 15",
  "Dividend payers yielding over 3% with low volatility",
  "Tech companies growing revenue more than 20% a year",
  "Stocks with P/E between 10 and 20",
  "Growing companies excluding Energy",
  "Beaten-down stocks that still have positive revenue growth",
];

interface UserState { id: string; email: string; metadata: Record<string, any>; }
interface SavedRow { id: string; name: string; query: string; filters: Filter[]; ranking: string; createdAt?: string; updatedAt?: string; lastRunAt?: string | null; lastResultCount?: number | null; lastResultSymbols: string[]; criteriaFingerprint?: string | null; universe: string; }
interface PreferenceRow { id: string; field: string; op: Filter["op"]; value: number | string; }

function readPreferences(metadata: Record<string, any> | undefined): PreferenceRow[] {
  const raw = metadata?.[DEFAULTS_METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p: any, i: number) => {
    if (!p || typeof p.field !== "string" || !FIELDS[p.field]) return [];
    if (!["<", "<=", ">", ">=", "==", "!=", "in"].includes(p.op)) return [];
    if (p.value === undefined || p.value === null || p.value === "") return [];
    return [{ id: typeof p.id === "string" ? p.id : `pref_${i}`, field: p.field, op: p.op as Filter["op"], value: p.value as number | string }];
  });
}

export default function Page() {
  const [user, setUser] = useState<UserState | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u?.email) setUser({ id: u.id, email: u.email, metadata: u.user_metadata ?? {} });
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u?.email ? { id: u.id, email: u.email, metadata: u.user_metadata ?? {} } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (booting) return <div style={{ minHeight: "100vh", background: T.bg }} />;
  if (user) return <><BaseStyle /><Screener user={user} /></>;
  return <Landing mode="home" onGetStarted={() => { window.location.href = "/account?mode=signup"; }} />;
}

function BaseStyle() {
  return <style>{`
    .scr-root { font-family: var(--font-body), 'Inter', system-ui, sans-serif; color: ${T.ink}; background: ${T.bg}; min-height: 100vh; }
    .mono { font-family: ${FONT_MONO}; font-variant-numeric: tabular-nums; }
    .disp { font-family: ${FONT_DISPLAY}; }
    button, select, input, textarea { font-family: inherit; }
    button { cursor: pointer; }
    :focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 4px; }
    .row-hover:hover { background: ${T.surfaceAlt}; }
    .sortable { cursor: pointer; user-select: none; }
    .sortable:hover { color: ${T.accent} !important; }
    .btn { font-weight: 550; font-size: 14px; border-radius: 10px; height: 40px; padding: 0 17px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid transparent; transition: background .14s,border-color .14s; }
    .btn:disabled { opacity: .6; cursor: default; }
    .btn-primary { background: ${T.accent}; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: ${T.accentInk}; }
    .btn-secondary { background: ${T.accentSoft}; color: ${T.accentInk}; border-color: #DADEF6; }
    .btn-neutral { background: ${T.surface}; color: ${T.inkSoft}; border-color: ${T.border}; }
    .btn-ghost { background: transparent; color: ${T.accent}; }
    .btn-sm { height: 34px; font-size: 13px; padding: 0 13px; border-radius: 9px; }
    .cmdbar { display:flex;align-items:center;gap:12px;background:${T.surface};border:1px solid ${T.borderStrong};border-radius:14px;padding:6px 6px 6px 16px;box-shadow:0 1px 2px rgba(21,23,28,.04); }
    .cmdbar:focus-within { border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentSoft}; }
    .cmd-field { position:relative;flex:1;display:flex;align-items:center;min-width:0; }
    .cmd-field textarea { width:100%;border:none;outline:none;background:transparent;font-size:15.5px;line-height:1.4;color:${T.ink};resize:none;padding:9px 0;max-height:120px; }
    .ph-loop { position:absolute;left:0;right:8px;top:50%;transform:translateY(-50%);color:${T.inkFaint};font-size:15.5px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    @media(max-width:720px){ .user-hide{display:none!important}.cmdbar{align-items:flex-end}.screen-actions{width:100%;justify-content:flex-end} }
  `}</style>;
}

function Screener({ user }: { user: UserState }) {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [input, setInput] = useState("");
  const [screenQuery, setScreenQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [ranking, setRanking] = useState("marketCap");
  const [interp, setInterp] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [sort, setSort] = useState<{ col: keyof StockRow; dir: "asc" | "desc" } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dataAsOf, setDataAsOf] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PreferenceRow[]>(() => readPreferences(user.metadata));
  const [toast, setToast] = useState("");
  const [dataErr, setDataErr] = useState("");
  const [conflict, setConflict] = useState("");
  const stocksRef = useRef<StockRow[]>([]);
  const preferencesReady = true;

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(""), 2200); };
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  const defaultFilters = useCallback((): Filter[] => preferences.map((p) => ({
    id: `default_${p.id}`, field: p.field, op: p.op, value: p.value, source: "default" as const,
  })), [preferences]);

  const syncUrl = (q: string, fs: Filter[], rk: string, push: boolean) => {
    const url = `${window.location.pathname}?s=${encodeScreen(q, fs, rk)}`;
    if (push) window.history.pushState({}, "", url);
    else window.history.replaceState({}, "", url);
  };

  useEffect(() => {
    (async () => {
      const [{ data: stockData, error: stockError }, { data: sv }] = await Promise.all([
        supabase.from("stocks").select("*"),
        supabase.from("saved_screens").select("*").order("created_at", { ascending: false }),
      ]);

      if (stockError) { setDataErr("Could not load the universe."); return; }
      const rows = (stockData ?? []) as any[];
      setStocks(rows as StockRow[]); stocksRef.current = rows as StockRow[];
      setDataAsOf(rows.reduce((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), ""));
      if (sv) setSaved(sv.map((r: any) => ({ id: r.id, name: r.name, query: r.query, filters: r.filters, ranking: r.ranking, createdAt: r.created_at, updatedAt: r.updated_at, lastRunAt: r.last_run_at, lastResultCount: r.last_result_count, lastResultSymbols: r.last_result_symbols || [], criteriaFingerprint: r.criteria_fingerprint, universe: r.universe || "default" })));

      const s = new URLSearchParams(window.location.search).get("s");
      const dec = s ? decodeScreen(s) : null;
      if (dec) {
        setScreenQuery(dec.q); setFilters(dec.filters); setRanking(dec.ranking);
        setInterp("Restored a shared screen.");
        const issue = findFilterConflict(dec.filters); setConflict(issue || "");
        setResults(issue ? [] : runScreen(rows as StockRow[], dec.filters, dec.ranking, Infinity));
        setHasRun(true);
      }
    })();
  }, []);

  useEffect(() => {
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get("s");
      const dec = s ? decodeScreen(s) : null;
      if (dec) {
        setScreenQuery(dec.q);
        const issue = findFilterConflict(dec.filters); setConflict(issue || "");
        setFilters(dec.filters); setRanking(dec.ranking); setInterp("Restored a previous screen."); setAssumptions([]);
        setResults(issue ? [] : runScreen(stocksRef.current, dec.filters, dec.ranking, Infinity)); setHasRun(true); setSort(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const parseInput = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || loading) return;
    setLoading(true);
    try {
      const mode = hasRun ? "refine" : "new";
      const res = await fetch("/api/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: instruction, filters: hasRun ? filters : [], ranking, mode }),
      });
      const r = await res.json();
      if (!res.ok || r?.error) { flash(r?.error || "Could not update the screen."); return; }

      let next = (r.filters || []) as Filter[];
      const nextRanking = r.ranking || ranking;
      const nextQuery = hasRun ? screenQuery : instruction;
      if (!hasRun) next = mergeDefaults(next, defaultFilters());
      const issue = findFilterConflict(next);
      setFilters(next); setRanking(nextRanking); setInterp(r.interpretation || ""); setAssumptions(r.assumptions || []);
      setConflict(issue || ""); setResults(issue ? [] : runScreen(stocks, next, nextRanking, Infinity));
      setHasRun(true); setSort(null); setShowAll(false); setScreenQuery(nextQuery); setInput("");
      syncUrl(nextQuery, next, nextRanking, true);
    } catch {
      flash("The parse service didn't respond.");
    } finally { setLoading(false); }
  }, [input, loading, hasRun, filters, ranking, screenQuery, stocks, defaultFilters]);

  const resetScreen = () => {
    setInput(""); setScreenQuery(""); setFilters([]); setRanking("marketCap"); setInterp(""); setAssumptions([]);
    setResults([]); setSort(null); setShowAll(false); setHasRun(false); setConflict(""); setActiveSavedId(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  const recompute = (fs: Filter[], rk = ranking) => {
    const issue = findFilterConflict(fs); setConflict(issue || "");
    setResults(issue ? [] : runScreen(stocks, fs, rk, Infinity)); setShowAll(false); setSort(null);
    if (hasRun) syncUrl(screenQuery, fs, rk, false);
  };

  const editFilter = (id: string, patch: Partial<Filter>) => {
    setFilters((fs) => {
      const next = fs.map((f) => f.id === id ? { ...f, ...patch, source: "user" as const } : f);
      recompute(next); return next;
    });
  };
  const removeFilter = (id: string) => setFilters((fs) => { const next = fs.filter((f) => f.id !== id); recompute(next); return next; });
  const addFilter = (field: string, op: Filter["op"], value: number | string) => {
    setFilters((fs) => {
      const candidate: Filter = { id: `${field}_${op}_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, field, op, value, source: "user" };
      const next = fs.some((f) => sameFilter(f, candidate)) ? fs : [...fs, candidate];
      recompute(next); return next;
    });
  };
  const changeRanking = (rk: string) => { setRanking(rk); recompute(filters, rk); };

  const persistPreferences = async (next: PreferenceRow[]) => {
    const { error } = await supabase.auth.updateUser({ data: { [DEFAULTS_METADATA_KEY]: next } });
    if (error) return false;
    setPreferences(next);
    return true;
  };

  const saveDefault = async (filter: Filter) => {
    if (preferences.some((p) => sameFilter(p, filter))) return flash("That default is already saved.");
    const pref: PreferenceRow = { id: `pref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, field: filter.field, op: filter.op, value: filter.value };
    const nextPreferences = [...preferences, pref];
    if (!(await persistPreferences(nextPreferences))) return flash("Could not save that default.");
    setFilters((fs) => {
      const next = fs.map((f) => f.id === filter.id ? { ...f, source: "default" as const } : f);
      recompute(next); return next;
    });
    flash("Saved as a default.");
  };

  const deleteDefault = async (id: string) => {
    const pref = preferences.find((p) => p.id === id);
    const nextPreferences = preferences.filter((p) => p.id !== id);
    if (!(await persistPreferences(nextPreferences))) return flash("Could not remove that default.");
    if (pref) {
      setFilters((fs) => fs.map((f) => f.source === "default" && sameFilter(f, pref) ? { ...f, source: "user" as const } : f));
    }
    flash("Default removed.");
  };

  const total = results.length;
  const displayed = useMemo(() => {
    let rows = results;
    if (sort) {
      const d = sort.dir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[sort.col] as any, bv = b[sort.col] as any;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * d;
      });
    }
    return rows.slice(0, showAll ? rows.length : 25);
  }, [results, sort, showAll]);

  const toggleSort = (col: keyof StockRow) => setSort((cur) => (!cur || cur.col !== col ? { col, dir: "desc" } : cur.dir === "desc" ? { col, dir: "asc" } : null));

  const saveScreen = async () => {
    if (!hasRun) return flash("Build a screen first, then save it.");
    const existing = activeSavedId ? saved.find((s) => s.id === activeSavedId) : undefined;
    const name = existing?.name || screenQuery.trim().slice(0, 60) || "Untitled screen";
    const now = new Date().toISOString();
    const symbols = results.map((r) => r.symbol);
    const fingerprint = screenFingerprint(filters, ranking);
    const payload = { name, query: screenQuery, filters, ranking, updated_at: now, last_run_at: now, last_result_count: symbols.length, last_result_symbols: symbols, last_added_symbols: [], last_removed_symbols: [], criteria_fingerprint: fingerprint, universe: "default" };
    if (activeSavedId) {
      const { data, error } = await supabase.from("saved_screens").update(payload).eq("id", activeSavedId).select().single();
      if (error) return flash("Could not update the saved screen.");
      setSaved((prev) => prev.map((s) => s.id === activeSavedId ? { ...s, name: data.name, query: data.query, filters: data.filters, ranking: data.ranking, updatedAt: data.updated_at, lastRunAt: data.last_run_at, lastResultCount: data.last_result_count, lastResultSymbols: data.last_result_symbols || [], criteriaFingerprint: data.criteria_fingerprint, universe: data.universe || "default" } : s));
      flash("Saved screen updated."); trackEvent("saved_screen_updated", { result_count: symbols.length });
      return;
    }
    const { data, error } = await supabase.from("saved_screens").insert({ user_id: user.id, ...payload }).select().single();
    if (error) return flash("Could not save the screen.");
    const row: SavedRow = { id: data.id, name: data.name, query: data.query, filters: data.filters, ranking: data.ranking, createdAt: data.created_at, updatedAt: data.updated_at, lastRunAt: data.last_run_at, lastResultCount: data.last_result_count, lastResultSymbols: data.last_result_symbols || [], criteriaFingerprint: data.criteria_fingerprint, universe: data.universe || "default" };
    setSaved((prev) => [row, ...prev]); setActiveSavedId(data.id); flash("Screen saved."); trackEvent("saved_screen_created", { result_count: symbols.length });
  };

  const loadScreen = async (rec: SavedRow) => {
    setScreenQuery(rec.query || rec.name); setInput(""); setAssumptions([]); setActiveSavedId(rec.id);
    const issue = findFilterConflict(rec.filters); setConflict(issue || "");
    const nextResults = issue ? [] : runScreen(stocks, rec.filters, rec.ranking, Infinity);
    setFilters(rec.filters); setRanking(rec.ranking); setInterp("Loaded a saved screen.");
    setResults(nextResults); setHasRun(true); setSort(null); setShowAll(false); syncUrl(rec.query || rec.name, rec.filters, rec.ranking, true);
    const symbols = nextResults.map((r) => r.symbol);
    const fingerprint = screenFingerprint(rec.filters, rec.ranking, rec.universe || "default");
    const comparable = rec.criteriaFingerprint === fingerprint && rec.lastResultSymbols.length > 0;
    const prior = new Set(rec.lastResultSymbols); const current = new Set(symbols);
    const added = comparable ? symbols.filter((s) => !prior.has(s)) : [];
    const removed = comparable ? rec.lastResultSymbols.filter((s) => !current.has(s)) : [];
    const now = new Date().toISOString();
    const { data } = await supabase.from("saved_screens").update({ last_run_at: now, last_result_count: symbols.length, last_result_symbols: symbols, last_added_symbols: added, last_removed_symbols: removed, criteria_fingerprint: fingerprint, updated_at: now }).eq("id", rec.id).select().single();
    if (data) setSaved((prev) => prev.map((s) => s.id === rec.id ? { ...s, lastRunAt: data.last_run_at, lastResultCount: data.last_result_count, lastResultSymbols: data.last_result_symbols || [], criteriaFingerprint: data.criteria_fingerprint, updatedAt: data.updated_at } : s));
    trackEvent("saved_screen_run", { result_count: symbols.length, change_count: added.length + removed.length });
  };
  const renameScreen = async (rec: SavedRow) => {
    const next = window.prompt("Rename saved screen", rec.name)?.trim().slice(0, 80);
    if (!next || next === rec.name) return;
    const { error } = await supabase.from("saved_screens").update({ name: next, updated_at: new Date().toISOString() }).eq("id", rec.id);
    if (error) return flash("Could not rename the screen.");
    setSaved((prev) => prev.map((s) => s.id === rec.id ? { ...s, name: next } : s)); flash("Screen renamed.");
  };
  const deleteScreen = async (id: string) => { await supabase.from("saved_screens").delete().eq("id", id); setSaved((prev) => prev.filter((s) => s.id !== id)); if (activeSavedId === id) setActiveSavedId(null); };
  const createSharedScreen = async (visibility: "unlisted" | "public") => {
    if (!hasRun) return;
    const title = saved.find((s) => s.id === activeSavedId)?.name || screenQuery.trim().slice(0, 80) || "Stock screen";
    const slug = `${screenSlug(title)}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 8)}`;
    const { error } = await supabase.from("shared_screens").insert({ owner_id: user.id, source_saved_screen_id: activeSavedId, slug, title, query: screenQuery, filters, ranking, universe: "default", visibility });
    if (error) return flash("Could not create the shared screen.");
    const url = `${window.location.origin}/s/${slug}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    flash(visibility === "public" ? "Published. Public link copied." : "Exact link copied.");
    trackEvent(visibility === "public" ? "screen_published" : "screen_shared", { method: "persistent_link", filter_count: filters.length });
  };

  return <div className="scr-root">
    <TopBar email={user.email} onSignOut={() => supabase.auth.signOut()} />
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 24px 80px" }}>
      <section>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 5px" }}>{hasRun ? "Refine this screen" : "Describe the screen you want"}</h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, margin: "0 0 16px" }}>{hasRun ? "Add or remove criteria in the same box. Edit a chip directly to change a threshold." : "Plain English becomes explicit filters you can inspect and edit."}</p>
        <QueryBar value={input} onChange={setInput} onSubmit={parseInput} loading={loading} hasRun={hasRun} onNew={resetScreen} />
        {dataErr && <div style={{ marginTop: 12, color: T.loss, fontSize: 13.5 }}>{dataErr}</div>}
        {!dataErr && stocks.length > 0 && <div style={{ marginTop: 11, fontSize: 12.5, color: T.inkFaint }}>S&amp;P 500 and Nasdaq 100 · refreshed daily</div>}
      </section>

      {hasRun && <section style={{ marginTop: 22 }}><Echo filters={filters} ranking={ranking} interp={interp} assumptions={assumptions} conflict={conflict}
        onEdit={editFilter} onRemove={removeFilter} onRanking={changeRanking} onAdd={addFilter}
        onSaveDefault={saveDefault} preferencesReady={preferencesReady} /></section>}

      {hasRun && !conflict && <section style={{ marginTop: 22 }}><Results rows={displayed} total={total} filters={filters} ranking={ranking} sort={sort} onSort={toggleSort}
        showAll={showAll} onToggleShowAll={() => setShowAll((v) => !v)} dataAsOf={dataAsOf} onSave={saveScreen} saveLabel={activeSavedId ? "Update saved screen" : "Save screen"} onShare={() => createSharedScreen("unlisted")} onPublish={() => createSharedScreen("public")} /></section>}

      <section style={{ marginTop: 30 }}><Saved saved={saved} onLoad={loadScreen} onDelete={deleteScreen} onRename={renameScreen} /></section>
      <section style={{ marginTop: 30 }}><Preferences preferences={preferences} onDelete={deleteDefault} /></section>
    </main>
    {toast && <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: T.ink, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, zIndex: 50 }}>{toast}</div>}
  </div>;
}

function TopBar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return <div style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(244,245,247,.88)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 20 }}><div style={{ maxWidth: 1120, margin: "0 auto", padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><Brand /><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="user-hide" style={{ fontSize: 13.5, color: T.inkSoft }}>{email}</span><a href="/about" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>About</a><FeedbackButton className="btn btn-ghost btn-sm" /><button className="btn btn-neutral btn-sm" onClick={onSignOut}>Sign out</button></div></div></div>;
}

function Brand() {
  return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent, position: "relative", flexShrink: 0 }}><div style={{ position: "absolute", left: 6, bottom: 6, width: 3, height: 8, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 11.5, bottom: 6, width: 3, height: 13, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 17, bottom: 6, width: 3, height: 5, background: "rgba(255,255,255,.6)", borderRadius: 1 }} /></div><span className="disp" style={{ fontSize: 17, fontWeight: 600 }}>Parse</span></div>;
}

function QueryBar({ value, onChange, onSubmit, loading, hasRun, onNew }: { value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean; hasRun: boolean; onNew: () => void }) {
  const [idx, setIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (value || hasRun) return; const t = window.setInterval(() => setIdx((i) => (i + 1) % EXAMPLES.length), 3400); return () => window.clearInterval(t); }, [value, hasRun]);
  const grow = () => { const el = taRef.current; if (!el) return; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; };
  return <div><div className="cmdbar"><span style={{ color: T.inkFaint, display: "flex", flexShrink: 0 }} aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></span><div className="cmd-field">{!value && <span key={hasRun ? "refine" : idx} className="ph-loop">{hasRun ? "Add or remove a criterion…" : EXAMPLES[idx]}</span>}<textarea ref={taRef} value={value} rows={1} aria-label={hasRun ? "Refine the current screen" : "Describe the screen you want"} onChange={(e) => { onChange(e.target.value); grow(); }} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); } }} /></div><button className="btn btn-primary" onClick={onSubmit} disabled={loading || !value.trim()}>{loading ? "Reading…" : hasRun ? "Update screen" : "Run"}</button></div>{hasRun && <div className="screen-actions" style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}><button className="btn btn-neutral btn-sm" onClick={onNew}>New screen</button></div>}</div>;
}

function Echo({ filters, ranking, interp, assumptions, conflict, onEdit, onRemove, onRanking, onAdd, onSaveDefault, preferencesReady }: {
  filters: Filter[]; ranking: string; interp: string; assumptions: string[]; conflict: string;
  onEdit: (id: string, patch: Partial<Filter>) => void; onRemove: (id: string) => void; onRanking: (rk: string) => void;
  onAdd: (field: string, op: Filter["op"], value: number | string) => void; onSaveDefault: (f: Filter) => void; preferencesReady: boolean;
}) {
  return <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 18px 20px" }}><div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft }}>HOW THIS WAS READ</div>{interp && <div style={{ fontSize: 13, color: T.inkFaint }}>{interp}</div>}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15, alignItems: "center" }}>{filters.length === 0 && <span style={{ color: T.inkFaint, fontSize: 14 }}>No filters. Add one below or type another instruction.</span>}{filters.map((f) => <Chip key={f.id} f={f} onEdit={onEdit} onRemove={onRemove} onSaveDefault={onSaveDefault} preferencesReady={preferencesReady} />)}<AddFilter onAdd={onAdd} /></div><div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}><span style={{ fontSize: 13, color: T.inkSoft }}>Rank by</span><select value={ranking} onChange={(e) => onRanking(e.target.value)} style={{ fontSize: 13.5, padding: "6px 10px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.ink }}>{Object.values(RANKINGS).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select><span style={{ marginLeft: "auto", fontSize: 12.5, color: T.inkFaint }}>Direct edits are preserved when you update the screen.</span></div>{conflict && <div style={{ marginTop: 14, padding: "11px 13px", background: "#FFF0EE", borderRadius: 10, color: T.loss, fontSize: 13.5 }}>{conflict} Change or remove one of the filters.</div>}{assumptions.length > 0 && <div style={{ marginTop: 14, padding: "11px 13px", background: T.accentSoft, borderRadius: 10, fontSize: 13.5, color: T.accentInk }}>{assumptions.map((a, i) => <div key={i}>· {a}</div>)}</div>}</section>;
}

function Chip({ f, onEdit, onRemove, onSaveDefault, preferencesReady }: { f: Filter; onEdit: (id: string, p: Partial<Filter>) => void; onRemove: (id: string) => void; onSaveDefault: (f: Filter) => void; preferencesReady: boolean }) {
  const [editing, setEditing] = useState(false);
  const meta = FIELDS[f.field] || { label: f.field, unit: undefined, kind: "num" as const };
  const isUser = f.source === "user"; const isDefault = f.source === "default";
  const display = meta.kind === "cat" ? `${meta.label} ${f.op === "in" ? "is one of" : f.op === "!=" ? "is not" : "is"} ${f.op === "in" ? String(f.value).split("|").join(" or ") : f.value}` : `${meta.label} ${f.op} ${f.value}${meta.unit === "%" ? "%" : ""}`;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 9px 7px 11px", borderRadius: 9, fontSize: 13.5, background: isDefault ? "#F7F7FC" : isUser ? T.accentSoft : T.surfaceAlt, border: `1px solid ${isDefault ? "#BFC4E8" : isUser ? "#C9CEF3" : T.border}`, color: isUser ? T.accentInk : T.ink }}>
    {isDefault && <span style={{ fontSize: 10.5, color: T.accentInk, fontWeight: 650, textTransform: "uppercase", letterSpacing: ".04em" }}>Default</span>}
    {editing && meta.kind === "num" ? <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><select value={f.op} onChange={(e) => onEdit(f.id, { op: e.target.value as Filter["op"] })} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 3px" }}>{["<", "<=", ">", ">=", "=="].map((o) => <option key={o}>{o}</option>)}</select><input autoFocus type="number" value={String(f.value)} onChange={(e) => onEdit(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} style={{ width: 66, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 6px" }} /></span> : <button className="mono" onClick={() => meta.kind === "num" && setEditing(true)} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: 13, cursor: meta.kind === "num" ? "pointer" : "default" }}>{display}</button>}
    {preferencesReady && !isDefault && <button onClick={() => onSaveDefault(f)} title="Use this filter on future screens" style={{ background: "none", border: "none", padding: "0 2px", color: T.accent, fontSize: 11.5, fontWeight: 600 }}>Save default</button>}
    <button onClick={() => onRemove(f.id)} aria-label={isDefault ? "Remove default from this screen" : "Remove filter"} title={isDefault ? "Remove from this screen" : "Remove filter"} style={{ background: "none", border: "none", color: T.inkFaint, padding: "0 2px", fontSize: 15 }}>×</button>
  </span>;
}

function AddFilter({ onAdd }: { onAdd: (field: string, op: Filter["op"], value: number | string) => void }) {
  const [open, setOpen] = useState(false); const [field, setField] = useState("pe"); const [op, setOp] = useState<Filter["op"]>("<"); const [value, setValue] = useState(""); const [sector, setSector] = useState(SECTORS[0]);
  const meta = FIELDS[field]; const categorical = meta.kind === "cat";
  const submit = () => { if (categorical) { onAdd(field, op === "!=" ? "!=" : "==", sector); setOpen(false); return; } if (value === "" || !Number.isFinite(Number(value))) return; onAdd(field, op, Number(value)); setValue(""); setOpen(false); };
  if (!open) return <button className="btn btn-neutral btn-sm" onClick={() => setOpen(true)}>+ Add filter</button>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", padding: "6px 7px", borderRadius: 9, background: T.surfaceAlt, border: `1px solid ${T.borderStrong}` }}><select value={field} onChange={(e) => { const next = e.target.value; setField(next); setOp(FIELDS[next].kind === "cat" ? "==" : "<"); }} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px" }}>{Object.values(FIELDS).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>{categorical ? <><select value={op} onChange={(e) => setOp(e.target.value as Filter["op"])} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px" }}><option value="==">is</option><option value="!=">is not</option></select><select value={sector} onChange={(e) => setSector(e.target.value)} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px" }}>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></> : <><select value={op} onChange={(e) => setOp(e.target.value as Filter["op"])} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px" }}>{["<", "<=", ">", ">=", "=="].map((o) => <option key={o}>{o}</option>)}</select><input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={meta.unit === "%" ? "%" : "0"} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ width: 68, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 6px" }} /></>}<button className="btn btn-primary btn-sm" onClick={submit}>Add</button><button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: T.inkFaint }}>×</button></span>;
}

function Results({ rows, total, filters, ranking, sort, onSort, showAll, onToggleShowAll, dataAsOf, onSave, saveLabel, onShare, onPublish }: { rows: ScreenResult[]; total: number; filters: Filter[]; ranking: string; sort: { col: keyof StockRow; dir: "asc" | "desc" } | null; onSort: (c: keyof StockRow) => void; showAll: boolean; onToggleShowAll: () => void; dataAsOf: string; onSave: () => void; saveLabel: string; onShare: () => void; onPublish: () => void }) {
  const cols = buildColumns(filters, ranking); const activeCols = new Set(filters.map((f) => FIELDS[f.field]?.col).filter(Boolean) as string[]); const arrow = (k: keyof StockRow) => sort?.col === k ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
  return <section><div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}><div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Results</h2><span className="mono" style={{ fontSize: 13, color: T.inkFaint }}>{total > rows.length ? `top ${rows.length} of ${total}` : `${total} names`} · {sort ? "manual sort" : (RANKINGS[ranking]?.label.toLowerCase() || "")}</span></div><div style={{ display: "flex", gap: 8 }}><button onClick={onShare} className="btn btn-ghost btn-sm">Share</button><button onClick={onPublish} className="btn btn-ghost btn-sm">Publish</button><button onClick={onSave} className="btn btn-secondary btn-sm">{saveLabel}</button></div></div>{rows.length === 0 ? <Empty title="No names match this screen." body="Loosen or remove a filter to widen it." /> : <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}><thead><tr style={{ borderBottom: `1px solid ${T.border}` }}><Th style={{ textAlign: "left", paddingLeft: 16 }}>Ticker</Th><Th style={{ textAlign: "left" }}>Company</Th>{cols.map((c) => <Th key={String(c.key)} style={{ textAlign: "right" }} hot={activeCols.has(c.key as string)} onClick={() => onSort(c.key)}>{c.label}{arrow(c.key)}</Th>)}<Th style={{ textAlign: "right", paddingRight: 16 }} onClick={() => onSort("chg_1w")}>1W{arrow("chg_1w")}</Th></tr></thead><tbody>{rows.map((s) => <tr key={s.symbol} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}><td className="mono" style={{ fontWeight: 600, padding: "11px 8px 11px 16px" }}>{s.symbol}</td><td style={{ padding: "11px 8px" }}>{s.name} <span style={{ color: T.inkFaint, fontSize: 12 }}>· {s.sector ?? "—"}</span></td>{cols.map((c) => <td key={String(c.key)} className="mono" style={{ textAlign: "right", padding: "11px 8px", color: activeCols.has(c.key as string) ? T.ink : T.inkSoft, fontWeight: activeCols.has(c.key as string) ? 600 : 400 }}>{c.fmt(s[c.key])}</td>)}<td className="mono" style={{ textAlign: "right", padding: "11px 16px 11px 8px", color: (s.chg_1w ?? 0) >= 0 ? T.gain : T.loss }}>{s.chg_1w == null ? "—" : `${s.chg_1w >= 0 ? "+" : ""}${s.chg_1w.toFixed(1)}%`}</td></tr>)}</tbody></table></div>{total > 25 && <button onClick={onToggleShowAll} style={{ width: "100%", padding: "11px 16px", background: T.surfaceAlt, border: "none", borderTop: `1px solid ${T.border}`, fontSize: 13, fontWeight: 550, color: T.accent }}>{showAll ? "Show top 25" : `Show all ${total}`}</button>}<div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.inkFaint }}>Daily-refreshed data{dataAsOf ? ` · as of ${formatAsOf(dataAsOf)}` : ""} · S&amp;P 500 and Nasdaq 100</div></div>}</section>;
}

function Saved({ saved, onLoad, onDelete, onRename }: { saved: SavedRow[]; onLoad: (s: SavedRow) => void; onDelete: (id: string) => void; onRename: (s: SavedRow) => void }) {
  return <section><h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Saved screens</h2>{saved.length === 0 ? <Empty title="No saved screens yet." body="Build one above, then save it to run it again anytime." /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>{saved.map((s) => <div key={s.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 10 }}><div style={{ fontSize: 14, fontWeight: 550 }}>{s.name}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{s.filters.slice(0, 3).map((f) => <span key={f.id} className="mono" style={{ fontSize: 11.5, padding: "3px 7px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.inkSoft }}>{formatFilter(f)}</span>)}{s.filters.length > 3 && <span style={{ fontSize: 11.5, color: T.inkFaint }}>+{s.filters.length - 3}</span>}</div><div style={{ fontSize: 11.5, color: T.inkFaint }}>{s.lastResultCount == null ? "No baseline yet" : `${s.lastResultCount} matches`}{s.lastRunAt ? ` · Last run ${formatAsOf(s.lastRunAt)}` : ""}</div><div style={{ display: "flex", gap: 8, marginTop: "auto" }}><button className="btn btn-primary btn-sm" onClick={() => onLoad(s)} style={{ flex: 1 }}>Run</button><button className="btn btn-neutral btn-sm" onClick={() => onRename(s)}>Rename</button><button className="btn btn-neutral btn-sm" onClick={() => onDelete(s.id)}>Delete</button></div></div>)}</div>}</section>;
}

function Preferences({ preferences, onDelete }: { preferences: PreferenceRow[]; onDelete: (id: string) => void }) {
  return <section><h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 5px" }}>My defaults</h2><p style={{ margin: "0 0 12px", color: T.inkSoft, fontSize: 13.5 }}>Defaults are applied to new screens unless the request already specifies that metric.</p>{preferences.length === 0 ? <Empty title="No defaults saved." body="Use “Save default” on a filter you want Parse to apply to future screens." /> : <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>{preferences.map((p, i) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < preferences.length - 1 ? `1px solid ${T.border}` : "none" }}><span className="mono" style={{ fontSize: 13 }}>{formatFilter(p)}</span><button className="btn btn-neutral btn-sm" onClick={() => onDelete(p.id)}>Remove default</button></div>)}</div>}</section>;
}

function Empty({ title, body }: { title: string; body: string }) { return <div style={{ background: T.surface, border: `1px dashed ${T.borderStrong}`, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}><div className="disp" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div><div style={{ fontSize: 14, color: T.inkSoft }}>{body}</div></div>; }
function Th({ children, style, hot, onClick }: { children: React.ReactNode; style?: React.CSSProperties; hot?: boolean; onClick?: () => void }) { return <th onClick={onClick} className={onClick ? "sortable" : undefined} style={{ padding: "10px 8px", fontSize: 11.5, fontWeight: 600, letterSpacing: ".04em", color: hot ? T.accent : T.inkFaint, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</th>; }

function formatFilter(f: Pick<Filter, "field" | "op" | "value">) { const m = FIELDS[f.field]; if (!m) return `${f.field} ${f.op} ${f.value}`; if (m.kind === "cat") return `${m.label} ${f.op === "in" ? "is one of" : f.op === "!=" ? "is not" : "is"} ${f.op === "in" ? String(f.value).split("|").join(" or ") : f.value}`; const suffix = m.unit === "%" || m.unit === "×" ? m.unit : m.unit === "$B" ? "B" : ""; return `${m.label} ${f.op} ${f.value}${suffix}`; }
function fmtNum(v: number | null, dp = 1) { return v == null ? "—" : v.toFixed(dp); }
type Col = { key: keyof StockRow; label: string; fmt: (v: any) => string };
const pct = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "%";
const mult = (v: any) => v == null ? "—" : Number(v).toFixed(1) + "×";
const ALL_COLS: Record<string, Col> = {
  forward_pe: { key: "forward_pe", label: "Forward P/E", fmt: (v) => fmtNum(v) }, peg: { key: "peg", label: "PEG", fmt: (v) => fmtNum(v, 2) }, forward_peg: { key: "forward_peg", label: "Forward PEG", fmt: (v) => fmtNum(v, 2) }, earnings_yield: { key: "earnings_yield", label: "Earnings yield", fmt: pct },
  div_growth_5y: { key: "div_growth_5y", label: "Div gr. 5Y", fmt: pct }, payout_ratio: { key: "payout_ratio", label: "Payout", fmt: pct }, roe: { key: "roe", label: "ROE TTM", fmt: pct }, gross_margin: { key: "gross_margin", label: "Gross margin", fmt: pct }, current_ratio: { key: "current_ratio", label: "Current ratio", fmt: (v) => fmtNum(v, 2) }, quick_ratio: { key: "quick_ratio", label: "Quick ratio", fmt: (v) => fmtNum(v, 2) },
  price: { key: "price", label: "Price", fmt: (v) => v == null ? "—" : `$${Number(v).toFixed(2)}` }, market_cap: { key: "market_cap", label: "Mkt cap", fmt: (v) => v == null ? "—" : `$${v}B` }, pe: { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) }, pb: { key: "pb", label: "P/B", fmt: (v) => fmtNum(v) }, ps: { key: "ps", label: "P/S", fmt: (v) => fmtNum(v) }, div_yield: { key: "div_yield", label: "Yield", fmt: pct }, beta: { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) }, rev_growth: { key: "rev_growth", label: "Rev gr.", fmt: pct },
  roic: { key: "roic", label: "ROIC FY", fmt: pct }, operating_margin: { key: "operating_margin", label: "Op. margin", fmt: pct }, fcf_margin: { key: "fcf_margin", label: "FCF margin FY", fmt: pct }, fcf_yield: { key: "fcf_yield", label: "FCF yield", fmt: pct }, debt_equity: { key: "debt_equity", label: "Debt/equity", fmt: (v) => fmtNum(v, 2) }, interest_coverage: { key: "interest_coverage", label: "Interest cover", fmt: mult }, rev_growth_3y: { key: "rev_growth_3y", label: "Rev gr. 3Y", fmt: pct }, eps_growth_3y: { key: "eps_growth_3y", label: "EPS gr. 3Y", fmt: pct }, ev_ebitda: { key: "ev_ebitda", label: "EV/EBITDA", fmt: mult },
  rsi: { key: "rsi", label: "RSI", fmt: (v) => fmtNum(v, 0) }, from_52w_high: { key: "from_52w_high", label: "% off high", fmt: pct },
};
const RANK_COL: Record<string, keyof StockRow> = { value: "pe", quality: "rev_growth", dividend: "div_yield", momentum: "chg_1w", decline: "from_52w_high", marketCap: "market_cap" };
function buildColumns(filters: Filter[], ranking: string): Col[] { const order: string[] = []; const add = (c?: string) => { if (c && c !== "chg_1w" && ALL_COLS[c] && !order.includes(c)) order.push(c); }; ["price", "from_52w_high", "market_cap"].forEach(add); filters.forEach((f) => { const m = FIELDS[f.field]; if (m?.kind === "num") add(m.col); }); add(RANK_COL[ranking] as string); return order.map((c) => ALL_COLS[c]); }

function encodeScreen(q: string, filters: Filter[], ranking: string): string { const payload = { q, r: ranking, f: filters.map((f) => [f.field, f.op, f.value, f.source === "user" ? 1 : f.source === "default" ? 2 : 0]) }; return encodeURIComponent(JSON.stringify(payload)); }
function decodeScreen(s: string): { q: string; ranking: string; filters: Filter[] } | null { try { const j = JSON.parse(decodeURIComponent(s)); const filters: Filter[] = (j.f || []).map((a: any[], i: number) => ({ id: `${a[0]}_${a[1]}_url_${i}`, field: a[0], op: a[1], value: a[2], source: a[3] === 2 ? "default" : a[3] === 1 ? "user" : "ai" })); return { q: j.q || "", ranking: j.r || "marketCap", filters }; } catch { return null; } }
function formatAsOf(iso: string) { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
