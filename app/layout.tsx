import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Parse — natural-language stock screener",
  description: "Describe a screen in plain English. Edit it. Run it on live data.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
