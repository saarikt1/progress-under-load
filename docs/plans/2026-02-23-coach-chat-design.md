# Phase 9 — Coach Chat Design

**Date:** February 23, 2026
**Status:** Design approved, pending implementation

---

## Context

Phase 8 delivered a one-shot AI coach comment generated after each CSV import. Phase 9 extends this into a persistent, multi-turn chat interface. The coach has access to the user's recent training data and a user-editable description of their program, enabling ongoing contextual Q&A about progress, technique, and planning.

---

## Goals

- Persistent chat history stored in D1, surviving page reloads and device switches
- Coach has access to: recent workout sessions (last 5), all-time PRs for main lifts, and a user-editable training program description
- Last 20 messages sent to LLM per call (token cost control)
- Messages older than 90 days are pruned automatically
- User can edit their training program context directly from the chat page (collapsible panel)

---

## Database Schema

**Migration:** `migrations/0004_chat.sql`

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX chat_messages_user_id_created_at ON chat_messages(user_id, created_at);

ALTER TABLE users ADD COLUMN program_prompt TEXT;
```

---

## Server-Side Components

### `src/server/llm.ts` — extend with `generateChatResponse`

Add a new exported function alongside the existing `generateText` (which stays unchanged for Phase 8):

```typescript
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function generateChatResponse(
  messages: ChatMessage[],
  env: AuthEnv
): Promise<string>
```

Calls the same OpenAI-compatible endpoint but passes the full messages array instead of a single user prompt string.

### `src/server/chat-context.ts` — new file

Builds the system prompt per chat call:

1. Fetch `users.program_prompt` for the authenticated user
2. Query the last 5 distinct workout sessions (reuse session-grouping logic from `coach.ts`)
3. Fetch all-time PRs for the 4 main lifts (reuse `findHeaviestWeightPR` / `findBest1RMPR` from `src/lib/one-rm.ts` and `MAIN_LIFTS` from `src/lib/constants.ts`)
4. Compose a system message:
   - "You are a highly analytical and encouraging strength coach."
   - User's program description (if set)
   - All-time PRs for main lifts
   - Summary of recent sessions

### Retention pruning

At the start of each `POST /api/chat` handler:

```sql
DELETE FROM chat_messages WHERE user_id = ? AND created_at < datetime('now', '-90 days')
```

---

## API Routes

### `GET /api/chat`

Requires auth. Returns:
```json
{
  "messages": [{ "id": "...", "role": "user|assistant", "content": "...", "created_at": "..." }],
  "program_prompt": "string | null"
}
```
Queries the last 100 `chat_messages` rows for the user (for display) plus `users.program_prompt`.

### `POST /api/chat`

Requires auth. Body: `{ "content": string }`

Steps:
1. Prune messages older than 90 days
2. Insert the user message into `chat_messages` (generate UUID id, set `role = 'user'`)
3. Fetch the last 20 `chat_messages` for LLM context
4. Build system prompt via `buildChatContext(db, userId)` → `src/server/chat-context.ts`
5. Call `generateChatResponse([systemMsg, ...last20, newUserMsg], env)`
6. Insert assistant reply into `chat_messages` (generate UUID id, set `role = 'assistant'`)
7. Return `{ "message": { id, role, content, created_at } }` (the assistant's reply)

### `PATCH /api/chat/program`

Requires auth. Body: `{ "program_prompt": string }`

Updates `users.program_prompt` for the authenticated user. Returns `{ "ok": true }`.

---

## Chat Page UI

**File:** `src/app/chat/page.tsx` → convert to client component

### Layout

```
┌─────────────────────────────────────┐
│ Chat with your coach  [Edit context]│
├─────────────────────────────────────┤
│ [collapsible panel]                 │
│   Training program textarea         │
│   [Save]                            │
├─────────────────────────────────────┤
│ Message list (scrollable, grows)    │
│  🤖 Coach  ← left-aligned          │
│             User message → right    │
├─────────────────────────────────────┤
│ [textarea input]       [Send ↵]    │
└─────────────────────────────────────┘
```

### Behavior details

- On mount: `GET /api/chat` → populate message list and `program_prompt` textarea
- Enter key sends the message; Shift+Enter inserts a newline
- Optimistic UI: append user message immediately, show a skeleton loading bubble while waiting for response
- Coach messages rendered with `ReactMarkdown` + `remark-gfm` (same setup as upload page)
- Empty state: "Ask your coach anything about your training."
- "Edit context" button toggles the collapsible panel (inline, no modal)
- Save button in the panel calls `PATCH /api/chat/program`; shows a brief success indicator

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `migrations/0004_chat.sql` | New migration |
| `src/server/llm.ts` | Add `generateChatResponse` |
| `src/server/chat-context.ts` | New — context builder |
| `src/app/api/chat/route.ts` | New — GET + POST handlers |
| `src/app/api/chat/program/route.ts` | New — PATCH handler |
| `src/app/chat/page.tsx` | Full replacement — client component |

---

## Verification

1. Apply migration: `npm run db:migrate:local`
2. `/api/health` still returns OK
3. `GET /api/chat` returns `{ messages: [], program_prompt: null }` for a new user
4. `PATCH /api/chat/program` stores and retrieves the program description
5. `POST /api/chat` with a message returns an assistant reply
6. Reload the chat page — messages persist
7. Send >20 messages — LLM context still works (window slides)
8. Manually insert messages older than 90 days in local DB, send a new message — old messages are pruned
9. Log in as a second user — their chat history is isolated

---

## Out of Scope (Phase 9)

- Streaming responses (deferred to a future polish pass)
- Dashboard CTA linking to chat (nice to have, can be added after basic chat works)
- Message deletion or editing
