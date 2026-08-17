import { RANKINGS, SECTORS, type Filter, type FilterValue, type Op } from "./fields";
import { applyRefinement, sameFilter, type RefinementAction } from "./filter-ops";
import {
  FUNDAMENTAL_TERMS,
  findMetricSpans,
  hasMetricSpan,
  textForGenericIntent,
  textForMetric,
} from "./metric-spans";

export interface ParsedScreen {
  filters: Filter[];
  ranking: string;
  interpretation: string;
  assumptions: string[];
  actions?: RefinementAction[];
}

let counter = 0;
const mk = (field: string, op: Op, value: FilterValue): Filter => ({
  id: `${field}_${op}_${counter++}`,
  field, op, value, source: "ai",
});

function addUnique(out: Filter[], f: Filter) {
  if (!out.some((x) => sameFilter(x, f))) out.push(f);
}

function opFor(word?: string): Op {
  const w = (word || "over").toLowerCase();
  if (w === "at most" || w === "no more than" || w === "maximum" || w === "max" || w === "<=") return "<=";
  if (w === "at least" || w === "minimum" || w === "min" || w === ">=") return ">=";
  if (/under|below|less than|lower than|</.test(w)) return "<";
  return ">";
}

function addThreshold(out: Filter[], field: string, match: RegExpMatchArray | null) {
  if (!match) return false;
  addUnique(out, mk(field, opFor(match[1]), Number(match[2])));
  return true;
}

function addRange(out: Filter[], field: string, match: RegExpMatchArray | null) {
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  addUnique(out, mk(field, ">=", Math.min(a, b)));
  addUnique(out, mk(field, "<=", Math.max(a, b)));
  return true;
}

function fieldMention(q: string): string | null {
  const fundamental = FUNDAMENTAL_TERMS.find(([, term]) => new RegExp(term).test(q));
  if (fundamental) return fundamental[0];
  const tests: [string, RegExp][] = [
    ["pe", /\bp\/?e\b|price.?to.?earnings/],
    ["pb", /\bp\/?b\b|price.?to.?book/],
    ["ps", /\bp\/?s\b|price.?to.?sales/],
    ["divYield", /dividend yield|yield(?:ing)?/],
    ["beta", /\bbeta\b|volatility/],
    ["marketCap", /market\s*cap|large[- ]?cap|small[- ]?cap|mega[- ]?cap|company size/],
    ["revGrowth", /revenue growth|growing revenue/],
    ["rsi", /\brsi\b|oversold/],
    ["from52wHigh", /52[- ]?week high|off (?:the )?high|below (?:their )?high|near (?:the )?high/],
    ["chg1w", /one[- ]?week|1w|this week|weekly/],
    ["sector", /sector|technology|tech|financials|healthcare|consumer|energy|industrials|communications|utilities|materials|real estate/],
  ];
  return tests.find(([, rx]) => rx.test(q))?.[0] ?? null;
}

function sectorTokens(sec: string): string[] {
  if (sec === "Technology") return ["technology", "tech"];
  return [sec.toLowerCase()];
}

function sectorExcluded(q: string, sec: string): boolean {
  return sectorTokens(sec).some((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:exclude|excluding|except|avoid|outside|without)(?:\\s+\\w+){0,4}\\s+${escaped}\\b`, "i").test(q)
      || new RegExp(`\\b${escaped}\\b(?:\\s+\\w+){0,3}\\s+(?:excluded|excluded sector)`, "i").test(q);
  });
}

function addSectorFilters(out: Filter[], q: string) {
  const included: string[] = [];
  const excluded: string[] = [];

  for (const sec of SECTORS) {
    const named = sectorTokens(sec).some((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q));
    if (!named) continue;
    if (sectorExcluded(q, sec)) excluded.push(sec);
    else included.push(sec);
  }

  if (included.length === 1) addUnique(out, mk("sector", "==", included[0]));
  else if (included.length > 1) addUnique(out, mk("sector", "in", included));
  for (const sec of excluded) addUnique(out, mk("sector", "!=", sec));
}

function hasRankingIntent(q: string): boolean {
  return /cheapest first|lowest valuation|highest yield|highest growth|strongest momentum|most beaten|biggest decline|largest first|rank by/.test(q);
}

function hasKnownUnsupportedMetric(q: string): boolean {
  return /\broe\b|return on equity|\broa\b|return on assets|(?:free cash flow|\bfcf\b)(?!\s+(?:margin|yield))|(?:net )?debt\s*(?:to|\/)\s*ebitda|\bpeg\b|current ratio|quick ratio|profit growth|earnings growth|eps growth|gross margin|payout ratio|dividend growth|tangible book|insider ownership|buyback/.test(q);
}

function parseFresh(query: string): ParsedScreen {
  const q = ` ${query.toLowerCase()} `;
  const spans = findMetricSpans(q);
  const scoped = (field: string) => textForMetric(q, spans, field);
  const genericQ = textForGenericIntent(q, spans);
  const out: Filter[] = [];
  const assumptions: string[] = [];
  let ranking = "marketCap";
  const cmp = "no more than|at most|less than|lower than|under|below|maximum|max|<=|<|at least|minimum|min|more than|greater than|over|above|>=|>";
  const unsupportedMetric = hasKnownUnsupportedMetric(q);
  if (/\bquality (?:companies|stocks|names)\b/.test(genericQ)) assumptions.push("Parse does not have a standalone quality metric yet, so no quality filter was added.");

  const between = "[^\\d-]*between\\s*(-?\\d+(?:\\.\\d+)?)\\s*%?\\s*(?:and|to)\\s*(-?\\d+(?:\\.\\d+)?)";
  addRange(out, "pe", scoped("pe").match(new RegExp(`(?:\\bp\\/?e\\b|price.?to.?earnings)${between}`)));
  addRange(out, "pb", scoped("pb").match(new RegExp(`(?:\\bp\\/?b\\b|price.?to.?book)${between}`)));
  addRange(out, "ps", scoped("ps").match(new RegExp(`(?:\\bp\\/?s\\b|price.?to.?sales)${between}`)));
  addRange(out, "beta", scoped("beta").match(new RegExp(`\\bbeta\\b${between}`)));
  addRange(out, "marketCap", scoped("marketCap").match(/market\s*cap[^\d-]*between\s*\$?(-?\d+(?:\.\d+)?)\s*(?:b|bn|billion)?\s*(?:and|to)\s*\$?(-?\d+(?:\.\d+)?)/));
  addRange(out, "revGrowth", scoped("revGrowth").match(new RegExp(`(?:revenue growth|growing revenue|grow(?:ing)? revenue)${between}`)));
  addRange(out, "divYield", scoped("divYield").match(new RegExp(`(?:dividend yield|yield(?:ing)?)${between}`)));
  addRange(out, "rsi", scoped("rsi").match(new RegExp(`\\brsi\\b${between}`)));
  for (const [field, term] of FUNDAMENTAL_TERMS) {
    if (!out.some((f) => f.field === field)) addRange(out, field, scoped(field).match(new RegExp(`${term}${between}`)));
  }

  if (!out.some((f) => f.field === "pe")) addThreshold(out, "pe", scoped("pe").match(new RegExp(`(?:\\bp\\/?e\\b|price.?to.?earnings)[^\\d-]*?(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "pb")) addThreshold(out, "pb", scoped("pb").match(new RegExp(`(?:\\bp\\/?b\\b|price.?to.?book)[^\\d-]*?(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "ps")) addThreshold(out, "ps", scoped("ps").match(new RegExp(`(?:\\bp\\/?s\\b|price.?to.?sales)[^\\d-]*?(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "divYield")) addThreshold(out, "divYield", scoped("divYield").match(new RegExp(`(?:dividend yield|yield(?:ing)?)\\s*(?:(${cmp})\\s*)?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "beta")) addThreshold(out, "beta", scoped("beta").match(new RegExp(`\\bbeta\\b[^\\d-]*?(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "marketCap")) addThreshold(out, "marketCap", scoped("marketCap").match(new RegExp(`market\\s*cap[^\\d-]*?(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "revGrowth")) addThreshold(out, "revGrowth", scoped("revGrowth").match(new RegExp(`(?:revenue growth|growing revenue|grow(?:ing)? revenue)[^\\d-]*?(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "rsi")) addThreshold(out, "rsi", scoped("rsi").match(new RegExp(`\\brsi\\b[^\\d-]*?(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  for (const [field, term] of FUNDAMENTAL_TERMS) {
    if (!out.some((f) => f.field === field)) addThreshold(out, field, scoped(field).match(new RegExp(`${term}[^\\d-]*?(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  }

  const positiveGrowth = /positive revenue growth|revenue (?:is )?growing|still growing revenue/.test(scoped("revGrowth"));
  if (positiveGrowth && !out.some((f) => f.field === "revGrowth")) addUnique(out, mk("revGrowth", ">", 0));

  const offHigh = q.match(/(?:more than|over|at least)\s*(\d+(?:\.\d+)?)\s*%?\s*(?:off|below)\s*(?:their\s*|the\s*)?(?:52[- ]?week )?high/);
  if (offHigh) addUnique(out, mk("from52wHigh", "<", -Number(offHigh[1])));
  const withinHigh = q.match(/within\s*(\d+(?:\.\d+)?)\s*%?\s*(?:of|from)\s*(?:their\s*|the\s*)?(?:52[- ]?week )?high/);
  if (withinHigh) addUnique(out, mk("from52wHigh", ">=", -Number(withinHigh[1])));

  const upWeek = q.match(/(?:up|gained|rising)\s*(?:more than|over|above|at least)?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:this week|over the last week|in a week)/);
  if (upWeek) addUnique(out, mk("chg1w", ">", Number(upWeek[1])));
  const downWeek = q.match(/(?:down|fallen|fell|dropped)\s*(?:more than|over|by at least|at least)?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:this week|over the last week|in a week)/);
  if (downWeek) addUnique(out, mk("chg1w", "<", -Number(downWeek[1])));

  const qualitativeValue = /cheap|\bvalue\b|undervalued/.test(genericQ);
  const lowPe = /low p\/?e/.test(q);
  if (qualitativeValue || lowPe) {
    if (!out.some((f) => f.field === "pe")) addUnique(out, mk("pe", "<", 20));
    if (qualitativeValue && !out.some((f) => f.field === "pb")) addUnique(out, mk("pb", "<", 4));
    ranking = "value";
  }

  // Dividend/income words may choose a ranking, but never create an undisclosed
  // yield threshold. Numeric dividend-yield filters require explicit yield language.
  const qualitativeDividend = /\bdividend\b|\bincome\b|\bpayout\b|high[- ]?yield|highest yield/.test(genericQ);
  if (qualitativeDividend || hasMetricSpan(spans, "divYield")) ranking = "dividend";

  const genericGrowth = /\bgrowth (?:stocks|companies|names)\b|\bgrowing (?:technology|tech|healthcare|financial|consumer|industrial|companies|stocks|names)\b|fast-growing|highest growth|growth at a reasonable price|\bgarp\b/.test(genericQ);
  const explicitGrowthMetric = hasMetricSpan(spans, "revGrowth") || hasMetricSpan(spans, "revGrowth3Y");
  if (!unsupportedMetric && (genericGrowth || explicitGrowthMetric)) {
    if (genericGrowth && !out.some((f) => f.field === "revGrowth") && !out.some((f) => f.field === "revGrowth3Y") && !/highest growth/.test(genericQ)) addUnique(out, mk("revGrowth", ">", 15));
    ranking = "quality";
  }

  if (/momentum|near (?:their )?(?:52[- ]?week )?high|breakout|strongest momentum/.test(q)) {
    if (!out.some((f) => f.field === "from52wHigh")) addUnique(out, mk("from52wHigh", ">", -6));
    ranking = "momentum";
  }
  if (/beaten|beaten-down|sell-?off|slump|most beaten|biggest decline/.test(q)) {
    if (!out.some((f) => f.field === "chg1w")) addUnique(out, mk("chg1w", "<", -2));
    ranking = "decline";
  }
  if (/oversold/.test(q) && !out.some((f) => f.field === "rsi")) addUnique(out, mk("rsi", "<", 30));
  if (/low p\/?b/.test(q) && !out.some((f) => f.field === "pb")) { addUnique(out, mk("pb", "<", 3)); ranking = "value"; }
  if (/reasonable price|garp/.test(genericQ)) {
    if (!out.some((f) => f.field === "pe")) addUnique(out, mk("pe", "<", 25));
    assumptions.push("Read 'reasonable price' as P/E below 25");
  }
  if (/won'?t crash|no crash|can'?t crash/.test(genericQ)) {
    if (!out.some((f) => f.field === "beta")) addUnique(out, mk("beta", "<", 1));
    assumptions.push("Read 'won't crash' as low volatility, beta below 1.0");
  }
  if (/safe|defensive|low[- ]?risk|stable|conservative|low volatility/.test(genericQ)) {
    if (!out.some((f) => f.field === "beta")) addUnique(out, mk("beta", "<", 1));
    assumptions.push("Read low-risk language as beta below 1.0");
  }

  if (/mega[- ]?cap|very large companies/.test(genericQ) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 200));
  else if (/large[- ]?cap|\bbig companies\b|\blarge companies\b/.test(genericQ) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 50));
  if (/small[- ]?cap/.test(genericQ) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", "<", 20));

  addSectorFilters(out, q);

  if (/cheapest first|lowest valuation|rank by (?:value|p\/?e)/.test(q)) ranking = "value";
  if (/highest yield|rank by yield/.test(q)) ranking = "dividend";
  if (/highest growth|rank by growth/.test(q)) ranking = "quality";
  if (/strongest momentum|rank by momentum/.test(q)) ranking = "momentum";
  if (/most beaten|biggest decline|rank by decline/.test(q)) ranking = "decline";
  if (/largest first|rank by market cap/.test(q)) ranking = "marketCap";

  return {
    filters: out,
    ranking: RANKINGS[ranking] ? ranking : "marketCap",
    interpretation: "Interpreted your request into the filters below.",
    assumptions,
  };
}

export function fallbackParse(
  query: string,
  prev: Filter[] = [],
  _lockedIds: string[] = [],
  currentRanking = "marketCap",
  forceRefine = false
): ParsedScreen {
  const fresh = parseFresh(query);
  if (!forceRefine && !prev.length) return fresh;

  const q = ` ${query.toLowerCase()} `;
  const actions: RefinementAction[] = [];
  const explicitRemove = /\b(remove|drop|delete)\b/.test(q);
  const explicitReplace = /\b(instead|replace|change|set)\b/.test(q) || /\buse\b.*\binstead\b/.test(q);

  if (explicitRemove) {
    const field = fieldMention(q);
    if (field) actions.push({ type: "remove", field });
  } else {
    const firstByField = new Set<string>();
    for (const f of fresh.filters) {
      const sameFieldExists = prev.some((p) => p.field === f.field);
      const shouldReplace = explicitReplace && sameFieldExists && !firstByField.has(f.field);
      actions.push({ type: shouldReplace ? "replace" : "add", field: f.field, op: f.op, value: f.value });
      firstByField.add(f.field);
    }
  }

  const filters = applyRefinement(prev, actions, "ai");
  const rankingMentioned = hasRankingIntent(q);
  return {
    filters,
    ranking: rankingMentioned ? fresh.ranking : currentRanking,
    interpretation: actions.length || rankingMentioned ? "Updated the current screen." : "No supported screen change was found.",
    assumptions: fresh.assumptions,
    actions,
  };
}

export function tryRuleParse(
  query: string,
  prev: Filter[] = [],
  currentRanking = "marketCap",
  mode: "new" | "refine" = prev.length ? "refine" : "new"
): ParsedScreen | null {
  const q = ` ${query.toLowerCase()} `;
  const result = fallbackParse(query, mode === "refine" ? prev : [], [], currentRanking, mode === "refine");
  if (mode === "refine") {
    const rankingChanged = hasRankingIntent(q) && result.ranking !== currentRanking;
    return (result.actions?.length || rankingChanged || result.assumptions.length) ? result : null;
  }
  return (result.filters.length || hasRankingIntent(q) || result.assumptions.length) ? result : null;
}
