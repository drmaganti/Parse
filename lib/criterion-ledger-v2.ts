import { FIELDS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { complete } from "./llm";
import { coerceFilter, extractJsonObject } from "./parse-contract";
import { findFilterConflict, sameFilter } from "./filter-ops";
import { matchSectorLexicon, sectorLexiconPrompt } from "./sector-lexicon";
import { groundedLogicalOperator, isHighReference } from "./logical-constraints";

type CriterionBasis = "explicit" | "semantic" | "parse_default" | "unsupported" | "unresolved";
type CriterionStatus = "mapped" | "defaulted" | "unsupported" | "unresolved";
type IssueType = "missing" | "incorrect";
type CriterionResolution = "llm_explicit" | "llm_semantic" | "parse_default" | "sector_ontology" | "unsupported" | "unresolved";

const ONTOLOGY_BACKSTOP = Symbol("ontology_backstop");

type RawCriterion = {
  phrase?: unknown;
  concept?: unknown;
  basis?: unknown;
  filters?: unknown;
  reason?: unknown;
  [ONTOLOGY_BACKSTOP]?: true;
};

type AuditIssue = { phrase?: unknown; type?: unknown; reason?: unknown };
type Issue = { phrase: string; type: IssueType; reason: string };
type ContractMismatch = { phrase: string; type: "numeric_basis"; reason: string };

export interface CriterionLedgerItem {
  phrase: string;
  concept: string;
  basis: CriterionBasis;
  status: CriterionStatus;
  filters: Filter[];
  resolution: CriterionResolution;
  normalizations: string[];
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
  diagnostics: {
    llmCalls: number;
    identifiedCriteria: number;
    accountedCriteria: number;
    path: "normal" | "fallback";
    maxLlmCalls: 2;
    contractMismatches: ContractMismatch[];
    coverageTelemetry: string[];
  };
}

type CompletionFn = (input: { system: string; user: string; task?: "criterion_ledger" }) => Promise<string>;

type DefaultSpec = {
  field: string;
  op: Op;
  value: number;
  assumption: (phrase: string) => string;
};

const DEFAULTS: Record<string, DefaultSpec> = {
  profitable: {
    field: "operatingMargin", op: ">", value: 0,
    assumption: (p) => `Read “${p}” as Operating margin > 0% using Parse's documented profitability default.`,
  },
  low_debt: {
    field: "debtEquity", op: "<", value: 1,
    assumption: (p) => `Read “${p}” as Debt / equity < 1 using Parse's documented low-debt default.`,
  },
  high_roic: {
    field: "roic", op: ">", value: 15,
    assumption: (p) => `Read “${p}” as ROIC > 15% using Parse's documented high-ROIC default.`,
  },
  reasonable_valuation: {
    field: "pe", op: "<", value: 25,
    assumption: (p) => `Read “${p}” as P/E < 25 using Parse's documented reasonable-valuation default.`,
  },
  growth_stock: {
    field: "revGrowth", op: ">", value: 15,
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

function compact(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function canonicalConcept(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const value = raw.trim();
  if (SECTORS.some((sector) => sector.toLowerCase() === value.toLowerCase())) return "sector";
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

function numberAppears(phrase: string, value: number): boolean {
  const escaped = String(value).replace(".", "\\.");
  return new RegExp(`(^|[^\\d.])${escaped}(?=$|[^\\d.])`).test(phrase);
}

function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
}

// Parse stores market capitalization in billions of dollars. Models commonly
// copy either the written magnitude (500) or expand it to raw dollars (500m),
// so the compiler accepts those grounded representations and emits one unit.
function groundedExplicitNumericValue(phrase: string, field: string, proposed: number): number | null {
  if (field === "from52wHigh" && /\b(?:below|off|within)\b/i.test(phrase) && isHighReference(phrase)) {
    const writtenMatch = /(-?\d+(?:\.\d+)?)\s*%/.exec(phrase);
    if (writtenMatch) {
      const written = Math.abs(Number(writtenMatch[1]));
      const stored = -written;
      if ([written, stored, written / 100, stored / 100].some((value) => approximatelyEqual(proposed, value))) return stored;
      return null;
    }
  }

  if (field === "marketCap") {
    const unitPattern = /(?:\$|usd\s*)?(-?\d+(?:\.\d+)?)\s*(trillion|tn|billion|bn|million|mn|mm|t|b|m)\b/gi;
    const candidates: Array<{ written: number; billions: number }> = [];
    for (const match of phrase.matchAll(unitPattern)) {
      const written = Number(match[1]);
      const multiplier = /^(?:trillion|tn|t)$/i.test(match[2]) ? 1000
        : /^(?:billion|bn|b)$/i.test(match[2]) ? 1
        : 0.001;
      candidates.push({ written, billions: written * multiplier });
    }
    for (const candidate of candidates) {
      const dollars = candidate.billions * 1_000_000_000;
      if ([candidate.written, candidate.billions, dollars].some((value) => approximatelyEqual(proposed, value))) return candidate.billions;
    }
    if (candidates.length) return null;
  }

  if (FIELDS[field]?.unit === "%") {
    const percents = [...phrase.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
    for (const written of percents) {
      if (approximatelyEqual(proposed, written) || approximatelyEqual(proposed, written / 100)) return written;
    }
    // In a range, users often write the percent sign only after the second
    // endpoint ("between 5 and 20%"). The other endpoint remains grounded by
    // its literal occurrence and already uses Parse's percentage scale.
    if (numberAppears(phrase, proposed)) return proposed;
    if (percents.length) return null;
  }

  return numberAppears(phrase, proposed) ? proposed : null;
}

const SECTOR_VALUE_ALIASES: Record<string, string> = {
  "information technology": "Technology",
  technology: "Technology",
  financial: "Financials",
  financials: "Financials",
  "financial services": "Financials",
  healthcare: "Healthcare",
  "health care": "Healthcare",
  consumer: "Consumer",
  "consumer discretionary": "Consumer",
  "consumer staples": "Consumer",
  energy: "Energy",
  industrial: "Industrials",
  industrials: "Industrials",
  communications: "Communications",
  "communication services": "Communications",
  telecommunications: "Communications",
  telecom: "Communications",
  utility: "Utilities",
  utilities: "Utilities",
  material: "Materials",
  materials: "Materials",
  "real estate": "Real Estate",
};

function canonicalSectorValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return SECTOR_VALUE_ALIASES[compact(raw)] ?? null;
}

function coerceCriterionFilter(raw: unknown, source: Filter["source"] = "ai"): Filter | null {
  if (raw && typeof raw === "object" && (raw as { field?: unknown }).field === "sector") {
    const value = canonicalSectorValue((raw as { value?: unknown }).value);
    if (!value) return null;
    return coerceFilter({ ...(raw as object), value }, source);
  }
  return coerceFilter(raw, source);
}

const EXCLUSION_SCOPE_MARKER = /\b(?:exclude|excluding|avoid|avoiding|omit|omitting|leave\s+out|screen\s+out|filter\s+out)\b/i;
const EXCLUSION_SCOPE_FILLERS = new Set([
  "all", "any", "business", "businesses", "companies", "company", "firm", "firms", "have", "having",
  "holding", "holdings", "maker", "makers", "name", "names", "one", "ones", "operator", "operators",
  "provider", "providers", "security", "securities", "share", "shares", "stock", "stocks", "that", "those",
  "where", "whose", "with",
]);

// Models sometimes preserve the numeric predicate but return too narrow an
// evidence span, dropping a governing "exclude/avoid" immediately before it.
// Widen only inside the same punctuation-delimited clause, only across a tiny
// allowlist of scope words, and only when doing so changes a grounded scalar
// relation into its formal complement. Anything less clear remains untouched
// for the completeness auditor to reject safely.
function scopedExplicitPhrase(query: string, phrase: string, basis: CriterionBasis, rawFilters: unknown): { phrase: string; ambiguousExclusion: boolean } {
  const unchanged = { phrase, ambiguousExclusion: false };
  if (basis !== "explicit" || !Array.isArray(rawFilters) || rawFilters.length !== 1 || EXCLUSION_SCOPE_MARKER.test(phrase)) return unchanged;
  const proposed = coerceCriterionFilter(rawFilters[0]);
  if (!proposed || FIELDS[proposed.field]?.kind !== "num") return unchanged;
  const directOp = groundedLogicalOperator(phrase, proposed.field);
  if (!directOp) return unchanged;

  const source = query.toLowerCase().replace(/[’]/g, "'");
  const needle = phrase.toLowerCase().replace(/[’]/g, "'");
  const phraseStart = source.indexOf(needle);
  if (phraseStart < 0) return unchanged;
  const clauseStart = Math.max(query.lastIndexOf(",", phraseStart), query.lastIndexOf(";", phraseStart), query.lastIndexOf(".", phraseStart), query.lastIndexOf(":", phraseStart)) + 1;
  const prefix = query.slice(clauseStart, phraseStart);
  const matches = [...prefix.matchAll(/\b(?:exclude|excluding|avoid|avoiding|omit|omitting|leave\s+out|screen\s+out|filter\s+out)\b/gi)];
  const marker = matches.at(-1);
  if (!marker || marker.index === undefined) return unchanged;

  const leading = prefix.slice(0, marker.index).trim();
  const scopeWords = words(prefix.slice(marker.index + marker[0].length));
  if (scopeWords.length > 6 || scopeWords.some((word) => !EXCLUSION_SCOPE_FILLERS.has(word))) return unchanged;
  if (/\b(?:not|never|whether|maybe|possibly|consider|considering)\b/i.test(leading)) {
    return { phrase, ambiguousExclusion: true };
  }

  const expanded = query.slice(clauseStart + marker.index, phraseStart + phrase.length).trim();
  const scopedOp = groundedLogicalOperator(expanded, proposed.field);
  return scopedOp && scopedOp !== directOp ? { phrase: expanded, ambiguousExclusion: false } : unchanged;
}

function isRangePhrase(phrase: string): boolean {
  const numericEndpoints = phrase.match(/-?\d+(?:\.\d+)?/g) ?? [];
  if (numericEndpoints.length < 2) return false;
  return /\bbetween\b[\s\S]*\b(?:and|to)\b/i.test(phrase)
    || /\bfrom\b[\s\S]*\b(?:to|through)\b/i.test(phrase);
}

function normalizedSemanticText(text: string): string {
  return text.toLowerCase().replace(/[‐‑‒–—―/\\-]+/g, " ").replace(/\s+/g, " ").trim();
}

function explicitMetricIdentity(phrase: string, field: string): "confirmed" | "conflicting" | "ambiguous" {
  // Yield fields are unusually easy for a model to conflate. Parse's dividend
  // yield is a shareholder distribution metric, not rental income, bond yield,
  // or a generic business-income percentage. Keep semantic flexibility for
  // other metrics while distinguishing confirmed, contradictory, and merely
  // ambiguous evidence for these high-risk fields.
  const normalized = normalizedSemanticText(phrase);
  const rentalOrDebtYield = /\b(?:rent(?:al)?|lease|bond|coupon|treasury)\b/i.test(normalized);
  if (field === "divYield") {
    if (/\bdividends?\b|\bdistribution yield\b/i.test(normalized)) return "confirmed";
    if (rentalOrDebtYield || /\b(?:earnings?|fcf|free cash flow)\b/i.test(normalized)) return "conflicting";
    return "ambiguous";
  }
  if (field === "earningsYield") {
    if (/\bearnings? yield\b/i.test(normalized)) return "confirmed";
    if (rentalOrDebtYield || /\b(?:dividends?|fcf|free cash flow)\b/i.test(normalized)) return "conflicting";
    return "ambiguous";
  }
  if (field === "fcfYield") {
    if (/\b(?:fcf|free cash flow) yield\b/i.test(normalized)) return "confirmed";
    if (rentalOrDebtYield || /\b(?:dividends?|earnings?)\b/i.test(normalized)) return "conflicting";
    return "ambiguous";
  }
  return "confirmed";
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
    if (!Array.isArray(rawFilters) || rawFilters.length !== 1) return null;
    const filter = coerceCriterionFilter(rawFilters[0]);
    if (!filter || filter.field !== "sector" || (filter.op !== "==" && filter.op !== "!=")) return null;
    return filter ? [filter] : null;
  }

  if (!Array.isArray(rawFilters) || rawFilters.length === 0 || rawFilters.length > 4) return null;
  const out: Filter[] = [];
  for (const raw of rawFilters) {
    let filter = coerceFilter(raw);
    if (!filter || !conceptAllowsField(concept, filter.field)) return null;
    if (FIELDS[filter.field].kind !== "num") return null;
    const numeric = Number(filter.value);
    if (basis === "explicit") {
      // The model infers the user's comparator semantically. The compiler never
      // permits a number that is absent from the exact source phrase. When a
      // known comparator is present, it deterministically grounds the operator;
      // unfamiliar comparator language remains available to model inference.
      if (explicitMetricIdentity(phrase, filter.field) !== "confirmed") return null;
      const groundedValue = groundedExplicitNumericValue(phrase, filter.field, numeric);
      if (groundedValue === null) return null;
      if (!approximatelyEqual(numeric, groundedValue)) {
        filter = coerceFilter({ field: filter.field, op: filter.op, value: groundedValue });
        if (!filter) return null;
      }
      const groundedOp = rawFilters.length === 1 ? groundedLogicalOperator(phrase, filter.field) : null;
      // Ranges have their own deterministic endpoint validation. A scalar
      // numeric criterion without a recognized relation fails safely instead
      // of trusting a model-generated sign.
      if (rawFilters.length === 1 && !groundedOp) return null;
      if (groundedOp && filter.op !== groundedOp) {
        filter = coerceFilter({ field: filter.field, op: groundedOp, value: filter.value });
        if (!filter) return null;
      }
    } else if (basis === "semantic") {
      if (!safeSemanticNumeric(phrase, concept, filter)) return null;
    } else return null;
    if (!out.some((existing) => sameFilter(existing, filter))) out.push(filter);
  }

  if (out.length === 2) {
    if (!isRangePhrase(phrase) || out.some((f) => f.field !== concept)) return null;
    if (!out.some((f) => f.op === ">=") || !out.some((f) => f.op === "<=")) return null;
  }
  return out;
}

function unresolvedMessage(phrase: string, reason?: string): string {
  return `Couldn’t confidently translate: “${phrase}”. I left this out of the screen rather than guess.${reason?.trim() ? ` ${reason.trim()}` : ""}`;
}

function deterministicNormalizations(rawFilters: unknown, compiled: Filter[], conceptBefore: string, conceptAfter: string): string[] {
  const normalizations: string[] = [];
  if (conceptBefore !== conceptAfter && conceptAfter === "sector") normalizations.push("sector concept normalized");
  if (!Array.isArray(rawFilters)) return normalizations;
  for (const raw of rawFilters) {
    const proposed = coerceCriterionFilter(raw);
    if (!proposed) continue;
    const result = compiled.find((filter) => filter.field === proposed.field);
    if (!result) continue;
    if (proposed.op !== result.op && !normalizations.includes("comparator grounded from source phrase")) {
      normalizations.push("comparator grounded from source phrase");
    }
    if (FIELDS[result.field]?.kind === "num" && !approximatelyEqual(Number(proposed.value), Number(result.value))
      && !normalizations.includes("numeric representation normalized")) normalizations.push("numeric representation normalized");
    if (result.field === "sector" && String((raw as { value?: unknown })?.value).trim() !== String(result.value)
      && !normalizations.includes("sector label normalized")) normalizations.push("sector label normalized");
  }
  return normalizations;
}

function explicitMetricProblem(phrase: string, rawFilters: unknown): string | null {
  if (!Array.isArray(rawFilters)) return null;
  for (const raw of rawFilters) {
    const filter = coerceCriterionFilter(raw);
    if (!filter) continue;
    const identity = explicitMetricIdentity(phrase, filter.field);
    if (identity === "conflicting") return "The source phrase names a different yield family than the proposed Parse field.";
    if (identity === "ambiguous") return "The source phrase does not identify which supported yield family the number belongs to.";
  }
  return null;
}

function semanticDefaultConcept(phrase: string, concept: string, rawFilters: unknown): string | null {
  if (DEFAULTS[concept]) return concept;
  if (/\d/.test(phrase) || !Array.isArray(rawFilters) || rawFilters.length !== 1) return null;
  const proposed = coerceFilter(rawFilters[0]);
  if (!proposed) return null;
  for (const [defaultConcept, spec] of Object.entries(DEFAULTS)) {
    if (proposed.field === spec.field && proposed.op === spec.op && Number(proposed.value) === spec.value) return defaultConcept;
  }
  return null;
}

function compileCriterion(query: string, raw: RawCriterion): { item: CriterionLedgerItem; assumption?: string } | null {
  const exactPhrase = exactPhraseFromQuery(query, raw.phrase);
  if (!exactPhrase) return null;
  let concept = canonicalConcept(raw.concept);
  const originalConcept = concept;
  let basis = raw.basis as CriterionBasis;
  if ((basis === "semantic" || basis === "explicit") && Array.isArray(raw.filters) && raw.filters.length === 1) {
    const sectorFilter = coerceCriterionFilter(raw.filters[0]);
    if (sectorFilter?.field === "sector" && (sectorFilter.op === "==" || sectorFilter.op === "!=")) concept = "sector";
  }
  if (basis === "semantic") {
    const normalizedDefault = semanticDefaultConcept(exactPhrase, concept, raw.filters);
    if (normalizedDefault) {
      concept = normalizedDefault;
      basis = "parse_default";
    }
  }
  const scopedPhrase = scopedExplicitPhrase(query, exactPhrase, basis, raw.filters);
  const phrase = scopedPhrase.phrase;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : undefined;

  if (scopedPhrase.ambiguousExclusion) {
    const why = "The numeric predicate may be governed by uncertain or negated exclusion language, so Parse left it out rather than invert it unsafely.";
    return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason: why }, assumption: unresolvedMessage(phrase, why) };
  }

  if (basis === "unsupported") return { item: { phrase, concept, basis, status: "unsupported", filters: [], resolution: "unsupported", normalizations: [], reason } };
  if (basis === "unresolved") return { item: { phrase, concept, basis, status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason }, assumption: unresolvedMessage(phrase, reason) };

  if (basis === "parse_default") {
    const spec = DEFAULTS[concept];
    if (!spec) {
      const why = "That concept does not have a documented Parse default.";
      return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason: why }, assumption: unresolvedMessage(phrase, why) };
    }
    const filter = coerceFilter({ field: spec.field, op: spec.op, value: spec.value }, "default");
    if (!filter) return null;
    return { item: { phrase, concept, basis, status: "defaulted", filters: [filter], resolution: "parse_default", normalizations: [] }, assumption: spec.assumption(phrase) };
  }

  if (basis === "explicit" || basis === "semantic") {
    const filters = groundedFilters(phrase, concept, basis, raw.filters);
    if (filters) return { item: {
      phrase, concept, basis, status: "mapped", filters,
      resolution: raw[ONTOLOGY_BACKSTOP] ? "sector_ontology" : basis === "explicit" ? "llm_explicit" : "llm_semantic",
      normalizations: deterministicNormalizations(raw.filters, filters, originalConcept, concept),
    } };
    const metricProblem = basis === "explicit" ? explicitMetricProblem(phrase, raw.filters) : null;
    const why = metricProblem ?? (basis === "semantic" && /\d/.test(phrase) && concept !== "sector"
      ? "A criterion with a stated number was labeled semantic; Parse requires basis=explicit before deterministic grounding."
      : basis === "explicit"
      ? "The proposed field, number, or operator could not be grounded to this exact phrase."
      : "The semantic mapping was not one of Parse's deterministically allowed mappings.");
    return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason: why }, assumption: unresolvedMessage(phrase, why) };
  }

  return { item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason: "The interpretation basis was invalid." }, assumption: unresolvedMessage(phrase, "The interpretation basis was invalid.") };
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
        item = { ...item, basis: "unresolved", status: "unresolved", filters: [], resolution: "unresolved", normalizations: [], reason: why };
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
    "You are a semantic investment-query normalizer, not a phrase matcher. Infer meaning from arbitrary natural language, including wording you have never seen before.",
    "Extract EVERY meaningful investment screening criterion into JSON. Preserve each exact source phrase; never silently omit unfamiliar wording. Grammatical connectors such as whose/that/with are not criteria by themselves.",
    `Fields: ${fieldVocab()}. Sectors: ${SECTORS.join(", ")}.`,
    "For a supported numeric metric with a stated number, concept MUST be its exact field key, basis=explicit, and filters must preserve the exact semantic comparator and copy the stated number. A range is two filters on that same field. If exclude/avoid/leave-out language governs a numeric predicate, retain those governing words inside that criterion's exact phrase; Parse will compile the Boolean complement deterministically.",
    "For yield metrics, the exact evidence phrase must retain the defining family: dividend/distribution yield, earnings yield, or FCF/free-cash-flow yield. Rental income or rental yield, bond/coupon yield, and other unsupported yield families must be marked unsupported; never substitute a supported yield field.",
    "Sector/industry requirements: infer the closest controlled sector from meaning, not a word list. Use concept=sector, basis=semantic, and one sector filter whose value is exactly one supplied sector. Preserve exclusions with op=!=. If the business category does not imply one supplied sector with high confidence, mark it unresolved.",
    `Common sector language (examples, not an exhaustive vocabulary): ${sectorLexiconPrompt()}. Infer semantically when the user's wording is absent from these examples.`,
    "Qualitative defaults allowed ONLY: profitable means the user requires the business to currently make a profit=>Operating Margin >0; low_debt means the user requires low leverage or indebtedness=>D/E <1; high_roic means the user requires strong return on invested capital=>ROIC >15; reasonable_valuation means the user requires a non-expensive or fair valuation=>P/E <25; growth_stock means the user requests a growth stock without stating a growth number=>Revenue Growth >15. Recognize these meanings regardless of wording. Use basis=parse_default and the exact concept key.",
    "Double-digit revenue/sales growth may be concept=revGrowth,basis=semantic,filter revGrowth>=10. No other invented semantic threshold.",
    "If supported but ambiguous, basis=unresolved. If Parse has no suitable field, basis=unsupported. Both must retain the phrase.",
    "Every phrase must be an exact contiguous substring of the request. Each ledger item must contain exactly one meaning; split a business scope and a financial condition into separate items even when adjacent.",
    `Ranking only when explicitly requested: ${Object.keys(RANKINGS).join(", ")}; otherwise null.`,
    "Before responding, compare the untouched original request against your proposed criteria. Put every meaningful investor intent that is missing or uncertain in coverage_issues. A correctly selected ranking is already accounted for; never report grammar, connectors, or isolated modifiers as coverage issues. This original-input-to-ledger completeness audit must happen in this same call.",
    'JSON only: {"criteria":[{"phrase":"exact","concept":"field|sector|default_key","basis":"explicit|semantic|parse_default|unsupported|unresolved","filters":[{"field":"revGrowth","op":">","value":12}],"reason":"optional"}],"coverage_issues":[{"phrase":"exact","type":"missing|incorrect","reason":"short"}],"ranking":null}',
  ].join(" ");
}

function recoverySystem(): string {
  return [
    extractionSystem(),
    "ONE bounded fallback only. Re-extract ONLY the supplied issue phrases. Do not change other criteria. coverage_issues must be empty unless a supplied phrase still cannot be represented.",
    "Recovery contract: when an issue phrase states a number for a supported metric, basis MUST be explicit. Never label that stated-number criterion semantic. Copy the number exactly and infer the metric and comparator from the phrase; if either is genuinely ambiguous, return unresolved instead of guessing.",
  ].join(" ");
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

function sectorLexiconIdentities(query: string): Array<{ phrase: string; sector: string; op: "==" | "!=" }> {
  const identities = new Map<string, { phrase: string; sector: string; op: "==" | "!=" }>();
  for (const match of matchSectorLexicon(query)) {
    const key = `${match.op}|${match.sector}`;
    const previous = identities.get(key);
    if (!previous || match.phrase.length > previous.phrase.length) identities.set(key, match);
  }
  return [...identities.values()];
}

function validRawSectorFilter(item: RawCriterion): Filter | null {
  if (!Array.isArray(item.filters) || item.filters.length !== 1) return null;
  const filter = coerceCriterionFilter(item.filters[0]);
  return filter && filter.field === "sector" && (filter.op === "==" || filter.op === "!=") ? filter : null;
}

const SECTOR_SCOPE_MODIFIERS = new Set([
  "american", "canadian", "domestic", "european", "global", "international", "local", "regional", "us",
  "business", "businesses", "companies", "company", "firms", "makers", "names", "operators", "shares", "stocks",
  "large", "mid", "small", "cap", "listed", "public", "publicly", "traded",
]);

function isScopeOnlyVariant(phrase: string, matchedPhrase: string): boolean {
  const scopeWords = words(matchedPhrase);
  const remaining = words(phrase);
  for (const word of scopeWords) {
    const index = remaining.indexOf(word);
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining.every((word) => SECTOR_SCOPE_MODIFIERS.has(word));
}

function applySectorLexiconBackstop(query: string, criteria: RawCriterion[]): RawCriterion[] {
  let resolved = [...criteria];
  for (const match of sectorLexiconIdentities(query)) {
    const matching = resolved.some((item) => {
      const filter = validRawSectorFilter(item);
      return filter?.op === match.op && filter.value === match.sector;
    });
    if (matching) continue;

    const conflictingOverlap = resolved.some((item) => {
      const filter = validRawSectorFilter(item);
      return Boolean(filter && typeof item.phrase === "string" && overlaps(item.phrase, match.phrase));
    });
    if (conflictingOverlap) continue;

    resolved = resolved.filter((item) => !(typeof item.phrase === "string" && overlaps(item.phrase, match.phrase)
      && (canonicalConcept(item.concept) === "sector" || Array.isArray(item.filters)
        && item.filters.some((raw) => (raw as { field?: unknown })?.field === "sector")
        || item.basis === "semantic" && (!Array.isArray(item.filters) || item.filters.length === 0)
          && isScopeOnlyVariant(item.phrase, match.phrase))));
    resolved.push({
      phrase: match.phrase,
      concept: "sector",
      basis: "semantic",
      filters: [{ field: "sector", op: match.op, value: match.sector }],
      reason: "Recovered from Parse's curated sector vocabulary.",
      [ONTOLOGY_BACKSTOP]: true,
    });
  }
  return resolved;
}

function sectorLexiconIssues(query: string, ledger: CriterionLedgerItem[]): Issue[] {
  const sectorItems = ledger.filter((item) => item.filters.some((filter) => filter.field === "sector"));
  const issues: Issue[] = [];
  for (const match of sectorLexiconIdentities(query)) {
    if (sectorItems.some((item) => item.filters.some((filter) => filter.field === "sector" && filter.op === match.op && filter.value === match.sector))) continue;
    const conflicting = sectorItems.find((item) => overlaps(item.phrase, match.phrase));
    issues.push({
      phrase: conflicting?.phrase ?? match.phrase,
      type: conflicting ? "incorrect" : "missing",
      reason: conflicting
        ? `The model's sector conflicts with the curated mapping for “${match.phrase}” (${match.sector}).`
        : `The sector scope “${match.phrase}” (${match.sector}) was not represented.`,
    });
  }
  return issues;
}

// This is deliberately vocabulary-agnostic: it detects content that never
// reached the ledger, but it does not decide what that content means.
const COVERAGE_GLUE = new Set([
  "a", "an", "and", "are", "be", "business", "businesses", "companies", "company", "find", "firm", "firms",
  "for", "give", "have", "i", "in", "is", "look", "looking", "me", "names", "of", "please", "screen", "shares",
  "show", "stock", "stocks", "that", "the", "their", "to", "trade", "trading", "want", "where", "with",
  "vendor", "vendors",
]);

type WordToken = { word: string; start: number; end: number };

function wordTokens(text: string): WordToken[] {
  const out: WordToken[] = [];
  const pattern = /[a-z0-9]+(?:[-'][a-z0-9]+)*/gi;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    out.push({ word: match[0].toLowerCase(), start: match.index, end: pattern.lastIndex });
  }
  return out;
}

function words(text: string): string[] {
  return wordTokens(text).map((token) => token.word);
}

function uncoveredInputIssues(query: string, ledger: CriterionLedgerItem[]): Issue[] {
  const covered = new Set(ledger.flatMap((item) => words(item.phrase)));
  const tokens = wordTokens(query);
  const boundaries = [-1];
  for (let index = 0; index < query.length; index++) if (query[index] === "," || query[index] === ";") boundaries.push(index);
  boundaries.push(query.length);
  const issues: Issue[] = [];
  for (let index = 0; index < boundaries.length - 1; index++) {
    const start = boundaries[index] + 1;
    const end = boundaries[index + 1];
    const missing = tokens.filter((token) => token.start >= start && token.end <= end && !COVERAGE_GLUE.has(token.word) && !covered.has(token.word));
    if (!missing.length) continue;
    const phrase = query.slice(missing[0].start, missing[missing.length - 1].end).trim();
    if (!issues.some((issue) => compact(issue.phrase) === compact(phrase))) issues.push({
      phrase,
      type: "missing",
      reason: "This content-bearing part of the original request did not reach the criterion ledger.",
    });
  }
  return issues;
}

function phraseRanges(query: string, ledger: CriterionLedgerItem[]): Array<{ start: number; end: number }> {
  const source = query.toLowerCase().replace(/[’]/g, "'");
  const ranges: Array<{ start: number; end: number }> = [];
  for (const item of ledger) {
    const phrase = item.phrase.toLowerCase().replace(/[’]/g, "'");
    for (let start = source.indexOf(phrase); start >= 0; start = source.indexOf(phrase, start + 1)) {
      ranges.push({ start, end: start + phrase.length });
    }
  }
  return ranges;
}

function clauseAround(query: string, start: number, end: number): string {
  const left = Math.max(query.lastIndexOf(",", start), query.lastIndexOf(";", start), query.lastIndexOf(".", start)) + 1;
  const candidates = [query.indexOf(",", end), query.indexOf(";", end), query.indexOf(".", end)].filter((index) => index >= 0);
  const right = candidates.length ? Math.min(...candidates) : query.length;
  return query.slice(left, right).trim();
}

const RANKING_INTENTS: Array<{ key: string; pattern: RegExp }> = [
  { key: "dividend", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?)\s+(?:by\s+)?(?:the\s+)?highest\s+(?:dividend\s+)?yield\b|\bhighest\s+(?:dividend\s+)?yield\s+first\b/i },
  { key: "quality", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?)\s+(?:by\s+)?(?:the\s+)?highest\s+(?:revenue\s+)?growth\b|\bhighest\s+(?:revenue\s+)?growth\s+first\b/i },
  { key: "value", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?|show)\s+(?:by\s+)?(?:the\s+)?(?:cheapest|lowest valuation)\b|\bcheapest\s+first\b/i },
  { key: "momentum", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?)\s+(?:by\s+)?(?:the\s+)?strongest\s+momentum\b|\bstrongest\s+momentum\s+first\b/i },
  { key: "decline", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?)\s+(?:by\s+)?(?:the\s+)?(?:most beaten[- ]down|biggest decline)\b|\b(?:most beaten[- ]down|biggest decline)\s+first\b/i },
  { key: "marketCap", pattern: /\b(?:rank(?:ed)?|sort(?:ed)?|order(?:ed)?)\s+(?:by\s+)?(?:the\s+)?(?:largest|market cap(?:italization)?)\b|\blargest\s+first\b/i },
];

function meaningfulCoverageIssues(query: string, ledger: CriterionLedgerItem[], ranking: string): Issue[] {
  const issues: Issue[] = [];
  const ranges = phraseRanges(query, ledger);
  const numbers = /-?\d+(?:\.\d+)?/g;
  for (let match = numbers.exec(query); match; match = numbers.exec(query)) {
    const covered = ranges.some((range) => match.index >= range.start && numbers.lastIndex <= range.end);
    if (covered) continue;
    const phrase = clauseAround(query, match.index, numbers.lastIndex);
    if (!issues.some((issue) => compact(issue.phrase) === compact(phrase))) issues.push({
      phrase,
      type: "missing",
      reason: "A stated numeric threshold did not reach the criterion ledger.",
    });
  }

  for (const intent of RANKING_INTENTS) {
    const match = intent.pattern.exec(query);
    if (!match || ranking === intent.key) continue;
    issues.push({ phrase: match[0], type: "incorrect", reason: `The requested ranking should be ${intent.key}.` });
  }

  const rankingPhrases = RANKING_INTENTS.flatMap((intent) => {
    const match = intent.pattern.exec(query);
    return match ? [match[0]] : [];
  });
  for (const gap of uncoveredInputIssues(query, ledger)) {
    const contentWords = words(gap.phrase).filter((word) => !COVERAGE_GLUE.has(word));
    if (contentWords.length < 3) continue;
    if (rankingPhrases.some((phrase) => overlaps(phrase, gap.phrase))) continue;
    if (!issues.some((issue) => overlaps(issue.phrase, gap.phrase))) issues.push({
      phrase: gap.phrase,
      type: "missing",
      reason: "A substantial meaning-bearing clause did not reach the criterion ledger.",
    });
  }
  return issues;
}

function rawFromLedger(item: CriterionLedgerItem): RawCriterion {
  const raw: RawCriterion = { phrase: item.phrase, concept: item.concept, basis: item.basis, filters: item.filters.map(({ field, op, value }) => ({ field, op, value })), reason: item.reason };
  if (item.resolution === "sector_ontology") raw[ONTOLOGY_BACKSTOP] = true;
  return raw;
}

function overlaps(a: string, b: string): boolean {
  const ca = compact(a), cb = compact(b);
  return ca.includes(cb) || cb.includes(ca);
}

function detectContractMismatches(query: string, rawCriteria: RawCriterion[]): ContractMismatch[] {
  const mismatches: ContractMismatch[] = [];
  for (const raw of rawCriteria) {
    const phrase = exactPhraseFromQuery(query, raw.phrase);
    const concept = canonicalConcept(raw.concept);
    if (!phrase || raw.basis !== "semantic" || !/\d/.test(phrase) || concept === "sector" || !FIELDS[concept]) continue;
    mismatches.push({
      phrase,
      type: "numeric_basis",
      reason: "The model labeled a stated-number criterion semantic instead of explicit; the compiler did not relax its grounding rules.",
    });
  }
  return mismatches;
}

function mergeRecovery(existing: CriterionLedgerItem[], issues: Issue[], recoveredRaw: RawCriterion[]): RawCriterion[] {
  const targetedRecovery = recoveredRaw.filter((raw) =>
    typeof raw.phrase === "string" && issues.some((issue) => overlaps(raw.phrase as string, issue.phrase)),
  );
  const kept = existing.filter((item) => {
    const replacedByBroaderDefault = DEFAULTS[item.concept] && targetedRecovery.some((raw) => {
      if (typeof raw.phrase !== "string" || canonicalConcept(raw.concept) !== item.concept || raw.basis !== "parse_default") return false;
      const existingPhrase = compact(item.phrase), recoveredPhrase = compact(raw.phrase);
      return recoveredPhrase !== existingPhrase && recoveredPhrase.includes(existingPhrase);
    });
    if (replacedByBroaderDefault) return false;
    return !issues.some((issue) => {
      if (!overlaps(item.phrase, issue.phrase)) return false;
      if (issue.type === "incorrect") return compact(item.phrase) === compact(issue.phrase);
      return item.status === "unresolved";
    });
  }).map(rawFromLedger);
  return [...kept, ...targetedRecovery];
}

function neutralizeIssues(existing: CriterionLedgerItem[], issues: Issue[]): RawCriterion[] {
  const raw = existing.filter((item) => !issues.some((issue) => overlaps(item.phrase, issue.phrase)
    && (item.status === "unresolved" || issue.type === "incorrect"))).map(rawFromLedger);
  for (const issue of issues) {
    if (!raw.some((item) => typeof item.phrase === "string" && compact(item.phrase) === compact(issue.phrase) && item.basis === "unresolved")) {
      raw.push({ phrase: issue.phrase, concept: "unknown", basis: "unresolved", filters: [], reason: issue.reason });
    }
  }
  return raw;
}

function resultStatus(compiled: ReturnType<typeof compileLedger>, recovered: boolean): "verified" | "recovered" | "needs_user_input" {
  if (compiled.ledger.some((i) => i.status === "unresolved")) return "needs_user_input";
  return recovered ? "recovered" : "verified";
}

export async function parseWithCriterionLedgerV2(query: string, completion: CompletionFn = complete): Promise<CriterionParseResult> {
  let llmCalls = 0;
  const extraction = extractJsonObject(await completion({ system: extractionSystem(), user: query, task: "criterion_ledger" }));
  llmCalls++;
  const rawCriteria: RawCriterion[] = Array.isArray(extraction.criteria) ? extraction.criteria : [];
  const contractMismatches = detectContractMismatches(query, rawCriteria);
  const extractedCriteria = applySectorLexiconBackstop(query, rawCriteria);
  let compiled = compileLedger(query, extractedCriteria);
  const ranking = typeof extraction.ranking === "string" && RANKINGS[extraction.ranking] ? extraction.ranking : "marketCap";
  const coverageTelemetry = uncoveredInputIssues(query, compiled.ledger).map((issue) => issue.phrase);
  const coverageIssues = normalizeIssues(query, extraction.coverage_issues);
  const firstIssues = combineIssues(coverageIssues, sectorLexiconIssues(query, compiled.ledger), meaningfulCoverageIssues(query, compiled.ledger, ranking), unresolvedIssues(compiled.ledger));
  if (!firstIssues.length) {
    return {
      filters: compiled.filters, ranking,
      interpretation: "Every identified investment criterion was accounted for by the original-input completeness audit and deterministic compiler.",
      assumptions: compiled.assumptions, ledger: compiled.ledger,
      audit: { status: "verified", issues: [], recoveryAttempted: false },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length, path: "normal", maxLlmCalls: 2, contractMismatches, coverageTelemetry },
    };
  }

  let recoveredRaw: RawCriterion[] = [];
  let recoveryCoverageIssues: Issue[] = [];
  try {
    const recovery = extractJsonObject(await completion({ system: recoverySystem(), user: `ORIGINAL REQUEST:\n${query}\n\nISSUES:\n${JSON.stringify(firstIssues)}`, task: "criterion_ledger" }));
    llmCalls++;
    recoveredRaw = Array.isArray(recovery.criteria) ? recovery.criteria : [];
    recoveryCoverageIssues = normalizeIssues(query, recovery.coverage_issues);
  } catch {
    const safe = compileLedger(query, neutralizeIssues(compiled.ledger, firstIssues));
    return {
      filters: safe.filters, ranking,
      interpretation: "A targeted recovery was required but did not complete; affected criteria were left out rather than guessed.",
      assumptions: [...safe.assumptions, "Parse could not complete the targeted verification call. Review the interpretation before running this screen."],
      ledger: safe.ledger,
      audit: { status: "unverified", issues: firstIssues, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: safe.ledger.length, accountedCriteria: safe.ledger.length, path: "fallback", maxLlmCalls: 2, contractMismatches, coverageTelemetry },
    };
  }

  compiled = compileLedger(query, applySectorLexiconBackstop(query, mergeRecovery(compiled.ledger, firstIssues, recoveredRaw)));

  const remaining = combineIssues(recoveryCoverageIssues, sectorLexiconIssues(query, compiled.ledger), meaningfulCoverageIssues(query, compiled.ledger, ranking), unresolvedIssues(compiled.ledger));
  if (remaining.length) {
    const safe = compileLedger(query, neutralizeIssues(compiled.ledger, remaining));
    return {
      filters: safe.filters, ranking,
      interpretation: "Some criteria still need your input after one recovery attempt; those criteria were left out rather than guessed.",
      assumptions: safe.assumptions, ledger: safe.ledger,
      audit: { status: "needs_user_input", issues: remaining, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: safe.ledger.length, accountedCriteria: safe.ledger.length, path: "fallback", maxLlmCalls: 2, contractMismatches, coverageTelemetry },
    };
  }

  const status = resultStatus(compiled, true);
  return {
    filters: compiled.filters, ranking,
    interpretation: status === "recovered" ? "Every investment criterion was accounted for after one targeted recovery attempt." : "Some criteria still need your input.",
    assumptions: compiled.assumptions, ledger: compiled.ledger,
    audit: { status, issues: firstIssues, recoveryAttempted: true },
    diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length, path: "fallback", maxLlmCalls: 2, contractMismatches, coverageTelemetry },
  };
}
