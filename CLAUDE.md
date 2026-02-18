# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build (Node.js)
npm run build:cf         # Cloudflare Workers build (via OpenNext.js)

# Testing
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode

# Single test file
npx vitest run src/app/__tests__/some-test.ts

# Linting & Formatting
npm run lint             # ESLint
npm run format           # Prettier (write)
npm run format:check     # Prettier (check only)

# Database migrations
npm run db:migrate:local    # Apply migrations to local D1
npm run db:migrate:preview  # Apply migrations to preview D1
npm run db:migrate:prod     # Apply migrations to production D1
```

## Architecture

**Progress Under Load** is a gym training analytics SaaS. Users upload CSV workout exports, which are parsed and stored; analytics pages visualize trends (1RM estimates, heaviest weights) over time.

### Stack
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts
- **Backend:** Next.js API routes on Cloudflare Edge runtime via OpenNext.js
- **Database:** Cloudflare D1 (SQLite), accessed via `context.cloudflare.env.DB`
- **Auth:** Custom session-based auth with PBKDF2 password hashing (no third-party)

### Key directories

```
src/
├── app/
│   ├── api/           # Edge runtime API endpoints (auth, exercises, import)
│   ├── actions/       # Server actions (invite management)
│   ├── __tests__/     # Page & component tests
│   └── (pages)/       # exercises/, upload/, login/, admin/, chat/
├── server/            # Backend business logic (auth.ts, import.ts, csv-parser.ts)
├── components/
│   ├── ui/            # Primitive Radix-based components
│   └── charts/        # Recharts wrappers (one-rm-chart, heaviest-weight-chart)
├── lib/               # Pure utilities: one-rm.ts (formulas), constants.ts, utils.ts
├── hooks/             # Custom React hooks
└── middleware.ts      # Route protection (auth guard)
```

### Data flow for CSV import
1. User uploads CSV on `/upload` page
2. `POST /api/import` calls `src/server/import.ts`
3. Import is idempotent: rows are SHA-256 hashed; duplicates skipped via `max_end_time_seen` tracking
4. Exercises and sets are upserted into D1

### Authentication
- Sessions stored as hashed tokens in the `sessions` D1 table
- `src/server/auth.ts` — session creation, PBKDF2 hashing, timing-safe comparison
- `src/middleware.ts` — protects all routes except `/login` and `/api/auth/*`
- New users via invite codes only (`/accept-invite`, admin creates invites)

### 1RM calculation (`src/lib/one-rm.ts`)
- Computes Epley, Brzycki, and Lombardi formulas; returns min/max/average rounded to nearest 0.5kg
- Charts aggregate to highest 1RM per week to smooth trends
- Y-axis ticks use 5kg or 10kg increments depending on data range

### Database access pattern
All API routes are Edge runtime. D1 is accessed via the Cloudflare binding:
```ts
const db = context.cloudflare.env.DB;
```
Migrations live in `migrations/` and are applied via `wrangler d1 migrations apply`.

### Path alias
`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vitest.config.ts`).
