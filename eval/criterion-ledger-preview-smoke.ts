import { parseWithCriterionLedgerHardened } from "../lib/criterion-ledger-hardened";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type Case = { id: string; query: string; expected: Expected[] };
const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });

const cases: Case[] = [
  {
    id: "MF",
    query: "profitable tech companies growing revenue over 20% with low debt and a reasonable valuation",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
  {
    id: "N01",
    query: "Tech businesses turning a profit, sales climbing more than 17%, debt kept low, valuation looks fair.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 17), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
  {
    id: "N40",
    query: "Profitable semiconductor companies with revenue growth from 15% to 25%, low debt and fair valuation.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 15), f("revGrowth", "<=", 25), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (x: Pick<Filter, "field" | "op" | "value"> | Expected) => `${x.field}|${x.op}|${String(x.value).toLowerCase()}`;

async function run() {
  console.log("=== CRITERION LEDGER HARDENED LIVE PREVIEW SMOKE ===");
  const results: any[] = [];
  for (let i = 0; i < cases.length; i++) {
    if (i > 0) await delay(65000);
    const c = cases[i];
    const result = await parseWithCriterionLedgerHardened(c.query);
    const actual = new Set(result.filters.map(key));
    const expected = new Set(c.expected.map(key));
    const missing = c.expected.filter((x) => !actual.has(key(x))).map(key);
    const extra = result.filters.filter((x) => !expected.has(key(x))).map(key);
    const matched = c.expected.length - missing.length;
    const status = missing.length === 0 && extra.length === 0 ? "PASS" : matched > 0 ? "PARTIAL" : "FAIL";
    const visibleNonpass = status !== "PASS" && (
      ["needs_user_input", "unverified"].includes(result.audit.status)
      || result.ledger.some((item) => item.status === "unsupported" || item.status === "unresolved")
    );
    const row = { id: c.id, status, query: c.query, actual: [...actual], missing, extra, visibleNonpass, audit: result.audit, assumptions: result.assumptions, ledger: result.ledger.map((item) => ({ phrase: item.phrase, concept: item.concept, basis: item.basis, status: item.status, filters: item.filters.map(({ field, op, value }) => ({ field, op, value })), reason: item.reason })), diagnostics: result.diagnostics };
    results.push(row);
    console.log("CRITERION_LEDGER_HARDENED_RESULT=" + JSON.stringify(row));
  }
  const pass = results.filter((r) => r.status === "PASS").length;
  const partial = results.filter((r) => r.status === "PARTIAL").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const silent = results.filter((r) => r.status !== "PASS" && !r.visibleNonpass).length;
  console.log(`CRITERION_LEDGER_HARDENED_SUMMARY PASS=${pass}/${results.length} PARTIAL=${partial}/${results.length} FAIL=${fail}/${results.length} SILENT_NONPASS=${silent}`);
}

run().catch((error) => { console.error("CRITERION_LEDGER_HARDENED_EVAL_ERROR", error); process.exit(1); });
