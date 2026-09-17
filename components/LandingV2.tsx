"use client";

import React from "react";
import ProductDemoV2 from "./ProductDemoV2";
import FeedbackButton from "./FeedbackButton";
import ParseBrand from "./ParseBrand";
import { PORTFOLIO_URL, GITHUB_URL } from "../lib/site";
import { PUBLIC_SCREENS } from "../lib/publicScreens";
import { trackEvent } from "../lib/analytics";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";

const FEATURES = [
  { title: "Say what you mean", line: "Describe the kind of company you’re looking for in everyday language." },
  { title: "See how Parse read it", line: "Your idea becomes explicit financial filters—not a hidden AI answer." },
  { title: "Change anything", line: "Adjust a metric, remove a condition, or refine the screen yourself." },
];

export default function LandingV2() {
  return <div style={{ fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif", color: T.ink, background: T.bg, minHeight: "100vh" }}>
    <style>{`
      .ln2-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:550;font-size:14.5px;height:40px;padding:0 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:background .14s,border-color .14s}
      .ln2-sm{height:34px;font-size:13.5px;padding:0 14px;border-radius:9px}.ln2-primary{background:${T.accent};color:#fff}.ln2-primary:hover{background:${T.accentInk}}
      .ln2-ghost{background:transparent;color:${T.accent}}.ln2-ghost:hover{background:#ECEEFA}.ln2-neutral{background:${T.surface};color:${T.inkSoft};border-color:${T.border}}.ln2-neutral:hover{border-color:#D4D8DF}
      .ln2-link{background:none;border:none;color:${T.accent};cursor:pointer;font-family:inherit;font-size:14px;padding:0;text-decoration:none}.ln2-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}.ln2-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:12px}
      .ln2-screen-card{display:block;background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:17px;color:${T.ink};text-decoration:none;transition:transform .14s,border-color .14s,box-shadow .14s}.ln2-screen-card:hover{transform:translateY(-1px);border-color:#D4D8DF;box-shadow:0 5px 16px rgba(21,23,28,.05)}
      @media(max-width:760px){.ln2-hero{grid-template-columns:1fr;gap:28px}.ln2-cards{grid-template-columns:1fr}.ln2-signin,.ln2-investor-nav{display:none}}
    `}</style>

    <header style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <ParseBrand />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a href="/screens" className="ln2-btn ln2-ghost ln2-sm">Screen ideas</a>
          <a href="/investors" className="ln2-btn ln2-ghost ln2-sm ln2-investor-nav" onClick={() => trackEvent("investor_hub_clicked", { placement: "header" })}>Investors</a>
          <a href="/methodology" className="ln2-btn ln2-ghost ln2-sm mobile-hide">How it works</a>
          <FeedbackButton className="ln2-btn ln2-ghost ln2-sm mobile-hide" />
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

      <section style={{ marginTop: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginBottom: 13 }}><div><h2 style={{ fontFamily: DISP, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Frequently used screeners</h2><p style={{ margin: 0, color: T.inkSoft, fontSize: 13.5 }}>Start with an exact screen, then adjust any value.</p></div><a href="/screens" className="ln2-link">Browse all {PUBLIC_SCREENS.length} →</a></div>
        <div className="ln2-cards">{PUBLIC_SCREENS.slice(0, 6).map((screen) => <a key={screen.slug} href={`/screens/${screen.slug}`} className="ln2-screen-card" onClick={() => trackEvent("public_screen_clicked", { slug: screen.slug, placement: "home" })}><div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{screen.title}</div><div style={{ fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft }}>{screen.summary}</div><div style={{ marginTop: 10, color: T.accent, fontSize: 13.5 }}>Open screen →</div></a>)}</div>
      </section>

      <section style={{ marginTop: 44, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 24px", maxWidth: 760 }}>
        <div style={{ fontFamily: DISP, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>Screen famous investor portfolios</div>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.55, margin: "0 0 14px", maxWidth: 680 }}>Explore reported holdings from Warren Buffett, Cathie Wood, Bill Ackman, Michael Burry, Stanley Druckenmiller, and Ray Dalio—then filter them in plain English.</p>
        <a href="/investors" className="ln2-link" onClick={() => trackEvent("investor_hub_clicked", { placement: "home_discovery" })}>Explore investor portfolios →</a>
      </section>

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
