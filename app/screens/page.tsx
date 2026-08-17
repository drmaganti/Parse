import type { Metadata } from "next";
import { PUBLIC_SCREENS } from "../../lib/publicScreens";
import { supabasePublic } from "../../lib/supabase-server";
import ScreenMarketplace from "./ScreenMarketplace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stock Screener Marketplace",
  description: "Discover popular stock screens by strategy, metric, or investor style, then run and customize them in Parse.",
  alternates: { canonical: "/screens" },
};

export default async function ScreensPage() {
  const { data } = await supabasePublic
    .from("shared_screens")
    .select("slug,title,query,created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(18);

  const community = (data ?? []).map((screen: any) => ({
    slug: screen.slug,
    title: screen.title,
    query: screen.query || "",
    createdAt: screen.created_at,
  }));

  return <ScreenMarketplace screens={PUBLIC_SCREENS} community={community} />;
}
