interface IntentCoverageSpec {
  query: RegExp;
  coveredBy: string[];
  assumptionMentions: RegExp;
  message: string;
}

const INTENT_COVERAGE: IntentCoverageSpec[] = [
  {
    query: /\bprofitable\b|\bpositive earnings\b(?!\s+growth)|\bpositive net income\b/i,
    coveredBy: ["operatingMargin", "fcfMargin"],
    assumptionMentions: /profitable|profitability|positive earnings|positive net income/i,
    message: "'Profitable' is not mapped to a standalone profitability filter yet, so that criterion was left out.",
  },
  {
    query: /\blow debt\b|\blittle debt\b|\bminimal debt\b|\blow leverage\b|\blightly leveraged\b/i,
    coveredBy: ["debtEquity"],
    assumptionMentions: /low debt|little debt|minimal debt|low leverage|lightly leveraged|debt\s*\/?\s*equity/i,
    message: "'Low debt/leverage' needs a debt/equity threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\breasonable valuation\b|\breasonably valued\b|\bfair valuation\b|\bfairly valued\b|\bsensible valuation\b|\bnot expensive\b|\bnot[- ]crazy valuation(?:s)?\b/i,
    coveredBy: ["pe", "pb", "ps", "evEbitda", "peg3Y"],
    assumptionMentions: /reasonable valuation|reasonably valued|fair valuation|fairly valued|sensible valuation|not expensive|not.?crazy valuation|valuation metric/i,
    message: "The valuation description needs a specific valuation metric or threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\bstrong balance sheet\b|\bhealthy balance sheet\b/i,
    coveredBy: ["debtEquity", "interestCoverage", "currentRatio"],
    assumptionMentions: /strong balance sheet|healthy balance sheet/i,
    message: "'Strong balance sheet' is broader than Parse's supported balance-sheet filters, so it was left out unless a specific threshold was supplied.",
  },
  {
    query: /\bcash[- ]rich\b|\blots of cash\b|\bhigh cash balance\b/i,
    coveredBy: [],
    assumptionMentions: /cash-rich|cash rich|lots of cash|cash balance/i,
    message: "Cash-balance screening is not supported yet, so that criterion was left out.",
  },
  {
    query: /\b(?:high|strong|excellent|healthy)\s+roic\b/i,
    coveredBy: ["roic"],
    assumptionMentions: /high roic|strong roic|excellent roic|healthy roic|roic threshold/i,
    message: "'High ROIC' needs an explicit ROIC threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\b(?:strong|high|healthy)\s+(?:profit\s+)?margins?\b/i,
    coveredBy: ["operatingMargin", "fcfMargin", "grossMargin"],
    assumptionMentions: /strong margins|high margins|healthy margins|margin threshold/i,
    message: "'Strong margins' needs a specific margin metric and threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\blow beta\b/i,
    coveredBy: ["beta"],
    assumptionMentions: /low beta|beta threshold/i,
    message: "'Low beta' needs an explicit beta threshold; Parse left that criterion out rather than guess.",
  },
  {
    query: /\b(?:quality|high[- ]quality)\s+(?:stocks?|companies|names)\b/i,
    coveredBy: [],
    assumptionMentions: /quality metric|quality screen|standalone quality/i,
    message: "'Quality' is an investment style rather than one supported metric; Parse left it qualitative instead of inventing thresholds.",
  },
  {
    query: /\b(?:eps|earnings)\s+growth\b|\bpositive earnings growth\b/i,
    coveredBy: ["epsGrowth3Y"],
    assumptionMentions: /earnings growth|eps growth|growth horizon/i,
    message: "EPS/earnings growth needs a supported time horizon; Parse currently supports 3-year EPS growth, so this unqualified criterion was left out.",
  },
  {
    query: /\bgross margin\b/i,
    coveredBy: ["grossMargin"],
    assumptionMentions: /gross margin/i,
    message: "Gross-margin screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\broe\b|\breturn on equity\b/i,
    coveredBy: ["roe"],
    assumptionMentions: /\broe\b|return on equity/i,
    message: "ROE screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\bpayout ratio\b/i,
    coveredBy: ["payoutRatio"],
    assumptionMentions: /payout ratio/i,
    message: "Payout-ratio screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\b(?:5[- ]?year|5y)\s+dividend\s+(?:growth|cagr)\b|\bdividend growers?\b/i,
    coveredBy: ["divGrowth5Y"],
    assumptionMentions: /dividend growth|dividend cagr|dividend grow/i,
    message: "Dividend-growth screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\bdividend growth streak\b|\b\d+\+?[- ]?year dividend growth streak\b/i,
    coveredBy: [],
    assumptionMentions: /dividend growth streak/i,
    message: "Dividend-growth streak length is not supported yet, so that criterion was left out.",
  },
  {
    query: /\bpeg\b|\bprice.?earnings.?to.?growth\b/i,
    coveredBy: ["peg3Y"],
    assumptionMentions: /\bpeg\b|price.?earnings.?to.?growth/i,
    message: "PEG screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\bcurrent ratio\b/i,
    coveredBy: ["currentRatio"],
    assumptionMentions: /current ratio/i,
    message: "Current-ratio screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\bquick ratio\b/i,
    coveredBy: [],
    assumptionMentions: /quick ratio/i,
    message: "Quick-ratio screening is not supported yet, so that criterion was left out.",
  },
  {
    query: /\bprice[- ]to[- ]tangible[- ]book\b|\btangible book\b/i,
    coveredBy: [],
    assumptionMentions: /tangible book/i,
    message: "Tangible-book valuation is not supported yet, so that criterion was left out rather than substituted with P/B.",
  },
  {
    query: /\bnet debt\s*(?:to|\/)\s*ebitda\b/i,
    coveredBy: ["netDebtEbitda"],
    assumptionMentions: /net debt.*ebitda/i,
    message: "Net-debt/EBITDA screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\b(?:free cash flow|fcf) growth\b/i,
    coveredBy: [],
    assumptionMentions: /free cash flow growth|fcf growth/i,
    message: "Free-cash-flow growth screening is not supported yet, so that criterion was left out.",
  },
  {
    query: /\bbuying back shares\b|\bshare buybacks?\b|\bbuyback (?:yield|trend)\b/i,
    coveredBy: ["buybackTrend"],
    assumptionMentions: /buyback|buying back shares/i,
    message: "Share-buyback trend screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\binsider ownership\b/i,
    coveredBy: ["insiderOwnership"],
    assumptionMentions: /insider ownership/i,
    message: "Insider-ownership screening is not supported by the current dataset yet, so that criterion was left out.",
  },
  {
    query: /\bfree cash flow covers? (?:the )?dividend\b|\bdividend coverage\b/i,
    coveredBy: [],
    assumptionMentions: /dividend coverage|covers? the dividend/i,
    message: "Dividend-coverage screening is not supported yet, so that criterion was left out.",
  },
  {
    query: /\bforward\s+(?:p\/?e|price[- ]?to[- ]?earnings)\b/i,
    coveredBy: ["forwardPe"],
    assumptionMentions: /forward p\/?e|forward.*earnings/i,
    message: "Forward P/E is not supported by the current dataset yet, so that criterion was left out rather than treated as trailing P/E.",
  },
  {
    query: /\bearnings yield\b/i,
    coveredBy: ["earningsYield"],
    assumptionMentions: /earnings yield/i,
    message: "Earnings-yield screening is not supported yet, so that criterion was left out rather than treated as dividend yield.",
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
