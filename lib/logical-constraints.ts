import type { Op } from "./fields";

export type ScalarRelation = "gt" | "gte" | "lt" | "lte";
export type SelectionMode = "include" | "exclude";
export type NumericDomain = "direct" | "distance_below_high";

export interface LogicalConstraint {
  relation: ScalarRelation;
  selection: SelectionMode;
  domain: NumericDomain;
}

const RELATION_TO_OP: Record<ScalarRelation, Op> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

const COMPLEMENT: Record<ScalarRelation, ScalarRelation> = {
  gt: "lte",
  gte: "lt",
  lt: "gte",
  lte: "gt",
};

// Parse stores distance from a price high as a negative percentage. Expressing
// the user's intent first in the positive "distance below high" domain keeps
// the relation mathematically clear before this final representation change.
const DISTANCE_TO_STORED: Record<ScalarRelation, ScalarRelation> = {
  gt: "lt",
  gte: "lte",
  lt: "gt",
  lte: "gte",
};

const HIGH_REFERENCE = /\b(?:52[- ]?week|52w|annual|yearly|one[- ]year|1[- ]year|year)\s+(?:price\s+)?high\b/i;
const EXCLUSION = /\b(?:exclude|excluding|avoid|avoiding|without)\b/i;

export function relationFromPhrase(phrase: string): ScalarRelation | null {
  if (/\b(?:at most|no more than|no higher than|no greater than|not (?:above|over|higher than|greater than)|maximum|max|not exceeding|up to|at or below)\b|<=/i.test(phrase)) return "lte";
  if (/\b(?:at least|no less than|no lower than|no fewer than|not (?:below|under|lower than|less than)|minimum|min|at or above)\b|>=|\d+(?:\.\d+)?\s*%?\s*\+/i.test(phrase)) return "gte";
  if (/\b(?:less than|lower than|under|below|beneath|south of|shy of)\b|(^|\s)<\s*/i.test(phrase)) return "lt";
  if (/\b(?:more than|greater than|higher than|over|above|north of|past|beyond)\b|\b(?:exceed(?:s|ed|ing)?|surpass(?:es|ed|ing)?|eclips(?:e|es|ed|ing)|outpac(?:e|es|ed|ing)|clear(?:s|ed|ing)?|crest(?:s|ed|ing)?|top(?:s|ped|ping)?|beat(?:s|en|ing)?)\b|(^|\s)>\s*/i.test(phrase)) return "gt";
  return null;
}

export function logicalConstraintFromPhrase(phrase: string, field: string): LogicalConstraint | null {
  const domain: NumericDomain = field === "from52wHigh" && HIGH_REFERENCE.test(phrase)
    ? "distance_below_high"
    : "direct";

  // "Within X% of a high" means distance_below_high <= X even though the
  // phrase does not contain a generic comparator token.
  const relation = domain === "distance_below_high" && /\bwithin\b/i.test(phrase)
    ? "lte"
    : relationFromPhrase(domain === "distance_below_high" ? phrase.replace(/\b(?:below|off)\b/gi, "") : phrase);
  if (!relation) return null;

  return {
    relation,
    selection: EXCLUSION.test(phrase) ? "exclude" : "include",
    domain,
  };
}

export function compileLogicalOperator(constraint: LogicalConstraint): Op {
  let relation = constraint.relation;
  if (constraint.selection === "exclude") relation = COMPLEMENT[relation];
  if (constraint.domain === "distance_below_high") relation = DISTANCE_TO_STORED[relation];
  return RELATION_TO_OP[relation];
}

export function groundedLogicalOperator(phrase: string, field: string): Op | null {
  const constraint = logicalConstraintFromPhrase(phrase, field);
  return constraint ? compileLogicalOperator(constraint) : null;
}

export function isHighReference(phrase: string): boolean {
  return HIGH_REFERENCE.test(phrase);
}
