import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchYahooAnalystTargets } from "../lib/yahoo";
import { analystTargetMetrics } from "../lib/analyst-targets";

const __dir = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const limit = Number(process.env.UNIVERSE_LIMIT ?? 0);
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function main() {
  const universe = JSON.parse(readFileSync(join(__dir, "../data/universe.json"), "utf8"));
  let symbols: string[] = universe.symbols ?? [];
  if (limit > 0) symbols = symbols.slice(0, limit);

  let populated = 0;
  let unavailable = 0;
  let failed = 0;

  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    const targets = await fetchYahooAnalystTargets(symbol);
    if (!targets) {
      unavailable++;
      reportProgress(index, symbols.length, populated);
      continue;
    }

    const { data: stock } = await supabase.from("stocks").select("price").eq("symbol", symbol).maybeSingle();
    const { data, error } = await supabase
      .from("stocks")
      .update({
        analyst_target_low: round(targets.low),
        analyst_target_median: round(targets.median),
        analyst_target_mean: round(targets.mean),
        analyst_target_high: round(targets.high),
        ...analystTargetMetrics(stock?.price == null ? null : Number(stock.price), targets),
        analyst_target_updated_at: new Date().toISOString(),
      })
      .eq("symbol", symbol)
      .select("symbol");

    if (error) {
      failed++;
      console.warn(`  ${symbol}: ${error.message}`);
    } else if (!data?.length) {
      unavailable++;
    } else {
      populated++;
    }

    reportProgress(index, symbols.length, populated);
  }

  console.log(`Done. Populated ${populated}; unavailable ${unavailable}; failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

function reportProgress(index: number, total: number, populated: number) {
  if ((index + 1) % 25 === 0 || index + 1 === total) {
    console.log(`  ${index + 1}/${total} checked; ${populated} populated`);
  }
}

function round(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100) / 100;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
