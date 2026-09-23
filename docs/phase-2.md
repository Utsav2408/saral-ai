# Phase 2 — Simplify (first LLM activity)

## Goal

The first LLM-powered screen: one Groq call paraphrases every parsed clause into plain language, validated by deterministic `entity_check()`, then shown with a Plain / Original toggle.

## Flow

1. User uploads a lease (Phase 1) and opens Overview.
2. User taps **Simplify it** → `/simplify`.
3. Client `POST /api/session/{token}/simplify`.
4. Server loads clauses from the in-memory session.
5. On cache miss: one `generateText` + `Output.array` call to Groq (`llama-3.3-70b-versatile`), then `entity_check()` per clause (one stricter retry on failure).
6. On success: cache `simplifiedClauses` on the session and return the DTO.
7. UI toggles between `simpleText` and original `clause.text`.

## API contract

### `POST /api/session/[token]/simplify`

- Success `200`:

```json
{
  "token": "...",
  "title": "...",
  "clauses": [{ "id": "c-1", "index": 1, "heading": "...", "text": "..." }],
  "simplifiedClauses": [
    { "clauseId": "c-1", "simpleText": "...", "entityCheckPassed": true }
  ],
  "cached": false
}
```

- Errors (`{ error: { code, message } }`):

| Status | Code |
|--------|------|
| 400 | `INVALID_TOKEN` |
| 404 | `NOT_FOUND` |
| 422 | `ENTITY_CHECK_FAILED`, `NO_CLAUSES`, `TOO_MANY_CLAUSES` |
| 429 | `RATE_LIMITED` |
| 502 | `SIMPLIFY_FAILED`, `ID_MISMATCH` |
| 503 | `AI_NOT_CONFIGURED` |

Repeat POSTs after a successful simplify return `cached: true` without calling Groq.

## Security

- `GROQ_API_KEY` is server-only (never `NEXT_PUBLIC_*`, never in JSON responses).
- Groq is called only from the Node route handler (CSP `connect-src 'self'`).
- Clause bodies are fenced as untrusted data; system prompt forbids following in-clause instructions.
- `entity_check()` rejects invented numbers and names.
- `safeLog` records metadata only (`activity`, latency, token counts, `validated`, `cached`) — never clause or paraphrase text.
- Per-token in-flight lock + short cooldown; session Map still TTL/capacity bounded.
- UI renders all text as React children (no `dangerouslySetInnerHTML`).

## Stack

- AI SDK (`ai`) + `@ai-sdk/groq` + `zod`
- Model: `llama-3.3-70b-versatile`

## Out of scope

Chat / Summary / Options, corpus / statute tools, OCR, AI Gateway, streaming UI, i18n.

## Run

```bash
# Required for live Simplify (not needed for unit/e2e with mocks)
cp .env.example .env.local
# set GROQ_API_KEY=...

npm run dev
npm test
npm run test:e2e
```
