import type { MetadataRoute } from "next";
import { MARKETING_PAGES } from "../lib/marketingPages";
import { PUBLIC_SCREENS } from "../lib/publicScreens";
import { INVESTOR_COLLECTIONS } from "../lib/investorCollections";
import { supabasePublic } from "../lib/supabase-server";

const base = "https://getparse.app";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let publicScreens: any[] = [];
  try { const { data } = await supabasePublic.from("shared_screens").select("slug,created_at").eq("visibility", "public").eq("is_indexable", true).order("created_at", { ascending: false }).limit(500); publicScreens = data ?? []; } catch {}
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/try`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/screens`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/investors`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...INVESTOR_COLLECTIONS.map((c) => ({ url: `${base}/investors/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...MARKETING_PAGES.map((page) => ({ url: `${base}/${page.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...PUBLIC_SCREENS.map((screen) => ({ url: `${base}/screens/${screen.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...publicScreens.map((screen) => ({ url: `${base}/s/${screen.slug}`, lastModified: new Date(screen.created_at || now), changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
