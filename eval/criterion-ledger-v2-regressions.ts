import { strict as assert } from "node:assert";
import { parseWithCriterionLedgerV2 } from "../lib/criterion-ledger-v2";

const json = (value: unknown) => Promise.resolve(JSON.stringify(value));
const key = (filter: { field: string; op: string; value: unknown }) => `${filter.field}|${filter.op}|${String(filter.value)}`;

async function normalPath() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Lenders earning a profit, revenue growing north of 6%, little debt, and shares that don't look expensive.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "earning a profit", concept: "profitable", basis: "parse_default", filters: [] },
          { phrase: "revenue growing north of 6%", concept: "revenue_growth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 6 }] },
          { phrase: "little debt", concept: "low_debt", basis: "parse_default", filters: [] },
          { phrase: "don't look expensive", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.diagnostics.path, "normal");
  assert.equal(result.diagnostics.llmCalls, 1);
  assert.equal(result.diagnostics.maxLlmCalls, 2);
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "operatingMargin|>|0", "revGrowth|>|6", "debtEquity|<|1", "pe|<|25", "sector|==|Financials",
  ]));
}

async function boundedFallback() {
  let calls = 0;
  const query = "Tech businesses turning a profit, sales climbing more than 17%, debt kept low, valuation looks fair.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "turning a profit", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "debt kept low", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "valuation looks fair", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "sales climbing more than 17%", type: "missing", reason: "Revenue growth was omitted." }],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "sales climbing more than 17%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 17 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.equal(result.diagnostics.path, "fallback");
  assert.equal(result.diagnostics.llmCalls, 2);
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|17"));
  assert.equal(result.audit.recoveryAttempted, true);
}

async function run() {
  await normalPath();
  await boundedFallback();
  console.log("criterion-ledger-v2 regressions: PASS");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
