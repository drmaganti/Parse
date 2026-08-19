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

const KNOWN_DEFAULTS: KnownDefault[] = [
  {
    concept: "profitable", field: "operatingMargin", op: ">", value: 0,
    phrase: /\bprofitable\b|\bmaking (?:a )?(?:profit|money)\b|\bturning a profit\b|\bearning money\b|\bin the black\b|\bpositive (?:earnings|net income)\b/i,
    assumption: (p) => `Read “${p}” as Operating margin > 0% using Parse's documented profitability default.`,
  },
  {
    concept: "low_debt", field: "debtEquity", op: "<", value: 1,
    phrase: /\b(?:low|little|minimal|modest) debt\b|\bnot much debt\b|\bdebt (?:kept low|under control)\b|\b(?:low|modest|conservative) leverage\b|\bleverage on the low side\b|\blightly leveraged\b|\bnot overleveraged\b/i,
    assumption: (p) => `Read “${p}” as Debt / equity < 1 using Parse's documented low-debt default.`,
  },
  {
    concept: "high_roic", field: "roic", op: ">", value: 15,
    phrase: /\b(?:high|strong|excellent|healthy)[- ]+roic\b/i,
    assumption: (p) => `Read “${p}” as ROIC > 15% using Parse's documented high-ROIC default.`,
  },
  {
    concept: "reasonable_valuation", field: "pe", op: "<", value: 25,
    phrase: /\breasonable valuation\b|\breasonably valued\b|\bfair(?:ly)? valued\b|\bfair valuation\b|\bsensible valuation\b|\bvaluation looks fair\b|\bvaluation not excessive\b|\bnot expensive\b|\bnot overpriced\b|\bnot too (?:pricey|pricy)\b|\breasonably priced\b|\bpriced reasonably\b|\bfair price\b|\bsensible price\b/i,
    assumption: (p) => `Read “${p}” as P/E < 25 using Parse's documented reasonable-valuation default.`,
  },
  {
    concept: "growth_stock", field: "revGrowth", op: ">", value: 15,
    phrase: /\bgrowth (?:stocks?|companies|names)\b/i,
    assumption: (p) => `Read “${p}” as Revenue growth > 15% using Parse's documented growth-stock default.`,
  },
];

const KNOWN_SECTORS: Array<{ sector: string; phrase: RegExp }> = [
  { sector: "Technology", phrase: /\btech(?:nology)?\b|\bsoftware\b|\bsaas\b|software[- ]as[- ]a[- ]service|\bsemiconductors?\b|\bsemis\b|\bchipmakers?\b|\bchip makers?\b/i },
  { sector: "Healthcare", phrase: /\bhealth ?care\b|\bbiotech(?:nology)?\b|\bpharma(?:ceuticals?)?\b|\bdrug makers?\b|\bdrugmakers?\b/i },
  { sector: "Financials", phrase: /\bfinancials?\b|\bbanks?\b|\bbanking\b|\blenders?\b/i },
  { sector: "Consumer", phrase: /\bconsumer\b|\bretail(?:ers?)?\b/i },
  { sector: "Energy", phrase: /\benergy\b|\boil\s*(?:and|&)\s*gas\b/i },
  { sector: "Industrials", phrase: /\bindustrials?\b/i },
  { sector: "Communications", phrase: /\bcommunications?\b|\bcommunication[- ]services?\b|\btelecom(?:munications?)?\b/i },
  { sector: "Utilities", phrase: /\butilities\b|\butility\b|\bpower utilities\b/i },
  { sector: "Materials", phrase: /\bmaterials?\b|\bbasic materials\b/i },
  { sector: "Real Estate", phrase: /\breal estate\b|\breits?\b|\bproperty reits?\b/i },
];

function mkDefaultFilter(spec: KnownDefault, index: number): Filter {
  return { id: `hardened_${spec.field}_${spec.op}_${index}`, field: spec.field, op: spec.op, value: spec.value, source: "default" };
}

function mkSectorFilter(sector: string, index: number): Filter {
  return { id: `hardened_sector_${index}`, field: "sector", op: "==", value: sector, source: "ai" };
}

function overlaps(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return x.includes(y) || y.includes(x);
}

function removeWarning(assumptions: string[], phrase: string, keep?: string) {
  for (let i = assumptions.length - 1; i >= 0; i--) {
    const a = assumptions[i];
    if (a !== keep && a.includes(`“${phrase}”`) && /couldn.t confidently translate/i.test(a)) assumptions.splice(i, 1);
  }
}

function dedupeLedger(items: CriterionLedgerItem[]): CriterionLedgerItem[] {
  const out: CriterionLedgerItem[] = [];
  for (const item of items) {
    const key = `${item.phrase.toLowerCase().trim()}|${item.concept}|${item.status}|${item.filters.map((f) => `${f.field}:${f.op}:${String(f.value)}`).sort().join(",")}`;
    if (!out.some((x) => `${x.phrase.toLowerCase().trim()}|${x.concept}|${x.status}|${x.filters.map((f) => `${f.field}:${f.op}:${String(f.value)}`).sort().join(",")}` === key)) out.push(item);
  }
  return out;
}

function promoteDeterministicKnowledge(result: CriterionParseResult): CriterionParseResult {
  let filters = [...result.filters];
  const assumptions = [...result.assumptions];
  const promotedPhrases: string[] = [];

  let ledger: CriterionLedgerItem[] = result.ledger.map((item, index) => {
    if (item.status !== "unsupported" && item.status !== "unresolved") return item;

    const sectorHits = KNOWN_SECTORS.filter((candidate) => candidate.phrase.test(item.phrase));
    if (sectorHits.length === 1) {
      const filter = mkSectorFilter(sectorHits[0].sector, index);
      const candidate = filters.some((existing) => sameFilter(existing, filter)) ? filters : [...filters, filter];
      if (!findFilterConflict(candidate)) {
        filters = candidate;
        promotedPhrases.push(item.phrase);
        removeWarning(assumptions, item.phrase);
        return { phrase: item.phrase, concept: "sector", basis: "semantic", status: "mapped", filters: [filter] };
      }
    }

    const spec = KNOWN_DEFAULTS.find((candidate) => candidate.phrase.test(item.phrase));
    if (!spec) return item;
    const filter = mkDefaultFilter(spec, index);
    const candidate = filters.some((existing) => sameFilter(existing, filter)) ? filters : [...filters, filter];
    if (findFilterConflict(candidate)) return item;

    filters = candidate;
    promotedPhrases.push(item.phrase);
    const assumption = spec.assumption(item.phrase);
    if (!assumptions.includes(assumption)) assumptions.push(assumption);
    removeWarning(assumptions, item.phrase, assumption);
    return { phrase: item.phrase, concept: spec.concept, basis: "parse_default", status: "defaulted", filters: [filter] };
  });

  ledger = dedupeLedger(ledger);
  if (!promotedPhrases.length && ledger.length === result.ledger.length) return result;

  const remainingIssues = result.audit.issues.filter((issue) => !promotedPhrases.some((phrase) => overlaps(phrase, issue.phrase)));
  const hasUnresolved = ledger.some((item) => item.status === "unresolved");
  let status = result.audit.status;
  if (status === "needs_user_input" && !remainingIssues.length && !hasUnresolved) status = result.audit.recoveryAttempted ? "recovered" : "verified";

  return {
    ...result,
    filters,
    ledger,
    assumptions,
    interpretation: status === "verified"
      ? "Every identified investment criterion was accounted for and independently verified."
      : status === "recovered"
        ? "Every investment criterion was accounted for after one targeted recovery attempt."
        : result.interpretation,
    audit: { ...result.audit, status, issues: remainingIssues },
    diagnostics: { ...result.diagnostics, identifiedCriteria: ledger.length, accountedCriteria: ledger.length },
  };
}

export async function parseWithCriterionLedgerHardened(query: string): Promise<CriterionParseResult> {
  return promoteDeterministicKnowledge(await parseWithCriterionLedgerV2(query));
}
