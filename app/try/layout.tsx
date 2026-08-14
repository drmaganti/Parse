import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Try the Natural Language Stock Screener",
  description: "Describe a stock screen in plain English, inspect the filters Parse creates, edit them, and run the screen without creating an account.",
  alternates: { canonical: "/try" },
  openGraph: {
    title: "Try Parse — Natural Language Stock Screener",
    description: "Describe a stock screen in plain English and see the explicit filters Parse creates.",
    url: "/try",
    images: [{ url: "/api/og?title=Try%20a%20stock%20screen%20in%20plain%20English&subtitle=See%20the%20filters.%20Change%20anything.%20No%20account%20required.", width: 1200, height: 630 }],
  },
};

export default function TryLayout({ children }: { children: ReactNode }) {
  return children;
}
