# Phase 0 — Project Skeleton Design

## Goal

Deliver a local, runnable Next.js App Router skeleton with a visible dashboard shell, route stubs, basic error handling, and a minimal testing setup that validates the shell. Keep the styling intentionally light and defer design-system decisions to Phase 0.5, while still supporting a clean, usable layout.

## Key Decisions

- App Router at repo root with `src/` directory.
- TypeScript enabled by default.
- Basic linting via `eslint-config-next`.
- Add Prettier now for consistent formatting (minimal config).
- Testing: `vitest` (v4) + `@testing-library/react` for fast UI smoke tests.
- React Compiler enabled (create-next-app default).

## App Structure

- `src/app/layout.tsx` provides a global shell (header + nav + main).
- `src/app/page.tsx` is the dashboard empty-state with 4 lift cards.
- Route stubs: `src/app/upload/page.tsx`, `src/app/chat/page.tsx`, `src/app/admin/page.tsx`.
- Error handling:
  - `src/app/error.tsx` for a simple error boundary.
  - `src/app/not-found.tsx` for a friendly 404 with a dashboard link.
- Shared UI:
  - `src/components/app-shell.tsx` (layout wrapper) and `src/components/nav.tsx` (links).
  - `src/lib/constants.ts` for the default lift names.
- Styling: `src/app/globals.css` with a minimal set of layout and card styles (no Tailwind yet).

## Tests (TDD)

Write tests first to confirm:

- The dashboard renders the header and the four lift cards.
- Each route stub renders its heading.
  Run tests to see red, then implement and rerun for green.

## Validation

- `npm run dev` shows the dashboard shell on desktop and mobile.
- `/`, `/upload`, `/chat`, `/admin` render without errors.
- `npm test` (or `npm run test`) passes all smoke tests.

## Non-Goals (Phase 0)

- No auth, database, or uploads.
- No design system or charting yet.
- No API routes beyond built-in Next.js defaults.

## Implementation Status

Complete as of February 4, 2026. Tests pass and the shell renders with route stubs.
