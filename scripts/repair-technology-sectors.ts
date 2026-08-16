// Targeted cache repair for sector-mapping regressions.
//
// The August 2026 bug caused some Biotechnology companies to be cached as
// Technology because the old mapper matched the substring "tech" first.
// Rather than refreshing every quote/metric/candle, this script re-checks only
// rows currently cached as Technology and updates the sector when the current
// profile mapper disagrees.

import { createClient } from "@supabase/supabase-js";
import { fetchProfile } from "../lib/finnhub";

const FINNHUB = requireEnv("FINNHUB_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface CachedRow {
  symbol: string;
  sector: string | null;
}

async function main() {
  const { data, error } = await supabase
    .from("stocks")
    .select("symbol,sector")
    .eq("sector", "Technology")
    .order("symbol");

  if (error) throw error;
  const rows = (data ?? []) as CachedRow[];
  console.log(`Checking ${rows.length} cached Technology rows for classification drift...`);

  let changed = 0;
  let unchanged = 0;
  let unknown = 0;

  for (const row of rows) {
    const profile = await fetchProfile(row.symbol, FINNHUB);
    if (!profile.sector) {
      unknown++;
      console.log(`  ${row.symbol}: no mapped sector returned; keeping Technology`);
      continue;
    }
    if (profile.sector === row.sector) {
      unchanged++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("stocks")
      .update({ sector: profile.sector })
      .eq("symbol", row.symbol);
    if (updateError) throw updateError;

    changed++;
    console.log(`  ${row.symbol}: ${row.sector} -> ${profile.sector}`);
  }

  console.log(`Sector repair complete. changed=${changed}, unchanged=${unchanged}, unknown=${unknown}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
