import { parseQuery } from "../lib/parse";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = { id: string; query: string; expected: Expected[] };

const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });

// Fresh blind MoneyFlock-style holdout v3.
// Frozen before first execution. Do not rewrite query text/expectations based on parser output.
// SHA-256 of canonical frozen corpus: 95faf4115ce5cc453e96972d0da0370281752448f91a21d4e53f79ae4b87ca3f
const cases: Case[] = [
  { id: "N01", query: "Tech businesses turning a profit, sales climbing more than 17%, debt kept low, valuation looks fair.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 17), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N02", query: "Healthcare firms making money with top-line growth above 11%, not much debt, and a sensible price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N03", query: "Software stocks that are profitable, revenue rising at least 16%, leverage on the low side, and not overpriced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 16), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N04", query: "Banks in the black, sales increasing over 6%, modest leverage, reasonably priced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "N05", query: "Industrial companies with positive earnings, revenue up 9%+, low debt, fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "N06", query: "Energy names earning money, growing sales by more than 8%, lightly leveraged, not expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "N07", query: "Profitable consumer stocks, top line up above 13%, debt under control, valuation not excessive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 13), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "N08", query: "Biotech companies making a profit, revenue growth north of 14%, little debt, fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 14), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N09", query: "REITs with positive earnings, sales growth over 5%, low leverage, sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 5), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Real Estate")] },
  { id: "N10", query: "Materials companies in the black, revenue increasing above 7%, minimal debt, fairly priced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Materials")] },
  { id: "N11", query: "Low-debt tech stocks with a fair valuation that are profitable and growing revenue more than 20%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N12", query: "Reasonably valued healthcare stocks with little leverage, positive earnings and sales growth above 12%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N13", query: "Show low-leverage software companies, profitable, with revenue up over 18% and a sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N14", query: "Fairly valued industrials that make money, have modest debt and double-digit sales growth.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "N15", query: "Not-expensive consumer companies with low debt, positive earnings and revenue growth at least 10%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "N16", query: "Profitable utilities: low leverage, fair valuation, sales increasing more than 4%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 4), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Utilities")] },
  { id: "N17", query: "Bank stocks with reasonable valuation and low debt; also profitable with revenue growing above 7%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "N18", query: "Energy companies with a sensible valuation, little debt, making money, top-line growth over 9%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "N19", query: "Semiconductor firms with modest debt, profitable operations, fair valuation, and sales up more than 21%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 21), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N20", query: "Pharma stocks: not too pricey, low leverage, in the black, revenue rising over 10%.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N21", query: "Profitable tech stocks growing revenue over 20%, debt/equity under 0.6, P/E below 27.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 0.6), f("pe", "<", 27), f("sector", "==", "Technology")] },
  { id: "N22", query: "Healthcare companies with operating margin above 7%, sales growth above 12%, D/E below 0.5, P/E under 26.", expected: [f("operatingMargin", ">", 7), f("revGrowth", ">", 12), f("debtEquity", "<", 0.5), f("pe", "<", 26), f("sector", "==", "Healthcare")] },
  { id: "N23", query: "Software firms making money with revenue growth >18%, low debt and forward P/E below 24.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("forwardPe", "<", 24), f("sector", "==", "Technology")] },
  { id: "N24", query: "Profitable banks with sales growth >8%, debt/equity <0.9 and P/B <2.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 0.9), f("pb", "<", 2), f("sector", "==", "Financials")] },
  { id: "N25", query: "Industrial companies with operating margin >6%, revenue growth >10%, low leverage and EV/EBITDA <13.", expected: [f("operatingMargin", ">", 6), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("evEbitda", "<", 13), f("sector", "==", "Industrials")] },
  { id: "N26", query: "Energy stocks with positive earnings, sales growth >9%, D/E <0.7 and P/E <19.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 0.7), f("pe", "<", 19), f("sector", "==", "Energy")] },
  { id: "N27", query: "Consumer companies in the black, revenue growth between 8% and 16%, low debt, P/E under 23.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 8), f("revGrowth", "<=", 16), f("debtEquity", "<", 1), f("pe", "<", 23), f("sector", "==", "Consumer")] },
  { id: "N28", query: "Biotech names with positive earnings, revenue growth above 15%, D/E below 0.8 and P/S under 7.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 15), f("debtEquity", "<", 0.8), f("ps", "<", 7), f("sector", "==", "Healthcare")] },
  { id: "N29", query: "Profitable semiconductor stocks growing revenue >22%, high ROIC, low debt, P/E <30.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 22), f("roic", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 30), f("sector", "==", "Technology")] },
  { id: "N30", query: "Healthcare growth companies with operating margin >5%, low leverage and forward P/E under 28.", expected: [f("operatingMargin", ">", 5), f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("forwardPe", "<", 28), f("sector", "==", "Healthcare")] },
  { id: "N31", query: "Profitable tech companies with sales up double digits, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N32", query: "Profitable healthcare names with revenue up 15%+, low leverage, fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N33", query: "Software stocks making money with top-line growth no less than 12%, little debt and not expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N34", query: "Bank companies in the black with sales growth north of 5%, modest debt and fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 5), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "N35", query: "Industrials with positive earnings, revenue growth greater than 9%, conservative leverage and a sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "N36", query: "Energy stocks turning a profit with sales expanding above 8%, minimal debt and fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "N37", query: "Consumer names making money, revenue growing by more than 11%, low debt and reasonably priced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "N38", query: "Profitable pharma companies with 3-year revenue CAGR above 10%, low leverage and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth3Y", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N39", query: "Profitable tech firms with 3Y EPS CAGR over 14%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("epsGrowth3Y", ">", 14), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N40", query: "Profitable semiconductor companies with revenue growth from 15% to 25%, low debt and fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 15), f("revGrowth", "<=", 25), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N41", query: "Profitable software-as-a-service companies growing revenue over 20%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N42", query: "Chipmakers making money, sales growth above 18%, low leverage and fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "N43", query: "Drug makers with positive earnings, revenue growth over 9%, little debt and sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "N44", query: "Lenders that are profitable, top-line growth above 6%, low leverage and not expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "N45", query: "Oil and gas companies in the black, sales growth over 7%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "N46", query: "Power utilities making money, revenue growth above 4%, modest debt and fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 4), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Utilities")] },
  { id: "N47", query: "Property REITs with positive earnings, sales rising over 6%, low leverage and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Real Estate")] },
  { id: "N48", query: "Communication-services stocks that are profitable, revenue growth above 8%, low debt and fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Communications")] },
  { id: "N49", query: "Basic materials firms making money, sales growth above 7%, little debt and sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Materials")] },
  { id: "N50", query: "Retail consumer companies with positive earnings, revenue growth above 9%, low leverage and not expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
];

function valueKey(value: FilterValue): string {
  return String(value).toLowerCase();
}
function key(x: Pick<Filter, "field" | "op" | "value"> | Expected): string {
  return `${x.field}|${x.op}|${valueKey(x.value)}`;
}

async function run() {
  let pass = 0;
  let partial = 0;
  let fail = 0;

  for (const c of cases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const actualKeys = new Set(result.filters.map(key));
    const expectedKeys = new Set(c.expected.map(key));
    const missing = c.expected.filter((x) => !actualKeys.has(key(x))).map(key);
    const unexpected = result.filters.filter((x) => !expectedKeys.has(key(x))).map(key);
    const matched = c.expected.length - missing.length;
    const status = missing.length === 0 && unexpected.length === 0 ? "PASS" : matched > 0 ? "PARTIAL" : "FAIL";

    if (status === "PASS") pass++;
    else if (status === "PARTIAL") partial++;
    else fail++;

    console.log(`\n${c.id} ${status}: ${c.query}`);
    console.log(`  expected: ${c.expected.map(key).join(", ")}`);
    console.log(`  actual:   ${result.filters.map(key).join(", ") || "(none)"}`);
    if (missing.length) console.log(`  missing:  ${missing.join(", ")}`);
    if (unexpected.length) console.log(`  extra:    ${unexpected.join(", ")}`);
    if (result.assumptions.length) console.log(`  assumptions: ${result.assumptions.join(" | ")}`);
    console.log(`  source: ${result.source}`);
  }

  console.log("\n=== MONEYFLOCK BLIND 50 V3 SUMMARY ===");
  console.log(`PASS: ${pass}/50`);
  console.log(`PARTIAL: ${partial}/50`);
  console.log(`FAIL: ${fail}/50`);
  console.log(`FREEZE_SHA256: 95faf4115ce5cc453e96972d0da0370281752448f91a21d4e53f79ae4b87ca3f`);

  if (partial > 0 || fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
