import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicScreen, PUBLIC_SCREENS } from "../../../lib/publicScreens";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", surfaceAlt: "#FAFBFC", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export function generateStaticParams() {
  return PUBLIC_SCREENS.map((screen) => ({ slug: screen.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const screen = getPublicScreen(params.slug);
  if (!screen) return {};
  const description = `${screen.summary} Open the screen in Parse to see, edit, and run the filters.`;
  const image = `/api/og?title=${encodeURIComponent(screen.title)}&subtitle=${encodeURIComponent(screen.query)}`;
  return {
    title: `${screen.title} — Stock Screen`,
    description,
    alternates: { canonical: `/screens/${screen.slug}` },
    openGraph: { title: screen.title, description, url: `/screens/${screen.slug}`, type: "article", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: screen.title, description, images: [image] },
  };
}

export default function PublicScreenPage({ params }: { params: { slug: string } }) {
  const screen = getPublicScreen(params.slug);
  if (!screen) notFound();
  const tryUrl = `/try?q=${encodeURIComponent(screen.query)}&source=${encodeURIComponent(`public_screen:${screen.slug}`)}`;
  const related = PUBLIC_SCREENS.filter((item) => item.category === screen.category && item.slug !== screen.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: screen.title,
    description: screen.summary,
    url: `https://getparse.app/screens/${screen.slug}`,
    isPartOf: { "@type": "WebSite", name: "Parse", url: "https://getparse.app" },
  };

  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <style>{`.ps-btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:10px;background:${T.accent};color:#fff;text-decoration:none;font-weight:550;font-size:14.5px}.ps-btn:hover{background:${T.accentInk}}.ps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}@media(max-width:720px){.ps-grid{grid-template-columns:1fr}.ps-hide{display:none!important}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 14, alignItems: "center" }}><a className="ps-hide" href="/screens" style={{ color: T.accent, textDecoration: "none", fontSize: 14 }}>Screen ideas</a><a href={tryUrl} className="ps-btn">Run this screen</a></div></div></header>

    <main style={{ maxWidth: 920, margin: "0 auto", padding: "52px 24px 82px" }}>
      <a href="/screens" style={{ color: T.accent, textDecoration: "none", fontSize: 13.5 }}>← All screen ideas</a>
      <section style={{ marginTop: 25, maxWidth: 760 }}><div style={{ fontFamily: MONO, fontSize: 12, color: T.accent, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 11 }}>{screen.category} screen</div><h1 style={{ fontFamily: DISP, fontSize: 40, lineHeight: 1.07, letterSpacing: "-.025em", margin: "0 0 15px", fontWeight: 600 }}>{screen.title}</h1><p style={{ color: T.inkSoft, fontSize: 16.5, lineHeight: 1.58, margin: 0 }}>{screen.summary}</p></section>

      <section style={{ marginTop: 30, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 15, padding: 22, maxWidth: 800 }}><div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 650, letterSpacing: ".04em", marginBottom: 9 }}>ASK PARSE</div><div style={{ fontFamily: DISP, fontSize: 22, lineHeight: 1.4, fontWeight: 500 }}>“{screen.query}”</div><div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}><a href={tryUrl} className="ps-btn">Run and edit this screen</a><span style={{ color: T.inkSoft, fontSize: 13 }}>Guest screens do not require an account.</span></div></section>

      <section style={{ marginTop: 36, maxWidth: 800 }}><h2 style={{ fontFamily: DISP, fontSize: 22, margin: "0 0 13px", fontWeight: 600 }}>What this screen is trying to express</h2><div style={{ display: "grid", gap: 10 }}>{screen.criteria.map((criterion, index) => <div key={criterion} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 11, padding: "13px 15px" }}><span style={{ fontFamily: MONO, color: T.accent, fontSize: 12, marginTop: 2 }}>{String(index + 1).padStart(2, "0")}</span><span style={{ fontSize: 14.5, lineHeight: 1.48 }}>{criterion}</span></div>)}</div><p style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.55, marginTop: 13 }}>Natural language can be ambiguous. When you run the screen, inspect the filters Parse actually creates and change anything that does not match your intent.</p></section>

      {related.length > 0 ? <section style={{ marginTop: 44 }}><h2 style={{ fontFamily: DISP, fontSize: 21, margin: "0 0 13px", fontWeight: 600 }}>More {screen.category} screens</h2><div className="ps-grid">{related.map((item) => <a key={item.slug} href={`/screens/${item.slug}`} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, color: T.ink, textDecoration: "none" }}><div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{item.title}</div><div style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.45 }}>{item.summary}</div></a>)}</div></section> : null}

      <section style={{ marginTop: 45, borderTop: `1px solid ${T.border}`, paddingTop: 20, color: T.inkSoft, fontSize: 13.5, lineHeight: 1.5 }}>Parse is a research tool. A screen narrows a stock universe based on criteria; it is not an investment recommendation.</section>
    </main>
  </div>;
}
