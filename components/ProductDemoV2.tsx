"use client";

import React, { useEffect, useState } from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";

const DEMO = [
  {
    q: "Large companies with a P/E under 15",
    note: "read “large” as market cap above $10B",
    chips: ["Mkt cap > $10B", "P/E < 15"],
    result: "27 matches",
  },
  {
    q: "Tech companies growing revenue over 20%",
    note: "",
    chips: ["Sector = Technology", "Rev growth > 20%"],
    result: "18 matches",
  },
  {
    q: "Stocks more than 15% below their 52-week high",
    note: "",
    chips: ["% off high < -15%"],
    result: "46 matches",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(media.matches);
    const onChange = () => setReduce(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

export default function ProductDemoV2() {
  const reduce = usePrefersReducedMotion();
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState("");
  const [chips, setChips] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const current = DEMO[scene];

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    (async () => {
      setTyped(""); setChips(0); setShowResult(false);
      for (let i = 1; i <= current.q.length; i++) {
        await wait(34);
        if (cancelled) return;
        setTyped(current.q.slice(0, i));
      }
      await wait(450);
      for (let i = 1; i <= current.chips.length; i++) {
        await wait(280);
        if (cancelled) return;
        setChips(i);
      }
      await wait(420);
      if (cancelled) return;
      setShowResult(true);
      await wait(2600);
      if (!cancelled) setScene((value) => (value + 1) % DEMO.length);
    })();
    return () => { cancelled = true; };
  }, [scene, reduce, current.q, current.chips.length]);

  const visibleText = reduce ? current.q : typed;
  const visibleChips = reduce ? current.chips.length : chips;
  const resultVisible = reduce || showResult;
  const phase = resultVisible ? 2 : visibleChips > 0 ? 1 : 0;

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", boxSizing: "border-box", background: "#15171C", borderRadius: 16, padding: 22 }}>
      <style>{`
        .pd2-chip { animation: pd2chip .3s cubic-bezier(.2,.8,.2,1) both; }
        .pd2-result { animation: pd2result .34s ease both; }
        .pd2-cursor { animation: pd2blink 1.05s step-end infinite; }
        @keyframes pd2chip { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
        @keyframes pd2result { from { opacity:0; transform:translateX(-5px); } to { opacity:1; transform:none; } }
        @keyframes pd2blink { 50% { opacity:0; } }
        @media (prefers-reduced-motion: reduce) { .pd2-chip,.pd2-result,.pd2-cursor { animation:none; } }
      `}</style>

      <div style={{ fontFamily: MONO, fontSize: 11.5, height: 16, marginBottom: 14, letterSpacing: "0.04em", display: "flex", gap: 8 }}>
        {["Describe", "Interpret", "Screen"].map((step, index) => (
          <span key={step} style={{ color: index === phase ? "#C6CAF7" : "#8C92A3", transition: "color .3s" }}>
            {step.toUpperCase()}{index < 2 ? "  →" : ""}
          </span>
        ))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.35, color: "#D7DAE4", height: 52, overflow: "hidden", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 9, padding: "8px 12px" }}>
        <span>{visibleText}</span>{!reduce && <span className="pd2-cursor" style={{ marginLeft: 1, color: "#8E93FF" }}>▍</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "nowrap", gap: 7, marginTop: 12, height: 28, overflow: "hidden" }}>
        {current.chips.slice(0, visibleChips).map((chip) => (
          <span key={chip} className={reduce ? "" : "pd2-chip"} style={{ fontFamily: MONO, fontSize: 12, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap", background: "rgba(142,147,255,0.14)", border: "1px solid rgba(142,147,255,0.28)", color: "#C6CAF7" }}>{chip}</span>
        ))}
      </div>

      <div style={{ height: 15, marginTop: 6, fontFamily: MONO, fontSize: 11, color: "#8C92A3", overflow: "hidden" }}>
        {current.note && visibleChips >= current.chips.length ? `· ${current.note}` : ""}
      </div>

      <div style={{ height: 100, marginTop: 12 }}>
        {resultVisible && (
          <div className={reduce ? "" : "pd2-result"} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#8C92A3", letterSpacing: "0.05em", marginBottom: 8 }}>SCREEN RESULT</div>
            <div style={{ fontFamily: MONO, fontSize: 20, color: "#EDEEF5", fontWeight: 500 }}>{current.result}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: "#9AA0AB", marginTop: 7 }}>Filters stay visible and editable.</div>
          </div>
        )}
      </div>
    </div>
  );
}
