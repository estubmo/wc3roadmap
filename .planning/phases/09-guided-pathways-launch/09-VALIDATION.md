---
phase: 9
slug: guided-pathways-launch
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 [VERIFIED: package.json] |
| **Config file** | `vitest.config.ts` (node environment; per-file `// @vitest-environment jsdom` for DOM tests; NO `#/` alias resolver — new `src/lib/*.test.ts` + `scripts/*.test.ts` must use RELATIVE imports) |
| **Quick run command** | `npx vitest run src/lib/pathway-progress.test.ts src/lib/staleness.test.ts scripts/validate-launch-gate.test.ts` |
| **Full suite command** | `npm run test` (`vitest run`) |
| **Content validation** | `npm run validate` (per-PR, launch gate NOT enforced) · `LAUNCH_GATE=1 npm run validate:launch` (deploy gate, enforces ≥25 / pathway-steps / audit-trail) |
| **Estimated runtime** | ~10-20 seconds (pure-function + component suite; no network, no DB) |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the file(s) touched (e.g. `npx vitest run src/lib/pathway-progress.test.ts`).
- **After every plan wave:** Run `npm run test` (full suite) + `npm run validate` (content CI, still green with drafts).
- **Before `/gsd-verify-work`:** Full suite green + `npm run validate` green; `LAUNCH_GATE=1 npm run validate:launch` reports the expected shortfall until the content workstream flips ≥25 nodes (D-11 — NOT a code blocker).
- **Max feedback latency:** ~20 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | PATH-04 | T-09-01 | N/A (pure fn) | unit (RED) | `npx vitest run src/lib/pathway-progress.test.ts` | ❌ W0 (created in-task) | ⬜ pending |
| 9-01-02 | 01 | 1 | PATH-04 | T-09-01 | N/A | unit (GREEN) | `npx vitest run src/lib/pathway-progress.test.ts` | ✅ after 9-01-01 | ⬜ pending |
| 9-02-01 | 02 | 1 | CONT-05 | T-09-02 | N/A (pure fn) | unit (RED) | `npx vitest run src/lib/staleness.test.ts` | ❌ W0 (created in-task) | ⬜ pending |
| 9-02-02 | 02 | 1 | CONT-05 | T-09-02 | N/A | unit (GREEN) | `npx vitest run src/lib/staleness.test.ts` | ✅ after 9-02-01 | ⬜ pending |
| 9-03-01 | 03 | 1 | CONT-04/05 | T-09-03 | required launch_ready + audit trail | schema/build | `grep launch_ready + auditNote` (both files) | ✅ | ⬜ pending |
| 9-03-02 | 03 | 1 | CONT-04 | T-09-03 | no unaudited launch | build | `npm run build:content` | ✅ | ⬜ pending |
| 9-04-01 | 04 | 1 | CONT-05 | T-09-04 | derived boolean only crosses boundary | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 9-04-02 | 04 | 1 | CONT-05 | T-09-04 | ADR-gated widening | doc | `test -f docs/adr/013-*.md` | ✅ | ⬜ pending |
| 9-05-01 | 05 | 1 | PATH-03 | T-09-05 | first-class 404 | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 9-05-02 | 05 | 1 | PATH-03 | T-09-05 | one TooltipProvider ancestor | type | `grep TooltipProvider/notFoundComponent/og:title` + `tsc` | ✅ | ⬜ pending |
| 9-06-01 | 06 | 1 | PATH-03 | T-09-06 | accurate privacy copy | type | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 9-07-01 | 07 | 1 | PATH-03 | T-09-07 | try/catch localStorage, no SSR read | type | `grep wc3rm:pathway-intro-seen/useEffect` + `tsc` | ✅ | ⬜ pending |
| 9-08-01 | 08 | 2 | CONT-04/PATH-02 | T-09-08 | N/A (pure fn) | unit (RED) | `npx vitest run scripts/validate-launch-gate.test.ts` | ❌ W0 (created in-task) | ⬜ pending |
| 9-08-02 | 08 | 2 | CONT-04/PATH-02 | T-09-08 | N/A | unit (GREEN) | `npx vitest run scripts/validate-launch-gate.test.ts` | ✅ after 9-08-01 | ⬜ pending |
| 9-08-03 | 08 | 2 | CONT-04/05 | T-09-08 | deploy gate blocks unaudited launch | integration | `npm run validate` + grep validate:launch/LAUNCH_GATE | ✅ | ⬜ pending |
| 9-09-01 | 09 | 2 | PATH-04 | T-09-09 | no fanfare (PROG-05) | type/grep | `grep progressbar + no totalNodes` + `tsc` | ✅ | ⬜ pending |
| 9-09-02 | 09 | 2 | PATH-01/04 | T-09-09 | transient data, not schema | type/suite | `grep computePathwayProgress` + `tsc` + `npm run test` | ✅ | ⬜ pending |
| 9-10-01 | 10 | 2 | CONT-04 | T-09-10 | prod-gated draft exclusion | type | `grep isStale/import.meta.env.PROD/launch_ready` + `tsc` | ✅ | ⬜ pending |
| 9-10-02 | 10 | 2 | PATH-03 | T-09-10 | client-only overlay mount | type | `grep PathwayIntroOverlay` + `tsc` | ✅ | ⬜ pending |
| 9-11-01 | 11 | 3 | PATH-01/CONT-05 | T-09-11 | aria on markers | type | `grep stepIndex/Clock` + `tsc` | ✅ | ⬜ pending |
| 9-11-02 | 11 | 3 | PATH-01 | T-09-11 | entrance-only (no loop) | type/suite | `grep isNextStep/ChevronDown` + `tsc` + `npm run test` | ✅ | ⬜ pending |
| 9-12-01 | 12 | 3 | CONT-05 | T-09-12 | touch-accessible tooltip | type/suite | `grep isStale/Unreviewed/Tooltip` + `tsc` + `npm run test` | ✅ | ⬜ pending |
| 9-13-01 | 13 | 4 | all | T-09-13 | domain language current | doc | `grep launch_ready/staleness/next step CONTEXT.md` | ✅ | ⬜ pending |
| 9-13-02 | 13 | 4 | all | T-09-13 | deploy gated on audited content | suite + human | `npm run test && npm run validate` + human-check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Continuity:** Every task carries an `<automated>` verify (grep/tsc/vitest/build). No run of 3 consecutive tasks lacks automated verification. The three pure-function test files are created as the RED task inside their own plans (9-01-01, 9-02-01, 9-08-01) — Wave 0 is embedded, not a separate plan.

---

## Wave 0 Requirements

Wave 0 test scaffolds are created as the first (RED) task of the plan that owns each pure module — no separate Wave 0 plan is needed because Vitest is already fully wired for colocated `*.test.ts`:

- [ ] `src/lib/pathway-progress.test.ts` — created in 9-01-01 (covers PATH-04)
- [ ] `src/lib/staleness.test.ts` — created in 9-02-01 (covers the D-06 staleness predicate)
- [ ] `scripts/validate-launch-gate.test.ts` — created in 9-08-01 (covers CONT-04 count gate + PATH-02 pathway cross-check + CONT-05 audit-trail)
- [x] No new test framework/config install needed — Vitest already runs `src/**/*.test.{ts,tsx}` + `scripts/**/*.test.ts` (verified: vitest.config.ts include globs).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-time visitor lands on the numbered spotlighted pathway (not raw graph) with Next cue + 0/8 bar; intro overlay shows once | PATH-01/02/03 | Visual/interaction; matches every prior UI-hint phase precedent | Clear localStorage, load `/` in dev — confirm intro overlay, numbered steps, single Next cue, progress bar; reload — overlay does not reappear (09-13 task 2) |
| Mastering nodes advances the bar (mastered-only); 8/8 shows "Fundamentals complete" with no fanfare | PATH-04 | Requires driving mastery state through the UI + subjective "no gamification" check | Mark pathway nodes mastered; watch the bar; reach 8/8 — confirm quiet completion, no confetti/toast (09-13 task 2) |
| Staleness strip + tooltip (incl. tap) on a meta-volatile out-of-patch node; canvas marker | CONT-05 (criterion 5) | Touch tooltip + visual marker not unit-testable | Open a stale node's panel — confirm strip + tooltip on hover/focus/tap; confirm canvas Clock marker (09-13 task 2) |
| Citation audit correctly withholds a failing node from launch | CONT-05 | Human judgment on content quality (not a computable property) | Content-workstream reviewer audits each node, records `auditNote`, flips `launch_ready`; a failing node stays `false` and is excluded from the production graph + fails `validate:launch` (D-11/D-13) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (embedded as RED tasks in 09-01/09-02/09-08)
- [x] No watch-mode flags (all `vitest run`, never `vitest` watch)
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-03
