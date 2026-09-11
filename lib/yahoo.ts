// Free market data from Yahoo, used server-side during nightly ingestion for
// candles and analyst consensus price targets.

const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const QUOTE_SUMMARY_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const USER_AGENT = "Mozilla/5.0 (parse-screener ingest)";

export interface AnalystPriceTargets {
  low: number | null;
  median: number | null;
  mean: number | null;
  high: number | null;
  analystCount: number | null;
}

let sessionPromise: Promise<{ cookie: string; crumb: string } | null> | null = null;

// Yahoo uses "-" where Finnhub uses "." (e.g. BRK.B -> BRK-B).
function toYahoo(symbol: string): string {
  return symbol.replace(/\./g, "-").toUpperCase();
}

export async function fetchYahooCandles(
  symbol: string,
  range = "1y"
): Promise<{ closes: number[]; highs: number[]; volumes: number[] } | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(toYahoo(symbol))}?range=${range}&interval=1d`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const rawCloses: (number | null)[] = quote?.close ?? [];
    const rawHighs: (number | null)[] = quote?.high ?? [];
    const rawVolumes: (number | null)[] = quote?.volume ?? [];
    if (!rawCloses.length) return null;

    // Drop sessions Yahoo reports as null so the indicator math gets clean series.
    const closes: number[] = [];
    const highs: number[] = [];
    const volumes: number[] = [];
    for (let i = 0; i < rawCloses.length; i++) {
      const c = rawCloses[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        closes.push(c);
        const h = rawHighs[i];
        highs.push(typeof h === "number" && Number.isFinite(h) ? h : c);
        const v = rawVolumes[i];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) volumes.push(v);
      }
    }
    return closes.length ? { closes, highs, volumes } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchYahooAnalystTargets(symbol: string): Promise<AnalystPriceTargets | null> {
  const session = await getYahooSession();
  if (!session) return null;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000);
  try {
    const url = `${QUOTE_SUMMARY_BASE}/${encodeURIComponent(toYahoo(symbol))}?modules=financialData&crumb=${encodeURIComponent(session.crumb)}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Cookie: session.cookie },
    });
    if (!res.ok) {
      if (res.status === 401) sessionPromise = null;
      return null;
    }

    const data = await res.json();
    const financialData = data?.quoteSummary?.result?.[0]?.financialData;
    const targets = {
      low: rawNumber(financialData?.targetLowPrice),
      median: rawNumber(financialData?.targetMedianPrice),
      mean: rawNumber(financialData?.targetMeanPrice),
      high: rawNumber(financialData?.targetHighPrice),
      analystCount: rawNumber(financialData?.numberOfAnalystOpinions),
    };
    return Object.values(targets).some((value) => value != null) ? targets : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  if (!sessionPromise) sessionPromise = createYahooSession();
  return sessionPromise;
}

async function createYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const cookieResponse = await fetch("https://fc.yahoo.com", {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
    });
    const setCookies = typeof cookieResponse.headers.getSetCookie === "function"
      ? cookieResponse.headers.getSetCookie()
      : [cookieResponse.headers.get("set-cookie") ?? ""];
    const cookie = setCookies.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
    if (!cookie) return null;

    const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": USER_AGENT, Cookie: cookie },
    });
    if (!crumbResponse.ok) return null;
    const crumb = (await crumbResponse.text()).trim();
    return crumb ? { cookie, crumb } : null;
  } catch {
    return null;
  }
}

function rawNumber(value: unknown): number | null {
  const candidate = value && typeof value === "object" && "raw" in value
    ? (value as { raw?: unknown }).raw
    : value;
  const number = Number(candidate);
  return candidate != null && Number.isFinite(number) ? number : null;
}
