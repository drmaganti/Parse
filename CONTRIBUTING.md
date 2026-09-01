# Contributing

## Development

Follow the README for environment setup and ingestion requirements.

Before merging a meaningful change, run the relevant checks from `package.json`, including build/eval/tests where applicable.

## Core engineering rules

- Keep natural-language parsing separate from deterministic screening.
- Keep the shared field vocabulary consistent across parser, ingest, screen, and UI.
- Validate all model output before execution.
- Keep secrets and provider keys server-side/CI-only.
- Preserve graceful fallback behavior when changing parser/model code.
- Do not add agent/orchestration frameworks without an eval-demonstrated need.
- Update docs when product semantics or field meanings change.

## Parser changes

Any parser/prompt/model/provider change should run the frozen eval suite.

Review:

- schema-valid rate;
- explicit and vague query cases;
- user-locked filter preservation;
- fallback behavior;
- latency/cost/reliability trade-offs.

A fluent example is not sufficient evidence for a parser change.

## Field changes

New/changed screen fields should update all affected layers:

- field vocabulary/type/operator definitions;
- ingestion/source/derivation;
- screening behavior;
- parser vocabulary/examples;
- UI formatting/control;
- eval/test cases;
- user-facing documentation if semantics are material.

## Data-provider changes

Document provider licensing, units, freshness, rate limits, failure behavior, and whether the change affects commercial use.

## Pull-request checklist

- [ ] Scope is focused.
- [ ] Build/tests/eval status is known.
- [ ] LLM output remains schema-validated.
- [ ] Deterministic screening remains reproducible.
- [ ] User-owned data permissions are not weakened.
- [ ] No secrets are exposed to client code.
- [ ] Data/source/licensing implications are understood.
- [ ] Analytics/privacy implications are considered.
- [ ] Relevant product/architecture/growth/design docs are updated.

## Review priority

1. data access/security;
2. screening and field correctness;
3. parser/eval regressions;
4. data freshness/reliability;
5. product trust/clarity;
6. maintainability;
7. visual polish.
