# Phase 2 — D1 Schema + Migrations Design

## Goal

Set up Cloudflare D1 with prod + preview + local environments, define the initial schema via SQL migrations, and add a health check route that verifies DB connectivity.

## Key Decisions

- Use raw SQL migrations stored in `migrations/`.
- Keep a single binding name (`DB`) across environments.
- Add a minimal `/api/health` route that performs `SELECT 1` and returns `{ ok: true }`.
- Use OpenNext Cloudflare runtime context access for bindings in server routes.

## Architecture & Schema

- D1 databases: `prod`, `preview`, and `local`.
- Migration naming: `0001_init.sql` (ordered, deterministic).
- Core tables (user scoped):
  - `users`, `sessions`, `invites`, `imports`, `exercises`, `sets`.
- Indexes:
  - Unique `(user_id, exercise_key)` for `exercises`.
  - Unique `(user_id, source_row_hash)` for `sets` idempotency.

## Data Flow

- `/api/health` runs on the server and uses `getCloudflareContext()` to access `env.DB`.
- Executes `SELECT 1` and returns a minimal JSON payload.
- On failure (missing binding or DB error), return a 500 with a generic message.

## Error Handling

- Avoid leaking SQL errors or stack traces in responses.
- Log failures server-side only.

## Tests (TDD)

- Add a failing test for `/api/health` that expects `{ ok: true }`.
- Mock `getCloudflareContext()` to provide a fake D1 binding.
- Implement the route and re-run tests to green.

## Implementation Notes

- Add `migrations/0001_init.sql` with the initial schema.
- Update `wrangler.toml` with D1 bindings for local/preview/prod.
- Add scripts for local and remote migrations via Wrangler.

## Validation

- Local migrations apply cleanly.
- Preview/prod migrations apply cleanly.
- `/api/health` returns OK across environments.
- `npm test` passes.

## Status

Complete as of February 5, 2026.
