# Phase 10 Design: PWA + Polish

## Overview

This phase elevates the "progress-under-load" app from a website to a web app. The goal is to make it installable (PWA), performant, accessible, and responsive (especially on mobile devices like the iPhone 16 Pro). We will implement this in a segmented approach.

## Rollout Strategy (Segmented)

### Part 1: PWA Foundation
Make the app installable and provide basic offline capabilities.

*   **Manifest:** Add a `manifest.json` with appropriate name, description, colors, and display mode (`standalone`).
*   **Icons:** Generate placeholder PWA icons (192x192, 512x512) or use provided assets. Link them in the manifest and document `<head>`.
*   **Service Worker:** Implement a minimal, custom Service Worker (`service-worker.js`).
    *   **Goal:** Intercept fetch requests.
    *   **Strategy:** Network-first for API routes, Cache-first for static assets.
    *   **Offline Fallback:** Serve a friendly static HTML offline page when the network is unavailable.
*   **Registration:** Add a client-side script to register the service worker on load.

### Part 2: Performance & Responsiveness
Ensure the app feels fast and looks good on all screen sizes.

*   **Responsive Audit:** Fix known mobile layout issues (e.g., iPhone 16 margin issues on the dashboard/health sheets) using Tailwind classes (`sm:`, `md:`, `lg:`).
*   **Performance Audit:** Run Lighthouse. Address key findings.
*   **Database Queries:** Review D1 queries. Add necessary indexes if they are missing or if table scans are frequent (e.g., on `sets` or `exercises`).
*   **Next.js Optimization:** Ensure images use `next/image` where applicable, and fonts are loaded optimally.

### Part 3: Accessibility (a11y)
Ensure the app is usable by everyone.

*   **Keyboard Navigation:** Verify all interactive elements (buttons, inputs, links, chart tooltips if possible) are reachable and usable via keyboard.
*   **Color Contrast:** Audit text/background color contrast ratios against WCAG AA standards using Lighthouse or browser dev tools.
*   **ARIA Labels:** Add `aria-label` or `aria-labelledby` where context is missing (especially for icon-only buttons or complex chart interactions).
*   **Semantic HTML:** Ensure correct usage of headings (`<h1>` to `<h6>`), `<main>`, `<nav>`, `<aside>`, etc.

## Validation

1.  **PWA:** Can install to home screen via Chrome/Safari. Disconnecting from network shows the custom offline state.
2.  **Performance:** Lighthouse score for Performance > 90 on mobile.
3.  **Accessibility:** Lighthouse score for Accessibility > 95. Keyboard navigation flow makes sense.
4.  **Responsiveness:** Looks correct and usable on mobile (iPhone 16 Pro dimensions) and desktop.

## Transition to Implementation

Once this plan is approved, we will transition to the `writing-plans` skill to generate the detailed implementation steps.
