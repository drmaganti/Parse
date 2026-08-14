import type { MetadataRoute } from "next";
import { MARKETING_PAGES } from "../lib/marketingPages";
import { PUBLIC_SCREENS } from "../lib/publicScreens";

const base = "https://getparse.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/try`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/screens`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...MARKETING_PAGES.map((page) => ({
      url: `${base}/${page.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PUBLIC_SCREENS.map((screen) => ({
      url: `${base}/screens/${screen.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
