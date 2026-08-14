import type { Metadata } from "next";
import { PUBLIC_SCREENS } from "../../lib/publicScreens";

export const metadata: Metadata = {
  title: "Stock Screen Ideas",
  description: "Browse ready-made stock screening ideas and run them in Parse. Value, growth, dividend, quality, momentum, and pullback screens in plain English.",
  alternates: { canonical: "/screens" },
  openGraph: { title: "20 stock screen ideas you can run in plain English", description: "Browse value, growth, income, quality, momentum, and pullback screens in Parse.", url: "/screens", images: [{ url: "/api/og?title=20%20stock%20screen%20ideas&subtitle=Browse%20a%20screen%2C%20see%20the%20logic%2C%20then%20run%20or%20change%20it", width: 1200, height: 630 }] },
};

const T = { bg: "#F4F5F7", surface: "#FFFFFF", border: "#E6E8EC", ink: "#15171C", inkSoft: "#565C67", accent: "#2C36A8", accentInk: "#232A85" };
const DISP = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export default function ScreensPage() {
  const categories = ["value", "growth", "income", "quality", "momentum", "pullback"] as const;
  return <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
    <style>{`.sg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.sg-card{display:block;background:${T.surface};border:1px solid ${T.border};border-radius:13px;padding:18px;color:${T.ink};text-decoration:none;transition:transform .14s,border-color .14s}.sg-card:hover{transform:translateY(-2px);border-color:#D4D8DF}.sg-btn{display:inline-flex;height:40px;padding:0 18px;border-radius:10px;align-items:center;justify-content:center;background:${T.accent};color:#fff;text-decoration:none;font-weight:550;font-size:14.5px}.sg-btn:hover{background:${T.accentInk}}@media(max-width:760px){.sg-grid{grid-template-columns:1fr}.sg-hide{display:none!important}}`}</style>
    <header style={{ borderBottom: `1px solid ${T.border}` }}><div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><a href="/" style={{ color: T.ink, textDecoration: "none", fontFamily: DISP, fontWeight: 600, fontSize: 18 }}>Parse</a><div style={{ display: "flex", gap: 14, alignItems: "center" }}><a className="sg-hide" href="/methodology" style={{ color: T.accent, textDecoration: "none", fontSize: 14 }}>How it works</a><a href="/try" className="sg-btn">Try Parse</a></div></div></header>
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 24px 82px" }}>
      <section style={{ maxWidth: 730 }}><div style={{ fontFamily: MONO, fontSize: 12, color: T.accent, letterSpacing: ".06em", marginBottom: 11 }}>SCREEN IDEAS</div><h1 style={{ fontFamily: DISP, fontSize: 40, lineHeight: 1.07, letterSpacing: "-.025em", margin: "0 0 15px", fontWeight: 600 }}>Start with a screen worth asking.</h1><p style={{ margin: 0, color: T.inkSoft, fontSize: 16.5, lineHeight: 1.58 }}>These are starting points, not recommendations. Open one to see the idea and the criteria behind it, then run or change the screen in Parse.</p></section>
      {categories.map((category) => {
        const screens = PUBLIC_SCREENS.filter((s) => s.category === category);
        return <section key={category} style={{ marginTop: 42 }}><h2 style={{ fontFamily: DISP, fontSize: 21, textTransform: "capitalize", margin: "0 0 13px", fontWeight: 600 }}>{category}</h2><div className="sg-grid">{screens.map((screen) => <a className="sg-card" href={`/screens/${screen.slug}`} key={screen.slug}><div style={{ fontFamily: DISP, fontWeight: 600, fontSize: 16, marginBottom: 7 }}>{screen.title}</div><div style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.48 }}>{screen.summary}</div><div style={{ marginTop: 12, color: T.accent, fontSize: 13.5 }}>View screen →</div></a>)}</div></section>;
      })}
      <section style={{ marginTop: 52, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, maxWidth: 760 }}><h2 style={{ fontFamily: DISP, fontSize: 20, margin: "0 0 7px", fontWeight: 600 }}>Have a different idea?</h2><p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.5, margin: "0 0 15px" }}>Describe it in your own words. Parse will turn it into a screen you can inspect and edit.</p><a href="/try" className="sg-btn">Describe your screen</a></section>
    </main>
  </div>;
}
