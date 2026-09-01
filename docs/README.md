# Parse Documentation Index

Use the repository `README.md` for setup/runbook and this index for product/engineering handoff.

## Product and strategy

- [`PRODUCT.md`](./PRODUCT.md) — product statement, users, jobs-to-be-done, principles, success measures, risks
- [`ROADMAP.md`](./ROADMAP.md) — trust/data/parser priorities and Warren integration direction
- [`../GROWTH.md`](../GROWTH.md) — growth/product-distribution work already maintained in the repository

## Engineering

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — language/data/screening boundaries, ingestion, evaluation, observability
- [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) — UI/design-system guidance
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — code/data/model change standards
- [`../SECURITY.md`](../SECURITY.md) — secrets, RLS, ingestion and LLM trust boundaries

## Evaluation

- `../eval/` — frozen parse-quality cases and evaluation harness
- repository tests/scripts — deterministic/integration checks as defined by `package.json`

## Source-of-truth guidance

- Field/filter semantics belong in the shared field vocabulary and code, with docs updated when meaning changes.
- Model-provider preference should be evaluated through the eval harness.
- Market/fundamental facts come from the data pipeline/cache, not LLM memory.
- Warren is a downstream reusable analysis boundary; Parse owns conversational screening UX.
