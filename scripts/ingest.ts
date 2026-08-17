// Nightly ingestion. Reads the universe, pulls Finnhub data per symbol, computes
// indicators locally, and upserts one row per symbol into Supabase. This is the
// ONLY place Finnhub is called; the app reads the cache, never the API.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchProfile, fetchMetrics, fetchQuote, fetchCandles } from "../lib/finnhub";
import { fetchYahooCandles } from "../lib/yahoo";
import { rsi, sma, pctChange, fromHigh } from "../lib/indicators";

const __dir = dirname(fileURLToPath(import.meta.url));
const FINNHUB = requireEnv("FINNHUB_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const CANDLE_SOURCE = (process.env.CANDLE_SOURCE ?? (process.env.USE_CANDLES === "false" ? "none" : "yahoo")).toLowerCase();
const LIMIT = Number(process.env.UNIVERSE_LIMIT ?? 0);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

interface Row {
  symbol: string; name: string; sector: string | null;
  price: number | null; market_cap: number | null;
  pe: number | null; forward_pe: number | null; pb: number | null; ps: number | null; forward_peg: number | null; earnings_yield: number | null;
  div_yield: number | null; div_growth_5y: number | null; payout_ratio: number | null;
  beta: number | null; rev_growth: number | null;
  roic: number | null; roe: number | null; gross_margin: number | null; operating_margin: number | null; fcf_margin: number | null; fcf_yield: number | null;
  debt_equity: number | null; interest_coverage: number | null; current_ratio: number | null; quick_ratio: number | null;
  rev_growth_3y: number | null; eps_growth_3y: number | null; ev_ebitda: number | null;
  rsi: number | null; sma50: number | null; sma200: number | null;
  from_52w_high: number | null; chg_1w: number | null; chg_1d: number | null;
  updated_at: string;
}

async function build(symbol: string): Promise<Row | null> {
  try {
    const [profile, metrics, quote] = await Promise.all([
      fetchProfile(symbol, FINNHUB), fetchMetrics(symbol, FINNHUB), fetchQuote(symbol, FINNHUB),
    ]);

    let rsiVal: number | null = null;
    let sma50: number | null = null;
    let sma200: number | null = null;
    let from52: number | null = null;
    let chg1w: number | null = null;

    if (CANDLE_SOURCE !== "none") {
      const candles = CANDLE_SOURCE === "finnhub" ? await fetchCandles(symbol, FINNHUB) : await fetchYahooCandles(symbol);
      if (candles && candles.closes.length) {
        rsiVal = rsi(candles.closes, 14);
        sma50 = sma(candles.closes, 50);
        sma200 = sma(candles.closes, 200);
        chg1w = pctChange(candles.closes, 5);
        from52 = fromHigh(candles.highs.length ? candles.highs : candles.closes, candles.closes[candles.closes.length - 1]);
      }
    }
    if (from52 == null && metrics.high52 && quote.price) from52 = ((quote.price - metrics.high52) / metrics.high52) * 100;
    const chg1d = quote.price && quote.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : null;

    return {
      symbol,
      name: profile.name ?? symbol,
      sector: profile.sector,
      price: quote.price ?? null,
      market_cap: metrics.marketCap != null ? round(metrics.marketCap / 1000, 1) : null,
      pe: round(metrics.pe), forward_pe: round(metrics.forwardPe), pb: round(metrics.pb), ps: round(metrics.ps),
      forward_peg: round(metrics.forwardPeg, 2), earnings_yield: round(metrics.earningsYield),
      div_yield: round(metrics.divYield), div_growth_5y: round(metrics.divGrowth5Y), payout_ratio: round(metrics.payoutRatio),
      beta: round(metrics.beta, 2), rev_growth: round(metrics.revGrowth),
      roic: round(metrics.roic), roe: round(metrics.roe), gross_margin: round(metrics.grossMargin), operating_margin: round(metrics.operatingMargin),
      fcf_margin: round(metrics.fcfMargin), fcf_yield: round(metrics.fcfYield),
      debt_equity: round(metrics.debtEquity, 2), interest_coverage: round(metrics.interestCoverage, 1),
      current_ratio: round(metrics.currentRatio, 2), quick_ratio: round(metrics.quickRatio, 2),
      rev_growth_3y: round(metrics.revGrowth3Y), eps_growth_3y: round(metrics.epsGrowth3Y), ev_ebitda: round(metrics.evEbitda, 1),
      rsi: round(rsiVal), sma50: round(sma50), sma200: round(sma200),
      from_52w_high: round(from52), chg_1w: round(chg1w), chg_1d: round(chg1d),
      updated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.warn(`  skip ${symbol}: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  const raw = JSON.parse(readFileSync(join(__dir, "../data/universe.json"), "utf8"));
  let symbols: string[] = raw.symbols ?? [];
  if (LIMIT > 0) symbols = symbols.slice(0, LIMIT);

  console.log(`Ingesting ${symbols.length} symbols (candles: ${CANDLE_SOURCE})…`);
  const rows: Row[] = [];
  let done = 0;
  for (const s of symbols) {
    const row = await build(s);
    if (row) rows.push(row);
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${symbols.length}`);
  }

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from("stocks").upsert(chunk, { onConflict: "symbol" });
    if (error) throw error;
  }

  console.log(`Done. Upserted ${rows.length}/${symbols.length}.`);
}

function round(v: number | null | undefined, dp = 1): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

main().catch((e) => { console.error(e); process.exit(1); });
