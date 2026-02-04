# Tech Stack — Gym Training Analyzer

This document highlights the proposed technologies for the app and why they’re chosen. It’s meant to be updated as decisions get finalized during early phases in `docs/roadmap.md`.

## Chosen Stack (current)

- Framework: Next.js (React) + TypeScript
- React Compiler: enabled (Next.js default)
- Hosting/runtime: Cloudflare Workers (OpenNext)
- Database: Cloudflare D1 (SQLite) + Wrangler migrations
- UI (Phase 0.5 target): Tailwind CSS + Radix UI primitives + `shadcn/ui`-style copy-in components
- Charts: Recharts
- Validation: Zod
- Forms: React Hook Form (use where it helps; keep simple forms simple)
- Testing: Vitest + Testing Library
- Formatting: Prettier
- AI: provider-agnostic server-only adapter (start with one provider via env vars)

## Hosting & Runtime

- Cloud hosting: Cloudflare Workers (OpenNext) for app runtime and static assets.
- Database: Cloudflare D1 (SQLite).
- CLI tooling: Wrangler (for Workers deploys, D1, and bindings).

Why:
- One deployable surface area (site + API routes together).
- Lightweight DB with simple ops for a personal app.

## Web App Framework

- Next.js (React).
- TypeScript.

Why:
- Familiar ecosystem, good routing/data-fetching patterns, easy component composition.

## Styling / UI Components (bootstrap now, brand later)

**Recommended starting point**
- Tailwind CSS for styling.
- `shadcn/ui`-style approach (copy-in components) built on Radix UI primitives.

Why this combo works well for your goals:
- Fast to ship a clean, minimal UI.
- Accessible primitives (Radix) without committing to a heavy themed component library.
- Easy to “brand later” by centralizing tokens (CSS variables) and adjusting component styles without fighting a framework theme system.
- Keeps bundle size and visual complexity under control.

**Phase 0 note**
- Phase 0 uses lightweight handcrafted CSS in `src/app/globals.css` to ship the shell before adopting Tailwind in Phase 0.5.

**Alternatives**
- Material UI (MUI): very complete, but heavier and you often end up “fighting the theme” to make it look truly minimal.
- Mantine/Chakra: good dev experience; still more “framework” than you likely need.

## Charts & Visualization

Goal: mobile-friendly charts, tap-to-inspect points, good performance.

Suggested options (pick one):
- Recharts (chosen): easiest to get productive; good enough for line/scatter with tooltips.
- Visx: more flexible/low-level; more work but great control for the 1RM band + dot styling.

## Forms, Validation, CSV Parsing

- Runtime validation: Zod (chosen; validate parsed CSV rows and API request bodies).
- Forms: React Hook Form (chosen; optional for very small forms).
- CSV parsing: a small CSV parser library or a minimal streaming parser depending on file size limits.

## Auth & Security Libraries

- Password hashing: prefer Argon2id; if runtime constraints apply, use scrypt or PBKDF2 with documented parameters.
- Session tokens: random high-entropy token in cookie; store only hash in D1 (SHA-256).
- Rate limiting: simple per-IP / per-email limits (KV-based or in-memory with edge caveats; document exact strategy).

## Data Access & Migrations

- D1 access via Cloudflare-provided bindings from server routes.
- Migrations tracked in-repo and applied via Wrangler.

## AI Coach / LLM Integration

- Provider-agnostic “LLM adapter” interface in server-only code.
- Secrets in Cloudflare env vars only (never `NEXT_PUBLIC_*`).
- “Text in/text out” only (no tool execution), to reduce prompt-injection risk.

## PWA

- Manifest + icons.
- Service worker (minimal offline experience; primarily installability).

## Observability (optional)

- Basic structured logs on server routes (redacted).
- Optional error reporting (decide later).

## Open Decisions

1) Password hashing library feasibility in Cloudflare runtime (Argon2id preferred; fallback to scrypt/PBKDF2 with documented parameters if needed).
