# Phase 5: Progress Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 5-Progress Tracking
**Areas discussed:** Marking UX, Merge policy, Source field, Visibility, Merge mechanics, State vocabulary

---

## Marking UX

| Option | Description | Selected |
|--------|-------------|----------|
| Panel buttons, full 3-state | Controls in node detail panel; user picks untouched / in-progress / mastered explicitly | ✓ |
| On-node quick toggle | Control on the graph node cycles state without opening panel | |
| Panel, binary + auto-learning | One 'Mark mastered' toggle; engaging a node auto-sets in-progress | |

**User's choice:** Panel buttons, full 3-state
**Notes:** Reuses the Phase-3 detail panel; user owns every transition manually this phase.

---

## Merge policy

| Option | Description | Selected |
|--------|-------------|----------|
| Most-advanced wins | Keep higher state per node across local/server; never demotes | |
| Most-recent wins | Keep newer lastUpdated per node | |
| Server wins | Account progress authoritative; localStorage fills untouched nodes only | ✓ |

**User's choice:** Server wins
**Notes:** Mechanics refined below (fill-gaps, one-time, clear-after).

---

## Source field

| Option | Description | Selected |
|--------|-------------|----------|
| Add source field now | Records carry source = manual \| auto; designed into P5 schema; manual can override auto | ✓ |
| Defer to Phase 7 | Source-agnostic now; add column + backfill when auto-detection lands | |

**User's choice:** Add source field now
**Notes:** Same forward-design discipline as the patch-version primitive; avoids a P7 migration.

---

## Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Per-node only | Mastery shows only as node state on graph + panel; no aggregates | ✓ |
| Plain non-gamified count | Also a neutral 'X of Y nodes mastered' count | |

**User's choice:** Per-node only
**Notes:** Strictest reading of "no gamification"; pathway % stays a Phase-9 concern.

---

## Merge mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Fill-gaps, one-time, then clear | First sign-in only; fills server-untouched nodes; keeps server state on conflict; clears localStorage after | ✓ |
| Fill-gaps, every sign-in | Same rule on every sign-in; localStorage kept as write-through cache | |
| Fill-gaps + flag conflicts | Fill gaps but surface discarded local marks via conflict UI | |

**User's choice:** Fill-gaps, one-time, then clear
**Notes:** Honors criterion 2 for server-untouched nodes; accepts silent drop of conflicting local marks on server-touched nodes for simplicity.

---

## State vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| 'in-progress' everywhere | Migrate schema enum from 'learning' to 'in-progress'; one source of truth across DB/code/UI | ✓ |
| 'learning' in data, 'In progress' label | Keep persisted value 'learning'; UI labels it 'In progress' (translation layer) | |

**User's choice:** 'in-progress' everywhere
**Notes:** Resolves the existing schema-vs-UI drift; touches src/schemas/progress.ts this phase.

---

## Claude's Discretion

- Drizzle progress table shape (keys, indexes, upsert strategy) + migration mechanics.
- localStorage progress store shape + module location.
- TanStack Query mutation/query keys + optimistic-update cache strategy.
- Whether any data migration is needed for the `learning`→`in-progress` rename (likely none).

## Deferred Ideas

- Aggregate progress / "X of Y mastered" count — excluded; Phase 9 territory.
- Conflict-surfacing merge UI — declined for Phase 5.
- Quiz-driven mastery source — Phase 6.
- w3champions auto-advance writing `source: "auto"` — Phase 7 (field designed here).
- Replay-detected mastery — Phase 8.
