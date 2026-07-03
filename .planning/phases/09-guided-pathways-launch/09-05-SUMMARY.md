---
phase: 09-guided-pathways-launch
plan: 05
subsystem: ui
tags: [tanstack-router, radix-tooltip, og-meta, 404, launch-polish]

# Dependency graph
requires:
  - phase: 02-graph-engine
    provides: index.tsx EmptyState centered-column layout convention (cloned for 404)
  - phase: 04-auth-database
    provides: SignInButton gold-CTA (rune-500) treatment reused for the 404 CTA
provides:
  - Single app-wide TooltipProvider mounted high in __root.tsx (required Radix ancestor for 09-12 staleness tooltip)
  - Branded 404 NotFoundPage wired via root notFoundComponent
  - OG/Twitter/description share meta on first server-rendered load
affects: [09-12, launch, seo]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single TooltipProvider mounted once high in the tree (Pitfall 1) — never a second provider deeper"
    - "notFoundComponent on createRootRoute (framework-native 404, no hand-rolled catch-all)"
    - "OG meta via property: keys in head() meta array (RESEARCH Pattern 4)"

key-files:
  created:
    - src/components/NotFoundPage.tsx
  modified:
    - src/routes/__root.tsx

key-decisions:
  - "TooltipProvider mounted inside QueryClientProvider, wrapping SiteHeader + children + Toaster — one provider only, high in tree (Pitfall 1)"
  - "og:image points to placeholder /og-image.png in public/ — asset creation is out of scope (content/design workstream)"
  - "SITE_DESCRIPTION hoisted to a module const so description and og:description share one source (UI-SPEC: og:description == description)"
  - "404 CTA uses Button asChild wrapping Router Link to keep navigation client-side while reusing the gold-CTA treatment"

patterns-established:
  - "App-wide Radix providers live once in __root.tsx RootDocument, not per-consumer"

requirements-completed: [PATH-03]

coverage:
  - id: D1
    description: "Single app-wide TooltipProvider mounted high in __root.tsx, unblocking the 09-12 staleness tooltip's required Radix context"
    requirement: PATH-03
    verification:
      - kind: automated_ui
        ref: "grep TooltipProvider src/routes/__root.tsx (single mount) + tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Unknown URLs render a branded 404 (NotFoundPage) with a working gold CTA link back to /"
    requirement: PATH-03
    verification:
      - kind: manual_procedural
        ref: "Navigate to an unknown path; expect Page not found heading + Back to the roadmap CTA → /"
        status: unknown
    human_judgment: true
    rationale: "Visual/functional rendering of the 404 route and its link navigation needs human confirmation in a running app (dev server verification deferred to end-of-phase)"
  - id: D3
    description: "OG/Twitter/description share meta present on first server-rendered load"
    requirement: PATH-03
    verification:
      - kind: automated_ui
        ref: "grep og:title src/routes/__root.tsx + tsc --noEmit; view-source spot-check deferred to end-of-phase"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-07-03
status: complete
---

# Phase 09 Plan 05: Launch-polish + Tooltip Foundation Summary

**Mounted the codebase's first app-wide Radix TooltipProvider in __root.tsx, added a branded notFoundComponent 404, and shipped OG/Twitter/description share meta — making the app shareable, error-graceful, and unblocking the 09-12 staleness tooltip.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-03T13:58:07Z
- **Completed:** 2026-07-03T14:00:32Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Built `src/components/NotFoundPage.tsx` — centered obsidian column cloning the index.tsx EmptyState convention (inline styles, CSS variables only), 22px Space Grotesk `<h1>` + 14px Outfit body per the UI-SPEC 404 copy, gold-CTA Button (rune-500) using a TanStack Router `<Link>` to `/`.
- Mounted a single `<TooltipProvider>` in `__root.tsx` RootDocument inside QueryClientProvider, wrapping SiteHeader + children + Toaster — the required Radix ancestor for the 09-12 staleness tooltip (Pitfall 1: one provider, high in the tree).
- Wired `notFoundComponent: NotFoundPage` on `createRootRoute`.
- Extended root `head()` with `description` + `og:title`/`og:description`/`og:type`/`og:image` (property: keys) + `twitter:card` "summary_large_image"; hoisted `SITE_DESCRIPTION` const so `description` and `og:description` share one source.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the branded NotFoundPage component** - `e8fa1d2` (feat)
2. **Task 2: Mount TooltipProvider, wire notFoundComponent, add OG meta in __root.tsx** - `f24cc6b` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `src/components/NotFoundPage.tsx` - Branded 404 page (centered obsidian column, gold CTA → /).
- `src/routes/__root.tsx` - TooltipProvider mount, notFoundComponent wiring, OG/Twitter/description meta.

## Decisions Made
- TooltipProvider mounted once, high in the tree inside QueryClientProvider (Pitfall 1) — a second provider deeper would be redundant/incorrect.
- `og:image` references a placeholder `/og-image.png` in `public/`; the 1200×630 asset is out of scope (content/design workstream), noted per plan.
- `SITE_DESCRIPTION` hoisted to a module const to keep `description` and `og:description` in sync (UI-SPEC: identical values).
- 404 CTA uses `Button asChild` wrapping a Router `<Link>` — keeps client-side navigation while reusing the SignInButton gold-CTA treatment.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `tsc --noEmit` clean after both tasks; all grep acceptance markers present.

## Known Stubs
- `og:image` → `/og-image.png` is a placeholder path; the actual OG image asset is intentionally out of scope for this plan (content/design workstream), documented in the plan action and UI-SPEC §OG Tags.

## User Setup Required
None - no external service configuration required. (An OG image asset at `public/og-image.png` should be added by the content/design workstream before public launch.)

## Next Phase Readiness
- 09-12 staleness tooltip is unblocked — the required TooltipProvider Radix context is now available app-wide.
- Unknown URLs render a branded 404; share links carry OG/Twitter meta.
- Recommend end-of-phase human verification of the 404 route rendering + view-source OG meta on the live/dev server (per config `human_verify_mode: end-of-phase`).

## Self-Check: PASSED

- FOUND: src/components/NotFoundPage.tsx
- FOUND: src/routes/__root.tsx
- FOUND commit: e8fa1d2 (Task 1)
- FOUND commit: f24cc6b (Task 2)

---
*Phase: 09-guided-pathways-launch*
*Completed: 2026-07-03*
