# Parse: first-value and qualified-signup growth sprint (November 2026)

**Product OS decision:** Fix + test. Prioritize meaningful first value and qualified repeat use before paid acquisition or a broader feature roadmap.

## Working hypothesis
Users can get immediate value from transparent, editable stock screens without an account. Signups should be offered **after** a useful screen and should preserve that screen so creating an account does not interrupt research. The acquisition opportunity is distributing useful research screens to investors who already have a screening problem.

## Instrumented journey
1. Landing or curated-screen entry: `$pageview` plus existing `public_screen_clicked` where appropriate.
2. First results shown: `screen_results_viewed` with `entry` and `result_count`. This also fires when a curated/shared state is loaded without pressing Run.
3. Guest interpretation/run: `screen_interpretation_started`, `screen_interpretation_ready`, `screen_run_success`. A preloaded screen **does not** require a new run.
4. Save signup intent: `screen_save_signup_clicked` with `placement`, `has_handoff`, and `source`.
5. Auth: `signup_submitted` for accepted signup attempt, `signup_completed` only if a session immediately exists, `signin_completed` on sign-in. **Authoritative verified account totals come from Supabase Auth**, not frontend counts.
6. Handoff: `signup_handoff_restored` after returning to the authenticated app with the original screen.
7. Research kept: existing `saved_screen_created` and `saved_screen_run`.

Only identify signed-in users in PostHog, using the stable Supabase auth UID. Reset the identity at logout. Exclude internal/testing traffic, crawlers, and self-tests from growth reviews.

### Core weekly measures
- **Qualified first value**: distinct humans with `screen_results_viewed` and `result_count > 0`, with caveats for results quality.
- **Verified signups**: new and verified Supabase Auth users.
- **Successful screen -> save/signup**: users who view positive results, create an account, and save within seven days. Cross-device identity only after sign-in.
- **Seven-day return**: cohort of new users who view another screen or rerun a saved screen within seven days.
- **Channel quality**: tracked campaign/source -> results viewed -> verified account -> repeat use. Never optimize pageviews alone.

## Experiment 1 — Contextual save after first results
**Status:** Code in growth PR; not deployed to production.

- Eligibility: unauthenticated visitor who successfully views a screen using the default universe.
- Experience: “Save screen free” after results. Carry exact query, edited filters, and ranking through signup/sign-in.
- Safeguard: collection-specific universes cannot be faithfully restored in the signed-in screener yet; do not promise an exact handoff for those screens.
- Test: state round-trip, invalid/oversized states, email-confirmation same-browser path, login, logout, no-results, guest-limit edge case, and manual vs preloaded tracking.
- Decisions after enough observations: keep if users save and return; otherwise inspect the session recordings/qualitative feedback before changing the gate.
- Limitation: pending signup state is stored in the same browser for up to 24 hours, across tabs, and cleared after successful restoration. Confirmation/sign-in on another device cannot restore the screen automatically.

## Experiment 2 — 20 qualified investor interviews
Recruit self-directed US-stock investors who have screened stocks with other tools (not friends doing courtesy signups). Include a mix of novices and repeat screeners. Tasks:

1. Name the investing thesis they are trying to research.
2. Find matches using Parse without coaching; observe errors and time to first useful result.
3. Explain the interpreted filters in their own words.
4. Decide whether the results are trustworthy/useful.
5. Try saving and revisiting a screen; ask what would motivate a return next week.

Record source, segment, task success, confusion, false-positive screening expectations, and follow-up willingness. Do not record securities-account details or private portfolio balances.

## Experiment 3 — Reach qualified users
Use the curated screen pages and product-led research content already shipped; do **not** mass-generate additional SEO pages.

- Publish two explanatory research screens with transparent criteria and data-as-of dates. Don't make unsupported financial recommendations.
- Reach out to five relevant independent investing writers/creators with an invitation to test Parse and provide critical feedback.
- Prefer communities permitting substantive research posts; no disguised self-promotion or unsolicited spam.
- Use tracked campaign URLs and report qualified screen use, not clicks alone.
- Review Search Console impressions, non-brand queries, and landing pages after analytics access is established.

## Decision gates
At the end of the sprint compare interview evidence, verified signups, useful screens, saved-screen behavior, and repeat use. If there is qualified interest but signup friction, iterate the conversion path. If visitors use and save but do not return, test a simple change-summary email for saved screens (explicit opt-in required). If qualified visitors cannot reach valuable results, address data coverage, interpretation quality, or positioning before acquiring more traffic.

## Operational constraints
- No paid advertising, unsolicited outreach, mass publishing, or production deploy without an explicit go/no-go.
- Recheck market-data licensing before commercial scale/monetization.
- Small cohorts are directional; do not claim statistically significant A/B results.
- Keep pricing, alerts, and new agentic research features out of this first sprint unless interviews reveal a stronger problem.
