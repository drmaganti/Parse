# Roadmap — Parse

This roadmap prioritizes **trustworthy screening, measurable parser quality, reliable data, and focused product learning** before feature breadth.

## Now — strengthen the core loop

### 1. Make interpretation quality measurable

- keep the frozen parse eval suite current;
- add cases from real user corrections and ambiguity;
- track schema-valid parse rate and field/operator correction rate;
- record provider/model/version in eval results;
- establish regression thresholds before model/prompt changes ship.

### 2. Make data freshness visible

- expose last-refresh/freshness metadata where useful;
- monitor ingestion success and field coverage;
- distinguish stale cache from missing values;
- prevent a failed partial ingestion from silently degrading the whole universe.

### 3. Complete the user trust loop

- interpreted filters remain editable before execution;
- explain unsupported/ambiguous concepts;
- make empty-result screens diagnosable;
- preserve user-locked filters through refinement;
- keep ranking/filter semantics visible enough to understand results.

## Next — product usefulness and retention

### Saved/reusable research workflows

- save screens with stable field/operator semantics;
- support rename/delete/duplicate where needed;
- show when a saved screen's methodology/data meaning has materially changed;
- track repeat usage and saved-screen re-runs.

### Result exploration

Improve the step from “screen returned candidates” to “I understand which company deserves deeper research” without turning Parse into an opaque recommendation engine.

Possible capabilities:

- clearer factor/metric context;
- compare selected results;
- launch evidence-grounded Deep analysis through Warren;
- preserve the original screen context when entering a stock detail/deep view.

### Analytics for learning

Measure:

- query → parsed filters → screen completion;
- corrections by field/operator;
- empty screens;
- saved-screen activation/retention;
- screen → deeper stock research conversion;
- parser latency/cost/fallback usage.

Use analytics to identify real product friction, not to optimize vanity engagement.

## Data/methodology improvements

- expand/maintain the stock universe deliberately;
- improve coverage of long-term fundamental fields;
- document per-field source/unit/freshness;
- add provider fallback only where reliability justifies complexity;
- evaluate commercial data licensing before charging users.

## Warren integration milestone

Use Warren to avoid reimplementing reusable stock intelligence:

1. define a narrow Parse → Warren interface;
2. keep Parse screen interpretation separate from Warren's general Screen/Deep modes;
3. pass only the selected ticker/context required for deeper research;
4. surface Warren's evidence/missing-data confidence in Parse;
5. measure whether Deep increases research usefulness enough to justify cost/latency.

## Model-provider strategy

The provider seam exists so model choice can change without product rewrites.

Provider/model changes should be evaluated on:

- parse accuracy on frozen cases;
- ambiguous-query behavior;
- schema validity;
- latency;
- cost;
- reliability/fallback rate.

Do not add multi-agent parsing unless measured evidence shows a single validated parse + fallback cannot meet the product requirement.

## Production/commercial readiness

Before charging users:

- confirm data-provider commercial licensing;
- authentication/RLS review;
- rate limiting/abuse controls;
- error monitoring and ingestion alerts;
- backups/recovery expectations for user-saved screens;
- privacy/retention documentation;
- deployment rollback/runbook;
- parser and screening quality gates in CI.

## Explicitly deferred

- trade execution;
- autonomous portfolio management;
- personalized allocation advice;
- LLM-generated current market facts;
- agent frameworks without an eval-driven reason;
- duplicating Warren's deep-research logic inside Parse.

## Release gates

### Trusted screening beta

- parser regression suite green;
- deterministic fallback verified;
- field vocabulary documented and consistent across layers;
- ingestion freshness monitored;
- saved/user data protected by RLS;
- errors/empty states understandable to users.

### Research-platform candidate

- beta gates remain green;
- measurable repeat usage of saved/refined screens;
- evidence-grounded deep-research handoff tested;
- cost/latency acceptable;
- data licensing supports intended commercial use;
- security/privacy/runbook complete.
