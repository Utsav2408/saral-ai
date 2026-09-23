# Clarity (Saral AI)

GenAI-powered assistant that makes residential leases simple enough to read, question, and act on.

This repo follows [`Clarity_Final_Architecture.md`](./Clarity_Final_Architecture.md).

## Phase 1 status

**Skeleton & Upload** is implemented:

- Next.js App Router (TypeScript) Home + Overview screens
- `POST /api/upload` (PDF / plain text) → in-memory session
- Regex clause parser + fact extraction (deposit, dates, notice, state hint)
- Overview shows facts and parsed clauses (no LLM yet)

See [`docs/phase-1.md`](./docs/phase-1.md) for API contracts and security notes.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload `fixtures/leases/sample-lease.txt`, and confirm Overview shows deposit / lease start / notice plus clauses.

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

Sessions live in a process-local `Map` keyed by a random token held in `sessionStorage`. Closing the tab (or restarting the server) clears them. Uploaded bytes are never written to disk.
