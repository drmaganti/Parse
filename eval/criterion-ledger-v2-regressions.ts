import { strict as assert } from "node:assert";
import { parseWithCriterionLedgerV2 } from "../lib/criterion-ledger-v2";
import { matchSectorLexicon } from "../lib/sector-lexicon";

const json = (value: unknown) => Promise.resolve(JSON.stringify(value));
const key = (filter: { field: string; op: string; value: unknown }) => `${filter.field}|${filter.op}|${String(filter.value)}`;

async function normalPath() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Lenders earning a profit, revenue growing north of 6%, little debt, and shares that don't look expensive.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Lenders", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Financials" }] },
          { phrase: "earning a profit", concept: "profitable", basis: "parse_default", filters: [] },
          { phrase: "revenue growing north of 6%", concept: "revenue_growth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 6 }] },
          { phrase: "little debt", concept: "low_debt", basis: "parse_default", filters: [] },
          { phrase: "don't look expensive", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.diagnostics.path, "normal");
  assert.equal(result.diagnostics.llmCalls, 1);
  assert.equal(result.diagnostics.maxLlmCalls, 2);
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "operatingMargin|>|0", "revGrowth|>|6", "debtEquity|<|1", "pe|<|25", "sector|==|Financials",
  ]));
}

async function boundedFallback() {
  let calls = 0;
  const query = "Tech businesses turning a profit, sales climbing more than 17%, debt kept low, valuation looks fair.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Tech businesses", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "turning a profit", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "debt kept low", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "valuation looks fair", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "sales climbing more than 17%", type: "missing", reason: "Revenue growth was omitted." }],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "sales climbing more than 17%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 17 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.equal(result.diagnostics.path, "fallback");
  assert.equal(result.diagnostics.llmCalls, 2);
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|17"));
  assert.equal(result.audit.recoveryAttempted, true);
}

async function fallbackCannotDeleteValidCriteria() {
  let calls = 0;
  const query = "Healthcare names with sales up more than 10%, profitable operations, leverage on the low side, and a fair valuation.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Healthcare names", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Healthcare" }] },
        { phrase: "sales up more than 10%", concept: "revGrowth", basis: "semantic", filters: [{ field: "revGrowth", op: ">=", value: 10 }] },
        { phrase: "profitable operations", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "leverage on the low side", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "fair valuation", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "sales up more than 10%", type: "missing", reason: "Check the explicit threshold." }],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "sales up more than 10%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 10 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "sector|==|Healthcare", "revGrowth|>|10", "operatingMargin|>|0", "debtEquity|<|1", "pe|<|25",
  ]));
}

async function commonScopeIsBackfilledWithoutFallback() {
  let calls = 0;
  const query = "Lenders earning a profit, revenue growing north of 6%, little debt, and shares that don't look expensive.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "earning a profit", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "revenue growing north of 6%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 6 }] },
        { phrase: "little debt", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "shares that don't look expensive", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "Lenders", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Financials" }] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 1);
  assert.equal(result.diagnostics.path, "normal");
  assert(result.filters.some((filter) => key(filter) === "sector|==|Financials"));
  assert(result.filters.some((filter) => key(filter) === "operatingMargin|>|0"));
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|6"));
}

async function invalidKnownSectorIsReplacedByBackstop() {
  let calls = 0;
  const query = "Cloud-platform vendors generating a surplus, sales vaulting beyond 18%, scarcely encumbered, with a price tag that leaves room for error.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Cloud-platform vendors", concept: "sector", basis: "semantic", filters: [] },
        { phrase: "generating a surplus", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "sales vaulting beyond 18%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">=", value: 18 }] },
        { phrase: "scarcely encumbered", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "price tag that leaves room for error", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "sector|==|Technology"));
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|18"));
  assert(!result.filters.some((filter) => key(filter) === "revGrowth|>=|18"));
}

async function invalidScopeOnlySectorVariantIsReplacedWithoutFallback() {
  let calls = 0;
  const query = "Regional insurers remaining in the black, premiums and other revenue advancing beyond 4.5%, borrowings kept light, and an undemanding valuation.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Regional insurers", concept: "insurance_industry", basis: "semantic", filters: [] },
        { phrase: "remaining in the black", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "premiums and other revenue advancing beyond 4.5%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 4.5 }] },
        { phrase: "borrowings kept light", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "undemanding valuation", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "sector|==|Financials", "operatingMargin|>|0", "revGrowth|>|4.5", "debtEquity|<|1", "pe|<|25",
  ]));
}

async function semanticDefaultBasisIsCanonicalized() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Credit originators staying in the green.", async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Credit originators", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Financials" }] },
        { phrase: "staying in the green", concept: "operatingMargin", basis: "semantic", filters: [{ field: "operatingMargin", op: ">", value: 0 }] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "operatingMargin|>|0"));
  assert(result.assumptions.some((assumption) => /profitability default/i.test(assumption)));
}

async function numericBasisMismatchIsLoggedAndFallbackStaysStrict() {
  let calls = 0;
  let recoverySystem = "";
  const query = "Factory operators with turnover moving past 10%.";
  const result = await parseWithCriterionLedgerV2(query, async (input) => {
    calls++;
    if (calls === 2) recoverySystem = input.system;
    return json({
      criteria: [
        { phrase: "Factory operators", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Industrials" }] },
        { phrase: "turnover moving past 10%", concept: "revGrowth", basis: "semantic", filters: [{ field: "revGrowth", op: ">", value: 10 }] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.match(recoverySystem, /basis MUST be explicit/);
  assert.equal(result.audit.status, "needs_user_input");
  assert(!result.filters.some((filter) => key(filter) === "revGrowth|>|10"));
  assert.deepEqual(result.diagnostics.contractMismatches.map((mismatch) => mismatch.type), ["numeric_basis"]);
  assert(result.audit.issues.some((issue) => /basis=explicit/.test(issue.reason)));
}

async function recoveryReplacesNarrowDuplicateDefault() {
  let calls = 0;
  const query = "Electricity distributors operating on the profitable side of the line.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Electricity distributors", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Utilities" }] },
        { phrase: "profitable", concept: "profitable", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "operating on the profitable side of the line", type: "missing", reason: "The complete phrase was not represented." }],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "operating on the profitable side of the line", concept: "profitable", basis: "parse_default", filters: [] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.equal(result.audit.status, "recovered");
  assert.equal(result.ledger.filter((item) => item.concept === "profitable").length, 1);
  assert.equal(result.ledger.find((item) => item.concept === "profitable")?.phrase, "operating on the profitable side of the line");
  assert.equal(result.filters.filter((filter) => key(filter) === "operatingMargin|>|0").length, 1);
}

async function meaningfulCoverageIgnoresGrammarAndAccountsForRanking() {
  let calls = 0;
  const software = await parseWithCriterionLedgerV2(
    "Software companies whose forward P/E is between 12 and 24 and three-year revenue growth exceeds 11%.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Software companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
          { phrase: "forward P/E is between 12 and 24", concept: "forwardPe", basis: "explicit", filters: [{ field: "forwardPe", op: ">=", value: 12 }, { field: "forwardPe", op: "<=", value: 24 }] },
          { phrase: "three-year revenue growth exceeds 11%", concept: "revGrowth3Y", basis: "explicit", filters: [{ field: "revGrowth3Y", op: ">", value: 11 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(software.audit.status, "verified");

  calls = 0;
  const telecom = await parseWithCriterionLedgerV2(
    "Telecom operators with dividend yield above 4%, payout ratio under 70%, ranked by highest yield.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Telecom operators", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Communications" }] },
          { phrase: "dividend yield above 4%", concept: "divYield", basis: "explicit", filters: [{ field: "divYield", op: ">", value: 4 }] },
          { phrase: "payout ratio under 70%", concept: "payoutRatio", basis: "explicit", filters: [{ field: "payoutRatio", op: "<", value: 70 }] },
        ],
        coverage_issues: [],
        ranking: "dividend",
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(telecom.audit.status, "verified");
  assert.equal(telecom.ranking, "dividend");
}

async function uncoveredNumberStillTriggersBoundedRecovery() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Technology companies with revenue growth above 12%.", async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [{ phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] }],
      coverage_issues: [],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "revenue growth above 12%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 12 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 2);
  assert.equal(result.audit.status, "recovered");
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|12"));
}

async function semanticSectorContractAndMultipleOntologyMatchesAreNormalized() {
  let calls = 0;
  const inferred = await parseWithCriterionLedgerV2("Digital messaging platforms.", async () => {
    calls++;
    return json({
      criteria: [{ phrase: "Digital messaging platforms", concept: "interactive_communications", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Communication Services" }] }],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert.equal(inferred.audit.status, "verified");
  assert(inferred.filters.some((filter) => key(filter) === "sector|==|Communications"));

  calls = 0;
  const multi = await parseWithCriterionLedgerV2(
    "Avoid energy businesses; show industrial firms with beta no more than 1.1 and market capitalization over $30 billion.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Avoid energy businesses", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "!=", value: "Energy" }] },
          { phrase: "beta no more than 1.1", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: "<=", value: 1.1 }] },
          { phrase: "market capitalization over $30 billion", concept: "marketCap", basis: "explicit", filters: [{ field: "marketCap", op: ">", value: 30000000000 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(multi.audit.status, "verified");
  assert(multi.filters.some((filter) => key(filter) === "sector|!=|Energy"));
  assert(multi.filters.some((filter) => key(filter) === "sector|==|Industrials"));
  assert(multi.filters.some((filter) => key(filter) === "marketCap|>|30"));
}

async function marketCapUnitsNormalizeToBillions() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Industrials with market cap above $500 million.", async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Industrials", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Industrials" }] },
        { phrase: "market cap above $500 million", concept: "marketCap", basis: "explicit", filters: [{ field: "marketCap", op: ">", value: 500 }] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "marketCap|>|0.5"));
  assert(!result.filters.some((filter) => key(filter) === "marketCap|>|500"));

  calls = 0;
  const abbreviated = await parseWithCriterionLedgerV2("Technology companies worth more than $30B.", async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "worth more than $30B", concept: "marketCap", basis: "explicit", filters: [{ field: "marketCap", op: ">", value: 30000000000 }] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert.equal(abbreviated.audit.status, "verified");
  assert(abbreviated.filters.some((filter) => key(filter) === "marketCap|>|30"));
}

async function percentageRangesRemainGrounded() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Revenue growth between 5 and 20%.", async () => {
    calls++;
    return json({
      criteria: [{
        phrase: "Revenue growth between 5 and 20%", concept: "revGrowth", basis: "explicit",
        filters: [{ field: "revGrowth", op: ">=", value: 5 }, { field: "revGrowth", op: "<=", value: 20 }],
      }],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>=|5"));
  assert(result.filters.some((filter) => key(filter) === "revGrowth|<=|20"));
}

async function negatedComparatorsAreDeterministicallyGrounded() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Utilities with interest coverage at least 6 times, current ratio above 1.3, and quick ratio no lower than 1.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Utilities", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Utilities" }] },
          { phrase: "interest coverage at least 6 times", concept: "interestCoverage", basis: "explicit", filters: [{ field: "interestCoverage", op: ">=", value: 6 }] },
          { phrase: "current ratio above 1.3", concept: "currentRatio", basis: "explicit", filters: [{ field: "currentRatio", op: ">", value: 1.3 }] },
          { phrase: "quick ratio no lower than 1", concept: "quickRatio", basis: "explicit", filters: [{ field: "quickRatio", op: "<", value: 1 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "quickRatio|>=|1"));
  assert(!result.filters.some((filter) => key(filter) === "quickRatio|<|1"));
  const quickRatio = result.ledger.find((item) => item.concept === "quickRatio");
  assert.equal(quickRatio?.resolution, "llm_explicit");
  assert(quickRatio?.normalizations.includes("comparator grounded from source phrase"));
}

async function unsupportedRentalIncomeCannotBecomeDividendYield() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Apartment landlords with rental income over 7% and conservative leverage.",
    async () => {
      calls++;
      if (calls === 1) return json({
        criteria: [
          { phrase: "Apartment landlords", concept: "property_business", basis: "semantic", filters: [] },
          { phrase: "rental income over 7%", concept: "divYield", basis: "explicit", filters: [{ field: "divYield", op: ">", value: 7 }] },
          { phrase: "conservative leverage", concept: "low_debt", basis: "parse_default", filters: [] },
        ],
        coverage_issues: [],
        ranking: null,
      });
      return json({
        criteria: [{ phrase: "rental income over 7%", concept: "rental_income", basis: "unsupported", filters: [], reason: "Parse has no rental-income yield field." }],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 2);
  assert(result.filters.some((filter) => key(filter) === "sector|==|Real Estate"));
  assert(result.filters.some((filter) => key(filter) === "debtEquity|<|1"));
  assert(!result.filters.some((filter) => filter.field === "divYield"));
  assert(result.ledger.some((item) => item.phrase === "rental income over 7%" && item.status === "unsupported"));
  assert.equal(result.ledger.find((item) => item.concept === "sector")?.resolution, "sector_ontology");
}

async function ambiguousYieldCanRecoverWithBroaderEvidenceSpan() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Dividend stocks yielding over 4%.", async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [{ phrase: "yielding over 4%", concept: "divYield", basis: "explicit", filters: [{ field: "divYield", op: ">", value: 4 }] }],
      coverage_issues: [],
      ranking: "dividend",
    });
    return json({
      criteria: [{ phrase: "Dividend stocks yielding over 4%", concept: "divYield", basis: "explicit", filters: [{ field: "divYield", op: ">", value: 4 }] }],
      coverage_issues: [],
      ranking: "dividend",
    });
  });
  assert.equal(calls, 2);
  assert.equal(result.audit.status, "recovered");
  assert(result.filters.some((filter) => key(filter) === "divYield|>|4"));
  assert.equal(result.ledger.find((item) => item.concept === "divYield")?.resolution, "llm_explicit");
}

async function fiftyTwoWeekHighUsesStoredNegativeRepresentation() {
  let calls = 0;
  const below = await parseWithCriterionLedgerV2(
    "Consumer businesses more than 20% below their 52-week high but up over 2% this week.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Consumer businesses", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Consumer" }] },
          { phrase: "more than 20% below their 52-week high", concept: "from52wHigh", basis: "explicit", filters: [{ field: "from52wHigh", op: ">", value: 20 }] },
          { phrase: "up over 2% this week", concept: "chg1w", basis: "explicit", filters: [{ field: "chg1w", op: ">", value: 2 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert(below.filters.some((filter) => key(filter) === "from52wHigh|<|-20"));
  const high = below.ledger.find((item) => item.concept === "from52wHigh");
  assert(high?.normalizations.includes("comparator grounded from source phrase"));
  assert(high?.normalizations.includes("numeric representation normalized"));

  calls = 0;
  const within = await parseWithCriterionLedgerV2("Stocks within 5% of their 52-week high.", async () => {
    calls++;
    return json({
      criteria: [{ phrase: "within 5% of their 52-week high", concept: "from52wHigh", basis: "explicit", filters: [{ field: "from52wHigh", op: ">=", value: 5 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert(within.filters.some((filter) => key(filter) === "from52wHigh|>=|-5"));
}

async function metricFamilyEvidenceIgnoresPunctuationVariants() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Technology companies with free-cash-flow yield no less than 5%.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
          { phrase: "free-cash-flow yield no less than 5%", concept: "fcfYield", basis: "explicit", filters: [{ field: "fcfYield", op: ">=", value: 5 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "fcfYield|>=|5"));
}

async function excludedNumericPredicateCompilesItsComplement() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Semiconductor firms with revenue growth above 20%, but exclude any with beta over 1.4.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Semiconductor firms", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
          { phrase: "revenue growth above 20%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 20 }] },
          { phrase: "exclude any with beta over 1.4", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: ">", value: 1.4 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "beta|<=|1.4"));
  assert(!result.filters.some((filter) => key(filter) === "beta|>|1.4"));
}

async function formalLogicHandlesInclusiveExclusionsAndAnnualHighs() {
  let calls = 0;
  const excluded = await parseWithCriterionLedgerV2(
    "Technology companies, but exclude any with beta at or above 1.4.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
          { phrase: "exclude any with beta at or above 1.4", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: ">=", value: 1.4 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert(excluded.filters.some((filter) => key(filter) === "beta|<|1.4"));

  calls = 0;
  const annualHigh = await parseWithCriterionLedgerV2("Stocks within 4% of their annual high.", async () => {
    calls++;
    return json({
      criteria: [{ phrase: "within 4% of their annual high", concept: "from52wHigh", basis: "explicit", filters: [{ field: "from52wHigh", op: "<=", value: 4 }] }],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 1);
  assert(annualHigh.filters.some((filter) => key(filter) === "from52wHigh|>=|-4"));
  assert(!annualHigh.filters.some((filter) => key(filter) === "from52wHigh|<=|-4"));
}

async function narrowModelEvidenceRetainsClearOuterExclusionScope() {
  const cases = [
    {
      query: "Exclude businesses with beta at or above 1.25; focus on healthcare equipment makers with forward P/E below 23.",
      criteria: [
        { phrase: "beta at or above 1.25", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: ">=", value: 1.25 }] },
        { phrase: "healthcare equipment makers", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Healthcare" }] },
        { phrase: "forward P/E below 23", concept: "forwardPe", basis: "explicit", filters: [{ field: "forwardPe", op: "<", value: 23 }] },
      ],
      expected: "beta|<|1.25",
      forbidden: "beta|>=|1.25",
      evidence: "Exclude businesses with beta at or above 1.25",
    },
    {
      query: "Communications companies, but leave out any with RSI above 68; require free-cash-flow yield of at least 4%.",
      criteria: [
        { phrase: "Communications companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Communications" }] },
        { phrase: "RSI above 68", concept: "rsi", basis: "explicit", filters: [{ field: "rsi", op: ">", value: 68 }] },
        { phrase: "free-cash-flow yield of at least 4%", concept: "fcfYield", basis: "explicit", filters: [{ field: "fcfYield", op: ">=", value: 4 }] },
      ],
      expected: "rsi|<=|68",
      forbidden: "rsi|>|68",
      evidence: "leave out any with RSI above 68",
    },
    {
      query: "Avoid stocks with payout ratio below 20%; show profitable consumer businesses.",
      criteria: [
        { phrase: "payout ratio below 20%", concept: "payoutRatio", basis: "explicit", filters: [{ field: "payoutRatio", op: "<", value: 20 }] },
        { phrase: "profitable", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "consumer businesses", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Consumer" }] },
      ],
      expected: "payoutRatio|>=|20",
      forbidden: "payoutRatio|<|20",
      evidence: "Avoid stocks with payout ratio below 20%",
    },
  ];

  for (const testCase of cases) {
    let calls = 0;
    const result = await parseWithCriterionLedgerV2(testCase.query, async () => {
      calls++;
      return json({ criteria: testCase.criteria, coverage_issues: [], ranking: null });
    });
    assert.equal(calls, 1);
    assert.equal(result.audit.status, "verified");
    assert(result.filters.some((filter) => key(filter) === testCase.expected));
    assert(!result.filters.some((filter) => key(filter) === testCase.forbidden));
    assert(result.ledger.some((item) => item.phrase === testCase.evidence));
  }

  let ambiguousCalls = 0;
  const ambiguous = await parseWithCriterionLedgerV2(
    "Technology companies considering whether to exclude stocks with beta above 1.2.",
    async () => {
      ambiguousCalls++;
      return json({
        criteria: [
          { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
          { phrase: "beta above 1.2", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: ">", value: 1.2 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(ambiguousCalls, 2);
  assert.equal(ambiguous.audit.status, "needs_user_input");
  assert(!ambiguous.filters.some((filter) => filter.field === "beta"));
}

async function naturalRankingFirstPhrasesAreAlreadyAccountedFor() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Utility operators with dividend yield from 2.5% to 5%, payout ratio no more than 75%, highest yield first.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Utility operators", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Utilities" }] },
          { phrase: "dividend yield from 2.5% to 5%", concept: "divYield", basis: "explicit", filters: [{ field: "divYield", op: ">=", value: 2.5 }, { field: "divYield", op: "<=", value: 5 }] },
          { phrase: "payout ratio no more than 75%", concept: "payoutRatio", basis: "explicit", filters: [{ field: "payoutRatio", op: "<=", value: 75 }] },
        ],
        coverage_issues: [],
        ranking: "dividend",
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert.equal(result.ranking, "dividend");
}

async function unknownScalarRelationFailsSafely() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Technology companies with a preferred beta of 1.2.", async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "preferred beta of 1.2", concept: "beta", basis: "explicit", filters: [{ field: "beta", op: "<", value: 1.2 }] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });
  assert.equal(calls, 2);
  assert.equal(result.audit.status, "needs_user_input");
  assert(!result.filters.some((filter) => filter.field === "beta"));
}

async function marketCapRangesGroundUnitsAtBothEndpoints() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Communications names with market capitalization between $15 billion and $80 billion.",
    async () => {
      calls++;
      return json({
        criteria: [
          { phrase: "Communications names", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Communications" }] },
          {
            phrase: "market capitalization between $15 billion and $80 billion", concept: "marketCap", basis: "explicit",
            filters: [{ field: "marketCap", op: ">=", value: 15000000000 }, { field: "marketCap", op: "<=", value: 80 }],
          },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.audit.status, "verified");
  assert(result.filters.some((filter) => key(filter) === "marketCap|>=|15"));
  assert(result.filters.some((filter) => key(filter) === "marketCap|<=|80"));
}

async function substantialUncoveredClauseTriggersSafeRecovery() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2(
    "Healthcare firms with durable competitive advantages and trustworthy management, plus revenue growth above 8%.",
    async () => {
      calls++;
      if (calls === 1) return json({
        criteria: [
          { phrase: "Healthcare firms", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Healthcare" }] },
          { phrase: "revenue growth above 8%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 8 }] },
        ],
        coverage_issues: [],
        ranking: null,
      });
      return json({
        criteria: [
          { phrase: "durable competitive advantages", concept: "competitive_advantage", basis: "unsupported", filters: [], reason: "Parse has no competitive-advantage field." },
          { phrase: "trustworthy management", concept: "management_quality", basis: "unsupported", filters: [], reason: "Parse has no management-quality field." },
        ],
        coverage_issues: [],
        ranking: null,
      });
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.audit.status, "recovered");
  assert(result.filters.some((filter) => key(filter) === "sector|==|Healthcare"));
  assert(result.filters.some((filter) => key(filter) === "revGrowth|>|8"));
  assert.equal(result.ledger.filter((item) => item.status === "unsupported").length, 2);
}

async function uncoveredIdeasAreGroupedForRecovery() {
  let calls = 0;
  let recoveryPrompt = "";
  const query = "Property trusts earning more than they spend, revenue outpacing 6%, lightly encumbered balance sheets, and no heroic valuation.";
  const result = await parseWithCriterionLedgerV2(query, async (input) => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Property trusts", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Real Estate" }] },
        { phrase: "revenue outpacing 6%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">=", value: 6 }] },
      ],
      coverage_issues: [
        { phrase: "earning more than they spend", type: "missing", reason: "Profitability was omitted." },
        { phrase: "lightly encumbered balance sheets", type: "missing", reason: "Leverage was omitted." },
        { phrase: "no heroic valuation", type: "missing", reason: "Valuation was omitted." },
      ],
      ranking: null,
    });
    recoveryPrompt = input.user;
    return json({
      criteria: [
        { phrase: "earning more than they spend", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "lightly encumbered balance sheets", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "no heroic valuation", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.match(recoveryPrompt, /earning more than they spend/);
  assert.match(recoveryPrompt, /lightly encumbered balance sheets/);
  assert.match(recoveryPrompt, /no heroic valuation/);
  assert(!recoveryPrompt.includes('"phrase":"earning"'));
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "sector|==|Real Estate", "operatingMargin|>|0", "revGrowth|>|6", "debtEquity|<|1", "pe|<|25",
  ]));
}

async function failedRecoveryIsUnverifiedAndNeutralized() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Technology companies making money with a fair valuation.", async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "making money", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "fair valuation", concept: "low_debt", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "fair valuation", type: "incorrect", reason: "This is valuation, not leverage." }],
      ranking: null,
    });
    throw new Error("provider unavailable");
  });

  assert.equal(calls, 2);
  assert.equal(result.audit.status, "unverified");
  assert(result.filters.some((filter) => key(filter) === "sector|==|Technology"));
  assert(result.filters.some((filter) => key(filter) === "operatingMargin|>|0"));
  assert(!result.filters.some((filter) => key(filter) === "debtEquity|<|1"));
}

async function unresolvedStillFailsSafely() {
  let calls = 0;
  const query = "Technology companies with unusually resilient fundamentals.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    return json({
      criteria: [{ phrase: "unusually resilient fundamentals", concept: "unknown", basis: "unresolved", filters: [], reason: "No deterministic mapping." }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.equal(result.audit.status, "needs_user_input");
  assert(result.audit.issues.some((issue) => issue.phrase === "unusually resilient fundamentals"));
  assert(!result.filters.some((filter) => filter.field !== "sector"));
}

async function incorrectCriterionIsReplacedInIsolation() {
  let calls = 0;
  const query = "Technology companies making money with a fair valuation.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Technology companies", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "making money", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "fair valuation", concept: "low_debt", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [{ phrase: "fair valuation", type: "incorrect", reason: "This is valuation, not leverage." }],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "fair valuation", concept: "reasonable_valuation", basis: "parse_default", filters: [] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "sector|==|Technology", "operatingMargin|>|0", "pe|<|25",
  ]));
  assert(!result.filters.some((filter) => key(filter) === "debtEquity|<|1"));
}

async function novelWordingNeedsNoPhraseDictionary() {
  let calls = 0;
  const query = "Loan-book operators printing black ink, turnover eclipsing 14%, restrained borrowings, and undemanding multiples.";
  const result = await parseWithCriterionLedgerV2(query, async () => {
    calls++;
    return json({
      criteria: [
        { phrase: "Loan-book operators", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Financials" }] },
        { phrase: "printing black ink", concept: "profitable", basis: "parse_default", filters: [] },
        { phrase: "turnover eclipsing 14%", concept: "revGrowth", basis: "explicit", filters: [{ field: "revGrowth", op: ">", value: 14 }] },
        { phrase: "restrained borrowings", concept: "low_debt", basis: "parse_default", filters: [] },
        { phrase: "undemanding multiples", concept: "reasonable_valuation", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 1);
  assert.equal(matchSectorLexicon(query).length, 0);
  assert.deepEqual(new Set(result.filters.map(key)), new Set([
    "sector|==|Financials", "operatingMargin|>|0", "revGrowth|>|14", "debtEquity|<|1", "pe|<|25",
  ]));
}

async function sectorDictionaryChallengesRatherThanOverrides() {
  let calls = 0;
  const result = await parseWithCriterionLedgerV2("Banks making money.", async () => {
    calls++;
    if (calls === 1) return json({
      criteria: [
        { phrase: "Banks", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Technology" }] },
        { phrase: "making money", concept: "profitable", basis: "parse_default", filters: [] },
      ],
      coverage_issues: [],
      ranking: null,
    });
    return json({
      criteria: [{ phrase: "Banks", concept: "sector", basis: "semantic", filters: [{ field: "sector", op: "==", value: "Financials" }] }],
      coverage_issues: [],
      ranking: null,
    });
  });

  assert.equal(calls, 2);
  assert(result.filters.some((filter) => key(filter) === "sector|==|Financials"));
  assert(!result.filters.some((filter) => key(filter) === "sector|==|Technology"));
  assert(result.filters.some((filter) => key(filter) === "operatingMargin|>|0"));
}

function sectorLexiconCoversCuratedIndustryTerms() {
  const cases: Array<[string, string]> = [
    ["software", "Technology"], ["banks", "Financials"], ["biotech", "Healthcare"], ["restaurants", "Consumer"],
    ["oilfield services", "Energy"], ["logistics", "Industrials"], ["wireless carriers", "Communications"],
    ["water utilities", "Utilities"], ["metals & mining", "Materials"], ["property trusts", "Real Estate"],
  ];
  for (const [phrase, sector] of cases) {
    assert(matchSectorLexicon(phrase).some((match) => match.sector === sector && match.op === "=="), `${phrase} should map to ${sector}`);
  }
  const mortgageReit = matchSectorLexicon("mortgage REITs");
  assert(mortgageReit.some((match) => match.sector === "Financials"));
  assert(!mortgageReit.some((match) => match.sector === "Real Estate"));
}

async function run() {
  await normalPath();
  await boundedFallback();
  await fallbackCannotDeleteValidCriteria();
  await commonScopeIsBackfilledWithoutFallback();
  await invalidKnownSectorIsReplacedByBackstop();
  await invalidScopeOnlySectorVariantIsReplacedWithoutFallback();
  await semanticDefaultBasisIsCanonicalized();
  await numericBasisMismatchIsLoggedAndFallbackStaysStrict();
  await recoveryReplacesNarrowDuplicateDefault();
  await meaningfulCoverageIgnoresGrammarAndAccountsForRanking();
  await uncoveredNumberStillTriggersBoundedRecovery();
  await semanticSectorContractAndMultipleOntologyMatchesAreNormalized();
  await marketCapUnitsNormalizeToBillions();
  await percentageRangesRemainGrounded();
  await negatedComparatorsAreDeterministicallyGrounded();
  await unsupportedRentalIncomeCannotBecomeDividendYield();
  await ambiguousYieldCanRecoverWithBroaderEvidenceSpan();
  await fiftyTwoWeekHighUsesStoredNegativeRepresentation();
  await metricFamilyEvidenceIgnoresPunctuationVariants();
  await excludedNumericPredicateCompilesItsComplement();
  await formalLogicHandlesInclusiveExclusionsAndAnnualHighs();
  await narrowModelEvidenceRetainsClearOuterExclusionScope();
  await naturalRankingFirstPhrasesAreAlreadyAccountedFor();
  await unknownScalarRelationFailsSafely();
  await marketCapRangesGroundUnitsAtBothEndpoints();
  await substantialUncoveredClauseTriggersSafeRecovery();
  await uncoveredIdeasAreGroupedForRecovery();
  await failedRecoveryIsUnverifiedAndNeutralized();
  await unresolvedStillFailsSafely();
  await incorrectCriterionIsReplacedInIsolation();
  await novelWordingNeedsNoPhraseDictionary();
  await sectorDictionaryChallengesRatherThanOverrides();
  sectorLexiconCoversCuratedIndustryTerms();
  console.log("criterion-ledger-v2 regressions: PASS");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
