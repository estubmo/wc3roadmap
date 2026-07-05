---
phase: 09-guided-pathways-launch
verified: 2026-07-03T14:45:39Z
status: passed
human_verification_completed: 2026-07-05T00:00:00Z
human_verification_method: "SC1/SC2/SC5 verified end-to-end via /browse headless browser against the running dev app (see 09-UAT.md, screenshots in scratchpad); SC3/SC4 met by closing the 25-node content gate (LAUNCH_GATE=1 npm run validate exits 0) after a full-corpus citation audit removed all fabricated content."
score: 11/11 mechanism must-haves verified; 5/5 ROADMAP success criteria passed
behavior_unverified: 0
overrides_applied: 0
behavior_unverified_items:
  - truth: "SC1 — first-time visitor lands on the Beginner Fundamentals guided pathway by default (ordered highlighted subset, progress indicator), not the raw full graph"
    test: "Run npm run dev, open / as a fresh visitor (clear localStorage). Confirm the intro overlay appears once, the 8-step pathway is spotlighted with numbered step badges + a single Next cue + a 0/8 progress bar — not the undifferentiated full graph."
    expected: "Numbered spotlighted pathway + Next cue + progress bar is the default landing view; overlay dismisses via CTA/X/Escape/backdrop and never returns."
    why_human: "Default landing render + spotlight/dim visual state is a runtime rendering outcome grep/tests cannot observe; all supporting mechanisms are present and wired."
  - truth: "SC2 — as a user masters pathway nodes, the completion progress bar advances (tied to mastery state, not page visits)"
    test: "In dev, master pathway nodes one at a time and watch the PathwayBanner fill; reach 8/8."
    expected: "Bar advances only on mastered state (in-progress/untouched do not move it); at 8/8 it swaps to a quiet 'Fundamentals complete' with no confetti/toast."
    why_human: "Runtime state transition (masteryMap → banner fill). The mastered-only counting rule (computePathwayProgress) is unit-tested and passes, but the end-to-end React state advance is only observable at runtime."
  - truth: "SC5 — meta-volatile nodes not reviewed against the current patch show a staleness indicator in their detail panel"
    test: "In dev, open a meta_volatile node whose patchId != CURRENT_PATCH. Check the panel shows the 'Unreviewed for {patch}' strip with a tooltip that opens on hover/focus/tap, and the canvas shows the clock marker; a current-patch node shows neither."
    expected: "Strip + touch-capable tooltip in the panel and a neutral clock marker on the canvas for stale nodes only; no strip / no reserved space for reviewed nodes."
    why_human: "isStale truth table is unit-tested, but the panel strip + tooltip open-on-tap and the on-canvas marker are visual runtime outcomes."
human_verification:
  - test: "SC1 — default landing = numbered spotlighted 8-step pathway + Next cue + 0/8 progress bar (not the raw graph), intro overlay shows once"
    expected: "First-time visitor is oriented onto the guided pathway, not the full sprawling graph"
    why_human: "Visual/functional default-landing render; config human_verify_mode=end-of-phase defers this sign-off to verify, not a blocking checkpoint"
  - test: "SC2 — mastering pathway nodes advances the bar (mastered-only); 8/8 shows quiet 'Fundamentals complete' with no fanfare"
    expected: "Progress bar is visually tied to mastery state; completion is quiet"
    why_human: "Runtime state transition; counting rule is unit-tested but visual advance needs observation"
  - test: "SC3 — content workstream (D-11): >=25 race-agnostic fundamentals nodes fully authored (citations + how-to-apply + attributed wisdom) before public announcement"
    expected: "Deliberately NOT a Phase 9 code deliverable. The launch gate (validateLaunchGate) is present and CORRECTLY FAILS today (0/25 launch_ready). Content authoring + flip to launch_ready is the parallel workstream."
    why_human: "Content-authoring + editorial judgment; the gating MECHANISM is verified — the >=25 count is supplied by the content workstream"
  - test: "SC4 — content workstream (D-11): citation review audit confirms every citation on every launched node supports a verifiable claim + concrete WC3 drill; failing nodes withheld"
    expected: "Deliberately NOT a Phase 9 code deliverable. auditNote field + validateAuditTrail enforce the audit trail at the gate; the actual editorial audit + auditNote authoring is the parallel workstream. Non-launch_ready nodes are excluded from the production graph (prod-gated filter verified)."
    why_human: "Editorial/citation judgment; the enforcement MECHANISM is verified"
  - test: "SC5 — meta-volatile out-of-patch node shows the panel staleness strip + touch tooltip and the on-canvas clock marker"
    expected: "Stale nodes surface a visible staleness indicator; reviewed nodes show none"
    why_human: "Visual runtime render; isStale rule is unit-tested but strip/tooltip/marker need observation"
---

# Phase 9: Guided Pathways & Launch Verification Report

**Phase Goal:** The guided pathway overlay ships as the default landing view with a Beginner Fundamentals track; the minimum publishable content gate (~25 fully-authored nodes) is met; a citation review pass confirms no decorative science; staleness indicators surface on meta-volatile nodes
**Verified:** 2026-07-03T14:45:39Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

Phase 9 delivers the guided-pathway + launch **mechanisms** as code. Every mechanism is present, substantive, wired, and (where testable) behaviorally proven. The five ROADMAP success criteria are visual/functional or content-authoring outcomes: per config `human_verify_mode=end-of-phase` and decision **D-11**, they route to end-of-phase human sign-off and the parallel content workstream — they are **not** code gaps. No FAILED truths, no MISSING/STUB artifacts, no NOT_WIRED links, no blocker anti-patterns.

### Observable Truths (mechanism-level — Phase 9 code deliverables)

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | `computePathwayProgress` counts mastered-only, `nextStepId` is first non-mastered in order | ✓ VERIFIED | `src/lib/pathway-progress.ts` L54-71; unit tests pass |
| 2  | `isStale` = `metaVolatile && patchId !== currentPatchId`, single predicate | ✓ VERIFIED | `src/lib/staleness.ts` L19-25; 4-combination truth table tested |
| 3  | `launch_ready` (required bool) + optional `auditNote` on node schema + content-collections mirror; all 17 nodes `launch_ready: false` | ✓ VERIFIED | `src/schemas/node.ts` L437,447; `content-collections.ts` L166,175; 17/17 MDX = false, 0 true |
| 4  | `GraphDisplayNode.stale: z.boolean()` + ADR 013 recording the ADR-002 boundary widening | ✓ VERIFIED | `src/schemas/graph.ts` L73; `docs/adr/013-...md` (Status: Accepted) |
| 5  | Launch gate fails on <25 launch_ready, non-launch_ready pathway step, or missing auditNote; regular validate stays green | ✓ VERIFIED | Ran: `LAUNCH_GATE=1` exit **1** (9 errors incl. CONT-04 shortfall); `validate` exit **0**; `validate-launch-gate.test.ts` passes |
| 6  | `index.tsx` loader: prod-gated `launch_ready` filter + `stale` projection via `isStale` + `PathwayIntroOverlay` mounted | ✓ VERIFIED | `src/routes/index.tsx` L61 (`!import.meta.env.PROD \|\| launch_ready`), L75 (`isStale(...)`), L208 |
| 7  | PathwayBanner mastery-tied progress bar ('N of total mastered' + quiet 'Fundamentals complete'), driven by masteredCount | ✓ VERIFIED (wired) | `PathwayBanner.tsx` L72-73,135-178; consumes `computePathwayProgress` via RoadmapGraph L161 |
| 8  | GraphNode 1-based step badge + single 'Next' cue (isNextStep) + stale clock marker | ✓ VERIFIED (wired) | `GraphNode.tsx` L261-441 (badge L300, stale marker L308, Next cue L333-367) |
| 9  | NodePanelContent staleness strip 'Unreviewed for {patch}' + touch-capable tooltip (hover/focus/tap) | ✓ VERIFIED (wired) | `NodePanelContent.tsx` L275 (isStale), L363-399 (Tooltip open-state + onClick tap toggle) |
| 10 | Launch polish (D-16): app-wide TooltipProvider, OG/Twitter meta, notFoundComponent + NotFoundPage, /about (GPL-3.0 + privacy + OG override), SSR-safe intro overlay | ✓ VERIFIED | `__root.tsx` L55-84,109; `about.tsx` L58; `PathwayIntroOverlay.tsx` (default-closed, post-mount localStorage) |
| 11 | CONTEXT.md extended with Phase 9 domain terms | ✓ VERIFIED | `CONTEXT.md` L438-494,546 (pathway progress / next step / staleness / launch_ready / audit note) |

**Score:** 11/11 mechanism must-haves verified (3 of the roadmap success criteria they support are present + wired but behavior-unverified — SC1/SC2/SC5 — routed to human).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/pathway-progress.ts` | pure computePathwayProgress + PathwayProgress | ✓ VERIFIED | 71 lines, pure, tested, imported by RoadmapGraph |
| `src/lib/staleness.ts` | pure isStale predicate | ✓ VERIFIED | 25 lines; sole predicate; consumed by index.tsx + NodePanelContent |
| `src/schemas/node.ts` | launch_ready + auditNote fields | ✓ VERIFIED | L437, L447 |
| `content-collections.ts` | mirror of launch_ready + auditNote | ✓ VERIFIED | L166, L175 (parallel-schema sync note) |
| 17 MDX frontmatter blocks | launch_ready: false | ✓ VERIFIED | 17/17 false, 0 true, 0 missing |
| `src/schemas/graph.ts` | stale boolean on GraphDisplayNode | ✓ VERIFIED | L73 |
| `docs/adr/013-...md` | boundary-widening ADR | ✓ VERIFIED | 95 lines, Status Accepted |
| `scripts/validate-launch-gate.ts` | 3 validators | ✓ VERIFIED | validateLaunchGate / validatePathwayStepsAreLaunchReady / validateAuditTrail |
| `src/routes/index.tsx` | env-gated filter + stale projection + overlay mount | ✓ VERIFIED | L61, L75, L208 |
| `PathwayBanner.tsx` | progress bar (totalNodes removed) | ✓ VERIFIED | 200 lines; fill + label + complete state |
| `RoadmapGraph.tsx` | stepIndex/isNextStep/stale enrich + computePathwayProgress | ✓ VERIFIED | L161-222 |
| `GraphNode.tsx` | step badge + Next cue + stale marker | ✓ VERIFIED | L261-441 |
| `NodePanelContent.tsx` | staleness strip + tooltip | ✓ VERIFIED | L275, L363-399 |
| `__root.tsx` / `NotFoundPage.tsx` / `about.tsx` / `PathwayIntroOverlay.tsx` | launch polish | ✓ VERIFIED | all present + wired |
| `pathways/beginner-fundamentals.json` | Beginner Fundamentals track | ✓ VERIFIED | 8 steps, all resolve to real MDX nodes |
| `CONTEXT.md` | Phase 9 domain terms | ✓ VERIFIED | 5 terms added |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| RoadmapGraph | pathway-progress.ts | `computePathwayProgress(pathway.steps, masteryMap)` L161 | ✓ WIRED |
| index.tsx loader | staleness.ts | `isStale(n.meta_volatile, n.patchId, CURRENT_PATCH.id)` L75 | ✓ WIRED |
| NodePanelContent | staleness.ts + TooltipProvider | `isStale(...)` L275 + Radix Tooltip (provider in __root) | ✓ WIRED |
| GraphNode | RoadmapGraph node data | reads `data.stepIndex/isNextStep/stale` L202 | ✓ WIRED |
| validate-content.ts | validate-launch-gate.ts | `if (process.env.LAUNCH_GATE) { push(validateLaunchGate/...) }` L80-90 | ✓ WIRED |
| index.tsx | PathwayIntroOverlay | mounted inside ProgressProvider L208 | ✓ WIRED |
| package.json | launch gate | `validate:launch` = `build:content && LAUNCH_GATE=1 tsx validate-content.ts` | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase 9 unit tests | `vitest run pathway-progress + staleness + validate-launch-gate` | 3 files, 23 tests passed | ✓ PASS |
| Launch gate blocks under-provisioned corpus | `LAUNCH_GATE=1 tsx scripts/validate-content.ts` | exit 1; "only 0 launch_ready nodes; need >= 25 (CONT-04)" + 8 pathway-step errors | ✓ PASS (fails by design, D-11) |
| Regular per-PR validation stays green | `tsx scripts/validate-content.ts` | exit 0; "17 node(s) checked, pathway integrity verified" | ✓ PASS |
| Pathway steps resolve to real nodes | file check of 8 step ids | 8/8 MDX files present | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes declared for this phase; the launch gate + vitest served as the runnable checks (executed above).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| PATH-01 | 09-09, 09-11 | Guided Pathways overlay highlights ordered subset | ✓ SATISFIED (mechanism) | RoadmapGraph stepIndex/isNextStep; GraphNode badge + Next cue |
| PATH-02 | 09-08 | ≥1 Beginner Fundamentals pathway ships | ✓ SATISFIED | beginner-fundamentals.json (8 steps → real nodes); gate cross-checks steps |
| PATH-03 | 09-05,06,07,10 | Default landing = guided pathway, not full graph | ✓ SATISFIED (mechanism); visual → human | Intro overlay + prod launch_ready filter; SC1 human sign-off |
| PATH-04 | 09-01, 09-09 | Pathway shows completion progress as user masters nodes | ✓ SATISFIED (mechanism) | computePathwayProgress (tested) + PathwayBanner bar; SC2 human sign-off |
| CONT-04 | 09-03,08,10 | Min publishable gate (~25 nodes) | ✓ SATISFIED (mechanism); content → workstream | validateLaunchGate ≥25 (fails today by design); prod exclusion filter |
| CONT-05 | 09-02,03,04,08,11,12 | Citations real + review pass | ✓ SATISFIED (mechanism); audit → workstream | auditNote + validateAuditTrail; isStale staleness strip/marker |

All 6 requirement IDs declared in PLAN frontmatter are accounted for and map to Phase 9 in REQUIREMENTS.md (lines 26-27, 40-43, 181-186). **No orphaned requirements** — every Phase-9-mapped ID appears in at least one plan's `requirements` field.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `GraphNode.tsx` | 425 | "PLACEHOLDER glyph" comment | ℹ️ Info | Cosmetic style-deferral on a Phase-7 auto-detect marker that DOES render (◈); unrelated to Phase 9 stale marker (fully implemented L308). Not a debt marker (no TBD/FIXME/XXX). |
| `RoadmapGraph.tsx` | 421 | "placeholder div with pulse" | ℹ️ Info | Legitimate loading fallback (SSR/lazy), not a stub |

No `TBD`/`FIXME`/`XXX` debt markers in any Phase 9 file. No empty-return stubs, no hollow data flow. The prod-gated `launch_ready` filter is the intended behavior (dev shows all nodes, prod shows only launched) — not a stub.

### Human Verification Required

Config `human_verify_mode=end-of-phase` deliberately defers the five ROADMAP success criteria (all visual/functional or content-authoring) to this verify step rather than a blocking checkpoint. See frontmatter `human_verification` for the five items:

1. **SC1 default landing** — first-time visitor lands on numbered spotlighted pathway + Next cue + 0/8 bar, not the raw graph
2. **SC2 progress advance** — mastering nodes advances the mastered-only bar; 8/8 shows quiet "Fundamentals complete"
3. **SC3 ≥25 authored nodes** — content workstream (D-11); gate mechanism verified, correctly failing at 0/25 today
4. **SC4 citation audit** — content workstream (D-11); auditNote + validateAuditTrail mechanism verified
5. **SC5 staleness indicator** — stale node shows panel strip + touch tooltip + canvas clock marker

### Gaps Summary

**No code gaps.** All Phase 9 mechanism deliverables exist, are substantive, wired, and (where machine-testable) behaviorally proven: pathway-progress + staleness predicates are unit-tested (23 tests green); the launch gate correctly fails at 0/25 launch_ready while the per-PR validation stays green; the prod-only launch_ready filter, stale projection, progress bar, step badges/Next cue, staleness strip/marker, and launch-polish surfaces are all present and connected. The remaining items are the five ROADMAP success criteria, which are visual/functional runtime outcomes (SC1/SC2/SC5) and content-authoring outcomes (SC3/SC4 — the parallel workstream per D-11). These are correctly routed to human verification, not counted as gaps. The phase's code goal is achieved; launch itself remains correctly gated on the content workstream flipping ≥25 audited nodes to `launch_ready`.

---

_Verified: 2026-07-03T14:45:39Z_
_Verifier: Claude (gsd-verifier)_
