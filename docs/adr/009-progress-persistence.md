# ADR 009: Progress Persistence Design

**Status:** Accepted
**Date:** 2026-06-30
**Phase:** 05-progress-tracking

---

## Context

Phase 5 introduces server-side per-user mastery tracking. Players can manually
mark any node as `untouched`, `in-progress`, or `mastered` via the node detail
panel. Progress must survive browser refreshes and be accessible across devices
when signed in. Four design decisions for the persistence layer needed explicit
rationale so that Phases 7 and 8 (auto-detection via w3champions and replay
parsing) can build on Phase 5 without a migration.

### What needed deciding

1. **Progress table shape** — surrogate PK vs. composite PK; upsert strategy.
2. **Enum storage strategy** — Postgres `pgEnum` vs. plain `text()` for
   `masteryState` and `source`.
3. **Forward-designed `source` field** — should the distinction between manual
   and auto mastery be designed in now or deferred to Phase 7/8?
4. **Patch stamping** — how is the active patch ID recorded at write time?
5. **Authorization pattern** — how are progress server functions protected
   against IDOR?
6. **Pre-login progress** — how does localStorage-held progress merge into the
   account on first sign-in?
7. **No-gamification constraint** — what surfaces are explicitly prohibited?

---

## Decision

### 1. Surrogate text PK + unique index on `(userId, nodeId)`

The `node_progress` table uses a surrogate text primary key (`id: text("id").primaryKey()`),
consistent with the project-wide convention established in `src/db/schema.ts`.
A `UNIQUE INDEX` on `(userId, nodeId)` is the `onConflictDoUpdate` conflict
target for upsert operations.

**Why not a composite PK on `(userId, nodeId)` or `(userId, nodeId, patchId)`:**

- Composite PK is the `onConflictDoUpdate` target — `patchId` in the PK would
  mean each patch creates a new row instead of updating the existing one,
  accumulating historical rows rather than tracking current state. Phase 5
  wants "current mastery" per node, not a history log.
- A `(userId, nodeId)` composite PK (without `patchId`) works functionally but
  diverges from the project's surrogate-PK convention and makes the upsert
  `target` expression more verbose.
- Surrogate PK + unique index on `(userId, nodeId)` matches the existing
  schema convention and cleanly separates the identity key from the upsert
  target.

```typescript
// src/db/schema.ts
export const nodeProgress = pgTable(
  "node_progress",
  {
    id: text("id").primaryKey(),                    // surrogate
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    masteryState: text("mastery_state").notNull(),   // see §2
    source: text("source").notNull().default("manual"), // see §3
    patchId: text("patch_id").notNull(),             // see §4
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("progress_user_node_unique").on(table.userId, table.nodeId),
    index("progress_userId_idx").on(table.userId),
  ]
);
```

### 2. `text()` columns over `pgEnum` for `masteryState` and `source`

Both `masteryState` and `source` are stored as `text("…").notNull()`, with
validation enforced at the Zod layer (`MasteryStateSchema`, validated in every
server function before the DB write).

**Why not `pgEnum`:**

- The `in-progress` value contains a hyphen. Postgres requires quoting
  hyphenated enum labels in DDL (`"in-progress"`). Drizzle's `pgEnum` may not
  quote them correctly in all versions, risking a DDL parse error on migration
  (RESEARCH.md Pitfall 1).
- Adding a new enum value (e.g. `quiz-pending` for Phase 6 quiz-driven mastery)
  requires `ALTER TYPE … ADD VALUE` DDL, which is not transactional in Postgres
  and cannot be rolled back within a migration transaction. `text()` makes enum
  evolution a Zod-only change with no DDL cost.
- Validation responsibility belongs at the application boundary
  (`MasteryStateSchema.parse()` in the server function), not in the DB type
  system. This is consistent with the project's pattern of Zod-first validation
  across all schema layers.

### 3. Forward-designed `source` field (`manual` | `auto`)

The `source` field is present in the Phase 5 table from day one, even though
only `"manual"` is ever written in this phase. Phase 7/8 auto-detection (via
w3champions ladder data and replay parsing) will write `"auto"` without a
schema migration.

**Rationale (D-04):**

- A `manual` mark can override an `auto` state — the field is needed to
  distinguish them from Phase 7 onward.
- Designing it in now follows the same forward-design discipline as the
  `patchId` primitive (present on all schemas since Phase 1) — avoiding a
  Phase-7 migration and backfill on a live table with user data.
- `source` is always stamped server-side. The server function hardcodes
  `"manual"` and never reads `source` from the request body, so clients cannot
  claim `"auto"`.

### 4. Patch stamping with `CURRENT_PATCH.id` on write (D-05)

Every `setNodeMastery` call stamps the current patch onto the record:

```typescript
patchId: CURRENT_PATCH.id,   // from src/lib/patches.ts; never from client input
```

This records *when* (under which patch) a mastery state was last set. Phase 9
uses `patchId` vs. `CURRENT_PATCH.id` comparisons to surface staleness alerts
on volatile nodes. The value is always server-stamped — no client-supplied
`patchId` is accepted.

### 5. Principal-keyed `authedServerFn` for all progress writes (builds on ADR 007, D-06)

All progress server functions (`getUserProgress`, `setNodeMastery`,
`mergeProgressOnSignIn`) are built on the `authedServerFn` deep module
(`src/lib/auth-middleware.ts`). Every DB query is keyed by
`context.principal.id` — the UUID injected by `authMiddleware` from the
server-side session (ADR 007, D-11/D-12).

No `userId` is accepted as input on any progress server function. Cross-user
access is structurally impossible, not merely guarded by a check.

The handler extraction pattern (named exported function + server fn wrapper)
from `getUserProfileHandler` is applied to every progress handler for
testability without the TanStack Start runtime.

### 6. Fill-gaps server-wins one-time merge on first sign-in (D-07)

When a player signs in for the first time (or first time in a new session with
unmerged local progress), the `mergeProgressOnSignIn` server function runs:

1. Client sends all `wc3rm:progress` localStorage entries to the server.
2. Server inserts rows **only for nodes where no existing record exists**
   (`INSERT … ON CONFLICT DO NOTHING`). Nodes with an existing server record
   keep the server state — server wins.
3. On success, client sets `wc3rm:merged` in localStorage and clears
   `wc3rm:progress`.

**Why fill-gaps / server-wins (not last-write-wins or client-wins):**

- A returning player who already has server progress should not have local
  (pre-login) marks silently overwrite deliberate signed-in choices.
- The design accepts that pre-login marks on server-touched nodes are dropped
  (not surfaced). ROADMAP criterion 2 is satisfied because server-untouched
  nodes still merge in.
- No conflict-surfacing UI is added in Phase 5. The trade-off was explicitly
  accepted by the user.

**Merge guard:** both `mergeInitiatedRef` (intra-session flag, prevents re-
triggering during hot reload) and `isAlreadyMerged()` (reads `wc3rm:merged`
from localStorage, persists across reloads) are checked before firing the
merge. Without both guards, the merge would re-fire on every page load after
sign-in.

### 7. Per-node-only progress surface — no gamification (D-10, PROG-05)

Progress is intentionally surfaced in exactly two places:

1. **Graph node color / glow / badge** — the node's visual state on the canvas.
2. **Node detail panel mastery controls** — the three-state toggle shown when a
   node is selected.

Explicitly prohibited from this phase (and all future phases unless a new ADR
supersedes this):

- XP points, experience bars, or numeric scores.
- Streak counters (daily, weekly, or session-based).
- Global or pathway leaderboards.
- "X of Y mastered" aggregate counts anywhere in the UI.
- Completion percentage bars (pathway or total).

Pathway completion is a Phase 9 concern. Any aggregate progress display
requires a new ADR with an explicit rationale for why it does not undermine the
"substance of the guidance must stand on its own" core value.

---

## Consequences

**Positive:**

- **No Phase-7/8 migration.** The `source` and `patchId` fields are present
  from the first row; auto-detection phases write into the same table without
  schema changes.
- **Upsert is robust and atomic.** `onConflictDoUpdate` targeting the unique
  `(userId, nodeId)` index eliminates check-then-write races — the Postgres
  transaction handles INSERT vs. UPDATE in one round-trip.
- **IDOR structurally impossible.** `authedServerFn` principal-keyed queries
  (ADR 007) mean no progress server function can be abused to read or write
  another user's data.
- **Enum extensibility at zero DDL cost.** Adding `quiz-pending` (Phase 6) or
  a future `auto-pending` state is a Zod change only — no `ALTER TYPE` DDL on
  a live table.
- **One audit point for authorization.** All five progress server functions
  share the same `authedServerFn` authorization path; `src/lib/auth-middleware.ts`
  is the sole file to audit.

**Negative / trade-offs:**

- **App-layer enum constraint.** Using `text()` instead of `pgEnum` means the
  DB does not reject invalid `masteryState` values at the storage layer — a
  bug that bypasses Zod validation (e.g. direct SQL or a missing `.parse()`)
  can write an invalid value. The D-13 regression tests in
  `src/lib/auth-middleware.test.ts` and the server-function unit tests are the
  standing guards.
- **Pre-login marks on server-touched nodes are silently dropped.** The
  fill-gaps / server-wins merge does not surface dropped conflicts. A returning
  player who re-marks nodes while signed out before signing in will have those
  re-marks discarded if the server record already exists. Accepted trade-off
  for Phase 5 simplicity.
- **No progress history.** The surrogate PK + unique `(userId, nodeId)` design
  stores only the *current* mastery state, not a history of transitions. If a
  progression audit trail is needed in a future phase, a separate
  `node_progress_history` table would be required.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Composite PK on `(userId, nodeId)` | Diverges from the project's surrogate-PK convention; `onConflictDoUpdate` target is more verbose but functionally equivalent. |
| Composite PK on `(userId, nodeId, patchId)` | Each patch change would insert a new row instead of updating the existing one, creating unbounded row growth and breaking the "current mastery per node" mental model. |
| `pgEnum` for `masteryState` | Hyphen in `in-progress` risks DDL quoting issues in Drizzle-generated SQL (Pitfall 1). `ALTER TYPE` for future enum values is non-transactional. |
| Defer `source` field to Phase 7 | Would require `ALTER TABLE … ADD COLUMN source text` on a live table with user data, plus a backfill of all existing rows to `"manual"`. Forward-design is the established project discipline. |
| Client-supplied `patchId` | Would allow a client to forge the patch stamp. Server-only stamping from `CURRENT_PATCH.id` is the correct authorization pattern. |
| Client-wins merge | Pre-login marks could silently overwrite deliberate signed-in progress choices, violating user expectations and the "server is source of truth" invariant (D-08). |
| Last-write-wins merge by timestamp | Requires localStorage records to carry timestamps and the server to compare them — added complexity with no clear user benefit over the simpler server-wins rule. |
| Aggregate progress counts in UI | Explicitly out of scope per PROG-05. Would undermine the core value that "the substance of the guidance must stand on its own." |

---

## Related Decisions

- **D-03** — `in-progress` is the canonical mid-state value end-to-end; `"learning"` removed
- **D-04** — `source` field forward-designed at Phase 5; manual override of auto state possible
- **D-05** — `patchId` stamped server-side with `CURRENT_PATCH.id` on every write
- **D-06** — `authedServerFn` pattern; principal-keyed; no `userId` input on any progress fn
- **D-07** — fill-gaps server-wins one-time merge; `wc3rm:merged` guard
- **D-08** — server is source of truth when signed in; localStorage is signed-out cache only
- **D-09** — optimistic single-node re-render; rollback on error
- **D-10** — per-node-only progress surface; no gamification anywhere
- **PROG-01** — per-node mastery state tracked per user
- **PROG-02** — progress persisted server-side, tied to account
- **PROG-03** — pre-login progress in localStorage, merged on sign-in
- **PROG-05** — no XP, streaks, or leaderboards
- **ADR 001** — TanStack Start + Drizzle + Neon stack
- **ADR 007** — `authedServerFn` principal-keyed authorization convention (the authorization primitive this ADR builds on)
- **RESEARCH.md Pitfall 1** — pgEnum with hyphenated values; use `text()` + Zod
- **RESEARCH.md Pattern 1** — surrogate PK + unique index table shape
