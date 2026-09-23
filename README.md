# Clarity (Saral AI)

GenAI-powered assistant that makes residential leases simple enough to read, question, and act on.

This repo follows [`Clarity_Final_Architecture.md`](./Clarity_Final_Architecture.md).

## Status

| Phase | Status |
|-------|--------|
| 1 — Skeleton & Upload | Done — see [`docs/phase-1.md`](./docs/phase-1.md) |
| 2 — Simplify | Done — see [`docs/phase-2.md`](./docs/phase-2.md) |
| 3 — Corpus & Chat | Done — see [`docs/phase-3.md`](./docs/phase-3.md); sources in [`data/corpus/`](./data/corpus/) |
| 4 — Summary & Options | Done — see [`docs/phase-4.md`](./docs/phase-4.md) |
| 5 — Polish & Demo | Done — see [`docs/phase-5.md`](./docs/phase-5.md) |

**Phase 2** adds Groq-powered plain-language paraphrases with `entity_check()`, session caching, and the Simplify screen (Plain / Original toggle).

**Phase 3** seeds a small pre-embedded statute corpus (MH + UP + RERA/Model) and wires Chat: retrieval → one LLM call → citation validation → citation pills.

**Phase 4** completes Summary (rule-based conflicts → one LLM → checklist) and Options (Escalation Guard → always-on RERA check → retrieval → one LLM), with an escalation banner on a planted fixture.

**Phase 5** polishes error recovery, accessibility, security edges, and a scripted dry-run so a stranger can complete the full flow without narration.

## Quick start

```bash
npm install
cp .env.example .env.local
# Set GROQ_API_KEY in .env.local for Simplify, Chat, Summary, and Options (upload/overview work without it)
npm run corpus:embed   # only needed after editing data/corpus/chunks/
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload `fixtures/leases/sample-lease.txt` (or `sample-lease.pdf`), open Overview, then any of the four activities.

Demo fixtures:

| File | Use |
|------|-----|
| `fixtures/leases/sample-lease.txt` / `.pdf` | Happy path |
| `fixtures/leases/high-deposit-lease.txt` | Summary high-deposit flag |
| `fixtures/leases/escalation-trigger-lease.txt` | Options escalation banner |

Full walkthrough: [`docs/phase-5.md`](./docs/phase-5.md).

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
| `npm run corpus:embed` | Rebuild `data/corpus/embeddings.json` from curated chunks |
| `npm run audit` | Dependency audit (production) |

## CI/CD

**Checks** run in GitHub Actions on every pull request and push to `main`. **Deploy** is handled by [Vercel’s Git integration](https://vercel.com/docs/git): preview URLs on PRs, production on `main`.

| Layer | What runs |
|-------|-----------|
| GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) | `lint`, `typecheck`, unit tests, `npm audit` |
| Vercel (Git connected) | Preview + production deploys |

### One-time setup

1. Import this repo in the [Vercel dashboard](https://vercel.com/new) (or `npx vercel link` then connect Git).
2. Add `GROQ_API_KEY` in Vercel project env for Preview and Production.
3. Optional — gate production on CI: in Vercel → Project → **Deployment Checks**, require the GitHub `CI / Checks` workflow to pass before promoting to production.

No GitHub deploy secrets are required for this setup.

## Privacy model

Sessions live in a process-local `Map` keyed by a random token held in `sessionStorage`. Closing the tab (or restarting the server) clears them. Uploaded bytes are never written to disk. GenAI logs are metadata-only (no document or chat content).
