---
phase: 09-guided-pathways-launch
plan: 11
subsystem: graph-ui
tags: [graph, pathway, staleness, overlays, accessibility]
requires:
  - "RoadmapGraph transient node data (09-09): stepIndex, pathwayTotal, isNextStep, stale"
  - "GraphDisplayNode.stale field (09-04, ADR 013)"
provides:
  - "Pathway step-number badge overlay on GraphNode"
  - "'Next' recommended-step cue pill overlay on GraphNode"
  - "Staleness clock marker overlay on GraphNode"
affects:
  - "src/components/graph/GraphNode.tsx"
tech-stack:
  added: []
  patterns:
    - "Absolutely-positioned overlay children following GraphNode faction-accent + aria conventions"
    - "Entrance-only motion (no loop) per Phase 2 no-continuous-loops rule"
    - "role=img + aria-label for non-interactive canvas markers (difficulty-dots pattern)"
key-files:
  created: []
  modified:
    - "src/components/graph/GraphNode.tsx"
decisions:
  - "Step-badge aria degrades gracefully to 'Step {n}' when pathwayTotal absent (though RoadmapGraph always sets it)"
  - "isNextStep destructured in Task 2 (not Task 1) so Task 1 commit stays tsc-clean (no unused var)"
  - "Neutral staleness color via color-mix(#e9e8ee 55% transparent) — the one UI-SPEC-sanctioned non-token color; never rune-gold"
metrics:
  duration: ~6m
  completed: 2026-07-03
status: complete
---

# Phase 9 Plan 11: Pathway Node-Face Overlays Summary

Added three presentational overlays to `GraphNode.tsx` — a pathway step-number badge, a single entrance-animated "Next" cue, and a neutral staleness clock marker — all reading transient node data set by RoadmapGraph (09-09).

## What Was Built

- **Step-number badge** (Task 1): 20px circle overlapping the top-left corner, showing the node's 1-based pathway position. Default obsidian styling (obsidian-800 bg, obsidian-600 border, `#e9e8ee` 80% text); mastered steps get the rune-500 gold fill with obsidian-950 text and no border (accent item 10). Renders only for pathway-step nodes (`stepIndex` defined). `aria-label="Step {n} of {total}"`.
- **Staleness marker** (Task 1): 10px lucide `Clock` in the previously-empty bottom-right corner, neutral `#e9e8ee` at 55% — deliberately never rune-gold (staleness = trust signal, not skill signal). `role="img"` + aria-label. Renders only when `data.stale === true`.
- **"Next" cue** (Task 2): rune-600-bordered pill with uppercase "Next" (rune-400) + `ChevronDown` centered above the node at `top: -28px` (clears the step badge). Renders only on the single first-non-mastered step (`isNextStep`). Entrance-only motion — `initial {opacity:0,y:-4} → animate {opacity:1,y:0}`, 0.25s easeOut, no loop/repeat. `aria-label="Next recommended step"` so the cue is never color-only.

All existing overlays (faction tint, mastery badge, source markers, difficulty dots) left untouched. The next node is by definition never mastered, so its step badge stays default — no accent conflict between the gold-mastered badge and the gold "Next" pill.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` clean after each task.
- `npm run test`: 541 passed / 38 files.
- grep confirms `stepIndex`, `Clock`, `Step `, `isNextStep`, `ChevronDown`, `Next recommended step` all present.
- Manual canvas verification deferred to 09-13 (pathway nodes numbered 1..8, one "Next" cue, gold mastered badges, stale markers on meta-volatile out-of-patch nodes).

## Commits

- `89da9f6` feat(09-11): add pathway step-number badge + staleness marker to GraphNode
- `f822fb9` feat(09-11): add entrance-only 'Next' cue pill to GraphNode

## Self-Check: PASSED
