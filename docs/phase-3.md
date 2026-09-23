# Phase 3 — Corpus & Chat

## Goal

Grounded, cited answers: Chat answers real questions about the uploaded lease and
**visibly cites** statute (and lease clause) text retrieved for that turn — not
invented, not uncited.

## Flow

1. User uploads a lease (Phase 1) and opens Overview → **Chat with it**.
2. Client `POST /api/session/{token}/chat` with `{ message }`.
3. Server: `state_law_status` → `lookup_statute` (hashed-trigram embed + cosine) →
   one Groq structured call → `validateCitations`.
4. On success: append user + assistant messages to the session; return reply +
   citation pills.
5. UI shows full history; only the last **6** messages are sent to the model.
   Durable context (facts, clauses, this-turn retrieval, regime) is resent every turn.

## Embedding decision

Runtime uses **hashed character trigrams** (`hashed_char_trigrams_v1`, dim 384) —
the same algorithm offline (`npm run corpus:embed`) and at query time.

This is Phase 3 plan option (a): avoids loading bge-m3 / transformers on each
request (cold start + bundle). Enough for ~16 curated pilot chunks. Re-run
`npm run corpus:embed` after editing `data/corpus/chunks/pilot-corpus.json`.

## API contract

### `POST /api/session/[token]/chat`

- Body: `{ "message": "..." }` (max 2000 chars)
- Success `200`:

```json
{
  "token": "...",
  "title": "...",
  "reply": {
    "role": "assistant",
    "content": "...",
    "citations": [
      { "id": "mh-mrca-s15", "label": "Maharashtra Rent Control Act", "sourceUrl": "https://..." },
      { "id": "lease:c-2", "label": "Your lease · Clause 2" }
    ]
  },
  "messages": [/* full stored history */],
  "regime": { "state": "Maharashtra", "category": "residential_rent", "code": "rent_control", "label": "..." }
}
```

- Errors (`{ error: { code, message } }`):

| Status | Code |
|--------|------|
| 400 | `INVALID_TOKEN`, `EMPTY_MESSAGE`, `MESSAGE_TOO_LONG` |
| 404 | `NOT_FOUND` |
| 422 | `VALIDATION_FAILED`, `NO_RETRIEVAL` |
| 429 | `RATE_LIMITED` |
| 502 | `CHAT_FAILED` |
| 503 | `AI_NOT_CONFIGURED` |

## Security

- `GROQ_API_KEY` server-only; Groq only from Node route handlers.
- Lease + user text fenced as untrusted in the system prompt.
- `validateCitations` rejects forged chunk ids and statute claims with no citations.
- Citation links allowlisted (`CITATION_URL_ALLOWLIST`); React text nodes only.
- `safeLog` metadata only (`activity`, latency, tokens, `validated`, `retrievedCount`) —
  never chat or statute body text.
- Per-token chat lock + cooldown; message / history / chunk bounds in `lib/constants.ts`.

## Corpus layout

| Path | Role |
|------|------|
| `data/corpus/sources/**` | Reference PDFs / extracts |
| `data/corpus/chunks/pilot-corpus.json` | Hand-curated chunks (MH, UP, CENTRAL, MODEL) |
| `data/corpus/embeddings.json` | Precomputed vectors (runtime) |
| `data/corpus/state-law-status.json` | Regime dict |
| `data/corpus/SOURCES.md` | Provenance |

## Out of scope

OCR, transformers at request time, bulk case-law scrape, i18n.
(Summary / Options are Phase 4 — see [`docs/phase-4.md`](./phase-4.md).)

## Run

```bash
npm run corpus:embed   # after editing chunks
cp .env.example .env.local
# set GROQ_API_KEY=...

npm run dev
npm test
npm run test:e2e
```

## Done checklist

- [x] Curate MH + UP + central/model chunks + `state-law-status.json`
- [x] Embed script → `embeddings.json`
- [x] Corpus load + cosine + `lookup_statute` + `state_law_status`
- [x] `validateCitations` + `runChatTurn` + chat lock
- [x] `POST /api/session/[token]/chat`
- [x] `/chat` UI + Overview link + citation pills
- [x] Unit, API, and e2e tests
