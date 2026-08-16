// Minimal Finnhub client with a conservative throttle. The free tier allows
// 60 calls/minute; we pace at ~55 to leave headroom and avoid 429s. Every call
// goes through `throttle`, so the whole nightly run self-limits.

const BASE = "https://finnhub.io/api/v1";
const MIN_INTERVAL_MS = Math.ceil(60000 / 55); // ~1091ms between calls

let lastCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = lastCall + MIN_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function get(path: string, key: string): Promise<any> {
  await throttle();
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}token=${key}`);
  if (res.status === 429) {
    // Backoff once, then retry.
    await new Promise((r) => setTimeout(r, 2500));
    return get(path, key);
  }
  if (!res.ok) throw new Error(`Finnhub ${res.status} on ${path}`);
  return res.json();
}

export interface Metrics {
  marketCap?: number;   // reported in millions by Finnhub
  pe?: number;
  pb?: number;
  ps?: number;
  divYield?: number;
  beta?: number;
  revGrowth?: number;
  roic?: number;
  operatingMargin?: number;
  fcfMargin?: number;
  fcfYield?: number;
  debtEquity?: number;
  interestCoverage?: number;
  revGrowth3Y?: number;
  epsGrowth3Y?: number;
  evEbitda?: number;
  high52?: number;
}

export async function fetchProfile(symbol: string, key: string) {
  const p = await get(`/stock/profile2?symbol=${symbol}`, key);
  return { name: p?.name as string | undefined, sector: mapSector(p?.finnhubIndustry) };
}

export async function fetchMetrics(symbol: string, key: string): Promise<Metrics> {
  const d = await get(`/stock/metric?symbol=${symbol}&metric=all`, key);
  const m = d?.metric ?? {};
  const marketCap = num(m.marketCapitalization);
  const enterpriseValue = num(m.enterpriseValue);
  const evFcf = num(m["currentEv/freeCashFlowTTM"]);
  const roicAnnual = latestAnnual(d?.series, "roic");
  const fcfMarginAnnual = latestAnnual(d?.series, "fcfMargin");
  const fcfYield = enterpriseValue != null && marketCap != null && marketCap > 0 && evFcf != null && evFcf !== 0
    ? (enterpriseValue / evFcf / marketCap) * 100
    : undefined;
  return {
    marketCap,                                               // millions
    pe: num(m.peTTM ?? m.peBasicExclExtraTTM),
    pb: num(m.pbQuarterly ?? m.pbAnnual),
    ps: num(m.psTTM),
    divYield: num(m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM),
    beta: num(m.beta),
    revGrowth: num(m.revenueGrowthTTMYoy),
    roic: roicAnnual == null ? undefined : roicAnnual * 100,
    operatingMargin: num(m.operatingMarginTTM),
    fcfMargin: fcfMarginAnnual == null ? undefined : fcfMarginAnnual * 100,
    fcfYield,
    debtEquity: num(m["totalDebt/totalEquityQuarterly"]),
    interestCoverage: num(m.netInterestCoverageTTM),
    revGrowth3Y: num(m.revenueGrowth3Y),
    epsGrowth3Y: num(m.epsGrowth3Y),
    evEbitda: num(m.evEbitdaTTM),
    high52: num(m["52WeekHigh"]),
  };
}

export async function fetchQuote(symbol: string, key: string) {
  const q = await get(`/quote?symbol=${symbol}`, key);
  return { price: num(q?.c), prevClose: num(q?.pc) };
}

// Daily candles for indicator math. Returns oldest→newest closes and highs.
export async function fetchCandles(
  symbol: string,
  key: string,
  days = 260
): Promise<{ closes: number[]; highs: number[] } | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 3600;
  const c = await get(`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}`, key);
  if (c?.s !== "ok" || !Array.isArray(c.c)) return null;
  return { closes: c.c as number[], highs: (c.h as number[]) ?? [] };
}

function num(v: any): number | undefined {
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

function latestAnnual(series: any, key: string): number | undefined {
  const rows = series?.annual?.[key];
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const latest = [...rows].sort((a, b) => String(b?.period ?? "").localeCompare(String(a?.period ?? "")))[0];
  return num(latest?.v);
}

// Collapse Finnhub's fine-grained industries into the sectors our vocabulary uses.
// Match healthcare before technology and use word-aware tech patterns so
// "biotechnology" is not accidentally classified as Technology.
export function mapSector(industry?: string): string | null {
  if (!industry) return null;
  const s = industry.toLowerCase();
  if (/health|pharma|biotech|medical|life sciences/.test(s)) return "Healthcare";
  if (/bank|financ|insur|capital markets|asset/.test(s)) return "Financials";
  if (/\btechnology\b|\bsoftware\b|\bsemiconductors?\b|\bhardware\b|\bit services?\b|information technology/.test(s)) return "Technology";
  if (/retail|consumer|food|beverage|apparel|restaurant|auto/.test(s)) return "Consumer";
  if (/oil|gas|energy|coal/.test(s)) return "Energy";
  if (/industrial|aerospace|machinery|construction|transport|defense/.test(s)) return "Industrials";
  if (/media|telecom|communication|entertainment/.test(s)) return "Communications";
  if (/utilit|electric|water/.test(s)) return "Utilities";
  if (/material|chemical|metal|mining/.test(s)) return "Materials";
  if (/real estate|reit/.test(s)) return "Real Estate";
  return null;
}
