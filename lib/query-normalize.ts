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
