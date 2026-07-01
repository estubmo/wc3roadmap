---
phase: 07-w3champions-auto-detection
plan: 03
subsystem: graph-ui
tags: [graph-store, mastery-badge, source-labeling, motion-pulse, zustand]
requires:
  - graph-store sourceMap/MasteryBadge source mechanism (Phase 6)
  - node_progress source:"auto" rows stamped by 07-07 (consumer contract)
provides:
  - recentlyAdvancedNodeIds transient highlight slice + setRecentlyAdvanced setter
  - MasteryBadge source==="auto" in-progress branch
  - GraphNode auto canvas marker + Motion pulse on recentlyAdvancedNodeIds
affects:
  - src/lib/graph-store.ts
  - src/components/graph/MasteryBadge.tsx
  - src/components/graph/GraphNode.tsx
tech-stack:
  added: []
  patterns:
    - per-node boolean selector (.has(id)) for transient Set state (Pitfall 5)
    - immutable Set-replace setter mirroring setSource new-object semantics
    - one-shot Motion scale pulse gated on per-node membership
key-files:
  created: []
  modified:
    - src/lib/graph-store.ts
    - src/components/graph/MasteryBadge.tsx
    - src/components/graph/GraphNode.tsx
decisions:
  - "recentlyAdvancedNodeIds is ReadonlySet<string>, transient UI-only, never in any GraphDisplayNode projection (ADR 002/005)"
  - "auto in-progress marker reuses rune-400 accent (parallel to quiz ◆) — no new color; glyph ◈ is a placeholder pending UI-SPEC"
  - "D-07 pulse implemented as one-shot scale [1,1.05,1] over 0.9s — non-blocking, does not touch hover/selection"
metrics:
  duration: ~7min
  completed: 2026-07-01
status: complete
---

# Phase 7 Plan 3: Distinct-Source Labeling + Highlight Slice Summary

Extended the Phase-6 `MasteryBadge`/`sourceMap` mechanism with an `"auto"` source branch and added the transient `recentlyAdvancedNodeIds` graph-store slice so w3champions auto-advanced MECHANIC nodes read as visibly distinct from manual/quiz progress (criterion 2 / D-09) and freshly-advanced nodes pulse on return (D-07).

## What Was Built

- **Task 1 — graph store highlight slice** (`src/lib/graph-store.ts`): Added `recentlyAdvancedNodeIds: ReadonlySet<string>` (transient, UI-only) and `setRecentlyAdvanced(nodeIds: string[])` which replaces the set immutably via `set({ recentlyAdvancedNodeIds: new Set(nodeIds) })`, mirroring `setSource`. JSDoc documents it as non-persisted, written by `useSyncW3championsMutation` onSuccess (07-08), read via per-node `.has(id)` selector. Existing `masteryMap`/`sourceMap` slices untouched.
- **Task 2 — MasteryBadge auto branch** (`src/components/graph/MasteryBadge.tsx`): The `state === "in-progress"` pill (previously unconditional "In Progress") now renders `"In progress · from w3champions"` when `source === "auto"` (placeholder copy, D-09). Reuses existing rune-600/rune-300 in-progress styling — no new accent. The `mastered` + `source === "quiz"` branch is unchanged.
- **Task 3 — GraphNode marker + pulse** (`src/components/graph/GraphNode.tsx`): Added a distinct `◈` auto-source canvas marker rendered when `masterySource === "auto" && masteryState === "in-progress"`, parallel to the quiz `◆`. Subscribed to `recentlyAdvancedNodeIds` via a per-node boolean selector and wrapped the node in a `motion.div` (imported from `motion/react` per CLAUDE.md) that plays a one-shot scale pulse `[1, 1.05, 1]` over 0.9s when the node id is in the set. Existing quiz marker + MasteryBadge wiring unchanged.

## Verification

- `npx tsc --noEmit` exits 0 after each task.
- `grep` confirms: `recentlyAdvancedNodeIds` (store), `auto` (badge), `motion/react` (GraphNode single import — not framer-motion).
- Full suite green: `npm test` → 26 files / 372 tests passed.

## Placeholders (deferred to UI-SPEC pass per CONTEXT.md)

- Exact badge copy ("In progress · from w3champions") — placeholder wording, JSDoc-noted.
- Auto canvas marker glyph `◈` — placeholder; final marker style deferred.
- Pulse timing/style — functional one-shot scale; final motion polish deferred.

These are mechanism-only placeholders (intentional per plan objective — "build placeholders + the wiring, not final polish"). The consumer wiring (setRecentlyAdvanced ← sync mutation 07-08; sourceMap "auto" ← progress rows stamped by 07-07) lands in later plans.

## Self-Check: PASSED

All modified files present; all three task commits (a4d59ee, 85a29aa, 1da3176) verified in git log.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface

No new security-relevant surface. Per plan threat register: `recentlyAdvancedNodeIds` is transient client-only render state (T-07-03a accept); the Motion pulse is scoped to the small recently-advanced set via a per-node `.has()` selector on a memoized component, not applied to all nodes (T-07-03b mitigate).
