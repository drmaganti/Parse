import { parseQuery } from "../lib/parse";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = { id: string; query: string; expected: Expected[] };

const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });

const base = (sector: string, growthOp: Op, growth: number): Expected[] => [
  f("operatingMargin", ">", 0),
  f("revGrowth", growthOp, growth),
  f("debtEquity", "<", 1),
  f("pe", "<", 25),
  f("sector", "==", sector),
];

const cases: Case[] = [
  { id: "M01", query: "profitable tech companies growing revenue over 20% with low debt and a reasonable valuation", expected: base("Technology", ">", 20) },
  { id: "M02", query: "Find profitable healthcare companies with sales growth above 15%, low leverage, and fair valuation.", expected: base("Healthcare", ">", 15) },
  { id: "M03", query: "Profitable industrial names growing revenue at least 10% with little debt and not expensive.", expected: base("Industrials", ">=", 10) },
  { id: "M04", query: "Show profitable consumer stocks with revenue growth over 12%, minimal debt, reasonably valued.", expected: base("Consumer", ">", 12) },
  { id: "M05", query: "Profitable financial companies growing sales more than 8% where leverage is low and valuation is sensible.", expected: base("Financials", ">", 8) },
  { id: "M06", query: "Positive earnings tech businesses with revenue growth above 25%, low debt and fair valuation.", expected: base("Technology", ">", 25) },
  { id: "M07", query: "Positive net income healthcare stocks growing revenue over 18% with low leverage and not expensive.", expected: base("Healthcare", ">", 18) },
  { id: "M08", query: "Technology companies: profitable, revenue growth >20%, low debt, reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M09", query: "Low debt, profitable tech companies with a reasonable valuation and revenue growing over 20%.", expected: base("Technology", ">", 20) },
  { id: "M10", query: "Reasonably valued profitable tech companies with low leverage and sales growth above 20%.", expected: base("Technology", ">", 20) },

  { id: "M11", query: "Tech stocks making money, growing revenue above 20%, with low debt and fair valuation.", expected: base("Technology", ">", 20) },
  { id: "M12", query: "Tech companies that are in the black, growing sales over 20%, lightly leveraged, and not expensive.", expected: base("Technology", ">", 20) },
  { id: "M13", query: "Profitable tech firms with top-line growth above 20%, low debt and reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M14", query: "Profitable tech companies with revenue expanding over 20%, little debt and fair valuation.", expected: base("Technology", ">", 20) },
  { id: "M15", query: "Profitable tech businesses growing revenue above 20%, not overleveraged, sensible valuation.", expected: base("Technology", ">", 20) },
  { id: "M16", query: "Profitable tech stocks growing revenue >20%, debt is modest, reasonably valued.", expected: base("Technology", ">", 20) },
  { id: "M17", query: "Profitable tech companies growing revenue over 20%, with conservative leverage and reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M18", query: "Profitable tech companies growing revenue over 20%, low debt and valuation isn't stretched.", expected: base("Technology", ">", 20) },
  { id: "M19", query: "Profitable tech stocks with >20% revenue growth, low leverage, and priced reasonably.", expected: base("Technology", ">", 20) },
  { id: "M20", query: "Profitable technology names with sales growing above 20%, low debt, and a fair price.", expected: base("Technology", ">", 20) },

  { id: "M21", query: "Profitable tech companies growing revenue >20%, D/E below 0.5, P/E below 30.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 0.5), f("pe", "<", 30), f("sector", "==", "Technology")] },
  { id: "M22", query: "Tech companies with operating margin above 5%, revenue growth >20%, low debt, reasonable valuation.", expected: [f("operatingMargin", ">", 5), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M23", query: "Profitable tech with revenue growth >20%, low debt, forward P/E below 22.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("forwardPe", "<", 22), f("sector", "==", "Technology")] },
  { id: "M24", query: "Profitable tech with revenue growth >20%, debt/equity below 0.7, reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 0.7), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M25", query: "Technology growth stocks with low debt and reasonable valuation.", expected: [f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M26", query: "Profitable growth stocks in healthcare with low leverage and fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "M27", query: "High ROIC tech companies with low debt and reasonable valuation.", expected: [f("roic", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M28", query: "Profitable tech companies with high ROIC, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("roic", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M29", query: "Profitable tech growth stocks with high ROIC and low debt.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 15), f("roic", ">", 15), f("debtEquity", "<", 1), f("sector", "==", "Technology")] },
  { id: "M30", query: "High ROIC healthcare growth stocks that are reasonably valued.", expected: [f("roic", ">", 15), f("revGrowth", ">", 15), f("pe", "<", 25), f("sector", "==", "Healthcare")] },

  { id: "M31", query: "Profitable tech companies growing revenue double digits with low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M32", query: "Profitable tech companies with double-digit revenue growth, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M33", query: "Profitable tech companies growing revenue at least 20% with low debt and fair valuation.", expected: base("Technology", ">=", 20) },
  { id: "M34", query: "Profitable tech companies growing revenue no less than 20% with low debt and reasonable valuation.", expected: base("Technology", ">=", 20) },
  { id: "M35", query: "Profitable tech companies with revenue growth north of 20%, low debt and reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M36", query: "Profitable tech companies with revenue growth greater than 20%, minimal debt and fairly valued.", expected: base("Technology", ">", 20) },
  { id: "M37", query: "Profitable tech companies with sales growth 20%+, low leverage, reasonable valuation.", expected: base("Technology", ">=", 20) },
  { id: "M38", query: "Profitable tech companies with revenue growth between 15% and 25%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 15), f("revGrowth", "<=", 25), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M39", query: "Profitable tech companies with 3Y revenue CAGR above 15%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth3Y", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "M40", query: "Profitable tech growth companies with 3-year EPS CAGR above 15%, low debt and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("epsGrowth3Y", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },

  { id: "M41", query: "Profitable software companies growing revenue over 20% with low debt and reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M42", query: "Profitable semiconductor companies growing revenue over 20% with low debt and reasonable valuation.", expected: base("Technology", ">", 20) },
  { id: "M43", query: "Profitable biotech companies growing revenue over 20% with low debt and reasonable valuation.", expected: base("Healthcare", ">", 20) },
  { id: "M44", query: "Profitable pharma companies growing revenue over 20% with low debt and reasonable valuation.", expected: base("Healthcare", ">", 20) },
  { id: "M45", query: "Profitable bank stocks growing revenue over 10% with low leverage and reasonable valuation.", expected: base("Financials", ">", 10) },
  { id: "M46", query: "Profitable utility stocks growing revenue over 5% with low debt and reasonable valuation.", expected: base("Utilities", ">", 5) },
  { id: "M47", query: "Profitable REITs growing revenue over 8% with low debt and reasonable valuation.", expected: base("Real Estate", ">", 8) },
  { id: "M48", query: "Profitable energy stocks growing revenue over 10% with low leverage and reasonable valuation.", expected: base("Energy", ">", 10) },
  { id: "M49", query: "Profitable materials companies growing revenue over 10% with low debt and reasonable valuation.", expected: base("Materials", ">", 10) },
  { id: "M50", query: "Profitable communications companies growing revenue over 10% with low debt and reasonable valuation.", expected: base("Communications", ">", 10) },
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
  const defects: Array<{ id: string; query: string; status: string; missing: string[]; unexpected: string[]; assumptions: string[] }> = [];

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

    if (status !== "PASS") defects.push({ id: c.id, query: c.query, status, missing, unexpected, assumptions: result.assumptions });
  }

  console.log("\n=== MONEYFLOCK-STYLE 50 SUMMARY ===");
  console.log(`PASS: ${pass}/50`);
  console.log(`PARTIAL: ${partial}/50`);
  console.log(`FAIL: ${fail}/50`);
  console.log(`NON-PASS: ${defects.map((d) => d.id).join(", ") || "none"}`);
  console.log("\nDEFECT_JSON=" + JSON.stringify(defects));
}

run().catch((err) => { console.error(err); process.exit(1); });
