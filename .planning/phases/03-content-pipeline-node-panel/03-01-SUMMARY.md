---
phase: "03"
plan: "01"
subsystem: content-pipeline / data-layer
tags: [tanstack-query, test-scaffolds, query-client, wave-0, tdd-red]
requires: []
provides: [query-client-app-wide, wave-0-test-scaffolds]
affects: [src/routes/__root.tsx, src/lib/filter-utils.test.ts, src/lib/node-content-query.test.ts, src/schemas/node.test.ts]
tech_stack:
  added:
    - "@tanstack/react-query@^5.101.2 — panel content lazy-load data layer"
    - "jsdom@^29.1.1 — devDep enabling per-file // @vitest-environment jsdom for future React component tests"
  patterns:
    - "Module-scope QueryClient singleton — prevents re-creation on re-render"
    - "QueryClientProvider wraps {children} only; Scripts stays outside"
    - "Per-file jsdom opt-in directive (global env stays node for schema/logic suite)"
key_files:
  modified:
    - package.json — @tanstack/react-query + jsdom added
    - vitest.config.ts — jsdom opt-in directive documented in comment
    - src/routes/__root.tsx — QueryClient + QueryClientProvider wired
    - src/schemas/node.test.ts — CitationSchema import + 11 RED tests appended
  created:
    - src/lib/filter-utils.test.ts — 13 RED tests for matchesFilter + isFilterActive
    - src/lib/node-content-query.test.ts — 7 RED tests for nodeContentQueryOptions
decisions:
  - "QueryClient at module scope in __root.tsx (not inside component) — prevents re-creation"
  - "Scripts kept outside QueryClientProvider — emits <script> tags, not React components"
  - "Global vitest environment stays node; jsdom is per-file opt-in only"
  - "CitationSchema RED via non-export (undefined import) — clean failure without breaking existing tests"
metrics:
  duration: "6m"
  completed: "2026-06-29"
  tasks_completed: 3
  files_changed: 6
status: complete
---

# Phase 03 Plan 01: Wave 0 Foundation — QueryClient + RED Test Scaffolds Summary

**One-liner:** Installed `@tanstack/react-query`, wired a module-scope `QueryClient` via `QueryClientProvider` in the app root, and created three RED Wave 0 test scaffolds that downstream feature plans (03-02, 03-04, 03-05) will turn green.

---

## What Was Built

### Task 1 — @tanstack/react-query + jsdom install + vitest config update

- `@tanstack/react-query@^5.101.2` added to runtime dependencies.
- `jsdom@^29.1.1` added to devDependencies.
- `vitest.config.ts` global environment remains `node`; added comment block documenting the per-file `// @vitest-environment jsdom` opt-in directive for future React component tests.
- Existing 148 tests continued to pass after the install.

### Task 2 — QueryClient + QueryClientProvider in __root.tsx

- `QueryClient` + `QueryClientProvider` imported from `@tanstack/react-query`.
- `queryClient` created at module scope (5-minute default `staleTime`; node-content queries will override with `Infinity`).
- `{children}` wrapped in `<QueryClientProvider client={queryClient}>`.
- `<Scripts />` rendered outside the provider (emits raw `<script>` tags, not a React component tree).
- Inline comment documents Phase 7 dehydration deferral.
- `npx tsc --noEmit` reports zero errors in `__root.tsx`.

### Task 3 — RED Nyquist Test Scaffolds

Three test scaffold files created/extended for Wave 0:

**`src/lib/filter-utils.test.ts`** (new, RED — module does not exist yet)
- Tests `matchesFilter`: no-filter passthrough, title substring match, tag substring match, race/skillType/difficulty OR-within-facet, AND-across-facets, mastery-from-argument.
- Tests `isFilterActive`: false on empty query + empty facets; true when any input is active.
- Uses post-ADR-006 fixture shape (`TestNode` with `skillType` + `tags`).

**`src/lib/node-content-query.test.ts`** (new, RED — module does not exist yet)
- Tests `nodeContentQueryOptions`: `enabled: false` when `nodeId === null`, `enabled: true` otherwise; `queryKey` shape; `queryFn` returns node by known id; `queryFn` throws for unknown id.
- Uses `vi.mock("content-collections")` so `allNodes` is available in the Node test environment.

**`src/schemas/node.test.ts`** (extended — 11 new RED tests appended)
- `CitationSchema` added to imports (not yet exported → `undefined` at runtime → `TypeError: safeParse is not a function`).
- 11 new tests across three `describe` blocks: `kind: "science"` acceptance/rejection, `kind: "creator"` with optional `quote`, discriminator rejection for unknown/missing `kind`.
- All 32 pre-existing tests in the file continue to pass.

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` — no errors in `__root.tsx` | PASS |
| Existing 148 tests | PASS |
| `filter-utils.test.ts` — RED (module not found) | RED (expected) |
| `node-content-query.test.ts` — RED (module not found) | RED (expected) |
| 11 CitationSchema tests in `node.test.ts` — RED (CitationSchema undefined) | RED (expected) |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. No production stubs introduced in this plan. All scaffold files are test-only and explicitly RED by design.

---

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. `@tanstack/react-query` pre-approved in RESEARCH Package Legitimacy Audit (T-3-SC verdict: false positive on recent patch release; 58M wk downloads).

---

## Self-Check: PASSED

Files verified present:
- `src/lib/filter-utils.test.ts` — FOUND
- `src/lib/node-content-query.test.ts` — FOUND
- `src/schemas/node.test.ts` — FOUND (contains 'kind')

Commits verified:
- `75cb1a1` — chore(03-01): install @tanstack/react-query + jsdom
- `5c400ec` — feat(03-01): mount module-scope QueryClient via QueryClientProvider
- `ad0773f` — test(03-01): create RED Wave 0 test scaffolds
