# Phase 1 — Skeleton & Upload

## Goal

Prove end-to-end wiring **without** an LLM: upload a lease → parse clauses → extract facts → show them on Overview.

## Flow

1. User chooses a **PDF** or **`.txt`** on Home.
2. `POST /api/upload` validates MIME/extension/magic bytes/size, extracts text in memory, runs `parseClauses` + `extractFacts`, stores an ephemeral session, returns a token.
3. Client saves the token in **`sessionStorage`** (`clarity_session`) and navigates to `/overview`.
4. Overview calls `GET /api/session/[token]` and renders fact cards + the clause list.

## API contracts

### `POST /api/upload`

- Body: `multipart/form-data` with field `file`
- Success `201`: `{ token, title, facts, clauseCount }`
- Errors: `{ error: { code, message } }` with status `400` / `413` / `415` / `422` / `500`

### `GET /api/session/[token]`

- Success `200`: session public DTO (clauses + facts)
- `400` invalid token shape; `404` missing/expired

## Security constraints

- Allowlist: PDF + plain text only (5 MB max)
- No disk writes for uploads
- No document content in logs (`safeLog` metadata only)
- High-entropy session tokens; Map bounded (100 sessions, 2h TTL)
- Security headers via `next.config.ts`
- Lease text rendered as React text nodes only (no `dangerouslySetInnerHTML`)

## Out of scope

OCR/photo, Word, Groq/LLM, Chat/Simplify/Summary/Options backends, durable storage, i18n.

## Run

```bash
npm run dev
npm test
npm run test:e2e
```

Env: Phase 1 needs no secrets. `.env.example` documents `GROQ_API_KEY` for Phase 2.
