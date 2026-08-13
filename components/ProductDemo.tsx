"use client";

import React, { useState, useEffect } from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";

// Plain-word queries the model interprets into filters — the gap between what's
// typed and the chips that appear is the whole point.
const DEMO = [
  { q: "Cheap large caps", note: "",
    chips: ["P/E < 15", "P/B < 3"],
    rows: [["BRK.B", "9.4", "+0.4%"], ["JPM", "12.8", "+0.9%"], ["BAC", "12.1", "+1.0%"]] },
  { q: "Safe dividend stocks", note: "read \u201Csafe\u201D as low volatility",
    chips: ["Div yield > 3%", "Beta < 1.0"],
    rows: [["VZ", "6.1%", "-0.9%"], ["PFE", "5.9%", "-4.1%"], ["T", "5.4%", "+0.5%"]] },
  { q: "Beaten-down but still growing", note: "",
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

// Every section has a reserved fixed height, and the card has a fixed size, so
// the content never moves as the animation runs, scenes change, or the window
// resizes.
export default function ProductDemo() {
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
      for (let i = 1; i <= cur.q.length; i++) { await wait(42); if (cancelled) return; setTyped(cur.q.slice(0, i)); }
      await wait(550);
      for (let i = 1; i <= cur.chips.length; i++) { await wait(320); if (cancelled) return; setChips(i); }
      await wait(500);
      for (let i = 1; i <= cur.rows.length; i++) { await wait(240); if (cancelled) return; setRows(i); }
      await wait(3000); if (cancelled) return;
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
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", boxSizing: "border-box",
      background: "#15171C", borderRadius: 16, padding: 22 }}>
      <style>{`
        .pd-chip { animation: pdchip .3s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes pdchip { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
        .pd-row { animation: pdrow .34s ease both; }
        @keyframes pdrow { from { opacity:0; transform:translateX(-6px);} to { opacity:1; transform:none;} }
        .pd-cursor { animation: pdblink 1.05s step-end infinite; }
        @keyframes pdblink { 50% { opacity:0; } }
      `}</style>

      {/* breadcrumb */}
      <div style={{ fontFamily: MONO, fontSize: 11.5, height: 16, marginBottom: 14, letterSpacing: "0.04em", display: "flex", gap: 8 }}>
        {steps.map((s, i) => (
          <span key={s} style={{ color: i === phase ? "#C6CAF7" : "#6A6F82", transition: "color .3s" }}>
            {s.toUpperCase()}{i < 2 ? "  →" : ""}
          </span>
        ))}
      </div>

      {/* query line — reserves 2 lines */}
      <div style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.35, color: "#D7DAE4", height: 52, overflow: "hidden",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 9, padding: "8px 12px" }}>
        <span>{dTyped}</span>{!reduce && <span className="pd-cursor" style={{ marginLeft: 1, color: "#8E93FF" }}>▍</span>}
      </div>

      {/* chips — reserves one row */}
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 7, marginTop: 12, height: 28, overflow: "hidden" }}>
        {cur.chips.slice(0, dChips).map((c) => (
          <span key={c} className={reduce ? "" : "pd-chip"} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
            background: "rgba(142,147,255,0.14)", border: "1px solid rgba(142,147,255,0.28)", color: "#C6CAF7" }}>{c}</span>
        ))}
      </div>

      {/* interpretation note — reserved */}
      <div style={{ height: 15, marginTop: 6, fontFamily: MONO, fontSize: 11, color: "#7A7F92", overflow: "hidden" }}>
        {cur.note && dChips >= cur.chips.length ? `· ${cur.note}` : ""}
      </div>

      {/* results — reserved block */}
      <div style={{ height: 100, marginTop: 12 }}>
        {dRows > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
            {cur.rows.slice(0, dRows).map((r) => (
              <div key={r[0]} className={reduce ? "" : "pd-row"} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontFamily: MONO, fontSize: 12.5 }}>
                <span style={{ color: "#EDEEF5", fontWeight: 500, width: 62 }}>{r[0]}</span>
                <span style={{ color: "#9AA0AB", flex: 1, textAlign: "right", paddingRight: 16 }}>{r[1]}</span>
                <span style={{ color: r[2].startsWith("-") ? "#E58C84" : "#5FC79E", width: 48, textAlign: "right" }}>{r[2]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
