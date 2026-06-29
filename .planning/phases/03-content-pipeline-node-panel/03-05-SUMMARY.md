---
phase: "03"
plan: "05"
subsystem: content-pipeline / query-layer
tags: [tanstack-query, queryOptions, node-content, lazy-load, graph-03, d-02, tdd-green]

requires:
  - phase: "03-01"
    provides: "RED scaffold test file node-content-query.test.ts"
  - phase: "03-02"
    provides: "mdxHowToApply transform output on allNodes entries; NodeFrontmatter base type"

provides:
  - "nodeContentQueryOptions(nodeId) factory — the single seam the panel uses to lazy-load node content"
  - "NodeFrontmatterWithMDX type — NodeFrontmatter extended with mdx + mdxHowToApply transform fields"

affects:
  - "03-06 (NodeDetailPanel) — imports nodeContentQueryOptions and NodeFrontmatterWithMDX"
  - "03-07 (NodePanelContent) — consumes query result typed as NodeFrontmatterWithMDX"

tech_stack:
  added: []
  patterns:
    - "nodeContentQueryOptions uses queryOptions from @tanstack/react-query — queryKey/enabled/staleTime/queryFn contract"
    - "async queryFn over in-memory allNodes — synchronous lookup returning Promise<NodeFrontmatterWithMDX>; throws for unknown ids"
    - "enabled: nodeId !== null guard — no query fires until a node is selected"
    - "NodeFrontmatterWithMDX intersection type: NodeFrontmatter & { mdx, mdxHowToApply } — panel reads transform fields without any cast"

key_files:
  created:
    - src/lib/node-content-query.ts
  modified:
    - src/lib/node-content-query.test.ts

key-decisions:
  - "queryFn made async (not synchronous) so Vitest rejects.toThrow() receives a rejected Promise rather than a synchronous throw; TanStack Query accepts both sync/async queryFns"
  - "allNodes cast as unknown as NodeFrontmatterWithMDX[] to pick up transform-added fields not in the generated d.ts type"
  - "Test cast updated from 'as { queryFn: () => unknown }' to 'as unknown as { queryFn: () => unknown }' for TypeScript compatibility with async queryFn"

patterns-established:
  - "Single-export query options factory: nodeContentQueryOptions is the ONLY thing the panel imports for content — no direct allNodes access outside this module"
  - "staleTime: Infinity for static build-time content — establishes the caching baseline before Phase 7 dynamic queries"

requirements-completed: [GRAPH-03]

coverage:
  - id: D1
    description: "nodeContentQueryOptions(null).enabled === false — no query fires when no node selected"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "src/lib/node-content-query.test.ts#nodeContentQueryOptions — enabled state > enabled is false when nodeId is null"
        status: pass
    human_judgment: false
  - id: D2
    description: "nodeContentQueryOptions(id).queryKey equals ['node-content', id]"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "src/lib/node-content-query.test.ts#nodeContentQueryOptions — queryKey"
        status: pass
    human_judgment: false
  - id: D3
    description: "queryFn returns the matching NodeFrontmatterWithMDX for a known id"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "src/lib/node-content-query.test.ts#nodeContentQueryOptions — queryFn > queryFn returns the node object for a known node id"
        status: pass
    human_judgment: false
  - id: D4
    description: "queryFn throws / rejects for an unknown node id (T-3-06 mitigation)"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "src/lib/node-content-query.test.ts#nodeContentQueryOptions — queryFn > queryFn throws for an unknown node id"
        status: pass
    human_judgment: false
  - id: D5
    description: "NodeFrontmatterWithMDX type exported — covers mdx + mdxHowToApply fields for panel consumption"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit — zero errors in src/lib/node-content-query.ts"
        status: pass
    human_judgment: false

duration: 2min
completed: "2026-06-29"
status: complete
---

# Phase 03 Plan 05: nodeContentQueryOptions Lazy-Load Data Layer Summary

**TanStack Query options factory over in-memory allNodes — async queryFn with null guard, Infinity staleTime, and NodeFrontmatterWithMDX intersection type; 6/6 RED scaffold tests now GREEN.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-29T11:31:39Z
- **Completed:** 2026-06-29T11:34:11Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `src/lib/node-content-query.ts` — `nodeContentQueryOptions(nodeId: string | null)` factory as the single seam between the panel and content-collections
- Exported `NodeFrontmatterWithMDX` type (`NodeFrontmatter & { mdx: string; mdxHowToApply: string }`) so panel components read transform-added fields without `any` cast
- Turned all 6 RED scaffold tests from plan 03-01 GREEN with zero TypeScript errors

## Task Commits

1. **Task 1: Implement nodeContentQueryOptions(id) over allNodes** — `b814a04` (feat)

## Files Created/Modified

- `src/lib/node-content-query.ts` — Created: queryOptions factory with enabled/queryKey/staleTime/queryFn; NodeFrontmatterWithMDX type
- `src/lib/node-content-query.test.ts` — Modified: cast updated from `as { queryFn }` to `as unknown as { queryFn }` for async compatibility; comment corrected

## Decisions Made

- **async queryFn:** The test scaffold uses `rejects.toThrow()` which requires a rejected Promise. Made queryFn async so synchronous throws become rejected Promises. TanStack Query supports both sync and async queryFns — no behavior change for callers.
- **Double cast pattern:** `allNodes as unknown as NodeFrontmatterWithMDX[]` used because the generated `.content-collections/generated/index.d.ts` types `allNodes` as `Array<Node>` (the transform output type from content-collections, which includes mdx/mdxHowToApply at runtime but TypeScript doesn't know this statically). The double cast is the documented approach for this pattern.
- **Test cast fix:** Updated test's `opts as { queryFn }` to `opts as unknown as { queryFn }` — the `queryOptions` return type is complex (OmitKeyof<UseQueryOptions<...>>...) and doesn't naturally overlap with the simple cast target. Double cast is correct and minimal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] async queryFn required by test's rejects.toThrow()**
- **Found during:** Task 1 (first test run)
- **Issue:** Plan and test comment both said "synchronous queryFn", but `rejects.toThrow()` in Vitest requires a rejected Promise — synchronous throws propagate out of the `.rejects` mechanism and fail the test unexpectedly
- **Fix:** Changed `queryFn: (): NodeFrontmatterWithMDX` to `queryFn: async (): Promise<NodeFrontmatterWithMDX>`; updated test cast to `as unknown as { queryFn: () => unknown }` to resolve resulting TS overlap error
- **Files modified:** src/lib/node-content-query.ts, src/lib/node-content-query.test.ts
- **Verification:** 6/6 tests GREEN; `tsc --noEmit` clean
- **Committed in:** b814a04

---

**Total deviations:** 1 auto-fixed (Rule 1 — async/sync test contract mismatch)
**Impact on plan:** Single targeted fix. No scope creep. queryFn semantics unchanged for TanStack Query callers — async vs sync is transparent.

## Issues Encountered

None beyond the async/sync deviation documented above.

## Known Stubs

None. `nodeContentQueryOptions` is fully implemented — panel components can call it immediately in plans 03-06 through 03-09.

## Threat Flags

None. No new network endpoints, auth paths, or user-supplied content paths. T-3-06 (unknown-id DoS) is mitigated — `queryFn` throws `Node not found: <id>` for unknown ids, surfacing as a query error state in the panel rather than returning undefined and rendering a broken panel.

## Next Phase Readiness

- `nodeContentQueryOptions` ready for use in `NodeDetailPanel` (plan 03-06)
- `NodeFrontmatterWithMDX` type exported for `NodePanelContent` (plan 03-07), `CitationList` (plan 03-08), `ProWisdomCallout` (plan 03-09)
- QueryClientProvider already mounted in `__root.tsx` (plan 03-01 Wave 0 setup) — no additional setup required

---
*Phase: 03-content-pipeline-node-panel*
*Completed: 2026-06-29*
