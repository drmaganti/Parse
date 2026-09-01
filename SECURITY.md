# Security

Parse combines public market data, user accounts/saved screens, external model providers, and scheduled data ingestion. Treat those as separate trust boundaries.

## Secrets

Never expose to browser/client code:

- `SUPABASE_SERVICE_ROLE_KEY`;
- market-data provider private keys;
- LLM provider API keys;
- deployment/GitHub tokens;
- database passwords.

Use deployment/GitHub secret stores. `.env.local` and other real local environment files must remain untracked.

## Supabase authorization

Saved screens/user-owned data must be protected by Row Level Security at the database layer. UI route checks are not sufficient.

Tests/reviews should include negative cases: one authenticated user must not be able to read/write another user's saved objects by changing IDs or making direct requests.

## Data ingestion

The scheduled ingestion path uses elevated credentials and therefore has greater impact than a normal browser request.

- keep service-role keys scoped to trusted CI/server environments;
- validate external provider responses before upsert;
- avoid replacing a good cache with malformed/partial data silently;
- log provider failures without logging secrets;
- protect workflow permissions and third-party Actions versions.

## LLM boundary

LLM output is untrusted input until validated.

- validate against the allowed filter schema;
- reject unknown fields/operators;
- set reasonable request/output limits;
- do not allow prompts/model output to inject SQL or bypass the screening layer;
- keep provider keys server-side;
- avoid including unnecessary personal data in model prompts.

## Public endpoints

Before meaningful public scale, apply:

- input validation;
- request-size limits;
- rate limiting/quotas for expensive parse operations;
- timeouts/retries with bounded behavior;
- abuse monitoring;
- structured logging with secret/user-data redaction.

## Financial-data integrity

- structured providers/cache remain the source of market facts;
- distinguish missing values from zero;
- retain data freshness where possible;
- test field units/derivations;
- do not let LLM output overwrite cached numerical values.

## Dependency and deployment hygiene

- review dependency advisories;
- keep Next.js/Supabase/auth dependencies current;
- keep production environment variables in the hosting platform;
- maintain rollback to a known-good deployment;
- monitor failed ingestion and production API errors.

## Incident response

For credential exposure or unauthorized data access:

1. rotate/revoke affected credentials;
2. restrict the vulnerable route/policy/workflow;
3. preserve useful logs;
4. identify affected data/users/time window;
5. fix the boundary and add a regression test;
6. redeploy/verify;
7. document remediation and follow-up controls.

Do not publish credential values or sensitive exploit details in a public issue before remediation.
