# Phase 5: Progress Tracking - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Logged-in users manually set per-node mastery state (untouched / in-progress / mastered), persisted server-side via the Phase-4 `authedServerFn` principal-keyed pattern backed by a Drizzle progress table, patch-tagged with `CURRENT_PATCH`. Pre-login progress lives in `localStorage` and merges into the account on first sign-in. The graph re-renders only the affected node after a mark — no full-page reload. No gamification mechanics (XP, streaks, leaderboards) anywhere.

**In scope:** the progress Drizzle table + migration (keyed by user UUID, patch-tagged, with a `source` field); progress read/write server functions built on `authedServerFn`; the localStorage progress store + one-time fill-gaps merge on first sign-in; the marking UI in the node detail panel (full 3-state); replacing the `getMockMastery` seam with real progress data in the graph; reconciling the mastery-state vocabulary to `in-progress` end-to-end (schema enum migration `learning` → `in-progress`); optimistic single-node graph update on mark.

**Out of scope (own phases):** quiz-driven mastery (Phase 6); w3champions auto-detection / auto-advance (Phase 7); replay-parsing signals (Phase 8); pathway completion bar + aggregate progress visuals (Phase 9). This phase designs the `source` field *forward* for Phase 7/8 but builds none of their sync features.

</domain>

<decisions>
## Implementation Decisions

### Marking UX (PROG-04, UI hint=yes)
- **D-01:** Mastery controls live in the **node detail panel** (already opens on node click, Phase 3). No on-node toggle on the graph canvas — avoids per-node UI clutter and misclicks during pan/zoom.
- **D-02:** User selects the **full three states explicitly** — `untouched` / `in-progress` / `mastered` — via panel buttons. No binary toggle, no implicit auto-"in-progress" on open. The user owns every transition manually in this phase (auto transitions arrive in Phase 6/7/8).

### Mastery-state vocabulary (cross-cutting cleanup)
- **D-03:** Canonical state value is **`in-progress` everywhere** — DB column value, Zod enum, code, and user-facing copy all use the same term. Migrate `src/schemas/progress.ts` `MasteryStateSchema` from `["untouched","learning","mastered"]` to `["untouched","in-progress","mastered"]` this phase. No value↔label translation layer. (Resolves the existing schema-vs-UI mismatch: `mock-mastery.ts` / `MasteryBadge` already use `in-progress`.)

### Persistence & source tracking (PROG-01, PROG-02)
- **D-04:** The progress record gains a **`source` field now** (`manual` | `auto`), designed into the Phase-5 table/schema even though only `manual` is written this phase. Phase 7/8 auto-detection writes `auto`; manual marks coexist with future auto marks and **a manual mark can override an auto state**. Avoids a Phase-7 migration + backfill and matches the project's "patch-from-day-one" forward-design discipline. (Supports Phase 7 ROADMAP criterion: auto changes must read as "distinct from manual check-off".)
- **D-05:** `ProgressRecordSchema.userId` (currently `z.string()` placeholder) becomes the **users-table UUID** (Phase-4 D-04). Progress is patch-tagged with `CURRENT_PATCH` on write.
- **D-06:** Every progress server function is built on the **`authedServerFn` deep module** (Phase-4 D-11/D-12), keyed exclusively by `context.principal.id`. No `userId` is ever accepted as input. `src/server/user-profile.ts` (`getUserProfileHandler`) is the exact template to copy.

### localStorage merge (PROG-03)
- **D-07:** **Server wins**, via **fill-gaps merge, one-time, then clear.** On the user's *first* sign-in only: localStorage progress fills only nodes the account has **not** touched; any node where the server already has a record keeps the **server** state; localStorage is **cleared after** the merge completes. Honors ROADMAP criterion 2 ("no prior progress silently discarded") for server-untouched nodes while keeping the server authoritative for deliberate signed-in marks. No conflict-surfacing UI this phase.
- **D-08:** Signed-out, localStorage is the store; signed-in, the server is the source of truth and the client holds a cache (ROADMAP criterion 5 — clearing localStorage as an auth user and reopening shows the same server state).

### Update feel (ROADMAP criterion 3)
- **D-09:** Marking is **optimistic** — the affected node re-renders immediately, the server write happens async (rollback on failure). Only the single marked node re-renders (not the whole graph). Wire through the existing Zustand `graph-store` / the `getMockMastery` seam in `RoadmapGraph.tsx`.

### No gamification (PROG-05, ROADMAP criterion 4)
- **D-10:** Progress is surfaced **per-node only** — node color on the graph + state in the detail panel. **No counts, no aggregates** anywhere this phase (no "X of Y mastered", no pathway %). Pathway completion is explicitly a Phase-9 concern. Strictest reading of "no gamification".

### Claude's Discretion
- **Drizzle progress table shape** — exact columns/indexes/constraints (composite PK on `userId`+`nodeId`+`patchId` vs surrogate key, upsert strategy), and the migration mechanics — left to research/planning, constrained by D-04/D-05.
- **localStorage schema + store module** — the signed-out progress store's shape and where it lives — Claude's call, constrained by D-07/D-08.
- **TanStack Query wiring** — query/mutation keys, optimistic-update cache strategy, invalidation — planner's call, constrained by D-09.
- **Schema-enum migration handling** — whether any existing data needs migrating for the `learning`→`in-progress` rename (likely none — no progress persisted yet) — confirm in planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & acceptance bar
- `.planning/ROADMAP.md` §"Phase 5: Progress Tracking" — goal + 5 success criteria (the acceptance bar; criterion 2 = localStorage merge, criterion 3 = single-node re-render, criterion 4 = no gamification, criterion 5 = server is source of truth).
- `.planning/REQUIREMENTS.md` — PROG-01..PROG-05 (§"Progress").
- `.planning/PROJECT.md` — core value + constraints + out-of-scope.

### Stack / architecture (authoritative)
- `.claude/CLAUDE.md` — pinned stack: TanStack Start server functions (`createServerFn`), TanStack Query 5.x (optimistic updates, staleTime), Drizzle 0.45.x + `@neondatabase/serverless`, Zustand for graph UI state.
- `docs/adr/001-stack-choice.md` — locks the stack.
- `docs/adr/004-gpl3-licensing.md` — SPDX `GPL-3.0-or-later` header on every new source file.
- `.agents/skills/codebase-design/SKILL.md` — deep-module vocabulary; apply to the progress persistence module.
- `.agents/skills/improve-codebase-architecture/SKILL.md` — deepening discipline (cross-cutting constraint).
- `CONTEXT.md` (repo root) — domain language; extend with Phase-5 terms (progress record, mastery source) and record significant choices as ADR(s) in `docs/adr/` (numbering continues from the existing 008).

### Existing code touched/extended
- `src/schemas/progress.ts` — `ProgressRecordSchema` + `MasteryStateSchema`; enum migration to `in-progress` (D-03), add `source` field (D-04), `userId` → UUID (D-05).
- `src/server/user-profile.ts` — the `authedServerFn` consumer template to copy for progress server fns (D-06).
- `src/lib/auth-middleware.ts` — `authedServerFn` + `AuthedContext` (the authorization primitive).
- `src/db/schema.ts` — Drizzle schema; add the progress table here.
- `src/lib/db.ts` — db singleton.
- `src/lib/mock-mastery.ts` + `src/components/graph/RoadmapGraph.tsx` (`getMockMastery` at lines ~50/151/211) — the seam real progress replaces (D-09).
- `src/lib/graph-store.ts` — Zustand UI store (mastery surfaced through here / the node `data.masteryState`).
- `src/components/graph/MasteryBadge.tsx` — already uses `in-progress` vocabulary.
- `src/lib/patches.ts` — `CURRENT_PATCH` / `PATCH_IDS` for stamping progress.

### Prior context
- `.planning/phases/04-auth-database/04-CONTEXT.md` — auth/identity/session + `authedServerFn` decisions (D-01..D-14); the identity key Phase 5 consumes.
- `.planning/phases/01-foundation-schema/01-CONTEXT.md` — schema set (incl. progressRecord), patch registry.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/user-profile.ts` — exact `authedServerFn` server-fn template (named handler exported for testability, principal-keyed). Copy this shape for progress read/write fns.
- `src/lib/auth-middleware.ts` — `authedServerFn` factory + `AuthedContext`; the only authorization path.
- `src/schemas/progress.ts` — `ProgressRecordSchema` / `MasteryStateSchema` already patch-tagged; the slots for the UUID, `source` field, and enum rename.
- `src/lib/mock-mastery.ts` — `getMockMastery(nodeId)` is the single read seam consumed by `RoadmapGraph.tsx` (graceful "untouched" default); swap implementation, keep the call sites stable.
- `src/lib/graph-store.ts` — Zustand store pattern for graph UI; mastery flows to nodes via `data.masteryState`.
- `src/lib/patches.ts` — `CURRENT_PATCH` for write-time patch stamping.

### Established Patterns
- **authedServerFn is THE pattern** — every user-data server fn copies it; principal-keyed by construction, no `userId` input channel (Phase-4 D-11/D-12, ROADMAP P4 criterion 3 has a regression test).
- TanStack Start 1.168.26, React 19, Zod 4.x strict, Drizzle + Neon. TanStack Query 5.x for client cache + optimistic updates.
- SPDX `GPL-3.0-or-later` header on every new source file.
- `getMockMastery` returns "untouched" for unknown IDs — preserve this graceful default when wiring real data.

### Integration Points
- progress server fn ↔ `authedServerFn` ↔ Drizzle progress table ↔ Neon (new table).
- graph ↔ progress: `getMockMastery` seam → real per-user progress map → node `data.masteryState` → single-node optimistic re-render (D-09).
- signed-out localStorage store → one-time fill-gaps merge server fn on first sign-in (D-07) → server authoritative thereafter (D-08).
- progress write ↔ `CURRENT_PATCH` stamping; `source: "manual"` written this phase, `source: "auto"` reserved for Phase 7/8.

</code_context>

<specifics>
## Specific Ideas

- User confirmed the `learning`→`in-progress` rename should make `in-progress` canonical **end-to-end** (DB value + code + copy) — one source of truth, no translation layer. This is a deliberate cleanup of the pre-existing schema-vs-UI drift, not just a label change.
- User wants the `source` field designed in **now** so Phase 7/8 auto-detection needs no migration — same forethought as the patch-version primitive being present from the first schema commit. Manual override of an auto state must be possible.
- Merge is deliberately **server-wins / fill-gaps / one-time / clear-after** — the user accepts that conflicting pre-login marks on server-touched nodes are dropped (not surfaced), in exchange for simplicity; criterion 2 is satisfied because server-untouched nodes still merge.

</specifics>

<deferred>
## Deferred Ideas

- **Aggregate progress / "X of Y mastered" count** — explicitly excluded this phase (D-10). Pathway completion % is Phase 9; any neutral global count would be a later, separately-justified decision.
- **Conflict-surfacing merge UI** (showing the user which local marks were dropped) — considered and declined for Phase 5 (D-07); could revisit if merge data-loss becomes a real complaint.
- **Quiz-driven mastery** (`source` could later include a quiz origin) — Phase 6.
- **w3champions auto-advance** writing `source: "auto"` — Phase 7 (the field is designed here, written there).
- **Replay-detected mastery** — Phase 8.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Progress Tracking*
*Context gathered: 2026-06-30*
