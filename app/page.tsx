"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import Landing from "../components/Landing";
import FeedbackButton from "../components/FeedbackButton";
import { FIELDS, RANKINGS, SECTORS, type Filter, type StockRow } from "../lib/fields";
import { runScreen, type ScreenResult } from "../lib/screen";

/* Design tokens — a quiet instrument palette. One indigo accent; green/red
   only on price data, where up/down is real information. */
const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E6E8EC", borderStrong: "#D4D8DF",
  ink: "#15171C", inkSoft: "#565C67", inkFaint: "#969CA7",
  accent: "#2C36A8", accentSoft: "#ECEEFA", accentInk: "#232A85",
  gain: "#0B8A5B", loss: "#C33328",
};
const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

// Example prompts that loop as greyed placeholder text in the empty query bar,
// teaching what's possible without a persistent row of controls.
const EXAMPLES = [
  "Cheap large caps with a P/E under 15",
  "Dividend payers yielding over 3% with low volatility",
  "Tech companies growing revenue more than 20% a year",
  "Stocks more than 15% off their 52-week highs",
  "Quality names near their 52-week highs with strong momentum",
  "Beaten-down stocks that still have positive revenue growth",
];

export default function Page() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [booting, setBooting] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u?.email) setUser({ email: u.email });
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u?.email ? { email: u.email } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (booting) return <div style={{ minHeight: "100vh", background: T.bg }} />;
  if (user) return <><BaseStyle /><Screener user={user} /></>;
  if (showAuth) return <><BaseStyle /><Auth onBack={() => setShowAuth(false)} /></>;
  return <Landing mode="home" onGetStarted={() => setShowAuth(true)} />;
}

function BaseStyle() {
  return (
    <style>{`
      .scr-root { font-family: 'Inter', system-ui, sans-serif; color: ${T.ink}; background: ${T.bg}; min-height: 100vh; }
      .mono { font-family: ${FONT_MONO}; font-variant-numeric: tabular-nums; }
      .disp { font-family: ${FONT_DISPLAY}; }
      button { font-family: inherit; cursor: pointer; }
      :focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 4px; }
      .chip-enter { animation: chipin .28s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes chipin { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      .row-hover:hover { background: ${T.surfaceAlt}; }
      .lift { transition: box-shadow .15s, border-color .15s; }
      .lift:hover { border-color: ${T.borderStrong}; }
      .chip-val { cursor: pointer; }
      .chip-val:hover { text-decoration: underline dotted; text-underline-offset: 3px; }
      .sortable { cursor: pointer; user-select: none; }
      .sortable:hover { color: ${T.accent} !important; }
      .skel { background: linear-gradient(90deg, #EDEFF2 25%, #F6F7F9 50%, #EDEFF2 75%); background-size: 200% 100%; animation: shimmer 1.15s infinite linear; border-radius: 6px; height: 12px; }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .btn { font-family: inherit; font-weight: 550; font-size: 14.5px; border-radius: 10px; height: 40px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; border: 1px solid transparent; transition: background .14s, border-color .14s; }
      .btn:disabled { opacity: .65; cursor: default; }
      .btn-primary { background: ${T.accent}; color: #fff; }
      .btn-primary:hover:not(:disabled) { background: ${T.accentInk}; }
      .btn-secondary { background: ${T.accentSoft}; color: ${T.accentInk}; border-color: #DADEF6; }
      .btn-secondary:hover:not(:disabled) { background: #E2E6F8; }
      .btn-ghost { background: transparent; color: ${T.accent}; }
      .btn-ghost:hover:not(:disabled) { background: ${T.accentSoft}; }
      .btn-neutral { background: ${T.surface}; color: ${T.inkSoft}; border-color: ${T.border}; }
      .btn-neutral:hover:not(:disabled) { border-color: ${T.borderStrong}; }
      .btn-sm { height: 34px; font-size: 13.5px; padding: 0 14px; border-radius: 9px; }
      .cmdbar { display: flex; align-items: center; gap: 12px; background: ${T.surface}; border: 1px solid ${T.borderStrong}; border-radius: 14px; padding: 6px 6px 6px 16px; box-shadow: 0 1px 2px rgba(21,23,28,.04); transition: border-color .14s, box-shadow .14s; }
      .cmdbar:focus-within { border-color: ${T.accent}; box-shadow: 0 0 0 3px ${T.accentSoft}; }
      .cmd-field { position: relative; flex: 1; display: flex; align-items: center; min-width: 0; }
      .cmd-field textarea { width: 100%; border: none; outline: none; background: transparent; font-family: inherit; font-size: 15.5px; line-height: 1.4; color: ${T.ink}; resize: none; padding: 9px 0; max-height: 120px; }
      .ph-loop { position: absolute; left: 0; right: 8px; top: 50%; transform: translateY(-50%); color: ${T.inkFaint}; font-size: 15.5px; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: phin .55s ease; }
      @keyframes phin { from { opacity: 0; } to { opacity: 1; } }
      .demo-row { animation: rowin .34s ease both; }
      @keyframes rowin { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
      .cursor { animation: blink 1.05s step-end infinite; }
      @keyframes blink { 50% { opacity: 0; } }
      .fld { transition: border-color .14s, box-shadow .14s; }
      .fld:focus { outline: none; border-color: ${T.accent}; box-shadow: 0 0 0 3px ${T.accentSoft}; }
      @media (prefers-reduced-motion: reduce) { .chip-enter { animation: none; } }
      @media (max-width: 720px) { .aside-hide { display: none !important; } .qbar { flex-direction: column; } .user-hide { display: none !important; } }
    `}</style>
  );
}

/* ------------------------------ Auth ------------------------------ */
function Auth({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setNote("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("Enter a valid email address.");
    if (pw.length < 6) return setErr("Use at least 6 characters for your password.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (!data.session) setNote("Account created. Check your email to confirm, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scr-root" style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", padding: 0, marginBottom: 18, color: T.inkSoft, fontSize: 13.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>← Back</button>
          )}
          <Brand />
          <h1 className="disp" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "28px 0 6px" }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ color: T.inkSoft, fontSize: 14.5, margin: "0 0 24px", lineHeight: 1.5 }}>
            {mode === "signup" ? "Save your screens and run them whenever you want." : "Sign in to reach your saved screens."}
          </p>

          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" onEnter={submit} />
          <div style={{ height: 14 }} />
          <Field label="Password" type="password" value={pw} onChange={setPw} placeholder="At least 6 characters" onEnter={submit} />

          {err && <div style={{ color: T.loss, fontSize: 13.5, marginTop: 14 }}>{err}</div>}
          {note && <div style={{ color: T.accentInk, fontSize: 13.5, marginTop: 14 }}>{note}</div>}

          <button onClick={submit} disabled={busy} className="btn btn-primary" style={{ width: "100%", height: 44, marginTop: 22 }}>
            {busy ? "One moment…" : mode === "signup" ? "Sign up" : "Sign in"}
          </button>

          <div style={{ marginTop: 18, fontSize: 14, color: T.inkSoft }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(""); setNote(""); }}
              style={{ background: "none", border: "none", color: T.accent, fontWeight: 550, padding: 0, fontSize: 14 }}>
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>

          <div style={{ marginTop: 26, paddingTop: 16, borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.inkFaint, display: "flex", gap: 14, alignItems: "center" }}>
            <a href="/about" style={{ color: T.inkSoft, textDecoration: "none" }}>About</a>
            <FeedbackButton style={{ background: "none", border: "none", color: T.inkSoft, fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }} />
          </div>
        </div>
      </div>
      <AuthAside />
    </div>
  );
}

const DEMO = [
  { q: "Cheap large caps", rank: "Cheapest first", note: "",
    chips: ["P/E < 15", "P/B < 3"],
    rows: [["BRK.B", "9.4", "+0.4%"], ["JPM", "12.8", "+0.9%"], ["BAC", "12.1", "+1.0%"]] },
  { q: "Safe dividend stocks", rank: "Highest yield", note: "read \u201Csafe\u201D as low volatility",
    chips: ["Div yield > 3%", "Beta < 1.0"],
    rows: [["VZ", "6.1%", "-0.9%"], ["PFE", "5.9%", "-4.1%"], ["T", "5.4%", "+0.5%"]] },
  { q: "Beaten-down but still growing", rank: "Most beaten-down", note: "",
    chips: ["% off high < -15%", "Rev growth > 0%"],
    rows: [["INTC", "-38%", "-6.4%"], ["NKE", "-31%", "-5.8%"], ["BA", "-24%", "-3.9%"]] },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const h = () => setReduce(m.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return reduce;
}

function AuthAside() {
  const reduce = usePrefersReducedMotion();
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState("");
  const [chips, setChips] = useState(0);
  const [rows, setRows] = useState(0);
  const cur = DEMO[scene];

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    (async () => {
      setTyped(""); setChips(0); setRows(0);
      for (let i = 1; i <= cur.q.length; i++) { await wait(36); if (cancelled) return; setTyped(cur.q.slice(0, i)); }
      await wait(550);
      for (let i = 1; i <= cur.chips.length; i++) { await wait(300); if (cancelled) return; setChips(i); }
      await wait(450);
      for (let i = 1; i <= cur.rows.length; i++) { await wait(240); if (cancelled) return; setRows(i); }
      await wait(2800); if (cancelled) return;
      setScene((s) => (s + 1) % DEMO.length);
    })();
    return () => { cancelled = true; };
  }, [scene, reduce]);

  const dTyped = reduce ? cur.q : typed;
  const dChips = reduce ? cur.chips.length : chips;
  const dRows = reduce ? cur.rows.length : rows;
  const phase = dRows > 0 ? 2 : dChips > 0 ? 1 : 0;
  const steps = ["Describe", "Interpret", "Screen"];

  return (
    <div className="aside-hide" style={{ flex: "1 1 0", background: T.ink, color: "#fff", padding: 48,
      display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="mono" style={{ fontSize: 12.5, marginBottom: 22, letterSpacing: "0.04em", display: "flex", gap: 8 }}>
        {steps.map((s, i) => (
          <span key={s} style={{ color: i === phase ? "#C6CAF7" : "#6A6F82", transition: "color .3s" }}>
            {s.toUpperCase()}{i < 2 ? "  →" : ""}
          </span>
        ))}
      </div>
      <div className="disp" style={{ fontSize: 27, fontWeight: 500, lineHeight: 1.28, letterSpacing: "-0.02em", maxWidth: 430, marginBottom: 28 }}>
        Say what you want in plain English. Watch it become a screen you can edit.
      </div>

      <div style={{ maxWidth: 440, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 16 }}>
        <div className="mono" style={{ fontSize: 13, color: "#D7DAE4", minHeight: 40, lineHeight: 1.5,
          display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 9, padding: "8px 11px" }}>
          <span>{dTyped}</span>{!reduce && <span className="cursor" style={{ marginLeft: 1, color: "#8E93FF" }}>▍</span>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, minHeight: 26 }}>
          {cur.chips.slice(0, dChips).map((c) => (
            <span key={c} className={reduce ? "mono" : "mono chip-enter"} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8,
              background: "rgba(142,147,255,0.14)", border: "1px solid rgba(142,147,255,0.28)", color: "#C6CAF7" }}>{c}</span>
          ))}
        </div>

        {cur.note && dChips >= cur.chips.length && (
          <div className="mono" style={{ fontSize: 11, color: "#7A7F92", marginTop: 7 }}>· {cur.note}</div>
        )}

        {dRows > 0 && (
          <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
            <div className="mono" style={{ fontSize: 10.5, color: "#6A6F82", letterSpacing: "0.05em", marginBottom: 7 }}>{cur.rank.toUpperCase()}</div>
            {cur.rows.slice(0, dRows).map((r) => (
              <div key={r[0]} className={reduce ? "" : "demo-row"} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                <span className="mono" style={{ fontSize: 12.5, color: "#EDEEF5", fontWeight: 500, width: 58 }}>{r[0]}</span>
                <span className="mono" style={{ fontSize: 12.5, color: "#9AA0AB", flex: 1, textAlign: "right", paddingRight: 14 }}>{r[1]}</span>
                <span className="mono" style={{ fontSize: 12.5, color: r[2].startsWith("-") ? "#E58C84" : "#5FC79E", width: 48, textAlign: "right" }}>{r[2]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, onEnter }:
  { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, marginBottom: 7 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} className="fld"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        style={{ width: "100%", padding: "11px 13px", fontSize: 15, background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: 10, color: T.ink }} />
    </label>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", left: 6, bottom: 6, width: 3, height: 8, background: "#fff", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: 11.5, bottom: 6, width: 3, height: 13, background: "#fff", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: 17, bottom: 6, width: 3, height: 5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
      </div>
      <span className="disp" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Parse</span>
    </div>
  );
}

/* --------------------------- Screener --------------------------- */
interface SavedRow { id: string; name: string; query: string; filters: Filter[]; ranking: string; }

function Screener({ user }: { user: { email: string } }) {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");
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
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dataErr, setDataErr] = useState("");
  const stocksRef = useRef<StockRow[]>([]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  // Push/replace the screen into the URL so it's shareable and the back button
  // recovers the previous screen. Push for a new screen, replace for edits.
  const syncUrl = (q: string, fs: Filter[], rk: string, push: boolean) => {
    const url = `${window.location.pathname}?s=${encodeScreen(q, fs, rk)}`;
    if (push) window.history.pushState({}, "", url);
    else window.history.replaceState({}, "", url);
  };
  const applyScreen = (fs: Filter[], rk: string, note: string) => {
    setFilters(fs); setRanking(rk); setInterp(note); setAssumptions([]);
    setResults(runScreen(stocksRef.current, fs, rk, Infinity));
    setHasRun(true); setSort(null); setShowAll(false);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("stocks").select("*");
      if (error) { setDataErr("Could not load the universe. Is the ingest run and the table populated?"); return; }
      const rows = (data ?? []) as any[];
      setStocks(rows as StockRow[]);
      stocksRef.current = rows as StockRow[];
      setDataAsOf(rows.reduce((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), ""));
      // Restore a shared screen if one is in the URL.
      const s = new URLSearchParams(window.location.search).get("s");
      const dec = s ? decodeScreen(s) : null;
      if (dec) {
        setQuery(dec.q); setFilters(dec.filters); setRanking(dec.ranking);
        setInterp("Restored a shared screen."); setAssumptions([]);
        setResults(runScreen(rows as StockRow[], dec.filters, dec.ranking, Infinity));
        setHasRun(true);
      }
      const { data: sv } = await supabase.from("saved_screens").select("*").order("created_at", { ascending: false });
      if (sv) setSaved(sv.map((r: any) => ({ id: r.id, name: r.name, query: r.query, filters: r.filters, ranking: r.ranking })));
    })();
  }, []);

  // Back / forward restores the screen from the URL without a parse call.
  useEffect(() => {
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get("s");
      const dec = s ? decodeScreen(s) : null;
      if (dec) { setQuery(dec.q); applyScreen(dec.filters, dec.ranking, "Restored a previous screen."); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const parse = useCallback(async (q: string, isRefine: boolean) => {
    if (!q.trim()) return;
    setLoading(true);
    const lockedIds = filters.filter((f) => f.source === "user").map((f) => f.id);
    try {
      const res = await fetch("/api/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, filters: isRefine ? filters : [], lockedIds: isRefine ? lockedIds : [] }),
      });
      const r = await res.json();
      if (r?.error) { flash(r.error); setLoading(false); return; }
      setInterp(r.interpretation); setAssumptions(r.assumptions || []);
      setFilters(r.filters); setRanking(r.ranking);
      setResults(runScreen(stocks, r.filters, r.ranking, Infinity));
      setHasRun(true); setSort(null); setShowAll(false);
      syncUrl(q, r.filters, r.ranking, true);
    } catch {
      flash("The parse service didn't respond. Check that the app can reach /api/parse.");
    }
    setLoading(false);
  }, [filters, stocks]);

  const recompute = (fs: Filter[], rk: string) => { setResults(runScreen(stocks, fs, rk, Infinity)); setShowAll(false); syncUrl(query, fs, rk, false); };
  const editFilter = (id: string, patch: Partial<Filter>) => {
    setFilters((fs) => {
      const next = fs.map((f) => (f.id === id ? { ...f, ...patch, source: "user" as const } : f));
      recompute(next, ranking);
      return next;
    });
  };
  const removeFilter = (id: string) => setFilters((fs) => { const n = fs.filter((f) => f.id !== id); recompute(n, ranking); return n; });
  const addFilter = (field: string, op: Filter["op"], value: number | string) => {
    setFilters((fs) => {
      // If this field already exists, update it rather than duplicating.
      const id = `${field}_${op}_add_${Date.now()}`;
      const existing = fs.find((f) => f.field === field);
      const next = existing
        ? fs.map((f) => (f.field === field ? { ...f, op, value, source: "user" as const } : f))
        : [...fs, { id, field, op, value, source: "user" as const }];
      recompute(next, ranking);
      return next;
    });
  };
  const changeRanking = (rk: string) => { setRanking(rk); setSort(null); recompute(filters, rk); };
  const toggleSort = (col: keyof StockRow) => {
    setSort((cur) => (!cur || cur.col !== col ? { col, dir: "desc" } : cur.dir === "desc" ? { col, dir: "asc" } : null));
  };
  const shareLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); flash("Link copied."); }
    catch { flash("Copy failed — the screen is in the address bar."); }
  };

  // Derive what the table shows: apply a column sort if set, then cap unless expanded.
  const total = results.length;
  const displayed = useMemo(() => {
    let r = results;
    if (sort) {
      const { col, dir } = sort; const d = dir === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => {
        const av = a[col] as any, bv = b[col] as any;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * d;
      });
    }
    return r.slice(0, showAll ? r.length : 25);
  }, [results, sort, showAll]);

  const saveScreen = async () => {
    if (!filters.length) return flash("Build a screen first, then save it.");
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return flash("Sign in again to save.");
    const name = query.trim().slice(0, 60) || "Untitled screen";
    const { data, error } = await supabase.from("saved_screens")
      .insert({ user_id: uid, name, query, filters, ranking }).select().single();
    if (error) return flash("Could not save. Check the saved_screens policies.");
    setSaved((prev) => [{ id: data.id, name, query, filters, ranking }, ...prev]);
    flash("Screen saved.");
  };
  const loadScreen = (rec: SavedRow) => {
    setQuery(rec.query); setFilters(rec.filters); setRanking(rec.ranking);
    setInterp("Loaded a saved screen."); setAssumptions([]);
    setResults(runScreen(stocks, rec.filters, rec.ranking, Infinity));
    setHasRun(true); setSort(null); setShowAll(false);
    syncUrl(rec.query, rec.filters, rec.ranking, true);
  };
  const deleteScreen = async (id: string) => {
    await supabase.from("saved_screens").delete().eq("id", id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="scr-root">
      <TopBar email={user.email} onSignOut={() => supabase.auth.signOut()} />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22 }}>
          <section>
            <h1 className="disp" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Describe the screen you want
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 14.5, margin: "0 0 16px" }}>
              Plain English. It becomes editable filters you can tune by hand.
            </p>
            <QueryBar value={query} onChange={setQuery} onSubmit={() => parse(query, false)} loading={loading} refine={hasRun} onRefine={() => parse(query, true)} />
            {dataErr && <div style={{ marginTop: 12, color: T.loss, fontSize: 13.5 }}>{dataErr}</div>}
            {!dataErr && stocks.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: T.inkFaint }}>Screening the S&amp;P 500 and Nasdaq 100</div>
            )}
          </section>

          {hasRun && (
            <Echo filters={filters} ranking={ranking} interp={interp} assumptions={assumptions}
              onEdit={editFilter} onRemove={removeFilter} onRanking={changeRanking} onAdd={addFilter} />
          )}
          {hasRun && (
            <Results rows={displayed} total={total} filters={filters} ranking={ranking} loading={loading}
              sort={sort} onSort={toggleSort} showAll={showAll} onToggleShowAll={() => setShowAll((v) => !v)}
              dataAsOf={dataAsOf} onSave={saveScreen} onShare={shareLink}
              expanded={expanded} setExpanded={setExpanded} />
          )}
          <Saved saved={saved} onLoad={loadScreen} onDelete={deleteScreen} />
        </div>
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
          background: T.ink, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );
}

function TopBar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(244,245,247,0.85)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Brand />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="user-hide" style={{ fontSize: 13.5, color: T.inkSoft }}>{email}</span>
          <a href="/about" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>About</a>
          <FeedbackButton className="btn btn-ghost btn-sm" />
          <button className="btn btn-neutral btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function QueryBar({ value, onChange, onSubmit, loading, refine, onRefine }:
  { value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean; refine: boolean; onRefine: () => void }) {
  const [idx, setIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Loop the greyed example prompts only while the field is empty.
  useEffect(() => {
    if (value) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % EXAMPLES.length), 3400);
    return () => clearInterval(t);
  }, [value]);

  const grow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); }
    else if (e.key === "Tab" && !value) { e.preventDefault(); onChange(EXAMPLES[idx]); }
  };

  return (
    <div>
      <div className="cmdbar">
        <span style={{ color: T.inkFaint, display: "flex", flexShrink: 0 }} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </span>
        <div className="cmd-field">
          {!value && <span key={idx} className="ph-loop">{EXAMPLES[idx]}</span>}
          <textarea ref={taRef} value={value} rows={1} aria-label="Describe the screen you want"
            onChange={(e) => { onChange(e.target.value); grow(); }} onKeyDown={onKey} />
        </div>
        <button className="btn btn-primary" onClick={onSubmit} disabled={loading} style={{ flexShrink: 0 }}>
          {loading ? "Reading…" : <>Run
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 8h8M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </>}
        </button>
      </div>
      {refine && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={onRefine} disabled={loading}>Refine</button>
        </div>
      )}
    </div>
  );
}

function Echo({ filters, ranking, interp, assumptions, onEdit, onRemove, onRanking, onAdd }:
  { filters: Filter[]; ranking: string; interp: string; assumptions: string[]; onEdit: (id: string, p: Partial<Filter>) => void; onRemove: (id: string) => void; onRanking: (rk: string) => void; onAdd: (field: string, op: Filter["op"], value: number | string) => void }) {
  return (
    <section className="lift" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 18px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.02em" }}>HOW THIS WAS READ</div>
        <div style={{ fontSize: 13, color: T.inkFaint }}>{interp}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15, alignItems: "center" }}>
        {filters.length === 0 && <span style={{ color: T.inkFaint, fontSize: 14 }}>No filters yet.</span>}
        {filters.map((f) => <Chip key={f.id} f={f} onEdit={onEdit} onRemove={onRemove} />)}
        <AddFilter existing={filters.map((f) => f.field)} onAdd={onAdd} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: T.inkSoft }}>Rank by</span>
        <select value={ranking} onChange={(e) => onRanking(e.target.value)}
          style={{ fontSize: 13.5, padding: "6px 10px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.ink }}>
          {Object.values(RANKINGS).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.inkFaint }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: T.accent, display: "inline-block" }} /> edited by you, kept on refine
        </span>
      </div>
      {assumptions.length > 0 && (
        <div style={{ marginTop: 14, padding: "11px 13px", background: T.accentSoft, borderRadius: 10, fontSize: 13.5, color: T.accentInk }}>
          {assumptions.map((a, i) => <div key={i}>· {a}</div>)}
          <div style={{ marginTop: 4, color: T.inkSoft, fontSize: 12.5 }}>Change any chip if that's not what you meant.</div>
        </div>
      )}
    </section>
  );
}

function Chip({ f, onEdit, onRemove }: { f: Filter; onEdit: (id: string, p: Partial<Filter>) => void; onRemove: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const meta = FIELDS[f.field] || { label: f.field, unit: undefined };
  const isUser = f.source === "user";
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const display = f.field === "sector" ? String(f.value) : `${meta.label} ${f.op} ${f.value}${meta.unit === "%" ? "%" : ""}`;

  return (
    <span className="chip-enter" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 9px 7px 12px",
      borderRadius: 9, fontSize: 13.5, background: isUser ? T.accentSoft : T.surfaceAlt,
      border: `1px solid ${isUser ? "#C9CEF3" : T.border}`, color: isUser ? T.accentInk : T.ink }}>
      {isUser && <span style={{ width: 6, height: 6, borderRadius: 6, background: T.accent, flexShrink: 0 }} />}
      {editing && f.field !== "sector" ? (
        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <select value={f.op} onChange={(e) => onEdit(f.id, { op: e.target.value as Filter["op"] })}
            style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 3px", fontSize: 13, background: "#fff" }}>
            {["<", "<=", ">", ">=", "=="].map((o) => <option key={o}>{o}</option>)}
          </select>
          <input ref={ref} type="number" value={String(f.value)}
            onChange={(e) => onEdit(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })}
            onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
            style={{ width: 62, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 6px", fontSize: 13 }} />
        </span>
      ) : (
        <button className={`mono${f.field !== "sector" ? " chip-val" : ""}`} onClick={() => f.field !== "sector" && setEditing(true)}
          title={f.field !== "sector" ? "Click to edit" : undefined}
          style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: 13.5, cursor: f.field === "sector" ? "default" : "pointer" }}>{display}</button>
      )}
      <button onClick={() => onRemove(f.id)} aria-label="Remove filter"
        style={{ background: "none", border: "none", color: T.inkFaint, padding: "0 2px", fontSize: 15, lineHeight: 1 }}>×</button>
    </span>
  );
}

const DEFAULT_OP: Record<string, Filter["op"]> = {
  pe: "<", pb: "<", ps: "<", beta: "<", rsi: "<",
  divYield: ">", marketCap: ">", revGrowth: ">", from52wHigh: ">", chg1w: ">",
};

// Inline control to add an indicator the model didn't infer. Added filters are
// user-sourced, so they render like hand edits and survive refines.
function AddFilter({ existing, onAdd }: { existing: string[]; onAdd: (field: string, op: Filter["op"], value: number | string) => void }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("pe");
  const [op, setOp] = useState<Filter["op"]>("<");
  const [value, setValue] = useState("");
  const [sector, setSector] = useState(SECTORS[0]);

  const meta = FIELDS[field];
  const isSector = field === "sector";

  const pickField = (k: string) => {
    setField(k);
    if (k !== "sector") setOp(DEFAULT_OP[k] ?? "<");
  };
  const reset = () => { setOpen(false); setField("pe"); setOp("<"); setValue(""); setSector(SECTORS[0]); };
  const submit = () => {
    if (isSector) { onAdd("sector", "==", sector); reset(); return; }
    if (value === "" || !Number.isFinite(Number(value))) return;
    onAdd(field, op, Number(value));
    reset();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9,
          fontSize: 13.5, background: "transparent", border: `1px dashed ${T.borderStrong}`, color: T.inkSoft }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add filter
      </button>
    );
  }

  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 7px",
      borderRadius: 9, background: T.surfaceAlt, border: `1px solid ${T.borderStrong}` }}>
      <select value={field} onChange={(e) => pickField(e.target.value)}
        style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 4px", fontSize: 13, background: "#fff" }}>
        {Object.values(FIELDS).map((m) => (
          <option key={m.key} value={m.key} disabled={existing.includes(m.key) && m.key !== field}>{m.label}</option>
        ))}
      </select>
      {isSector ? (
        <select value={sector} onChange={(e) => setSector(e.target.value)}
          style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 4px", fontSize: 13, background: "#fff" }}>
          {SECTORS.map((s) => <option key={s}>{s}</option>)}
        </select>
      ) : (
        <>
          <select value={op} onChange={(e) => setOp(e.target.value as Filter["op"])}
            style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 3px", fontSize: 13, background: "#fff" }}>
            {["<", "<=", ">", ">="].map((o) => <option key={o}>{o}</option>)}
          </select>
          <input type="number" autoFocus value={value} placeholder={meta?.unit === "%" ? "%" : "0"}
            onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ width: 58, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 6px", fontSize: 13 }} />
        </>
      )}
      <button onClick={submit} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 12.5, fontWeight: 550 }}>Add</button>
      <button onClick={reset} aria-label="Cancel" style={{ background: "none", border: "none", color: T.inkFaint, padding: "0 2px", fontSize: 15, lineHeight: 1 }}>×</button>
    </span>
  );
}

function fmtNum(v: number | null, dp = 1) { return v == null ? "—" : v.toFixed(dp); }

// ---- Results table helpers ----
type Col = { key: keyof StockRow; label: string; fmt: (v: any) => string };
const pct = (v: any) => (v == null ? "—" : (v as number).toFixed(1) + "%");
const ALL_COLS: Record<string, Col> = {
  market_cap:    { key: "market_cap",    label: "Mkt cap",    fmt: (v) => (v == null ? "—" : "$" + v + "B") },
  pe:            { key: "pe",            label: "P/E",        fmt: (v) => fmtNum(v) },
  pb:            { key: "pb",            label: "P/B",        fmt: (v) => fmtNum(v) },
  ps:            { key: "ps",            label: "P/S",        fmt: (v) => fmtNum(v) },
  div_yield:     { key: "div_yield",     label: "Yield",      fmt: pct },
  beta:          { key: "beta",          label: "Beta",       fmt: (v) => fmtNum(v, 2) },
  rev_growth:    { key: "rev_growth",    label: "Rev gr.",    fmt: pct },
  rsi:           { key: "rsi",           label: "RSI",        fmt: (v) => fmtNum(v, 0) },
  from_52w_high: { key: "from_52w_high", label: "% off high", fmt: pct },
};
// Which single column best represents each ranking, so the ranked metric is visible.
const RANK_COL: Record<string, keyof StockRow> = {
  value: "pe", quality: "rev_growth", dividend: "div_yield",
  momentum: "chg_1w", decline: "from_52w_high", marketCap: "market_cap",
};
// Columns adapt to the screen: what the user filtered on comes first, then the
// ranked metric, then sensible defaults — capped so the table stays readable.
// chg_1w is always the trailing coloured column, so it's excluded here.
function buildColumns(filters: Filter[], ranking: string): Col[] {
  const order: string[] = [];
  const add = (c?: string) => { if (c && c !== "chg_1w" && ALL_COLS[c] && !order.includes(c)) order.push(c); };
  filters.forEach((f) => { const m = FIELDS[f.field]; if (m && m.kind === "num") add(m.col); });
  add(RANK_COL[ranking] as string);
  ["market_cap", "pe", "div_yield", "beta"].forEach(add);
  return order.slice(0, 6).map((c) => ALL_COLS[c]);
}

// ---- Shareable screen state in the URL ----
function encodeScreen(q: string, filters: Filter[], ranking: string): string {
  const payload = { q, r: ranking, f: filters.map((f) => [f.field, f.op, f.value, f.source === "user" ? 1 : 0]) };
  return encodeURIComponent(JSON.stringify(payload));
}
function decodeScreen(s: string): { q: string; ranking: string; filters: Filter[] } | null {
  try {
    const j = JSON.parse(decodeURIComponent(s));
    const filters: Filter[] = (j.f || []).map((a: any[], i: number) => ({
      id: `${a[0]}_${a[1]}_url_${i}`, field: a[0], op: a[1], value: a[2], source: a[3] ? "user" : "ai",
    }));
    return { q: j.q || "", ranking: j.r || "marketCap", filters };
  } catch { return null; }
}
function formatAsOf(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Results({ rows, total, filters, ranking, loading, sort, onSort, showAll, onToggleShowAll, dataAsOf, onSave, onShare, expanded, setExpanded }:
  { rows: ScreenResult[]; total: number; filters: Filter[]; ranking: string; loading: boolean;
    sort: { col: keyof StockRow; dir: "asc" | "desc" } | null; onSort: (c: keyof StockRow) => void;
    showAll: boolean; onToggleShowAll: () => void; dataAsOf: string;
    onSave: () => void; onShare: () => void; expanded: string | null; setExpanded: (s: string | null) => void }) {
  const cols = buildColumns(filters, ranking);
  const activeCols = new Set(filters.map((f) => FIELDS[f.field]?.col).filter(Boolean) as string[]);
  const arrow = (k: keyof StockRow) => (sort && sort.col === k ? (sort.dir === "asc" ? " ↑" : " ↓") : "");
  const countStr = loading ? "…" : total > rows.length ? `top ${rows.length} of ${total}` : `${total} names`;
  const orderStr = sort ? `sorted by ${ALL_COLS[sort.col as string]?.label ?? "column"}` : (RANKINGS[ranking]?.label.toLowerCase() ?? "");

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Results</h2>
          <span className="mono" style={{ fontSize: 13, color: T.inkFaint }}>{countStr}{orderStr ? ` · ${orderStr}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onShare} className="btn btn-ghost btn-sm">Share</button>
          <button onClick={onSave} className="btn btn-secondary btn-sm">Save screen</button>
        </div>
      </div>

      {loading ? (
        <div className="lift" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", padding: "13px 16px", borderBottom: i < 7 ? `1px solid ${T.border}` : "none" }}>
              <div className="skel" style={{ width: 44 }} />
              <div className="skel" style={{ width: 180, flex: 1 }} />
              <div className="skel" style={{ width: 60 }} />
              <div className="skel" style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty title="No names match this screen." body="Loosen a filter to widen the field, or remove one entirely." />
      ) : (
        <div className="lift" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <Th style={{ width: 34, textAlign: "right", paddingLeft: 16 }}>#</Th>
                  <Th style={{ textAlign: "left" }}>Ticker</Th>
                  <Th style={{ textAlign: "left" }}>Company</Th>
                  {cols.map((c) => (
                    <Th key={String(c.key)} style={{ textAlign: "right" }} hot={activeCols.has(c.key as string)}
                      onClick={() => onSort(c.key)}>{c.label}{arrow(c.key)}</Th>
                  ))}
                  <Th style={{ textAlign: "right", paddingRight: 16 }} onClick={() => onSort("chg_1w")}>1W{arrow("chg_1w")}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <React.Fragment key={s.symbol}>
                    <tr className="row-hover" onClick={() => setExpanded(expanded === s.symbol ? null : s.symbol)}
                      style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <td className="mono" style={{ textAlign: "right", padding: "11px 8px 11px 16px", color: T.inkFaint }}>{i + 1}</td>
                      <td className="mono" style={{ fontWeight: 600, padding: "11px 8px" }}>{s.symbol}</td>
                      <td style={{ padding: "11px 8px", color: T.ink }}>
                        {s.name} <span style={{ color: T.inkFaint, fontSize: 12 }}>· {s.sector ?? "—"}</span>
                      </td>
                      {cols.map((c) => (
                        <td key={String(c.key)} className="mono" style={{ textAlign: "right", padding: "11px 8px",
                          color: activeCols.has(c.key as string) ? T.ink : T.inkSoft, fontWeight: activeCols.has(c.key as string) ? 600 : 400 }}>
                          {c.fmt(s[c.key])}
                        </td>
                      ))}
                      <td className="mono" style={{ textAlign: "right", padding: "11px 16px 11px 8px",
                        color: (s.chg_1w ?? 0) >= 0 ? T.gain : T.loss, fontWeight: 500 }}>
                        {s.chg_1w == null ? "—" : (s.chg_1w >= 0 ? "+" : "") + s.chg_1w.toFixed(1) + "%"}
                      </td>
                    </tr>
                    {expanded === s.symbol && (
                      <tr>
                        <td colSpan={3 + cols.length + 1} style={{ background: T.surfaceAlt, padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 6, fontWeight: 600 }}>WHY IT'S HERE</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {filters.length === 0 && <span style={{ fontSize: 13, color: T.inkFaint }}>No filters — ranked only.</span>}
                            {filters.map((f) => {
                              const ok = passesUi(s, f);
                              const meta = FIELDS[f.field] || { label: f.field };
                              return (
                                <span key={f.id} className="mono" style={{ fontSize: 12.5, padding: "4px 9px", borderRadius: 7,
                                  background: "#fff", border: `1px solid ${ok ? "#BFE3D2" : T.border}`, color: ok ? T.gain : T.inkFaint }}>
                                  {ok ? "✓" : "·"} {f.field === "sector" ? String(f.value) : `${meta.label} ${f.op} ${f.value}`}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {total > 25 && (
            <button onClick={onToggleShowAll}
              style={{ width: "100%", padding: "11px 16px", background: T.surfaceAlt, border: "none", borderTop: `1px solid ${T.border}`,
                fontSize: 13, fontWeight: 550, color: T.accent, cursor: "pointer" }}>
              {showAll ? "Show top 25" : `Show all ${total}`}
            </button>
          )}
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.inkFaint }}>
            Live data{dataAsOf ? ` · as of ${formatAsOf(dataAsOf)}` : ""} · S&amp;P 500 and Nasdaq 100 · fundamentals from Finnhub, technicals from Yahoo.
          </div>
        </div>
      )}
    </section>
  );
}

// Mirror of the engine's filter check, for the per-row explanation.
function passesUi(stock: StockRow, f: Filter): boolean {
  const meta = FIELDS[f.field];
  if (!meta) return true;
  const v = (stock as any)[meta.col];
  if (meta.kind === "cat") return String(v ?? "").toLowerCase() === String(f.value).toLowerCase();
  if (v == null) return false;
  const t = Number(f.value);
  switch (f.op) {
    case "<": return v < t; case "<=": return v <= t;
    case ">": return v > t; case ">=": return v >= t;
    case "==": return v === t; default: return true;
  }
}

function Th({ children, style, hot, onClick }: { children: React.ReactNode; style?: React.CSSProperties; hot?: boolean; onClick?: () => void }) {
  return (
    <th onClick={onClick} className={onClick ? "sortable" : undefined}
      style={{ padding: "10px 8px", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em",
        color: hot ? T.accent : T.inkFaint, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</th>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: T.surface, border: `1px dashed ${T.borderStrong}`, borderRadius: 14, padding: "34px 20px", textAlign: "center" }}>
      <div className="disp" style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: T.inkSoft }}>{body}</div>
    </div>
  );
}

function Saved({ saved, onLoad, onDelete }: { saved: SavedRow[]; onLoad: (s: SavedRow) => void; onDelete: (id: string) => void }) {
  return (
    <section>
      <h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 12px" }}>Saved screens</h2>
      {saved.length === 0 ? (
        <Empty title="No saved screens yet." body="Build one above, then save it to run it again anytime." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {saved.map((s) => (
            <div key={s.id} className="lift" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 550, lineHeight: 1.35 }}>{s.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {s.filters.slice(0, 3).map((f) => (
                  <span key={f.id} className="mono" style={{ fontSize: 11.5, padding: "3px 7px", borderRadius: 6, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.inkSoft }}>
                    {f.field === "sector" ? String(f.value) : `${(FIELDS[f.field] || {}).label || f.field} ${f.op} ${f.value}`}
                  </span>
                ))}
                {s.filters.length > 3 && <span style={{ fontSize: 11.5, color: T.inkFaint, alignSelf: "center" }}>+{s.filters.length - 3}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button className="btn btn-primary btn-sm" onClick={() => onLoad(s)} style={{ flex: 1 }}>Run</button>
                <button className="btn btn-neutral btn-sm" onClick={() => onDelete(s.id)} aria-label="Delete">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
