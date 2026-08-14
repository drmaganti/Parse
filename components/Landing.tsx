"use client";

import React from "react";
import ProductDemo from "./ProductDemo";
import FeedbackButton from "./FeedbackButton";
import { PORTFOLIO_URL, GITHUB_URL } from "../lib/site";
import { trackEvent } from "../lib/analytics";

const T = {
  bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC",
  border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67",
  accent: "#2C36A8", accentInk: "#232A85",
};
const DISP = "'Space Grotesk', system-ui, sans-serif";

const FEATURES = [
  { title: "Say what you mean", line: "Describe the kind of company you’re looking for in everyday language." },
  { title: "See how Parse read it", line: "Your idea becomes explicit financial filters—not a hidden AI answer." },
  { title: "Change anything", line: "Adjust a metric, remove a condition, or refine the screen yourself." },
];

const SCREEN_IDEAS = [
  ["cheap-large-cap-stocks", "Cheap large-cap stocks", "Large caps with a P/E under 15"],
  ["growing-stocks-near-52-week-lows", "Growing stocks near their lows", "Positive revenue growth well below 52-week highs"],
  ["high-growth-reasonable-valuation", "Growth at a reasonable valuation", "Revenue growth above 20% with a valuation ceiling"],
  ["high-dividend-low-volatility-stocks", "High dividend, lower volatility", "Yield above 3% with beta below 1"],
  ["beaten-down-still-growing", "Beaten-down but still growing", "Price weakness without negative revenue growth"],
  ["growing-stocks-with-momentum", "Growth with momentum", "Revenue growth plus recent price strength"],
];

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

export default function Landing({ mode, onGetStarted }: { mode: "home" | "about"; onGetStarted?: () => void }) {
  void mode;
  void onGetStarted;
  const trackTry = (placement: string) => trackEvent("try_parse_clicked", { placement });
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: T.ink, background: T.bg, minHeight: "100vh" }}>
      <style>{`
        .ln-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:inherit; font-weight:550; font-size:14.5px; height:40px; padding:0 18px; border-radius:10px; border:1px solid transparent; cursor:pointer; text-decoration:none; transition:background .14s,border-color .14s; }
        .ln-sm { height:34px; font-size:13.5px; padding:0 14px; border-radius:9px; }
        .ln-primary { background:${T.accent}; color:#fff; }
        .ln-primary:hover { background:${T.accentInk}; }
        .ln-ghost { background:transparent; color:${T.accent}; }
        .ln-ghost:hover { background:#ECEEFA; }
        .ln-neutral { background:${T.surface}; color:${T.inkSoft}; border-color:${T.border}; }
        .ln-neutral:hover { border-color:#D4D8DF; }
        .ln-link { background:none; border:none; color:${T.accent}; cursor:pointer; font-family:inherit; font-size:14px; padding:0; text-decoration:none; }
        .ln-hero { display:grid; grid-template-columns:1.05fr .95fr; gap:40px; align-items:center; }
        .ln-cards { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:12px; }
        .ln-screen-card { display:block; background:${T.surface}; border:1px solid ${T.border}; border-radius:12px; padding:16px; color:${T.ink}; text-decoration:none; transition:transform .14s,border-color .14s; }
        .ln-screen-card:hover { transform:translateY(-2px); border-color:#D4D8DF; }
        @media (max-width:760px){ .ln-hero{ grid-template-columns:1fr; gap:28px; } .ln-cards{ grid-template-columns:1fr; } .ln-signin,.ln-screen-nav{ display:none; } }
      `}</style>

      <header style={{ borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.ink }}>
            <Logo /><span style={{ fontFamily: DISP, fontSize: 17, fontWeight: 600 }}>Parse</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <a href="/screens" className="ln-btn ln-ghost ln-sm ln-screen-nav">Screen ideas</a>
            <a href="/methodology" className="ln-btn ln-ghost ln-sm">How it works</a>
            <FeedbackButton className="ln-btn ln-ghost ln-sm" />
            <a href="/account?mode=signin" className="ln-btn ln-neutral ln-sm ln-signin">Sign in</a>
            <a href="/try" onClick={() => trackTry("header")} className="ln-btn ln-primary ln-sm">Try Parse</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div className="ln-hero">
          <div>
            <h1 style={{ fontFamily: DISP, fontSize: 40, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.06, margin: "0 0 16px" }}>
              Screen stocks the way you think.
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 17, lineHeight: 1.5, margin: "0 0 24px", maxWidth: 430 }}>
              Describe what you’re looking for. Parse turns it into a screen you can see, change, and run.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <a className="ln-btn ln-primary" href="/try" onClick={() => trackTry("hero")}>Try Parse</a>
              <span style={{ fontSize: 13.5, color: T.inkSoft }}>No account required.</span>
            </div>
            <div style={{ marginTop: 13, fontSize: 12.5, color: T.inkSoft }}>
              S&amp;P 500 + Nasdaq 100 · refreshed daily
            </div>
          </div>
          <ProductDemo />
        </div>

        <div className="ln-cards">
          {FEATURES.map((f) => (
            <div key={f.title} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, background: T.surface }}>
              <div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, color: T.accent, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.45, color: T.inkSoft }}>{f.line}</div>
            </div>
          ))}
        </div>

        <section style={{ marginTop: 44 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, marginBottom: 13 }}>
            <h2 style={{ fontFamily: DISP, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Start with a screen idea</h2>
            <a href="/screens" className="ln-link">Browse all 20 →</a>
          </div>
          <div className="ln-cards">
            {SCREEN_IDEAS.map(([slug, title, line]) => <a key={slug} href={`/screens/${slug}`} className="ln-screen-card" onClick={() => trackEvent("public_screen_clicked", { slug, placement: "home" })}><div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</div><div style={{ fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft }}>{line}</div><div style={{ marginTop: 10, color: T.accent, fontSize: 13.5 }}>See the screen →</div></a>)}
          </div>
        </section>

        <div style={{ margin: "44px 0 12px", maxWidth: 680 }}>
          <div style={{ fontFamily: DISP, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
            The hard part isn’t using a stock screener. It’s knowing what to screen for.
          </div>
          <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.55, margin: "10px 0 0" }}>
            Parse turns your idea into filters you can inspect and change.
          </p>
        </div>
        <a href="/methodology" className="ln-link">See how Parse turns words into filters →</a>

        <div style={{ fontSize: 13.5, color: T.inkSoft, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 16px", maxWidth: 680, marginTop: 32 }}>
          <b>Currently screens the S&amp;P 500 and Nasdaq 100.</b> Data refreshed daily. Research tool only—not investment advice.
        </div>

        <div style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${T.border}`, fontSize: 14, color: T.inkSoft, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span>Built by Ram Maganti</span><span>·</span>
          <a href="/screens" style={{ color: T.accent, textDecoration: "none" }}>Screen ideas</a><span>·</span>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>rmaganti.com</a><span>·</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>GitHub</a><span>·</span>
          <FeedbackButton className="ln-link" />
        </div>
      </main>
    </div>
  );
}