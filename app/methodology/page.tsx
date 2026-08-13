"use client";

import React from "react";
import FeedbackButton from "../../components/FeedbackButton";

const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC",
  ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85",
};
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function Logo() {
  return <div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent, position: "relative", flexShrink: 0 }}>
    <div style={{ position: "absolute", left: 6, bottom: 6, width: 3, height: 8, background: "#fff", borderRadius: 1 }} />
    <div style={{ position: "absolute", left: 11.5, bottom: 6, width: 3, height: 13, background: "#fff", borderRadius: 1 }} />
    <div style={{ position: "absolute", left: 17, bottom: 6, width: 3, height: 5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
  </div>;
}

const STEPS = [
  ["01", "Describe the idea", "Write the screen the way you would explain it to another person."],
  ["02", "Parse translates it", "Your words are mapped to explicit financial metrics, thresholds, and a ranking. The model builds the screen; it does not choose stocks directly."],
  ["03", "Inspect the interpretation", "Every inferred condition is shown as a filter. When wording is ambiguous, Parse surfaces the assumption rather than hiding it."],
  ["04", "Stay in control", "Change or remove filters and rerun the screen. Your edits remain visible and intentional."],
];

export default function Methodology() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .m-btn{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:9px;border:1px solid transparent;text-decoration:none;font:550 13.5px Inter,system-ui,sans-serif;cursor:pointer}
        .m-primary{background:${T.accent};color:#fff}.m-primary:hover{background:${T.accentInk}}
        .m-ghost{background:transparent;color:${T.accent}}.m-ghost:hover{background:#ECEEFA}
        .m-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:720px){.m-grid{grid-template-columns:1fr}}
      `}</style>
      <header style={{ borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/" style={{ display: "inline-flex", gap: 10, alignItems: "center", textDecoration: "none", color: T.ink }}><Logo /><span style={{ fontFamily: DISP, fontWeight: 600 }}>Parse</span></a>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}><FeedbackButton className="m-btn m-ghost" /><a href="/" className="m-btn m-primary">Open Parse</a></div>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, color: T.accent, letterSpacing: "0.06em", marginBottom: 12 }}>HOW PARSE WORKS</div>
          <h1 style={{ fontFamily: DISP, fontSize: 38, lineHeight: 1.08, letterSpacing: "-0.025em", margin: "0 0 16px", fontWeight: 600 }}>The output is a screen, not an answer.</h1>
          <p style={{ color: T.inkSoft, fontSize: 16.5, lineHeight: 1.6, margin: 0 }}>Parse uses language to help build a transparent stock screen. It does not hide the criteria behind a recommendation list.</p>
        </div>

        <div className="m-grid" style={{ marginTop: 36 }}>
          {STEPS.map(([n, title, body]) => <section key={n} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: MONO, color: T.accent, fontSize: 12, marginBottom: 8 }}>{n}</div>
            <h2 style={{ fontFamily: DISP, fontSize: 18, margin: "0 0 8px", fontWeight: 600 }}>{title}</h2>
            <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{body}</p>
          </section>)}
        </div>

        <section style={{ marginTop: 38, maxWidth: 760 }}>
          <h2 style={{ fontFamily: DISP, fontSize: 22, margin: "0 0 10px", fontWeight: 600 }}>When wording is ambiguous</h2>
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: 0 }}>Ideas such as “safe,” “cheap,” and “quality” do not map to one universally correct metric. Parse makes an interpretation, shows the resulting filters, and calls out assumptions when they matter. The user gets the final say.</p>
        </section>

        <section style={{ marginTop: 34, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, maxWidth: 760 }}>
          <h2 style={{ fontFamily: DISP, fontSize: 19, margin: "0 0 12px", fontWeight: 600 }}>Data and current scope</h2>
          <div style={{ display: "grid", gap: 9, color: T.inkSoft, fontSize: 14.5, lineHeight: 1.5 }}>
            <div><b style={{ color: T.ink }}>Universe:</b> S&amp;P 500 and Nasdaq 100.</div>
            <div><b style={{ color: T.ink }}>Refresh cadence:</b> cached fundamentals, prices, and technical fields are refreshed daily. Parse is not a real-time market-data terminal.</div>
            <div><b style={{ color: T.ink }}>Missing data:</b> a company is excluded when a required metric for the active screen is unavailable.</div>
            <div><b style={{ color: T.ink }}>Purpose:</b> research and exploration, not investment advice or a recommendation to buy or sell a security.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
