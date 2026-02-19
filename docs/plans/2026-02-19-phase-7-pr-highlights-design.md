# Phase 7 — Dashboard PR Highlights Design

## Goal
Complete Phase 7 by adding a dedicated dashboard callout that shows explicit personal-record events from the last 7 days for the four main lifts (Squat, Bench Press, Deadlift, Overhead Press).

## Scope
- Add an authenticated API endpoint to return PR highlight events.
- Add a dashboard section: `New PRs (Last 7 Days)`.
- Keep existing per-card `New PR` badge behavior unchanged.

## Architecture
- Add `GET /api/dashboard/pr-highlights`.
- Endpoint computes PR highlights server-side using D1 data and existing 1RM calculation logic.
- Dashboard fetches this endpoint once and renders a dedicated callout section.
- Source lift scope is limited to main lifts only, based on `MAIN_LIFTS`.

## API Contract
Response shape:
- `window_days`: number (`7`)
- `as_of`: ISO timestamp
- `events`: array sorted newest-first

Event shape:
- `exercise_id`: string
- `exercise_key`: string
- `display_name`: string
- `pr_type`: `"heaviest_weight"` | `"estimated_1rm"`
- `weight_kg`: number
- `reps`: number
- `estimated_1rm_kg`: number | `null`
- `achieved_at`: ISO timestamp
- `workout_title`: string

Rules:
- Auth required (`401` when missing/invalid session).
- Main lifts only.
- Only `set_type = 'normal'`.
- Include event only when the all-time best for that PR type was achieved within the last 7 days.

## UI Behavior
- Add a dashboard section title: `New PRs (Last 7 Days)`.
- If no events: show `No new PRs in the last 7 days.`.
- If events exist: list concise entries with lift name, PR type, value, and date.
- If the API call fails: show a muted fallback message and keep the rest of dashboard usable.

## Error Handling
- API:
  - `401` unauthorized when session is missing/invalid.
  - `500` for unexpected errors.
- UI:
  - Fail-soft rendering for the PR highlights section.
  - Do not break existing dashboard charts/cards.

## Testing Strategy (TDD)
Route tests (red -> green):
- Returns `401` when no session cookie is present.
- Returns only main-lift events.
- Excludes non-normal sets from PR computation.
- Includes recent PR events (within 7 days).
- Excludes stale PR events (older than 7 days).
- Sorts events newest-first.

Dashboard tests (red -> green):
- Renders `New PRs (Last 7 Days)` section.
- Shows empty-state message when endpoint returns zero events.
- Shows formatted PR entries when endpoint returns data.

## Implementation Plan
1. Add failing tests for new PR highlights route behavior.
2. Implement `/api/dashboard/pr-highlights` route.
3. Add failing dashboard test(s) for PR highlights section.
4. Implement dashboard PR highlights fetch and rendering.
5. Run targeted tests, then full test suite.
6. Update roadmap status to mark Phase 7 complete if validation passes.

## Non-Goals
- No schema changes.
- No all-exercises PR feed.
- No import-time event materialization.
- No chat or AI coach changes.

## Status
Planned on February 19, 2026.
