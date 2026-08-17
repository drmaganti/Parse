import { FIELDS, SECTORS, type Filter } from "./fields";
import { applyRefinement, findFilterConflict, sameFilter, type RefinementAction } from "./filter-ops";
import { complete } from "./llm";
import { coerceFilter, extractJsonObject } from "./parse-contract";

export interface CoverageScreen {
  filters: Filter[];
  ranking: string;
  interpretation: string;
  assumptions: string[];
  actions?: RefinementAction[];
}

type RecoveryBasis = "explicit" | "parse_default";

type AuditRecovery = {
  phrase?: unknown;
  basis?: unknown;
  concept?: unknown;
  action?: unknown;
  field?: unknown;
  op?: unknown;
  value?: unknown;
};

type AuditUnresolved = {
  phrase?: unknown;
  reason?: unknown;
  suggestedFields?: unknown;
};

export interface CoverageAudit {
  recoveries?: AuditRecovery[];
  unresolved?: AuditUnresolved[];
}

const DEFAULTS: Record<string, { field: string; op: string; value: number; phrase: RegExp }> = {
  profitable: { field: "operatingMargin", op: ">", value: 0, phrase: /\bprofitable\b|\bmaking money\b|\bin the black\b|\bpositive (?:earnings|net income)\b/i },
  low_debt: { field: "debtEquity", op: "<", value: 1, phrase: /\b(?:low|little|minimal|modest) debt\b|\blow leverage\b|\blightly leveraged\b|\bnot overleveraged\b|\bconservative leverage\b/i },
  high_roic: { field: "roic", op: ">", value: 15, phrase: /\b(?:high|strong|excellent|healthy)[- ]+roic\b/i },
  reasonable_valuation: { field: "pe", op: "<", value: 25, phrase: /\breasonable valuation\b|\breasonably valued\b|\bfair(?:ly)? valued\b|\bfair valuation\b|\bsensible valuation\b|\bnot expensive\b|\bnot too (?:pricey|pricy)\b|\bpriced reasonably\b|\bfair price\b/i },
  growth_stock: { field: "revGrowth", op: ">", value: 15, phrase: /\bgrowth (?:stocks?|companies|names)\b/i },
};

const SECTOR_MENTIONS: Record<string, RegExp> = {
  Technology: /\btechnology\b|\btech\b|\bsoftware\b|\bsemiconductors?\b|\bsemis\b/i,
  Healthcare: /\bhealth ?care\b|\bbiotech(?:nology)?\b|\bpharma(?:ceuticals?)?\b/i,
  Financials: /\bfinancials?\b|\bbanks?\b|\bbanking\b/i,
  Consumer: /\bconsumer\b/i,
  Energy: /\benergy\b/i,
  Industrials: /\bindustrials?\b/i,
  Communications: /\bcommunications?\b/i,
  Utilities: /\butility\b|\butilities\b/i,
  Materials: /\bmaterials?\b/i,
  "Real Estate": /\breal estate\b|\breits?\b/i,
};

function realModelKeyAvailable(): boolean {
  const provider = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
  const key = provider === "google" ? process.env.GOOGLE_API_KEY : process.env.GROQ_API_KEY;
  return Boolean(key && !/(?:placeholder|dummy|example|test[-_]?key)/i.test(key));
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function exactPhraseFromQuery(query: string, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const phrase = raw.trim();
  if (!phrase || phrase.length > 180) return null;
  return compact(query).includes(compact(phrase)) ? phrase : null;
}

function explicitValueAppears(phrase: string, value: number | string): boolean {
  if (typeof value === "number") {
    const escaped = String(value).replace(".", "\\.");
    return new RegExp(`(^|[^\\d.])${escaped}(?=$|[^\\d.])`).test(phrase);
  }
  return SECTOR_MENTIONS[String(value)]?.test(phrase) ?? false;
}

function isAllowedDefault(concept: unknown, phrase: string, filter: Filter): boolean {
  if (typeof concept !== "string") return false;
  const spec = DEFAULTS[concept];
  return Boolean(
    spec &&
    spec.phrase.test(phrase) &&
    filter.field === spec.field &&
    filter.op === spec.op &&
    Number(filter.value) === spec.value
  );
}

function unresolvedMessage(phrase: string, reason?: string, suggestedFields?: string[]): string {
  const why = reason?.trim() ? ` ${reason.trim()}` : "";
  const suggestions = suggestedFields?.length ? ` Possible indicators: ${suggestedFields.join(", ")}.` : "";
  return `Couldn’t confidently translate: “${phrase}”. I left this out of the screen rather than guess.${why}${suggestions}`;
}

function safeSuggestedFields(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && Boolean(FIELDS[x])))]
    .slice(0, 4)
    .map((key) => FIELDS[key].label);
}

function addAssumption(out: string[], message: string) {
  if (!out.includes(message)) out.push(message);
}

export function applyCoverageAudit(
  query: string,
  screen: CoverageScreen,
  audit: CoverageAudit,
  isRefine: boolean
): CoverageScreen {
  let filters = [...screen.filters];
  const actions = [...(screen.actions ?? [])];
  const assumptions = [...screen.assumptions];
  const unresolved = new Map<string, string>();

  for (const item of audit.recoveries ?? []) {
    const phrase = exactPhraseFromQuery(query, item.phrase);
    if (!phrase) continue;
    const basis = item.basis as RecoveryBasis;
    if (basis !== "explicit" && basis !== "parse_default") {
      unresolved.set(compact(phrase), unresolvedMessage(phrase));
      continue;
    }

    const filter = coerceFilter({ field: item.field, op: item.op, value: item.value });
    if (!filter) {
      unresolved.set(compact(phrase), unresolvedMessage(phrase));
      continue;
    }

    const grounded = basis === "parse_default"
      ? isAllowedDefault(item.concept, phrase, filter)
      : explicitValueAppears(phrase, filter.value);
    if (!grounded) {
      unresolved.set(compact(phrase), unresolvedMessage(phrase));
      continue;
    }

    if (filters.some((existing) => sameFilter(existing, filter))) continue;

    if (isRefine) {
      const requestedAction = item.action === "replace" ? "replace" : "add";
      const replaceAllowed = /\b(?:change|set|replace|instead)\b/i.test(query);
      const action: RefinementAction = {
        type: requestedAction === "replace" && replaceAllowed ? "replace" : "add",
        field: filter.field,
        op: filter.op,
        value: filter.value,
      };
      const candidate = applyRefinement(filters, [action], "ai");
      if (findFilterConflict(candidate)) {
        unresolved.set(compact(phrase), unresolvedMessage(phrase, "The recovered interpretation would conflict with the current screen."));
        continue;
      }
      filters = candidate;
      actions.push(action);
    } else {
      const candidate = [...filters, filter];
      if (findFilterConflict(candidate)) {
        unresolved.set(compact(phrase), unresolvedMessage(phrase, "The recovered interpretation would conflict with another criterion."));
        continue;
      }
      filters = candidate;
    }

    addAssumption(
      assumptions,
      `Recovered “${phrase}” during the final coverage check as ${FIELDS[filter.field].label} ${filter.op} ${filter.value}${FIELDS[filter.field].unit === "%" ? "%" : ""}.`
    );
  }

  for (const item of audit.unresolved ?? []) {
    const phrase = exactPhraseFromQuery(query, item.phrase);
    if (!phrase) continue;
    const suggestions = safeSuggestedFields(item.suggestedFields);
    const reason = typeof item.reason === "string" ? item.reason : undefined;
    unresolved.set(compact(phrase), unresolvedMessage(phrase, reason, suggestions));
  }

  for (const message of unresolved.values()) addAssumption(assumptions, message);

  return {
    ...screen,
    filters,
    actions: isRefine ? actions : screen.actions,
    assumptions,
  };
}

function auditSystem(): string {
  const fieldVocab = Object.values(FIELDS).map((f) => `${f.key}=${f.label}`).join("; ");
  return [
    "You are the final semantic coverage auditor for a stock screener.",
    "Your only job is to find meaningful investment criteria in the ORIGINAL user request that are not already accounted for by either an existing filter or an existing assumption/explanation.",
    "Do not re-parse or rewrite criteria that are already accounted for. Do not change existing filters.",
    `Supported fields: ${fieldVocab}. Valid sectors: ${SECTORS.join(", ")}.`,
    "For a missed criterion, use a recovery only when the mapping is one-to-one and high confidence.",
    "An explicit recovery must copy a numeric threshold or sector directly from the exact missed phrase. Never invent or move a number from another phrase.",
    "A parse_default recovery is allowed only for these documented concepts and exact defaults: profitable=>operatingMargin >0; low_debt=>debtEquity <1; high_roic=>roic >15; reasonable_valuation=>pe <25; growth_stock=>revGrowth >15.",
    "For refinement requests, action may be add or replace. Use replace only if the original request explicitly says change/set/replace/instead.",
    "If a criterion is ambiguous, unsupported, or cannot be grounded safely, put it in unresolved instead of recovery.",
    "phrase MUST be an exact contiguous substring copied from the original request.",
    "Return only JSON with recoveries and unresolved arrays. If nothing is missing, return both arrays empty.",
    'Schema: {"recoveries":[{"phrase":"exact text","basis":"explicit|parse_default","concept":"optional_default_key","action":"add|replace","field":"fieldKey","op":"<|<=|>|>=|==|!=|in","value":12}],"unresolved":[{"phrase":"exact text","reason":"short user-facing reason","suggestedFields":["fieldKey"]}]}',
  ].join(" ");
}

export async function reconcileCoverage(
  query: string,
  screen: CoverageScreen,
  isRefine: boolean
): Promise<CoverageScreen> {
  if (!realModelKeyAvailable()) return screen;

  try {
    const current = {
      filters: screen.filters.map(({ field, op, value }) => ({ field, op, value })),
      assumptions: screen.assumptions,
      actions: isRefine ? screen.actions ?? [] : undefined,
    };
    const raw = await complete({
      system: auditSystem(),
      user: `ORIGINAL REQUEST:\n${query}\n\nALREADY ACCOUNTED FOR:\n${JSON.stringify(current)}`,
    });
    const parsed = extractJsonObject(raw) as CoverageAudit;
    return applyCoverageAudit(query, screen, parsed, isRefine);
  } catch {
    return screen;
  }
}
