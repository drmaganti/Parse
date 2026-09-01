# Architecture — Parse

## System intent

Parse separates three concerns that should not become entangled:

1. **language interpretation** — translate plain English into validated filters;
2. **market/fundamental data** — ingest, normalize, and cache structured facts;
3. **screen execution** — deterministically apply filters/ranking to cached rows.

```text
User query
   ↓
POST /api/parse
   ↓
LLM provider seam ──→ validated filter schema
   │                       ↓
   └── deterministic fallback
                           ↓
                    user inspects/edits
                           ↓
                     screen execution
                           ↓
                    Supabase stock cache
                           ↓
                       results
```

Separately:

```text
GitHub Actions / ingestion
      ↓
market-data provider
      ↓
local indicator calculations
      ↓
normalized stock rows
      ↓
Supabase cache
```

## Main boundaries

### Field vocabulary

`lib/fields.ts` is the shared contract between parsing, ingestion, screening, and UI. New fields should not be introduced in only one layer.

A field definition should have:

- stable identifier;
- user-facing meaning;
- type/unit;
- supported operators;
- null/missing behavior;
- source/derivation;
- appropriate UI formatting.

### Parse layer

`lib/parse.ts` owns model-driven intent translation and schema validation. `lib/llm.ts` provides a provider seam so model/provider decisions are not embedded throughout the application.

`lib/fallback-parse.ts` provides deterministic degradation behavior.

Rules:

- model output must validate before use;
- invalid model output must not become executable filters;
- user-locked/edited filters should not be silently overwritten by a refinement;
- model prompts should receive only the field/operator vocabulary needed for the job;
- provider/model version should be observable when debugging quality regressions.

### Screening layer

`lib/screen.ts` should remain deterministic. Given the same stock rows, filter set, and ranking configuration, it should return the same result.

Do not let LLM output bypass validation or directly rank securities unless that becomes a separately designed/evaluated feature.

### Ingestion/data layer

The ingestion job is the boundary for external market/fundamental data. It should normalize and persist values so user requests do not repeatedly hit external data providers.

Benefits:

- predictable screen latency;
- centralized provider rate limiting;
- keys remain server-side/Actions-only;
- consistent calculations across users;
- easier freshness monitoring.

### Supabase

Supabase provides persisted stock/cache data and application identity/saved-screen storage.

Security rule: service-role credentials belong only in trusted server/CI contexts. Saved-user data must be protected with Row Level Security, not only application checks.

## Indicator calculations

Where indicators such as RSI/SMA are computed locally, calculations should be pure/testable and should preserve missingness when required source data is unavailable.

Do not replace unavailable data with fabricated neutral values merely to make a screen complete.

## Evaluation architecture

The parse eval harness is a product/engineering control, not a demo script.

Use frozen cases to compare:

- model providers/versions;
- prompt/schema changes;
- fallback behavior;
- new field vocabulary;
- ambiguous-query behavior.

A provider change should be justified by measured quality/cost/latency/reliability trade-offs.

## Analytics/observability

The application should be able to answer:

### Parsing

- parse success/schema-validation rate;
- provider/model/fallback used;
- latency and cost;
- most frequently corrected fields/operators.

### Screening

- screen latency/error rate;
- result count distribution;
- empty-result frequency;
- fields most associated with empty screens.

### Data

- last successful ingestion;
- row/factor coverage;
- stale/missing field rates;
- provider errors/rate limits.

Do not log raw sensitive user information unnecessarily.

## Failure behavior

### LLM unavailable

Use deterministic fallback where supported; make limitations visible rather than pretending the fallback is semantically equivalent.

### Data provider unavailable during ingestion

Preserve the last known-good cache when appropriate; record failed/stale refresh state. Do not replace good historical cache with a partially empty run without an explicit policy.

### Partial fields

Screen semantics must define whether a missing field rejects a row, skips a comparison, or makes a filter unsupported. This behavior should be tested and visible enough to debug.

## Security boundaries

- provider keys: server/CI only;
- Supabase service role: server/CI only;
- browser: publishable/anon configuration only;
- saved screens: RLS-protected;
- public screening endpoints: input validation, reasonable request limits, abuse controls before material scale.

See `SECURITY.md`.

## Warren integration direction

If Parse uses Warren, the dependency should be one-way:

```text
Parse UX → Warren API/package
```

Parse remains responsible for conversational screen construction. Warren remains responsible for general reusable stock intelligence/deep analysis. Do not copy Warren methodology into Parse UI code.

## Architecture decision rule

Prefer simple, independently testable boundaries. Introduce orchestration/agents only after an eval demonstrates a failure mode that cannot be solved more cheaply by schema, prompt, deterministic logic, or UX clarification.
