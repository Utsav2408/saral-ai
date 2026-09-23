# Corpus source provenance

Reference materials for **hand-curating** Phase 3 statute chunks.
Runtime chat never reads these PDFs — only the pre-embedded curated corpus
(`data/corpus/embeddings.json` after the embed script runs).

**Discipline:** spot-check every chunk against the source before it enters the
corpus. A wrong citation is worse than a smaller corpus.

| File | Instrument | Retrieved from | Retrieved | Notes |
|---|---|---|---|---|
| `sources/maharashtra/maharashtra-rent-control-act-1999.webfetch-extract.txt` | Maharashtra Rent Control Act, 1999 | India Code (`indiacode.nic.in` / `upload.indiacode.nic.in`) via WebFetch text extract | 2026-09-23 | Official PDF hosts timed out from this environment. Prefer re-download from India Code when reachable: [handle/123456789/15817](https://www.indiacode.nic.in/handle/123456789/15817). Verify sections by hand before chunking. |
| `sources/uttar-pradesh/up-urban-premises-tenancy-act-2021.pdf` | UP Regulation of Urban Premises Tenancy Act, 2021 | [PRS Legislative Research](https://prsindia.org/files/bills_acts/acts_states/uttar-pradesh/2021/Act%20No%2016%20of%202021%20UP.pdf) | 2026-09-23 | Explicitly non-authoritative; reliable for a demo corpus. Spot-check key sections. |
| `sources/central/rera-act-2016.pdf` | Real Estate (Regulation and Development) Act, 2016 | [UP RERA portal mirror](https://www.up-rera.in/pdf/reraact.pdf) of the central Act | 2026-09-23 | Prefer India Code when reachable: [handle/123456789/2158](https://indiacode.nic.in/handle/123456789/2158). |
| `sources/central/model-tenancy-act-2021.pdf` | Model Tenancy Act, 2021 | LiveLaw upload of MoHUA Model Tenancy Act text (MoHUA deep-link returned HTML) | 2026-09-23 | Confirm against MoHUA’s Model Acts page before demo: [mohua.gov.in](https://www.mohua.gov.in). Model Act is for adoption by states — tag chunks as `model`, not as binding MH/UP law. |

## Citation pill destinations (not downloaded)

Chat citation pills for RERA rules should link to the **official portals**, not PDF mirrors:

| State | Portal |
|---|---|
| Maharashtra RERA | https://maharera.mahaonline.gov.in |
| UP RERA | https://up-rera.in |

## Case law

Hand-pick **2–4** illustrative judgments from [indiankanoon.org](https://indiankanoon.org) only.
Never bulk-scrape. Store short, attributed excerpts under `sources/case-law/` with
`SOURCES.md` rows added here when chosen. See `sources/case-law/README.md`.

## License / use

These materials are government / legislative texts used for an educational demo.
Do not redistribute as an official gazette. Do not log or ship user lease text
alongside this corpus.
