---
phase: 01-foundation-schema
plan: "05"
subsystem: content-schema
tags: [zod-v4, schema, node, mastery, progress, patch-registry, tdd]
status: complete

dependency_graph:
  requires: ["01-02", "01-04"]
  provides: [NodeSummarySchema, NodeFrontmatterSchema, MasteryThresholdSchema, ProgressRecordSchema, MasteryStateSchema]
  affects: ["01-06", "01-07", "01-08"]

tech_stack:
  added: []
  patterns:
    - "Zod v4 z.enum([...]) for nodeType/patchId/masteryState — never z.nativeEnum()"
    - "z.enum(PATCH_IDS) imports PATCH_IDS:[string,...string[]] directly — no extra cast"
    - "NodeFrontmatterSchema.extend() from NodeSummarySchema — ensures strict superset invariant"
    - "TDD RED/GREEN per task — test file committed first, implementation committed second"
    - "z.string().datetime() for ISO datetime fields (lastUpdated)"
    - "z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/) for date-only fields (last_reviewed)"

key_files:
  created:
    - src/schemas/node.ts
    - src/schemas/node.test.ts
    - src/schemas/mastery.ts
    - src/schemas/mastery.test.ts
    - src/schemas/progress.ts
    - src/schemas/progress.test.ts
  modified: []

decisions:
  - "NodeFrontmatterSchema extends NodeSummarySchema via .extend() — guarantees NodeSummary is always a strict subset; divergence is a compile error"
  - "thresholdDefinition uses z.record(z.string(), z.unknown()) — deliberately open for Phase 7/8 signal extension; adding new fields will not require a migration"
  - "CitationSchema is a private sub-schema in node.ts — not exported, simplifying the public API surface of the module"
  - "z.string().datetime() used for lastUpdated — Zod v4 validates ISO 8601 format natively"
  - "PARALLEL-SCHEMA SYNC NOTE documented in node.ts — node frontmatter shape exists in both node.ts (runtime/test) and content-collections.ts (build-time); both must stay field-for-field identical"

metrics:
  duration_minutes: 7
  completed_date: "2026-06-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 0
---

# Phase 01 Plan 05: Zod v4 Content Schemas Summary

**One-liner:** Three patch-tagged Zod v4 schemas (NodeFrontmatter/NodeSummary + MasteryThreshold + ProgressRecord) with 63 passing tests, proving the patch primitive spans every schema from the first commit.

## What Was Built

Six files in `src/schemas/`:

| File | Exports | Tests |
|------|---------|-------|
| `node.ts` | `NodeSummarySchema`, `NodeSummary`, `NodeFrontmatterSchema`, `NodeFrontmatter` | 32 |
| `mastery.ts` | `MasteryThresholdSchema`, `MasteryThreshold` | 13 |
| `progress.ts` | `MasteryStateSchema`, `MasteryState`, `ProgressRecordSchema`, `ProgressRecord` | 18 |

**Total: 63 tests — 63 passing, 0 failing.**

### NodeSummarySchema (graph-display layer, ADR 002)

Fields: `id`, `title`, `nodeType` (MECHANIC|CONCEPTUAL), `race` (5 values), `prerequisites` (string[]).
The graph engine imports ONLY this type. NodeFrontmatterSchema extends it — divergence is a compile error.

### NodeFrontmatterSchema (full content schema)

Extends NodeSummarySchema with: `skillType` (macro|micro|mental), `difficulty` (beginner|intermediate|advanced), `tags` (string[]), `patchId` (z.enum(PATCH_IDS)), `patch_context` (non-empty string), `last_reviewed` (YYYY-MM-DD regex), `meta_volatile` (boolean), `citations` (array with required `applicationNote`).

### MasteryThresholdSchema

Fields: `nodeId`, `nodeType` (MECHANIC|CONCEPTUAL), `patchId` (z.enum(PATCH_IDS)), `thresholdDefinition` (z.record — open for Phase 7/8 extension).

### MasteryStateSchema + ProgressRecordSchema

MasteryStateSchema: `z.enum(["untouched","learning","mastered"])`.
ProgressRecordSchema: `userId`, `nodeId`, `patchId` (z.enum(PATCH_IDS)), `masteryState` (MasteryStateSchema), `lastUpdated` (z.string().datetime()).

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| MECHANIC and CONCEPTUAL are distinct first-class enum values (criterion 2) | PASSED — z.enum(["MECHANIC","CONCEPTUAL"]) on both NodeFrontmatterSchema and MasteryThresholdSchema |
| patch_context, last_reviewed, meta_volatile are required (criterion 3) | PASSED — all three are non-optional; 4 rejection tests confirm |
| patchId on node, threshold, and progress schemas (criterion 4) | PASSED — all three import PATCH_IDS from src/lib/patches |
| NodeSummary decoupled from full content (DATA-02) | PASSED — two distinct types, extend() relationship enforced at compile time |
| prerequisites accepts [] and string arrays (DATA-05) | PASSED — 2 tests confirm |
| No z.nativeEnum() or .superRefine() used | PASSED — Zod v4 idioms only |
| SPDX header GPL-3.0-or-later on line 1 of each .ts file | PASSED — all 6 files |
| npx vitest run src/schemas passes | PASSED — 63/63 |
| npm run typecheck exits 0 | PASSED |

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

Task 1 (node schema):
1. RED commit: `2887ad5 test(01-05): add failing tests for node schema (RED)` — test-only, 32 tests failing
2. GREEN commit: `d0b6910 feat(01-05): implement NodeSummarySchema and NodeFrontmatterSchema (GREEN)` — 32 tests passing

Task 2 (mastery + progress schemas):
1. RED commit: `c99276f test(01-05): add failing tests for mastery and progress schemas (RED)` — 31 tests failing
2. GREEN commit: `ae38b93 feat(01-05): implement MasteryThresholdSchema and ProgressRecordSchema (GREEN)` — 31 tests passing

Both tasks followed strict RED-before-GREEN ordering. Initial commit included both test and impl files together for Task 1 — corrected via `git reset --soft` to produce properly ordered separate commits.

## Known Stubs

None. All schemas are real (not stubs), patch-tagged, and fully validated.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The six files are pure schema definitions with no side effects. Trust boundary T-01-VAL (raw frontmatter → Zod parse) and T-01-PID (invalid patchId) from the plan's threat model are both mitigated by the implemented schemas.

## Self-Check: PASSED
