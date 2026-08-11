"use client";

import React, { useState, useEffect } from "react";
import { FEEDBACK_URL, PORTFOLIO_URL, GITHUB_URL } from "../../lib/site";

const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E6E8EC", borderStrong: "#D4D8DF",
  ink: "#15171C", inkSoft: "#565C67", inkFaint: "#969CA7",
  accent: "#2C36A8", accentSoft: "#ECEEFA", accentInk: "#232A85",
  gain: "#0B8A5B", loss: "#C33328",
};
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const DEMO = [
  { q: "Cheap large caps with a P/E under 15", chips: ["P/E < 15", "Mkt cap > $10B"],
    rows: [["BRK.B", "9.4", "+0.4%"], ["JPM", "12.8", "+0.9%"], ["BAC", "12.1", "+1.0%"]] },
  { q: "Dividend payers yielding over 3%", chips: ["Div yield > 3%", "Beta < 1.2"],
    rows: [["VZ", "6.1%", "-0.9%"], ["PFE", "5.9%", "-4.1%"], ["T", "5.4%", "+0.5%"]] },
  { q: "Stocks more than 15% off their 52-week highs", chips: ["% off high < -15%"],
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

function ProductDemo() {
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
    <div style={{ background: T.ink, borderRadius: 16, padding: 22 }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, marginBottom: 16, letterSpacing: "0.04em", display: "flex", gap: 8 }}>
        {steps.map((s, i) => (
          <span key={s} style={{ color: i === phase ? "#C6CAF7" : "#6A6F82", transition: "color .3s" }}>
            {s.toUpperCase()}{i < 2 ? "  →" : ""}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 13.5, color: "#D7DAE4", display: "flex", alignItems: "center",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 9, padding: "10px 12px", minHeight: 42 }}>
        <span>{dTyped}</span>{!reduce && <span className="cursor" style={{ marginLeft: 1, color: "#8E93FF" }}>▍</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, minHeight: 26 }}>
        {cur.chips.slice(0, dChips).map((c) => (
          <span key={c} className={reduce ? "" : "chip-enter"} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 10px", borderRadius: 8,
            background: "rgba(142,147,255,0.14)", border: "1px solid rgba(142,147,255,0.28)", color: "#C6CAF7" }}>{c}</span>
        ))}
      </div>
      {dRows > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
          {cur.rows.slice(0, dRows).map((r) => (
            <div key={r[0]} className={reduce ? "" : "demo-row"} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontFamily: MONO, fontSize: 12.5 }}>
              <span style={{ color: "#EDEEF5", fontWeight: 500, width: 62 }}>{r[0]}</span>
              <span style={{ color: "#9AA0AB", flex: 1, textAlign: "right", paddingRight: 16 }}>{r[1]}</span>
              <span style={{ color: r[2].startsWith("-") ? "#E58C84" : "#5FC79E", width: 48, textAlign: "right" }}>{r[2]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Logo({ size = 26 }: { size?: number }) {
  const u = size / 26;
  return (
    <div style={{ width: size, height: size, borderRadius: 7 * u, background: T.accent, position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", left: 6 * u, bottom: 6 * u, width: 3 * u, height: 8 * u, background: "#fff", borderRadius: 1 }} />
      <div style={{ position: "absolute", left: 11.5 * u, bottom: 6 * u, width: 3 * u, height: 13 * u, background: "#fff", borderRadius: 1 }} />
      <div style={{ position: "absolute", left: 17 * u, bottom: 6 * u, width: 3 * u, height: 5 * u, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
    </div>
  );
}

const PAINS = [
  { pain: "\u201C60 filters, no idea which to pick\u201D", sol: "Describe your idea in plain English. Parse picks the filters for you." },
  { pain: "\u201Cevery tool has its own syntax\u201D", sol: "No dropdowns to learn. Say \u201Ccheap tech with a dividend\u201D and it maps the metrics." },
  { pain: "\u201CAI pickers are black boxes\u201D", sol: "Parse shows its work \u2014 every inferred filter is an editable chip, and it flags its guesses." },
];

export default function About() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: T.ink, background: T.bg, minHeight: "100vh" }}>
      <Styles />
      <header style={{ borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.ink }}>
            <Logo /><span style={{ fontFamily: DISP, fontSize: 17, fontWeight: 600 }}>Parse</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={FEEDBACK_URL} className="btn btn-ghost btn-sm">Feedback</a>
            <a href="/" className="btn btn-primary btn-sm">Open Parse</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Hero */}
        <div className="hero">
          <div>
            <h1 style={{ fontFamily: DISP, fontSize: 38, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.08, margin: "0 0 16px" }}>
              Screen stocks the way you think.
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 16, lineHeight: 1.55, margin: "0 0 24px", maxWidth: 460 }}>
              Most screeners hand you dozens of dropdowns and expect you to know which to set. Describe what you want in a sentence. Parse turns it into a screen, shows exactly how it read you, and lets you change any of it.
            </p>
            <a href="/" className="btn btn-primary">Try Parse</a>
          </div>
          <ProductDemo />
        </div>

        {/* Pain to fix */}
        <div className="cards">
          {PAINS.map((p) => (
            <div key={p.pain} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, background: T.surface }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: T.loss, marginBottom: 8 }}>{p.pain}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>{p.sol}</div>
            </div>
          ))}
        </div>

        {/* Belief line */}
        <div style={{ margin: "44px 0", maxWidth: 700 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
            The skill was never the screener. It was knowing which filters to set, and why.
          </div>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.6, marginTop: 12 }}>
            Parse handles that translation, and never hides it. When your words are ambiguous, it tells you how it guessed so you can correct it. You think in ideas; Parse keeps you in control of the details.
          </p>
        </div>

        {/* Scope */}
        <div style={{ fontSize: 13.5, color: T.inkSoft, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", maxWidth: 700 }}>
          Parse covers the <b>S&amp;P 500 and Nasdaq 100</b>, with fundamentals and technicals refreshed daily. It is a research tool, not investment advice.
        </div>

        {/* Builder */}
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${T.border}`, fontSize: 14, color: T.inkSoft }}>
          Built by Ram Maganti ·{" "}
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>rmaganti.com</a> ·{" "}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>GitHub</a> ·{" "}
          <a href={FEEDBACK_URL} style={{ color: T.accent, textDecoration: "none" }}>Feedback</a>
        </div>
      </main>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:inherit; font-weight:550; font-size:14.5px; height:40px; padding:0 18px; border-radius:10px; border:1px solid transparent; cursor:pointer; text-decoration:none; transition:background .14s,border-color .14s; }
      .btn-sm { height:34px; font-size:13.5px; padding:0 14px; border-radius:9px; }
      .btn-primary { background:${T.accent}; color:#fff; }
      .btn-primary:hover { background:${T.accentInk}; }
      .btn-ghost { background:transparent; color:${T.accent}; }
      .btn-ghost:hover { background:${T.accentSoft}; }
      .chip-enter { animation: chipin .3s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes chipin { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
      .demo-row { animation: rowin .34s ease both; }
      @keyframes rowin { from { opacity:0; transform:translateX(-6px);} to { opacity:1; transform:none;} }
      .cursor { animation: blink 1.05s step-end infinite; }
      @keyframes blink { 50% { opacity:0; } }
      .hero { display:grid; grid-template-columns:1.05fr .95fr; gap:36px; align-items:center; }
      .cards { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:8px; }
      @media (max-width:760px){ .hero{ grid-template-columns:1fr; gap:26px; } .cards{ grid-template-columns:1fr; } }
    `}</style>
  );
}
