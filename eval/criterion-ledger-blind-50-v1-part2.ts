import { parseWithCriterionLedgerHardened } from "../lib/criterion-ledger-hardened";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = { id: string; query: string; expected: Expected[] };
const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });
const CORPUS_SHA256 = "69128ba78260ec6e8523313b9235cff4a34b6f61991e843f3466be0fdcedbe33";

const cases: Case[] = [
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
  console.log(`=== CRITERION LEDGER BLIND 50 V1 PART2 B30-B50 === corpus=${CORPUS_SHA256}`);
  const results: any[] = [];
  for (const c of cases) {
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
      console.log("BLIND50_PART2_RESULT=" + JSON.stringify(row));
    } catch (error) {
      const row = { id: c.id, status: "INFRA_ERROR", query: c.query, error: String(error) };
      results.push(row);
      console.log("BLIND50_PART2_RESULT=" + JSON.stringify(row));
    }
  }
  const pass = results.filter((r) => r.status === "PASS").length;
  const partial = results.filter((r) => r.status === "PARTIAL").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const infra = results.filter((r) => r.status === "INFRA_ERROR").length;
  const silent = results.filter((r) => ["PARTIAL", "FAIL"].includes(r.status) && !r.visibleNonpass).length;
  const wrongThresholds = results.filter((r) => r.wrongThreshold).length;
  const unsafeExtras = results.filter((r) => Array.isArray(r.extra) && r.extra.length > 0).length;
  console.log(`BLIND50_PART2_SUMMARY PASS=${pass}/21 PARTIAL=${partial}/21 FAIL=${fail}/21 INFRA=${infra}/21 SILENT_NONPASS=${silent} WRONG_THRESHOLDS=${wrongThresholds} UNSAFE_EXTRAS=${unsafeExtras}`);
}

run().catch((error) => { console.error("BLIND50_PART2_FATAL", error); process.exit(1); });
