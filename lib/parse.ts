import { FIELDS, RANKINGS, SECTORS, type Filter } from "./fields";
import { complete } from "./llm";
import { fallbackParse, type ParsedScreen } from "./fallback-parse";
import { applyRefinement, validRanking, type RefinementAction } from "./filter-ops";
import { coerceActions, coerceFilters, enforceRefinementIntent, extractJsonObject } from "./parse-contract";

export interface ParseResult extends ParsedScreen {
  source: "model" | "fallback";
  actions?: RefinementAction[];
}

export type ParseMode = "new" | "refine";

function vocab() {
  return Object.values(FIELDS)
    .map((m) => `${m.key} (${m.label}${m.unit ? ", " + m.unit : ""}${m.kind === "cat" ? ", one of: " + SECTORS.join("/") : ""})`)
    .join("; ");
}

function rankVocab() {
  return Object.values(RANKINGS).map((r) => `${r.key} (${r.label})`).join("; ");
}

function buildNewSystem(): string {
  return [
    "You convert a plain-English US stock screen into strict JSON.",
    `Only use these filter fields: ${vocab()}.`,
    "Numeric operators: <, <=, >, >=, ==. Categorical sector operators: == and !=.",
    "Copy explicit numeric thresholds exactly. Do not make them stricter, looser, or round them.",
    "A range is represented as two filters on the same field. Example: P/E between 10 and 20 => pe>=10 and pe<=20.",
    "For exclusions such as 'exclude Energy', use sector != Energy.",
    "Do not add unrelated filters just because they are common in investing.",
    "If the request asks for an unsupported metric, do not substitute another metric. Omit the unsupported criterion and record it in assumptions. If nothing supported remains, return an empty filters array.",
    `Ranking must be exactly one of: ${rankVocab()}.`,
    "Ranking-only requests may return an empty filters array.",
    "When the request is vague, translate only into supported concrete filters and record each judgment in assumptions.",
    'Respond ONLY with minified JSON: {"filters":[{"field":"pe","op":"<","value":15}],"ranking":"value","interpretation":"one short sentence","assumptions":[]}',
  ].join(" ");
}

function buildRefineSystem(previous: Filter[], currentRanking: string): string {
  return [
    "You update an existing stock screen from one short user instruction. This is NOT a conversation and you must not regenerate unrelated criteria.",
    `Only use these filter fields: ${vocab()}.`,
    "Numeric operators: <, <=, >, >=, ==. Categorical sector operators: == and !=.",
    "Copy explicit numeric thresholds exactly. Do not make them stricter, looser, or round them.",
    `Current filters: ${JSON.stringify(previous.map(({ field, op, value, source }) => ({ field, op, value, source })))}.`,
    `Current ranking: ${currentRanking}.`,
    "Return only changes as actions. Allowed action types: add, remove, replace.",
    "Use add for a new criterion. Keep every unrelated existing filter exactly as-is.",
    "Use remove only when the user explicitly asks to remove/drop/delete a criterion. A remove action may specify only field to remove all conditions on that metric.",
    "Use replace only when the user explicitly changes an existing criterion using language such as change, set, replace, or instead.",
    "Never change a numeric threshold merely because a new criterion was added.",
    "Ranges are two add actions on the same field unless the user explicitly replaces that field.",
    "Exclusions such as 'exclude Energy' use an add action with sector != Energy; exclusion is not a remove action.",
    "If the instruction asks for an unsupported metric, return no action for that criterion and record it in assumptions. Never substitute a supported metric.",
    `If ranking changes, ranking must be one of: ${rankVocab()}; otherwise return null.`,
    'Respond ONLY with minified JSON: {"actions":[{"type":"add","field":"revGrowth","op":">","value":10}],"ranking":null,"interpretation":"one short sentence","assumptions":[]}',
  ].join(" ");
}

export async function parseQuery(
  query: string,
  prev: Filter[] = [],
  _lockedIds: string[] = [],
  currentRanking = "marketCap",
  mode?: ParseMode
): Promise<ParseResult> {
  const isRefine = mode ? mode === "refine" : prev.length > 0;
  try {
    const rawText = await complete({ system: isRefine ? buildRefineSystem(prev, currentRanking) : buildNewSystem(), user: query });
    const parsed = extractJsonObject(rawText);

    if (isRefine) {
      const actions = enforceRefinementIntent(query, coerceActions(parsed.actions));
      const nextRanking = validRanking(parsed.ranking) ?? currentRanking;
      const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: any) => typeof a === "string") : [];
      if (!actions.length && nextRanking === currentRanking && assumptions.length === 0) throw new Error("no valid refinement actions");
      const filters = applyRefinement(prev, actions, "ai");
      return {
        filters,
        ranking: nextRanking,
        interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : "Updated the screen.",
        assumptions,
        actions,
        source: "model",
      };
    }

    const filters = coerceFilters(parsed.filters);
    const parsedRanking = validRanking(parsed.ranking);
    const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: any) => typeof a === "string") : [];
    if (!filters.length && !parsedRanking && assumptions.length === 0) throw new Error("no valid screen output");
    return {
      filters,
      ranking: parsedRanking ?? "marketCap",
      interpretation: typeof parsed.interpretation === "string" ? parsed.interpretation : "Interpreted your request into the filters below.",
      assumptions,
      source: "model",
    };
  } catch {
    return { ...fallbackParse(query, isRefine ? prev : [], [], currentRanking, isRefine), source: "fallback" };
  }
}
