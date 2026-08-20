export type CompletionTask = "generic_json" | "criterion_ledger";

export interface AdapterCompletion {
  system: string;
  user: string;
  task?: CompletionTask;
}

const criterionLedgerSchema = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string", description: "An exact contiguous substring from the original request." },
          concept: { type: "string", description: "One exact controlled field, sector, or default concept key." },
          basis: { type: "string", enum: ["explicit", "semantic", "parse_default", "unsupported", "unresolved"] },
          filters: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                op: { type: "string", enum: ["<", "<=", ">", ">=", "==", "!="] },
                // Legacy generateContent schemas cannot express number|string.
                // Numeric strings are safely coerced by Parse's compiler.
                value: { type: "string", description: "Copy the stated number as a numeric string, or use a canonical categorical value." },
              },
              required: ["field", "op", "value"],
            },
          },
          reason: { type: "string" },
        },
        required: ["phrase", "concept", "basis", "filters"],
      },
    },
    coverage_issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string", description: "An exact contiguous substring from the original request." },
          type: { type: "string", enum: ["missing", "incorrect"] },
          reason: { type: "string" },
        },
        required: ["phrase", "type", "reason"],
      },
    },
    ranking: { type: "string", nullable: true },
  },
  required: ["criteria", "coverage_issues", "ranking"],
} as const;

const GEMINI_LEDGER_PREAMBLE = [
  "You are the Gemini semantic adapter for Parse, a financial stock-screening product.",
  "Translate natural investor language into the shared criterion-ledger contract below; do not answer as an investment adviser.",
  "Infer by financial meaning rather than literal phrase matching. Examples in the shared contract are illustrative, not exhaustive.",
  "For a qualitative documented default, use its exact default concept key, basis=parse_default, and an empty filters array.",
  "For a sector, use concept=sector, basis=semantic, and one canonical sector filter.",
  "For an explicit number, use the exact field key, basis=explicit, and preserve the semantic comparator and stated number.",
  "Keep each criterion atomic and preserve its exact source substring. Use unresolved instead of guessing.",
].join(" ");

export function adaptForGoogle(input: AdapterCompletion, model: string) {
  const criterionLedger = input.task === "criterion_ledger";
  const system = criterionLedger
    ? `${GEMINI_LEDGER_PREAMBLE}\n\nSHARED PARSE CONTRACT:\n${input.system}`
    : input.system;
  const thinkingConfig = model.startsWith("gemini-2.5-")
    ? { thinkingBudget: 1024 }
    : model.startsWith("gemini-3")
      ? { thinkingLevel: "low" }
      : undefined;

  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: input.user }] }],
    generationConfig: {
      ...(!model.startsWith("gemini-3") ? { temperature: 0 } : {}),
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      ...(criterionLedger ? { responseSchema: criterionLedgerSchema } : {}),
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  };
}

export function criterionLedgerResponseSchema() {
  return criterionLedgerSchema;
}
