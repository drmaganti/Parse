import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FIELDS, RANKINGS, type Filter, type StockRow } from "../../../lib/fields";
import { runScreen } from "../../../lib/screen";
import { encodeScreenState } from "../../../lib/screen-state";
import { supabaseServer } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";
const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8" };
const DISP = "var(--font-display), 'Instrument Sans', system-ui, sans-serif";
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";

type Shared = { slug: string; title: string; query: string | null; filters: Filter[]; ranking: string; universe: string; visibility: "unlisted" | "public"; created_at: string };

async function loadScreen(slug: string): Promise<Shared | null> {
  const { data } = await supabaseServer.from("shared_screens").select("slug,title,query,filters,ranking,universe,visibility,created_at").eq("slug", slug).maybeSingle();
  return data as Shared | null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const screen = await loadScreen(params.slug);
  if (!screen) return { title: "Shared stock screen" };
  const title = `${screen.title} | Parse`;
  const description = screen.query ? `Run and edit this exact stock screen in Parse: ${screen.query.slice(0, 150)}` : `Run and edit ${screen.title} in Parse.`;
  const image = `/api/og?title=${encodeURIComponent(screen.title)}&subtitle=${encodeURIComponent("See the exact filters, current matches, and make the screen your own")}`;
  return {
    title,
    description,
    alternates: screen.visibility === "public" ? { canonical: `/s/${screen.slug}` } : undefined,
    robots: { index: screen.visibility === "public", follow: true },
    openGraph: { title, description, type: "website", url: `/s/${screen.slug}`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function formatFilter(f: Filter) {
  const m = FIELDS[f.field];
  if (!m) return `${f.field} ${f.op} ${f.value}`;
  if (m.kind === "cat") return `${m.label} ${f.op === "!=" ? "is not" : "is"} ${f.value}`;
  return `${m.label} ${f.op} ${f.value}${m.unit === "%" ? "%" : m.unit === "$B" ? "B" : ""}`;
}

export default async function SharedScreen({ params }: { params: { slug: string } }) {
  const screen = await loadScreen(params.slug);
  if (!screen) notFound();
  const { data: stockData } = await supabaseServer.from("stocks").select("*");
  const rows = (stockData ?? []) as StockRow[];
  const results = runScreen(rows, screen.filters, screen.ranking, Infinity);
  const state = encodeScreenState({ q: screen.query || screen.title, filters: screen.filters, ranking: screen.ranking });
  const tryUrl = `/try?state=${state}&source=${screen.visibility === "public" ? "public_screen" : "shared_screen"}`;
  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "var(--font-body), 'Inter', system-ui, sans-serif" }}>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><a href="/screens" style={{ color: T.accent, textDecoration: "none", fontSize: 14 }}>Browse screens</a></div></header>
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "52px 24px 84px" }}>
      <div style={{ color: T.accent, fontSize: 12, fontWeight: 650, letterSpacing: ".06em", marginBottom: 10 }}>{screen.visibility === "public" ? "PUBLIC SCREEN" : "SHARED SCREEN"}</div>
      <h1 style={{ fontFamily: DISP, fontSize: 38, lineHeight: 1.08, letterSpacing: "-.025em", margin: "0 0 12px", fontWeight: 600 }}>{screen.title}</h1>
      {screen.query && <p style={{ color: T.inkSoft, fontSize: 16, lineHeight: 1.55, margin: "0 0 24px", maxWidth: 760 }}>{screen.query}</p>}
      <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 15, padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}><h2 style={{ fontFamily: DISP, fontSize: 18, margin: 0 }}>Exact criteria</h2><span style={{ color: T.inkSoft, fontSize: 13 }}>{RANKINGS[screen.ranking]?.label || "Largest first"}</span></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 13 }}>{screen.filters.map((f) => <span key={f.id} style={{ fontFamily: MONO, fontSize: 12.5, padding: "7px 9px", border: `1px solid ${T.border}`, borderRadius: 8 }}>{formatFilter(f)}</span>)}</div></section>
      <section style={{ marginTop: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 10 }}><h2 style={{ fontFamily: DISP, fontSize: 20, margin: 0 }}>{results.length} companies currently match</h2><a href={tryUrl} style={{ display: "inline-flex", minHeight: 40, alignItems: "center", padding: "0 16px", borderRadius: 10, background: T.accent, color: "#fff", textDecoration: "none", fontWeight: 550, fontSize: 14 }}>Run or edit this screen</a></div>{results.length > 0 && <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>{results.slice(0, 12).map((r, i) => <div key={r.symbol} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, padding: "11px 14px", borderBottom: i < Math.min(results.length, 12) - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}><span style={{ fontFamily: MONO, fontWeight: 650 }}>{r.symbol}</span><span>{r.name}</span><span style={{ color: T.inkSoft, fontSize: 12.5 }}>{r.sector || ""}</span></div>)}</div>}</section>
      <p style={{ color: T.inkSoft, fontSize: 12.5, marginTop: 20 }}>Daily-refreshed market data. Research tool only—not investment advice.</p>
    </main>
  </div>;
}
