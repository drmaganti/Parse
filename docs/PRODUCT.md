# Product Definition — Parse

## Product statement

Parse is a natural-language stock screener that turns an investor's plain-English idea into an **editable, inspectable filter set**, runs it against cached market/fundamental data, and returns ranked results.

The product is designed around a simple trust loop:

```text
user intent
   ↓
interpreted filters
   ↓
user can inspect/edit
   ↓
deterministic screen
   ↓
ranked research candidates
```

The language model helps translate intent; it is not the source of market facts and should not make opaque investment decisions on the user's behalf.

## Primary user

A self-directed investor or researcher who knows roughly what they want — for example “profitable large caps with strong cash flow that have pulled back” — but does not want to translate the idea manually into dozens of screener controls.

## Jobs to be done

1. **Express a screen naturally.** Let me describe what I mean without learning the product's field vocabulary first.
2. **Show me what you understood.** Convert the prompt into filters I can inspect and correct.
3. **Run the actual screen.** Apply those filters to structured, cached data rather than model memory.
4. **Refine without starting over.** Preserve intentional user edits while improving the query.
5. **Save useful screens.** Let recurring research workflows be reusable.
6. **Understand results.** Make the relevant metrics and ranking basis visible enough to support deeper research.

## Product principles

### Interpretation is editable

A natural-language parser will sometimes misunderstand ambiguity. The correct product response is not to hide that uncertainty; it is to expose the interpretation and let the user edit it.

### Structured data is the source of truth

Market/fundamental values come from the data pipeline/cache. The LLM translates language into a validated schema.

### Graceful degradation

If the configured model is unavailable or performs poorly, the product has a deterministic fallback rather than turning the entire workflow into an error state.

### Evaluation before model preference

Model/provider choices should be made using the parse eval harness and representative cases, not brand preference or anecdotal output quality.

### Screening is not advice

Parse helps users narrow a research universe. It does not know a user's full objectives, tax situation, liquidity needs, portfolio constraints, or risk tolerance.

## Current product capabilities represented in the repository

- natural-language → validated filter parsing;
- shared field vocabulary for technical and long-term fundamental filters;
- editable/refinable interpretation model;
- deterministic screening/ranking over cached structured rows;
- nightly ingestion pattern;
- provider abstraction for LLM parsing;
- deterministic fallback parser;
- parse-quality eval harness;
- Supabase data/auth/saved-screen architecture;
- PostHog/analytics and design/growth artifacts elsewhere in the repo.

Refer to the code and README for current implementation status of each UI slice; this product document defines the intended product contract rather than claiming every planned surface is complete.

## Success measures

### Activation

- % of first-time users who submit a query and reach usable results;
- parse-to-screen completion rate;
- time from first query to first useful result set.

### Interpretation quality

- schema-valid parse rate;
- eval score on frozen explicit/vague cases;
- % of generated filters edited before running;
- correction rate by field/operator;
- fallback invocation and success rates.

### Research usefulness

- % of screens that lead to opening a result/deeper analysis;
- saved-screen rate;
- repeat screen usage;
- refinement rate and successful refinement rate;
- user-rated clarity/trust in interpreted filters.

### Reliability/cost

- ingestion freshness/completeness;
- screen latency/error rate;
- LLM parse cost and latency per query;
- provider failure/fallback rate.

## Non-goals

- autonomous portfolio management;
- trade execution;
- personalized allocation advice;
- allowing an LLM to invent current financial metrics;
- hiding parsing uncertainty behind a polished narrative;
- adding agent/orchestration complexity without a measured problem it solves.

## Key risks

- **Parser trust:** a fluent but incorrect interpretation can produce a valid-looking wrong screen.
- **Data freshness:** stale cached fundamentals/price indicators can mislead users.
- **Field semantics:** ambiguous terms such as “cheap,” “safe,” or “strong growth” require transparent mappings.
- **Licensing:** data-provider terms can constrain commercialization.
- **Model drift:** parser behavior can change across providers/model versions.
- **Feature sprawl:** adding research features can blur the core job of turning intent into a trusted screen.

## Relationship to Warren

Parse should own the **user experience for expressing and refining stock-screening intent**. A reusable stock-intelligence capability such as Warren can later supply deeper/general analysis behind a clean integration boundary. Parse should not duplicate Warren's deep-research implementation, and Warren should not own Parse's conversational screening UX.

## Product decision rule

When forced to choose between a more magical experience and a more inspectable one, prefer inspectability. Trust is a core feature of financial research software.
