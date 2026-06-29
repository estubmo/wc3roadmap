---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04
current_phase_name: auth-database
status: executing
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-06-29T16:25:02.924Z"
last_activity: 2026-06-29
last_activity_desc: Phase 04 execution started
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 34
  completed_plans: 28
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy
**Current focus:** Phase 04 — auth-database

## Current Position

Phase: 04 (auth-database) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-06-29 — Phase 04 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 27
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | - | - |
| 02 | 10 | - | - |
| 03 | 9 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation-schema P02 | 4m | 1 tasks | 2 files |
| Phase 01 P03 | 6m | 3 tasks | 5 files |
| Phase 01 P04 | 3 | 1 tasks | 3 files |
| Phase 01-foundation-schema P01-05 | 7 | 2 tasks | 6 files |
| Phase 01-foundation-schema P06 | 2m | 2 tasks | 2 files |
| Phase 01-foundation-schema P07 | 5min | 3 tasks | 6 files |
| Phase 01 P08 | 15min | 2 tasks | 1 files |
| Phase 02-graph-engine P01 | 5m | 3 tasks | 8 files |
| Phase 02-graph-engine P02 | 6m | 3 tasks | 6 files |
| Phase 02-graph-engine P03 | 7min | 2 tasks | 14 files |
| Phase 02-graph-engine P04 | 6m | 2 tasks | 4 files |
| Phase 02-graph-engine P05 | 8min | 3 tasks | 4 files |
| Phase 02-graph-engine P06 | 3min | 2 tasks | 2 files |
| Phase 02 P07 | 1m | 2 tasks | 2 files |
| Phase 02-graph-engine P09 | 3m | 2 tasks | 1 files |
| Phase 03 P02 | 8m | 3 tasks | 16 files |
| Phase 03-content-pipeline-node-panel P03 | 5min | 3 tasks | 5 files |
| Phase 03-content-pipeline-node-panel P04 | 3min | 2 tasks | 2 files |
| Phase 03-content-pipeline-node-panel P05 | 2min | 1 tasks | 2 files |
| Phase 03-content-pipeline-node-panel P07 | 6min | 2 tasks | 2 files |
| Phase 03 P08 | 6min | 2 tasks | 2 files |
| Phase 03-content-pipeline-node-panel P09 | 22m | 4 tasks | 4 files |
| Phase 04 P01 | 5m | 3 tasks | 7 files |

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
- [Phase ?]: NodeFrontmatterSchema extends NodeSummarySchema via .extend() — NodeSummary strict subset guaranteed at compile time per ADR 002
- [Phase ?]: patchId validated via z.enum(PATCH_IDS) on all three schemas — patch primitive spans node, threshold, and progress from day one (DATA-04)
- [Phase ?]: .planning/phases/01-foundation-schema/01-06-SUMMARY.md
- [Phase ?]: .planning/phases/01-foundation-schema/01-06-SUMMARY.md
- [Phase 01-foundation-schema]: detectCycles skips edges to unknown nodes — missing refs are validatePrerequisiteIds domain
- [Phase 01-foundation-schema]: validatePatchIds accepts validIds as parameter for pure testability without PATCH_IDS import
- [Phase 01-foundation-schema]: CI step order: build:content before validate is mandatory (RESEARCH Pitfall 4 — generated module dependency)
- [Phase ?]: vercel.json omitted — nitro() plugin provides zero-config Vercel detection (RESEARCH Pitfall 3)
- [Phase ?]: Deploy-early: live URL at D-12 (Phase 1) to surface deploy friction before feature work
- [Phase ?]: GraphDisplayNodeSchema extends NodeSummarySchema with difficulty only — sole graph-boundary addition (ADR 005)
- [Phase ?]: PathwaySchema uses .min(1) on all fields and steps array — validated pathway data contract (D-10)
- [Phase ?]: computeLayout uses named imports { Graph, layout } from @dagrejs/dagre over default import for explicitness
- [Phase ?]: graph-layout.ts uses relative ../schemas/graph import — vitest config lacks alias resolver for #/ prefix
- [Phase 02-graph-engine]: 8-step beginner pathway (supply-management → army-positioning) follows prereq DAG; roots before dependents
- [Phase 02-graph-engine]: validatePathwayStepIds pure fn mirrors validatePrerequisiteIds — no fs/content-collections imports, fully unit-testable
- [Phase 02-graph-engine]: Pathway integrity check wired into validate-content.ts main() as 4th validator — no new npm script, no CI workflow edit
- [Phase ?]: plan 03-02
- [Phase ?]: plan 03-02
- [Phase ?]: GraphDisplayNodeSchema extended with skillType + tags per ADR-006 (D-11, GRAPH-04); loader projection explicit field-by-field (ADR-002 rule)
- [Phase ?]: .planning/phases/03-content-pipeline-node-panel/03-06-SUMMARY.md
- [Phase ?]: NodeDetailPanel plan
- [Phase ?]: NodeDetailPanel plan
- [Phase 03]: Plan 03-09: filter dim must be applied to React Flow controlled nodes prop (filteredDisplayNodes), not just setNodes effect — prop is authoritative and re-syncs internal store each render
- [Phase 03]: Plan 03-09: mobile renders interactive RoadmapGraph (React Flow) on all viewports; MobileNodeList retired from Home route (retained for /preview/mobile)
- [Phase ?]: drizzle-orm pinned to 0.45.2 (not 0.44.x); drizzle-kit to 0.31.10 — version drift correction per RESEARCH Pitfall 6
- [Phase ?]: DATABASE_URL_DIRECT used in drizzle.config.ts (non-pooled) — pooled pgbouncer breaks drizzle-kit migrations (RESEARCH Pitfall 5)

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

Last session: 2026-06-29T16:25:02.920Z
Stopped at: Completed 04-01-PLAN.md
Resume file: None
