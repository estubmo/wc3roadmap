---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: Self-Assessment Quizzes
status: executing
stopped_at: Phase 6 context gathered
last_updated: "2026-06-30T20:51:51.318Z"
last_activity: 2026-06-30
last_activity_desc: Phase 06 execution started
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 54
  completed_plans: 47
  percent: 56
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-28)

**Core value:** The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy
**Current focus:** Phase 06 — Self-Assessment Quizzes

## Current Position

Phase: 06 (Self-Assessment Quizzes) — EXECUTING
Plan: 5 of 11
Status: Ready to execute
Last activity: 2026-06-30 — Phase 06 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 43
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 8 | - | - |
| 02 | 10 | - | - |
| 03 | 9 | - | - |
| 04 | 7 | - | - |
| 05 | 9 | - | - |

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
| Phase 04-auth-database P03 | 40m | 3 tasks | 5 files |
| Phase 04 P04 | 10m | 2 tasks | 3 files |
| Phase 04-auth-database P05 | 9m | 3 tasks | 3 files |
| Phase 04-auth-database P06 | 2m | 2 tasks | 2 files |
| Phase 04-auth-database P07 | 6m | 2 tasks | 3 files |
| Phase 05-progress-tracking P01 | 3min | - tasks | - files |
| Phase 05 P02 | 7min | 3 tasks | 4 files |
| Phase 05-progress-tracking P03 | 3min | 3 tasks | 2 files |
| Phase 05 P04 | 6m | 2 tasks | 2 files |
| Phase 05 P05 | 3min | 3 tasks | 4 files |
| Phase 05 P07 | 4m | - tasks | - files |
| Phase 05 P08 | 2m | 2 tasks | 2 files |
| Phase 05 P09 | 5m | 2 tasks | 2 files |
| Phase 06 P01 | 5m | 3 tasks | 3 files |
| Phase 06 P02 | 6m | 2 tasks | 2 files |
| Phase 06 P03 | 2m | 2 tasks | 2 files |
| Phase 06 P04 | 2m | 2 tasks | 2 files |

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
- [Phase ?]: mapBattlenetProfile exported as named function — same function tested and used at runtime
- [Phase ?]: usePlural: true in drizzleAdapter — schema JS keys are plural, better-auth model names are singular
- [Phase ?]: overrideUserInfo: true on battlenet OAuth config — refreshes BattleTag on re-login while UUID stays stable (D-08)
- [Phase ?]: generateId: () => crypto.randomUUID() — UUID v4 enforced for stable Phase 5 progress key (D-04)
- [Phase ?]: server.handlers GET+POST in one catch-all auth route dollar.ts — per RESEARCH Anti-Patterns
- [Phase ?]: getUserProfileHandler exported as named fn for testability without TanStack Start runtime
- [Phase ?]: AuthedContext type exported from auth-middleware.ts — typed handler params
- [Phase ?]: authMiddleware.options.server() is correct test call for registered middleware handler (not .server() chaining method)
- [Phase ?]: onOpenRegion callback on SignInButton decouples button from dialog state
- [Phase ?]: DiceBear 9.x initials URL resolves Pitfall 2 (no Battle.net avatar API)
- [Phase ?]: RegionSelector onInteractOutside preventDefault blocks outside-click; ESC allowed
- [Phase ?]: SiteHeader returns React fragment wrapping header + RegionSelector — dialog ownership stays in component
- [Phase ?]: isPending renders null (empty slot) to prevent CTA flash on refresh (AUTH-02 / T-04-06b)
- [Phase ?]: ADR 007: principal-keyed authedServerFn convention is the auditable standard for all user-data server functions
- [Phase ?]: ADR 008: global Battle.net OAuth endpoint (Assumption A1) with documented per-region fallback; LOW-MEDIUM confidence; EU/KR spike required before live rollout
- [Phase ?]: sonner.tsx: removed next-themes (not installed); hardcoded theme=dark — project is dark-mode only
- [Phase ?]: toggle.tsx: removed 'use client' directive — matches shadcn convention in this project
- [Phase ?]: D-03 in-progress canonical: MasteryStateSchema enum is [untouched,in-progress,mastered] — learning removed; single vocabulary layer
- [Phase ?]: D-04 source field: z.enum([manual,auto]).default(manual) on ProgressRecordSchema; 05-04 server fn hardcodes manual
- [Phase ?]: mock-mastery.ts re-exports MasteryState from schemas/progress — single source of truth for MasteryState type
- [Phase ?]: TEXT not pgEnum for masteryState — hyphen in 'in-progress' breaks pgEnum DDL; MasteryStateSchema owns constraint at app layer
- [Phase ?]: Surrogate PK + uniqueIndex(userId,nodeId) in node_progress — onConflictDoUpdate upsert target for 05-04 setNodeMastery (T-05-03a)
- [Phase ?]: source + patchId designed in at 05-03 (D-04, D-05) — server-stamped only, avoids Phase-7 migration when auto-detection ships
- [Phase ?]: authedServerFn .validator() required for POST — without it TanStack Start types data as undefined
- [Phase ?]: vi.doMock() + resetModules() for progress tests — vi.mock() TDZ blocks module-level const captures
- [Phase ?]: ProgressProvider wraps graph content; EmptyState intentionally outside
- [Phase ?]: mergeInitiatedRef + isAlreadyMerged() dual-guard for one-time merge (intra-session + cross-reload)
- [Phase ?]: masteryMap subscription placed before displayNodes useMemo — eliminates TS2448 (05-08)
- [Phase ?]: MasteryControls mounts above How-to-Apply via existing gap-20px flex container — D-01 (05-08)
- [Phase ?]: ADR 009: progress-persistence design (surrogate PK, text enum, source field, fill-gaps merge, no-gamification)
- [Phase ?]: CONTEXT.md Phase 05: four domain terms added (progress record, mastery source, local progress, merge-on-sign-in); in-progress reaffirmed as canonical mastery-state mid-value (D-03)
- [Phase ?]: QuizSchema parallel-schema sync (D-01, QUIZ-01, QUIZ-03, D-04)
- [Phase ?]: 06-03

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

Last session: 2026-06-30T20:51:51.312Z
Stopped at: Phase 6 context gathered
Resume file: .planning/phases/06-self-assessment-quizzes/06-CONTEXT.md
