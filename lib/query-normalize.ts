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

function pushAssumption(out: string[], message: string) {
  if (!out.includes(message)) out.push(message);
}

export function normalizeScreenQuery(input: string): NormalizedQuery {
  let query = input;
  const assumptions: string[] = [];

  // Natural-language negation is easy to miss in token-based parsing. Rewrite
  // only explicit sector negations into the parser's supported exclusion form.
  // Preserve noun phrases such as "large non-tech companies" so other
  // modifiers (large, cheap, growing, etc.) remain parseable.
  for (const [alias, canonical] of SECTOR_ALIASES) {
    const source = alias.source.replace(/^\\b|\\b$/g, "");
    const nounRx = new RegExp(`\\b(?:not|non[- ]?)\\s*(?:${source})\\s+(companies|stocks|names)\\b`, "ig");
    if (nounRx.test(query)) {
      query = query.replace(nounRx, `$1 excluding ${canonical}`);
    }

    const notRx = new RegExp(`\\b(?:not|non[- ]?)\\s*(?:${source})\\b`, "ig");
    if (notRx.test(query)) {
      query = query.replace(notRx, `exclude ${canonical}`);
    }
  }

  // Experienced investors commonly use the adjective "financial" for the
  // Financials sector. Canonicalize it only when it is clearly being used as
  // a sector label, rather than in phrases such as "financial technology".
  query = query.replace(
    /\bfinancial(?=\s+(?:stocks|companies|names|firms|banks?|insurers?|dividend|income)\b)/gi,
    "Financials"
  );

  // Common investor shorthand should reach the deterministic parser in the
  // same canonical vocabulary as the full metric names.
  query = query
    .replace(/\bd\s*\/\s*e\b/gi, "debt/equity")
    .replace(/\b3(?:y|[- ]?yr|[- ]?year)\s+rev(?:enue)?\s+cagr\b/gi, "3-year revenue CAGR")
    .replace(/\bop(?:er)?\.?\s+margin\b/gi, "operating margin");

  // "Large tech names" and "large healthcare income stocks" are ordinary
  // investor phrasing for large-cap. Normalize only when "large" modifies a
  // stock/name noun phrase; leave phrases like "large companies" untouched.
  query = query.replace(
    /\blarge\s+(?=(?:[a-z-]+\s+){1,4}(?:stocks|names)\b)/gi,
    "large-cap "
  );

  // Investors often put the threshold before the metric. Reorder market-cap
  // language so numeric binding remains local to the intended metric.
  query = query.replace(
    /\b(above|over|more than|greater than|at least|below|under|less than|at most|no more than)\s*(\$?\d+(?:\.\d+)?)\s*(?:b|bn|billion)\s+market\s*cap\b/gi,
    (_match, op: string, amount: string) => `market cap ${op} ${amount} billion`
  );

  // "Growth stocks/names" is an investment style label, not permission to
  // invent a revenue-growth threshold. Keep it qualitative unless the user
  // supplies a growth metric or number explicitly.
  query = query.replace(/\bgrowth\s+(stocks|companies|names)\b/gi, "quality $1");

  // Forward P/E and earnings yield are distinct metrics that Parse does not
  // currently support. Replace them with a known unsupported placeholder so
  // they cannot collide with trailing P/E or bare-yield rules, while keeping
  // a precise explanation for the user.
  if (/\bforward\s+(?:p\/?e|price[- ]?to[- ]?earnings)\b/i.test(query)) {
    query = query.replace(/\bforward\s+(?:p\/?e|price[- ]?to[- ]?earnings)\b/gi, "unsupported PEG metric");
    pushAssumption(assumptions, "Forward P/E is not supported yet, so the 'forward P/E' criterion was left out rather than treated as trailing P/E.");
  }
  if (/\bearnings\s+yield\b/i.test(query)) {
    query = query.replace(/\bearnings\s+yield\b/gi, "unsupported PEG metric");
    pushAssumption(assumptions, "Earnings yield is not supported yet, so the 'earnings yield' criterion was left out rather than treated as dividend yield.");
  }

  // "Cheap" is already defined by Parse as a value screen. A qualifier such
  // as "not dead cheap" narrows the valuation band rather than removing the
  // cheap requirement. Keep the translation explicit and editable.
  const moderateCheap = /\bnot\s+(?:dead|dirt|extremely|ultra|super|too)\s+cheap\b/i;
  if (moderateCheap.test(query)) {
    query = query.replace(moderateCheap, "P/E between 10 and 20");
    assumptions.push("Read 'not dead cheap' style language as P/E between 10 and 20. Edit the range if you mean something different.");
  }

  return { query, assumptions };
}
