# Clarity (Saral AI)

GenAI-powered assistant that makes residential leases simple enough to read, question, and act on.

This repo follows [`Clarity_Final_Architecture.md`](./Clarity_Final_Architecture.md).

## Status

| Phase | Status |
|-------|--------|
| 1 — Skeleton & Upload | Done — see [`docs/phase-1.md`](./docs/phase-1.md) |
| 2 — Simplify | Done — see [`docs/phase-2.md`](./docs/phase-2.md) |

**Phase 2** adds Groq-powered plain-language paraphrases with `entity_check()`, session caching, and the Simplify screen (Plain / Original toggle).

## Quick start

```bash
npm install
cp .env.example .env.local
# Set GROQ_API_KEY in .env.local for Simplify (upload/overview work without it)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload `fixtures/leases/sample-lease.txt`, open Overview, then **Simplify it**.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + API tests |
| `npm run test:coverage` | Coverage with thresholds on `lib/**` |
| `npm run test:e2e` | Build + Playwright smoke against `next start` |
| `npm run audit` | Dependency audit (production) |

## Privacy model

Sessions live in a process-local `Map` keyed by a random token held in `sessionStorage`. Closing the tab (or restarting the server) clears them. Uploaded bytes are never written to disk. GenAI logs are metadata-only (no document or chat content).
