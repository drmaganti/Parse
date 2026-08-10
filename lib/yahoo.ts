// Free daily candles from Yahoo, used to compute RSI, moving averages, and the
// weekly change locally when Finnhub's candle endpoint isn't on the plan. Same
// source the value-screener already uses via yfinance; here we hit the chart
// endpoint directly. Nightly, server-side, one call per symbol.

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// Yahoo uses "-" where Finnhub uses "." (e.g. BRK.B -> BRK-B).
function toYahoo(symbol: string): string {
  return symbol.replace(/\./g, "-").toUpperCase();
}

export async function fetchYahooCandles(
  symbol: string,
  range = "1y"
): Promise<{ closes: number[]; highs: number[] } | null> {
  const url = `${BASE}/${encodeURIComponent(toYahoo(symbol))}?range=${range}&interval=1d`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (parse-screener ingest)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const rawCloses: (number | null)[] = quote?.close ?? [];
    const rawHighs: (number | null)[] = quote?.high ?? [];
    if (!rawCloses.length) return null;

    // Drop sessions Yahoo reports as null so the indicator math gets clean series.
    const closes: number[] = [];
    const highs: number[] = [];
    for (let i = 0; i < rawCloses.length; i++) {
      const c = rawCloses[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        closes.push(c);
        const h = rawHighs[i];
        highs.push(typeof h === "number" && Number.isFinite(h) ? h : c);
      }
    }
    return closes.length ? { closes, highs } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
