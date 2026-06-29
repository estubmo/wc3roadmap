---
phase: 03-content-pipeline-node-panel
plan: "03"
subsystem: graph-schema
tags: [schema, adr, graph-projection, filter-search]
dependency_graph:
  requires: ["03-01"]
  provides: ["skillType+tags on GraphDisplayNode", "ADR-006", "loader projection"]
  affects: ["03-09 (filter bar)", "03-07 (filter-utils)", "03-08 (graph-store filter state)"]
tech_stack:
  added: []
  patterns: ["TDD red-green", "explicit-projection", "ADR-per-boundary-extension"]
key_files:
  created:
    - docs/adr/006-graph-display-node-skilltype-tags.md
  modified:
    - src/schemas/graph.ts
    - src/schemas/graph.test.ts
    - src/lib/graph-layout.test.ts
    - src/routes/index.tsx
decisions:
  - "GraphDisplayNodeSchema extended with skillType + tags per ADR-006 (D-11, GRAPH-04)"
  - "Loader projection remains explicit field-by-field — no ...n spread (ADR-002 rule)"
  - "ADR-005 rule maintained: any further GraphDisplayNode field requires a new ADR"
metrics:
  duration: "5 minutes"
  completed: "2026-06-29"
  tasks_completed: 3
  files_modified: 5
status: complete
---

# Phase 03 Plan 03: GraphDisplayNode skillType + Tags Projection Summary

**One-liner:** Extended GraphDisplayNodeSchema with skillType (macro/micro/mental) and tags (string[]) via explicit TDD and ADR-006.

## What Was Built

Extended the `GraphDisplayNode` schema (the content/graph boundary contract) with two fields required for GRAPH-04 search and filter:

- `skillType: z.enum(["macro", "micro", "mental"])` — enables filtering nodes by cognitive/physical demand type
- `tags: z.array(z.string())` — enables free-text tag search

The extension followed the ADR-005 rule (every new field on `GraphDisplayNode` requires a dedicated ADR). ADR-006 was authored to record the rationale, fields, and maintained rule. The route loader's explicit projection was updated to pass both fields through to the graph layer, preserving the ADR-002 content/graph decoupling (no `...n` spread).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend GraphDisplayNodeSchema with skillType + tags (TDD) | 93e2b9e (RED), e12a378 (GREEN) | src/schemas/graph.ts, src/schemas/graph.test.ts, src/lib/graph-layout.test.ts |
| 2 | Author ADR-006 | df73064 | docs/adr/006-graph-display-node-skilltype-tags.md |
| 3 | Project skillType + tags in route loader | 5108bf8 | src/routes/index.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated validGraphNode fixture in graph.test.ts**
- **Found during:** Task 1 GREEN phase
- **Issue:** The existing `validGraphNode` fixture (`{...validSummary, difficulty: "beginner"}`) no longer satisfied the extended schema; 5 acceptance tests failed after the schema change
- **Fix:** Added `skillType: "macro" as const` and `tags: [] as string[]` to the `validGraphNode` fixture so it remains a fully valid `GraphDisplayNode`
- **Files modified:** src/schemas/graph.test.ts
- **Commit:** e12a378 (bundled with GREEN phase)

**2. [Rule 1 - Bug] Updated GraphDisplayNode fixtures in graph-layout.test.ts**
- **Found during:** Task 1 GREEN phase — `npx tsc --noEmit` revealed TS2739 errors
- **Issue:** Four fixture objects in `graph-layout.test.ts` were typed as `GraphDisplayNode[]` but were missing the new required fields `skillType` and `tags`
- **Fix:** Added `skillType` and `tags` to each of the four fixture nodes (a, b, c, d)
- **Files modified:** src/lib/graph-layout.test.ts
- **Commit:** e12a378 (bundled with GREEN phase)

## Known Stubs

None — this plan is pure schema/type/ADR work with no UI rendering.

## Threat Surface Scan

No new network endpoints, auth paths, or trust-boundary surface introduced. The loader projection change is additive (two more fields projected through the existing explicit safeParse boundary). Schema `safeParse` continues to strip any extra fields — T-3-04 mitigation in place.

## Self-Check: PASSED

- [x] `docs/adr/006-graph-display-node-skilltype-tags.md` exists — FOUND
- [x] `src/schemas/graph.ts` extended with skillType + tags — FOUND
- [x] `src/routes/index.tsx` loader updated with explicit projection — FOUND
- [x] `npx vitest run src/schemas/graph.test.ts` — 22/22 tests passed
- [x] `npx tsc --noEmit` — clean (no errors in graph.ts or index.tsx)
- [x] ADR-006 Status: Accepted, documents both fields and maintains ADR-005 rule
- [x] No `...n` spread in loader projection
- [x] Commits: 93e2b9e (test RED), e12a378 (feat GREEN), df73064 (docs ADR), 5108bf8 (feat loader)
