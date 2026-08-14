import { ImageResponse } from "next/og";

export const runtime = "edge";

function clean(value: string | null, fallback: string, max: number) {
  const normalized = (value || fallback).replace(/[<>]/g, "").trim();
  return normalized.slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clean(searchParams.get("title"), "Screen stocks the way you think", 90);
  const subtitle = clean(searchParams.get("subtitle"), "Natural-language stock screening with transparent, editable filters", 150);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F4F5F7",
          color: "#15171C",
          padding: "72px 78px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 54, height: 54, display: "flex", alignItems: "flex-end", gap: 6, padding: 12, borderRadius: 14, background: "#2C36A8" }}>
            <div style={{ width: 7, height: 18, borderRadius: 2, background: "#fff" }} />
            <div style={{ width: 7, height: 30, borderRadius: 2, background: "#fff" }} />
            <div style={{ width: 7, height: 13, borderRadius: 2, background: "rgba(255,255,255,.65)" }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>Parse</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.06, letterSpacing: "-2px" }}>{title}</div>
          <div style={{ marginTop: 24, fontSize: 29, lineHeight: 1.35, color: "#565C67" }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, color: "#565C67" }}>
          <div>getparse.app</div>
          <div style={{ color: "#2C36A8", fontWeight: 700 }}>See the filters. Change anything.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
