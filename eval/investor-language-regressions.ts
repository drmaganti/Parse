import { parseQuery } from "../lib/parse";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = {
  name: string;
  query: string;
  expected?: Expected[];
  forbidden?: Expected[];
  absentFields?: string[];
  assumption?: RegExp;
};

function valueKey(value: FilterValue): string {
  if (typeof value === "string" && value.includes("|")) return value.split("|").map((v) => v.trim().toLowerCase()).sort().join("|");
  return String(value).toLowerCase();
}

function key(f: Pick<Filter, "field" | "op" | "value">) {
  return `${f.field}|${f.op}|${valueKey(f.value)}`;
}

const cases: Case[] = [
  { name: "earnings multiple", query: "Tech companies trading below 25x earnings with ROIC above 15%", expected: [{ field: "pe", op: "<", value: 25 }, { field: "roic", op: ">", value: 15 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "book multiple owns value", query: "Financial stocks below 2x book value with beta under 1", expected: [{ field: "pb", op: "<", value: 2 }, { field: "beta", op: "<", value: 1 }, { field: "sector", op: "==", value: "Financials" }], absentFields: ["pe"] },
  { name: "REIT alias", query: "REITs yielding over 4.5% with beta below 1.1", expected: [{ field: "divYield", op: ">", value: 4.5 }, { field: "beta", op: "<", value: 1.1 }, { field: "sector", op: "==", value: "Real Estate" }] },
  { name: "sales growth", query: "Industrials growing sales at least 8% with debt/equity below 1", expected: [{ field: "revGrowth", op: ">=", value: 8 }, { field: "debtEquity", op: "<", value: 1 }, { field: "sector", op: "==", value: "Industrials" }] },
  { name: "3Y sales CAGR", query: "Healthcare with 3Y sales CAGR above 12% and P/E under 30", expected: [{ field: "revGrowth3Y", op: ">", value: 12 }, { field: "pe", op: "<", value: 30 }, { field: "sector", op: "==", value: "Healthcare" }] },
  { name: "trailing EPS CAGR horizon", query: "Tech names with EPS CAGR over 15% for 3 years and P/E below 35", expected: [{ field: "epsGrowth3Y", op: ">", value: 15 }, { field: "pe", op: "<", value: 35 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "plural FCF margin", query: "Tech compounders with revenue growth over 20% and FCF margins above 12%", expected: [{ field: "revGrowth", op: ">", value: 20 }, { field: "fcfMargin", op: ">", value: 12 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "percent range", query: "Revenue growth between 10% and 25% with beta below 1.2", expected: [{ field: "revGrowth", op: ">=", value: 10 }, { field: "revGrowth", op: "<=", value: 25 }, { field: "beta", op: "<", value: 1.2 }] },
  { name: "yield compact range", query: "Utilities yielding 3-6% with beta below 0.9", expected: [{ field: "divYield", op: ">=", value: 3 }, { field: "divYield", op: "<=", value: 6 }, { field: "beta", op: "<", value: 0.9 }, { field: "sector", op: "==", value: "Utilities" }] },
  { name: "RSI compact range", query: "Tech names with RSI 45-65 and revenue growth above 20%", expected: [{ field: "rsi", op: ">=", value: 45 }, { field: "rsi", op: "<=", value: 65 }, { field: "revGrowth", op: ">", value: 20 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "comparator before debt equity", query: "Utilities yielding above 4% with no more than 1x debt/equity", expected: [{ field: "divYield", op: ">", value: 4 }, { field: "debtEquity", op: "<=", value: 1 }, { field: "sector", op: "==", value: "Utilities" }] },
  { name: "explicit high yield threshold", query: "High-yield stocks above 5% with P/E below 20", expected: [{ field: "divYield", op: ">", value: 5 }, { field: "pe", op: "<", value: 20 }] },
  { name: "dividend grower no invented yield", query: "Dividend growers with payout ratio below 60%", expected: [{ field: "payoutRatio", op: "<", value: 60 }], absentFields: ["divYield", "divGrowth5Y"], assumption: /dividend grow/i },
  { name: "dividend stock no invented yield", query: "Dividend stocks with payout ratio below 50% and P/E below 20", expected: [{ field: "payoutRatio", op: "<", value: 50 }, { field: "pe", op: "<", value: 20 }], absentFields: ["divYield"] },
  { name: "low beta remains ambiguous", query: "Income stocks with low beta", absentFields: ["beta", "divYield"], assumption: /low beta/i },
  { name: "growth stock uses disclosed Parse default", query: "Growth stocks with low debt", expected: [{ field: "revGrowth", op: ">", value: 15 }, { field: "debtEquity", op: "<", value: 1 }], absentFields: ["revGrowth3Y"], assumption: /growth stock.*15%.*Parse.*default/i },
  { name: "explicit revenue growth overrides growth-stock default", query: "Growth stocks with revenue growth above 25%", expected: [{ field: "revGrowth", op: ">", value: 25 }], forbidden: [{ field: "revGrowth", op: ">", value: 15 }], absentFields: ["revGrowth3Y"] },
  { name: "explicit 3Y growth replaces growth-stock default", query: "Growth stocks with 3-year revenue CAGR above 12%", expected: [{ field: "revGrowth3Y", op: ">", value: 12 }], absentFields: ["revGrowth"] },
  { name: "explicit EPS growth replaces growth-stock default", query: "Growth stocks with 3Y EPS CAGR above 10%", expected: [{ field: "epsGrowth3Y", op: ">", value: 10 }], absentFields: ["revGrowth"] },
  { name: "common concept defaults compose", query: "Profitable tech companies growing revenue over 20% with low debt and a reasonable valuation", expected: [{ field: "operatingMargin", op: ">", value: 0 }, { field: "sector", op: "==", value: "Technology" }, { field: "revGrowth", op: ">", value: 20 }, { field: "debtEquity", op: "<", value: 1 }, { field: "pe", op: "<", value: 25 }], assumption: /profitable.*operating margin.*default.*low debt.*below 1.*default.*reasonable valuation.*P\/E below 25.*default/i },
  { name: "explicit profitability metric overrides default", query: "Profitable tech companies with operating margin above 12%", expected: [{ field: "operatingMargin", op: ">", value: 12 }, { field: "sector", op: "==", value: "Technology" }], forbidden: [{ field: "operatingMargin", op: ">", value: 0 }] },
  { name: "explicit debt metric overrides low-debt default", query: "Low debt companies with debt/equity below 0.5", expected: [{ field: "debtEquity", op: "<", value: 0.5 }], forbidden: [{ field: "debtEquity", op: "<", value: 1 }] },
  { name: "explicit valuation metric overrides reasonable-valuation default", query: "Reasonably valued tech stocks with forward P/E below 20", expected: [{ field: "forwardPe", op: "<", value: 20 }, { field: "sector", op: "==", value: "Technology" }], forbidden: [{ field: "pe", op: "<", value: 25 }] },
  { name: "sector OR", query: "Technology and Healthcare stocks with P/E below 30", expected: [{ field: "sector", op: "in", value: "Technology|Healthcare" }, { field: "pe", op: "<", value: 30 }] },
  { name: "multiple sector exclusions", query: "Exclude Technology and Energy; P/E below 18", expected: [{ field: "sector", op: "!=", value: "Technology" }, { field: "sector", op: "!=", value: "Energy" }, { field: "pe", op: "<", value: 18 }] },
  { name: "earnings yield is distinct", query: "Financials with earnings yield above 6% and P/B below 2", expected: [{ field: "earningsYield", op: ">", value: 6 }, { field: "pb", op: "<", value: 2 }, { field: "sector", op: "==", value: "Financials" }], absentFields: ["divYield"] },
  { name: "forward PE is distinct", query: "Tech stocks with forward P/E below 25 and revenue growth above 15%", expected: [{ field: "forwardPe", op: "<", value: 25 }, { field: "revGrowth", op: ">", value: 15 }, { field: "sector", op: "==", value: "Technology" }], absentFields: ["pe"] },
  { name: "metric local ranges do not steal", query: "Revenue growth between 10% and 25%, operating margin above 12%, and beta below 1.2", expected: [{ field: "revGrowth", op: ">=", value: 10 }, { field: "revGrowth", op: "<=", value: 25 }, { field: "operatingMargin", op: ">", value: 12 }, { field: "beta", op: "<", value: 1.2 }] },
  { name: "ROE supported", query: "Industrials with ROE above 15% and P/E below 20", expected: [{ field: "roe", op: ">", value: 15 }, { field: "pe", op: "<", value: 20 }, { field: "sector", op: "==", value: "Industrials" }] },
  { name: "gross margin supported", query: "Tech companies with gross margin above 50% and revenue growth above 15%", expected: [{ field: "grossMargin", op: ">", value: 50 }, { field: "revGrowth", op: ">", value: 15 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "PEG supported", query: "Tech stocks with PEG below 1.5 and P/E below 35", expected: [{ field: "peg", op: "<", value: 1.5 }, { field: "pe", op: "<", value: 35 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "forward PEG supported separately", query: "Tech stocks with forward PEG below 2 and revenue growth above 20%", expected: [{ field: "forwardPeg", op: "<", value: 2 }, { field: "revGrowth", op: ">", value: 20 }, { field: "sector", op: "==", value: "Technology" }] },
  { name: "current ratio supported", query: "Healthcare with current ratio above 2 and debt/equity below 0.5", expected: [{ field: "currentRatio", op: ">", value: 2 }, { field: "debtEquity", op: "<", value: 0.5 }, { field: "sector", op: "==", value: "Healthcare" }] },
  { name: "quick ratio supported", query: "Healthcare with quick ratio above 1.5 and current ratio above 2", expected: [{ field: "quickRatio", op: ">", value: 1.5 }, { field: "currentRatio", op: ">", value: 2 }, { field: "sector", op: "==", value: "Healthcare" }] },
  { name: "5Y dividend growth supported", query: "Dividend stocks with 5-year dividend CAGR above 7% and payout ratio below 60%", expected: [{ field: "divGrowth5Y", op: ">", value: 7 }, { field: "payoutRatio", op: "<", value: 60 }], absentFields: ["divYield"] },
  { name: "unsupported tangible book not substituted", query: "Financials with price-to-tangible-book under 1.5 and dividend yield above 3%", expected: [{ field: "divYield", op: ">", value: 3 }, { field: "sector", op: "==", value: "Financials" }], absentFields: ["pb"], assumption: /tangible book/i },
  { name: "unsupported net debt EBITDA not substituted", query: "Energy stocks with net debt/EBITDA below 2 and EV/EBITDA below 10", expected: [{ field: "evEbitda", op: "<", value: 10 }, { field: "sector", op: "==", value: "Energy" }], absentFields: ["debtEquity"], assumption: /net.debt.*ebitda/i },
  { name: "unsupported buyback surfaced", query: "Consumer companies buying back shares with P/E below 20", expected: [{ field: "pe", op: "<", value: 20 }, { field: "sector", op: "==", value: "Consumer" }], assumption: /buyback|buying back shares/i },
  { name: "unsupported insider ownership surfaced", query: "Large-cap companies with insider ownership above 5% and ROIC above 15%", expected: [{ field: "marketCap", op: ">", value: 50 }, { field: "roic", op: ">", value: 15 }], assumption: /insider ownership/i },
];

async function run() {
  let failures = 0;
  for (const c of cases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const actual = new Set(result.filters.map(key));
    const missing = (c.expected ?? []).filter((f) => !actual.has(key(f)));
    const forbiddenPresent = (c.forbidden ?? []).filter((f) => actual.has(key(f)));
    const absentViolation = (c.absentFields ?? []).filter((field) => result.filters.some((f) => f.field === field));
    const assumptionOk = !c.assumption || c.assumption.test(result.assumptions.join(" "));
    if (missing.length || forbiddenPresent.length || absentViolation.length || !assumptionOk) {
      failures++;
      console.log(`FAIL ${c.name}`);
      if (missing.length) console.log(`  missing: ${missing.map(key).join(", ")}`);
      if (forbiddenPresent.length) console.log(`  forbidden filters present: ${forbiddenPresent.map(key).join(", ")}`);
      if (absentViolation.length) console.log(`  unexpectedly present fields: ${absentViolation.join(", ")}`);
      if (!assumptionOk) console.log(`  missing assumption: ${c.assumption}`);
      console.log(`  actual: ${result.filters.map(key).join(", ") || "(none)"}`);
      console.log(`  assumptions: ${result.assumptions.join(" | ") || "(none)"}`);
    } else {
      console.log(`PASS ${c.name}`);
    }
  }

  if (failures) {
    console.error(`${failures}/${cases.length} investor-language regressions failed`);
    process.exit(1);
  }
  console.log(`${cases.length}/${cases.length} investor-language regressions passed`);
}

run().catch((err) => { console.error(err); process.exit(1); });
