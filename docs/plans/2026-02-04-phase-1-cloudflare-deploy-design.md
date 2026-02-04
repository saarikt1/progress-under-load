# Phase 1 — Cloudflare Setup + First Deploy Design

## Goal
Deploy the existing Next.js app to Cloudflare Pages using OpenNext, keep it locked down while pre-auth, and add baseline security headers in code so they’re versioned and portable.

## Key Decisions
- Use OpenNext for Cloudflare (Node.js runtime) to avoid Edge-only limitations and deprecated adapters.
- Keep Phase 1 behavior minimal: no new routes, data, or auth logic.
- Add baseline security headers via `next.config.ts` using a small helper for clarity and testability.
- Document manual Cloudflare setup steps in the plan and README.
- Disable `x-powered-by` for baseline hardening.

## Architecture & Runtime
- Cloudflare Pages serves static assets; Pages Functions run the Next.js server output produced by OpenNext.
- OpenNext configuration and build outputs follow current OpenNext docs (verify exact file names and output paths before implementation).
- Add `wrangler.toml` (or equivalent) to capture project settings and prepare for future bindings (D1 in Phase 2).
- Use `npx opennextjs-cloudflare build` for the build step and emit the worker at `.open-next/worker.js` (verify against current OpenNext docs).
- Ensure Wrangler compatibility settings include `compatibility_date` and `nodejs_compat`.

## Security Headers
- Add a helper (e.g., `src/lib/security-headers.ts`) that returns Next.js `headers()` config.
- Apply headers globally in `next.config.ts`.
- Baseline headers:
  - `Content-Security-Policy` (strict by default; dev-only relaxations allowed).
  - `X-Frame-Options: DENY` (or equivalent CSP `frame-ancestors 'none'`).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `X-Content-Type-Options: nosniff`.
  - `Permissions-Policy` with a minimal allowlist.
  - `Strict-Transport-Security` (HTTPS only).
- CSP directives should include `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, and `upgrade-insecure-requests`.
- Optional hardening (defer unless needed): `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.
- Disable `x-powered-by` in `next.config.ts` (`poweredByHeader: false`).

## Manual Cloudflare Setup
- Create a Cloudflare Pages project pointing at the repo.
- Set build command and output directory per OpenNext guidance.
- Configure Preview + Production environments.
- Lock down access during early phases (Cloudflare Access or password protection).
- Record deployed URL in the plan after first deploy.
- Note: Cloudflare Pages `_headers` can be used as an alternative or supplement, but the source of truth is `next.config.ts` for portability.

## Cloudflare Pages Setup Checklist
- Create a Pages project and connect the `main` branch.
- Build command: `npm run build:cf`.
- Build output directory: verify with OpenNext output (commonly `.open-next`) before saving.
- Ensure Pages Functions/Workers output is enabled (per OpenNext guidance).
- Add environment variables only if/when needed (none required in Phase 1).
- Lock down the site using Cloudflare Access or password protection.
- Capture the preview and production URLs in this document after first deploy.

## Deploy Notes
- OpenNext build output should include `.open-next/worker.js` and `.open-next/assets`.
- After deploy, confirm:
  - The dashboard renders.
  - Security headers are present (check `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, and `Strict-Transport-Security` in prod).

## Tests (TDD)
- Add a unit test for the headers helper to assert required keys and non-empty values.
- Run `npm test` to confirm red before implementation, then green after.

## Validation
- `npm test` passes locally.
- Deployed URL renders the placeholder dashboard.
- Security headers appear in the response (manual check via devtools or `curl`).

## Non-Goals
- No new product features, data, or auth.
- No D1 configuration yet.
- No API routes or middleware beyond what already exists.

## Status
Planned as of February 4, 2026.
