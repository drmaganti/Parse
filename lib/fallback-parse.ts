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

function opFor(word: string): Op {
  const w = word.toLowerCase();
  if (w === "at most" || w === "<=") return "<=";
  if (w === "at least" || w === ">=") return ">=";
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
    ["revGrowth", /revenue growth|growing revenue|growth/],
    ["rsi", /\brsi\b|oversold/],
    ["from52wHigh", /52[- ]?week high|off (?:the )?high|below (?:their )?high|near (?:the )?high/],
    ["chg1w", /one[- ]?week|1w|this week|weekly/],
    ["sector", /sector|technology|tech|financials|healthcare|consumer|energy|industrials|communications|utilities|materials|real estate/],
  ];
  return tests.find(([, rx]) => rx.test(q))?.[0] ?? null;
}

function parseFresh(query: string): ParsedScreen {
  const q = ` ${query.toLowerCase()} `;
  const out: Filter[] = [];
  const assumptions: string[] = [];
  let ranking = "marketCap";

  addRange(out, "pe", q.match(/(?:p\/?e|price.?to.?earnings)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "pb", q.match(/(?:p\/?b|price.?to.?book)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "ps", q.match(/(?:p\/?s|price.?to.?sales)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "beta", q.match(/beta[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "marketCap", q.match(/market\s*cap[^\d-]*between\s*\$?(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?(-?\d+(?:\.\d+)?)/));
  addRange(out, "revGrowth", q.match(/(?:revenue growth|growth)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "divYield", q.match(/(?:dividend yield|yield(?:ing)?)[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));
  addRange(out, "rsi", q.match(/rsi[^\d-]*between\s*(-?\d+(?:\.\d+)?)\s*(?:and|to)\s*(-?\d+(?:\.\d+)?)/));

  if (!out.some((f) => f.field === "pe")) addThreshold(out, "pe", q.match(/(?:p\/?e|price.?to.?earnings)[^\d-]*(under|below|less than|lower than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*\$?(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "pb")) addThreshold(out, "pb", q.match(/(?:p\/?b|price.?to.?book)[^\d-]*(under|below|less than|lower than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*\$?(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "ps")) addThreshold(out, "ps", q.match(/(?:p\/?s|price.?to.?sales)[^\d-]*(under|below|less than|lower than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*\$?(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "divYield")) addThreshold(out, "divYield", q.match(/(?:dividend yield|yield(?:ing)?)[^\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)?\s*(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "beta")) addThreshold(out, "beta", q.match(/beta[^\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "marketCap")) addThreshold(out, "marketCap", q.match(/market\s*cap[^\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*\$?(-?\d+(?:\.\d+)?)/));
  if (!out.some((f) => f.field === "revGrowth")) {
    addThreshold(out, "revGrowth", q.match(/(?:revenue growth|growing revenue|grow(?:ing)? revenue|growth)[^\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*(-?\d+(?:\.\d+)?)/));
  }
  if (!out.some((f) => f.field === "rsi")) addThreshold(out, "rsi", q.match(/rsi[^\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\s*(-?\d+(?:\.\d+)?)/));

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
  if (/dividend|income|payout|highest yield/.test(q)) {
    if (!out.some((f) => f.field === "divYield") && !/highest yield/.test(q)) addUnique(out, mk("divYield", ">", 3));
    ranking = "dividend";
  }
  if (/growth|growing|fast-growing|highest growth/.test(q)) {
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

  const exclusionLanguage = /exclude|excluding|except|avoid|outside|without/.test(q);
  for (const sec of SECTORS) {
    const named = q.includes(sec.toLowerCase()) || (sec === "Technology" && /\btech\b/.test(q));
    if (!named) continue;
    addUnique(out, mk("sector", exclusionLanguage ? "!=" : "==", sec));
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
  if (!forceRefine && !prev.length) {
    if (!fresh.filters.length) fresh.filters = [mk("marketCap", ">", 50)];
    return fresh;
  }

  const q = ` ${query.toLowerCase()} `;
  const actions: RefinementAction[] = [];
  const explicitRemove = /\b(remove|drop|delete)\b/.test(q);
  const explicitReplace = /\b(instead|replace|change|set|use)\b/.test(q) && /\b(instead|replace|change|set|to|under|below|above|over|between)\b/.test(q);

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
  const rankingMentioned = /cheapest|highest yield|highest growth|momentum|most beaten|biggest decline|largest first|rank by/.test(q);
  return {
    filters,
    ranking: rankingMentioned ? fresh.ranking : currentRanking,
    interpretation: actions.length ? "Updated the current screen." : "No supported screen change was found.",
    assumptions: fresh.assumptions,
    actions,
  };
}
