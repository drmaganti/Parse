import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const title = "Parse — Natural Language Stock Screener";
const description = "Describe what you’re looking for. Parse turns your words into transparent, editable stock-screening filters and runs them on daily-refreshed market data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://getparse.app"),
  title,
  applicationName: "Parse",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Parse",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
