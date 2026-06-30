---
phase: 05-progress-tracking
plan: "09"
subsystem: documentation
tags:
  - context-glossary
  - adr
  - progress-tracking
  - domain-language
dependency_graph:
  requires:
    - "05-03 (progress Drizzle table + schema)"
    - "05-04 (setNodeMastery server function)"
    - "05-07 (localStorage merge)"
    - "05-08 (MasteryControls UI + ProgressProvider)"
  provides:
    - "CONTEXT.md Phase 05 glossary (progress record, mastery source, local progress, merge-on-sign-in)"
    - "ADR 009 — progress-persistence design rationale (audit trail for Phases 7/8)"
  affects:
    - "All future phases: Phase 05 domain terms are now canonical in CONTEXT.md"
    - "Phase 7/8: ADR 009 documents source field and patchId forward-design"
tech_stack:
  added: []
  patterns:
    - "ADR format: Status / Date / Phase / Context / Decision / Consequences / Alternatives / Related"
    - "CONTEXT.md progressive glossary: one section per phase, appendix table updated"
key_files:
  created:
    - docs/adr/009-progress-persistence.md
  modified:
    - CONTEXT.md
decisions:
  - "ADR 009 authored: surrogate text PK + unique index on (userId,nodeId) as upsert target"
  - "ADR 009: text() over pgEnum for masteryState/source — hyphen DDL safety + enum extensibility"
  - "ADR 009: source field designed at Phase 5 — manual|auto forward-compatible for Phase 7/8"
  - "ADR 009: fill-gaps server-wins one-time merge; wc3rm:merged dual-guard"
  - "ADR 009: per-node-only progress surface; gamification explicitly prohibited"
  - "CONTEXT.md: in-progress is now canonical mastery-state mid-value (D-03 reaffirmed)"
metrics:
  duration: "4min"
  completed: "2026-06-30"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 2
status: complete
---

# Phase 05 Plan 09: Close Phase — Glossary + ADR 009 Summary

**One-liner:** Extended CONTEXT.md with four Phase 5 domain terms and authored ADR 009 documenting the progress-persistence design (surrogate PK, text enum, source field, fill-gaps merge, no-gamification).

---

## What Was Built

**Task 1 (auto — complete):** Extended the root `CONTEXT.md` glossary and created `docs/adr/009-progress-persistence.md`.

### CONTEXT.md changes

- Bumped "Last updated" to Phase 05.
- Updated `mastery state` entry: `learning` → `in-progress` (D-03 canonical value reaffirmed); added note that `in-progress` is the canonical mid-state end-to-end with no translation layer.
- Added `## Progress & Mastery Terms (Phase 05)` section with four new terms:
  - `progress record` — atomic unit of persistence (node_progress row, keyed by users.id UUID + nodeId, surrogate PK)
  - `mastery source` — `source` field: `manual` (Phase 5) | `auto` (Phase 7/8 reserved); manual overrides auto (D-04)
  - `local progress` — signed-out mastery in `wc3rm:progress` localStorage; non-authoritative; cleared after merge (D-08)
  - `merge-on-sign-in` — one-time fill-gaps merge on first sign-in; server wins; guarded by `wc3rm:merged` flag; clears localStorage (D-07)
- Updated Appendix table with all four Phase 05 terms.

### ADR 009 (`docs/adr/009-progress-persistence.md`)

Covers all required design decisions in the established ADR-008 structure (Status / Context / Decision / Consequences / Alternatives Considered / Related Decisions):

1. **Surrogate text PK + unique index on `(userId, nodeId)`** — matches project convention; `onConflictDoUpdate` target; avoids composite-PK complexity and patchId-in-PK row explosion.
2. **`text()` over `pgEnum` for `masteryState` and `source`** — hyphen in `in-progress` risks DDL quoting issues (RESEARCH Pitfall 1); `ALTER TYPE` for future enum values is non-transactional; Zod owns constraint at app layer.
3. **Forward-designed `source` field** — `manual` only in Phase 5; `auto` reserved for Phase 7/8; always server-stamped; manual overrides auto (D-04).
4. **Patch stamping with `CURRENT_PATCH.id`** — server-side only; never client-supplied; enables Phase 9 staleness alerts (D-05).
5. **Principal-keyed `authedServerFn`** — builds on ADR 007; all five progress server functions keyed by `context.principal.id`; IDOR structurally impossible (D-06).
6. **Fill-gaps server-wins one-time merge** — `INSERT … ON CONFLICT DO NOTHING` for server-untouched nodes; dual-guard (`mergeInitiatedRef` + `wc3rm:merged`); localStorage cleared after (D-07).
7. **Per-node-only progress surface** — XP, streaks, leaderboards, aggregate counts, and completion percentages explicitly prohibited; any future aggregate display requires a new ADR (D-10, PROG-05).

---

## Task Completion

| Task | Name | Type | Status | Commit |
|------|------|------|--------|--------|
| 1 | Extend CONTEXT.md + author ADR 009 | auto | complete | c1d8767 |
| 2 | End-of-phase human verification | checkpoint:human-verify | awaiting human | — |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — this plan produces only documentation artifacts (CONTEXT.md + ADR 009). No runtime code was modified.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both artifacts are documentation-only. T-05-09a (audit trail) is mitigated by ADR 009. T-05-09b (human-verify false-positive guard) is addressed by the blocking checkpoint.

---

## Self-Check

- [x] `docs/adr/009-progress-persistence.md` exists with Status/Context/Decision/Consequences sections
- [x] `CONTEXT.md` carries `progress record`, `mastery source`, `local progress`, `merge-on-sign-in`
- [x] `CONTEXT.md` "Last updated" reads Phase 05
- [x] `mastery state` entry updated to `in-progress` (not `learning`)
- [x] ADR 009 names surrogate PK + unique index, text-over-pgEnum, source field, fill-gaps merge
- [x] Task 1 commit `c1d8767` verified in git log

## Self-Check: PASSED
