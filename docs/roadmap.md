# Roadmap — Gym Training Analyzer

This roadmap breaks the project into phases that each deliver something usable/visible and can be validated. It assumes the architecture in `docs/plans/2026-02-03-gym-training-app-design.md`.

Last synced: February 19, 2026.

## Phase 0 — Project Skeleton (local dev)

**Outcome:** You can run the app locally and deploy a placeholder UI.
**Status:** Complete (February 4, 2026).

- Create Next.js app structure (Cloudflare Workers compatible).
- Add TypeScript + basic linting/formatting (keep it simple).
- Enable React Compiler (create-next-app default).
- Add Vitest + Testing Library for shell smoke tests.
- Add base layout + navigation shell (Dashboard, Upload, Chat, Admin).
- Add empty-state Dashboard with 4 default lift cards (static placeholders).
- Add basic error boundary / not-found.

**Validation**
- `npm run dev` shows dashboard shell on mobile/desktop.
- Route stubs render: `/`, `/chat`, `/admin`, `/upload` (or modal).
- `npm test` passes.

**Manual input**
- None.

## Phase 0.5 — UI Foundation (design system + charts baseline)

**Outcome:** Consistent UI primitives and one working placeholder chart component.
**Status:** Complete (February 4, 2026).

- Set up Tailwind CSS + Radix primitives + `shadcn/ui`-style components.
- Set up global styling tokens (CSS variables for colors, spacing, radii).
- Add reusable primitives you’ll use everywhere (button, input, card, dialog, toast).
- Add a basic Recharts component (static dummy data) matching the intended style.

**Validation**
- Dashboard cards look consistent and “app-like” on mobile.
- One chart renders on an exercise detail placeholder page.

**Manual input**
- None.

## Phase 1 — Cloudflare Setup + First Deploy

**Outcome:** Public (but locked down) deployed site on Cloudflare Workers (OpenNext).
**Status:** Complete (February 4, 2026).

- Create Cloudflare Workers project from the repo.
- Configure OpenNext build + Wrangler deploy commands.
- Add baseline security headers (CSP baseline, etc.).

**Validation**
- Deployed URL loads the placeholder dashboard.
- Deployed URL: `https://progress-under-load.tommisaarikangas.workers.dev/`.

**Manual input**
- Cloudflare account + Workers project.
- Ensure Workers.dev subdomain is enabled.
- Decide the production domain (optional now).

## Phase 2 — D1 Schema + Migrations

**Outcome:** Durable database exists and the app can read/write a simple health record.
**Status:** Complete (February 5, 2026).

- Install and configure Wrangler for local dev + migrations.
- Create D1 database(s): `prod` + `preview` (recommended).
- Add migrations for: `users`, `sessions`, `invites`, `imports`, `exercises`, `sets` (+ indexes/constraints).
- Add a `/api/health` route that verifies DB connectivity.

**Validation**
- DB migrations apply cleanly in local dev and preview/prod.
- `/api/health` returns OK and indicates DB is reachable.

**Manual input**
- Create D1 DB(s) in Cloudflare and wire bindings to the Workers project (preview + production).

## Phase 3 — Authentication (email+password + sessions)

**Outcome:** You can log in/out; routes are protected; admin bootstraps from env vars.
**Status:** Complete (February 9, 2026).

- Implement login/logout and session cookie (`__Host-` pref).
- Implement middleware/guards for protected pages and API routes.
- Bootstrap initial admin user when `users` is empty (from env vars).
- Add `/admin` landing page visible only to admins.

**Validation**
- Unauthed users get redirected to `/login`.
- Login works; cookie is HttpOnly+Secure in prod.
- Admin can access `/admin`; normal users cannot.

**Manual input**
- Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` as Cloudflare env vars.

## Phase 4 — Invite Codes (admin-only user creation)

**Outcome:** Admin can invite a new user by email; invite acceptance creates an account.
**Status:** Complete (February 9, 2026).

- Admin UI: create/list/revoke invites.
- Accept-invite flow: `/accept-invite?code=...` and password set.
- Generic errors (no enumeration).

**Validation**
- Invite link works once; second attempt fails.
- Invites expire as expected.
- New user can log in and sees empty dashboard.

**Manual input**
- None beyond using the UI.

## Phase 5 — CSV Upload + Idempotent Import
**Outcome:** Uploading your CSV populates the database; re-uploading doesn’t duplicate.
**Status:** Complete (February 9, 2026).

- Authenticated CSV upload (multipart) to `/api/import`.
- Parse/validate required columns; enforce size + row limits.
- Normalize exercise keys (case/whitespace).
- Insert new exercises/sets; enforce `(user_id, source_row_hash)` uniqueness.
- Track `imports` summary and `max_end_time_seen`.

**Validation**
- Upload `example_data/workout_data_2026_jan.csv` inserts rows.
- Re-upload inserts 0 new rows.
- Upload as a different user stores separate data (no mixing).

**Manual input**
- None.

## Phase 6 — Core Analytics (per exercise)

**Status:** Complete (February 11, 2026).

**Outcome:** Exercise pages show real data and basic charts.

- Enhanced Dashboard with full 1RM charts for 4 main lifts (Squat, Bench Press, Deadlift, Overhead Press).
- Exercise list page with search functionality and card grid layout.
- Exercise detail pages with tabbed charts:
  - **One Rep Max:** Estimated 1RM trend (average of Epley/Brzycki/Lombardi, rounded to 0.5kg).
  - **Heaviest Weight:** Maximum weight per workout session.
- **Weekly aggregation:** Best set per week to reduce noise.
- **Chart features:** Categorical X-axis, custom Y-axis ticks (5kg/10kg increments), straight lines, heavy set markers.
- Global time period filter (3M, 12M, All Time) on dashboard.

**Validation**
- Bench/Deadlift/OHP/Squat cards render with 3M, 12M, and All Time views.
- Exercise detail matches expected points from CSV.

**Manual input**
- Confirm the “main lift” names if your logger changes naming.

## Phase 7 — PR Detection + Highlights

**Outcome:** The app surfaces “what got better” automatically.
**Status:** In progress (partially delivered by February 19, 2026).

- Compute and display:
  - Heaviest single PR.
  - Estimated 1RM PR.
- Dashboard “New PRs” callouts (last 7 days) and all-time PR tiles on exercise pages.

Implemented now:
- All-time PR tiles on exercise detail pages.
- Dashboard PR badge indicator on main-lift cards.

Remaining for full completion:
- Dedicated “New PRs” dashboard callout section with explicit last-7-days details.

**Validation**
- PRs appear on known dates from your sample data (spot-check).
- Non-normal sets never affect PRs.

**Manual input**
- None.

## Phase 8 — AI Coach (post-upload comment)

**Outcome:** After import, you get an encouraging summary using your recent training + PRs + notes.
**Status:** Not started.

- Provider-agnostic LLM adapter (start with one provider).
- Post-import: build context (recent workouts + all-time PRs + relevant notes) and generate a short recap.
- Store the generated recap tied to the import (so it’s repeatable/viewable later).

**Validation**
- Upload triggers a coach comment within a reasonable latency budget.
- No API keys appear in client JS or network responses.

**Manual input**
- Provide LLM provider endpoint/key as Cloudflare env vars.

## Phase 9 — Coach Chat (contextual awareness)

**Outcome:** Persistent chat UI that remembers context and respects user separation.
**Status:** Not started (placeholder `/chat` page exists).

- Chat page + always-available dashboard CTA.
- Store chat messages per user in D1 (optional retention policy).
- Context builder uses: recent workouts, PRs, and relevant notes; includes conversation history.

**Validation**
- Chat works for both users; context never crosses accounts.
- Chat still works after refreshing or switching devices (if sessions persist).

**Manual input**
- Decide retention window (e.g., last 90 days) if you care.

## Phase 10 — PWA + Polish

**Outcome:** “Feels like an app” on mobile and is safe to use daily.
**Status:** Not started.

- Add PWA manifest + icons + installability.
- Performance pass (chart rendering, query indexes).
- Accessibility pass (keyboard nav, contrast).
- Backup/export: “download my data” (DB→CSV or JSON).

**Validation**
- Can install to home screen; offline shows a friendly state (even if data isn’t fully offline).
- Export works and can be re-imported.

**Manual input**
- Provide icons (or approve generated placeholders).

## Phase 11 — Security Review & Operational Hardening

**Outcome:** Confident production posture for a personal data app.
**Status:** Not started.

- Verify security checklist:
  - No `NEXT_PUBLIC_*` secrets; server-only modules guarded.
  - CSP set; no unsafe HTML rendering.
  - CSRF protections (Origin/Host checks) on state-changing routes.
  - Rate limits on auth/invite/import.
  - Minimal logging and redaction.
- Add basic monitoring hooks (error reporting) if desired.

**Validation**
- Manual “attack checklist” passes (token leakage, enumeration, CSRF, XSS).

**Manual input**
- Optional: choose an error reporting tool (or none).
