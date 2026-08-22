import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import PostHogProvider from "../components/PostHogProvider";

const title = "Parse — Natural Language Stock Screener";
const description = "Describe what you’re looking for. Parse turns your words into transparent, editable stock-screening filters and runs them on daily-refreshed market data.";
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://getparse.app"),
  title: { default: title, template: "%s | Parse" },
  applicationName: "Parse",
  description,
  keywords: ["stock screener", "AI stock screener", "natural language stock screener", "stock screening", "investment research"],
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Parse",
    type: "website",
    images: [{ url: "/api/og?title=Screen%20stocks%20the%20way%20you%20think&subtitle=Natural-language%20stock%20screening%20with%20transparent%2C%20editable%20filters", width: 1200, height: 630, alt: "Parse natural-language stock screener" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/api/og?title=Screen%20stocks%20the%20way%20you%20think&subtitle=Natural-language%20stock%20screening%20with%20transparent%2C%20editable%20filters"],
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Parse",
  url: "https://getparse.app",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
        <PostHogProvider>{children}</PostHogProvider>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="parse-ga4" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}</Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
