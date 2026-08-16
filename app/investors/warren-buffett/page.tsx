import type { Metadata } from "next";
import { investorCollection } from "../../../lib/investorCollections";
import { supabasePublic } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";
const collection = investorCollection("warren-buffett")!;
export const metadata: Metadata = {
  title: collection.title,
  description: collection.description,
  alternates: { canonical: "/investors/warren-buffett" },
  openGraph: { title: collection.title, description: collection.description, url: "/investors/warren-buffett", type: "website", images: [{ url: `/api/og?title=${encodeURIComponent("Warren Buffett stocks")}&subtitle=${encodeURIComponent("Berkshire Hathaway's latest reported holdings — screen them in plain English")}`, width: 1200, height: 630 }] },
};

type Holding = { issuer: string; ticker: string | null; report_date: string; filing_date: string; accession_number: string; shares: number | null; value_usd: number | null; portfolio_weight: number | null; change_type: string | null; share_change_pct: number | null };
const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", gain: "#0B8A5B", loss: "#C33328" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";
const money = (v: number | null) => v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v).toLocaleString()}`;
const shares = (v: number | null) => v == null ? "—" : Math.round(v).toLocaleString();

export default async function BuffettPage() {
  const { data } = await supabasePublic.from("investor_holdings").select("issuer,ticker,report_date,filing_date,accession_number,shares,value_usd,portfolio_weight,change_type,share_change_pct").eq("collection_slug", collection.slug).order("report_date", { ascending: false }).order("value_usd", { ascending: false }).limit(250);
  const all = (data ?? []) as Holding[];
  const latestDate = all[0]?.report_date;
  const holdings = latestDate ? all.filter((h) => h.report_date === latestDate) : [];
  const filingDate = holdings[0]?.filing_date;
  const accession = holdings[0]?.accession_number;
  const secUrl = accession ? `https://www.sec.gov/Archives/edgar/data/1067983/${accession.replace(/-/g, "")}/${accession}-index.htm` : "https://www.sec.gov/edgar/browse/?CIK=1067983";
  const jsonLd = { "@context": "https://schema.org", "@type": "Dataset", name: collection.title, description: collection.description, url: "https://getparse.app/investors/warren-buffett", temporalCoverage: latestDate || undefined, creator: { "@type": "Organization", name: "Parse" }, isBasedOn: secUrl };
  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 16 }}><a href="/investors" style={{ color: T.accent, textDecoration: "none" }}>Investors</a><a href="/screens" style={{ color: T.accent, textDecoration: "none" }}>Screen ideas</a></div></div></header>
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px 84px" }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: T.inkSoft, marginBottom: 18 }}><a href="/investors" style={{ color: T.accent, textDecoration: "none" }}>Investor portfolios</a> / Warren Buffett</nav>
      <h1 style={{ fontFamily: DISP, fontSize: 42, lineHeight: 1.06, letterSpacing: "-.03em", margin: "0 0 14px", fontWeight: 650 }}>Warren Buffett stocks: Berkshire Hathaway portfolio & holdings</h1>
      <p style={{ maxWidth: 820, color: T.inkSoft, fontSize: 16.5, lineHeight: 1.62, margin: 0 }}>Commonly searched as Warren Buffett's stock portfolio, this page tracks Berkshire Hathaway's latest reported U.S. Form 13F equity holdings. The filing is delayed, does not cover every Berkshire investment, and should not be read as Buffett's personal brokerage account.</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16, fontSize: 13, color: T.inkSoft }}>{latestDate && <span>Report date: <strong>{latestDate}</strong></span>}{filingDate && <span>Filed: <strong>{filingDate}</strong></span>}<a href={secUrl} target="_blank" rel="noreferrer" style={{ color: T.accent }}>Source: SEC 13F ↗</a></div>

      <section style={{ marginTop: 30, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 15, padding: 21 }}><h2 style={{ fontFamily: DISP, margin: "0 0 8px", fontSize: 21 }}>Screen Berkshire's reported holdings with Parse</h2><p style={{ color: T.inkSoft, margin: "0 0 14px", fontSize: 14.5 }}>Start with the portfolio as the universe, then describe what you want in plain English.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>{collection.examples.map((q) => <a key={q} href={`/try?collection=${collection.slug}&q=${encodeURIComponent(q)}&source=investor_collection`} style={{ display: "inline-flex", padding: "8px 11px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.accent, textDecoration: "none", fontSize: 13.5 }}>{q}</a>)}</div></section>

      <section style={{ marginTop: 34 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}><h2 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>Latest reported holdings</h2><span style={{ color: T.inkSoft, fontSize: 13 }}>{holdings.length ? `${holdings.length} disclosed positions` : "Holdings refresh pending"}</span></div>{holdings.length === 0 ? <div style={{ background: T.surface, border: `1px dashed ${T.border}`, borderRadius: 14, padding: 26, color: T.inkSoft }}>The holdings importer is ready, but the latest filing has not been loaded into this environment yet.</div> : <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 13.5 }}><thead><tr style={{ borderBottom: `1px solid ${T.border}` }}><th style={{ textAlign: "left", padding: "11px 14px" }}>Stock</th><th style={{ textAlign: "right", padding: 11 }}>Weight</th><th style={{ textAlign: "right", padding: 11 }}>Value</th><th style={{ textAlign: "right", padding: 11 }}>Shares</th><th style={{ textAlign: "right", padding: "11px 14px" }}>vs. prior quarter</th></tr></thead><tbody>{holdings.map((h, i) => <tr key={`${h.issuer}-${i}`} style={{ borderBottom: i < holdings.length - 1 ? `1px solid ${T.border}` : "none" }}><td style={{ padding: "11px 14px" }}><div style={{ fontWeight: 600 }}>{h.ticker ? <span style={{ fontFamily: MONO, marginRight: 8 }}>{h.ticker}</span> : null}{h.issuer}</div></td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{h.portfolio_weight == null ? "—" : `${h.portfolio_weight.toFixed(2)}%`}</td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{money(h.value_usd)}</td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{shares(h.shares)}</td><td style={{ textAlign: "right", padding: "11px 14px", color: h.change_type === "increased" || h.change_type === "new" ? T.gain : h.change_type === "reduced" ? T.loss : T.inkSoft }}>{h.change_type === "new" ? "New" : h.share_change_pct == null ? "—" : `${h.share_change_pct > 0 ? "+" : ""}${h.share_change_pct.toFixed(1)}%`}</td></tr>)}</tbody></table></div></div>}</section>

      <section style={{ marginTop: 38, maxWidth: 840 }}><h2 style={{ fontFamily: DISP, fontSize: 24 }}>About the Warren Buffett portfolio data</h2><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>What stocks does Warren Buffett own?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>This page shows Berkshire Hathaway's latest disclosed U.S. 13F holdings. Warren Buffett remains closely associated with Berkshire's investing record, but Berkshire is an institution and the filing should not be interpreted as a list of Buffett's personal holdings.</p><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>How current is the portfolio?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>Form 13F is filed after each quarter and can arrive up to 45 days after quarter-end. Parse displays the report date and filing date so you can see exactly how old the disclosure is.</p><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>Can I screen these holdings?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>Yes. Holdings that overlap Parse's market-data universe can be filtered using the same transparent criteria used by the main screener. The holdings list itself remains complete even when a security is outside the current screening universe.</p></section>
      <p style={{ color: T.inkSoft, fontSize: 12.5, marginTop: 30 }}>Research tool only—not investment advice.</p>
    </main>
  </div>;
}
