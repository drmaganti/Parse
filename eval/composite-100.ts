import { parseQuery } from "../lib/parse";
import type { Filter } from "../lib/fields";

type Signal = { field: string; op: Filter["op"]; value: number | string };
type Variant = [phrase: string, signals: Signal[]];

const FIELDS = [
  "pe", "pb", "ps", "divYield", "beta", "marketCap", "revGrowth", "roic", "operatingMargin", "fcfMargin",
  "fcfYield", "debtEquity", "interestCoverage", "revGrowth3Y", "epsGrowth3Y", "evEbitda", "rsi", "from52wHigh", "chg1w", "sector",
] as const;

const v = (field: string, op: Filter["op"], value: number | string): Signal => ({ field, op, value });

// This evaluation vocabulary was authored independently from the parser implementation.
// Every supported indicator appears exactly 20 times, across five wording/threshold variants.
const VARIANTS: Record<(typeof FIELDS)[number], Variant[]> = {
  pe: [
    ["P/E under 18", [v("pe", "<", 18)]],
    ["price-to-earnings at most 22", [v("pe", "<=", 22)]],
    ["P/E above 10", [v("pe", ">", 10)]],
    ["P/E at least 12", [v("pe", ">=", 12)]],
    ["P/E between 9 and 21", [v("pe", ">=", 9), v("pe", "<=", 21)]],
  ],
  pb: [
    ["P/B below 3", [v("pb", "<", 3)]],
    ["price-to-book at most 4", [v("pb", "<=", 4)]],
    ["P/B above 1", [v("pb", ">", 1)]],
    ["P/B at least 1.5", [v("pb", ">=", 1.5)]],
    ["P/B between 1 and 5", [v("pb", ">=", 1), v("pb", "<=", 5)]],
  ],
  ps: [
    ["P/S under 5", [v("ps", "<", 5)]],
    ["price-to-sales at most 6", [v("ps", "<=", 6)]],
    ["P/S above 1.5", [v("ps", ">", 1.5)]],
    ["P/S at least 2", [v("ps", ">=", 2)]],
    ["P/S between 1 and 7", [v("ps", ">=", 1), v("ps", "<=", 7)]],
  ],
  divYield: [
    ["dividend yield over 3%", [v("divYield", ">", 3)]],
    ["dividend yield at least 2.5%", [v("divYield", ">=", 2.5)]],
    ["dividend yield below 6%", [v("divYield", "<", 6)]],
    ["dividend yield at most 5%", [v("divYield", "<=", 5)]],
    ["dividend yield between 2 and 5%", [v("divYield", ">=", 2), v("divYield", "<=", 5)]],
  ],
  beta: [
    ["beta below 1.1", [v("beta", "<", 1.1)]],
    ["beta at most 0.95", [v("beta", "<=", 0.95)]],
    ["beta above 0.6", [v("beta", ">", 0.6)]],
    ["beta at least 0.8", [v("beta", ">=", 0.8)]],
    ["beta between 0.7 and 1.3", [v("beta", ">=", 0.7), v("beta", "<=", 1.3)]],
  ],
  marketCap: [
    ["market cap above $50 billion", [v("marketCap", ">", 50)]],
    ["market cap at least $25 billion", [v("marketCap", ">=", 25)]],
    ["market cap below $200 billion", [v("marketCap", "<", 200)]],
    ["market cap at most $150 billion", [v("marketCap", "<=", 150)]],
    ["market cap between $20 and $120 billion", [v("marketCap", ">=", 20), v("marketCap", "<=", 120)]],
  ],
  revGrowth: [
    ["revenue growth above 15%", [v("revGrowth", ">", 15)]],
    ["revenue growth at least 10%", [v("revGrowth", ">=", 10)]],
    ["revenue growth below 30%", [v("revGrowth", "<", 30)]],
    ["revenue growth at most 25%", [v("revGrowth", "<=", 25)]],
    ["revenue growth between 8 and 22%", [v("revGrowth", ">=", 8), v("revGrowth", "<=", 22)]],
  ],
  roic: [
    ["ROIC above 12%", [v("roic", ">", 12)]],
    ["return on invested capital at least 10%", [v("roic", ">=", 10)]],
    ["ROIC below 30%", [v("roic", "<", 30)]],
    ["ROIC at most 25%", [v("roic", "<=", 25)]],
    ["ROIC between 8 and 20%", [v("roic", ">=", 8), v("roic", "<=", 20)]],
  ],
  operatingMargin: [
    ["operating margin above 12%", [v("operatingMargin", ">", 12)]],
    ["operating profit margin at least 10%", [v("operatingMargin", ">=", 10)]],
    ["operating margin below 35%", [v("operatingMargin", "<", 35)]],
    ["operating margin at most 30%", [v("operatingMargin", "<=", 30)]],
    ["operating margin between 8 and 25%", [v("operatingMargin", ">=", 8), v("operatingMargin", "<=", 25)]],
  ],
  fcfMargin: [
    ["free cash flow margin above 10%", [v("fcfMargin", ">", 10)]],
    ["FCF margin at least 8%", [v("fcfMargin", ">=", 8)]],
    ["free cash flow margin below 30%", [v("fcfMargin", "<", 30)]],
    ["FCF margin at most 25%", [v("fcfMargin", "<=", 25)]],
    ["FCF margin between 7 and 22%", [v("fcfMargin", ">=", 7), v("fcfMargin", "<=", 22)]],
  ],
  fcfYield: [
    ["free cash flow yield above 3%", [v("fcfYield", ">", 3)]],
    ["FCF yield at least 2.5%", [v("fcfYield", ">=", 2.5)]],
    ["free cash flow yield below 10%", [v("fcfYield", "<", 10)]],
    ["FCF yield at most 8%", [v("fcfYield", "<=", 8)]],
    ["FCF yield between 2 and 7%", [v("fcfYield", ">=", 2), v("fcfYield", "<=", 7)]],
  ],
  debtEquity: [
    ["debt to equity below 1", [v("debtEquity", "<", 1)]],
    ["debt/equity at most 1.2", [v("debtEquity", "<=", 1.2)]],
    ["debt to equity above 0.2", [v("debtEquity", ">", 0.2)]],
    ["debt/equity at least 0.3", [v("debtEquity", ">=", 0.3)]],
    ["debt to equity between 0.2 and 1.0", [v("debtEquity", ">=", 0.2), v("debtEquity", "<=", 1)]],
  ],
  interestCoverage: [
    ["interest coverage above 5", [v("interestCoverage", ">", 5)]],
    ["interest coverage at least 4", [v("interestCoverage", ">=", 4)]],
    ["interest cover below 20", [v("interestCoverage", "<", 20)]],
    ["interest coverage at most 15", [v("interestCoverage", "<=", 15)]],
    ["interest coverage between 4 and 12", [v("interestCoverage", ">=", 4), v("interestCoverage", "<=", 12)]],
  ],
  revGrowth3Y: [
    ["3-year revenue growth above 8%", [v("revGrowth3Y", ">", 8)]],
    ["3Y revenue growth at least 7%", [v("revGrowth3Y", ">=", 7)]],
    ["3-year revenue CAGR below 25%", [v("revGrowth3Y", "<", 25)]],
    ["3Y revenue CAGR at most 20%", [v("revGrowth3Y", "<=", 20)]],
    ["3-year revenue growth between 6 and 18%", [v("revGrowth3Y", ">=", 6), v("revGrowth3Y", "<=", 18)]],
  ],
  epsGrowth3Y: [
    ["3-year EPS growth above 10%", [v("epsGrowth3Y", ">", 10)]],
    ["3Y earnings growth at least 8%", [v("epsGrowth3Y", ">=", 8)]],
    ["3-year EPS CAGR below 30%", [v("epsGrowth3Y", "<", 30)]],
    ["3Y earnings CAGR at most 24%", [v("epsGrowth3Y", "<=", 24)]],
    ["3-year EPS growth between 7 and 20%", [v("epsGrowth3Y", ">=", 7), v("epsGrowth3Y", "<=", 20)]],
  ],
  evEbitda: [
    ["EV/EBITDA under 15", [v("evEbitda", "<", 15)]],
    ["enterprise value to EBITDA at most 18", [v("evEbitda", "<=", 18)]],
    ["EV/EBITDA above 6", [v("evEbitda", ">", 6)]],
    ["EV/EBITDA at least 8", [v("evEbitda", ">=", 8)]],
    ["EV/EBITDA between 7 and 16", [v("evEbitda", ">=", 7), v("evEbitda", "<=", 16)]],
  ],
  rsi: [
    ["RSI below 35", [v("rsi", "<", 35)]],
    ["RSI at most 40", [v("rsi", "<=", 40)]],
    ["RSI above 45", [v("rsi", ">", 45)]],
    ["RSI at least 50", [v("rsi", ">=", 50)]],
    ["RSI between 30 and 60", [v("rsi", ">=", 30), v("rsi", "<=", 60)]],
  ],
  from52wHigh: [
    ["within 5% of their 52-week high", [v("from52wHigh", ">=", -5)]],
    ["within 8% of the 52-week high", [v("from52wHigh", ">=", -8)]],
    ["more than 12% off their 52-week high", [v("from52wHigh", "<", -12)]],
    ["over 20% below the 52-week high", [v("from52wHigh", "<", -20)]],
    ["at least 15% off the 52-week high", [v("from52wHigh", "<", -15)]],
  ],
  chg1w: [
    ["up more than 3% this week", [v("chg1w", ">", 3)]],
    ["gained over 2% this week", [v("chg1w", ">", 2)]],
    ["rising at least 4% this week", [v("chg1w", ">", 4)]],
    ["down over 5% this week", [v("chg1w", "<", -5)]],
    ["dropped at least 2% this week", [v("chg1w", "<", -2)]],
  ],
  sector: [
    ["Technology stocks", [v("sector", "==", "Technology")]],
    ["Healthcare companies", [v("sector", "==", "Healthcare")]],
    ["Financials", [v("sector", "==", "Financials")]],
    ["exclude Energy", [v("sector", "!=", "Energy")]],
    ["stocks excluding Utilities", [v("sector", "!=", "Utilities")]],
  ],
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Case { id: string; statement: string; indicators: string[]; expected: Signal[]; }

function buildCases(): Case[] {
  const random = rng(20260817);
  const groups: string[][] = [];
  for (let round = 0; round < 20; round++) {
    const order = shuffled(FIELDS, random);
    for (let i = 0; i < order.length; i += 4) groups.push(order.slice(i, i + 4));
  }

  const occurrence = new Map<string, number>();
  const intros = [
    "Screen for stocks meeting all of these:", "Find stocks that satisfy:", "Show companies matching:", "Look for stocks with:", "Return companies meeting:",
    "Identify stocks matching:", "I want companies with:", "Filter for stocks with:", "Show me companies that have:", "Find companies satisfying:",
  ];

  return groups.map((group, index) => {
    const phrases: string[] = [];
    const expected: Signal[] = [];
    for (const field of group) {
      const count = occurrence.get(field) ?? 0;
      occurrence.set(field, count + 1);
      const [phrase, signals] = VARIANTS[field as keyof typeof VARIANTS][count % 5];
      phrases.push(phrase);
      expected.push(...signals);
    }
    return {
      id: `C${String(index + 1).padStart(3, "0")}`,
      statement: `${intros[index % intros.length]} ${phrases.slice(0, -1).join(", ")}, and ${phrases.at(-1)}.`,
      indicators: group,
      expected,
    };
  });
}

const key = (s: Signal) => `${s.field}|${s.op}|${String(s.value).toLowerCase()}`;
const filterKey = (f: Filter) => key({ field: f.field, op: f.op, value: f.value });

async function run() {
  const cases = buildCases();
  const expectedCoverage = new Map<string, number>();
  for (const c of cases) for (const field of c.indicators) expectedCoverage.set(field, (expectedCoverage.get(field) ?? 0) + 1);

  const uniqueCombos = new Set(cases.map((c) => [...c.indicators].sort().join("|"))).size;
  const datasetProblems: string[] = [];
  if (cases.length !== 100) datasetProblems.push(`expected 100 cases, got ${cases.length}`);
  for (const c of cases) if (new Set(c.indicators).size < 3) datasetProblems.push(`${c.id} has fewer than 3 distinct indicators`);
  for (const field of FIELDS) if (expectedCoverage.get(field) !== 20) datasetProblems.push(`${field} coverage=${expectedCoverage.get(field) ?? 0}, expected 20`);
  for (const field of FIELDS) if (VARIANTS[field].length !== 5) datasetProblems.push(`${field} does not have five wording variants`);
  if (datasetProblems.length) throw new Error(`Dataset invalid:\n${datasetProblems.join("\n")}`);

  console.log(`Composite-100 dataset: ${cases.length} statements; 4 distinct indicators each; ${uniqueCombos} unique indicator combinations.`);
  console.log(`Coverage: all ${FIELDS.length} indicators appear exactly 20 times; five wording variants per indicator.`);
  if (process.env.PRINT_COMPOSITE100 === "1") for (const c of cases) console.log(`${c.id}\t${c.statement}`);

  let passed = 0;
  let expectedSignals = 0;
  let matchedSignals = 0;
  let unexpectedSignals = 0;
  const fieldExpected = new Map<string, number>();
  const fieldMatched = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const failures: Array<{ id: string; statement: string; missing: string[]; unexpected: string[]; source: string; assumptions: string[] }> = [];

  for (const c of cases) {
    const result = await parseQuery(c.statement, [], [], "marketCap", "new");
    sourceCounts.set(result.source, (sourceCounts.get(result.source) ?? 0) + 1);
    const expectedSet = new Set(c.expected.map(key));
    const actualSet = new Set(result.filters.map(filterKey));
    const missing = [...expectedSet].filter((x) => !actualSet.has(x));
    const unexpected = [...actualSet].filter((x) => !expectedSet.has(x));
    expectedSignals += expectedSet.size;
    matchedSignals += expectedSet.size - missing.length;
    unexpectedSignals += unexpected.length;

    for (const signal of c.expected) {
      fieldExpected.set(signal.field, (fieldExpected.get(signal.field) ?? 0) + 1);
      if (actualSet.has(key(signal))) fieldMatched.set(signal.field, (fieldMatched.get(signal.field) ?? 0) + 1);
    }

    if (missing.length === 0 && unexpected.length === 0) passed++;
    else failures.push({ id: c.id, statement: c.statement, missing, unexpected, source: result.source, assumptions: result.assumptions });
  }

  console.log(`\nRESULT ${passed}/${cases.length} statements exact (${(passed / cases.length * 100).toFixed(1)}%).`);
  console.log(`SIGNALS ${matchedSignals}/${expectedSignals} expected signals matched (${(matchedSignals / expectedSignals * 100).toFixed(1)}%); ${unexpectedSignals} unexpected signals.`);
  console.log(`SOURCES ${JSON.stringify(Object.fromEntries(sourceCounts))}`);
  console.log("\nINDICATOR SIGNAL ACCURACY");
  for (const field of FIELDS) {
    const e = fieldExpected.get(field) ?? 0;
    const m = fieldMatched.get(field) ?? 0;
    console.log(`${field.padEnd(18)} ${String(m).padStart(2)}/${String(e).padEnd(2)} ${(e ? m / e * 100 : 0).toFixed(1)}%`);
  }

  if (failures.length) {
    console.error(`\n${failures.length} statement(s) failed exact validation:`);
    for (const f of failures) {
      console.error(`\nFAIL ${f.id}: ${f.statement}`);
      if (f.missing.length) console.error(`  missing: ${f.missing.join(", ")}`);
      if (f.unexpected.length) console.error(`  unexpected: ${f.unexpected.join(", ")}`);
      console.error(`  source: ${f.source}`);
      if (f.assumptions.length) console.error(`  assumptions: ${f.assumptions.join(" | ")}`);
    }
    process.exit(1);
  }

  console.log("\nAll 100 composite statements matched the expected indicator signals exactly.");
}

run().catch((err) => { console.error(err); process.exit(1); });
