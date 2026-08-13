"use client";

import React from "react";
import ProductDemoV2 from "./ProductDemoV2";
import FeedbackButton from "./FeedbackButton";
import { PORTFOLIO_URL, GITHUB_URL } from "../lib/site";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "'Space Grotesk', system-ui, sans-serif";

const FEATURES = [
  { title: "Say what you mean", line: "Describe the kind of company you’re looking for in everyday language." },
  { title: "See how Parse read it", line: "Your idea becomes explicit financial filters—not a hidden AI answer." },
  { title: "Change anything", line: "Adjust a metric, remove a condition, or refine the screen yourself." },
];

function Logo({ size = 26 }: { size?: number }) {
  const u = size / 26;
  return <div style={{ width: size, height: size, borderRadius: 7 * u, background: T.accent, position: "relative", flexShrink: 0 }}>
    <div style={{ position: "absolute", left: 6 * u, bottom: 6 * u, width: 3 * u, height: 8 * u, background: "#fff", borderRadius: 1 }} />
    <div style={{ position: "absolute", left: 11.5 * u, bottom: 6 * u, width: 3 * u, height: 13 * u, background: "#fff", borderRadius: 1 }} />
    <div style={{ position: "absolute", left: 17 * u, bottom: 6 * u, width: 3 * u, height: 5 * u, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
  </div>;
}

export default function LandingV2() {
  return <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: T.ink, background: T.bg, minHeight: "100vh" }}>
    <style>{`
      .ln2-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:550;font-size:14.5px;height:40px;padding:0 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:background .14s,border-color .14s}
      .ln2-sm{height:34px;font-size:13.5px;padding:0 14px;border-radius:9px}.ln2-primary{background:${T.accent};color:#fff}.ln2-primary:hover{background:${T.accentInk}}
      .ln2-ghost{background:transparent;color:${T.accent}}.ln2-ghost:hover{background:#ECEEFA}.ln2-neutral{background:${T.surface};color:${T.inkSoft};border-color:${T.border}}.ln2-neutral:hover{border-color:#D4D8DF}
      .ln2-link{background:none;border:none;color:${T.accent};cursor:pointer;font-family:inherit;font-size:14px;padding:0;text-decoration:none}.ln2-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}.ln2-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:12px}
      @media(max-width:760px){.ln2-hero{grid-template-columns:1fr;gap:28px}.ln2-cards{grid-template-columns:1fr}.ln2-signin{display:none}}
    `}</style>

    <header style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.ink }}><Logo /><span style={{ fontFamily: DISP, fontSize: 17, fontWeight: 600 }}>Parse</span></a>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a href="/methodology" className="ln2-btn ln2-ghost ln2-sm">How it works</a>
          <FeedbackButton className="ln2-btn ln2-ghost ln2-sm" />
          <a href="/account?mode=signin" className="ln2-btn ln2-neutral ln2-sm ln2-signin">Sign in</a>
          <a href="/try" className="ln2-btn ln2-primary ln2-sm">Try Parse</a>
        </div>
      </div>
    </header>

    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 24px 80px" }}>
      <div className="ln2-hero">
        <div>
          <h1 style={{ fontFamily: DISP, fontSize: 40, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.06, margin: "0 0 16px" }}>Screen stocks the way you think.</h1>
          <p style={{ color: T.inkSoft, fontSize: 17, lineHeight: 1.5, margin: "0 0 24px", maxWidth: 430 }}>Describe what you’re looking for. Parse turns it into a screen you can see, change, and run.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><a className="ln2-btn ln2-primary" href="/try">Try Parse</a><span style={{ fontSize: 13.5, color: T.inkSoft }}>No account required.</span></div>
          <div style={{ marginTop: 13, fontSize: 12.5, color: T.inkSoft }}>S&amp;P 500 + Nasdaq 100 · refreshed daily</div>
        </div>
        <ProductDemoV2 />
      </div>

      <div className="ln2-cards">{FEATURES.map((feature) => <div key={feature.title} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, background: T.surface }}><div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, color: T.accent, marginBottom: 6 }}>{feature.title}</div><div style={{ fontSize: 14.5, lineHeight: 1.45, color: T.inkSoft }}>{feature.line}</div></div>)}</div>

      <div style={{ margin: "44px 0 12px", maxWidth: 680 }}>
        <div style={{ fontFamily: DISP, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3 }}>The hard part isn’t using a stock screener. It’s knowing what to screen for.</div>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.55, margin: "10px 0 0" }}>Parse turns your idea into filters you can inspect and change.</p>
      </div>
      <a href="/methodology" className="ln2-link">See how Parse turns words into filters →</a>

      <div style={{ fontSize: 13.5, color: T.inkSoft, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 16px", maxWidth: 680, marginTop: 32 }}><b>Currently screens the S&amp;P 500 and Nasdaq 100.</b> Data refreshed daily. Research tool only—not investment advice.</div>

      <div style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${T.border}`, fontSize: 14, color: T.inkSoft, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span>Built by Ram Maganti</span><span>·</span><a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>rmaganti.com</a><span>·</span><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>GitHub</a><span>·</span><FeedbackButton className="ln2-link" />
      </div>
    </main>
  </div>;
}
