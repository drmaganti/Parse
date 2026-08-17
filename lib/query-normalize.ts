export interface NormalizedQuery {
  query: string;
  assumptions: string[];
}

const SECTOR_ALIASES: Array<[RegExp, string]> = [
  [/\btech(?:nology)?\b/i, "Technology"],
  [/\bfinancials?\b/i, "Financials"],
  [/\bhealth\s*care\b|\bhealthcare\b/i, "Healthcare"],
  [/\bconsumer\b/i, "Consumer"],
  [/\benergy\b/i, "Energy"],
  [/\bindustrials?\b/i, "Industrials"],
  [/\bcommunications?\b/i, "Communications"],
  [/\butilities\b/i, "Utilities"],
  [/\bmaterials?\b/i, "Materials"],
  [/\breal estate\b|\breits?\b/i, "Real Estate"],
];

const CMP = "no more than|at most|less than|lower than|under|below|maximum|max|<=|<|at least|minimum|min|more than|greater than|over|above|>=|>";
const NUM = "-?\\d+(?:\\.\\d+)?";

function pushAssumption(out: string[], message: string) {
  if (!out.includes(message)) out.push(message);
}

function normalizeMetricLocalRanges(input: string): string {
  let query = input;
  query = query.replace(
    new RegExp(`\\bbetween\\s*(${NUM})\\s*%\\s*(and|to)\\s*(${NUM})\\s*%?`, "gi"),
    (_m, a: string, joiner: string, b: string) => `between ${a} ${joiner} ${b}%`
  );

  const metric = [
    "rsi", "dividend yield", "yielding", "earnings yield", "beta", "p\\/?e", "forward p\\/?e", "p\\/?b", "p\\/?s", "peg", "forward peg",
    "revenue growth", "3[- ]?year revenue (?:growth|cagr)", "3[- ]?year (?:eps|earnings) (?:growth|cagr)",
    "5[- ]?year dividend (?:growth|cagr)", "payout ratio", "roic", "roe", "gross margin", "operating margin",
    "fcf margin", "free cash flow margin", "fcf yield", "free cash flow yield",
    "debt\\s*(?:to|/)\\s*equity", "interest coverage", "current ratio", "quick ratio", "ev\\s*(?:to|/)\\s*ebitda",
  ].join("|");
  query = query.replace(
    new RegExp(`\\b(${metric})\\s*(${NUM})\\s*%?\\s*[-–]\\s*(${NUM})\\s*%?`, "gi"),
    (_m, name: string, a: string, b: string) => `${name} between ${a} and ${b}`
  );

  return query;
}

export function normalizeScreenQuery(input: string): NormalizedQuery {
  let query = input;
  const assumptions: string[] = [];

  for (const [alias, canonical] of SECTOR_ALIASES) {
    const source = alias.source.replace(/^\\b|\\b$/g, "");
    const nounRx = new RegExp(`\\b(?:not|non[- ]?)\\s*(?:${source})\\s+(companies|stocks|names)\\b`, "ig");
    if (nounRx.test(query)) query = query.replace(nounRx, `$1 excluding ${canonical}`);

    const notRx = new RegExp(`\\b(?:not|non[- ]?)\\s*(?:${source})\\b`, "ig");
    if (notRx.test(query)) query = query.replace(notRx, `exclude ${canonical}`);
  }

  query = query.replace(/\breits?\b/gi, "Real Estate");
  query = query.replace(
    /\bfinancial(?=\s+(?:stocks|companies|names|firms|banks?|insurers?|dividend|income)\b)/gi,
    "Financials"
  );

  query = query
    .replace(/\bd\s*\/\s*e\b/gi, "debt/equity")
    .replace(/\b3(?:y|[- ]?yr|[- ]?year)\s+(?:rev(?:enue)?|sales)\s+cagr\b/gi, "3-year revenue CAGR")
    .replace(/\b3(?:y|[- ]?yr|[- ]?year)\s+sales\s+growth\b/gi, "3-year revenue growth")
    .replace(/\bsales\s+growth\b/gi, "revenue growth")
    .replace(/\bgrowing\s+sales\b/gi, "growing revenue")
    .replace(/\bop(?:er)?\.?\s+margins?\b/gi, "operating margin")
    .replace(/\b(?:free cash flow|fcf)\s+margins\b/gi, "FCF margin")
    .replace(/\breturn on equity\b/gi, "ROE")
    .replace(/\bgross profit margin\b/gi, "gross margin")
    .replace(/\bacid[- ]test ratio\b/gi, "quick ratio");

  query = query.replace(
    new RegExp(`\\b(?:eps|earnings)\\s+(?:growth|cagr)\\s*(${CMP})\\s*(${NUM})\\s*%?\\s*(?:over|for)\\s*3\\s*(?:years?|yrs?|y)\\b`, "gi"),
    (_m, cmp: string, amount: string) => `3-year EPS growth ${cmp} ${amount}%`
  );

  query = query.replace(
    new RegExp(`\\b(?:trading|trade)?\\s*(${CMP})\\s*(${NUM})\\s*x\\s*earnings\\b`, "gi"),
    (_m, cmp: string, amount: string) => `P/E ${cmp} ${amount}`
  );
  query = query.replace(
    new RegExp(`\\b(?:trading|trade)?\\s*(${CMP})\\s*(${NUM})\\s*x\\s*(?:book(?:\\s+value)?)\\b`, "gi"),
    (_m, cmp: string, amount: string) => `P/B ${cmp} ${amount}`
  );

  const reorderMetric = [
    "roic", "roe", "debt/equity", "gross margin", "operating margin", "fcf margin", "fcf yield",
    "free cash flow margin", "free cash flow yield", "beta", "rsi", "revenue growth", "interest coverage",
    "current ratio", "quick ratio", "payout ratio", "earnings yield", "forward p/e", "forward peg", "peg", "ev/ebitda",
  ].join("|");
  query = query.replace(
    new RegExp(`\\b(${CMP})\\s*(${NUM})\\s*(?:%|x)?\\s*(${reorderMetric})\\b`, "gi"),
    (_m, cmp: string, amount: string, metric: string) => `${metric} ${cmp} ${amount}`
  );

  query = query.replace(/\blarge\s+(?=(?:[a-z-]+\s+){1,4}(?:stocks|names)\b)/gi, "large-cap ");

  query = query.replace(
    new RegExp(`\\b(${CMP})\\s*(\\$?${NUM})\\s*(?:b|bn|billion)\\s+market\\s*cap\\b`, "gi"),
    (_m, cmp: string, amount: string) => `market cap ${cmp} ${amount} billion`
  );
  query = query.replace(
    new RegExp(`\\$?(${NUM})\\s*(?:b|bn|billion)\\s*\\+\\s*market\\s*cap\\b`, "gi"),
    (_m, amount: string) => `market cap at least ${amount} billion`
  );

  query = query.replace(
    new RegExp(`\\bhigh[- ]yield(?:\\s+stocks?|\\s+names?)?\\s*(${CMP})\\s*(${NUM})\\s*%`, "gi"),
    (_m, cmp: string, amount: string) => `dividend yield ${cmp} ${amount}%`
  );

  query = query.replace(/\bgrowing\s+both\s+revenue\s+and\s+(?:eps|earnings)\s+double[- ]digits?\b/gi, "revenue growth at least 10% and EPS growth double digits");
  query = query.replace(/\bdouble[- ]digit\s+revenue\s+growth\b/gi, "revenue growth at least 10%");

  query = normalizeMetricLocalRanges(query);

  const moderateCheap = /\bnot\s+(?:dead|dirt|extremely|ultra|super|too)\s+cheap\b/i;
  if (moderateCheap.test(query)) {
    query = query.replace(moderateCheap, "P/E between 10 and 20");
    pushAssumption(assumptions, "Read 'not dead cheap' style language as P/E between 10 and 20. Edit the range if you mean something different.");
  }

  return { query, assumptions };
}
