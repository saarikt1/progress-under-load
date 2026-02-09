# Phase 4 — Invite Codes Design

## Goal
Allow admins to create invite links and let invited users create accounts via `/accept-invite`.

## Key Decisions
- Store only a hash of invite codes in D1.
- Invite TTL is 7 days.
- Accepting an invite creates the user and logs them in.

## Architecture
- Server actions in `src/app/actions/invite.ts` and `src/app/actions/check-invite.ts`.
- Invite logic in `src/server/invite.ts`.
- Admin UI on `/admin` for create, list, and revoke.
- Invite acceptance page on `/accept-invite?code=...`.

## Data Model
- `invites`: `id`, `email`, `code_hash`, `expires_at`, `used_at`, `created_by_user_id`, `created_at`.

## Flows
- Create invite: admin submits email, generate code, store `code_hash` with expiry, and return a one-time invite link.
- List invites: show unused invites that have not expired.
- Revoke invite: delete invite row by `id`.
- Accept invite: validate code and expiry, create user with role `user`, mark invite `used_at`, create session, and set cookie.

## Error Handling
- Generic errors for invalid or expired invites.
- If the email already exists, return a generic “User already registered” error.

## Tests (TDD)
- Invite creation stores hashed code and expiry.
- Accept invite creates user and marks invite used.
- Invalid or expired invites are rejected.

## Validation
- Admin can create and revoke invites from `/admin`.
- Invite link works once and then becomes invalid.
- New user can log in and sees empty dashboard.

## Status
Complete as of February 9, 2026.
