---
phase: 09-guided-pathways-launch
plan: 06
subsystem: ui
tags: [tanstack-router, seo, open-graph, static-page, gpl-3.0, privacy]

# Dependency graph
requires:
  - phase: 09-guided-pathways-launch
    provides: "Root head()/OG meta convention (property: keys) from plan 09-05"
provides:
  - "/about static About/Privacy route with per-route head() OG override"
  - "Launch-ready honest privacy statement (BattleTag + progress records, no trackers)"
  - "GPL-3.0-or-later openness statement linking the repository LICENSE"
affects: [content-workstream-navigation, launch-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-route head() override: about-specific title + og:title/og:description mirror the root convention on a single page"
    - "Static prose page reuses the locked Phase 2 type scale + MDX anchor style (rune-400/rune-600) — zero net-new sizes, CSS-variable styles only"

key-files:
  created:
    - src/routes/about.tsx
  modified: []

key-decisions:
  - "LICENSE link points at the estubmo/wc3roadmap GitHub blob URL (repo remote), not a relative in-app path"
  - "About head() sets an about-specific title + OG override; root defaults inherited for og:type/og:image/twitter:card"

patterns-established:
  - "Launch static pages: single centered 640px column, obsidian-950 bg, locked type scale, MDX anchor link style"

requirements-completed: [PATH-03]

coverage:
  - id: D1
    description: "/about renders mission, an Open source/GPL-3.0-or-later section linking LICENSE, a Privacy section naming BattleTag + progress records and no trackers, and a link home"
    requirement: "PATH-03"
    verification:
      - kind: other
        ref: "npx tsc --noEmit (exit 0) + grep og:title src/routes/about.tsx"
        status: pass
    human_judgment: true
    rationale: "Rendered content/visual layout and copy accuracy are a human launch-polish judgment; deferred to end-of-phase human verification (config human_verify_mode: end-of-phase)"

# Metrics
duration: 3min
completed: 2026-07-03
status: complete
---

# Phase 9 Plan 06: About / Privacy Page Summary

**Minimal static /about route with a per-route OG title override, GPL-3.0-or-later openness statement linking the LICENSE, and an honest privacy line naming exactly what is stored (BattleTag + per-node progress records, no third-party trackers).**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-03T14:04:17Z
- **Completed:** 2026-07-03T14:07:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- New `/about` file-route via `createFileRoute("/about")` with SPDX header
- Per-route `head()` override supplying an about-specific `title` plus `og:title`/`og:description` (property: keys, per UI-SPEC §Page Metadata)
- Content: mission distilled from PROJECT.md core value; an "Open source" section stating GPL-3.0-or-later and linking the repository LICENSE; a "Privacy" section naming BattleTag + per-node progress records and no third-party trackers; a "Back to the roadmap" link home via TanStack Router `Link`
- Styling reuses the locked Phase 2 type scale (22px/600 Space Grotesk h1, 15px/600 node-title h2, 14px/400/1.65 body) and the MDX anchor convention (rune-400 text, rune-600 underline) — CSS variables only, no hardcoded hex

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the About/Privacy route** - `a3bef41` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified
- `src/routes/about.tsx` - Static About/Privacy route with per-route head() OG override and static prose (mission, GPL-3.0-or-later + LICENSE link, privacy statement, link home)

## Decisions Made
- LICENSE link targets `https://github.com/estubmo/wc3roadmap/blob/main/LICENSE` (derived from the git remote) rather than a relative path, since the raw GPL text is served from the repo, not the app.
- The about `head()` overrides only `title`, `og:title`, and `og:description`; the root route's `og:type`, `og:image`, and `twitter:card` are intentionally inherited (no need to duplicate).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/about` is ready to be linked from the app footer/header as the content workstream wires site navigation (plan key_link).
- No blockers. The 1200×630 OG image asset referenced by the root `og:image` remains a content/design workstream item (out of scope here, unchanged from 09-05).

## Self-Check: PASSED

- FOUND: src/routes/about.tsx
- FOUND: commit a3bef41

---
*Phase: 09-guided-pathways-launch*
*Completed: 2026-07-03*
