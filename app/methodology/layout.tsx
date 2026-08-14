import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "How Parse Works",
  description: "See how Parse translates plain-English stock screening ideas into explicit, editable financial filters instead of a hidden AI recommendation.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "How Parse turns words into stock-screening filters",
    description: "The output is a transparent screen you can inspect and change, not a black-box stock recommendation.",
    url: "/methodology",
  },
};

export default function MethodologyLayout({ children }: { children: ReactNode }) {
  return children;
}
