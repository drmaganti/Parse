"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { FIELDS, type Filter, type StockRow } from "../../lib/fields";
import { runScreen, type ScreenResult } from "../../lib/screen";
import { trackEvent } from "../../lib/analytics";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentSoft: "#ECEEFA", loss: "#C33328" };
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function acquisitionSource() {
  if (typeof window === "undefined") return "unknown";
  return new URLSearchParams(window.location.search).get("source") || "direct";
}

export default function TryPage() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [results, setResults] = useState<ScreenResult[]>([]);
  const [ranking, setRanking] = useState("marketCap");
  const [interpretation, setInterpretation] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState(0);
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    if (initialQuery) setQuery(initialQuery.slice(0, 320));
    supabase.from("stocks").select("*").then(({ data, error }) => {
      if (error) setError("Could not load the stock universe.");
      else setStocks((data ?? []) as StockRow[]);
    });
  }, []);

  const execute = async () => {
    if (!query.trim() || loading || runs >= 3) return;
    setLoading(true); setError(""); setShareNote("");
    trackEvent("screen_run_started", { guest_run: runs + 1, source: acquisitionSource() });
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || "Could not interpret that screen.");
      const next = (body.filters || []) as Filter[];
      const nextRanking = body.ranking || "marketCap";
      const nextResults = runScreen(stocks, next, nextRanking, 25);
      setFilters(next); setRanking(nextRanking); setInterpretation(body.interpretation || ""); setAssumptions(body.assumptions || []);
      setResults(nextResults);
      setRuns((n) => n + 1);
      trackEvent("screen_run_success", { guest_run: runs + 1, filter_count: next.length, result_count: nextResults.length, source: acquisitionSource() });
    } catch (e: any) {
      const message = e?.message || "Could not interpret that screen.";
      setError(message);
      trackEvent("screen_run_error", { guest_run: runs + 1, source: acquisitionSource() });
    }
    finally { setLoading(false); }
  };

  const updateFilter = (id: string, value: string) => {
    const next = filters.map((f) => f.id === id ? { ...f, value: value === "" ? "" : Number(value), source: "user" as const } : f);
    setFilters(next); setResults(runScreen(stocks, next, ranking, 25));
    trackEvent("screen_filter_edited", { filter_count: next.length });
  };
  const removeFilter = (id: string) => {
    const next = filters.filter((f) => f.id !== id); setFilters(next); setResults(runScreen(stocks, next, ranking, 25));
    trackEvent("screen_filter_removed", { filter_count: next.length });
  };

  const shareScreen = async () => {
    if (!query.trim() || typeof window === "undefined") return;
    const shareUrl = new URL("/screens/share", window.location.origin);
    shareUrl.searchParams.set("q", query.trim().slice(0, 320));
    try {
      if (navigator.share) {
        await navigator.share({ title: "A stock screen from Parse", text: query.trim(), url: shareUrl.toString() });
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

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
    <style>{`.p-btn{height:40px;padding:0 16px;border-radius:10px;border:0;background:${T.accent};color:#fff;font:550 14px Inter,system-ui,sans-serif;cursor:pointer}.p-btn:disabled{opacity:.6}.p-btn-neutral{height:36px;padding:0 13px;border-radius:9px;border:1px solid ${T.border};background:#fff;color:${T.ink};font:550 13.5px Inter,system-ui,sans-serif;cursor:pointer}.p-link{color:${T.accent};text-decoration:none;font-size:14px}.p-query{width:100%;box-sizing:border-box;border:1px solid #D4D8DF;border-radius:13px;background:#fff;padding:14px 15px;font:15.5px Inter,system-ui,sans-serif;resize:vertical;min-height:56px}.p-query:focus{outline:none;border-color:${T.accent};box-shadow:0 0 0 3px ${T.accentSoft}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 14, alignItems: "center" }}><a className="p-link" href="/screens">Screen ideas</a><a className="p-link" href="/methodology">How it works</a><a className="p-link" href="/account?mode=signin">Sign in</a></div></div></header>
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ maxWidth: 760 }}>
        <h1 style={{ fontFamily: DISP, fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Describe the screen you want</h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, margin: "0 0 16px" }}>Try three screens without creating an account. Current universe: S&amp;P 500 + Nasdaq 100, refreshed daily.</p>
        <textarea className="p-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Example: large companies with low P/E ratios" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execute(); } }} />
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><span style={{ color: T.inkSoft, fontSize: 12.5 }}>{runs}/3 guest screens used</span><button className="p-btn" onClick={execute} disabled={!stocks.length || loading || runs >= 3}>{loading ? "Reading…" : runs >= 3 ? "Guest limit reached" : "Run screen"}</button></div>
        {error && <div style={{ color: T.loss, marginTop: 10, fontSize: 13.5 }}>{error}</div>}
      </section>

      {filters.length > 0 && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft, marginBottom: 6 }}>HOW PARSE READ THIS</div>
        {interpretation && <div style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 12 }}>{interpretation}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{filters.map((f) => {
          const meta = FIELDS[f.field];
          return <div key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${T.border}`, background: f.source === "user" ? T.accentSoft : "#FAFBFC", borderRadius: 9, padding: "6px 8px" }}><span style={{ fontFamily: MONO, fontSize: 12.5 }}>{meta?.label || f.field} {f.op}</span>{meta?.kind === "num" ? <input type="number" value={String(f.value)} onChange={(e) => updateFilter(f.id, e.target.value)} style={{ width: 62, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 5px", fontFamily: MONO, fontSize: 12.5 }} /> : <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{String(f.value)}</span>}<button onClick={() => removeFilter(f.id)} aria-label="Remove filter" style={{ border: 0, background: "transparent", color: T.inkSoft, padding: 0 }}>×</button></div>;
        })}</div>
        {assumptions.length > 0 && <div style={{ marginTop: 12, background: T.accentSoft, color: T.inkSoft, borderRadius: 9, padding: "10px 12px", fontSize: 13 }}>{assumptions.map((a, i) => <div key={i}>· {a}</div>)}</div>}
      </section>}

      {results.length > 0 && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}><div style={{ fontFamily: DISP, fontSize: 18, fontWeight: 600 }}>{results.length} matches</div><div style={{ display: "flex", gap: 9, alignItems: "center" }}><button className="p-btn-neutral" onClick={shareScreen}>Share screen</button>{shareNote && <span style={{ color: T.inkSoft, fontSize: 12.5 }}>{shareNote}</span>}</div></div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}><thead><tr>{["Symbol","Company","Price","Market cap","P/E","1W change"].map((h) => <th key={h} style={{ textAlign: h === "Symbol" || h === "Company" ? "left" : "right", padding: "8px", borderBottom: `1px solid ${T.border}`, color: T.inkSoft, fontSize: 11.5 }}>{h}</th>)}</tr></thead><tbody>{results.map((r) => <tr key={r.symbol}><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, fontFamily: MONO, fontSize: 13 }}>{r.symbol}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>{r.name}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.price == null ? "—" : `$${Number(r.price).toFixed(2)}`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.market_cap == null ? "—" : `$${Number(r.market_cap).toFixed(1)}B`}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.pe == null ? "—" : Number(r.pe).toFixed(1)}</td><td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, textAlign: "right", fontFamily: MONO, fontSize: 13 }}>{r.chg_1w == null ? "—" : `${Number(r.chg_1w).toFixed(1)}%`}</td></tr>)}</tbody></table></div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ color: T.inkSoft, fontSize: 13.5 }}>Research tool only; these are screen matches, not investment recommendations.</span><a href="/account?mode=signup" className="p-link">Create account to save →</a></div>
      </section>}

      {runs >= 3 && <section style={{ marginTop: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}><div style={{ fontFamily: DISP, fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Continue with an account</div><div style={{ color: T.inkSoft, fontSize: 14, marginBottom: 12 }}>Create an account to keep screening and save screens for later.</div><a href="/account?mode=signup" className="p-link">Create account →</a></section>}
    </main>
  </div>;
}