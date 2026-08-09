// Technical indicators computed locally from a close-price series, so the
// screener needs zero indicator API calls. Wilder's RSI and simple moving avgs.

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Wilder's RSI over `period` (default 14). Expects oldest → newest closes.
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d >= 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Percent change between the close `daysBack` sessions ago and the latest close.
export function pctChange(closes: number[], daysBack: number): number | null {
  if (closes.length <= daysBack) return null;
  const prev = closes[closes.length - 1 - daysBack];
  const last = closes[closes.length - 1];
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
}

// Percent distance below the trailing-window high (negative or zero).
export function fromHigh(highs: number[], lastClose: number): number | null {
  if (!highs.length || !lastClose) return null;
  const hi = Math.max(...highs);
  if (!hi) return null;
  return ((lastClose - hi) / hi) * 100;
}
