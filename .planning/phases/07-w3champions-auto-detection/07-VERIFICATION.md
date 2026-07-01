---
phase: 07-w3champions-auto-detection
verified: 2026-07-01T18:41:08Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Log in, open the profile dropdown, click 'Sync with w3champions', observe the 'Last synced Xm ago' indicator update"
    expected: "The sync action is present in the signed-in dropdown, always clickable (no disabled/countdown), and the last-synced label refreshes after a completed sync — no separate linking step (BattleTag comes from the session)"
    why_human: "Live UI + real/mocked network round-trip; visual + interaction — not unit-assertable (VALIDATION.md Manual-Only, AUTO-01/criterion 1)"

  - test: "Trigger a sync that qualifies >=1 MECHANIC node, return to the graph, confirm the freshly-advanced node pulses and carries a label distinct from manual check-off / quiz mastery"
    expected: "Advanced nodes show the one-shot Motion pulse and the panel badge reads 'In progress · from w3champions' with a distinct canvas marker, visibly different from manual and quiz sources"
    why_human: "Visual/animation (Motion) rendering and perceived distinctness are not unit-assertable (VALIDATION.md Manual-Only, D-07/D-09/criterion 2)"
---

# Phase 7: w3champions Auto-Detection Verification Report

**Phase Goal:** Authenticated users can link their w3champions ladder data and have coarse signals (MMR tier, games volume, matchup W/L trends) auto-advance eligible MECHANIC nodes; the sync is user-triggered, rate-limit-respecting, and never blocks manual tracking.
**Verified:** 2026-07-01T18:41:08Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Logged-in user triggers "Sync with w3champions" from profile, sees "Last synced Xm ago"; uses session BattleTag, no separate linking step | ✓ VERIFIED (mechanism) | `SyncW3championsButton` mounted in `UserDropdown.tsx:145` inside `DropdownMenuContent`; `formatLastSynced()` renders "Last synced Xm ago" from the `syncStatus` query; server fn reads `principal.battleTag` only (no client channel). Visual/interaction flow → human UAT #1 |
| 2 | After successful sync, qualifying MECHANIC nodes auto-advance, labeled auto-detected, visible distinct from manual | ✓ VERIFIED (mechanism) | Server stamps `source:"auto"`, `masteryState:"in-progress"` (w3champions.ts:179-181); `MasteryBadge` renders "In progress · from w3champions" for `source==="auto"` (line 59); `GraphNode` renders distinct `◈` marker + pulse (lines 277,194). Visual distinctness → human UAT #2 |
| 3 | Triggering sync twice within TTL returns cached data, no second API call (staleTime + DB TTL) | ✓ VERIFIED | Behavioral test "TTL: two back-to-back syncs make exactly ONE upstream fetch" passes; DB `w3championsSync.lastSyncedAt` gate skips fetch within `SYNC_TTL_MS`; `staleTime: SYNC_TTL_MS` on the status query |
| 4 | User with no data / failed sync / who skips can still track manually + take quizzes | ✓ VERIFIED | Behavioral tests: unreachable/no-data return `{advanced:[]}` with ZERO nodeProgress inserts; hook adds no code path disabling manual/quiz mutations |
| 5 | CONCEPTUAL nodes never advance — `detectMasterySignals` emits MECHANIC-only | ✓ VERIFIED | Pure test "CONCEPTUAL nodes never emit" + server test "ceiling: a CONCEPTUAL node never advances (AUTO-03)" both pass; MECHANIC-filter runs first in the filter chain |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

Note on criterion 5 wording: the roadmap text says `nodeType === 'mechanical'`; the project's canonical enum (`src/schemas/node.ts:56`) is `z.enum(["MECHANIC","CONCEPTUAL"])`. The implementation filters on `"MECHANIC"` — intent satisfied, roadmap wording is informal, not a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/mmr-tiers.ts` | Ordinal tier registry (TIER_IDS/tierForMmr/tierIndex) | ✓ VERIFIED | 81 lines; exports present; consumed by node.ts, detect, client |
| `src/db/schema.ts` (w3championsSync) | Single-row cache table, uniqueIndex(userId), FK cascade | ✓ VERIFIED | Table + relations at 495-542; nullable mmrTier, non-null gamesPlayed/lastSyncedAt, `w3c_sync_user_unique` |
| `src/schemas/node.ts` (autoDetect) | Discriminated-union autoDetect on NodeFrontmatterSchema | ✓ VERIFIED | AutoDetectCriteriaSchema (251), z.enum(TIER_IDS) (256), `autoDetect` optional field (348) |
| `content-collections.ts` | Field-for-field autoDetect mirror | ✓ VERIFIED | Identical discriminated union (114-118), imports TIER_IDS |
| `src/lib/detect-mastery-signals.ts` | Pure zero-I/O eligibility fn | ✓ VERIFIED | Only import is `./mmr-tiers`; MECHANIC→autoDetect→untouched→threshold filter chain |
| `src/lib/w3champions-client.ts` | fetch client + D-10 classifier + SSRF-guarded base URL | ✓ VERIFIED | Hardcoded W3C_BASE_URL, encodeURIComponent, mapGateway, full classifier |
| `src/lib/w3champions-keys.ts` | w3championsKeys + SYNC_TTL_MS | ✓ VERIFIED | SYNC_TTL_MS = 15*60*1000 (line 56) |
| `src/server/w3champions.ts` | Principal-keyed sync + status server fns | ✓ VERIFIED | authMiddleware, TTL gate, additive `onConflictDoNothing`, server-stamped fields |
| `src/lib/graph-store.ts` | recentlyAdvancedNodeIds + setRecentlyAdvanced | ✓ VERIFIED | Slice at 243/255/332-335 |
| `src/hooks/useSyncW3championsMutation.ts` | Mutation, D-07 pulse, both invalidations | ✓ VERIFIED | setRecentlyAdvanced onSuccess; invalidates syncStatus + progress on settle |
| `src/components/profile/SyncW3championsButton.tsx` | Always-live button + last-synced | ✓ VERIFIED | No disabled/countdown; staleTime: SYNC_TTL_MS |
| `src/components/auth/UserDropdown.tsx` | Sync button mounted | ✓ VERIFIED | Imported + rendered above Sign out |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| TIER_IDS (mmr-tiers) | node.ts + content-collections | z.enum(TIER_IDS) | ✓ WIRED |
| tierIndex | detect-mastery-signals | ordinal mmrTier gte | ✓ WIRED |
| tierForMmr | w3champions-client | mmrTier derivation | ✓ WIRED |
| context.principal | w3champions.ts | battleTag/gateway/id (no client channel) | ✓ WIRED |
| w3championsSync + SYNC_TTL_MS | w3champions.ts | TTL gate | ✓ WIRED |
| fetchW3championsSignals | w3champions.ts | TTL-miss fetch | ✓ WIRED |
| detectMasterySignals | w3champions.ts | candidates from allNodes + existing | ✓ WIRED |
| syncW3champions / getW3championsSyncStatus | hook + button | mutation + status query | ✓ WIRED |
| setRecentlyAdvanced | hook onSuccess | D-07 pulse trigger | ✓ WIRED |
| SyncW3championsButton | UserDropdown | DropdownMenuContent mount | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-7 unit/server tests | `npx vitest run` (5 files) | 5 files / 86 tests passed | ✓ PASS |
| TTL single-fetch invariant | server test "two back-to-back syncs ... ONE upstream fetch" | pass | ✓ PASS |
| In-progress ceiling | server test "every insert masteryState 'in-progress'" | pass | ✓ PASS |
| Monotonic (no DoUpdate on auto path) | server test "NO onConflictDoUpdate on nodeProgress" | pass | ✓ PASS |
| CONCEPTUAL never advances | pure + server tests | pass | ✓ PASS |
| Failure-safe zero-write | tests unreachable/no-data → 0 inserts | pass | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTO-01 | 07-06, 07-07, 07-08 | Link w3champions via session BattleTag | ✓ SATISFIED | Principal-keyed sync, dropdown mount, no separate linking |
| AUTO-02 | 07-01, 07-04, 07-05, 07-06 | Coarse signals auto-advance MECHANIC nodes | ✓ SATISFIED | mmr-tiers + autoDetect schema + detect + client |
| AUTO-03 | 07-05, 07-07 | Only MECHANIC, never CONCEPTUAL | ✓ SATISFIED | MECHANIC-filter, unit + server tests |
| AUTO-04 | 07-02, 07-06, 07-07 | Cached, rate-limit-respecting | ✓ SATISFIED | DB TTL gate + staleTime mirror, TTL test |
| AUTO-05 | 07-07, 07-08 | Enhances but never blocks manual/quiz | ✓ SATISFIED | Zero-write failure buckets, additive-only hook |

No orphaned requirements — all five IDs mapped to plans and implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/HACK debt markers in any phase file | — | — |

Placeholder copy/markers in UI files are intentional and JSDoc-noted as deferred to the UI-SPEC pass (per plan objectives) — mechanism is fully wired, not stubbed. The only `onConflictDoUpdate` in the sync server fn is correctly scoped to the `w3champions_sync` cache row; the nodeProgress auto path uses `onConflictDoNothing` (verified).

### Human Verification Required

Two visual/interaction checks the plan explicitly scoped as Manual-Only (VALIDATION.md). The underlying mechanisms are code-verified and behaviorally tested; these confirm in-browser rendering only.

1. **Sync action + last-synced indicator** — Log in, open the profile dropdown, click "Sync with w3champions", confirm "Last synced Xm ago" updates. Expected: always-live action, no separate linking step. (AUTO-01/criterion 1)
2. **Auto-advance visual distinctness** — Trigger a qualifying sync, return to the graph, confirm freshly-advanced nodes pulse and carry a label distinct from manual/quiz. (D-07/D-09/criterion 2)

### Gaps Summary

No gaps. All 5 roadmap success criteria have verified mechanisms; the three behavior-dependent invariants (TTL single-fetch, failure-safe zero-write, CONCEPTUAL-never-advance) are each exercised by a passing named behavioral test. All 5 requirement IDs are implemented and accounted for. The `[BLOCKING]` Neon push (07-02) is reported applied and the schema smoke test passes; the live-DB state is not independently re-checkable here but the code contract and idempotent-push claim are consistent. `[ASSUMED]` MMR cutoffs and the kr→America gateway mapping are documented one-file recalibration points that degrade gracefully — not gaps.

Status is `human_needed` (not `passed`) solely because two visual/UX confirmations remain — these were deliberately deferred to end-of-phase UAT by the plans, not because any mechanism is missing.

---

_Verified: 2026-07-01T18:41:08Z_
_Verifier: Claude (gsd-verifier)_
