---
phase: 09-guided-pathways-launch
plan: 10
subsystem: home-route
tags: [loader, staleness, launch-gate, intro-overlay, boundary]
status: complete
requires:
  - "isStale predicate (09-02)"
  - "launch_ready content field (09-03)"
  - "GraphDisplayNode.stale (09-04)"
  - "PathwayIntroOverlay (09-07)"
provides:
  - "env-gated launched-graph exclusion of draft nodes (CONT-04/D-12)"
  - "on-canvas stale boolean projected via isStale (D-09)"
  - "first-visit intro overlay mounted in home route (PATH-03/D-05)"
affects:
  - src/routes/index.tsx
tech-stack:
  added: []
  patterns:
    - "environment-gated content filter (import.meta.env.PROD) before projection map"
    - "single derived boolean crosses content→graph boundary (ADR 013)"
key-files:
  created: []
  modified:
    - src/routes/index.tsx
decisions:
  - "launch_ready filter is PROD-only (A3): dev bypasses it so all 17 nodes stay visible pre-content-audit; matches D-12 without emptying the dev graph"
  - "stale added as one explicit named field in the safeParse projection — no frontmatter spread, no meta_volatile/patchId on the graph layer (ADR 013/D-09)"
  - "PathwayIntroOverlay mounted bare (no ClientOnly wrapper) — it self-gates on localStorage and defaults CLOSED (SSR-safe, Pitfall 3)"
metrics:
  duration: ~2min
  completed: 2026-07-03
---

# Phase 9 Plan 10: Home Route Loader Boundary + Intro Overlay Summary

Env-gated launch_ready filtering, isStale-derived `stale` projection, and the first-visit intro overlay wired into the landing route — the sole owner of index.tsx changes this phase.

## What Was Built

**Task 1 — Loader boundary work (`src/routes/index.tsx`):**
- Imported `isStale` (`#/lib/staleness`) and `CURRENT_PATCH` (`#/lib/patches`).
- Inserted a `.filter` before the projection `.map`: `!import.meta.env.PROD || n.launch_ready === true`. Under a production build only launch_ready nodes reach the graph (CONT-04/D-12 launched-graph exclusion, T-09-10 mitigation); in local dev the gate is bypassed so all nodes render and the pathway/overlay are verifiable before the content workstream flips nodes to launch_ready (RESEARCH Open Question 2 / A3).
- Added `stale: isStale(n.meta_volatile, n.patchId, CURRENT_PATCH.id)` as one explicit named field inside the `GraphDisplayNodeSchema.safeParse({...})` object. Only the derived boolean crosses the content→graph boundary; `meta_volatile`/`patchId` are never projected (ADR 013/D-09). Every pre-existing projected field is unchanged; no frontmatter spread.

**Task 2 — Intro overlay mount (`src/routes/index.tsx`):**
- Imported `PathwayIntroOverlay` (`#/components/graph/PathwayIntroOverlay`) and rendered it inside the Home component's `ProgressProvider` subtree, alongside the existing main/panel structure so it overlays the spotlighted pathway (D-05).
- Mounted bare (no `ClientOnly` wrapper): the component self-gates on the `wc3rm:pathway-intro-seen` localStorage flag and defaults CLOSED, so it is already SSR-safe. Not auth-gated — shows for every first-time visitor.

## Verification

- `grep` gates: `isStale`, `import.meta.env.PROD`, `launch_ready`, `PathwayIntroOverlay` all present in `src/routes/index.tsx`.
- `npx tsc --noEmit` — clean (exit 0).
- Both tasks touch only `index.tsx`; no file deletions; no new untracked files.

## Deviations from Plan

None — plan executed exactly as written.

Note on commit granularity: both tasks modify the single file `index.tsx` (the plan explicitly designates this plan as the sole owner of index.tsx changes). Working-tree changes for the two coupled tasks were committed together in one `feat(09-10)` commit rather than split per-task, since a single file's changes cannot be cleanly separated without interactive staging.

## Known Stubs

None. The env-gated dev carve-out is intentional and documented (A3): in dev all nodes render; the production filter and the launch gate (09-08, blocks deploy until ≥25 nodes are launch_ready) are the enforced boundary. This is not a stub — it is the designed pre-content-audit behavior.

## Self-Check: PASSED
- FOUND: src/routes/index.tsx (modified, committed)
- FOUND: commit c5adf4b
