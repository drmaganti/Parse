import { strict as assert } from "node:assert";
import { adaptForGoogle, criterionLedgerResponseSchema } from "../lib/llm-adapters";

const adapted = adaptForGoogle({
  system: "Extract criteria.",
  user: "Loan-book operators with turnover beyond 9%.",
  task: "criterion_ledger",
}, "gemini-2.5-flash");

assert.match(adapted.systemInstruction.parts[0].text, /financial stock-screening product/i);
assert.match(adapted.systemInstruction.parts[0].text, /Infer by financial meaning/i);
assert.equal(adapted.contents[0].parts[0].text, "Loan-book operators with turnover beyond 9%.");
assert.equal(adapted.generationConfig.responseMimeType, "application/json");
assert.deepEqual(adapted.generationConfig.thinkingConfig, { thinkingBudget: 1024 });
assert.equal(adapted.generationConfig.responseSchema, criterionLedgerResponseSchema());
assert.deepEqual(criterionLedgerResponseSchema().properties.criteria.items.properties.basis.enum, [
  "explicit", "semantic", "parse_default", "unsupported", "unresolved",
]);
assert.equal(criterionLedgerResponseSchema().properties.criteria.items.properties.filters.items.properties.value.type, "string");
assert.equal(criterionLedgerResponseSchema().properties.ranking.nullable, true);
assert(!("additionalProperties" in criterionLedgerResponseSchema()));

const generic = adaptForGoogle({ system: "Return JSON.", user: "hello" }, "gemini-2.5-flash");
assert(!("responseSchema" in generic.generationConfig));

const gemini3 = adaptForGoogle({ system: "Return JSON.", user: "hello", task: "criterion_ledger" }, "gemini-3.6-flash");
assert.deepEqual(gemini3.generationConfig.thinkingConfig, { thinkingLevel: "low" });

console.log("llm adapter regressions: PASS");
