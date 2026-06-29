---
phase: 02-graph-engine
plan: "03"
subsystem: content
tags: [content-collections, mdx, mock-data, mastery, dag, vitest]

requires:
  - phase: 01-foundation-schema
    provides: NodeFrontmatterSchema, content-collections pipeline, validate script, PATCH_IDS

provides:
  - 12 MDX seed nodes forming a validated acyclic DAG in content/nodes/
  - MasteryState type and getMockMastery() accessor in src/lib/mock-mastery.ts
  - MOCK_MASTERY read-only map covering all three mastery states across all 13 nodes

affects:
  - 02-04 (graph canvas — renders these nodes)
  - 02-05 (pathway spotlight — references seed node IDs in pathways/beginner-fundamentals.json)
  - 02-06 (mobile list — renders MasteryState from MOCK_MASTERY)
  - 02-07 (MasteryBadge — consumes MasteryState type)
  - 05 (real persistence replaces mock-mastery.ts)

tech-stack:
  added: []
  patterns:
    - "MDX seed nodes: kebab-case filename = node id, all fields from NodeFrontmatterSchema, required ## How to Apply section"
    - "Mock module pattern (mirrors patches.ts): private backing const + Readonly<> public view + graceful accessor returning typed default"
    - "YAML colon-in-string values must be quoted (e.g. title: \"Micro: Focus Fire\") — content-collections silently skips documents that fail YAML parse"

key-files:
  created:
    - content/nodes/supply-management.mdx
    - content/nodes/scouting.mdx
    - content/nodes/hotkey-discipline.mdx
    - content/nodes/creep-routing.mdx
    - content/nodes/hero-leveling.mdx
    - content/nodes/resource-banking.mdx
    - content/nodes/army-positioning.mdx
    - content/nodes/micro-focus-fire.mdx
    - content/nodes/expansion-timing.mdx
    - content/nodes/tech-timing.mdx
    - content/nodes/harassment.mdx
    - content/nodes/base-defense.mdx
    - src/lib/mock-mastery.ts
    - src/lib/mock-mastery.test.ts
  modified: []

key-decisions:
  - "content-collections silently skips YAML-invalid documents — YAML colons in unquoted string values (title: Micro: Focus Fire) parse as nested objects, failing z.string() validation with no build error. Quote any title containing colons."
  - "Mock mastery distribution: 4 mastered (beginner roots), 3 in-progress (intermediate with mastered prereqs), 6 untouched (advanced) — exercises the full three-gold hierarchy"
  - "getMockMastery() returns 'untouched' for unknown IDs — graceful default matches UI behaviour for nodes not yet in the corpus"

patterns-established:
  - "Mock module pattern: private _CONST + export const PUBLIC: Readonly<> + export function getX() with typed default"
  - "Seed node DAG: beginner roots (no prereqs) → beginner with prereqs → intermediate → advanced; prerequisites always reference earlier-difficulty nodes"

requirements-completed: [GRAPH-02]

coverage:
  - id: D1
    description: "13 MDX seed nodes validated by content-collections schema and validate script (acyclic DAG, all prereq IDs resolve, all patchIds valid)"
    requirement: GRAPH-02
    verification:
      - kind: integration
        ref: "npm run build:content (13/13 documents compiled)"
        status: pass
      - kind: integration
        ref: "npm run validate (13 node(s) checked, exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "mock-mastery.ts exports MasteryState type, MOCK_MASTERY read-only map, and getMockMastery() with untouched default for unknown IDs"
    requirement: GRAPH-02
    verification:
      - kind: unit
        ref: "src/lib/mock-mastery.test.ts (8 tests passing)"
        status: pass
    human_judgment: false

duration: 7min
completed: "2026-06-29"
status: complete
---

# Phase 02 Plan 03: Seed Content Corpus + Mock Mastery Summary

**12 MDX seed nodes forming a validated acyclic prerequisite DAG plus a phase-2-only mock mastery map covering all three mastery states across the 13-node corpus**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-29T01:19:09Z
- **Completed:** 2026-06-29T01:25:01Z
- **Tasks:** 2
- **Files modified:** 14 (12 MDX + mock-mastery.ts + mock-mastery.test.ts)

## Accomplishments

- 12 new MDX nodes authored under content/nodes/ — 5 beginner, 3 intermediate, 4 advanced; 4 CONCEPTUAL (scouting, resource-banking, expansion-timing, tech-timing) + 8 MECHANIC
- Acyclic prerequisite DAG: beginner roots (map-control, supply-management, scouting, hotkey-discipline) feed intermediate nodes which feed advanced nodes; validate passes with zero cycle errors
- mock-mastery.ts exports MasteryState type, MOCK_MASTERY read-only view, and getMockMastery() with graceful "untouched" default — 8 unit tests passing

## Task Commits

1. **Task 1: Author 10-15 MDX seed nodes forming a DAG** - `862c335` (feat)
2. **Task 2: Mocked mastery map + tests** - `db94b0d` (feat)

## Files Created/Modified

- `content/nodes/supply-management.mdx` — MECHANIC beginner root; supply cap fundamentals
- `content/nodes/scouting.mdx` — CONCEPTUAL beginner root; information-gathering discipline
- `content/nodes/hotkey-discipline.mdx` — MECHANIC beginner root; keyboard shortcut motor skill
- `content/nodes/creep-routing.mdx` — MECHANIC beginner; prereqs: map-control
- `content/nodes/hero-leveling.mdx` — MECHANIC beginner; prereqs: supply-management
- `content/nodes/resource-banking.mdx` — CONCEPTUAL intermediate; prereqs: supply-management
- `content/nodes/army-positioning.mdx` — MECHANIC intermediate; prereqs: map-control, hotkey-discipline
- `content/nodes/micro-focus-fire.mdx` — MECHANIC intermediate; prereqs: hotkey-discipline, army-positioning
- `content/nodes/expansion-timing.mdx` — CONCEPTUAL advanced; prereqs: resource-banking, creep-routing
- `content/nodes/tech-timing.mdx` — CONCEPTUAL advanced; prereqs: expansion-timing, hero-leveling
- `content/nodes/harassment.mdx` — MECHANIC advanced; prereqs: micro-focus-fire, army-positioning
- `content/nodes/base-defense.mdx` — MECHANIC advanced; prereqs: scouting, army-positioning
- `src/lib/mock-mastery.ts` — MasteryState type + MOCK_MASTERY view + getMockMastery() accessor
- `src/lib/mock-mastery.test.ts` — 8 unit tests covering all three states and graceful default

## Decisions Made

- YAML colons in string values must be quoted — `title: Micro: Focus Fire` causes content-collections to silently skip the document (it parses the value as a nested object, failing `z.string().min(1)`). Fixed by wrapping in quotes: `title: "Micro: Focus Fire"`.
- Mock mastery distribution chosen to exercise the three-gold hierarchy: mastered beginner roots (map-control, supply-management, scouting, hotkey-discipline) are prerequisites for in-progress intermediate nodes (creep-routing, hero-leveling, army-positioning).
- All seed content is `race: agnostic` per plan prohibitions; real authoring deferred to Phase 9.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed YAML colon in unquoted title silently breaking content-collections build**
- **Found during:** Task 1 verification (build:content produced 12 documents not 13)
- **Issue:** `micro-focus-fire.mdx` had `title: Micro: Focus Fire` — YAML parses the value as `{Micro: "Focus Fire"}` (a nested mapping), which fails `z.string().min(1)`. content-collections silently skips schema-invalid documents; no build error is emitted.
- **Fix:** Changed to `title: "Micro: Focus Fire"` (quoted string). Build then produced 13 documents. `npm run validate` passed.
- **Files modified:** `content/nodes/micro-focus-fire.mdx`
- **Verification:** `npm run build:content` produced 13/13 documents; `npm run validate` passed with exit 0
- **Committed in:** `862c335` (Task 1 commit, fix applied before commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix was essential for corpus completeness. No scope changes.

## Issues Encountered

None beyond the YAML colon issue documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Seed corpus is fully validated; all 13 node IDs are canonical referents for `pathways/beginner-fundamentals.json` (plan 05) and the MOCK_MASTERY map keys
- MasteryState type is ready for import by GraphNode, MobileNodeList, and MasteryBadge (plans 04, 06, 07)
- Prerequisite DAG provides 8+ connected nodes for pathway exercises and all three mastery states for graph render testing

---
*Phase: 02-graph-engine*
*Completed: 2026-06-29*
