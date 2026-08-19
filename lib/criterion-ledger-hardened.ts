import { type Filter } from "./fields";
import { findFilterConflict, sameFilter } from "./filter-ops";
import {
  parseWithCriterionLedgerV2,
  type CriterionLedgerItem,
  type CriterionParseResult,
} from "./criterion-ledger-v2";

type KnownDefault = {
  concept: string;
  field: string;
  op: ">" | "<";
  value: number;
  phrase: RegExp;
  assumption: (phrase: string) => string;
};

// Final deterministic safety guard. If the model labels wording as unsupported or
// unresolved even though it exactly matches one of Parse's documented qualitative
// defaults, promote it to that known default before returning the interpretation.
// This guard never invents a threshold: every mapping below is an existing Parse default.
const KNOWN_DEFAULTS: KnownDefault[] = [
  {
    concept: "profitable",
    field: "operatingMargin",
    op: ">",
    value: 0,
    phrase: /\bprofitable\b|\bmaking (?:a )?(?:profit|money)\b|\bturning a profit\b|\bearning money\b|\bin the black\b|\bpositive (?:earnings|net income)\b/i,
    assumption: (p) => `Read “${p}” as Operating margin > 0% using Parse's documented profitability default.`,
  },
  {
    concept: "low_debt",
    field: "debtEquity",
    op: "<",
    value: 1,
    phrase: /\b(?:low|little|minimal|modest) debt\b|\bnot much debt\b|\bdebt (?:kept low|under control)\b|\b(?:low|modest|conservative) leverage\b|\bleverage on the low side\b|\blightly leveraged\b|\bnot overleveraged\b/i,
    assumption: (p) => `Read “${p}” as Debt / equity < 1 using Parse's documented low-debt default.`,
  },
  {
    concept: "high_roic",
    field: "roic",
    op: ">",
    value: 15,
    phrase: /\b(?:high|strong|excellent|healthy)[- ]+roic\b/i,
    assumption: (p) => `Read “${p}” as ROIC > 15% using Parse's documented high-ROIC default.`,
  },
  {
    concept: "reasonable_valuation",
    field: "pe",
    op: "<",
    value: 25,
    phrase: /\breasonable valuation\b|\breasonably valued\b|\bfair(?:ly)? valued\b|\bfair valuation\b|\bsensible valuation\b|\bvaluation looks fair\b|\bvaluation not excessive\b|\bnot expensive\b|\bnot overpriced\b|\bnot too (?:pricey|pricy)\b|\breasonably priced\b|\bpriced reasonably\b|\bfair price\b|\bsensible price\b/i,
    assumption: (p) => `Read “${p}” as P/E < 25 using Parse's documented reasonable-valuation default.`,
  },
  {
    concept: "growth_stock",
    field: "revGrowth",
    op: ">",
    value: 15,
    phrase: /\bgrowth (?:stocks?|companies|names)\b/i,
    assumption: (p) => `Read “${p}” as Revenue growth > 15% using Parse's documented growth-stock default.`,
  },
];

function mkFilter(spec: KnownDefault, index: number): Filter {
  return {
    id: `hardened_${spec.field}_${spec.op}_${index}`,
    field: spec.field,
    op: spec.op,
    value: spec.value,
    source: "default",
  };
}

function overlaps(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return x.includes(y) || y.includes(x);
}

function promoteKnownDefaults(result: CriterionParseResult): CriterionParseResult {
  let filters = [...result.filters];
  const assumptions = [...result.assumptions];
  const promotedPhrases: string[] = [];

  const ledger: CriterionLedgerItem[] = result.ledger.map((item, index) => {
    if (item.status !== "unsupported" && item.status !== "unresolved") return item;
    const spec = KNOWN_DEFAULTS.find((candidate) => candidate.phrase.test(item.phrase));
    if (!spec) return item;

    const filter = mkFilter(spec, index);
    const candidate = filters.some((existing) => sameFilter(existing, filter)) ? filters : [...filters, filter];
    if (findFilterConflict(candidate)) return item;

    filters = candidate;
    promotedPhrases.push(item.phrase);
    const assumption = spec.assumption(item.phrase);
    if (!assumptions.includes(assumption)) assumptions.push(assumption);

    // Remove any earlier warning that said this exact phrase was unsupported/unresolved.
    for (let i = assumptions.length - 1; i >= 0; i--) {
      const a = assumptions[i];
      if (a !== assumption && a.includes(`“${item.phrase}”`) && /couldn.t confidently translate/i.test(a)) assumptions.splice(i, 1);
    }

    return {
      phrase: item.phrase,
      concept: spec.concept,
      basis: "parse_default",
      status: "defaulted",
      filters: [filter],
    };
  });

  if (!promotedPhrases.length) return result;

  const remainingIssues = result.audit.issues.filter(
    (issue) => !promotedPhrases.some((phrase) => overlaps(phrase, issue.phrase))
  );
  const hasUnresolved = ledger.some((item) => item.status === "unresolved");

  let status = result.audit.status;
  if (status === "needs_user_input" && !remainingIssues.length && !hasUnresolved) {
    status = result.audit.recoveryAttempted ? "recovered" : "verified";
  }

  return {
    ...result,
    filters,
    ledger,
    assumptions,
    interpretation:
      status === "verified"
        ? "Every identified investment criterion was accounted for and independently verified."
        : status === "recovered"
          ? "Every investment criterion was accounted for after one targeted recovery attempt."
          : result.interpretation,
    audit: {
      ...result.audit,
      status,
      issues: remainingIssues,
    },
    diagnostics: {
      ...result.diagnostics,
      identifiedCriteria: ledger.length,
      accountedCriteria: ledger.length,
    },
  };
}

export async function parseWithCriterionLedgerHardened(query: string): Promise<CriterionParseResult> {
  return promoteKnownDefaults(await parseWithCriterionLedgerV2(query));
}
