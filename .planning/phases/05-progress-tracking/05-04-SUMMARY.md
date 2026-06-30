---
phase: "05-progress-tracking"
plan: "04"
subsystem: "progress-server"
status: complete
tags: ["server-functions", "progress", "auth", "drizzle", "tdd"]
completed_date: "2026-06-30"
duration: "6m"

dependency_graph:
  requires:
    - "05-02"  # MasteryStateSchema + ProgressRecordSchema
    - "05-03"  # nodeProgress DB table + uniqueIndex(userId,nodeId)
    - "04-03"  # authedServerFn + AuthedContext (auth-middleware.ts)
  provides:
    - getUserProgress        # read all progress for authenticated principal
    - setNodeMastery         # upsert one node's mastery state
    - mergeProgressOnSignIn  # fill-gaps merge of localStorage on first sign-in
  affects:
    - "05-05"  # local-progress.ts (triggers merge on first sign-in)
    - "05-06"  # useProgressMutation hook (calls setNodeMastery)
    - "05-07"  # MasteryControls component (calls setNodeMastery via hook)
    - "05-09"  # ProgressProvider (calls getUserProgress on mount)

tech_stack:
  added: []
  patterns:
    - "authedServerFn + .validator(Schema).handler(namedFn) — POST with typed validator chain"
    - "vi.doMock() + vi.resetModules() + dynamic import() — avoids vi.mock() TDZ with module-level variables"
    - "fill-gaps merge: Set of existing nodeIds + Array.filter — O(n) single-pass"
    - "onConflictDoUpdate target=[userId,nodeId] with sql`excluded.*` — atomic upsert"

key_files:
  created:
    - src/server/progress.ts        # three authedServerFn handlers + input schemas
    - src/server/progress.test.ts   # 11 tests covering principal-keying, stamping, fill-gaps
  modified: []

decisions:
  - "Used .validator(Schema).handler(namedFn) chain on authedServerFn POST fns for proper TanStack Start typing — avoids data:undefined type when no validator"
  - "Exported SetNodeMasteryInput + MergeProgressInput schemas for test-time type assertions"
  - "mergeProgressOnSignIn uses db.query.nodeProgress.findMany (not select) for consistency with getUserProgressHandler pattern"
  - "vi.doMock() chosen over vi.mock() for progress.test.ts to avoid temporal dead zone — module-level const captures in vi.mock() factories fail when hoisted"

metrics:
  duration: "6m"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_created: 2
  tests_added: 11
---

# Phase 05 Plan 04: Progress Server Functions Summary

Progress persistence deep module: three principal-keyed `authedServerFn` server functions (getUserProgress read, setNodeMastery upsert, mergeProgressOnSignIn fill-gaps) with server-stamped source + patchId and 11 behavioral unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing probe tests | 1819464 | src/server/progress.test.ts |
| 1 (GREEN) | Implement progress server fns | 81c4353 | src/server/progress.ts, src/server/progress.test.ts |

## What Was Built

### `src/server/progress.ts`

Three `authedServerFn` server functions forming the progress persistence deep module:

1. **`getUserProgressHandler` / `getUserProgress`** (GET): returns all `nodeProgress` rows for `context.principal.id`. No userId input — principal-keyed by construction (D-06).

2. **`setNodeMasteryHandler` / `setNodeMastery`** (POST + `.validator(SetNodeMasteryInput)`): upserts one node's mastery state. Server stamps:
   - `userId = context.principal.id` (D-06 — never from data)
   - `source = "manual"` (D-04 — hardcoded)
   - `patchId = CURRENT_PATCH.id` (D-05 — never from data)
   - Uses `onConflictDoUpdate({ target: [userId, nodeId] })` for atomic upsert

3. **`mergeProgressOnSignInHandler` / `mergeProgressOnSignIn`** (POST + `.validator(MergeProgressInput)`): fill-gaps merge of localStorage payload. Loads existing nodeIds for principal, inserts only gap records, returns `{ merged: count }`. Server records never overwritten (D-07).

Input schemas `SetNodeMasteryInput` and `MergeProgressInput` contain **no** `userId`, `source`, or `patchId` fields — these are exclusively server-side (T-05-04a/c).

### `src/server/progress.test.ts`

11 unit tests using `vi.doMock()` + `vi.resetModules()` + dynamic `import()` pattern:

| Test | Behavior Proven |
|------|----------------|
| getUserProgressHandler passes principal.id to eq() | D-06 principal-keying |
| setNodeMasteryHandler ignores forged userId in data | D-06 IDOR prevention |
| setNodeMasteryHandler stamps source="manual" | D-04 server-only source |
| setNodeMasteryHandler stamps patchId=CURRENT_PATCH.id | D-05 server stamping |
| setNodeMasteryHandler rejects "learning" | T-05-04b + D-03 enum |
| setNodeMasteryHandler rejects "MASTERED" (wrong case) | T-05-04b |
| mergeProgressOnSignInHandler inserts only gap nodes | D-07 fill-gaps |
| mergeProgressOnSignInHandler returns { merged: 0 } when no gaps | D-07 |
| mergeProgressOnSignInHandler rejects invalid masteryState | T-05-04d |

## Verification

```
npm test -- server/progress
→ 11 tests passed

npx tsc --noEmit
→ exit 0

npm test (full suite)
→ 262 tests passed
```

## Deviations from Plan

### Auto-fix: vi.mock() → vi.doMock() [Rule 3 — Blocking Issue]

**Found during:** Task 1 RED
**Issue:** vitest hoists `vi.mock()` calls before `const` declarations, causing temporal dead zone errors when factory closures reference module-level mock variables: `ReferenceError: Cannot access 'mockFindMany' before initialization`.
**Fix:** Replaced top-level `vi.mock()` (hoisted) with `vi.doMock()` (not hoisted) + `vi.resetModules()` in `beforeEach` + dynamic `await import("#/server/progress")` in each test. This is the recommended vitest pattern for tests requiring module-level mock variable access.
**Files modified:** `src/server/progress.test.ts`

### TDD Task Split: Tests written in Task 1, not Task 2

**Context:** Both tasks had `tdd="true"`. Task 1 created the implementation, Task 2 the tests. Following proper TDD, the test file was written first (Task 1 RED commit) with the full behavioral tests — this means Task 2's behavioral test requirements were satisfied by Task 1's TDD RED phase. Task 2 verification (`npm test -- server/progress`) confirmed all 11 tests pass.

### TypeScript Typing: .validator() chain

**Context:** Without `.validator(SetNodeMasteryInput)`, TanStack Start types `data` as `undefined` in the handler, causing TypeScript errors. Added `.validator(Schema)` to the exported server function chain. Handler parameter type remains `AuthedContext & { data: z.infer<typeof Schema> }` — compatible with the TanStack Start callback type via structural subtyping (contravariance: the called arg `{ context; data; serverFnMeta; method }` extends the handler's parameter `{ context; data }`). Not a plan deviation — plan specified Zod validation; `.validator()` is the correct TanStack Start mechanism.

## Known Stubs

None — all three server functions are fully wired to the real database and patch registry. No hardcoded empty values or mock data in the implementation.

## Threat Flags

No new security-relevant surface beyond what was in the plan's `<threat_model>`. All five STRIDE threats (T-05-04a through T-05-04e) are mitigated:
- IDOR: principal-keyed by construction (D-06) ✓
- Crafted masteryState: Zod parse rejects (T-05-04b) ✓
- Crafted patchId/source: server-stamped, never read from input (D-04/D-05) ✓
- localStorage poisoning: MergeProgressInput validates every record (T-05-04d) ✓
- Unauthenticated call: authMiddleware gates all handlers (D-11) ✓

## Self-Check: PASSED

- [x] `src/server/progress.ts` — exists, exports all required functions
- [x] `src/server/progress.test.ts` — exists, 11 tests passing
- [x] `.planning/phases/05-progress-tracking/05-04-SUMMARY.md` — this file
- [x] Commits 1819464, 81c4353 — confirmed in git log
- [x] `npm test -- server/progress` — 11/11 green
- [x] `npx tsc --noEmit` — exit 0
- [x] `npm test` (full suite) — 262/262 green
