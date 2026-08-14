# Parse acquisition playbook

This document tracks the distribution work around the product-led SEO and sharing loops now built into getparse.app.

## North-star funnel

Measure acquisition as a product funnel, not pageviews alone:

1. Visitor
2. `try_parse_clicked` or public-screen entry
3. `screen_run_started`
4. `screen_run_success`
5. `screen_filter_edited` / `screen_filter_removed`
6. `screen_shared`
7. `signup_started`
8. `signup_completed`

Primary weekly metrics:
- non-brand organic visitors
- visitor → successful screen conversion
- successful screen → second screen / filter-edit rate
- successful screen → share rate
- successful screen → signup rate
- public screen pages receiving search impressions

## Search acquisition

High-intent landing pages:
- `/ai-stock-screener`
- `/natural-language-stock-screener`
- `/free-ai-stock-screener`
- `/stock-screener-for-beginners`
- `/finviz-alternative`
- `/tradingview-screener-alternative`

Product-led pages:
- `/screens`
- 20 curated `/screens/<slug>` pages

Rules:
- Add new public screens only when the query maps cleanly to Parse's supported fields.
- Keep user-generated `/screens/share?q=...` URLs no-index.
- Add 3–5 new curated screens only when Search Console reveals a useful query cluster or product usage shows repeated demand.
- Do not mass-generate thin pages.

## Launch sequence

Prioritize channels that provide both discovery and a durable backlink/profile.

### Tier 1
- Product Hunt
- BetaList
- Tiny Startups
- Indie Hackers
- Hacker News (`Show HN`) when there is a substantive product story/update

### Tier 2
- Startups.fm
- AlternativeTo (position Parse as a language-first alternative, not a feature-for-feature replacement)
- AI-tool directories where submission is free and editorial quality is acceptable

### Avoid / use cautiously
- r/stocks: current moderation explicitly prohibits pushing a site/app/tool.
- broad investing communities that prohibit self-promotion: contribute useful research without disguising promotion.
- paid directory packages until organic conversion is measured.

## Community experiment format

Do not lead with “I built an AI stock screener.” Lead with a research question and the useful output.

Experiment A — screen result
- Pick one timely but non-recommendation screen.
- Explain the question, the transparent criteria, and what was surprising.
- Link only where community rules permit it.

Experiment B — product-design story
- Problem: screeners force users to translate an investing idea into dozens of filter controls.
- Product decision: use the model only for natural-language → explicit filter translation.
- Differentiator: users inspect and edit the interpretation instead of receiving a black-box recommendation.

Experiment C — build-in-public
- Share a specific change or learning (for example, which ambiguous prompts fail and how Parse surfaces assumptions).
- Ask for critique rather than upvotes.

Track every external link with a `source` parameter where practical, e.g. `/try?source=product_hunt` or a curated screen URL with the campaign source recorded in the post notes.

## Comparison / backlink outreach

Current 2026 pages worth approaching because they already cover the category:
- MoneyFlock — AI stock screener comparison
- Trader Alternatives — Finviz alternatives
- DayTradingz — Finviz alternatives
- AlternativeTo — Finviz alternatives directory
- Find My Moat — Finviz alternatives directory

Pitch angle:
- Parse is not another AI signal/rating product.
- It is a natural-language interface for constructing transparent, editable screens.
- Guest usage is available without an account.
- Current scope is intentionally narrower: S&P 500 + Nasdaq 100, daily-refreshed data.
- Offer the reviewer a direct curated-screen link plus `/try`; do not ask for a positive review or paid placement.

Outreach template:

Subject: A different AI stock screener to consider for your comparison

Hi — I came across your stock-screener comparison while researching how people discover screening tools. I built Parse (getparse.app), which takes a slightly different approach from AI signal products: you describe a screen in plain English, Parse translates it into explicit financial filters, and the user can inspect and change those filters before running it.

It is free to try without an account and currently covers the S&P 500 + Nasdaq 100 with daily-refreshed data. If you update the comparison, I’d be happy for you to test it and decide independently whether it belongs there.

A quick place to start: https://getparse.app/screens
Product: https://getparse.app/try

Thanks,
Ram

## 30-day operating cadence

Weekly:
- review Search Console non-brand queries and pages
- review GA4 acquisition source → successful-screen conversion
- publish/share 2 useful screens where community rules allow
- submit to or maintain 1 launch/directory profile
- approach 2 relevant comparison/review pages
- add or improve at most 1–2 SEO pages based on evidence, not keyword volume alone

After 30 days, keep channels that produce successful screens/signups and stop channels that only produce pageviews.
