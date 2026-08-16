import type { Metadata } from "next";
import { INVESTOR_COLLECTIONS } from "../../lib/investorCollections";

export const metadata: Metadata = {
  title: "Investor Portfolios & Stock Holdings",
  description: "Explore Warren Buffett, Bill Ackman, Cathie Wood, Michael Burry, Stanley Druckenmiller and Ray Dalio portfolio holdings, then screen them in plain English with Parse.",
  alternates: { canonical: "/investors" },
};
const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";

export default function InvestorsPage() {
  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif" }}><header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><a href="/screens" style={{ color: T.accent, textDecoration: "none" }}>Screen ideas</a></div></header><main style={{ maxWidth: 960, margin: "0 auto", padding: "54px 24px 84px" }}><h1 style={{ fontFamily: DISP, fontSize: 40, letterSpacing: "-.025em", margin: "0 0 12px" }}>Investor portfolios you can actually screen.</h1><p style={{ maxWidth: 760, color: T.inkSoft, lineHeight: 1.6, fontSize: 16.5 }}>Explore the latest public holdings associated with well-known investors, then use Parse to ask questions about each portfolio in plain English. Most collections use SEC 13F filings; ARKK uses ARK's published fund holdings, so freshness varies by source.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 30 }}>{INVESTOR_COLLECTIONS.map((c) => <a key={c.slug} href={`/investors/${c.slug}`} style={{ display: "block", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, color: T.ink, textDecoration: "none" }}><div style={{ fontFamily: DISP, fontWeight: 650, fontSize: 19 }}>{c.searchName} stocks</div><p style={{ color: T.inkSoft, lineHeight: 1.5, fontSize: 14, margin: "8px 0 12px" }}>{c.summary}</p><span style={{ color: T.accent, fontSize: 14 }}>View holdings →</span></a>)}</div></main></div>;
}
