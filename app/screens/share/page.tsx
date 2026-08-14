import type { Metadata } from "next";

const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "'Space Grotesk', system-ui, sans-serif";

function getQuery(searchParams: { q?: string | string[] }) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  return (raw || "").trim().slice(0, 320);
}

export function generateMetadata({ searchParams }: { searchParams: { q?: string | string[] } }): Metadata {
  const query = getQuery(searchParams);
  const title = query ? `Stock screen: ${query.slice(0, 65)}${query.length > 65 ? "…" : ""}` : "Shared stock screen";
  const description = query ? `Open this plain-English stock screen in Parse: “${query.slice(0, 140)}”` : "Open a shared stock screen in Parse.";
  const image = `/api/og?title=${encodeURIComponent(query || "A stock screen shared from Parse")}&subtitle=${encodeURIComponent("Open it in Parse to see, edit, and run the filters")}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function SharedScreenPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const query = getQuery(searchParams);
  const tryUrl = query ? `/try?q=${encodeURIComponent(query)}&source=shared_screen` : "/try";
  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 840, margin: "0 auto", padding: "14px 24px" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a></div></header>
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "64px 24px 84px" }}>
      <section style={{ maxWidth: 720 }}><div style={{ color: T.accent, fontSize: 12, fontWeight: 650, letterSpacing: ".06em", marginBottom: 12 }}>SHARED SCREEN</div><h1 style={{ fontFamily: DISP, fontSize: 36, lineHeight: 1.1, letterSpacing: "-.025em", margin: "0 0 14px", fontWeight: 600 }}>Someone shared a screen with you.</h1><p style={{ color: T.inkSoft, fontSize: 15.5, lineHeight: 1.55, margin: 0 }}>Open it in Parse to see how the request becomes explicit financial filters. You can change the interpretation before running the screen.</p></section>
      <section style={{ marginTop: 28, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 15, padding: 22, maxWidth: 740 }}><div style={{ color: T.inkSoft, fontSize: 12, fontWeight: 650, marginBottom: 9 }}>THE REQUEST</div><div style={{ fontFamily: DISP, fontSize: 22, lineHeight: 1.42 }}>{query ? `“${query}”` : "No screen was included in this link."}</div>{query ? <a href={tryUrl} style={{ display: "inline-flex", height: 42, alignItems: "center", justifyContent: "center", marginTop: 20, padding: "0 18px", borderRadius: 10, background: T.accent, color: "#fff", textDecoration: "none", fontWeight: 550, fontSize: 14.5 }}>Open and run this screen</a> : <a href="/screens" style={{ display: "inline-block", marginTop: 18, color: T.accent, textDecoration: "none" }}>Browse screen ideas →</a>}</section>
      <div style={{ marginTop: 20, color: T.inkSoft, fontSize: 13 }}>Research tool only—not investment advice.</div>
    </main>
  </div>;
}
