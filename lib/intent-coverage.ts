interface IntentCoverageSpec {
  query: RegExp;
  coveredBy: string[];
  assumptionMentions: RegExp;
  message: string;
}

const INTENT_COVERAGE: IntentCoverageSpec[] = [
  { query: /\bprofitable\b|\bpositive earnings\b(?!\s+growth)|\bpositive net income\b/i, coveredBy: ["operatingMargin", "fcfMargin", "grossMargin"], assumptionMentions: /profitable|profitability|positive earnings|positive net income/i, message: "'Profitable' needs a specific profitability metric or threshold; Parse left that criterion out rather than guess." },
  { query: /\blow debt\b|\blittle debt\b|\bminimal debt\b|\blow leverage\b|\blightly leveraged\b/i, coveredBy: ["debtEquity"], assumptionMentions: /low debt|little debt|minimal debt|low leverage|lightly leveraged|debt\s*\/?\s*equity/i, message: "'Low debt/leverage' needs a debt/equity threshold; Parse left that criterion out rather than guess." },
  { query: /\breasonable valuation\b|\breasonably valued\b|\bfair valuation\b|\bfairly valued\b|\bsensible valuation\b|\bnot expensive\b|\bnot[- ]crazy valuation(?:s)?\b/i, coveredBy: ["pe", "forwardPe", "pb", "ps", "evEbitda", "peg", "forwardPeg", "earningsYield"], assumptionMentions: /reasonable valuation|reasonably valued|fair valuation|fairly valued|sensible valuation|not expensive|not.?crazy valuation|valuation metric/i, message: "'Reasonable valuation' needs a specific valuation metric or threshold; Parse left that criterion out rather than guess." },
  { query: /\bstrong balance sheet\b|\bhealthy balance sheet\b/i, coveredBy: ["debtEquity", "interestCoverage", "currentRatio", "quickRatio"], assumptionMentions: /strong balance sheet|healthy balance sheet/i, message: "'Strong balance sheet' is broader than Parse's supported balance-sheet filters, so it was left out unless a specific threshold was supplied." },
  { query: /\bcash[- ]rich\b|\blots of cash\b|\bhigh cash balance\b/i, coveredBy: [], assumptionMentions: /cash-rich|cash rich|lots of cash|cash balance/i, message: "Cash-balance screening is not supported yet, so that criterion was left out." },
  { query: /\b(?:high|strong|excellent|healthy)\s+roic\b/i, coveredBy: ["roic"], assumptionMentions: /high roic|strong roic|excellent roic|healthy roic|roic threshold/i, message: "'High ROIC' needs an explicit ROIC threshold; Parse left that criterion out rather than guess." },
  { query: /\b(?:strong|high|healthy)\s+(?:profit\s+)?margins?\b/i, coveredBy: ["operatingMargin", "fcfMargin", "grossMargin"], assumptionMentions: /strong margins|high margins|healthy margins|margin threshold/i, message: "'Strong margins' needs a specific margin metric and threshold; Parse left that criterion out rather than guess." },
  { query: /\blow beta\b/i, coveredBy: ["beta"], assumptionMentions: /low beta|beta threshold/i, message: "'Low beta' needs an explicit beta threshold; Parse left that criterion out rather than guess." },
  { query: /\b(?:quality|high[- ]quality)\s+(?:stocks?|companies|names)\b/i, coveredBy: [], assumptionMentions: /quality metric|quality screen|standalone quality/i, message: "'Quality' is an investment style rather than one supported metric; Parse left it qualitative instead of inventing thresholds." },
  { query: /\b(?:growth|fast[- ]growing)\s+(?:stocks?|companies|names)\b/i, coveredBy: ["revGrowth", "revGrowth3Y", "epsGrowth3Y"], assumptionMentions: /growth style|growth metric|growth threshold/i, message: "'Growth' is an investment style unless a metric or threshold is specified; Parse left it qualitative instead of inventing a revenue-growth cutoff." },
  { query: /\b(?:eps|earnings)\s+growth\b|\bpositive earnings growth\b/i, coveredBy: ["epsGrowth3Y"], assumptionMentions: /earnings growth|eps growth|growth horizon/i, message: "EPS/earnings growth needs a time horizon; Parse supports 3-year EPS growth, so this unqualified criterion was left out." },
  { query: /\bdividend growers?\b/i, coveredBy: [], assumptionMentions: /dividend grow/i, message: "'Dividend grower' needs a growth horizon and threshold; Parse supports 5-year dividend growth when those are specified, so no threshold was guessed." },
  { query: /\bdividend growth streak\b|\b\d+\+?[- ]?year dividend growth streak\b/i, coveredBy: [], assumptionMentions: /dividend growth streak/i, message: "Dividend growth streak length is not supported yet, so that criterion was left out." },
  { query: /\bprice[- ]to[- ]tangible[- ]book\b|\btangible book\b/i, coveredBy: [], assumptionMentions: /tangible book/i, message: "Tangible book valuation is not supported yet, so that criterion was left out rather than substituted with P/B." },
  { query: /\bnet debt\s*(?:to|\/)\s*ebitda\b/i, coveredBy: [], assumptionMentions: /net debt.*ebitda/i, message: "Net-debt/EBITDA is not available in Parse's current data feed, so that criterion was left out rather than substituted with total debt or EV/EBITDA." },
  { query: /\b(?:free cash flow|fcf) growth\b/i, coveredBy: [], assumptionMentions: /free cash flow growth|fcf growth/i, message: "Free cash flow growth screening is not supported yet, so that criterion was left out." },
  { query: /\bbuying back shares\b|\bshare buybacks?\b|\bbuyback (?:yield|trend)\b/i, coveredBy: [], assumptionMentions: /buyback|buying back shares/i, message: "Historical share-count data is not available in Parse's current feed, so buyback trend screening was left out rather than inferred from current shares." },
  { query: /\binsider ownership\b/i, coveredBy: [], assumptionMentions: /insider ownership/i, message: "Insider ownership data is not available in Parse's current feed, so that criterion was left out." },
  { query: /\bfree cash flow covers? (?:the )?dividend\b|\bdividend coverage\b/i, coveredBy: [], assumptionMentions: /dividend coverage|covers? the dividend/i, message: "Dividend coverage screening is not supported yet, so that criterion was left out." },
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
