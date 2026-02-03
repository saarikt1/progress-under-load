# Gym Training Analyzer — Design (Cloudflare Pages + D1)

Single-user-first web app for analyzing gym training CSV exports, with optional additional users via invite codes. Hosted on Cloudflare Pages (Next.js) with backend routes via Pages Functions and storage in Cloudflare D1 (SQLite).

## Goals

- Secure CSV upload and idempotent ingestion (re-upload safe).
- Persist historical data in a lightweight DB (D1).
- Append-only imports from a “full history, never changes” CSV export.
- Exercise name normalization is case/whitespace only; otherwise use strict CSV names (no aliasing UI).
- Analytics per lift: logged weight trend + estimated 1RM range/trend + singles PRs.
- PR detection: heaviest single and estimated 1RM PRs.
- AI coach: supportive, uses history + PRs + notes, with chat UI; LLM calls only server-side; provider-agnostic.
- UX: responsive, PWA-ready, minimal toggles.

## Non-Goals (initial)

- Cardio analytics (still store rows; omit from charts).
- Automatic merging/aliasing of exercise titles beyond case/whitespace normalization.
- Multi-tenant org features; this is a small invite-only user list.

## Platform

- Frontend: Next.js (React).
- Hosting: Cloudflare Pages + Functions.
- DB: Cloudflare D1 (SQLite).
- Auth: email + password, session cookies.
- LLM: provider-agnostic server adapter (start with a single provider via env vars).

## CSV Format (observed)

Header:
`title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe`

Notes:
- Timestamps look like `18 Jan 2026, 17:42` and are treated as a single (local) timezone.
- Analytics should default to `set_type == "normal"` only.

## Ingestion & Dedupe

Server route accepts CSV upload (multipart) and parses rows.

Normalization:
- `exercise_key = lower(trim(exercise_title))` with internal whitespace collapsed.
- Store `display_name` as the exact CSV `exercise_title` value (first seen or latest seen).

Dedupe strategy:
- Fast filter: track `max_end_time_seen` per user; skip rows where `end_time <= max_end_time_seen`.
- Safety net: compute `source_row_hash` and enforce uniqueness to make imports idempotent even if timestamps collide.

Suggested `source_row_hash` input: stable concatenation of
`end_time|start_time|title|exercise_title|set_index|set_type|weight_kg|reps|rpe|distance_km|duration_seconds|exercise_notes`.

## Data Model (D1)

All user-scoped tables include `user_id`.

- `users`: `id`, `email` (unique), `password_hash`, `role` (`admin`/`user`), `created_at`.
- `sessions`: `id`, `user_id`, `token_hash` (unique), `expires_at`, `created_at`.
- `invites`: `id`, `email`, `code_hash` (unique), `role`, `expires_at`, `used_at`, `created_by_user_id`, `note`, `created_at`.
- `imports`: `id`, `user_id`, `uploaded_at`, `source_filename`, `rows_seen`, `rows_inserted`, `max_end_time_seen`.
- `exercises`: `id`, `user_id`, `exercise_key`, `display_name`, `created_at`, `updated_at` (unique on `(user_id, exercise_key)`).
- `sets`: core row store:
  - Identifiers: `id`, `user_id`, `exercise_id`.
  - Times/metadata: `workout_title` (from CSV `title`), `start_time`, `end_time`, `superset_id`, `set_index`, `set_type`, `description`.
  - Strength fields: `weight_kg`, `reps`, `rpe`.
  - Cardio fields (stored, not charted initially): `distance_km`, `duration_seconds`.
  - Notes: `exercise_notes`.
  - Dedupe: `source_row_hash` with unique index on `(user_id, source_row_hash)`.
  - Derived (optional columns or computed at query time): `e1rm_epley`, `e1rm_brzycki`, `e1rm_lombardi`, `e1rm_rpe`, plus `e1rm_min`, `e1rm_max`, `e1rm_median`.

## Analytics

Strength set eligibility:
- `set_type == "normal" AND weight_kg > 0 AND reps > 0`.

Estimated 1RM per set:
- Epley: `w * (1 + reps/30)`.
- Brzycki: `w * 36/(37 - reps)`.
- Lombardi: `w * reps^0.10`.
- RPE-adjusted (when `rpe` present): convert `(reps, rpe)` to an estimated `%1RM` via an RPE chart, then `w / pct`.

Display:
- Per-exercise “Estimated 1RM trend”: central line = median across available formulas; shaded band = min/max.
- “Logged weights”: scatter of `weight_kg` over time (normal sets), with an option to show “best set per workout” as the default aggregation to reduce noise.
- “Singles”: separate series for `reps == 1` actual weights.

PR logic (derived queries):
- Heaviest single PR: max `weight_kg` where `reps == 1` and `set_type == "normal"`.
- Estimated 1RM PR: max of the central trend value (median across formulas) over time.

Default main lifts (from sample CSV):
- `Bench Press (Barbell)`
- `Deadlift (Barbell)`
- `Overhead Press (Barbell)`
- `Squat (Barbell)`

## UX / Navigation

Home = Dashboard:
- Four default lift cards (GZCLP main lifts), each showing last 7 days + last ~3 months; single toggle to switch to “All time”.
- “All exercises” view provides a searchable list (no aliasing).
- Persistent “Chat with coach” CTA on dashboard (header button + mobile-friendly action button).

Upload:
- Smaller persistent “Upload CSV” action in the dashboard header.
- After upload: show a recap panel (rows inserted, warnings, PR highlights, AI coach comment) and a “Chat” CTA; return to dashboard after dismiss.

## AI Coach

Runs only on server routes:
- Post-upload: generate a short supportive recap using recent workouts + all-time PRs + notes; output 3–6 concise bullets (praise, focus cue, next-session suggestion, optional caution if notes indicate pain/fatigue).
- Chat: same context builder + conversation history.

Provider-agnostic adapter:
- One interface: `generateCoachMessage(context, userMessage?) -> text`.
- Secrets only in env vars; never exposed to the client.

## Security & Edge Cases

- No public signup; invite-only user creation. Admin bootstrapped from env vars when `users` is empty.
- Store only hashes of session tokens and invite codes.
- Rate limit login/invite acceptance; generic error messages for auth failures (avoid account/email enumeration).
- CSV risks: inconsistent blanks vs `0`, malformed numbers, missing columns, duplicate timestamps, large file sizes.
- Import idempotency: rely on unique `(user_id, source_row_hash)` so re-uploads never double-insert.
- Analytics correctness: exclude non-normal sets by default; ensure cardio rows never affect PRs.

### Client-Side Secret Safety (Next.js)

- Never use `NEXT_PUBLIC_*` for anything sensitive. Only non-sensitive UI config goes there.
- Keep LLM/provider credentials and D1 access strictly in server code (route handlers / server actions). Avoid importing server modules into client components; use Next’s `server-only` guard for modules that touch secrets.
- Ensure API responses never echo env vars, headers, or upstream error payloads that may contain credentials.
- Avoid logging request bodies for CSV uploads, chats, or auth; redact tokens/codes in logs.

### Cookies / Sessions

- Use HttpOnly + Secure cookies with `SameSite=Lax` and the `__Host-` prefix (forces Secure + path=/ and no Domain attribute).
- All state-changing endpoints are POST-only; additionally verify `Origin`/`Host` to prevent CSRF.
- Store only a hash of the session token in D1; rotate session on login; short TTL (e.g., 7–30 days) with explicit logout/revoke.

### Passwords & Invite Codes

- Prefer Argon2id for password hashing; if the Cloudflare runtime/library constraints make Argon2id impractical, use scrypt (with strong parameters) or PBKDF2 as a fallback, and document the chosen parameters.
- Enforce password minimums (length + allow password managers) and provide admin reset if needed.
- Invite codes: high-entropy random values (e.g., 16–32 bytes) shown once; store only a hash; expire quickly (e.g., 7 days); single-use with `used_at`.

### Web App Hardening

- Set secure response headers: CSP (restrict scripts), `Referrer-Policy`, `X-Content-Type-Options`, and `Permissions-Policy`. Prefer `frame-ancestors 'none'` (or equivalent) to prevent clickjacking.
- Validate uploads: max file size, required columns, strict numeric parsing, ignore unknown columns, and reject extremely large row counts.
- Multi-user isolation is app-enforced (D1 has no built-in row-level security): every query must filter by the authenticated `user_id`.

### LLM / Privacy

- Treat workout notes as sensitive; minimize what is sent to the LLM provider and consider a per-user “AI enabled” toggle if you want a privacy off-switch later.
- Guard against prompt injection by never giving the model access to secrets or arbitrary tools; keep it as “text in/text out” for coaching.
