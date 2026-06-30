---
phase: 06-self-assessment-quizzes
plan: "06"
subsystem: ui
tags: [react, zustand, graph, mastery, quiz, xyflow]

requires:
  - phase: 06-03
    provides: sourceMap/setSource/initSourceMap in graph-store.ts (D-14 foundation)

provides:
  - MasteryBadge source prop rendering "Mastered · via quiz" when mastered + source quiz (D-14 panel surfacing)
  - GraphNode quiz-mastered canvas marker (◆, rune-400, 9px) driven by store sourceMap (D-14 canvas surfacing)

affects: [06-07, 06-08, 06-09, 06-10, 06-11]

tech-stack:
  added: []
  patterns:
    - "sourceMap subscription in GraphNode: useGraphStore((s) => s.sourceMap[d.id]) — store-only, never graph projection (ADR 002/005)"
    - "source prop threading: MasteryBadge receives source from GraphNode's store subscription, not from node data"
    - "Anti-gamification marker: single unicode glyph (◆) at 9px rune-400 — source distinction only, PROG-05 compliant"

key-files:
  created: []
  modified:
    - src/components/graph/MasteryBadge.tsx
    - src/components/graph/GraphNode.tsx

key-decisions:
  - "source prop on MasteryBadge is optional string — caller passes masterySource from store, badge handles undefined gracefully"
  - "GraphNode uses per-node selector useGraphStore((s) => s.sourceMap[d.id]) — avoids full-store subscription; only affected node re-renders"
  - "Quiz marker placed before MasteryBadge in the right-side flex row — glyph + badge both in a flex wrapper gap-1"
  - "No fourth CVA masteryState variant — mastered branch reused, marker layered via conditional JSX (plan spec)"

patterns-established:
  - "D-14 canvas/panel dual surfacing: store sourceMap drives both GraphNode marker and MasteryBadge label via source prop"
  - "Anti-gamification constraint documented in JSX comment — explicit PROG-05 reference at the marker site"

requirements-completed: [QUIZ-02]

coverage:
  - id: D1
    description: "MasteryBadge renders 'Mastered · via quiz' when state=mastered and source=quiz; renders 'Mastered' otherwise"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (type-level proof; source prop is optional string, used in conditional)"
        status: pass
    human_judgment: true
    rationale: "Visual text change — automated type check confirms prop wiring; human verify confirms label renders correctly in the panel"
  - id: D2
    description: "GraphNode renders a ◆ rune-gold glyph on the canvas only when masterySource=quiz and masteryState=mastered"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "npx vitest run src/lib/graph-layout.test.ts (10 tests pass — no graph regression)"
        status: pass
    human_judgment: true
    rationale: "Canvas visual marker — type check + graph regression test confirm wiring; human verify (06-10) confirms the glyph appears correctly on quiz-mastered nodes"

duration: 5min
completed: "2026-06-30"
status: complete
---

# Phase 06 Plan 06: Quiz-Source Visual Markers Summary

**Quiz-mastered nodes distinguished from manual mastery in both panel badge ("Mastered · via quiz") and graph canvas (◆ rune-gold glyph), both driven by store sourceMap per ADR 002/005.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T21:05:00Z
- **Completed:** 2026-06-30T21:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- MasteryBadge gains optional `source?: string` prop; mastered branch conditionally renders "Mastered · via quiz" vs "Mastered" (D-14 panel surfacing)
- GraphNode subscribes to `useGraphStore((s) => s.sourceMap[d.id])` and renders a 9px rune-400 `◆` glyph alongside the badge when mastered + quiz (D-14 canvas surfacing)
- Source distinction reads from the store only — no quiz data leaks into GraphDisplayNode projection (T-06-09, ADR 002/005)
- Anti-gamification guardrail: marker is a single unicode glyph, explicitly documented against star/trophy/XP drift (PROG-05)

## Task Commits

1. **Task 1: Add 'via quiz' label to MasteryBadge** — `5a70559` (feat)
2. **Task 2: Add subtle quiz-mastered marker to GraphNode** — `5bcc282` (feat)

## Files Created/Modified

- `src/components/graph/MasteryBadge.tsx` — added `source?: string` prop to `MasteryBadgeProps`; label branch in mastered state
- `src/components/graph/GraphNode.tsx` — added `useGraphStore` import; `masterySource` selector; `◆` marker JSX + `source` prop threading to MasteryBadge

## Decisions Made

- `source` prop on `MasteryBadge` is optional string (not the `MasterySource` union type) — decouples the badge from progress schema; caller passes whatever the store returns
- GraphNode uses a per-node granular selector (`s.sourceMap[d.id]`) rather than `useShallow` over the full map — only the specific node re-renders when its source changes
- Quiz marker placed in a flex wrapper alongside `MasteryBadge` (gap-1) so both align cleanly in the top-right slot without disrupting node dimensions
- No new CVA variant added — plan explicitly forbids a fourth `masteryState` value; marker is purely additive JSX

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- D-14 visual surface is complete for quiz-mastered nodes; both panel and canvas paths are wired
- 06-07 (QuizTakeover UI) and 06-08 (quiz server fn integration) can now call `setSource("quiz")` and the visuals will immediately reflect it
- End-of-phase human verify (06-10) should confirm the `◆` marker renders correctly on a quiz-mastered node in the live graph

## Known Stubs

None — no stubbed data paths introduced by this plan.

## Threat Flags

None — presentation-only plan; all state derives from already-authorized store values.

## Self-Check

- [x] `src/components/graph/MasteryBadge.tsx` exists and contains "via quiz"
- [x] `src/components/graph/GraphNode.tsx` exists and contains "sourceMap"
- [x] Commits 5a70559 and 5bcc282 in git log
- [x] `npx tsc --noEmit` exits 0
- [x] `npx vitest run src/lib/graph-layout.test.ts` — 10/10 pass

## Self-Check: PASSED

---
*Phase: 06-self-assessment-quizzes*
*Completed: 2026-06-30*
