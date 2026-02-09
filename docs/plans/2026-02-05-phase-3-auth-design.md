# Phase 3 — Authentication Design

## Goal
Implement email + password authentication with secure session cookies, route protection, and admin bootstrap.

## Key Decisions
- Use custom auth (route handlers + middleware) instead of a full auth library.
- Password hashing via PBKDF2 (WebCrypto) with strong parameters and per-user salts.
- Session cookies use the `__Host-` prefix and 30-day expiry.
- Store only hashes of session tokens in D1.
- 12-character minimum password length.

## Architecture
- Server-only auth utilities live in `src/server/auth.ts` (hashing, session creation, verification).
- API route handlers under `src/app/api/auth/`:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- `middleware.ts` enforces auth on protected routes.

## Data Model
- `users`: `id`, `email` (unique), `password_hash`, `role`, `created_at`.
- `sessions`: `id`, `user_id`, `token_hash` (unique), `expires_at`, `created_at`.
- Password hash stored as a structured string: `pbkdf2$sha256$iterations$salt_b64$hash_b64`.

## Auth Flow
- Login:
  1. Validate credentials.
  2. Create a new random session token.
  3. Store only the SHA-256 hash of the token.
  4. Set `__Host-session` cookie with 30-day TTL.
- Logout:
  - Delete session row and clear cookie.
- Session check:
  - Read cookie, hash token, look up session, confirm `expires_at`.

## Cookies
- Attributes: `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, `Path=/`.
- `__Host-` prefix enforces `Secure` + `Path=/` with no `Domain`.

## Password Hashing (PBKDF2)
- Algorithm: PBKDF2-HMAC-SHA256 via WebCrypto.
- Per-user random salt.
- Strong iteration count targeting ~200–500ms per hash on Workers.
- Constant-time compare on verification.

## Route Protection
- Middleware redirects unauthenticated users to `/login`.
- Allowlist: `/login`, `/accept-invite`, `/api/auth/*`, static assets.
- API handlers and server actions verify the session via `getSessionByToken` as needed.

## Admin Bootstrap
- When `users` is empty, create initial admin from `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
- Role: `admin`.
- Local dev reads `process.env` values if Cloudflare bindings are unavailable.

## Error Handling
- Generic auth errors: `Invalid credentials`.
- No sensitive data in logs (no passwords, tokens, invite codes).

## Rate Limiting (Phase 3)
- Simple in-memory limiter per IP + email (short window).
- Not globally consistent on edge, acceptable for personal app.

## Tests (TDD)
- Unit tests for PBKDF2 hashing and verification.
- API tests for login success/failure and logout.
- Middleware test for redirect to `/login`.
- Admin bootstrap test when `users` is empty.

## Validation
- Unauthed users redirected to `/login`.
- Login sets cookie and allows access to protected routes.
- Logout clears session and cookie.
- `/admin` only accessible to admins.
- `npm test` passes.

## Env Vars
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_TTL_DAYS` (default 30)
- `PBKDF2_ITERATIONS`

## Status
Complete as of February 9, 2026.
