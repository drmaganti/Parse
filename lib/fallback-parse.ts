import { RANKINGS, SECTORS, type Filter, type Op } from "./fields";
import { applyRefinement, sameFilter, type RefinementAction } from "./filter-ops";

export interface ParsedScreen {
  filters: Filter[];
  ranking: string;
  interpretation: string;
  assumptions: string[];
  actions?: RefinementAction[];
}

let counter = 0;
const mk = (field: string, op: Op, value: number | string): Filter => ({
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

function hasRankingIntent(q: string): boolean {
  return /cheapest first|lowest valuation|highest yield|highest growth|strongest momentum|most beaten|biggest decline|largest first|rank by/.test(q);
}

function hasKnownUnsupportedMetric(q: string): boolean {
  return /\broic\b|return on invested capital|\broe\b|return on equity|\broa\b|return on assets|free cash flow|\bfcf\b|debt\s*(?:to|\/)\s*ebitda|ev\s*(?:to|\/)\s*ebitda|\bpeg\b|current ratio|interest coverage|earnings growth|eps growth|profit growth|debt\s*(?:to|\/)\s*equity/.test(q);
}

function parseFresh(query: string): ParsedScreen {
  const q = ` ${query.toLowerCase()} `;
  const out: Filter[] = [];
  const assumptions: string[] = [];
  let ranking = "marketCap";
  const cmp = "under|below|less than|lower than|at most|no more than|maximum|max|<=|<|over|above|greater than|more than|at least|minimum|min|>=|>";

  addRange(out, "pe", q.match(/(?:\bp\/?e\b|price.?to.?earnings)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "pb", q.match(/(?:\bp\/?b\b|price.?to.?book)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "ps", q.match(/(?:\bp\/?s\b|price.?to.?sales)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "beta", q.match(/\bbeta\b[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "marketCap", q.match(/market\s*cap[^\d-]*between\s*\$?(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?(-?\d+(?:\.\d+)?)/));
  addRange(out, "revGrowth", q.match(/revenue growth[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "divYield", q.match(/(?:dividend yield|yield(?:ing)?)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "rsi", q.match(/\brsi\b[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));

  if (!out.some((f) => f.field === "pe")) addThreshold(out, "pe", q.match(new RegExp(`(?:\\bp\\/?e\\b|price.?to.?earnings)[^\\d-]*(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "pb")) addThreshold(out, "pb", q.match(new RegExp(`(?:\\bp\\/?b\\b|price.?to.?book)[^\\d-]*(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "ps")) addThreshold(out, "ps", q.match(new RegExp(`(?:\\bp\\/?s\\b|price.?to.?sales)[^\\d-]*(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "divYield")) addThreshold(out, "divYield", q.match(new RegExp(`(?:dividend yield|yield(?:ing)?)\\s*(?:(${cmp})\\s*)?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "beta")) addThreshold(out, "beta", q.match(new RegExp(`\\bbeta\\b[^\\d-]*(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "marketCap")) addThreshold(out, "marketCap", q.match(new RegExp(`market\\s*cap[^\\d-]*(${cmp})\\s*\\$?(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "revGrowth")) addThreshold(out, "revGrowth", q.match(new RegExp(`(?:revenue growth|growing revenue|grow(?:ing)? revenue)[^\\d-]*(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));
  if (!out.some((f) => f.field === "rsi")) addThreshold(out, "rsi", q.match(new RegExp(`\\brsi\\b[^\\d-]*(${cmp})\\s*(-?\\d+(?:\\.\\d+)?)`)));

  const positiveGrowth = /positive revenue growth|revenue (?:is )?growing|still growing revenue/.test(q);
  if (positiveGrowth && !out.some((f) => f.field === "revGrowth")) addUnique(out, mk("revGrowth", ">", 0));

  const offHigh = q.match(/(?:more than|over|at least)\s*(\d+(?:\.\d+)?)\s*%?\s*(?:off|below)\s*(?:their\s*|the\s*)?(?:52[- ]?week )?high/);
  if (offHigh) addUnique(out, mk("from52wHigh", "<", -Number(offHigh[1])));
  const withinHigh = q.match(/within\s*(\d+(?:\.\d+)?)\s*%?\s*(?:of|from)\s*(?:their\s*|the\s*)?(?:52[- ]?week )?high/);
  if (withinHigh) addUnique(out, mk("from52wHigh", ">=", -Number(withinHigh[1])));

  const upWeek = q.match(/(?:up|gained|rising)\s*(?:more than|over|above|at least)?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:this week|over the last week|in a week)/);
  if (upWeek) addUnique(out, mk("chg1w", ">", Number(upWeek[1])));
  const downWeek = q.match(/(?:down|fallen|fell|dropped)\s*(?:more than|over|by at least|at least)?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:this week|over the last week|in a week)/);
  if (downWeek) addUnique(out, mk("chg1w", "<", -Number(downWeek[1])));

  if (/cheap|value|undervalued|low p\/?e/.test(q)) {
    if (!out.some((f) => f.field === "pe")) addUnique(out, mk("pe", "<", 20));
    if (/cheap|value|undervalued/.test(q) && !out.some((f) => f.field === "pb")) addUnique(out, mk("pb", "<", 4));
    ranking = "value";
  }
  if (/dividend|income|payout|high[- ]?yield|highest yield/.test(q)) {
    if (!out.some((f) => f.field === "divYield") && !/highest yield/.test(q)) addUnique(out, mk("divYield", ">", 3));
    ranking = "dividend";
  }
  const genericGrowth = /\bgrowth (?:stocks|companies|names)\b|\bgrowing (?:technology|tech|healthcare|financial|consumer|industrial|companies|stocks|names)\b|fast-growing|highest growth|growth at a reasonable price|\bgarp\b/.test(q);
  if (!hasKnownUnsupportedMetric(q) && (genericGrowth || /revenue growth|growing revenue/.test(q))) {
    if (!out.some((f) => f.field === "revGrowth") && !/highest growth/.test(q)) addUnique(out, mk("revGrowth", ">", 15));
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
  if (/reasonable price|garp/.test(q)) {
    if (!out.some((f) => f.field === "pe")) addUnique(out, mk("pe", "<", 25));
    assumptions.push("Read 'reasonable price' as P/E below 25");
  }
  if (/won'?t crash|no crash|can'?t crash/.test(q)) {
    if (!out.some((f) => f.field === "beta")) addUnique(out, mk("beta", "<", 1));
    assumptions.push("Read 'won't crash' as low volatility, beta below 1.0");
  }
  if (/safe|defensive|low[- ]?risk|stable|conservative|low volatility/.test(q)) {
    if (!out.some((f) => f.field === "beta")) addUnique(out, mk("beta", "<", 1));
    assumptions.push("Read low-risk language as beta below 1.0");
  }

  if (/mega[- ]?cap|very large companies/.test(q) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 200));
  else if (/large[- ]?cap|\bbig companies\b|\blarge companies\b/.test(q) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 50));
  if (/small[- ]?cap/.test(q) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", "<", 20));

  for (const sec of SECTORS) {
    const named = sectorTokens(sec).some((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q));
    if (!named) continue;
    addUnique(out, mk("sector", sectorExcluded(q, sec) ? "!=" : "==", sec));
  }

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
  if (hasKnownUnsupportedMetric(q)) return null;
  const result = fallbackParse(query, mode === "refine" ? prev : [], [], currentRanking, mode === "refine");
  if (mode === "refine") {
    const rankingChanged = hasRankingIntent(q) && result.ranking !== currentRanking;
    return (result.actions?.length || rankingChanged || result.assumptions.length) ? result : null;
  }
  return (result.filters.length || hasRankingIntent(q) || result.assumptions.length) ? result : null;
}
