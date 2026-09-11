import type { AnalystPriceTargets } from "./yahoo";

export function analystTargetMetrics(price: number | null, targets: AnalystPriceTargets) {
  const targetReturn = (target: number | null) =>
    price != null && price > 0 && target != null ? ((target / price) - 1) * 100 : null;
  const lowReturn = targetReturn(targets.low);
  const medianReturn = targetReturn(targets.median);
  const highReturn = targetReturn(targets.high);
  const spread = targets.low != null && targets.high != null && targets.median != null && targets.median > 0
    ? ((targets.high - targets.low) / targets.median) * 100
    : null;
  const downside = lowReturn != null && lowReturn < 0 ? Math.abs(lowReturn) : null;
  const rewardRisk = medianReturn != null && medianReturn > 0 && downside != null && downside > 0
    ? medianReturn / downside
    : null;

  return {
    analyst_count: targets.analystCount,
    low_target_return_pct: round(lowReturn),
    median_target_return_pct: round(medianReturn),
    high_target_return_pct: round(highReturn),
    target_spread_pct: round(spread),
    target_risk_reward: round(rewardRisk, 2),
  };
}

function round(value: number | null, digits = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
