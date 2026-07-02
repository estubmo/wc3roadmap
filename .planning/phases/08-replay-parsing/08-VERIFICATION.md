---
phase: 08-replay-parsing
verified: 2026-07-02T20:34:38Z
status: passed
score: 5/5 must-haves verified (REPLAY-03 deferred, not counted as a must-have failure)
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "The wc3v fork integration provides advanced analysis output (supply curves, precise expansion detection, compare-to-pro signals) as an additional analysis layer on top of w3gjs base signals (Success Criterion 4 / REPLAY-03)"
    addressed_in: "Phase 8.x (explicit user-approved descope, not a numbered roadmap phase yet)"
    evidence: "08-13-PLAN.md executed a faithful GO attempt (overriding the go/no-go spike's NO-GO) after explicit user instruction; hit an external-data wall (WC3 proprietary SLK-derived UnitBalance.json cost tables + per-map pathing grids, both gitignored by upstream wc3v and not derivable from .w3g bytes) documented in ADR 012 and 08-13-SUMMARY.md (status: descoped). REQUIREMENTS.md records REPLAY-03 as 'Descoped → 8.x'. This is a plan-designed D-07 descope valve, not a missed deliverable — the base mastery loop (REPLAY-01/02/04/05/06/07/08) ships complete with zero edits from the deferred layer."
---

# Phase 8: Replay Parsing Verification Report

**Phase Goal:** Deliver replay parsing for fine mechanical signals — w3gjs parser + semantic signal layer, manual upload + w3champions auto-pull, patch-aware mastery thresholds (REPLAY-01 through REPLAY-08).
**Verified:** 2026-07-02T20:34:38Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload a `.w3g` replay and get build-order/APM/eAPM/hero-timing/control-group/expansion-timing breakdown via w3gjs + the semantic signal layer | ✓ VERIFIED | `src/lib/replay-parser.ts` (parseReplay, sole w3gjs import site, opaque fail-safe error), `src/lib/replay-signals.ts` (deriveReplaySignals — buildOrder, eapm, controlGroupUsage, heroTiming, expansionTimingMs), `src/routes/replays.tsx` drag-drop uploader, `src/server/replay.ts` uploadReplayHandler. Real-replay checkpoint in 08-12 (user-approved) plus 517/517 automated tests passing (fresh run, this verification) |
| 2 | Feedback is actionable ("you did X at Y; target is Z"), never a bare stat dump | ✓ VERIFIED | `formatSignalLine()` in `src/routes/replays.tsx` renders every `ReplaySignalItem` as `actual` vs `target` tied to a node title; `detectReplaySignals`/`meetsReplayThreshold` (`replay-thresholds.ts`) emit `{actual, target, signal}` on every evaluated node (met or miss) — verified in `replay-thresholds.test.ts` and `replay.test.ts` |
| 3 | Signals meeting patch-aware thresholds auto-advance the MECHANIC node toward mastered; source labeled distinctly (`source: "replay"`), WC3 buildNumber stored alongside the result | ✓ VERIFIED | `writeMonotonicMax()` in `src/server/replay.ts` stamps `source: "replay"` (schema enum in `src/schemas/progress.ts` includes `"replay"`) and `patchId` server-side only on an actual raise (atomic SQL `setWhere` ordinal guard); `replayAnalysis.buildNumber` stored alongside `patchId` in the live DB (confirmed below). Roadmap prose says "replay-detected" — the shipped literal is `"replay"`, a paraphrase mismatch only, not a functional gap (distinct, non-conflated source label is what matters and is met) |
| 4 | wc3v fork integration provides advanced analysis (supply curves, precise expansion detection, compare-to-pro) as an additional layer (REPLAY-03) | ⏸ DEFERRED (intentional, user-approved) | See `deferred` in frontmatter. `docs/adr/012-wc3v-fork-integration.md` + `08-13-SUMMARY.md` (status: descoped) document a faithful GO attempt blocked by proprietary/gitignored WC3 data, not code. Base loop (Truths 1/2/3/5) verified fully isolated from this deferral (zero edits to replay-parser/replay-signals/replay-thresholds/server/replay.ts from 08-13) |
| 5 | Users can trigger w3champions auto-pull; parsed results cached by gameId so a replay is never re-parsed twice | ✓ VERIFIED | `pullReplaysHandler` in `src/server/replay.ts` — D-17 cache gate checks `replayAnalysis` by `gameId` before any download/parse; `usePullReplaysMutation` + "Pull recent replays" CTA in `src/routes/replays.tsx`. Live-DB table `replay_analysis` confirmed present (see Data Verification below) and its `gameId` unique index enforces the cache. Rate-limit handling is an opaque status bucket (`rate-limited`) with a retry toast — roadmap's "rate-limit confirmation via the w3champions API token" language does not match the (unauthenticated, public per ADR 011 Spike 2) upstream endpoint reality; functional intent (auto-pull works, rate limits handled gracefully, never re-parses) is fully met |

**Score:** 5/5 truths verified (Truth 4 counted as an accepted, evidenced deferral — not a failure — per explicit instruction and ADR 012/REQUIREMENTS.md documentation)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | wc3v advanced-analysis layer (REPLAY-03) | Phase 8.x | ADR 012, 08-13-SUMMARY.md (`status: descoped`), REQUIREMENTS.md (`REPLAY-03 | Phase 8 | Descoped → 8.x`) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/replay-parser.ts` | Sole w3gjs import site, opaque fail-safe parse wrapper | ✓ VERIFIED | Substantive (69 lines), wired into `src/server/replay.ts` via dynamic `import()`, `ReplayParseError` opaque on any failure |
| `src/lib/replay-signals.ts` | Pure semantic signal layer | ✓ VERIFIED | 221 lines, zero I/O imports (only `object-id-maps`), full signal derivation logic present and tested |
| `src/lib/replay-thresholds.ts` | Pure patch-aware threshold detector | ✓ VERIFIED | 237 lines, race-gated `buildOrderTiming` (08-12 fix present), report/advance `met` split present, tested |
| `src/lib/object-id-maps/index.ts` | Patch-versioned object-ID registry | ✓ VERIFIED | Version-1 table includes broadened opener set (`hrif`/`ohun`/`ucry`/`esen` — the 08-12 opener-coverage fix), `hasOwnProperty` adversarial-input guard present |
| `src/db/schema.ts` (`replayAnalysis`) | gameId-keyed global cache table | ✓ VERIFIED | Table defined with `gameId` unique index, `signals`/`patchId`/`buildNumber` columns; **live DB confirmed** to have the `replay_analysis` table (see Data-Flow Trace) |
| `src/schemas/node.ts` (`ReplayCriteriaSchema`) | Per-node replay-mastery criterion | ✓ VERIFIED | Discriminated union over 5 signals, field-for-field mirrored in `content-collections.ts` (confirmed identical) |
| `content/nodes/build-order-{human,orc,undead,nightelf}.mdx` | Four canonical race build-order MECHANIC nodes | ✓ VERIFIED | All 4 files present; content build produces **17 documents** (confirms the 08-10→08-12 night-elf YAML-drop fix — was silently 16 before the fix) |
| `src/server/replay.ts` | Server orchestration: upload/pull/read + monotonic-max write | ✓ VERIFIED | 676 lines, `uploadReplay`/`pullReplays`/`getReplayAnalysis` server fns, `writeMonotonicMax` atomic SQL guard, principal-keyed throughout |
| `src/hooks/useUploadReplayMutation.ts` / `usePullReplaysMutation.ts` | TanStack Query mutation hooks | ✓ VERIFIED | Both wired to `src/routes/replays.tsx`, both invalidate `replayKeys` + `progressKeys`, both drive `setRecentlyAdvanced` (D-05 pulse) |
| `src/routes/replays.tsx` | `/replays` route — uploader + pull CTA + report | ✓ VERIFIED | Drag-drop + click-to-browse, 4MB client cap, actionable per-signal report, sign-in gate |
| `docs/adr/011-replay-parse-architecture.md` | Parse-location decision + upload cap | ✓ VERIFIED | Context/Decision/Consequences/Alternatives/Related Decisions all present |
| `docs/adr/012-wc3v-fork-integration.md` | wc3v integration attempt + descope record | ✓ VERIFIED | Context/Decision/Path-forward/Alternatives all present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `replay-parser.ts` | `replay-signals.ts` | Type-only import of `ParserOutput`/`Player` | ✓ WIRED | `deriveReplaySignals` consumes typed output, no runtime w3gjs dependency in the pure layer |
| `replay-signals.ts` / `object-id-maps` | `replay-thresholds.ts` | `detectReplaySignals` consumes `ReplaySignals` + resolves via `objectIdMapVersionForPatch`/`resolveObjectId` | ✓ WIRED | Confirmed by direct read; race-gating fix present (`firstOpenerMs` requires `race` match) |
| `replay-thresholds.ts` | `server/replay.ts` | `analyzeAndWrite` calls `detectReplaySignals` then filters `.met` before `writeMonotonicMax` | ✓ WIRED | Report/advance split (08-12 fix) confirmed in source and covered by a passing test |
| `server/replay.ts` | `db/schema.ts` (`replayAnalysis`) | `db.query.replayAnalysis.findFirst` (cache read) + `db.insert(replayAnalysis)...onConflictDoNothing` (cache write) | ✓ WIRED | D-17 cache gate; live table confirmed present |
| `server/replay.ts` | `w3champions-client.ts` | `fetchReplayBytes(gameId)` + direct `fetch` to `/api/matches/search` and `/api/ladder/seasons` | ✓ WIRED | Player-scoped endpoint (08-12 fix, replacing the global-feed bug) confirmed in source + tested |
| `useUploadReplayMutation.ts` / `usePullReplaysMutation.ts` | `server/replay.ts` | Direct import of `uploadReplay`/`pullReplays` server fns | ✓ WIRED | Both hooks call the server fns and branch on `ReplayStatus` |
| `routes/replays.tsx` | mutation hooks | `useUploadReplayMutation()` / `usePullReplaysMutation()` + `onSuccess: setReport` | ✓ WIRED | Report state renders from mutation RESULT (not `getReplayAnalysis`, per documented 08-11/08-12 decision) |
| `server/replay.ts` | client bundle | Dynamic `import("#/lib/replay-parser")` inside handlers | ✓ WIRED (fix confirmed) | Production build's `.output/public` (client) contains no `w3gjs`/`W3GReplay`/`protobufjs` reference; server bundle (`_libs/w3gjs.mjs`) does — isolation confirmed by a fresh build in this verification |
| `GraphNode.tsx` | `app.css` faction variables | `getFactionTint(race)` → `--color-faction-{human,orc,nightelf,undead}` | ✓ WIRED | CSS variables defined in `src/styles/app.css`; race accent bar renders conditionally, agnostic nodes unaffected |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `replayAnalysis` cache table | `replay_analysis` rows | Live Neon Postgres (queried directly via `information_schema.tables` in this verification) | Yes — table physically exists in the live DB (`account, node_progress, quiz_progress, replay_analysis, session, user, verification, w3champions_sync`) | ✓ FLOWING |
| `content/nodes/build-order-*.mdx` | `allNodes` (content-collections) | `npm run build:content` re-run in this verification | Yes — 17 documents built (all 4 build-order nodes present, confirming the night-elf YAML fix holds) | ✓ FLOWING |
| `/replays` report | `report.signals` / `report.advanced` | `uploadReplay`/`pullReplays` mutation result (not a stub/static return) | Yes — traced through `detectReplaySignals` → `analyzeAndWrite` → `ReplayReport`, rendered directly (not from the always-null `getReplayAnalysis`) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes (existence + behavior proof, run once) | `npm run test -- --run` | 35 test files, 517 tests, all passed | ✓ PASS |
| Monotonic-max write never downgrades (state-transition invariant) | `npx vitest run src/server/replay.test.ts -t "does NOT downgrade an existing higher state"` | 1 passed | ✓ PASS |
| Content build includes all 4 race build-order nodes (regression check for the 08-12 night-elf silent-drop fix) | `npm run build:content` | "17 documents" (was silently 16 before the fix) | ✓ PASS |
| Content + pathway validation | `npm run validate` | "17 node(s) checked, pathway integrity verified" | ✓ PASS |
| TypeScript compiles cleanly | `npm run typecheck` | No errors | ✓ PASS |
| Production build succeeds; client bundle free of w3gjs | `npm run build` + grep `.output/public` | Build succeeded; no w3gjs/W3GReplay/protobufjs found in client output; `w3gjs.mjs` present only in `.output/server/_libs` | ✓ PASS |
| Live database has the `replay_analysis` cache table (D-17 physical existence, not just Drizzle types) | Direct Neon query via `@neondatabase/serverless` against `information_schema.tables` | `replay_analysis` present alongside `node_progress`, `w3champions_sync`, etc. | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REPLAY-01 | 08-01, 08-03 | Parse `.w3g` with w3gjs — build order, APM/eAPM, control-group/hotkey, hero/item timing, unit/upgrade timeline | ✓ SATISFIED | `replay-parser.ts` + `replay-signals.ts`; real-replay tested (fixture + live verification) |
| REPLAY-02 | 08-05 | Semantic-signal layer maps w3gjs output to meaningful WC3 events tied to mechanic nodes | ✓ SATISFIED | `deriveReplaySignals` produces typed `ReplaySignals`; consumed by `replay-thresholds.ts` |
| REPLAY-03 | 08-13 | wc3v fork advanced analysis (supply/economy curves, battle detection, compare-to-pro) | ⏸ DEFERRED (intentional) | ADR 012, 08-13-SUMMARY.md (`status: descoped`), REQUIREMENTS.md — external-data blocker, not code; explicit user decision |
| REPLAY-04 | 08-11, 08-12 | Manual `.w3g` upload | ✓ SATISFIED | `uploadReplay` server fn + `/replays` drag-drop uploader + `useUploadReplayMutation` |
| REPLAY-05 | 08-08, 08-11, 08-12 | Auto-pull from w3champions `/api/replays/{gameId}` | ✓ SATISFIED | `fetchReplayBytes` + `pullReplays` + player-scoped `/api/matches/search` fix (08-12) + live cache table |
| REPLAY-06 | 08-02, 08-07, 08-09, 08-10, 08-11 | Replay-derived signals auto-mark MECHANIC mastery against patch-aware thresholds | ✓ SATISFIED | `detectReplaySignals`/`meetsReplayThreshold` + `writeMonotonicMax`; race-gating fix (08-12) confirmed |
| REPLAY-07 | 08-05, 08-09, 08-11, 08-12 | Actionable feedback ("you did X at Y; target is Z") | ✓ SATISFIED | `formatSignalLine` in `/replays`; report/advance `met` split (08-12) confirmed with passing test |
| REPLAY-08 | 08-04, 08-06, 08-07 | Patch-version-aware object-ID maps and thresholds | ✓ SATISFIED | `object-id-maps/index.ts` keyed by `objectIdMapVersion`, never raw `buildNumber` directly |

No orphaned requirements — all 8 REPLAY-* IDs declared across the 13 plans' frontmatter match REQUIREMENTS.md's Phase 8 traceability table exactly (7 Complete + 1 Descoped → 8.x).

### Anti-Patterns Found

None. Scanned every file listed in the 13 plans' SUMMARY key-files sections for `TBD`/`FIXME`/`XXX` (debt markers) and `TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented" — zero hits. The only "PLACEHOLDER" mentions found (in `useUploadReplayMutation.ts`, `usePullReplaysMutation.ts`, `replays.tsx`) are explicitly-labeled toast/UI-copy placeholders deferred to a future UI-SPEC pass — not functional stubs; the underlying logic they annotate is fully implemented and tested.

### Human Verification Required

None outstanding. The phase's one genuinely human-dependent checkpoint (08-12 Task 3: real-replay verification against the user's actual w3champions replays) was already executed during phase execution — it surfaced and fixed all 7 real defects (client-bundle leak, opener coverage, report/advance split, race-gating, night-elf content node, auto-pull endpoint, race node coloring), all of which this verification independently re-confirmed present in the current source (not just claimed in SUMMARY.md). The 08-13 go/no-go checkpoint was also already resolved by explicit user decision (GO → descope after hitting the external-data wall), recorded in ADR 012.

### Gaps Summary

No blocking gaps. One minor, non-blocking test-coverage note (not scored as a gap): `src/lib/object-id-maps/index.test.ts` was not updated with explicit assertions for the four broadened opener codes (`hrif`, `ohun`, `ucry`, `esen`) added during the 08-12 real-replay fix — the codes are present and correct in the source (confirmed by direct read) and were validated against real replays per the 08-12 checkpoint, but the unit test file still only asserts the original narrower opener set (`hfoo`/`ogru`/`ugho`/`earc`). This is a test-thoroughness nit, not a functional or requirements gap — flagging for awareness, not as a blocker.

---

*Verified: 2026-07-02T20:34:38Z*
*Verifier: Claude (gsd-verifier)*
