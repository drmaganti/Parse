import { FIELDS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";
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

function metricRange(q: string, label: RegExp, field: string, out: Filter[]) {
  const between = q.match(new RegExp(`${label.source}[^\\d-]*between\\s*(-?\\d+(?:\\.\\d+)?)\\s*(?:and|to)\\s*(-?\\d+(?:\\.\\d+)?)`, "i"));
  if (!between) return false;
  const a = Number(between[1]);
  const b = Number(between[2]);
  addUnique(out, mk(field, ">=", Math.min(a, b)));
  addUnique(out, mk(field, "<=", Math.max(a, b)));
  return true;
}

function threshold(q: string, label: RegExp, field: string, out: Filter[]) {
  if (metricRange(q, label, field, out)) return;
  const rx = new RegExp(`${label.source}[^\\d-]*(under|below|less than|at most|<=|<|over|above|greater than|more than|at least|>=|>)\\s*\\$?\\s*(-?\\d+(?:\\.\\d+)?)`, "i");
  const m = q.match(rx);
  if (!m) return;
  const word = m[1].toLowerCase();
  const value = Number(m[2]);
  const op: Op = word === "at most" || word === "<=" ? "<=" : word === "at least" || word === ">=" ? ">=" : /under|below|less than|</.test(word) ? "<" : ">";
  addUnique(out, mk(field, op, value));
}

function fieldMention(q: string): string | null {
  const tests: [string, RegExp][] = [
    ["pe", /\bp\/?e\b|price.?to.?earnings/],
    ["pb", /\bp\/?b\b|price.?to.?book/],
    ["ps", /\bp\/?s\b|price.?to.?sales/],
    ["divYield", /dividend yield|\byield\b/],
    ["beta", /\bbeta\b|volatility/],
    ["marketCap", /market\s*cap|large[- ]?cap|small[- ]?cap|mega[- ]?cap/],
    ["revGrowth", /revenue growth|growing revenue|growth/],
    ["rsi", /\brsi\b|oversold/],
    ["from52wHigh", /52[- ]?week high|off (?:the )?high|below (?:their )?high/],
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

  threshold(q, /p\/?e|price.?to.?earnings/, "pe", out);
  threshold(q, /p\/?b|price.?to.?book/, "pb", out);
  threshold(q, /p\/?s|price.?to.?sales/, "ps", out);
  threshold(q, /dividend yield|yield/, "divYield", out);
  threshold(q, /beta/, "beta", out);
  threshold(q, /market\s*cap|cap/, "marketCap", out);
  threshold(q, /revenue growth|growth/, "revGrowth", out);
  threshold(q, /rsi/, "rsi", out);
  threshold(q, /(?:percent|%)?\s*(?:off|below)\s*(?:the\s*)?52[- ]?week high|52[- ]?week high/, "from52wHigh", out);
  threshold(q, /1w change|one[- ]?week change|weekly change/, "chg1w", out);

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
  if (/momentum|near (?:their )?(?:52|high)|breakout|strongest momentum/.test(q)) {
    if (!out.some((f) => f.field === "from52wHigh")) addUnique(out, mk("from52wHigh", ">", -6));
    ranking = "momentum";
  }
  if (/fallen|beaten|beaten-down|dropped|decline|sell-?off|slump|most beaten/.test(q)) {
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
  if (/large[- ]?cap|\bbig companies\b|\blarge companies\b/.test(q) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 50));
  if (/mega[- ]?cap|very large companies/.test(q) && !out.some((f) => f.field === "marketCap")) addUnique(out, mk("marketCap", ">", 200));
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

export function fallbackParse(query: string, prev: Filter[] = [], _lockedIds: string[] = [], currentRanking = "marketCap"): ParsedScreen {
  const fresh = parseFresh(query);
  if (!prev.length) {
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
    for (const f of fresh.filters) {
      const sameFieldExists = prev.some((p) => p.field === f.field);
      actions.push({ type: explicitReplace && sameFieldExists ? "replace" : "add", field: f.field, op: f.op, value: f.value });
    }
  }

  const filters = applyRefinement(prev, actions, "ai");
  const rankingMentioned = /cheapest|highest yield|highest growth|momentum|beaten|decline|largest first|rank by/.test(q);
  return {
    filters,
    ranking: rankingMentioned ? fresh.ranking : currentRanking,
    interpretation: actions.length ? "Updated the current screen." : "No supported screen change was found.",
    assumptions: fresh.assumptions,
    actions,
  };
}
