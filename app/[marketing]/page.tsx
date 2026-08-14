import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarketingPage, MARKETING_PAGES } from "../../lib/marketingPages";
import { PUBLIC_SCREENS } from "../../lib/publicScreens";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export function generateStaticParams() {
  return MARKETING_PAGES.map((page) => ({ marketing: page.slug }));
}

export function generateMetadata({ params }: { params: { marketing: string } }): Metadata {
  const page = getMarketingPage(params.marketing);
  if (!page) return {};
  const image = `/api/og?title=${encodeURIComponent(page.headline)}&subtitle=${encodeURIComponent(page.description)}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `/${page.slug}`, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
  };
}

function Logo() {
  return <div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent, position: "relative", flexShrink: 0 }}><div style={{ position: "absolute", left: 6, bottom: 6, width: 3, height: 8, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 11.5, bottom: 6, width: 3, height: 13, background: "#fff", borderRadius: 1 }} /><div style={{ position: "absolute", left: 17, bottom: 6, width: 3, height: 5, background: "rgba(255,255,255,.6)", borderRadius: 1 }} /></div>;
}

export default function MarketingPage({ params }: { params: { marketing: string } }) {
  const page = getMarketingPage(params.marketing);
  if (!page) notFound();
  const related = PUBLIC_SCREENS.slice(0, 6);
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    <style>{`.seo-btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:10px;border:1px solid transparent;text-decoration:none;font:550 14.5px Inter,system-ui,sans-serif}.seo-primary{background:${T.accent};color:#fff}.seo-primary:hover{background:${T.accentInk}}.seo-ghost{color:${T.accent};background:transparent}.seo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.seo-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:760px){.seo-grid,.seo-two{grid-template-columns:1fr}.seo-hide{display:none!important}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.ink }}><Logo /><span style={{ fontFamily: DISP, fontSize: 17, fontWeight: 600 }}>Parse</span></a><div style={{ display: "flex", alignItems: "center", gap: 4 }}><a href="/screens" className="seo-btn seo-ghost seo-hide">Screen ideas</a><a href="/methodology" className="seo-btn seo-ghost seo-hide">How it works</a><a href="/try" className="seo-btn seo-primary">Try Parse</a></div></div></header>

    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "58px 24px 84px" }}>
      <section style={{ maxWidth: 760 }}><div style={{ fontFamily: MONO, color: T.accent, fontSize: 12, letterSpacing: ".06em", marginBottom: 12 }}>{page.eyebrow}</div><h1 style={{ fontFamily: DISP, fontSize: 42, lineHeight: 1.06, letterSpacing: "-.028em", margin: "0 0 18px", fontWeight: 600 }}>{page.headline}</h1><p style={{ color: T.inkSoft, fontSize: 17, lineHeight: 1.62, margin: "0 0 25px", maxWidth: 730 }}>{page.intro}</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><a href="/try" className="seo-btn seo-primary">Try a screen</a><a href="/screens" className="seo-btn seo-ghost">Browse screen ideas →</a></div><div style={{ marginTop: 12, color: T.inkSoft, fontSize: 12.5 }}>No account required for the guest experience. Research tool only—not investment advice.</div></section>

      <section className="seo-grid" style={{ marginTop: 46 }}>{page.sections.map((section) => <article key={section.title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}><h2 style={{ fontFamily: DISP, fontSize: 18, lineHeight: 1.3, margin: "0 0 9px", fontWeight: 600 }}>{section.title}</h2><p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.58, margin: 0 }}>{section.body}</p></article>)}</section>

      <section style={{ marginTop: 50 }}><div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}><h2 style={{ fontFamily: DISP, fontSize: 24, margin: 0, fontWeight: 600 }}>Try an example screen</h2><a href="/screens" style={{ color: T.accent, fontSize: 14, textDecoration: "none" }}>See all 20 →</a></div><div className="seo-grid">{related.map((screen) => <a key={screen.slug} href={`/screens/${screen.slug}`} style={{ display: "block", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 17, color: T.ink, textDecoration: "none" }}><div style={{ fontFamily: DISP, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{screen.title}</div><div style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.45 }}>{screen.summary}</div></a>)}</div></section>

      <section style={{ marginTop: 50, maxWidth: 780 }}><h2 style={{ fontFamily: DISP, fontSize: 24, margin: "0 0 14px", fontWeight: 600 }}>Questions</h2><div style={{ display: "grid", gap: 10 }}>{page.faq.map((item) => <details key={item.q} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "15px 17px" }}><summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14.5 }}>{item.q}</summary><p style={{ color: T.inkSoft, fontSize: 14, lineHeight: 1.55, margin: "10px 0 0" }}>{item.a}</p></details>)}</div></section>

      <section style={{ marginTop: 52, borderTop: `1px solid ${T.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", color: T.inkSoft, fontSize: 13.5 }}><span>Parse screens the S&amp;P 500 + Nasdaq 100 with data refreshed daily.</span><div style={{ display: "flex", gap: 14 }}><a href="/methodology" style={{ color: T.accent, textDecoration: "none" }}>How it works</a><a href="/" style={{ color: T.accent, textDecoration: "none" }}>Home</a></div></section>
    </main>
  </div>;
}
