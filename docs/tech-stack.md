# Tech Stack — Gym Training Analyzer

This document reflects the stack that is currently implemented in the repo.

Last synced: February 23, 2026.

## Chosen Stack (current)

- Framework: Next.js 16 (App Router) + TypeScript
- UI Runtime: React 19
- Hosting/runtime: Cloudflare Workers via OpenNext (`opennextjs-cloudflare`)
- Database: Cloudflare D1 (SQLite) + Wrangler SQL migrations
- Styling: Tailwind CSS v4 + CSS variables in `src/app/globals.css`
- Component primitives: `shadcn/ui`-style copy-in components + Radix primitives (`dialog`, `slot`, `toast`)
- Charts: Recharts
- CSV parsing: Papa Parse
- Date formatting: date-fns
- Icons: Lucide
- Authentication: custom email/password + session cookie auth
- Testing: Vitest + Testing Library
- Lint/format: ESLint + Prettier

## Hosting & Runtime

- Cloud hosting: Cloudflare Workers (OpenNext) for app runtime and static assets.
- Database: Cloudflare D1 (SQLite) with prod/preview/local environments.
- CLI tooling: Wrangler (for Workers deploys, D1, and bindings).
- Route handlers that access D1 run with `runtime = "edge"` in this codebase.

## Web App Framework

- Next.js App Router with TypeScript.
- React Compiler path is enabled through Next.js defaults/tooling.

## Styling / UI Components

- Tailwind CSS for styling.
- `shadcn/ui`-style approach (copy-in components) built on Radix UI primitives.
- Theme tokens are centralized in `src/app/globals.css` via CSS variables.

## Charts & Visualization

- Recharts is used for dashboard and exercise-detail strength trend charts.
- Current charts include estimated 1RM and heaviest-weight views.

## Data Ingestion & Validation

- CSV parsing is implemented with Papa Parse (`src/server/csv-parser.ts`).
- Validation is currently implemented with explicit TypeScript parsing/guards (not Zod).
- Forms are currently handled with native form handling and server actions (not React Hook Form).

## Auth & Security Libraries

- Password hashing: PBKDF2-HMAC-SHA256 via WebCrypto with per-user salt and strong iterations (default 100,000 for Cloudflare limits).
- Session tokens: random high-entropy token in cookie; store only hash in D1 (SHA-256).
- Rate limiting: simple in-memory per-IP/per-email limiter on login.

## Data Access & Migrations

- D1 access via Cloudflare-provided bindings from server routes (via OpenNext Cloudflare context).
- Migrations tracked as raw SQL in-repo and applied via Wrangler (prod/preview/local).

## AI Integration

- Native `fetch`-based adapter for OpenAI-compatible LLM endpoints (e.g., `gpt-4o-mini`).
- Used to generate context-aware coach recaps of imported workouts.

## Planned, Not Yet Implemented

- AI Coach chat interface and persistence (in progress).
- PWA installability/offline layer.
- Durable distributed rate limiting (KV or Durable Objects).
- Optional monitoring/error-reporting integration.
