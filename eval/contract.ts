import assert from "node:assert/strict";
import { coerceActions, coerceFilter, coerceFilters, enforceRefinementIntent, extractJsonObject } from "../lib/parse-contract";

function test(name: string, fn: () => void) {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (err) { console.error(`FAIL  ${name}`); throw err; }
}

test("extracts plain JSON", () => {
  assert.deepEqual(extractJsonObject('{"filters":[]}'), { filters: [] });
});

test("extracts fenced JSON case-insensitively", () => {
  assert.deepEqual(extractJsonObject('```JSON\n{"filters":[]}\n```'), { filters: [] });
});

test("rejects malformed model output", () => {
  assert.throws(() => extractJsonObject("not json"));
});

test("coerces numeric strings", () => {
  assert.equal(coerceFilter({ field: "pe", op: "<", value: "20" })?.value, 20);
});

test("canonicalizes sector case", () => {
  assert.equal(coerceFilter({ field: "sector", op: "==", value: "technology" })?.value, "Technology");
});

test("rejects unknown fields including prototype names", () => {
  assert.equal(coerceFilter({ field: "__proto__", op: "==", value: 1 }), null);
  assert.equal(coerceFilter({ field: "madeUpMetric", op: "<", value: 10 }), null);
});

test("rejects invalid categorical operators", () => {
  assert.equal(coerceFilter({ field: "sector", op: ">", value: "Energy" }), null);
});

test("rejects numeric !=", () => {
  assert.equal(coerceFilter({ field: "pe", op: "!=", value: 20 }), null);
});

test("rejects invalid sector values", () => {
  assert.equal(coerceFilter({ field: "sector", op: "==", value: "Crypto" }), null);
});

test("deduplicates identical filters", () => {
  const filters = coerceFilters([
    { field: "pe", op: "<", value: 20 },
    { field: "pe", op: "<", value: 20 },
  ]);
  assert.equal(filters.length, 1);
});

test("rejects invalid remove action operator instead of widening removal", () => {
  assert.equal(coerceActions([{ type: "remove", field: "pe", op: "approx", value: 20 }]).length, 0);
});

test("deduplicates identical actions", () => {
  assert.equal(coerceActions([
    { type: "add", field: "beta", op: "<", value: 1 },
    { type: "add", field: "beta", op: "<", value: 1 },
  ]).length, 1);
});

test("blocks model remove when user did not ask to remove", () => {
  assert.deepEqual(enforceRefinementIntent("Also require revenue growth above 10%", [
    { type: "remove", field: "pe" },
    { type: "add", field: "revGrowth", op: ">", value: 10 },
  ]), [{ type: "add", field: "revGrowth", op: ">", value: 10 }]);
});

test("downgrades unsolicited replace to add", () => {
  assert.deepEqual(enforceRefinementIntent("Also require P/E above 10", [
    { type: "replace", field: "pe", op: ">", value: 10 },
  ]), [{ type: "add", field: "pe", op: ">", value: 10 }]);
});

test("allows explicit replacement", () => {
  assert.deepEqual(enforceRefinementIntent("Change P/E to under 18", [
    { type: "replace", field: "pe", op: "<", value: 18 },
  ]), [{ type: "replace", field: "pe", op: "<", value: 18 }]);
});

console.log("\n15/15 parser contract tests passed\n");
