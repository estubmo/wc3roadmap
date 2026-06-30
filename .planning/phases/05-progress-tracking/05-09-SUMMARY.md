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
    - "createServerFn must be lexically visible at .handler() call site — no factory wrappers (L-01)"
    - "Neon DB client instantiated lazily via Proxy to avoid SSR module-init timing crash (L-02)"
key_files:
  created:
    - docs/adr/009-progress-persistence.md
    - .planning/phases/05-progress-tracking/LEARNINGS.md
  modified:
    - CONTEXT.md
    - docs/adr/009-progress-persistence.md (Verification Notes section appended post-checkpoint)
decisions:
  - "ADR 009 authored: surrogate text PK + unique index on (userId,nodeId) as upsert target"
  - "ADR 009: text() over pgEnum for masteryState/source — hyphen DDL safety + enum extensibility"
  - "ADR 009: source field designed at Phase 5 — manual|auto forward-compatible for Phase 7/8"
  - "ADR 009: fill-gaps server-wins one-time merge; wc3rm:merged dual-guard"
  - "ADR 009: per-node-only progress surface; gamification explicitly prohibited"
  - "CONTEXT.md: in-progress is now canonical mastery-state mid-value (D-03 reaffirmed)"
  - "L-01: createServerFn factory anti-pattern removed; all server fns declare createServerFn at definition site"
  - "L-02: Neon client lazy via Proxy — never call neon() at module scope in SSR-evaluated files"
metrics:
  duration: "15min"
  completed: "2026-06-30"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
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
| 2 | End-of-phase human verification | checkpoint:human-verify | PASSED (2026-06-30, Dauntless#2202) | — |

**Bug-fix commits (latent Phase 4 bugs surfaced during Task 2 verification):**

| Commit | Description |
|--------|-------------|
| `da0af1a` | fix(05): lazily instantiate Neon db client — `DATABASE_URL` read at handler time, not module load |
| `a4c4032` | fix(05): define authed server fns with `createServerFn` directly — compiler sees fn at definition site |

**Human verification results (all 5 ROADMAP Phase 5 criteria):**

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Mark + persist across sessions ("scouting" → Mastered; persisted on refresh) | PASS |
| 2 | localStorage merge on first sign-in ("army-positioning" merged; localStorage cleared; `wc3rm:merged` set) | PASS |
| 3 | Single-node re-render, no full reload (optimistic Zustand masteryMap update only) | PASS |
| 4 | No gamification (no XP/streak/leaderboard/aggregate counts anywhere in UI) | PASS |
| 5 | Server as source of truth (after `localStorage.clear()` + reload, server-persisted mastery still visible) | PASS |

---

## Deviations from Plan

Two latent Phase 4 bugs surfaced during the Phase 5 human-verification checkpoint — the first
time server functions were invoked from the client in a live browser session.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy Neon DB client (`da0af1a`)**
- **Found during:** Task 2 (end-of-phase human verification, first live client→server call)
- **Issue:** `neon(process.env.DATABASE_URL!)` called at module load time in `src/lib/db.ts`. During SSR module-graph init the `better-auth` import chain caused `db.ts` to be evaluated before the Nitro env injection populated `process.env.DATABASE_URL`. Result: `neon("")` — crash on any DB access from a server function.
- **Fix:** Replaced top-level client with a lazy `Proxy` that constructs the Neon client on first property access (inside a request handler where env is fully populated). Public API unchanged.
- **Files modified:** `src/lib/db.ts`
- **Verification:** All server functions reached the DB successfully during the human-verify flow
- **Committed in:** `da0af1a`

**2. [Rule 1 - Bug] `createServerFn` must be lexically visible at the call site (`a4c4032`)**
- **Found during:** Task 2 (end-of-phase human verification, first live client invocation of progress server fns)
- **Issue:** The `authedServerFn` factory from Phase 4 returned a builder from `createServerFn(opts).middleware([authMiddleware])`. TanStack Start's Vite compiler extracts server functions by statically matching `createServerFn(…).handler(…)` at the definition site. The factory hid `createServerFn` from the compiler — handlers compiled into the client bundle and ran in the browser. `process.env` and DB access failed immediately.
- **Fix:** Removed `authedServerFn` factory. All four progress server functions (`getUserProgress`, `setNodeMastery`, `mergeProgressOnSignIn`, `getUserProfile`) now declare `createServerFn({ method })` directly at their definition site. `authMiddleware` retained as middleware array entry.
- **Files modified:** `src/lib/auth-middleware.ts`, `src/server-fns/progress.ts`
- **Verification:** Progress server functions invoked from client ran on the server; DB writes persisted; human verification passed all 5 criteria
- **Committed in:** `a4c4032`

---

**Total deviations:** 2 auto-fixed (Rule 1 — latent Phase 4 bugs surfaced on first real client→server invocation)
**Impact on plan:** Both fixes required for the human-verify checkpoint to pass. No scope creep. Lessons captured in `LEARNINGS.md` (L-01, L-02).

---

## Known Stubs

None — this plan produces only documentation artifacts (CONTEXT.md + ADR 009). No runtime code was modified.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both artifacts are documentation-only. T-05-09a (audit trail) is mitigated by ADR 009. T-05-09b (human-verify false-positive guard) is addressed by the blocking checkpoint.

---

## Self-Check

- [x] `docs/adr/009-progress-persistence.md` exists with Status/Context/Decision/Consequences sections
- [x] ADR 009 Verification Notes section added (two bugs + createServerFn rule documented)
- [x] `CONTEXT.md` carries `progress record`, `mastery source`, `local progress`, `merge-on-sign-in`
- [x] `CONTEXT.md` "Last updated" reads Phase 05
- [x] `mastery state` entry updated to `in-progress` (not `learning`)
- [x] ADR 009 names surrogate PK + unique index, text-over-pgEnum, source field, fill-gaps merge
- [x] `LEARNINGS.md` created with L-01 (createServerFn factory anti-pattern) and L-02 (lazy Neon client)
- [x] Task 1 commit `c1d8767` verified in git log
- [x] Bug-fix commits `da0af1a` and `a4c4032` verified in git log
- [x] Task 2 human-verify checkpoint PASSED (all 5 ROADMAP Phase 5 criteria signed off)

## Self-Check: PASSED
