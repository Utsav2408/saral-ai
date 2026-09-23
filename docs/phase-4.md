# Phase 4 — Summary & Options

## Goal

All four activities complete: Summary turns Phase 1 facts + rule-based conflict/gap
flags into a readable checklist (one LLM call), and Options runs Escalation Guard →
always-on `rera_grievance_check` → retrieval → one LLM call for next steps. The
escalation banner fires on a planted test lease.

## Flow

### Summary

1. User opens Overview → **Summary & checklist**.
2. Client `POST /api/session/{token}/summary`.
3. Server: `detect_conflicts_and_gaps` (deterministic) → one Groq structured call →
   validate flag ids + entity check → cache on session.
4. UI shows overview, flag cards, and checklist.

### Options

1. User opens Overview → **Your options**.
2. Client `POST /api/session/{token}/options`.
3. Server: Escalation Guard → `rera_grievance_check` (always, allowlisted dispute
   types) → `state_law_status` + `lookup_statute` → one Groq call →
   `validateCitations` per step → cache + sticky `escalation` flag.
4. UI shows escalation banner (when triggered), RERA cards, and next steps with
   citation pills.

## API contracts

### `POST /api/session/[token]/summary`

- Success `200`:

```json
{
  "token": "...",
  "title": "...",
  "facts": { "state": "Maharashtra", "depositAmount": 150000 },
  "flags": [{ "id": "flag-missing_receipt", "ruleId": "missing_receipt", "severity": "info", "summaryKey": "gap.missing_receipt" }],
  "flagDescriptions": [{ "flagId": "flag-missing_receipt", "description": "..." }],
  "checklist": [{ "id": "check-1", "text": "...", "priority": "medium" }],
  "overview": "...",
  "cached": false
}
```

| Status | Code |
|--------|------|
| 400 | `INVALID_TOKEN` |
| 404 | `NOT_FOUND` |
| 422 | `NO_CLAUSES`, `VALIDATION_FAILED` |
| 429 | `RATE_LIMITED` |
| 502 | `SUMMARY_FAILED` |
| 503 | `AI_NOT_CONFIGURED` |

### `POST /api/session/[token]/options`

- Success `200`:

```json
{
  "token": "...",
  "title": "...",
  "escalation": false,
  "reraChecks": [{ "disputeType": "residential_rent_dispute", "applicable": false, "explanation": "..." }],
  "steps": [{ "id": "step-1", "title": "...", "body": "...", "citations": [] }],
  "regime": { "state": "Maharashtra", "category": "residential_rent", "code": "rent_control", "label": "..." },
  "cached": false
}
```

| Status | Code |
|--------|------|
| 400 | `INVALID_TOKEN` |
| 404 | `NOT_FOUND` |
| 422 | `NO_CLAUSES`, `VALIDATION_FAILED`, `NO_RETRIEVAL` |
| 429 | `RATE_LIMITED` |
| 502 | `OPTIONS_FAILED` |
| 503 | `AI_NOT_CONFIGURED` |

Repeat POSTs after success return `cached: true` without calling Groq.

## Deterministic tools

| Tool | Role |
|------|------|
| `detect_conflicts_and_gaps` | Deposit vs rent, missing notice/receipt/essential services/sublet/refund |
| `escalationGuard` | Keyword MVP (FIR, court order, IPC, …) — never logs matched strings |
| `reraGrievanceCheck` | Lookup table in `data/corpus/rera-grievance-table.json` |

## Security

- `GROQ_API_KEY` server-only; Groq only from Node route handlers.
- Lease text fenced as untrusted in prompts.
- Flag ids and citation ids validated; dispute types allowlisted (no free-form client keys).
- Citation links allowlisted; React text nodes only.
- `safeLog` metadata only (`activity`, latency, tokens, `validated`, `cached`,
  `escalation`, `flagCount`, `checklistCount`, `retrievedCount`) — never document or
  checklist/step body text, never matched escalation terms.
- Per-token locks + cooldowns; sticky `session.escalation` until TTL.

## Fixtures

| Path | Purpose |
|------|---------|
| `fixtures/leases/sample-lease.txt` | Happy path |
| `fixtures/leases/high-deposit-lease.txt` | Conflict rule `deposit_high_vs_rent` |
| `fixtures/leases/escalation-trigger-lease.txt` | Escalation Guard banner |

## Out of scope

OCR, dispute-type picker UI, streaming, i18n, durable session store, Phase 5 polish.

## Run

```bash
cp .env.example .env.local
# set GROQ_API_KEY=...

npm run dev
npm test
npm run test:e2e
```

## Done checklist

- [x] `detect_conflicts_and_gaps` + unit tests
- [x] Escalation Guard + `rera_grievance_check` + unit tests
- [x] `runSummary` + `POST …/summary` + `/summary` UI
- [x] `runOptions` + `POST …/options` + `/options` UI + banner
- [x] Overview links wired
- [x] Escalation + high-deposit fixtures
- [x] Unit, API, and e2e tests
