# Case law (hand-picked only)

Architecture: a **small** set of illustrative cases from Indian Kanoon —
never a bulk scrape.

## How to add a case

1. Search on https://indiankanoon.org for a tenancy / deposit / eviction point
   that matches a demo question (e.g. security deposit deductions under MH rent control).
2. Copy **only** the short excerpt needed for a citation (a few paragraphs max).
3. Save as `YYYY-case-short-title.excerpt.txt` with a header block:

```
title: …
court: …
citation: …
url: https://indiankanoon.org/doc/…
retrieved: YYYY-MM-DD
spot_checked: yes
```

4. Add a row to `../../SOURCES.md`.
5. Curate into a chunk in `../../chunks/*.json` during Phase 3 implementation
   (do not auto-ingest this folder at runtime).

## Suggested search themes (not pre-downloaded)

- Security deposit / advance rent under Maharashtra Rent Control Act
- Notice period / eviction procedure (residential)
- RERA applicability boundaries vs pure landlord–tenant rent disputes

Leave this folder empty until those excerpts are deliberately chosen and
spot-checked.
