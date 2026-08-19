import { parseWithCriterionLedgerHardened } from "../lib/criterion-ledger-hardened";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = { id: string; query: string; expected: Expected[] };
const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });

export const CORPUS_SHA256 = "69128ba78260ec6e8523313b9235cff4a34b6f61991e843f3466be0fdcedbe33";
export const cases: Case[] = [
  { id: "B01", query: "Technology firms that are making money, with revenue advancing more than 14%, a light debt load, and a valuation that isn't stretched.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 14), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B02", query: "Healthcare companies earning a profit, top line improving above 9%, balance sheets with little debt, and shares that look fairly priced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B03", query: "Software businesses in the black, sales expanding over 16%, leverage kept modest, and valuations that still look sensible.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 16), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B04", query: "Banks producing positive earnings, revenue increasing more than 7%, conservative leverage, and a reasonable price tag.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "B05", query: "Industrial names that make money, grow sales above 11%, carry minimal debt, and trade at a fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "B06", query: "Energy companies with positive earnings, revenue climbing past 8%, debt kept in check, and valuations that aren't expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B07", query: "Consumer stocks making a profit, sales growth north of 12%, little leverage, and a sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "B08", query: "Biotech firms in the black, revenue rising more than 13%, modest debt, and shares that are reasonably valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 13), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B09", query: "REITs earning money, top-line growth above 6%, low leverage, and a valuation that looks fair.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Real Estate")] },
  { id: "B10", query: "Materials businesses with positive earnings, sales expanding over 8%, minimal debt, and a price that looks reasonable.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Materials")] },
  { id: "B11", query: "Tech stocks with revenue growth above 19%, making money, not carrying much debt, and not looking overpriced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 19), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B12", query: "Healthcare names with sales up more than 10%, profitable operations, leverage on the low side, and a fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B13", query: "SaaS companies earning money, revenue advancing over 21%, debt under control, and priced reasonably.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 21), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B14", query: "Industrial firms in the black with top-line growth above 9%, lightly leveraged, and not too pricey.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "B15", query: "Retail companies with positive earnings, revenue growing more than 8%, modest debt, and a sensible price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "B16", query: "Utilities making money, sales increasing above 5%, conservative leverage, and fair value.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 5), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Utilities")] },
  { id: "B17", query: "Lenders earning a profit, revenue growing north of 6%, little debt, and shares that don't look expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "B18", query: "Oil and gas businesses with positive earnings, sales up over 7%, low leverage, and a reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B19", query: "Semiconductor companies in the black, revenue increasing more than 18%, debt kept low, and fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B20", query: "Drug makers producing positive earnings, top-line growth above 10%, modest leverage, and sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B21", query: "Technology businesses that stay profitable, grow revenue more than 15%, avoid heavy debt, and aren't richly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B22", query: "Healthcare stocks that make money, expand sales above 12%, keep borrowings light, and trade at a restrained valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B23", query: "Software firms with positive earnings, revenue growth north of 17%, a clean balance sheet with low debt, and a fair price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 17), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B24", query: "Banks that are profitable, increasing revenue more than 5%, not overly leveraged, and trading at a sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 5), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "B25", query: "Industrial companies earning money, sales growing above 10%, carrying little debt, and not looking expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "B26", query: "Energy names with positive earnings, revenue advancing past 9%, a modest debt burden, and a fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B27", query: "Consumer companies in the black, top line growing more than 11%, leverage kept low, and reasonably priced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "B28", query: "Biotech stocks making money, sales rising above 14%, little debt on the balance sheet, and a valuation that isn't excessive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 14), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B29", query: "Chipmakers that are profitable, revenue climbing more than 20%, modest leverage, and shares that look fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B30", query: "Communication-services firms with positive earnings, sales growth above 8%, low debt, and a sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Communications")] },
  { id: "B31", query: "I want profitable tech names where revenue is up more than 13%, debt is on the low side, and the valuation is still reasonable.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 13), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B32", query: "Find healthcare companies with revenue improving above 11%, positive earnings, not much leverage, and a fair price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B33", query: "Show software businesses that make money, have sales growth over 18%, keep debt modest, and aren't overpriced.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B34", query: "Look for banks with top-line growth above 6%, positive earnings, conservative debt levels, and reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "B35", query: "Give me industrial companies with revenue climbing past 12%, profitable operations, light leverage, and sensible pricing.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "B36", query: "Screen energy stocks for positive earnings, sales growth above 10%, low debt, and fair value.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B37", query: "Find consumer names making money with revenue growth north of 9%, modest leverage, and a price that isn't stretched.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "B38", query: "Show biotech companies in the black, growing sales above 15%, with little debt and a reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B39", query: "I want semiconductor firms with positive earnings, top-line growth over 22%, leverage kept low, and a fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 22), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B40", query: "Screen REITs that make money, grow revenue above 7%, carry modest debt, and trade at a sensible price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Real Estate")] },
  { id: "B41", query: "Profitable technology stocks; revenue growth above 16%; low debt; reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 16), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B42", query: "Healthcare: positive earnings, sales growth over 13%, modest leverage, fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 13), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B43", query: "Software companies — making money, revenue up more than 19%, debt under control, not expensive.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 19), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B44", query: "Banks: in the black, top line above 8% growth, low leverage, sensibly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 8), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Financials")] },
  { id: "B45", query: "Industrials with positive earnings; sales growth north of 10%; little debt; fair price.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Industrials")] },
  { id: "B46", query: "Energy businesses earning money, revenue growing above 6%, minimal debt, reasonable valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 6), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B47", query: "Consumer stocks profitable, sales advancing over 12%, low leverage, fairly valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Consumer")] },
  { id: "B48", query: "Pharma companies in the black, revenue growth above 9%, debt kept modest, and priced reasonably.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 9), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B49", query: "SaaS names with positive earnings, top-line growth over 20%, little debt, and sensible valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "B50", query: "Basic materials companies making money, sales increasing above 7%, low leverage, and a fair valuation.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 7), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Materials")] },
];

const key = (x: Pick<Filter, "field" | "op" | "value"> | Expected) => `${x.field}|${x.op}|${String(x.value).toLowerCase()}`;

async function run() {
  console.log(`=== CRITERION LEDGER BLIND 50 V1 === corpus=${CORPUS_SHA256}`);
  const results: any[] = [];
  for (let index = 0; index < cases.length; index++) {
    const c = cases[index];
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 12000));
    try {
      const result = await parseWithCriterionLedgerHardened(c.query);
      const actual = new Set(result.filters.map(key));
      const expected = new Set(c.expected.map(key));
      const missing = c.expected.filter((x) => !actual.has(key(x))).map(key);
      const extra = result.filters.filter((x) => !expected.has(key(x))).map(key);
      const matched = c.expected.length - missing.length;
      const status = missing.length === 0 && extra.length === 0 ? "PASS" : matched > 0 ? "PARTIAL" : "FAIL";
      const visibleNonpass = status !== "PASS" && (["needs_user_input", "unverified"].includes(result.audit.status) || result.ledger.some((item) => item.status === "unsupported" || item.status === "unresolved"));
      const wrongThreshold = result.filters.some((a) => a.field === "revGrowth" && !c.expected.some((e) => e.field === a.field && e.op === a.op && String(e.value) === String(a.value)));
      const row = { id: c.id, status, query: c.query, actual: [...actual], missing, extra, visibleNonpass, wrongThreshold, audit: result.audit, assumptions: result.assumptions, diagnostics: result.diagnostics };
      results.push(row);
      console.log("BLIND50_RESULT=" + JSON.stringify(row));
    } catch (error) {
      const row = { id: c.id, status: "INFRA_ERROR", query: c.query, error: String(error) };
      results.push(row);
      console.log("BLIND50_RESULT=" + JSON.stringify(row));
    }
  }
  const pass = results.filter((r) => r.status === "PASS").length;
  const partial = results.filter((r) => r.status === "PARTIAL").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const infra = results.filter((r) => r.status === "INFRA_ERROR").length;
  const silent = results.filter((r) => ["PARTIAL", "FAIL"].includes(r.status) && !r.visibleNonpass).length;
  const wrongThresholds = results.filter((r) => r.wrongThreshold).length;
  const unsafeExtras = results.filter((r) => Array.isArray(r.extra) && r.extra.length > 0).length;
  const normalPath = results.filter((r) => r.diagnostics?.path === "normal").length;
  const fallbackPath = results.filter((r) => r.diagnostics?.path === "fallback").length;
  const modelCalls = results.reduce((sum, r) => sum + (r.diagnostics?.llmCalls ?? 0), 0);
  const exactRate = pass / cases.length;
  console.log(`BLIND50_SUMMARY PASS=${pass}/50 PARTIAL=${partial}/50 FAIL=${fail}/50 INFRA=${infra}/50 EXACT_RATE=${(exactRate * 100).toFixed(1)}% SILENT_NONPASS=${silent} WRONG_THRESHOLDS=${wrongThresholds} UNSAFE_EXTRAS=${unsafeExtras}`);
  console.log(`BLIND50_MODEL_CALLS NORMAL_PATH=${normalPath}/50 FALLBACK_PATH=${fallbackPath}/50 TOTAL_CALLS=${modelCalls} AVG_CALLS=${(modelCalls / Math.max(1, pass + partial + fail)).toFixed(2)} MAX_ALLOWED=2`);
  if (infra > 0) process.exitCode = 2;
}

run().catch((error) => { console.error("BLIND50_FATAL", error); process.exit(1); });
