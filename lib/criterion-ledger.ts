import { FIELDS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { complete } from "./llm";
import { coerceFilter, extractJsonObject } from "./parse-contract";
import { findFilterConflict, sameFilter } from "./filter-ops";

type CriterionBasis = "explicit" | "semantic" | "parse_default" | "unsupported" | "unresolved";
type CriterionStatus = "mapped" | "defaulted" | "unsupported" | "unresolved";

type RawCriterion = {
  phrase?: unknown;
  concept?: unknown;
  basis?: unknown;
  filters?: unknown;
  reason?: unknown;
};

type AuditIssue = {
  phrase?: unknown;
  type?: unknown;
  reason?: unknown;
};

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
  issues: Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }>;
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
  };
}

const DEFAULTS: Record<string, { field: string; op: Op; value: number; assumption: (phrase: string) => string }> = {
  profitable: {
    field: "operatingMargin", op: ">", value: 0,
    assumption: (phrase) => `Read “${phrase}” as Operating margin > 0% using Parse's documented profitability default.`,
  },
  low_debt: {
    field: "debtEquity", op: "<", value: 1,
    assumption: (phrase) => `Read “${phrase}” as Debt / equity < 1 using Parse's documented low-debt default.`,
  },
  high_roic: {
    field: "roic", op: ">", value: 15,
    assumption: (phrase) => `Read “${phrase}” as ROIC > 15% using Parse's documented high-ROIC default.`,
  },
  reasonable_valuation: {
    field: "pe", op: "<", value: 25,
    assumption: (phrase) => `Read “${phrase}” as P/E < 25 using Parse's documented reasonable-valuation default.`,
  },
  growth_stock: {
    field: "revGrowth", op: ">", value: 15,
    assumption: (phrase) => `Read “${phrase}” as Revenue growth > 15% using Parse's documented growth-stock default.`,
  },
};

function compact(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
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

function isRangePhrase(phrase: string): boolean {
  return /\bbetween\b[^\d-]*-?\d+(?:\.\d+)?\s*%?\s*(?:and|to)\s*-?\d+(?:\.\d+)?|\bfrom\b[^\d-]*-?\d+(?:\.\d+)?\s*%?\s*(?:to|through)\s*-?\d+(?:\.\d+)?/i.test(phrase);
}

function operatorConsistent(phrase: string, op: Op, value: number, filterCount: number): boolean {
  if (filterCount === 2 && isRangePhrase(phrase) && (op === ">=" || op === "<=")) return true;
  if (op === ">") return /\b(?:more than|greater than|over|above|north of)\b|(^|\s)>\s*/i.test(phrase);
  if (op === ">=") return /\b(?:at least|no less than|minimum|min)\b|>=|\d+(?:\.\d+)?\s*%?\s*\+/i.test(phrase);
  if (op === "<") return /\b(?:less than|lower than|under|below)\b|(^|\s)<\s*/i.test(phrase);
  if (op === "<=") return /\b(?:at most|no more than|maximum|max)\b|<=/i.test(phrase);
  if (op === "==") return numberAppears(phrase, value);
  return false;
}

function safeSemanticNumeric(phrase: string, filter: Filter): boolean {
  return filter.field === "revGrowth"
    && filter.op === ">="
    && Number(filter.value) === 10
    && /\bdouble[- ]digit(?:s)?\b/i.test(phrase);
}

function groundedFilters(phrase: string, basis: CriterionBasis, rawFilters: unknown): Filter[] | null {
  if (!Array.isArray(rawFilters) || rawFilters.length === 0 || rawFilters.length > 4) return null;
  const out: Filter[] = [];

  for (const raw of rawFilters) {
    const filter = coerceFilter(raw);
    if (!filter) return null;

    if (FIELDS[filter.field].kind === "num") {
      const numeric = Number(filter.value);
      if (basis === "explicit") {
        if (!numberAppears(phrase, numeric) || !operatorConsistent(phrase, filter.op, numeric, rawFilters.length)) return null;
      } else if (basis === "semantic") {
        if (!safeSemanticNumeric(phrase, filter)) return null;
      } else {
        return null;
      }
    } else {
      if (filter.field !== "sector" || (basis !== "explicit" && basis !== "semantic")) return null;
    }

    if (!out.some((existing) => sameFilter(existing, filter))) out.push(filter);
  }

  if (out.length === 2 && isRangePhrase(phrase)) {
    const values = out.map((f) => Number(f.value));
    if (!out.some((f) => f.op === ">=") || !out.some((f) => f.op === "<=")) return null;
    if (!values.every((v) => numberAppears(phrase, v))) return null;
  }

  return out;
}

function unresolvedMessage(phrase: string, reason?: string): string {
  const why = reason?.trim() ? ` ${reason.trim()}` : "";
  return `Couldn’t confidently translate: “${phrase}”. I left this out of the screen rather than guess.${why}`;
}

function compileCriterion(query: string, raw: RawCriterion): { item: CriterionLedgerItem; assumption?: string } | null {
  const phrase = exactPhraseFromQuery(query, raw.phrase);
  if (!phrase) return null;
  const concept = typeof raw.concept === "string" ? raw.concept.trim() : "unknown";
  const basis = raw.basis as CriterionBasis;
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : undefined;

  if (basis === "unsupported") {
    return { item: { phrase, concept, basis, status: "unsupported", filters: [], reason } };
  }
  if (basis === "unresolved") {
    return { item: { phrase, concept, basis, status: "unresolved", filters: [], reason }, assumption: unresolvedMessage(phrase, reason) };
  }
  if (basis === "parse_default") {
    const spec = DEFAULTS[concept];
    if (!spec) {
      return {
        item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: "That concept does not have a documented Parse default." },
        assumption: unresolvedMessage(phrase, "That concept does not have a documented Parse default."),
      };
    }
    const filter = coerceFilter({ field: spec.field, op: spec.op, value: spec.value }, "default");
    if (!filter) return null;
    return {
      item: { phrase, concept, basis, status: "defaulted", filters: [filter] },
      assumption: spec.assumption(phrase),
    };
  }
  if (basis === "explicit" || basis === "semantic") {
    const filters = groundedFilters(phrase, basis, raw.filters);
    if (!filters) {
      const why = basis === "explicit"
        ? "The proposed filter could not be grounded to the exact number/operator in your wording."
        : "The semantic mapping was not one of Parse's deterministically allowed mappings.";
      return {
        item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: why },
        assumption: unresolvedMessage(phrase, why),
      };
    }
    return { item: { phrase, concept, basis, status: "mapped", filters } };
  }

  return {
    item: { phrase, concept, basis: "unresolved", status: "unresolved", filters: [], reason: "The interpretation basis was invalid." },
    assumption: unresolvedMessage(phrase, "The interpretation basis was invalid."),
  };
}

function compileLedger(query: string, rawCriteria: RawCriterion[]): { ledger: CriterionLedgerItem[]; filters: Filter[]; assumptions: string[] } {
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
        const reason = "That interpretation conflicts with another criterion in the same request.";
        item = { ...item, basis: "unresolved", status: "unresolved", filters: [], reason };
        assumptions.push(unresolvedMessage(item.phrase, reason));
      } else {
        filters.splice(0, filters.length, ...candidate);
      }
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
  return Object.values(FIELDS)
    .map((f) => `${f.key}=${f.label}${f.unit ? ` (${f.unit})` : ""}`)
    .join("; ");
}

function extractionSystem(): string {
  return [
    "You extract an investor's screening requirements into a criterion ledger. Do NOT directly execute a stock screen.",
    "Identify EVERY meaningful investment criterion in the original request exactly once. Do not silently omit unfamiliar wording.",
    "Each phrase must be an exact contiguous substring copied from the original request.",
    `Supported fields: ${fieldVocab()}. Valid sectors: ${SECTORS.join(", ")}.`,
    "For explicit numeric criteria, basis=explicit and propose the exact supported field/operator/value. Copy numbers exactly. A range uses two filters on the same field.",
    "Industry language may map semantically to one valid sector with basis=semantic and a sector filter, e.g. chipmakers=>Technology, drug makers=>Healthcare, lenders=>Financials, oil and gas=>Energy, SaaS=>Technology.",
    "The only allowed qualitative Parse defaults are: profitable=>operatingMargin >0; low_debt=>debtEquity <1; high_roic=>roic >15; reasonable_valuation=>pe <25; growth_stock=>revGrowth >15. Use basis=parse_default and the exact concept key. Do not invent other defaults.",
    "Unambiguous 'double-digit' revenue/sales growth may use basis=semantic with revGrowth >=10. Other semantic numeric thresholds are not allowed.",
    "If a meaningful criterion is unsupported, basis=unsupported with a short reason and no filters. If it is ambiguous (for example 'strong margins' without a metric/threshold), basis=unresolved with a short reason and no filters.",
    "Do not combine separate requirements into one criterion except the two bounds of one numeric range.",
    `Ranking, if explicitly requested, must be one of: ${Object.keys(RANKINGS).join(", ")}; otherwise use null.`,
    'Return only JSON: {"criteria":[{"phrase":"exact text","concept":"field_or_default_concept","basis":"explicit|semantic|parse_default|unsupported|unresolved","filters":[{"field":"revGrowth","op":">","value":12}],"reason":"optional"}],"ranking":null}',
  ].join(" ");
}

function auditSystem(): string {
  return [
    "You are an independent semantic coverage auditor for a stock screener.",
    "Compare the ORIGINAL request against the criterion ledger AND final filters.",
    "Find any meaningful investment criterion that is missing or incorrectly represented. Incorrect includes wrong field, wrong operator, wrong explicit number/range, or a criterion marked accounted when its final filter does not match it.",
    "A criterion marked unsupported or unresolved is considered accounted for if its source phrase is present in the ledger.",
    "Documented Parse defaults are valid when the ledger explicitly marks basis=parse_default.",
    "Do not invent new requirements and do not complain about wording/style.",
    "For every issue, phrase must be an exact contiguous substring from the original request and should be the smallest phrase that identifies the missed/incorrect criterion.",
    'Return only JSON: {"issues":[{"phrase":"exact text","type":"missing|incorrect","reason":"short reason"}]}',
  ].join(" ");
}

function recoverySystem(): string {
  return [
    extractionSystem(),
    "This is a single bounded recovery attempt. Re-extract ONLY the listed missing/incorrect phrases. Do not revisit criteria that were not listed as issues.",
    "Return one corrected criterion per issue phrase (a numeric range may contain two filters).",
  ].join(" ");
}

function normalizeIssues(query: string, raw: unknown): Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }> = [];
  for (const item of raw as AuditIssue[]) {
    const phrase = exactPhraseFromQuery(query, item.phrase);
    if (!phrase) continue;
    const type = item.type === "incorrect" ? "incorrect" : item.type === "missing" ? "missing" : null;
    if (!type) continue;
    const reason = typeof item.reason === "string" && item.reason.trim() ? item.reason.trim() : "This criterion was not fully accounted for.";
    if (!out.some((x) => compact(x.phrase) === compact(phrase) && x.type === type)) out.push({ phrase, type, reason });
  }
  return out;
}

function rawFromLedger(item: CriterionLedgerItem): RawCriterion {
  return {
    phrase: item.phrase,
    concept: item.concept,
    basis: item.basis,
    filters: item.filters.map(({ field, op, value }) => ({ field, op, value })),
    reason: item.reason,
  };
}

function overlaps(a: string, b: string): boolean {
  const ca = compact(a);
  const cb = compact(b);
  return ca.includes(cb) || cb.includes(ca);
}

function mergeRecovery(existing: CriterionLedgerItem[], issues: Array<{ phrase: string }>, recoveredRaw: RawCriterion[]): RawCriterion[] {
  const kept = existing.filter((item) => !issues.some((issue) => overlaps(item.phrase, issue.phrase))).map(rawFromLedger);
  return [...kept, ...recoveredRaw];
}

function neutralizeRemainingIssues(
  existing: CriterionLedgerItem[],
  issues: Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }>
): RawCriterion[] {
  const raw = existing.filter((item) => !issues.some((issue) => overlaps(item.phrase, issue.phrase))).map(rawFromLedger);
  for (const issue of issues) {
    raw.push({ phrase: issue.phrase, concept: "unresolved", basis: "unresolved", filters: [], reason: issue.reason });
  }
  return raw;
}

async function runAudit(
  query: string,
  ledger: CriterionLedgerItem[],
  filters: Filter[]
): Promise<Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }>> {
  const raw = await complete({
    system: auditSystem(),
    user: `ORIGINAL REQUEST:\n${query}\n\nCRITERION LEDGER:\n${JSON.stringify(ledger.map((item) => ({ phrase: item.phrase, concept: item.concept, basis: item.basis, status: item.status, filters: item.filters.map(({ field, op, value }) => ({ field, op, value })), reason: item.reason })))}\n\nFINAL FILTERS:\n${JSON.stringify(filters.map(({ field, op, value }) => ({ field, op, value })))}`,
  });
  const parsed = extractJsonObject(raw);
  return normalizeIssues(query, parsed.issues);
}

export async function parseWithCriterionLedger(query: string): Promise<CriterionParseResult> {
  let llmCalls = 0;
  const extractionText = await complete({ system: extractionSystem(), user: query });
  llmCalls++;
  const extraction = extractJsonObject(extractionText);
  const rawCriteria: RawCriterion[] = Array.isArray(extraction.criteria) ? extraction.criteria : [];
  let compiled = compileLedger(query, rawCriteria);
  const requestedRanking = typeof extraction.ranking === "string" && RANKINGS[extraction.ranking] ? extraction.ranking : "marketCap";

  let firstIssues: Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }>;
  try {
    firstIssues = await runAudit(query, compiled.ledger, compiled.filters);
    llmCalls++;
  } catch {
    const assumptions = [...compiled.assumptions, "Parse could not complete its final semantic verification. Review the interpretation before running this screen."];
    return {
      filters: compiled.filters,
      ranking: requestedRanking,
      interpretation: "Interpreted the request, but final semantic verification did not complete.",
      assumptions,
      ledger: compiled.ledger,
      audit: { status: "unverified", issues: [], recoveryAttempted: false },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  if (firstIssues.length === 0) {
    return {
      filters: compiled.filters,
      ranking: requestedRanking,
      interpretation: "Every identified investment criterion was accounted for and independently verified.",
      assumptions: compiled.assumptions,
      ledger: compiled.ledger,
      audit: { status: "verified", issues: [], recoveryAttempted: false },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  let recoveredRaw: RawCriterion[] = [];
  try {
    const recoveryText = await complete({
      system: recoverySystem(),
      user: `ORIGINAL REQUEST:\n${query}\n\nAUDIT ISSUES TO RECOVER:\n${JSON.stringify(firstIssues)}`,
    });
    llmCalls++;
    const recovery = extractJsonObject(recoveryText);
    recoveredRaw = Array.isArray(recovery.criteria) ? recovery.criteria : [];
  } catch {
    recoveredRaw = [];
  }

  const mergedRaw = mergeRecovery(compiled.ledger, firstIssues, recoveredRaw);
  compiled = compileLedger(query, mergedRaw);

  let secondIssues: Array<{ phrase: string; type: "missing" | "incorrect"; reason: string }>;
  try {
    secondIssues = await runAudit(query, compiled.ledger, compiled.filters);
    llmCalls++;
  } catch {
    const assumptions = [...compiled.assumptions, "Parse could not verify the targeted recovery attempt. Review the interpretation before running this screen."];
    return {
      filters: compiled.filters,
      ranking: requestedRanking,
      interpretation: "A recovery was attempted, but final verification did not complete.",
      assumptions,
      ledger: compiled.ledger,
      audit: { status: "unverified", issues: firstIssues, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  if (secondIssues.length === 0) {
    return {
      filters: compiled.filters,
      ranking: requestedRanking,
      interpretation: "Every investment criterion was accounted for after one targeted recovery attempt.",
      assumptions: compiled.assumptions,
      ledger: compiled.ledger,
      audit: { status: "recovered", issues: firstIssues, recoveryAttempted: true },
      diagnostics: { llmCalls, identifiedCriteria: compiled.ledger.length, accountedCriteria: compiled.ledger.length },
    };
  }

  const safeRaw = neutralizeRemainingIssues(compiled.ledger, secondIssues);
  const safe = compileLedger(query, safeRaw);
  return {
    filters: safe.filters,
    ranking: requestedRanking,
    interpretation: "Some criteria still need your input after one recovery attempt; those criteria were left out rather than guessed.",
    assumptions: safe.assumptions,
    ledger: safe.ledger,
    audit: { status: "needs_user_input", issues: secondIssues, recoveryAttempted: true },
    diagnostics: { llmCalls, identifiedCriteria: safe.ledger.length, accountedCriteria: safe.ledger.length },
  };
}
