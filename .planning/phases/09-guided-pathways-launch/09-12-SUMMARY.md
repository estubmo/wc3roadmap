---
phase: 09-guided-pathways-launch
plan: 12
subsystem: node-detail-panel
tags: [staleness, tooltip, accessibility, patch-versioning, CONT-05]
status: complete
requires:
  - "isStale (09-02)"
  - "app-wide TooltipProvider (09-05)"
  - "CURRENT_PATCH (patches.ts)"
provides:
  - "panel staleness strip (D-06/D-07)"
affects:
  - src/components/graph/NodePanelContent.tsx
tech-stack:
  added: []
  patterns:
    - "controlled Radix Tooltip (open + onOpenChange + onClick toggle) for touch support"
key-files:
  created: []
  modified:
    - src/components/graph/NodePanelContent.tsx
decisions:
  - "Use CURRENT_PATCH.id directly in pill copy (no new PatchEntry.label field) per planner A1 / RESEARCH Pitfall 4"
  - "Neutral text at opacity 0.85 (not 0.65) to clear 4.5:1 contrast on obsidian-800; decorative Clock icon stays at 0.65"
  - "role=\"note\" + tabIndex 0 on strip trigger for keyboard focus; onClick toggles controlled open for tap"
metrics:
  duration: 4m
  completed: 2026-07-03
  tasks: 1
  files: 1
---

# Phase 09 Plan 12: Panel Staleness Indicator Summary

A touch-capable "Unreviewed for {CURRENT_PATCH.id}" strip now renders below the node panel header for meta-volatile out-of-patch nodes, carrying a hover/focus/tap tooltip that honestly signals content staleness (D-06/D-07, CONT-05).

## What Was Built

- **Staleness strip** in `NodePanelContent.tsx`, positioned between the header block and the scrollable body, gated by `showStaleStrip = node && isStale(node.meta_volatile, node.patchId, CURRENT_PATCH.id)`. Absent entirely (no reserved space) for reviewed / current-patch nodes.
- **Visual spec match:** `padding: 6px 20px`, `background: var(--color-obsidian-800)`, `border-bottom: 1px solid var(--color-obsidian-700)`; 12px `Clock` (neutral `#e9e8ee`, 0.65 opacity, aria-hidden) + 6px gap + 11px/600 neutral pill text at 0.85 opacity.
- **Touch-capable tooltip:** a controlled shadcn `Tooltip` (local `staleTooltipOpen` state) — `onOpenChange` handles hover/focus, and an `onClick` toggle on the trigger gives tap-to-open on touch (Radix has no default touch support, 09-RESEARCH Pitfall 2). Trigger is `role="note"` + `tabIndex 0` for keyboard access. `TooltipContent` shows the exact Copywriting Contract copy interpolating `node.patchId` and `CURRENT_PATCH.id`.
- **Deferred D-15 comments updated:** both the module doc block and the in-body note now state the staleness UI is implemented (D-06/D-07), not deferred to Phase 9. No `"deferred to Phase 9"` staleness comment remains.

## Key Decisions

- Reused `CURRENT_PATCH.id` in copy directly — no new `PatchEntry.label` field (lowest-risk, matches the authoritative Copywriting Contract).
- Bumped pill text opacity to 0.85 (from the spec's 0.65 hint, which applies to the decorative icon) so the near-white text clears the 4.5:1 contrast floor on obsidian-800 per the Accessibility Baseline.
- No new data query — `node` already carries `meta_volatile` and `patchId` via `nodeContentQueryOptions`.

## Deviations from Plan

None — plan executed exactly as written. The opacity choice (0.85 for text, 0.65 for icon) resolves the plan's explicit "bump opacity if needed" contrast instruction and is not a scope change.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run test` — 38 files, 541 tests passed.
- grep confirms `isStale` + `Unreviewed for` + `Tooltip` present; no `"deferred to Phase 9"` staleness comment remains.
- Manual touch/viewport verification deferred to plan 09-13.

## Commits

- `9f73fa8` feat(09-12): add touch-capable panel staleness strip (CONT-05)

## Self-Check: PASSED

- FOUND: src/components/graph/NodePanelContent.tsx
- FOUND: commit 9f73fa8
