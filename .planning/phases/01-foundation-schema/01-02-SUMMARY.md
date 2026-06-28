---
phase: 01-foundation-schema
plan: "02"
subsystem: patch-registry
tags: [patch-registry, deep-module, tdd, zod, schema-primitive]
depends_on:
  requires: [01-01]
  provides: [patch-registry, PATCH_IDS, CURRENT_PATCH, getPatch]
  affects: [01-05, 01-06, 01-07, 01-08]
tech_stack:
  added: []
  patterns:
    - "Patch registry as deep module — 4-export interface (PATCHES, CURRENT_PATCH, PATCH_IDS, getPatch) hides internal array and tuple construction"
    - "PATCH_IDS typed as [string, ...string[]] for z.enum() compatibility without call-site cast"
    - "getPatch() fail-fast pattern: throws Error including unknown id in message"
    - "Private _PATCHES const with readonly public PATCHES view — callers never index the array directly"
    - "TDD: RED commit (test only) → GREEN commit (implementation) per plan requirement"
key_files:
  created:
    - src/lib/patches.ts
    - src/lib/patches.test.ts
  modified: []
decisions:
  - "Private _PATCHES internal const, public PATCHES as readonly PatchEntry[] — prevents callers from bypassing getPatch()/PATCH_IDS"
  - "objectIdMapVersion seeded as 1 for both existing patches — reserved for Phase 8 replay parsing, not consumed before then"
  - "Two real WC3 patches seeded: patch-1.36.1 (2022-11-16) and patch-1.36.2 (2024-03-15)"
metrics:
  duration: "4 minutes"
  completed: "2026-06-28"
  tasks_completed: 1
  tasks_total: 1
  files_created: 2
  files_modified: 0
status: complete
---

# Phase 01 Plan 02: Patch Registry Module Summary

Patch version primitive implemented as a deep module — 4-symbol interface over a curated ordered registry of WC3 patches, test-first with TDD RED/GREEN cycle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Patch registry tests (failing) | 785d6dd | src/lib/patches.test.ts |
| 1 (GREEN) | Patch registry implementation | fc5df26 | src/lib/patches.ts |

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/patches.test.ts` passes (9/9 tests) | PASS |
| `npm run typecheck` exits 0 | PASS |
| Line 1 of `src/lib/patches.ts` is `// SPDX-License-Identifier: GPL-3.0-or-later` | PASS |
| `getPatch` throws on unknown id (test: "getPatch throws an Error whose message includes the unknown id") | PASS |
| CURRENT_PATCH === PATCHES[PATCHES.length - 1] (test: "CURRENT_PATCH is the last entry") | PASS |
| PATCH_IDS is a non-empty tuple (test: "PATCH_IDS is a non-empty tuple") | PASS |
| PATCHES order values are strictly ascending (test: "PATCHES order values are strictly ascending") | PASS |
| TDD gate — RED commit exists before GREEN commit | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

RED gate: test(01-02) commit 785d6dd — `src/lib/patches.test.ts` written with 9 failing tests before any implementation.
GREEN gate: feat(01-02) commit fc5df26 — `src/lib/patches.ts` implemented; all 9 tests pass.
No REFACTOR gate needed — implementation was clean on first pass.

## Known Stubs

None. The module is complete and self-contained. `objectIdMapVersion` is seeded with value `1` for both patches — it is an intentional reserved hook for Phase 8 replay parsing, not a stub. Plan 01-04 (ADRs) will document the Phase 8 deferral.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. The patch registry is a pure in-repo developer-authored module with no runtime user input surface. T-01-PATCH mitigation (getPatch fail-fast + PATCH_IDS for z.enum) is implemented and tested.

## Self-Check: PASSED

- `src/lib/patches.ts` — confirmed present
- `src/lib/patches.test.ts` — confirmed present
- Commit 785d6dd (RED) — confirmed in git log
- Commit fc5df26 (GREEN) — confirmed in git log
- All 9 tests pass: `npx vitest run src/lib/patches.test.ts`
