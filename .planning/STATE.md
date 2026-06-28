---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_phase_name: foundation-schema
status: executing
stopped_at: Completed 01-04 GPL-3.0-or-later licensing (LICENSE, ADR 004, SPDX convention)
last_updated: "2026-06-28T19:28:28.688Z"
last_activity: 2026-06-28
last_activity_desc: Phase 01 execution started
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 8
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy
**Current focus:** Phase 01 — foundation-schema

## Current Position

Phase: 01 (foundation-schema) — EXECUTING
Plan: 5 of 8
Status: Ready to execute
Last activity: 2026-06-28 — Phase 01 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation-schema P02 | 4m | 1 tasks | 2 files |
| Phase 01 P03 | 6m | 3 tasks | 5 files |
| Phase 01 P04 | 3 | 1 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 9 phases; content schema (Phase 1) hard prerequisite for all downstream phases
- Roadmap: Phase 8 (replay parsing) confirmed v1 scope per user decision; w3champions serves .w3g files at known rate limits
- Roadmap: QUIZ (Phase 6) kept separate from PROG (Phase 5) — distinct deliverable, fine granularity justified
- Roadmap: PATH requirements (Phase 9) deferred to final phase; pathway overlay infrastructure lives in Phase 2 graph engine
- [Phase ?]: Patch registry as deep module — PATCH_IDS authoritative source for all schema patchId fields
- [Phase ?]: Private _PATCHES array with readonly public view — callers use getPatch() or PATCH_IDS, never direct indexing
- [Phase ?]: CONTEXT.md authored with 17 domain terms
- [Phase ?]: ADR 001 stack choice authored
- [Phase ?]: ADR 002 content/graph decoupling authored
- [Phase ?]: ADR 003 patch registry primitive authored
- [Phase ?]: upgrade-policy.md authored
- [Phase ?]: GPL-3.0-or-later (not GPL-3.0-only) — human confirmed before LICENSE commit; wc3v compatibility rationale in ADR 004
- [Phase ?]: SPDX header convention: line-1 GPL-3.0-or-later identifier required on all hand-authored src/**/*.ts and src/**/*.tsx; routeTree.gen.ts exempt

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 7 (w3champions): API feasibility must be confirmed with w3champions team before integration code begins; manual fallback (Phase 5) ships regardless
- Phase 8 (replay parsing): Two spikes required before planning — (1) w3gjs parse time/memory on Vercel serverless; (2) w3champions replay endpoint functional test from external server + API token request
- Phase 4 (auth): better-auth + Battle.net OAuth has no community-validated examples as of June 2026; budget discovery time for region-specific OAuth host edge cases

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Race content | RACE-01..05 (race-specific branch nodes) | v2 | Roadmap creation |
| Community | COMM-01..03 (contribution UI, sharing, more pathways) | v2 | Roadmap creation |
| Detection | ADET-01..02 (finer matchup detection) | v2 | Roadmap creation |
| Reach | REACH-01..02 (mobile graph, public API) | v2 | Roadmap creation |

## Session Continuity

Last session: 2026-06-28T19:28:28.641Z
Stopped at: Completed 01-04 GPL-3.0-or-later licensing (LICENSE, ADR 004, SPDX convention)
Resume file: .planning/phases/01-foundation-schema/01-05-PLAN.md
