import { FIELDS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { complete } from "./llm";
import { coerceFilter, extractJsonObject } from "./parse-contract";
import { findFilterConflict, sameFilter } from "./filter-ops";

type CriterionBasis = "explicit" | "semantic" | "parse_default" | "unsupported" | "unresolved";
type CriterionStatus = "mapped" | "defaulted" | "unsupported" | "unresolved";
type IssueType = "missing" | "incorrect";

type RawCriterion = {
  phrase?: unknown;
  concept?: unknown;
  basis?: unknown;
  filters?: unknown;
  reason?: unknown;
};

type AuditIssue = { phrase?: unknown; type?: unknown; reason?: unknown };
type Issue = { phrase: string; type: IssueType; reason: string };

export interface CriterionLedgerItem {
  phrase: string;
  concept: string;
  basis: CriterionBasis;
  status: CriterionStatus;
  filters: Filter[];
  reason?: string;
}

export interface CriterionAuditResult {
  status: "verified" | "recovered" | "needs_user_input" | "unverified";
  issues: Issue[];
  recoveryAttempted: boolean;
}

export interface CriterionParseResult {
  filters: Filter[];
  ranking: string;
  interpretation: string;
  assumptions: string[];
  ledger: CriterionLedgerItem[];
  audit: CriterionAuditResult;
  diagnostics: { llmCalls: number; identifiedCriteria: number; accountedCriteria: number };
}

type DefaultSpec = {
  field: string;
  op: Op;
  value: number;
  phrase: RegExp;
  assumption: (phrase: string) => string;
};

const DEFAULTS: Record<string, DefaultSpec> = {
  profitable: {
    field: "operatingMargin", op: ">", value: 0,
    phrase: /\bprofitable\b|\bmaking (?:a )?(?:profit|money)\b|\bturning a profit\b|\bearning money\b|\bin the black\b|\bpositive (?:earnings|net income)\b/i,
    assumption: (p) => `Read “${p}” as Operating margin > 0% using Parse's documented profitability default.`,
  },
  low_debt: {
    field: "debtEquity", op: "<", value: 1,
    phrase: /\b(?:low|little|minimal|modest) debt\b|\bnot much debt\b|\bdebt (?:kept low|under control)\b|\b(?:low|modest|conservative) leverage\b|\bleverage on the low side\b|\blightly leveraged\b|\bnot overleveraged\b/i,
    assumption: (p) => `Read “${p}” as Debt / equity < 1 using Parse's documented low-debt default.`,
  },
  high_roic: {
    field: "roic", op: ">", value: 15,
    phrase: /\b(?:high|strong|excellent|healthy)[- ]+roic\b/i,
    assumption: (p) => `Read “${p}” as ROIC > 15% using Parse's documented high-ROIC default.`,
  },
  reasonable_valuation: {
    field: "pe", op: "<", value: 25,
    phrase: /\breasonable valuation\b|\breasonably valued\b|\bfair(?:ly)? valued\b|\bfair valuation\b|\bsensible valuation\b|\bvaluation looks fair\b|\bvaluation not excessive\b|\bnot expensive\b|\bnot overpriced\b|\bnot too (?:pricey|pricy)\b|\breasonably priced\b|\bpriced reasonably\b|\bfair price\b|\bsensible price\b/i,
    assumption: (p) => `Read “${p}” as P/E < 25 using Parse's documented reasonable-valuation default.`,
  },
  growth_stock: {
    field: "revGrowth", op: ">", value: 15,
    phrase: /\bgrowth (?:stocks?|companies|names)\b/i,
    assumption: (p) => `Read “${p}” as Revenue growth > 15% using Parse's documented growth-stock default.`,
  },
};

const CONCEPT_ALIASES: Record<string, string> = {
  revenue_growth: "revGrowth", revenuegrowth: "revGrowth", sales_growth: "revGrowth", top_line_growth: "revGrowth",
  operating_margin: "operatingMargin", gross_margin: "grossMargin", fcf_margin: "fcfMargin", free_cash_flow_margin: "fcfMargin",
  fcf_yield: "fcfYield", free_cash_flow_yield: "fcfYield", debt_equity: "debtEquity", debt_to_equity: "debtEquity",
  forward_pe: "forwardPe", forward_p_e: "forwardPe", p_e: "pe", pe_ratio: "pe", price_to_earnings: "pe",
  p_b: "pb", price_to_book: "pb", p_s: "ps", price_to_sales: "ps", forward_peg: "forwardPeg",
  earnings_yield: "earningsYield", dividend_yield: "divYield", dividend_growth_5y: "divGrowth5Y", payout_ratio: "payoutRatio",
  market_cap: "marketCap", market_capitalization: "marketCap", current_ratio: "currentRatio", quick_ratio: "quickRatio",
  interest_coverage: "interestCoverage", revenue_growth_3y: "revGrowth3Y", three_year_revenue_cagr: "revGrowth3Y",
  eps_growth_3y: "epsGrowth3Y", three_year_eps_cagr: "epsGrowth3Y", ev_ebitda: "evEbitda",
  from_52w_high: "from52wHigh", change_1w: "chg1w",
  profitability: "profitable", low_leverage: "low_debt", reasonable_value: "reasonable_valuation", valuation: "reasonable_valuation",
  industry: "sector", category: "sector",
};

const SECTOR_ALIASES: Array<[string, RegExp]> = [
  ["Technology", /\btech(?:nology)?\b|\bsoftware\b|\bsaas\b|software[- ]as[- ]a[- ]service|\bsemiconductors?\b|\bsemis\b|\bchipmakers?\b|\bchip makers?\b/i],
  ["Healthcare", /\bhealth ?care\b|\bbiotech(?:nology)?\b|\bpharma(?:ceuticals?)?\b|\bdrug makers?\b|\bdrugmakers?\b/i],
  ["Financials", /\bfinancials?\b|\bbanks?\b|\bbanking\b|\blenders?\b/i],
  ["Consumer", /\bconsumer\b|\bretail(?:ers?)?\b/i],
  ["Energy", /\benergy\b|\boil\s*(?:and|&)\s*gas\b/i],
  ["Industrials", /\bindustrials?\b/i],
  ["Communications", /\bcommunications?\b|\bcommunication[- ]services?\b|\btelecom(?:munications?)?\b/i],
  ["Utilities", /\butilities\b|\butility\b|\bpower utilities\b/i],
  ["Materials", /\bmaterials?\b|\bbasic materials\b/i],
  ["Real Estate", /\breal estate\b|\breits?\b|\bproperty reits?\b/i],
];

function compact(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function canonicalConcept(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const value = raw.trim();
  if (FIELDS[value] || DEFAULTS[value] || value === "sector") return value;
  const normalized = value.toLowerCase().replace(/[\s/-]+/g, "_").replace(/[^a-z0-9_]/g, "");
  return CONCEPT_ALIASES[normalized] ?? value;
}

function exactPhraseFromQuery(query: string, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const phrase = raw.trim();
  if (!phrase || phrase.length > 220) return null;
  return compact(query).includes(compact(phrase)) ? phrase : null;
}

function canonicalSector(phrase: string): string | null {
  const hits = SECTOR_ALIASES.filter(([, rx]) => rx.test(phrase)).map(([sector]) => sector);
  return hits.length === 1 ? hits[0] : null;
}

function numberAppears(phrase: string, value: number): boolean {
  const escaped = String(value).replace(".", "\\.");
  return new RegExp(`(^|[^\\d.])${escaped}(?=$|[^\\d.])`).test(phrase);
}

function isRangePhrase(phrase: string): boolean {
  return /\bbetween\b[^\d-]*-?\d+(?:\.\d+)?\s*%?\s*(?:and|to)\s*-?\d+(?:\.\d+)?|\bfrom\b[^\d-]*-?\d+(?:\.\d+)?\s*%?\s*(?:to|through)\s*-?\d+(?:\.\d+)?/i.test(phrase);
}

function operatorConsistent(phrase: string, op: Op, filterCount: number): boolean {
  if (filterCount === 2 && isRangePhrase(phrase) && (op === ">=" || op === "<=")) return true;
  if (op === ">") return /\b(?:more than|greater than|over|above|north of)\b|(^|\s)>\s*/i.test(phrase);
  if (op === ">=") return /\b(?:at least|no less than|minimum|min)\b|>=|\d+(?:\.\d+)?\s*%?\s*\+/i.test(phrase);
  if (op === "<") return /\b(?:less than|lower than|under|below)\b|(^|\s)<\s*/i.test(phrase);
  if (op === "<=") return /\b(?:at most|no more than|maximum|max)\b|<=/i.test(phrase);
  if (op === "==") return true;
  return false;
}

function safeSemanticNumeric(phrase: string, concept: string, filter: Filter): boolean {
  return concept === "revGrowth" && filter.field === "revGrowth" && filter.op === ">=" && Number(filter.value) === 10
    && /\bdouble[- ]digit(?:s)?\b/i.test(phrase);
}

function conceptAllowsField(concept: string, field: string): boolean {
  if (concept === "sector") return field === "sector";
  if (FIELDS[concept]) return concept === field;
  return false;
}

function groundedFilters(phrase: string, concept: string, basis: CriterionBasis, rawFilters: unknown): Filter[] | null {
  if (concept === "sector" && (basis === "semantic" || basis === "explicit")) {
    const sector = canonicalSector(phrase);
    if (!sector) return null;
    const excluded = /\b(?:exclude|excluding|except|avoid|without)\b/i.test(phrase);
    const filter = coerceFilter({ field: "sector", op: excluded ? "!=" : "==", value: sector });
    return filter ? [filter] : null;
  }

  if (!Array.isArray(rawFilters) || rawFilters.length === 0 || rawFilters.length > 4) return null;
  const out: Filter[] = [];
  for (const raw of rawFilters) {
    const filter = coerceFilter(raw);
    if (!filter || !conceptAllowsField(concept, filter.field)) return null;
    if (FIELDS[filter.field].kind !== "num") return null;
    const numeric = Number(filter.value);
    if (basis === "explicit") {
      if (!numberAppears(phrase, numeric) || !operatorConsistent(phrase, filter.op, rawFilters.length)) return null;
    } else if (basis === "semantic") {
      if (!safeSemanticNumeric(phrase, concept, filter)) return null;
    } else return null;
    if (!out.some((existing) => sameFilter(existing, filter))) out.push(filter);
  }

  if (out.length === 2) {
    if (!isRangePhrase(phrase) || out.some((f) => f.field !== concept)) return null;
    if (!out.some((f) => f.op === ">=") || !out.some((f) => f.op === "<=")) return null;
    if (!out.every((f) => numberAppears(phrase, Number(f.value)))) return null;
  }
  return out;
}

function unresolvedMessage(phrase: string, reason?: string): string {
  return `Couldn’t confidently translate: “${phrase}”. I left this out of the screen rather than guess.${reason?.trim() ? ` ${reason.trim()}` : ""}`;
}

function compileCriterion(query: string, raw: RawCriterion): { item: CriterionLedgerItem; assumption?: string } | null {
  const phrase = exactPhraseFromQuery(query, raw.phrase);
  if (!phrase) return null;
  const concept = canonicalConcept(raw.concept);
  const basis = raw.basis as CriterionBasis;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : undefined;

  if (basis === "unsupported") return { item: { phrase, concept, basis, status: "unsupported", filters: [], reason } };
  if (basis === "unresolved") return { item: { phrase, concept, basis, status: "unresolved", filters: [], reason }, assumption: unresolvedMessage(phrase, reason) };

  if (basis === "parse_default") {
    const spec = DEFAULTS[concept];
    if (!spec || !spec.phrase.test(phrase)) {
      const why = !spec ? "That concept does not have a documented Parse default." : "The wording does not safely match that documented Parse default.";
      return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: why }, assumption: unresolvedMessage(phrase, why) };
    }
    const filter = coerceFilter({ field: spec.field, op: spec.op, value: spec.value }, "default");
    if (!filter) return null;
    return { item: { phrase, concept, basis, status: "defaulted", filters: [filter] }, assumption: spec.assumption(phrase) };
  }

  if (basis === "explicit" || basis === "semantic") {
    const filters = groundedFilters(phrase, concept, basis, raw.filters);
    if (filters) return { item: { phrase, concept, basis, status: "mapped", filters } };
    const why = basis === "explicit"
      ? "The proposed field, number, or operator could not be grounded to this exact phrase."
      : "The semantic mapping was not one of Parse's deterministically allowed mappings.";
    return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: why }, assumption: unresolvedMessage(phrase, why) };
  }

  return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: "The interpretation basis was invalid." }, assumption: unresolvedMessage(phrase, "The interpretation basis was invalid.") };
}

function compileLedger(query: string, rawCriteria: RawCriterion[]) {
  const ledger: CriterionLedgerItem[] = [];
  const filters: Filter[] = [];
  const assumptions: string[] = [];
  for (const raw of rawCriteria) {
    const compiled = compileCriterion(query, raw);
    if (!compiled) continue;
    let item = compiled.item;
    if (item.filters.length) {
      const candidate = [...filters];
      for (const filter of item.filters) if (!candidate.some((x) => sameFilter(x, filter))) candidate.push(filter);
      if (findFilterConflict(candidate)) {
        const why = "That interpretation conflicts with another criterion in the same request.";
        item = { ...item, basis: "unresolved", status: "unresolved", filters: [], reason: why };
        assumptions.push(unresolvedMessage(item.phrase, why));
      } else filters.splice(0, filters.length, ...candidate);
    }
    ledger.push(item);
    if (compiled.assumption && !assumptions.includes(compiled.assumption)) assumptions.push(compiled.assumption);
    if (item.status === "unsupported") {
      const message = unresolvedMessage(item.phrase, item.reason || "That criterion is not supported by the current Parse data model.");
      if (!assumptions.includes(message)) assumptions.push(message);
    }
  }
  return { ledger, filters, assumptions };
}

function fieldVocab(): string {
  return Object.values(FIELDS).map((f) => `${f.key}=${f.label}`).join("; ");
}

function extractionSystem(): string {
  return [
    "Extract EVERY investment screening criterion into JSON. Preserve each exact source phrase; never silently omit unfamiliar wording.",
    `Fields: ${fieldVocab()}. Sectors: ${SECTORS.join(", ")}.`,
    "For a supported numeric metric with a stated number, concept MUST be its exact field key, basis=explicit, and filters must copy the exact operator/value. A range is two filters on that same field.",
    "Sector/industry requirements: concept=sector, basis=semantic. Code will canonicalize the sector; do not invent sector taxonomies.",
    "Qualitative defaults allowed ONLY: profitable=>Operating Margin >0; low_debt=>D/E <1; high_roic=>ROIC >15; reasonable_valuation=>P/E <25; growth_stock=>Revenue Growth >15. Use basis=parse_default and that exact concept key.",
    "Double-digit revenue/sales growth may be concept=revGrowth,basis=semantic,filter revGrowth>=10. No other invented semantic threshold.",
    "If supported but ambiguous, basis=unresolved. If Parse has no suitable field, basis=unsupported. Both must retain the phrase.",
    "Every phrase must be an exact contiguous substring of the request. Do not combine unrelated criteria.",
    `Ranking only when explicitly requested: ${Object.keys(RANKINGS).join(", ")}; otherwise null.`,
    'JSON only: {"criteria":[{"phrase":"exact","concept":"field|sector|default_key","basis":"explicit|semantic|parse_default|unsupported|unresolved","filters":[{"field":"revGrowth","op":">","value":12}],"reason":"optional"}],"ranking":null}',
  ].join(" ");
}

function auditSystem(): string {
  return [
    "Audit semantic coverage. Compare ORIGINAL REQUEST with LEDGER and FINAL FILTERS.",
    "Report every meaningful investment criterion that is absent or incorrectly represented (wrong field/operator/number/range/default).",
    "Unsupported criteria are accounted for if present in ledger. Unresolved criteria are visible but should not be reported merely because they lack a filter; code separately decides whether to retry them.",
    "Do not invent requirements. Issue phrase must be an exact contiguous substring from the request.",
    'JSON only: {"issues":[{"phrase":"exact","type":"missing|incorrect","reason":"short"}]}',
  ].join(" ");
}

function recoverySystem(): string {
  return [extractionSystem(), "ONE bounded recovery only. Re-extract ONLY the supplied issue phrases. Do not change other criteria."].join(" ");
}

function normalizeIssues(query: string, raw: unknown): Issue[] {
  if (!Array.isArray(raw)) return [];
  const out: Issue[] = [];
  for (const item of raw as AuditIssue[]) {
    const phrase = exactPhraseFromQuery(query, item.phrase);
    const type = item.type === "missing" || item.type === "incorrect" ? item.type : null;
    if (!phrase || !type) continue;
    const reason = typeof item.reason === "string" && item.reason.trim() ? item.reason.trim() : "This criterion was not fully accounted for.";
    if (!out.some((x) => compact(x.phrase) === compact(phrase) && x.type === type)) out.push({ phrase, type, reason });
  }
  return out;
}

function unresolvedIssues(ledger: CriterionLedgerItem[]): Issue[] {
  return ledger.filter((item) => item.status === "unresolved").map((item) => ({ phrase: item.phrase, type: "missing" as const, reason: item.reason || "This supported-looking criterion remains unresolved." }));
}

function combineIssues(...groups: Issue[][]): Issue[] {
  const out: Issue[] = [];
  for (const issue of groups.flat()) if (!out.some((x) => compact(x.phrase) === compact(issue.phrase))) out.push(issue);
  return out;
}

function rawFromLedger(item: CriterionLedgerItem): RawCriterion {
  return { phrase: item.phrase, concept: item.concept, basis: item.basis, filters: item.filters.map(({ field, op, value }) => ({ field, op, value })), reason: item.reason };
}

function overlaps(a: string, b: string): boolean {
  const ca = compact(a), cb = compact(b);
  return ca.includes(cb) || cb.includes(ca);
}

function mergeRecovery(existing: CriterionLedgerItem[], issues: Issue[], recoveredRaw: RawCriterion[]): RawCriterion[] {
  const kept = existing.filter((item) => !issues.some((issue) => overlaps(item.phrase, issue.phrase))).map(rawFromLedger);
  return [...kept, ...recoveredRaw];
}

function neutralizeIssues(existing: CriterionLedgerItem[], issues: Issue[]): RawCriterion[] {
  const raw = existing.filter((item) => !issues.some((issue) => overlaps(item.phrase, issue.phrase))).map(rawFromLedger);
  for (const issue of issues) raw.push({ phrase: issue.phrase, concept: "unknown", basis: "unresolved", filters: [], reason: issue.reason });
  return raw;
}

async function runAudit(query: string, ledger: CriterionLedgerItem[], filters: Filter[]): Promise<Issue[]> {
  const raw = await complete({
    system: auditSystem(),
    user: `ORIGINAL REQUEST:\n${query}\n\nLEDGER:\n${JSON.stringify(ledger.map((i) => ({ phrase: i.phrase, concept: i.concept, basis: i.basis, status: i.status, filters: i.filters.map(({ field, op, value }) => ({ field, op, value })) })))}\n\nFINAL FILTERS:\n${JSON.stringify(filters.map(({ field, op, value }) => ({ field, op, value })))}`,
  });
  return normalizeIssues(query, extractJsonObject(raw).issues);
}

function resultStatus(compiled: ReturnType<typeof compileLedger>, recovered: boolean): "verified" | "recovered" | "needs_user_input" {
  if (compiled.ledger.some((i) => i.status === "unresolved")) return "needs_user_input";
  return recovered ? "recovered" : "verified";
}

export async function parseWithCriterionLedgerV2(query: string): Promise<CriterionParseResult> {
  let llmCalls = 0;
  const extraction = extractJsonObject(await complete({ system: extractionSystem(), user: query }));
  llmCalls++;
  let compiled = compileLedger(query, Array.isArray(extraction.criteria) ? extraction.criteria : []);
  const ranking = typeof extraction.ranking === "string" && RANKINGS[extraction.ranking] ? extraction.ranking : "marketCap";

  let auditIssues: Issue[];
  try {
    auditIssues = await runAudit(query, compiled.ledger, compiled.filters); llmCalls++;
  } catch {
    return {
      filters: compiled.filters, ranking,
      interpretation: "Interpreted the request, but final semantic verification did not complete.",
      assumptions: [...compiled.assumptions, "Parse could not complete its final semantic verification. Review the interpretation before running this screen."],
      ledger: compiled.ledger, audit: { status: "unverified", issues: [], recoveryAttempted: false },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  const firstIssues = combineIssues(auditIssues, unresolvedIssues(compiled.ledger));
  if (!firstIssues.length) {
    return {
      filters: compiled.filters, ranking,
      interpretation: "Every identified investment criterion was accounted for and independently verified.",
      assumptions: compiled.assumptions, ledger: compiled.ledger,
      audit: { status: "verified", issues: [], recoveryAttempted: false },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  let recoveredRaw: RawCriterion[] = [];
  try {
    const recovery = extractJsonObject(await complete({ system: recoverySystem(), user: `ORIGINAL REQUEST:\n${query}\n\nISSUES:\n${JSON.stringify(firstIssues)}` }));
    llmCalls++;
    recoveredRaw = Array.isArray(recovery.criteria) ? recovery.criteria : [];
  } catch { recoveredRaw = []; }

  compiled = compileLedger(query, mergeRecovery(compiled.ledger, firstIssues, recoveredRaw));

  let secondAuditIssues: Issue[];
  try {
    secondAuditIssues = await runAudit(query, compiled.ledger, compiled.filters); llmCalls++;
  } catch {
    return {
      filters: compiled.filters, ranking,
      interpretation: "A recovery was attempted, but final verification did not complete.",
      assumptions: [...compiled.assumptions, "Parse could not verify the targeted recovery attempt. Review the interpretation before running this screen."],
      ledger: compiled.ledger, audit: { status: "unverified", issues: firstIssues, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  const remaining = combineIssues(secondAuditIssues, unresolvedIssues(compiled.ledger));
  if (remaining.length) {
    const safe = compileLedger(query, neutralizeIssues(compiled.ledger, remaining));
    return {
      filters: safe.filters, ranking,
      interpretation: "Some criteria still need your input after one recovery attempt; those criteria were left out rather than guessed.",
      assumptions: safe.assumptions, ledger: safe.ledger,
      audit: { status: "needs_user_input", issues: remaining, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: safe.ledger.length, accountedCriteria: safe.ledger.length },
    };
  }

  const status = resultStatus(compiled, true);
  return {
    filters: compiled.filters, ranking,
    interpretation: status === "recovered" ? "Every investment criterion was accounted for after one targeted recovery attempt." : "Some criteria still need your input.",
    assumptions: compiled.assumptions, ledger: compiled.ledger,
    audit: { status, issues: firstIssues, recoveryAttempted: true },
    diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
  };
}
