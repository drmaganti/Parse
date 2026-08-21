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
  ["02", "Parse translates it", "Your words are mapped to explicit metrics, thresholds, and a ranking. The model builds the screen; it does not choose stocks directly."],
  ["03", "Confirm before screening", "Parse shows every interpreted filter before it screens the universe. Edit, add, or remove a criterion if the interpretation is not what you meant."],
  ["04", "Run the verified screen", "Only after you confirm the criteria does Parse execute the screen. Direct edits remain visible and intentional."],
];

const DOCUMENTED_DEFAULTS = [
  ["Profitable / making money", "Operating margin > 0%", "Uses a positive operating margin as the supported profitability test."],
  ["Low debt / low leverage", "Debt / equity < 1", "Uses debt-to-equity as the supported leverage measure."],
  ["High / strong ROIC", "ROIC > 15%", "Uses latest fiscal-year return on invested capital."],
  ["Reasonable / fair valuation", "P/E < 25", "Uses trailing P/E as the default valuation measure when no valuation metric is named."],
  ["Growth stock", "Revenue growth > 15%", "Uses revenue growth when a growth stock is requested without a stated growth threshold."],
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
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}><FeedbackButton className="m-btn m-ghost" /><a href="/try" className="m-btn m-primary">Try Parse</a></div>
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
          <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.65, margin: 0 }}>Ideas such as “safe,” “cheap,” and “quality” do not map to one universally correct metric. Parse either maps the wording to a supported criterion it can justify, uses one of the documented defaults below, or leaves the criterion out rather than silently substituting something else. You review the result before the screen runs.</p>
        </section>

        <section id="documented-defaults" style={{ marginTop: 34, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, maxWidth: 760, scrollMarginTop: 80 }}>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: T.accent, letterSpacing: ".05em", marginBottom: 8 }}>DOCUMENTED DEFAULTS</div>
          <h2 style={{ fontFamily: DISP, fontSize: 22, margin: "0 0 10px", fontWeight: 600 }}>What Parse means when you do not give a number</h2>
          <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 16px" }}>These defaults are used only for the qualitative meanings listed here when you have not already named a metric or threshold. Any default appears in the review step before screening and can be edited or removed.</p>
          <div style={{ display: "grid", gap: 0, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            {DOCUMENTED_DEFAULTS.map(([phrase, rule, why], i) => <div key={phrase} style={{ padding: "13px 14px", background: i % 2 ? T.surfaceAlt : T.surface, borderTop: i ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}><strong style={{ fontSize: 14 }}>{phrase}</strong><span style={{ fontFamily: MONO, fontSize: 13, color: T.accentInk }}>{rule}</span></div>
              <div style={{ marginTop: 5, color: T.inkSoft, fontSize: 13.5, lineHeight: 1.5 }}>{why}</div>
            </div>)}
          </div>
        </section>

        <section style={{ marginTop: 34, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, maxWidth: 760 }}>
          <h2 style={{ fontFamily: DISP, fontSize: 19, margin: "0 0 12px", fontWeight: 600 }}>Data and current scope</h2>
          <div style={{ display: "grid", gap: 9, color: T.inkSoft, fontSize: 14.5, lineHeight: 1.55 }}>
            <div><b style={{ color: T.ink }}>Universe:</b> S&amp;P 500 and Nasdaq 100. Results are deduplicated by issuer; when multiple share classes are present, Parse prefers the listing with the higher 20-day average volume.</div>
            <div><b style={{ color: T.ink }}>Data sources:</b> company profiles, fundamental metrics, and quote fields are sourced through Finnhub. Historical price and volume series used for locally derived indicators are sourced from Yahoo Finance by default; the ingestion pipeline can also use Finnhub candles.</div>
            <div><b style={{ color: T.ink }}>Refresh cadence:</b> Parse stores a cached screening dataset that is refreshed daily. It is not a real-time market-data terminal.</div>
            <div><b style={{ color: T.ink }}>Derived fields:</b> RSI, moving averages, weekly change, distance from the 52-week high, and 20-day average daily share volume are calculated from historical market data when available. Average volume is stored in millions of shares per day.</div>
            <div><b style={{ color: T.ink }}>Missing data:</b> a company is excluded when a metric required by the active screen is unavailable.</div>
            <div><b style={{ color: T.ink }}>Purpose:</b> research and exploration, not investment advice or a recommendation to buy or sell a security.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
