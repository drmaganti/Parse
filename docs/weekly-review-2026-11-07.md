# Parse weekly implementation review — November 7, 2026

## Approved scope and current state

The owner approved work on production-parser quality, dependency risks, and an activation baseline. No issue, assignment, sprint item, customer message, or roadmap change was created. Implementation is prepared for review; production release requires the owner's approval.

## Activation baseline

Window: October 10–November 6, 2026, complete America/Toronto days (2026-10-10 04:00 UTC through 2026-11-07 04:59:59 UTC). Source: PostHog project 571532, verified production hosts getparse.app and www.getparse.app. Existing PostHog test-account filters were enabled. No approved metric definitions exist in the project's metric catalog, so these are explicitly proposed measurement definitions.

| Measure | Observed result |
|---|---:|
| Pageviews | 159 |
| Unique visitors / analytics persons | 36 |
| First-time visitors | 35 |
| Interpretation starts | 2 events / 1 person |
| Interpretations ready | 2 events / 1 person |
| Screen runs started | 1 event / 1 person |
| Successful screens | 1 event / 1 person |
| Visitor → successful screen within 1 day | 1 / 36 (2.78%) |
| First-time visitor → successful screen within 1 day | 1 / 35 (2.86%) |
| Successful screen → another success within 7 days | 0 / 1 |
| Direct-source visitors → success | 1 / 35 |
| Google-source visitors → success | 0 / 1 |

The repeat-screen funnel and weekly successful-screen retention query both show no observed return. The cohort is one person; no reliable retention estimate or causal conclusion follows. Source attribution is the entry pageview's referring domain, not paid-channel attribution.

Missing: captured signup/filter-edit/saved-screen events in the recent event catalog, account-linked cross-device identity, verified owner/internal traffic exclusion, paying-customer counts, revenue currency and period, costs, customer correction traces and interviews. Absence of signup telemetry is not proof of zero account creation. A successful screen event means code completed screening, not that the investor found the results useful. Existing production environment metadata contains PostHog configuration; Vercel Web Analytics queries return “Web Analytics not found” and GA4 configuration is absent from the reviewed environment names.

Current learning priority: observe first-use sessions and measure whether visitors reach a useful screen before expanding product breadth or paid acquisition. This is a recommendation, not an outreach action.

## Parser reconciliation

The November 2 production check reported 115/146 (78.8%) with nine critical flags. Four consecutive weekly checks failed. Original evaluation files remain unchanged. The live runner now uses a dated, rationale-bearing expectation overlay for current supported fields, documented defaults, visible ambiguity and explicit ranking. It still requires at least 95% and zero critical failures. Reports retain scores against both the original frozen expectations and the current contract.

Implemented: shared trailing units for market-cap ranges; negative weekly-change representation; adjacent dividend-yield context; sector exclusions across lists; explicit thresholds overriding defaults; positive revenue growth above zero; rejection of generic “quality” becoming a high-ROIC default; explicit ranking retention without inferred sorting. Added focused positive and negative regression checks and included them in existing CI.

## Dependency review

Original audit: two critical and two high package findings. Patched candidate: Next.js 15.5.29, DOMPurify 3.4.17, PostCSS 8.5.32 using a compatible-major override. The fresh candidate audit reports zero vulnerabilities. This does not prove absence of all security defects.

Next.js 14 → 15 requires asynchronous route params, search params and cookies; affected server entrypoints were migrated. No schema migration or new data collection was added. The current app has no custom server, middleware/i18n access gate, remote image patterns or user CSS pipeline in the reviewed code; several advisory preconditions are absent. Nevertheless the framework and transitive dependencies were updated rather than treating those observations as a permanent waiver.

Sources: [Next.js upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [Next.js image advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [DOMPurify advisory](https://github.com/advisories/GHSA-cg2g-xh64-v4q7).

## Verification and release

Passed before final preview: existing retail/investor-language/composite/offline/parser-contract/liquidity suites, analyst-target checks, all 27 public-screen states, focused trust regressions and production build in an isolated Node 22 environment. Exact release-candidate checks and live-model evaluation are recorded in the pull request; an unrun or pending live test is not a pass.

Independent review identified an explicit-ranking regression; it was fixed and new regression checks added. Follow-up review and live preview verification remain release conditions until recorded.

Owner preview: open the popular-screen link; inspect and edit filters before execution; try shared-unit market-cap and exclusion prompts; confirm an ambiguous request retains a warning; confirm the three-run guest limit; verify signup navigation. Avoid using real customer data for preview tests.

Production rollback: revert the release commit and redeploy the previously serving version. No database rollback is needed. After release verify the serving commit, run read-only and guest-only smoke checks, inspect errors and the next scheduled data-refresh results. Review measured visitor → useful-screen conversion and repeat usage after 14 days; no recurring automation was created.

Evidence: [failed production evaluation](https://github.com/drmaganti/Parse/actions/runs/41538715765), [product roadmap](https://github.com/drmaganti/Parse/blob/main/docs/ROADMAP.md), [existing analytics implementation](https://github.com/drmaganti/Parse/pull/32), [PostHog project](https://us.posthog.com/project/571532), [signup measurement documentation](https://posthog.com/tutorials/nextjs-supabase-signup-funnel).

## Approval boundaries

Automatic approval review rejected copying an existing Google API credential into the isolated sandbox. No credential was transferred. Preview testing uses the hosting provider's existing managed environment. Production deployment remains subject to explicit owner approval under Product OS release review.

