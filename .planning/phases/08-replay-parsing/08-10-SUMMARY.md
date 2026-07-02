---
phase: 08-replay-parsing
plan: 10
subsystem: content
tags: [content-collections, zod, replay-criteria, build-order, mdx]

# Dependency graph
requires:
  - phase: 08-replay-parsing
    provides: "08-07 ReplayCriteriaSchema (discriminated union incl. buildOrderTiming) + 08-04 object-id-maps registry (opener-kind unit ids per race)"
provides:
  - "Four canonical opening build-order MECHANIC nodes (build-order-{human,orc,undead,nightelf}), each carrying a replayCriteria buildOrderTiming threshold"
  - "Real mastery targets for 08-09's replay threshold detector and 08-11's write path to advance"
affects: [08-09, 08-11, content-authoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Race-specific MECHANIC content node authoring: full NodeFrontmatterSchema contract + non-empty cited citations + replayCriteria block, mirroring existing agnostic MECHANIC node conventions (hotkey-discipline)"

key-files:
  created:
    - content/nodes/build-order-human.mdx
    - content/nodes/build-order-orc.mdx
    - content/nodes/build-order-undead.mdx
    - content/nodes/build-order-nightelf.mdx
  modified: []

key-decisions:
  - "Build-order thresholds are content-authored from creator/pro wisdom (ToD/Grubby/TeD/Moon) with visible citations — no external data source; matches D-10 Claude's-Discretion instruction and the project's content-authored-source-of-truth model"
  - "Per-race beforeMs thresholds calibrated to relative race identity: Orc 100000ms (fastest, aggression-first), Human 120000ms, Undead 130000ms (Acolyte dual-role fragility), Night Elf 140000ms (slowest, fixed Ancient-of-War growth timer)"
  - "meta_volatile: true on all four nodes — unlike agnostic mechanic/conceptual nodes, race build-order timings are patch-sensitive (unit costs/build-times can shift on balance patches)"
  - "prerequisites: [hotkey-discipline, supply-management] on all four — build-order execution assumes those two foundational macro mechanics are already in place"

patterns-established:
  - "Race-specific MECHANIC node template (frontmatter + Why It Matters / How to Apply body) for future RACE-* content authoring (v2 deferred scope)"

requirements-completed: [REPLAY-06]

coverage:
  - id: D1
    description: "Four build-order MECHANIC nodes exist (human/orc/undead/nightelf), each with a replayCriteria buildOrderTiming threshold and non-empty citations"
    requirement: "REPLAY-06"
    verification:
      - kind: other
        ref: "npm run build:content (content-collections build, 16 documents, exit 0)"
        status: pass
      - kind: other
        ref: "npm run validate (scripts/validate-content.ts — 16 node(s) checked, pathway integrity verified)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 10: Race Build-Order Content Nodes Summary

**Four cited, race-specific MECHANIC nodes (build-order-{human,orc,undead,nightelf}) each carrying a `replayCriteria: buildOrderTiming` threshold, giving replay build-order detection its real mastery targets**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-02T11:28:00Z (approx)
- **Completed:** 2026-07-02T11:40:37Z
- **Tasks:** 2
- **Files modified:** 4 (all new)

## Accomplishments

- Authored `build-order-human.mdx` (race: human) — first-Footman target before 2:00 (`beforeMs: 120000`), cited ToD (creator) + Ericsson/Krampe/Tesch-Römer 1993 (science, deliberate practice)
- Authored `build-order-orc.mdx` (race: orc) — first-Grunt target before 1:40 (`beforeMs: 100000`), cited Grubby (creator) + Newell & Rosenbloom 1981 (science, power law of practice)
- Authored `build-order-undead.mdx` (race: undead) — first-Ghoul target before 2:10 (`beforeMs: 130000`), cited TeD (creator) + Anderson 1982 (science, ACT skill acquisition)
- Authored `build-order-nightelf.mdx` (race: nightelf) — first-Archer target before 2:20 (`beforeMs: 140000`), cited Moon (creator) + Fitts & Posner 1967 (science, motor learning stages)
- All four nodes validated against `NodeFrontmatterSchema` via `content-collections build` (16 documents total, up from 12) and `scripts/validate-content.ts` (prerequisite-ID + cycle + pathway integrity all pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Author human + orc build-order nodes** - `2a1e0bc` (feat)
2. **Task 2: Author undead + nightelf build-order nodes** - `fd01b60` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified

- `content/nodes/build-order-human.mdx` - Human opening MECHANIC node; first-Footman replayCriteria threshold (120000ms)
- `content/nodes/build-order-orc.mdx` - Orc opening MECHANIC node; first-Grunt replayCriteria threshold (100000ms)
- `content/nodes/build-order-undead.mdx` - Undead opening MECHANIC node; first-Ghoul replayCriteria threshold (130000ms)
- `content/nodes/build-order-nightelf.mdx` - Night Elf opening MECHANIC node; first-Archer replayCriteria threshold (140000ms)

## Decisions Made

- Build-order timing thresholds are content-authored from well-established WC3 creator/pro wisdom (ToD, Grubby, TeD, Moon) rather than sourced from any external dataset — consistent with D-10's "Claude's Discretion — content-authored source of truth" instruction and the project's existing citation-driven content model.
- Threshold ordering (Orc fastest, Night Elf slowest) reflects each race's known early-game identity: Orc's early-aggression tempo, Human's balanced opener, Undead's Acolyte dual-role (builder + gatherer) fragility, and Night Elf's fixed Ancient-of-War growth timer that cannot be rushed by player skill.
- `meta_volatile: true` on all four (vs. `false` on existing agnostic mechanic/conceptual nodes) — race-specific timing benchmarks are the part of the content model most likely to need a review pass after a balance patch changes unit costs or build times.
- Each node's "opener" target unit (Footman/Grunt/Ghoul/Archer) matches the `kind: "opener"` entries already seeded in `src/lib/object-id-maps/index.ts` (08-04) — the target object referenced by `replayCriteria.buildOrderTiming` is identifiable end-to-end through the existing object-ID resolution layer without any new map entries required.

## Deviations from Plan

None — plan executed exactly as written. One correction applied inline during authoring (not a deviation from the plan's intent, just execution care): the initial draft of all four frontmatter blocks omitted the `replayCriteria` field on first write; this was caught before verification and added via `Edit` to each file before running `content-collections build`, so the committed state matches the plan's required frontmatter contract with no defect landing in git history.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-09 (replay threshold detector) and 08-11 (replay write path) now have four real, patch-versioned, cited MECHANIC targets to advance via `replayCriteria: { signal: "buildOrderTiming", beforeMs }`.
- Content build and validation both green with all 16 nodes (12 pre-existing + 4 new); no blockers for downstream plans.
- Remaining race/matchup-specific build content (beyond this one canonical opener per race) stays deferred to v2 per RACE-01..05, consistent with PROJECT.md's "v1 content = race-agnostic core fully fleshed; race branches deferred" decision — this plan's four nodes are the explicit, bounded exception (D-10).

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

All 4 created content files and both task commits (2a1e0bc, fd01b60) verified present on disk / in git log.
