import assert from "node:assert/strict";
import { fallbackParse } from "../lib/fallback-parse-span";
import { analystTargetMetrics } from "../lib/analyst-targets";
import { parseWithCriterionLedgerHardened } from "../lib/criterion-ledger-hardened";
import { getPublicScreen } from "../lib/publicScreens";

function has(query: string, field: string, op: string, value: number) {
  const parsed = fallbackParse(query);
  assert(parsed.filters.some((f) => f.field === field && f.op === op && f.value === value), `${query}: ${JSON.stringify(parsed.filters)}`);
}

has("stocks with at least 20% median analyst target upside", "medianTargetReturn", ">=", 20);
has("stocks trading below the lowest analyst price target", "lowTargetReturn", ">", 0);
has("stocks with less than 10% downside to the low analyst target", "lowTargetReturn", ">=", -10);
has("stocks with analyst target spread under 20%", "targetSpread", "<", 20);
has("stocks with favorable analyst target reward/risk", "targetRiskReward", ">", 2);
has("stocks covered by at least 10 analysts", "analystCount", ">=", 10);

const metrics = analystTargetMetrics(100, { low: 90, median: 130, mean: 125, high: 150, analystCount: 12 });
assert.deepEqual(metrics, {
  analyst_count: 12,
  low_target_return_pct: -10,
  median_target_return_pct: 30,
  high_target_return_pct: 50,
  target_spread_pct: 46.2,
  target_risk_reward: 3,
});

const belowAllTargets = analystTargetMetrics(80, { low: 100, median: 120, mean: 125, high: 160, analystCount: 8 });
assert.equal(belowAllTargets.low_target_return_pct, 25);
assert.equal(belowAllTargets.median_target_return_pct, 50);
assert.equal(belowAllTargets.high_target_return_pct, 100);

async function verifyLivePath() {
  const preset = getPublicScreen("stocks-below-lowest-analyst-target");
  assert(preset, "analyst-target preset screen should be registered");
  const livePath = await parseWithCriterionLedgerHardened("Stocks trading below the lowest analyst target");
  assert(livePath.filters.some((f) => f.field === "lowTargetReturn" && f.op === ">" && f.value === 0));
  assert.equal(livePath.diagnostics.llmCalls, 0);
  const presetPath = await parseWithCriterionLedgerHardened(preset.query);
  assert(presetPath.filters.some((f) => f.field === "lowTargetReturn" && f.op === ">" && f.value === 0));
  console.log("Analyst target regressions and live criterion-ledger path passed.");
}

verifyLivePath().catch((error) => {
  console.error(error);
  process.exit(1);
});
