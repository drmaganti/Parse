interface IntentCoverageSpec {
  query: RegExp;
  coveredBy: string[];
  assumptionMentions: RegExp;
  message: string;
}

const INTENT_COVERAGE: IntentCoverageSpec[] = [
  {
    query: /\bprofitable\b|\bpositive earnings\b|\bpositive net income\b/i,
    coveredBy: ["operatingMargin", "fcfMargin"],
    assumptionMentions: /profitable|profitability|positive earnings|positive net income/i,
    message: "'Profitable' is not mapped to a standalone profitability filter yet, so that criterion was left out.",
  },
  {
    query: /\blow debt\b|\blittle debt\b|\bminimal debt\b|\blow leverage\b|\blightly leveraged\b/i,
    coveredBy: ["debtEquity"],
    assumptionMentions: /low debt|little debt|minimal debt|low leverage|lightly leveraged|debt\s*\/?\s*equity/i,
    message: "'Low debt' needs a debt/equity threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\breasonable valuation\b|\breasonably valued\b|\bfair valuation\b|\bfairly valued\b|\bsensible valuation\b|\bnot expensive\b/i,
    coveredBy: ["pe", "pb", "ps", "evEbitda"],
    assumptionMentions: /reasonable valuation|reasonably valued|fair valuation|fairly valued|sensible valuation|not expensive|valuation metric/i,
    message: "'Reasonable valuation' needs a valuation metric or threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\bstrong balance sheet\b|\bhealthy balance sheet\b/i,
    coveredBy: ["debtEquity", "interestCoverage"],
    assumptionMentions: /strong balance sheet|healthy balance sheet/i,
    message: "'Strong balance sheet' is broader than Parse's supported balance-sheet filters, so it was left out unless a debt or coverage threshold was specified.",
  },
  {
    query: /\bcash[- ]rich\b|\blots of cash\b|\bhigh cash balance\b/i,
    coveredBy: [],
    assumptionMentions: /cash-rich|cash rich|lots of cash|cash balance/i,
    message: "Cash-balance screening is not supported yet, so that criterion was left out.",
  },
];

export function ensureIntentCoverage(query: string, coveredFields: string[], assumptions: string[]): string[] {
  const next = assumptions.filter((a) => typeof a === "string");
  const fields = new Set(coveredFields);

  for (const spec of INTENT_COVERAGE) {
    if (!spec.query.test(query)) continue;
    if (spec.coveredBy.some((field) => fields.has(field))) continue;
    if (next.some((assumption) => spec.assumptionMentions.test(assumption))) continue;
    next.push(spec.message);
  }

  return next;
}
