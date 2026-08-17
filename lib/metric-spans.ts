export interface MetricSpan {
  field: string;
  start: number;
  end: number;
  text: string;
}

export const FUNDAMENTAL_TERMS: [string, string][] = [
  ["revGrowth3Y", "(?:3[- ]?year revenue growth|3y revenue growth|revenue growth (?:over )?(?:3[- ]?years|3y)|3[- ]?year revenue cagr|3y revenue cagr)"],
  ["epsGrowth3Y", "(?:3[- ]?year (?:eps|earnings) growth|3y (?:eps|earnings) growth|(?:eps|earnings) growth (?:over )?(?:3[- ]?years|3y)|3[- ]?year (?:eps|earnings) cagr|3y (?:eps|earnings) cagr)"],
  ["roic", "(?:\\broic\\b|return on invested capital)"],
  ["operatingMargin", "(?:operating margin|operating profit margin)"],
  ["fcfMargin", "(?:free cash flow margin|\\bfcf margin\\b)"],
  ["fcfYield", "(?:free cash flow yield|\\bfcf yield\\b)"],
  ["debtEquity", "(?:debt\\s*(?:to|/)\\s*equity|debt[- ]?equity ratio)"],
  ["interestCoverage", "(?:interest coverage|interest cover)"],
  ["evEbitda", "(?:ev\\s*(?:to|/)\\s*ebitda|enterprise value\\s*(?:to|/)\\s*ebitda)"],
];

type SpanSpec = { field: string; source: string };

// Order matters: specific/compound metrics claim their text before broader metrics.
// This prevents words such as "value", "yield", and "revenue growth" inside a
// recognized metric from being reinterpreted by another metric or qualitative rule.
const SPAN_SPECS: SpanSpec[] = [
  ...FUNDAMENTAL_TERMS.map(([field, source]) => ({ field, source })),
  { field: "pe", source: "(?:\\bp\\/?e\\b|price.?to.?earnings)" },
  { field: "pb", source: "(?:\\bp\\/?b\\b|price.?to.?book)" },
  { field: "ps", source: "(?:\\bp\\/?s\\b|price.?to.?sales)" },
  { field: "divYield", source: "(?:dividend yield|\\byield(?:ing)?\\b)" },
  { field: "beta", source: "\\bbeta\\b" },
  { field: "marketCap", source: "market\\s*cap" },
  { field: "revGrowth", source: "(?:revenue growth|growing revenue|grow(?:ing)? revenue)" },
  { field: "rsi", source: "\\brsi\\b" },
];

function overlaps(aStart: number, aEnd: number, b: MetricSpan): boolean {
  return aStart < b.end && aEnd > b.start;
}

export function findMetricSpans(text: string): MetricSpan[] {
  const spans: MetricSpan[] = [];

  for (const spec of SPAN_SPECS) {
    const rx = new RegExp(spec.source, "gi");
    for (const match of text.matchAll(rx)) {
      if (match.index == null) continue;
      const start = match.index;
      const end = start + match[0].length;
      if (spans.some((span) => overlaps(start, end, span))) continue;
      spans.push({ field: spec.field, start, end, text: match[0] });
    }
  }

  return spans.sort((a, b) => a.start - b.start || b.end - a.end);
}

function maskSpans(text: string, spans: MetricSpan[]): string {
  if (!spans.length) return text;
  const chars = [...text];
  for (const span of spans) {
    for (let i = span.start; i < span.end; i++) chars[i] = " ";
  }
  return chars.join("");
}

// Keeps the requested metric's phrases visible while masking phrases owned by
// every other metric. Numeric/operator text is intentionally preserved so the
// target metric can still bind to its nearby condition.
export function textForMetric(text: string, spans: MetricSpan[], field: string): string {
  return maskSpans(text, spans.filter((span) => span.field !== field));
}

// Generic investment-language rules only see text that no recognized metric owns.
export function textForGenericIntent(text: string, spans: MetricSpan[]): string {
  return maskSpans(text, spans);
}

export function hasMetricSpan(spans: MetricSpan[], field: string): boolean {
  return spans.some((span) => span.field === field);
}
