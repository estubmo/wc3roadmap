---
phase: 09-guided-pathways-launch
plan: 02
subsystem: content-trust
tags: [staleness, pure-function, tdd, deep-module]
requires:
  - src/lib/patches.ts (CURRENT_PATCH.id — the currentPatchId comparison value)
provides:
  - src/lib/staleness.ts (isStale — single-source-of-truth staleness predicate)
affects:
  - src/routes/index.tsx (09-10 loader projection → GraphDisplayNode.stale)
  - src/components/graph/NodePanelContent.tsx (09-12 staleness strip)
tech-stack:
  added: []
  patterns:
    - pure deep-module predicate (no imports, colocated Vitest)
    - TDD RED→GREEN
key-files:
  created:
    - src/lib/staleness.ts
    - src/lib/staleness.test.ts
  modified: []
decisions:
  - "isStale(metaVolatile, patchId, currentPatchId) = metaVolatile && patchId !== currentPatchId — the one staleness rule (D-06)"
  - "Zero imports: predicate takes currentPatchId as a param so callers pass CURRENT_PATCH.id (keeps the fn pure + trivially testable, mirrors patches.ts convention)"
  - "Relative import (./staleness) in test — vitest.config.ts has no #/ alias resolver"
metrics:
  duration: 1m
  completed: 2026-07-03
  tasks: 2
  files: 2
status: complete
---

# Phase 9 Plan 02: Staleness Predicate Summary

Single-source-of-truth `isStale` predicate (D-06 locked trigger) — a meta-volatile node is stale iff its authored patch id differs from the current patch id; built TDD RED→GREEN with exhaustive four-row truth-table coverage.

## What Was Built

- **`src/lib/staleness.ts`** — pure `isStale(metaVolatile, patchId, currentPatchId): boolean` returning `metaVolatile && patchId !== currentPatchId`. Zero imports. Module doc-comment names it the sole staleness rule and cites both consumers: the graph loader projection populating `GraphDisplayNode.stale` (D-09, plan 09-10) and the `NodePanelContent` staleness strip (D-07, plan 09-12).
- **`src/lib/staleness.test.ts`** — Vitest coverage of all four boolean combinations (volatile×patch-moved, volatile×patch-same, non-volatile×patch-moved, non-volatile×patch-same), using concrete patch ids (`patch-1.36.1` vs `patch-1.36.2`) so the inequality path is genuinely exercised.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Failing truth-table test (RED) | bc53a74 | src/lib/staleness.test.ts |
| 2 | Implement isStale (GREEN) | d554108 | src/lib/staleness.ts |

## Verification

- `npx vitest run src/lib/staleness.test.ts` — 4 passed (was RED with "Cannot find module './staleness'" before Task 2).
- `npx tsc --noEmit` — no errors in staleness files.

## Deviations from Plan

None — plan executed exactly as written. No REFACTOR commit: the GREEN implementation is already the minimal one-line predicate.

## Decisions Made

- Predicate takes `currentPatchId` as an explicit parameter rather than importing `CURRENT_PATCH` — keeps the module pure (zero imports) and unit-testable without the patch registry; callers pass `CURRENT_PATCH.id`.
- `PatchEntry` has no `label` field; the comparison value everywhere is `CURRENT_PATCH.id` (e.g. `patch-1.36.2`).

## Known Stubs

None.

## TDD Gate Compliance

RED (`test(09-02)`, bc53a74) precedes GREEN (`feat(09-02)`, d554108). Gate sequence satisfied.

## Self-Check: PASSED

- FOUND: src/lib/staleness.ts
- FOUND: src/lib/staleness.test.ts
- FOUND commit: bc53a74
- FOUND commit: d554108
