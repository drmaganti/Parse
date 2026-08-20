import { strict as assert } from "node:assert";
import {
  compileLogicalOperator,
  groundedLogicalOperator,
  logicalConstraintFromPhrase,
  relationFromPhrase,
  type ScalarRelation,
} from "../lib/logical-constraints";

const relations: Array<[string, ScalarRelation]> = [
  ["at most 10", "lte"],
  ["at or below 10", "lte"],
  ["no greater than 10", "lte"],
  ["at least 10", "gte"],
  ["at or above 10", "gte"],
  ["no lower than 10", "gte"],
  ["under 10", "lt"],
  ["south of 10", "lt"],
  ["above 10", "gt"],
  ["turnover eclipsing 10", "gt"],
  ["revenue tops 10", "gt"],
];

for (const [phrase, expected] of relations) {
  assert.equal(relationFromPhrase(phrase), expected, phrase);
}

const truthTable: Array<[ScalarRelation, string, string]> = [
  ["gt", ">", "<="],
  ["gte", ">=", "<"],
  ["lt", "<", ">="],
  ["lte", "<=", ">"],
];

for (const [relation, included, excluded] of truthTable) {
  assert.equal(compileLogicalOperator({ relation, selection: "include", domain: "direct" }), included);
  assert.equal(compileLogicalOperator({ relation, selection: "exclude", domain: "direct" }), excluded);
}

assert.equal(groundedLogicalOperator("exclude beta at or above 1.4", "beta"), "<");
assert.equal(groundedLogicalOperator("within 4% of the annual high", "from52wHigh"), ">=");
assert.equal(groundedLogicalOperator("more than 20% below the 52-week high", "from52wHigh"), "<");
assert.equal(groundedLogicalOperator("avoid stocks at least 20% below their yearly high", "from52wHigh"), ">");
assert.equal(groundedLogicalOperator("an appealing beta of 1.2", "beta"), null);
assert.deepEqual(logicalConstraintFromPhrase("within 4% of the annual high", "from52wHigh"), {
  relation: "lte",
  selection: "include",
  domain: "distance_below_high",
});

console.log("logical-constraints regressions: PASS");
