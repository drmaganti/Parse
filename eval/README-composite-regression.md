This file exists to make the reported production regression easy to find in repository history.

The exact user-reported prompt is covered by `eval/composite-regressions.ts` and `eval/release-regressions.json`:

`Large companies that are not tech but are cheap. Not dead cheap though.`

Expected interpretation:
- market cap > $50B
- exclude Technology
- P/E between 10 and 20
- P/B < 4
- value ranking
- explicit assumption for the fuzzy `not dead cheap` phrase

The data-contract portion also verifies that Biotechnology and Pharmaceutical industries map to Healthcare rather than Technology.
