# Phase 5 — Polish & Demo

## Goal

Ready to put in front of a judge: graceful failures, accessibility verification,
seeded demo documents, and a dry-run script so someone who has never seen the
app can complete the full flow without narration.

## What changed

| Area | Change |
|------|--------|
| Errors | Shared `ErrorPanel` + `mapApiError`; AI routes never return `GROQ_API_KEY` hints; Retry on activity pages; Chat restores draft on failure (no orphan bubbles); `app/error.tsx`, `global-error.tsx`, `not-found.tsx`; session expiry → `/?reason=expired` |
| A11y | Skip link, `<main id="main">`, file-input label, Simplify tabpanels + arrow keys, Overview `aria-controls`, Chat `aria-live`; Playwright axe smoke |
| Security | `CLARITY_EMBEDDINGS_PATH` constrained under `data/corpus/`; citation URLs reject userinfo; stronger `safeLog` / citation tests |
| Demo | Three fixtures + committed `sample-lease.pdf`; this dry-run script |

## Explicitly out of scope

Photo/OCR, durable session store, i18n, streaming, vector DB, full corpus scrapers.

## Security notes

- Upload: 5 MB, MIME + extension + PDF magic bytes; filename path traversal stripped; bytes never written to disk.
- Sessions: 256-bit tokens in `sessionStorage`; TTL 2h; in-memory `Map` only.
- Citations: https + host allowlist; no `javascript:`; no userinfo.
- LLM output rendered as React text nodes only (no `dangerouslySetInnerHTML`).
- GenAI logs are metadata-only (`safeLog`) — never document or chat body text.
- CSP in `next.config.ts` allows `'unsafe-inline'` / `'unsafe-eval'` on scripts — known Next.js App Router hydration tradeoff for this challenge; do not “fix” CSP under demo time pressure.
- `GROQ_API_KEY` is server-only (never `NEXT_PUBLIC_`).

## Fixtures

| Path | Demo moment |
|------|-------------|
| `fixtures/leases/sample-lease.txt` | Happy path — all four activities |
| `fixtures/leases/sample-lease.pdf` | PDF upload path |
| `fixtures/leases/high-deposit-lease.txt` | Summary flag `deposit_high_vs_rent` |
| `fixtures/leases/escalation-trigger-lease.txt` | Options escalation banner |

## Dry-run script (~8–12 minutes)

### Prep

```bash
cp .env.example .env.local
# set GROQ_API_KEY=...
npm install
npm run corpus:embed   # only if you edited corpus chunks
npm run build && npm start
# or: npm run dev
```

Open http://localhost:3000

### Happy path (sample lease)

1. **Home** — Choose file → `fixtures/leases/sample-lease.txt`.
2. **Overview** — Confirm deposit ₹1,50,000, lease start, notice; expand a clause.
3. **Simplify** — Toggle Plain language ↔ Original text.
4. **Chat** — Ask “Is this deposit legal?” — expect a reply with citation pills (no invented statute names).
5. **Summary** — Overview prose, any flags, checklist items.
6. **Options** — RERA cards + next steps (no escalation banner on the sample lease).

### High deposit

1. Back to Home → upload `fixtures/leases/high-deposit-lease.txt`.
2. Overview shows ₹5,00,000 deposit.
3. Summary → flag for high deposit vs rent.

### Escalation Guard

1. Home → upload `fixtures/leases/escalation-trigger-lease.txt`.
2. Options → red **Seek qualified help** banner.

### Failure recovery (optional)

- Unsupported upload (e.g. PNG) → calm alert, no stack.
- With GenAI mocked/unavailable: activity pages show “temporarily unavailable” + **Retry** (never `GROQ_API_KEY` on screen).

## Test matrix

| Command | What it covers |
|---------|----------------|
| `npm test` | Unit + API (locks, mapApiError, safeLog, corpus path, activities) |
| `npm run test:coverage` | `lib/**` thresholds (90% lines/functions/statements, 78% branches) |
| `npm run test:e2e` | Upload/overview, mocked activities, errors, a11y axe, high-deposit, PDF |
| `LIVE_E2E=1 GROQ_API_KEY=… npx playwright test e2e/live-smoke.spec.ts` | Unmocked Options escalation (skipped in default CI) |
| `npm run audit` | Production dependency audit |

## Pre-demo gate

```bash
npm run lint && npm run typecheck && npm test && npm run test:coverage && npm run test:e2e && npm run audit
```

Then walk the dry-run script once with a live `GROQ_API_KEY`.

## Done checklist

- [x] Shared error UX + sanitized AI messages
- [x] A11y verification + axe smoke
- [x] Embeddings path containment + citation/safeLog hardening
- [x] Demo fixtures + PDF + dry-run doc
- [x] Lock / API / e2e gap tests
- [ ] Live dry-run performed before the judging session
