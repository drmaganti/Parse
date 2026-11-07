import assert from "node:assert/strict";
import { parseWithCriterionLedgerV2 } from "../lib/criterion-ledger-v2";

const f = (field: string, op: string, value: number | string) => ({ field, op, value });
const criterion = (phrase: string, concept: string, filters: unknown[], basis = "explicit") => ({ phrase, concept, basis, filters });
const key = (v: { field: string; op: string; value: unknown }) => `${v.field}|${v.op}|${v.value}`;
const cases = [
  { name: "affirmative sorting survives another negated sort", query: "Do not sort by dividend yield; sort by ROIC", criteria: [], expected: [], ranking: "roic", expectedRanking: "roic" },
  { name: "explicit ROIC sorting is retained", query: "ROIC above 15%, sort by ROIC", criteria: [criterion("ROIC above 15%", "roic", [f("roic", ">", 15)])], expected: [f("roic", ">", 15)], ranking: "roic", expectedRanking: "roic" },
  { name: "ordinary dividend sorting is retained", query: "Sort by dividend yield", criteria: [], expected: [], ranking: "dividend", expectedRanking: "dividend" },
  { name: "an implicit sort is not invented", query: "ROIC above 15%", criteria: [criterion("ROIC above 15%", "roic", [f("roic", ">", 15)])], expected: [f("roic", ">", 15)], ranking: "roic", expectedRanking: "marketCap" },
  { name: "negated sorting is not applied", query: "Do not sort by dividend yield", criteria: [], expected: [], ranking: "dividend", expectedRanking: "marketCap" },
  { name: "shared trailing market-cap unit", query: "Market cap between $25 and $75 billion", criteria: [criterion("Market cap between $25 and $75 billion", "marketCap", [f("marketCap", ">=", 25), f("marketCap", "<=", 75)])], expected: [f("marketCap", ">=", 25), f("marketCap", "<=", 75)] },
  { name: "downward weekly change preserves sign and relation", query: "Stocks down over 4% this week", criteria: [criterion("down over 4% this week", "chg1w", [f("chg1w", ">", 4)])], expected: [f("chg1w", "<", -4)] },
  { name: "dividend yield retains adjacent dividend scope", query: "Dividend stocks yielding over 4%", criteria: [criterion("yielding over 4%", "divYield", [f("divYield", ">", 4)])], expected: [f("divYield", ">", 4)] },
  { name: "outside is a sector exclusion", query: "Tech outside Energy", criteria: [criterion("Tech", "sector", [f("sector", "==", "Technology")], "semantic"), criterion("outside Energy", "sector", [f("sector", "!=", "Energy")], "semantic")], expected: [f("sector", "==", "Technology"), f("sector", "!=", "Energy")] },
  { name: "sector exclusion extends through a list", query: "Financials except Energy and Utilities", criteria: [criterion("Financials", "sector", [f("sector", "==", "Financials")], "semantic"), criterion("except Energy", "sector", [f("sector", "!=", "Energy")], "semantic"), criterion("Utilities", "sector", [f("sector", "!=", "Utilities")], "semantic")], expected: [f("sector", "==", "Financials"), f("sector", "!=", "Energy"), f("sector", "!=", "Utilities")] },
  { name: "explicit valuation overrides a stricter default", query: "Cheap stocks with P/E under 35", criteria: [criterion("Cheap", "reasonable_valuation", [], "parse_default"), criterion("P/E under 35", "pe", [f("pe", "<", 35)])], expected: [f("pe", "<", 35)] },
  { name: "positive revenue growth means strictly above zero", query: "Positive revenue growth", criteria: [criterion("Positive revenue growth", "revGrowth", [f("revGrowth", ">", 0)], "semantic")], expected: [f("revGrowth", ">", 0)] },
  { name: "generic quality cannot invent a high-ROIC default", query: "Quality companies", criteria: [criterion("Quality companies", "high_roic", [], "parse_default")], expected: [], warning: true },
  { name: "an unrelated yield remains unresolved", query: "Rental income yielding over 4%", criteria: [criterion("yielding over 4%", "divYield", [f("divYield", ">", 4)])], expected: [], warning: true },
  { name: "a named earnings yield cannot become dividend yield", query: "Earnings yield over 4%", criteria: [criterion("Earnings yield over 4%", "divYield", [f("divYield", ">", 4)])], expected: [], warning: true },
  { name: "shared units do not permit an invented endpoint", query: "Market cap between $25 and $75 billion", criteria: [criterion("Market cap between $25 and $75 billion", "marketCap", [f("marketCap", ">=", 25), f("marketCap", "<=", 25)])], expected: [], warning: true },
];

async function main() {
  let failed = 0;
  for (const c of cases) {
    try {
      const result = await parseWithCriterionLedgerV2(c.query, async () => JSON.stringify({ criteria: c.criteria, coverage_issues: [], ranking: "ranking" in c ? c.ranking : null }));
      assert.deepEqual(new Set(result.filters.map(key)), new Set(c.expected.map(key)));
      if ("expectedRanking" in c) assert.equal(result.ranking, c.expectedRanking);
      if (c.warning) assert(result.assumptions.length > 0, "unresolved criteria must remain visible");
      assert(result.diagnostics.llmCalls <= 2, "recovery stays bounded");
      console.log(`PASS ${c.name}`);
    } catch (error) { failed++; console.error(`FAIL ${c.name}: ${error instanceof Error ? error.message : error}`); }
  }
  console.log(`weekly trust regressions: ${cases.length - failed}/${cases.length}`);
  if (failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
