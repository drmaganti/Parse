import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INVESTOR_COLLECTIONS, investorCollection } from "../../../lib/investorCollections";
import { supabasePublic } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";
const T = { bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", gain: "#0B8A5B", loss: "#C33328" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";

type Holding = { issuer: string; ticker: string | null; report_date: string; filing_date: string; accession_number: string; shares: number | null; value_usd: number | null; portfolio_weight: number | null; change_type: string | null; share_change_pct: number | null };
const money = (v: number | null) => v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v).toLocaleString()}`;
const shares = (v: number | null) => v == null ? "—" : Math.round(v).toLocaleString();

export function generateStaticParams() {
  return INVESTOR_COLLECTIONS.filter((c) => c.slug !== "warren-buffett").map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const collection = investorCollection(params.slug);
  if (!collection) return {};
  const image = `/api/og?title=${encodeURIComponent(`${collection.searchName} stocks`)}&subtitle=${encodeURIComponent(`${collection.name} holdings — screen them in plain English`)}`;
  return {
    title: collection.title,
    description: collection.description,
    keywords: [`${collection.searchName} stocks`, `${collection.searchName} portfolio`, `${collection.searchName} holdings`, `${collection.name} holdings`, `${collection.name} portfolio`],
    alternates: { canonical: `/investors/${collection.slug}` },
    openGraph: { title: collection.title, description: collection.description, url: `/investors/${collection.slug}`, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: collection.title, description: collection.description, images: [image] },
  };
}

function secUrl(cik: string, accession: string | undefined) {
  if (!accession) return `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}`;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}/${accession}-index.htm`;
}

export default async function InvestorPage({ params }: { params: { slug: string } }) {
  const collection = investorCollection(params.slug);
  if (!collection || collection.slug === "warren-buffett") notFound();

  const { data } = await supabasePublic
    .from("investor_holdings")
    .select("issuer,ticker,report_date,filing_date,accession_number,shares,value_usd,portfolio_weight,change_type,share_change_pct")
    .eq("collection_slug", collection.slug)
    .order("report_date", { ascending: false })
    .order("value_usd", { ascending: false })
    .limit(2000);

  const all = (data ?? []) as Holding[];
  const latestDate = all[0]?.report_date;
  const holdings = latestDate ? all.filter((h) => h.report_date === latestDate) : [];
  const shown = holdings.slice(0, 150);
  const filingDate = holdings[0]?.filing_date;
  const accession = holdings[0]?.accession_number;
  const sourceUrl = collection.source === "ark-fund-csv" ? collection.sourceUrl! : secUrl(collection.cik, accession);
  const changeWindow = collection.source === "ark-fund-csv" ? "vs. prior snapshot" : "vs. prior quarter";
  const related = INVESTOR_COLLECTIONS.filter((c) => c.slug !== collection.slug).slice(0, 5);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Dataset", name: collection.title, description: collection.description, url: `https://getparse.app/investors/${collection.slug}`, temporalCoverage: latestDate || undefined, creator: { "@type": "Organization", name: "Parse" }, isBasedOn: sourceUrl },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Investor portfolios", item: "https://getparse.app/investors" },
        { "@type": "ListItem", position: 2, name: collection.searchName, item: `https://getparse.app/investors/${collection.slug}` },
      ] },
    ],
  };

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <style>{`.ip-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}@media(max-width:760px){.ip-grid{grid-template-columns:1fr}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 16 }}><a href="/investors" style={{ color: T.accent, textDecoration: "none" }}>Investors</a><a href="/screens" style={{ color: T.accent, textDecoration: "none" }}>Screen ideas</a></div></div></header>
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px 84px" }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: T.inkSoft, marginBottom: 18 }}><a href="/investors" style={{ color: T.accent, textDecoration: "none" }}>Investor portfolios</a> / {collection.searchName}</nav>
      <h1 style={{ fontFamily: DISP, fontSize: 42, lineHeight: 1.06, letterSpacing: "-.03em", margin: "0 0 14px", fontWeight: 650 }}>{collection.title}</h1>
      <p style={{ maxWidth: 840, color: T.inkSoft, fontSize: 16.5, lineHeight: 1.62, margin: 0 }}>{collection.summary} {collection.associationNote}</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16, fontSize: 13, color: T.inkSoft }}>{latestDate && <span>As of: <strong>{latestDate}</strong></span>}{filingDate && collection.source === "sec13f" && <span>Filed: <strong>{filingDate}</strong></span>}<a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: T.accent }}>Source: {collection.sourceLabel} ↗</a></div>

      <section style={{ marginTop: 30, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 15, padding: 21 }}><h2 style={{ fontFamily: DISP, margin: "0 0 8px", fontSize: 21 }}>Screen {collection.searchName}'s tracked holdings with Parse</h2><p style={{ color: T.inkSoft, margin: "0 0 14px", fontSize: 14.5 }}>Start with this portfolio as the universe, then describe what you want in plain English. Parse only screens holdings that overlap its current market-data universe.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>{collection.examples.map((q) => <a key={q} href={`/try?collection=${collection.slug}&q=${encodeURIComponent(q)}&source=investor_collection`} style={{ display: "inline-flex", padding: "8px 11px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.accent, textDecoration: "none", fontSize: 13.5 }}>{q}</a>)}</div></section>

      <section style={{ marginTop: 34 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}><h2 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>Latest reported holdings</h2><span style={{ color: T.inkSoft, fontSize: 13 }}>{holdings.length ? `${holdings.length} reported positions` : "Holdings refresh pending"}</span></div>{holdings.length === 0 ? <div style={{ background: T.surface, border: `1px dashed ${T.border}`, borderRadius: 14, padding: 26, color: T.inkSoft }}>The collection page is live, but the latest holdings have not been loaded yet.</div> : <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 13.5 }}><thead><tr style={{ borderBottom: `1px solid ${T.border}` }}><th style={{ textAlign: "left", padding: "11px 14px" }}>Stock</th><th style={{ textAlign: "right", padding: 11 }}>Weight</th><th style={{ textAlign: "right", padding: 11 }}>Value</th><th style={{ textAlign: "right", padding: 11 }}>Shares</th><th style={{ textAlign: "right", padding: "11px 14px" }}>{changeWindow}</th></tr></thead><tbody>{shown.map((h, i) => <tr key={`${h.issuer}-${i}`} style={{ borderBottom: i < shown.length - 1 ? `1px solid ${T.border}` : "none" }}><td style={{ padding: "11px 14px" }}><div style={{ fontWeight: 600 }}>{h.ticker ? <span style={{ fontFamily: MONO, marginRight: 8 }}>{h.ticker}</span> : null}{h.issuer}</div></td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{h.portfolio_weight == null ? "—" : `${Number(h.portfolio_weight).toFixed(2)}%`}</td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{money(h.value_usd == null ? null : Number(h.value_usd))}</td><td style={{ textAlign: "right", padding: 11, fontFamily: MONO }}>{shares(h.shares == null ? null : Number(h.shares))}</td><td style={{ textAlign: "right", padding: "11px 14px", color: h.change_type === "increased" || h.change_type === "new" ? T.gain : h.change_type === "reduced" ? T.loss : T.inkSoft }}>{h.change_type === "new" ? "New" : h.share_change_pct == null ? "—" : `${Number(h.share_change_pct) > 0 ? "+" : ""}${Number(h.share_change_pct).toFixed(1)}%`}</td></tr>)}</tbody></table></div>{holdings.length > shown.length && <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 14px", color: T.inkSoft, fontSize: 13 }}>Showing the 150 largest reported positions of {holdings.length}. The official source above contains the full disclosure.</div>}</div>}</section>

      <section style={{ marginTop: 38, maxWidth: 860 }}><h2 style={{ fontFamily: DISP, fontSize: 24 }}>About {collection.searchName}'s portfolio data</h2><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>What stocks does {collection.searchName} own?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>{collection.associationNote} Parse uses the associated public portfolio disclosure because that is what people generally mean when searching for “{collection.searchName} stocks” or “{collection.searchName} portfolio.”</p><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>How current are these holdings?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>{collection.freshnessNote} The date shown at the top of this page is the source date Parse currently has loaded.</p><h3 style={{ fontFamily: DISP, fontSize: 18, marginBottom: 6 }}>Can I screen this portfolio?</h3><p style={{ color: T.inkSoft, lineHeight: 1.62 }}>Yes. Holdings that overlap Parse's market-data universe can be filtered using the same transparent criteria used by the main screener. The portfolio page itself can still show reported positions that are outside the current screening universe.</p></section>

      <section style={{ marginTop: 44 }}><h2 style={{ fontFamily: DISP, fontSize: 21, margin: "0 0 13px" }}>More investor portfolios</h2><div className="ip-grid">{related.map((item) => <a key={item.slug} href={`/investors/${item.slug}`} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, color: T.ink, textDecoration: "none" }}><div style={{ fontFamily: DISP, fontSize: 16, fontWeight: 650 }}>{item.searchName}</div><div style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.45, marginTop: 6 }}>{item.name}</div></a>)}</div></section>
      <p style={{ color: T.inkSoft, fontSize: 12.5, marginTop: 30 }}>Research tool only—not investment advice.</p>
    </main>
  </div>;
}
