"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
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

const PRESETS = [
  { name: "Deep value", q: "Cheap large caps trading at a low P/E and low price-to-book" },
  { name: "Dividend income", q: "Reliable dividend payers yielding over 3% with below-average volatility" },
  { name: "Growth", q: "Fast-growing companies with revenue growth above 15%" },
  { name: "Momentum", q: "Names with strong recent price momentum near their 52-week highs" },
  { name: "Beaten-down", q: "Large caps that have fallen recently but still have positive revenue growth" },
];

export default function Page() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [booting, setBooting] = useState(true);

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
  return (
    <>
      <BaseStyle />
      {user ? <Screener user={user} /> : <Auth />}
    </>
  );
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
      @media (prefers-reduced-motion: reduce) { .chip-enter { animation: none; } }
      @media (max-width: 720px) { .aside-hide { display: none !important; } .qbar { flex-direction: column; } .user-hide { display: none !important; } }
    `}</style>
  );
}

/* ------------------------------ Auth ------------------------------ */
function Auth() {
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

          <button onClick={submit} disabled={busy}
            style={{ width: "100%", marginTop: 22, padding: "12px 16px", background: T.accent, color: "#fff",
              border: "none", borderRadius: 10, fontSize: 15, fontWeight: 550, opacity: busy ? 0.7 : 1 }}>
            {busy ? "One moment…" : mode === "signup" ? "Sign up" : "Sign in"}
          </button>

          <div style={{ marginTop: 18, fontSize: 14, color: T.inkSoft }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(""); setNote(""); }}
              style={{ background: "none", border: "none", color: T.accent, fontWeight: 550, padding: 0, fontSize: 14 }}>
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>
      <AuthAside />
    </div>
  );
}

function AuthAside() {
  return (
    <div className="aside-hide" style={{ flex: "1 1 0", background: T.ink, color: "#fff", padding: 48,
      display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="mono" style={{ fontSize: 12.5, color: "#8B90A0", marginBottom: 20, letterSpacing: "0.04em" }}>
        DESCRIBE → INTERPRET → SCREEN
      </div>
      <div className="disp" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.28, letterSpacing: "-0.02em", maxWidth: 420 }}>
        Say what you want in plain English. Watch it become a screen you can edit.
      </div>
      <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 440 }}>
        {["P/E < 15", "Div yield > 3%", "Beta < 1.0", "Rev growth > 15%"].map((c) => (
          <span key={c} className="mono" style={{ fontSize: 12.5, padding: "6px 11px", borderRadius: 8,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#D7DAE4" }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, onEnter }:
  { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 550, color: T.inkSoft, marginBottom: 7 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder}
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
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dataErr, setDataErr] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("stocks").select("*");
      if (error) setDataErr("Could not load the universe. Is the ingest run and the table populated?");
      else setStocks((data ?? []) as StockRow[]);
      const { data: s } = await supabase.from("saved_screens").select("*").order("created_at", { ascending: false });
      if (s) setSaved(s.map((r: any) => ({ id: r.id, name: r.name, query: r.query, filters: r.filters, ranking: r.ranking })));
    })();
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
      setFilters(r.filters); setRanking(r.ranking); setInterp(r.interpretation);
      setAssumptions(r.assumptions || []);
      setResults(runScreen(stocks, r.filters, r.ranking));
      setHasRun(true);
    } catch {
      flash("The parse service didn't respond. Check that the app can reach /api/parse.");
    }
    setLoading(false);
  }, [filters, stocks]);

  const editFilter = (id: string, patch: Partial<Filter>) => {
    setFilters((fs) => {
      const next = fs.map((f) => (f.id === id ? { ...f, ...patch, source: "user" as const } : f));
      setResults(runScreen(stocks, next, ranking));
      return next;
    });
  };
  const removeFilter = (id: string) => setFilters((fs) => { const n = fs.filter((f) => f.id !== id); setResults(runScreen(stocks, n, ranking)); return n; });
  const addFilter = (field: string, op: Filter["op"], value: number | string) => {
    setFilters((fs) => {
      // If this exact field already exists, update it rather than duplicating.
      const id = `${field}_${op}_add_${Date.now()}`;
      const existing = fs.find((f) => f.field === field);
      const next = existing
        ? fs.map((f) => (f.field === field ? { ...f, op, value, source: "user" as const } : f))
        : [...fs, { id, field, op, value, source: "user" as const }];
      setResults(runScreen(stocks, next, ranking));
      return next;
    });
  };
  const changeRanking = (rk: string) => { setRanking(rk); setResults(runScreen(stocks, filters, rk)); };

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
    setResults(runScreen(stocks, rec.filters, rec.ranking)); setHasRun(true);
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => { setQuery(p.q); parse(p.q, false); }}
                  className="lift" style={{ fontSize: 13, padding: "6px 12px", background: T.surface,
                    border: `1px solid ${T.border}`, borderRadius: 20, color: T.inkSoft }}>{p.name}</button>
              ))}
            </div>
            {dataErr && <div style={{ marginTop: 12, color: T.loss, fontSize: 13.5 }}>{dataErr}</div>}
            {!dataErr && stocks.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: T.inkFaint }} className="mono">{stocks.length} names in the universe</div>
            )}
          </section>

          {hasRun && (
            <Echo filters={filters} ranking={ranking} interp={interp} assumptions={assumptions}
              onEdit={editFilter} onRemove={removeFilter} onRanking={changeRanking} onAdd={addFilter} />
          )}
          {hasRun && (
            <Results rows={results} filters={filters} ranking={ranking} loading={loading}
              onSave={saveScreen} expanded={expanded} setExpanded={setExpanded} />
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
          <button onClick={onSignOut} style={{ fontSize: 13.5, color: T.inkSoft, background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function QueryBar({ value, onChange, onSubmit, loading, refine, onRefine }:
  { value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean; refine: boolean; onRefine: () => void }) {
  return (
    <div className="qbar" style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(); }}
        placeholder="e.g. Cheap large-cap tech with low debt and a dividend over 2%"
        style={{ flex: 1, resize: "none", padding: "13px 15px", fontSize: 15.5, lineHeight: 1.45, border: `1px solid ${T.border}`, borderRadius: 12, background: T.surface, color: T.ink }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onSubmit} disabled={loading}
          style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 11, padding: "0 20px", fontSize: 14.5, fontWeight: 550, minWidth: 118, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Reading…" : "Run screen"}
        </button>
        {refine && (
          <button onClick={onRefine} disabled={loading}
            style={{ background: T.surface, color: T.accent, border: `1px solid ${T.border}`, borderRadius: 11, padding: "0 20px", fontSize: 13.5, fontWeight: 550, minWidth: 118 }}>Refine</button>
        )}
      </div>
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
        <button className="mono" onClick={() => f.field !== "sector" && setEditing(true)}
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

function Results({ rows, filters, ranking, loading, onSave, expanded, setExpanded }:
  { rows: ScreenResult[]; filters: Filter[]; ranking: string; loading: boolean; onSave: () => void; expanded: string | null; setExpanded: (s: string | null) => void }) {
  const cols: { key: keyof StockRow; label: string; fmt: (v: any) => string }[] = [
    { key: "market_cap", label: "Mkt cap", fmt: (v) => (v == null ? "—" : "$" + v + "B") },
    { key: "pe", label: "P/E", fmt: (v) => fmtNum(v) },
    { key: "div_yield", label: "Yield", fmt: (v) => (v == null ? "—" : v.toFixed(1) + "%") },
    { key: "beta", label: "Beta", fmt: (v) => fmtNum(v, 2) },
    { key: "rev_growth", label: "Rev gr.", fmt: (v) => (v == null ? "—" : v.toFixed(1) + "%") },
  ];
  const activeCols = new Set(filters.map((f) => FIELDS[f.field]?.col));

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="disp" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Results</h2>
          <span className="mono" style={{ fontSize: 13, color: T.inkFaint }}>
            {loading ? "…" : `${rows.length} names · ${RANKINGS[ranking]?.label.toLowerCase() ?? ""}`}
          </span>
        </div>
        <button onClick={onSave} className="lift"
          style={{ fontSize: 13.5, fontWeight: 550, color: T.accent, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 14px" }}>Save screen</button>
      </div>

      {rows.length === 0 && !loading ? (
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
                  {cols.map((c) => <Th key={String(c.key)} style={{ textAlign: "right" }} hot={activeCols.has(c.key as string)}>{c.label}</Th>)}
                  <Th style={{ textAlign: "right", paddingRight: 16 }}>1W</Th>
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
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.inkFaint }}>
            Live data · fundamentals from Finnhub, technicals from Yahoo, refreshed nightly.
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

function Th({ children, style, hot }: { children: React.ReactNode; style?: React.CSSProperties; hot?: boolean }) {
  return (
    <th style={{ padding: "10px 8px", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em",
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
                <button onClick={() => onLoad(s)} style={{ flex: 1, fontSize: 13, fontWeight: 550, color: "#fff", background: T.accent, border: "none", borderRadius: 8, padding: "7px 0" }}>Run</button>
                <button onClick={() => onDelete(s.id)} aria-label="Delete" style={{ fontSize: 13, color: T.inkSoft, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 11px" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
