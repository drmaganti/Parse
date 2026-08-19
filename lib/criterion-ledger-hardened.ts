import {
  parseWithCriterionLedgerV2,
  type CriterionParseResult,
} from "./criterion-ledger-v2";

export async function parseWithCriterionLedgerHardened(query: string): Promise<CriterionParseResult> {
  return parseWithCriterionLedgerV2(query);
}
