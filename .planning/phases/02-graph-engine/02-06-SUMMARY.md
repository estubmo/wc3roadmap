---
phase: 02-graph-engine
plan: "06"
subsystem: graph-components
status: complete
tags: [graph, react-flow, mastery, custom-node, memoization, design-tokens]
dependency_graph:
  requires:
    - 02-01  # shadcn primitives (Badge, cn)
    - 02-02  # GraphDisplayNode schema
    - 02-03  # mock-mastery MasteryState type + MOCK_MASTERY map
  provides:
    - GraphNode custom node component (memoized, D-04 face, D-05 mastery states)
    - MasteryBadge pill component (token-driven, three mastery states)
  affects:
    - 02-09  # nodeTypes const registration uses GraphNode for both 'mechanic' and 'conceptual' keys
    - 02-10  # preview routes render GraphNode directly
tech_stack:
  added:
    - "class-variance-authority (nodeVariants CVA map)"
    - "lucide-react (Sword, BookOpen icons)"
    - "@xyflow/react Handle + Position (invisible Handles)"
  patterns:
    - "React.memo with named inner function (GRAPH-06 memoization at birth)"
    - "CVA variant map for mastery × shape"
    - "CSS variable inline styles for design tokens not expressible as Tailwind utilities"
    - "currentColor / inherit for body-inherited text color (avoids hex literals)"
    - "Dormant faction-tint hook pattern (getFactionTint inert for 'agnostic')"
key_files:
  created:
    - src/components/graph/MasteryBadge.tsx
    - src/components/graph/GraphNode.tsx
  modified: []
decisions:
  - "Used inline style map (masteryStyles record) alongside CVA for mastery states — CSS variables in color-mix() cannot be expressed as Tailwind utilities; CVA handles class structure, inline styles carry token values"
  - "Filled dot and icon text color uses currentColor/inherit (not #e9e8ee hex) — body color is already set to #e9e8ee in app.css; inheriting it avoids hex literals without needing a new CSS variable"
  - "getFactionTint() returns undefined for 'agnostic' with a void discard of the return value — makes the hook testable and clearly dormant; v2 can remove the agnostic guard to activate"
  - "GraphNodeData type is local to GraphNode.tsx — not exported — keeping the surface minimal per ADR 002"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-29"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 06: GraphNode + MasteryBadge Summary

**One-liner:** Memoized custom node component (D-04 face, D-05 three mastery states, D-06 shapes) and token-driven mastery badge — graph visual heart, no hex literals, React.memo from first commit.

---

## What Was Built

### Task 1 — MasteryBadge (`src/components/graph/MasteryBadge.tsx`)

Lightweight pill component keyed on `MasteryState`. Returns null for "untouched" (no badge per UI-SPEC). Renders "Learning" (rune-600 bg + rune-300 text) for "in-progress" and "Mastered" (rune-500 bg + obsidian-950 text) for "mastered". Styled entirely with CSS variable inline styles — no hardcoded hex. 11px/600 per UI-SPEC §Typography §Badge.

### Task 2 — GraphNode (`src/components/graph/GraphNode.tsx`)

`memo(function GraphNode(...))` — named inner function for DevTools. Single component serves both MECHANIC (rounded-sm, 4px) and CONCEPTUAL (rounded-2xl, 16px) via CVA + data.nodeType switch.

**D-04 node face (160×80px fixed):**
- Top-left: lucide `Sword` (MECHANIC) / `BookOpen` (CONCEPTUAL) with `aria-label` per copywriting contract
- Top-right: `<MasteryBadge state={masteryState} />`
- Center: title at 15px/600, `-webkit-line-clamp: 2`, ellipsis overflow
- Bottom-left: 3-dot difficulty row, filled dots use `currentColor`, empty dots use `--color-obsidian-600`; `aria-label` on wrapper span

**D-05 mastery state encoding via `masteryStyles` record + CVA:**
- untouched: `--color-obsidian-800` bg, 1px `--color-obsidian-600` border, no glow
- in-progress: `--color-obsidian-800` bg, 2px `--color-rune-600` border, `box-shadow: 0 0 8px 1px color-mix(...rune-600 30%, transparent)`
- mastered: `color-mix(in oklab, --color-rune-500 15%, --color-obsidian-800)` bg, 2px `--color-rune-500` border, `box-shadow: 0 0 16px 4px color-mix(...rune-500 40%, transparent)`

**D-07 faction-tint hook (dormant):** `getFactionTint(race)` returns `undefined` for "agnostic"; maps to `--color-faction-*` for other races. Return value discarded with `void` for v1. JSDoc notes v2 activation path.

**XYFlow Handles:** invisible `target` (top) and `source` (bottom) per Pattern 3 from RESEARCH.md.

---

## Verification

- `npm run typecheck` — passes (both tasks)
- `grep -n "memo(" GraphNode.tsx` — confirms line 180: `export const GraphNode = memo(function GraphNode...)`
- `grep -nE "#[0-9a-fA-F]{3,6}" GraphNode.tsx` — returns nothing (no hardcoded hex)
- `grep -nE "#[0-9a-fA-F]{3,6}" MasteryBadge.tsx` — returns nothing (no hardcoded hex)
- Sword + BookOpen imports present and rendered conditionally on nodeType
- Both Handles (target top, source bottom) present
- CVA `nodeVariants` drives shape × mastery class structure
- Faction hook `getFactionTint` exists, keyed on `data.race`, inert for "agnostic"

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing correctness] Replaced #e9e8ee hex literals with currentColor/inherit**
- **Found during:** Task 2 verification — grep check caught hex literals
- **Issue:** Plan acceptance criteria require no hardcoded hex. UI-SPEC §Difficulty Markers references `#e9e8ee` for filled dot color but that is the canonical body text color already set in app.css
- **Fix:** Used `currentColor` for icon and filled dot colors, `inherit` for title — inherits `body { color: #e9e8ee }` without duplicating the hex literal
- **Files modified:** src/components/graph/GraphNode.tsx

---

## Known Stubs

None. Both components render their full intended output from display-essential data.

---

## Threat Flags

No new security surface introduced. Node title (`data.title`) is rendered as a React string child — escaped by React (T-02-09 disposition: mitigate via React escaping, no dangerouslySetInnerHTML used anywhere in these files).

---

## Commits

| Hash | Message |
|------|---------|
| 5206ef6 | feat(02-06): MasteryBadge component — token-driven pill per mastery state |
| 5ab02f1 | feat(02-06): GraphNode memoized custom node — D-04 face + D-05 mastery states |

---

## Self-Check: PASSED

- [x] `src/components/graph/MasteryBadge.tsx` — created and verified
- [x] `src/components/graph/GraphNode.tsx` — created and verified
- [x] Commit 5206ef6 — present in git log
- [x] Commit 5ab02f1 — present in git log
