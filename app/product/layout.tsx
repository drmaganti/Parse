import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Parse App",
  robots: { index: false, follow: false },
};

export default function ProductLayout({ children }: { children: ReactNode }) {
  return children;
}
