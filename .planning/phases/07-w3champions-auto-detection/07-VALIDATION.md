---
phase: 7
slug: w3champions-auto-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 07-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run <touched test file>` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~few seconds (unit-only; `fetch` + DB mocked) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched test file>`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. This map is keyed by requirement/decision until then.

| Requirement / Decision | Behavior | Test Type | Automated Command | File Exists |
|------------------------|----------|-----------|-------------------|-------------|
| AUTO-03 / criterion 5 | `detectMasterySignals` only emits for `nodeType === "MECHANIC"`; CONCEPTUAL never advances | unit | `vitest run src/lib/detect-mastery-signals.test.ts -t "CONCEPTUAL"` | ❌ W0 |
| D-05 | Auto-detect never emits for a node that already has a progress row (untouched-only) | unit | `vitest run src/lib/detect-mastery-signals.test.ts -t "untouched"` | ❌ W0 |
| D-06 | Auto is monotonic — a later sync with a lower/absent signal never removes a prior auto-advance | unit | `vitest run src/server/w3champions.test.ts -t "monotonic"` | ❌ W0 |
| D-04 | Auto write never sets `masteryState: "mastered"` (ceiling = `in-progress`) | unit | `vitest run src/server/w3champions.test.ts -t "ceiling"` | ❌ W0 |
| D-10 | Status-code → bucket classifier maps 200/empty/404/network-error/429 correctly | unit | `vitest run src/lib/w3champions-client.test.ts` | ❌ W0 |
| AUTO-04 / criterion 3 | Two syncs within TTL make exactly one upstream `fetch` call | unit (mock fetch + DB) | `vitest run src/server/w3champions.test.ts -t "TTL"` | ❌ W0 |
| ADR 007 | `syncW3champions` handler is principal-keyed — no `userId` client-input channel | unit | `vitest run src/server/w3champions.test.ts -t "authorization"` | ❌ W0 |
| MMR tier ordinal | `tierIndex`/`tierForMmr` correctly order all tiers for `gte` comparison | unit | `vitest run src/lib/mmr-tiers.test.ts` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/detect-mastery-signals.test.ts` — covers AUTO-03, D-05
- [ ] `src/lib/mmr-tiers.test.ts` — covers tier ordering/lookup correctness
- [ ] `src/lib/w3champions-client.test.ts` — covers D-10 status→bucket classifier (mock `fetch`; assert bucket for 200/`[]`/404/network-throw/429)
- [ ] `src/server/w3champions.test.ts` — covers D-04, D-06, AUTO-04 (TTL), authorization (mirror `src/server/quiz.test.ts` / `src/server/progress.test.ts` `vi.doMock`/`resetModules` conventions)

*No framework install needed — Vitest already configured and used identically by every prior phase's server-fn tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Sync with w3champions" button + "Last synced Xm ago" renders on profile and reflects a real sync | AUTO-01 / criterion 1 | Live UI + real (or mocked) network round-trip; visual | Log in, open profile, click Sync, observe timestamp updates |
| Newly auto-advanced nodes pulse/highlight on the graph and carry a distinct "from w3champions" label | D-07 / D-09 / criterion 2 | Visual/animation (Motion) — not unit-assertable | Trigger a sync that qualifies ≥1 node, return to graph, confirm highlight + label distinct from manual/quiz |
| 0-node and failure/rate-limit messages read as reassuring, not broken | D-08 / D-10 | Copy/UX judgement | Force each outcome (new BattleTag, offline, cached), read messages |

*Exact UI copy and marker styling are deferred to a UI pass (CONTEXT.md); these manual checks validate presence + distinctness, not final polish.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
