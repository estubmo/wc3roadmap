# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-07
**Phases:** 9 | **Plans:** 88 | **Tasks:** 138 | **Commits:** 435 | **Tests:** 541

### What Was Built
- Interactive React Flow node-graph with a guided Beginner Fundamentals pathway, mastery-state visuals, prerequisite edges, and staleness UI.
- 25-node science-backed content corpus — all `launch_ready` with verified per-node citations and a full anti-fabrication audit trail.
- Four converging, patch-aware mastery-detection sources on one store: manual, quiz, w3champions ladder auto-detect, and `.w3g` replay-signal parsing.
- Battle.net OAuth + Neon/Drizzle with a principal-keyed server-function authorization convention (ADR 007); anonymous progress that merges on first sign-in.
- Live on Vercel under GPL-3.0-or-later with share meta, `/about`, and a branded 404.

### What Worked
- **Schema-first, strict dependency ordering.** Phase 1 locking the Zod content schema (with the patch primitive present from the first commit) meant every downstream phase built on typed, validated data — near-zero schema churn later.
- **Deep-module discipline + ADRs.** 13 ADRs and CONTEXT.md kept coupling low and decisions auditable; the content/graph-engine decoupling (ADR 002) let content and UI evolve independently. The "parallel-schema-sync" pattern (mirror every schema field in content-collections) prevented an entire class of drift bugs.
- **Wave-based phased execution** with post-merge gates caught regressions immediately (e.g. the launch_ready/stale required-field fixture drift surfaced the moment it was introduced).
- **The milestone audit paid for itself.** It caught a genuine cross-phase gap — the entire `/replays` feature and `/about` shipped with no in-app navigation — that nine phases of green per-phase verification structurally could not surface. Nav/IA belonged to no single phase.

### What Was Inefficient
- **Content fabrication in the seed nodes.** The seed content contained 11 fabricated verbatim quotes, 2 mis-cited/nonexistent science references, and multiple unverifiable creator citations — all of which passed schema validation (schemas check shape, not truth). The project's *core value* (trustworthy, science-backed content) nearly shipped compromised; a late full-corpus integrity sweep was required to fix it.
- **Two orphaned routes survived 9 phases.** `/replays` (13 plans of work) was unreachable in-app until the milestone audit. Per-phase verification confirmed each phase's own code worked but never asked "can a user actually get here."
- **REPLAY-03 spike overridden against its own NO-GO.** The wc3v-integration spike recommended NO-GO; the override GO then hit an external proprietary-data wall (gitignored SLK cost tables + per-map pathing grids), costing a plan cycle before descoping to v1.x.
- **YAML `": "` scalar gotcha** silently dropped two authored nodes from the content build (unquoted scalars containing `": "` parse as mapping keys) — invisible until a gray-matter parse check found it.

### Patterns Established
- **Principal-keyed / `authedServerFn` server functions** (ADR 007) — the auditable standard for every user-data endpoint.
- **Patch-version as a system-wide primitive** (ADR 003) — one registry consumed by content, thresholds, replay stamping, and staleness UI.
- **`launch_ready` + `auditNote` content gate** — a hard, CI-enforceable readiness bar (`LAUNCH_GATE=1`) separate from shape validation.
- **Monotonic-max mastery writes** for evidence sources (quiz/auto/replay never downgrade), with manual check-off as the one intentional override.
- **Milestone integration audit** as a required close step — not optional even when all phases are green.

### Key Lessons
1. **Per-phase verification cannot catch cross-phase IA/navigation gaps.** Run a milestone integration audit before every milestone close; "every phase is green" ≠ "the product is reachable and coherent."
2. **Content integrity needs a gate as hard as code CI.** Schema validation proves shape, never truthfulness. Citations must be verified against real sources (URL-checked) as an explicit audit step — fabrication is invisible to Zod.
3. **Honor spike NO-GO recommendations, or time-box the override tightly.** The REPLAY-03 override burned a cycle discovering a wall the spike had already flagged.
4. **Quote unquoted YAML scalars containing `": "`.** Add a parse-check to the content pipeline so silent drops fail loudly.

### Cost Observations
- Model mix: not instrumented this milestone (primarily Opus-class for planning/execution/verification).
- Sessions: multiple (spanned several context windows / compactions); not precisely counted.
- Notable: the two most expensive corrections (content integrity sweep, orphaned-route fix) were both *trust/coherence* issues invisible to automated shape checks — the cheapest place to have caught them was a deliberate audit, which is exactly where they were caught.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 9 | 88 | Established GSD phased execution, deep-module + ADR discipline, and the milestone-audit close gate |

### Cumulative Quality

| Milestone | Tests | ADRs | Content nodes |
|-----------|-------|------|---------------|
| v1.0 | 541 | 13 | 25 launch-ready |

### Top Lessons (Verified Across Milestones)

1. Milestone integration audits catch what per-phase verification structurally cannot (established v1.0 — watch whether it recurs).
2. Shape validation is not truth validation — content/data correctness needs its own gate (established v1.0).
