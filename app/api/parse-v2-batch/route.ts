import { parseWithCriterionLedger } from "../../../lib/criterion-ledger";
import type { FilterValue, Op } from "../../../lib/fields";

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
    id: "N02",
    query: "Healthcare firms making money with top-line growth above 11%, not much debt, and a sensible price.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 11), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")],
  },
  {
    id: "N03",
    query: "Software stocks that are profitable, revenue rising at least 16%, leverage on the low side, and not overpriced.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 16), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
  {
    id: "N40",
    query: "Profitable semiconductor companies with revenue growth from 15% to 25%, low debt and fair valuation.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 15), f("revGrowth", "<=", 25), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
  {
    id: "N41",
    query: "Profitable software-as-a-service companies growing revenue over 20%, low debt and reasonable valuation.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 20), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
  {
    id: "N42",
    query: "Chipmakers making money, sales growth above 18%, low leverage and fair valuation.",
    expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 18), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")],
  },
];

function key(x: { field: string; op: string; value: FilterValue }): string {
  return `${x.field}|${x.op}|${String(x.value).toLowerCase()}`;
}

async function evaluate(c: Case) {
  const result = await parseWithCriterionLedger(c.query);
  const actual = new Set(result.filters.map(key));
  const expected = new Set(c.expected.map(key));
  const missing = c.expected.filter((x) => !actual.has(key(x))).map(key);
  const extra = result.filters.filter((x) => !expected.has(key(x))).map(key);
  const status = missing.length === 0 && extra.length === 0 ? "PASS" : c.expected.length - missing.length > 0 ? "PARTIAL" : "FAIL";
  return {
    id: c.id,
    query: c.query,
    status,
    expected: [...expected],
    actual: [...actual],
    missing,
    extra,
    audit: result.audit,
    assumptions: result.assumptions,
    ledger: result.ledger.map((item) => ({
      phrase: item.phrase,
      concept: item.concept,
      basis: item.basis,
      status: item.status,
      filters: item.filters.map(({ field, op, value }) => ({ field, op, value })),
      reason: item.reason,
    })),
    diagnostics: result.diagnostics,
  };
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const results = [];
  for (const c of cases) results.push(await evaluate(c));
  const pass = results.filter((x) => x.status === "PASS").length;
  const partial = results.filter((x) => x.status === "PARTIAL").length;
  const fail = results.filter((x) => x.status === "FAIL").length;
  const userAlerts = results.filter((x) => x.audit.status === "needs_user_input" || x.audit.status === "unverified").length;
  return Response.json({ summary: { pass, partial, fail, userAlerts, total: results.length }, results });
}
