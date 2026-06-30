# Phase 5: Progress Tracking - Research

**Researched:** 2026-06-30
**Domain:** Progress persistence, optimistic updates, localStorage merge, schema migration
**Confidence:** MEDIUM

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Mastery controls live in the **node detail panel**. No on-node toggle on the graph canvas.
- **D-02:** User selects the **full three states explicitly** — `untouched` / `in-progress` / `mastered` — via panel buttons. No binary toggle, no implicit auto-"in-progress" on open.
- **D-03:** Canonical state value is **`in-progress` everywhere** — DB column value, Zod enum, code, and user-facing copy. Migrate `MasteryStateSchema` from `["untouched","learning","mastered"]` to `["untouched","in-progress","mastered"]` this phase. No value↔label translation layer.
- **D-04:** The progress record gains a **`source` field now** (`manual` | `auto`), designed into the Phase-5 table/schema even though only `manual` is written this phase. Manual mark can override an auto state.
- **D-05:** `ProgressRecordSchema.userId` becomes the **users-table UUID** (Phase-4 D-04). Progress is patch-tagged with `CURRENT_PATCH` on write.
- **D-06:** Every progress server function is built on the **`authedServerFn` deep module**, keyed exclusively by `context.principal.id`. No `userId` is ever accepted as input. `getUserProfileHandler` is the exact template.
- **D-07:** **Server wins**, via **fill-gaps merge, one-time, then clear.** On the user's first sign-in only: localStorage fills only nodes the account has not touched; server state wins on conflict; localStorage is cleared after merge.
- **D-08:** Signed-out → localStorage is the store; signed-in → server is the source of truth; client holds a TanStack Query cache.
- **D-09:** Marking is **optimistic** — affected node re-renders immediately, server write async, rollback on failure. Only the single marked node re-renders.
- **D-10:** Progress surfaced **per-node only** — node color + panel state. **No counts, no aggregates** anywhere this phase.

### Claude's Discretion

- **Drizzle progress table shape** — exact columns/indexes/constraints (composite PK vs surrogate key, upsert strategy).
- **localStorage schema + store module** — shape and location of the signed-out progress store.
- **TanStack Query wiring** — query/mutation keys, optimistic-update cache strategy, invalidation.
- **Schema-enum migration handling** — confirm no data migration needed (no progress table exists yet).

### Deferred Ideas (OUT OF SCOPE)

- Aggregate progress / "X of Y mastered" count — Phase 9
- Conflict-surfacing merge UI — declined for Phase 5
- Quiz-driven mastery — Phase 6
- w3champions auto-advance writing `source: "auto"` — Phase 7
- Replay-detected mastery — Phase 8
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROG-01 | Per-node mastery state tracked per user | `nodeProgress` Drizzle table + `getUserProgress` server fn; Zustand `masteryMap` |
| PROG-02 | Progress persists server-side, tied to account | `authedServerFn` `setNodeMastery`; upsert via `onConflictDoUpdate`; FK → `users.id` UUID |
| PROG-03 | Pre-login progress stored in localStorage, merges on sign-in | `local-progress.ts` store module; `mergeProgressOnSignIn` server fn; fill-gaps strategy |
| PROG-04 | User can manually mark any node's mastery state | `MasteryControls` component; shadcn `toggle-group`; `sonner` toast on error |
| PROG-05 | No XP, streaks, or leaderboards | Per-node only; no aggregates; no count copy anywhere; UI-SPEC enforcement |
</phase_requirements>

---

## Summary

Phase 5 wires real per-user progress persistence into the graph using three coordinated layers: a new `nodeProgress` Drizzle table (keyed by `userId` + `nodeId`, patch-tagged, with a forward-designed `source` field), two `authedServerFn` server functions for read and upsert, and a Zustand `masteryMap` that drives the single-node optimistic re-render already baked into `RoadmapGraph.tsx`.

The `getMockMastery` seam in `RoadmapGraph.tsx` is the central integration point — it already exists as a clean replacement target at two call sites (lines ~151 and ~211). Phase 5 removes the mock and replaces it with the Zustand `masteryMap`, populated from TanStack Query on mount. The optimistic update flow (mark → Zustand update → server write → rollback on error) keeps the graph reactive without a full re-render.

The schema cleanup task (`learning` → `in-progress` in `MasteryStateSchema`) is minor — no DB migration needed since no progress records exist yet. However it requires updating the test in `src/schemas/progress.test.ts` which currently asserts `"learning"` as valid.

**Primary recommendation:** Surrogate PK on `nodeProgress` + UNIQUE INDEX on `(userId, nodeId)` as the `onConflictDoUpdate` target. This matches the established project pattern (`id: text("id").primaryKey()`) and avoids composite-PK upsert complexity.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Progress persistence | API / Backend (server fn) | Database | `authedServerFn` owns the write/read path; Drizzle+Neon holds the record |
| Optimistic display update | Browser / Client (Zustand) | — | `masteryMap` in `graph-store.ts` drives the immediate node re-render |
| TanStack Query cache | Browser / Client | Frontend Server (SSR) | Query hydrated on client; SSR-safe guard needed for localStorage reads |
| localStorage store (signed-out) | Browser / Client | — | Client-only — must guard with `typeof window !== 'undefined'` |
| First-sign-in merge | API / Backend (server fn) | Browser / Client | Server fn does the fill-gaps merge; client triggers it on session establishment |
| Mastery state validation | API / Backend + Browser | — | Zod validates at both layers (server fn input + client schema) |
| No-gamification enforcement | All tiers | — | Design constraint: no count/aggregate rendering anywhere in UI |

---

## Standard Stack

### Core (all already installed — no new installs except `sonner`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.2 [VERIFIED: npm registry] | ORM for `nodeProgress` table + upsert | Project-locked; edge-compatible with Neon HTTP driver |
| `drizzle-kit` | 0.31.10 [VERIFIED: npm registry] | Schema migration (generate + migrate) | Paired with drizzle-orm; generates SQL diffs from schema.ts |
| `@tanstack/react-query` | 5.101.2 [VERIFIED: npm registry] | `useQuery` for progress load + `useMutation` for optimistic mark | Project-locked; already used for w3champions API caching |
| `@tanstack/react-start` | 1.168.26 [VERIFIED: npm registry] | `createServerFn` / `authedServerFn` for server-side progress R/W | Project-locked; established in Phase 4 |
| `zustand` | 5.0.14 [VERIFIED: npm registry] | `masteryMap` in `graph-store.ts` for single-node optimistic re-render | Project-locked; already owns graph UI state |
| `zod` | 4.4.3 [VERIFIED: npm registry] | `MasteryStateSchema` enum validation; `ProgressRecordSchema` | Project-locked; Zod 4.x used across all schemas |
| `@neondatabase/serverless` | 1.1.0 [VERIFIED: npm registry] | Neon HTTP driver for DB queries | Project-locked; required for Vercel edge deploy |

### New Package (Phase 5 installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sonner` | 2.0.7 [VERIFIED: npm registry] | Toast notifications for error rollback + merge success | shadcn official integration; 44M weekly downloads; required by UI-SPEC |

### Supporting (shadcn CLI additions — not npm installs)

| Component | Method | Purpose |
|-----------|--------|---------|
| `toggle-group` | `npx shadcn add toggle-group` | 3-state mastery selector in `MasteryControls` |
| `sonner` (shadcn wrapper) | `npx shadcn add sonner` | Installs `sonner` npm pkg + shadcn Toaster wrapper |

**Installation:**

```bash
# The only npm install needed for Phase 5
npm install sonner

# shadcn component additions (CLI copies source to src/components/ui/)
npx shadcn add toggle-group sonner
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| `sonner` | npm | ~3 yrs (2022) | 44,987,438 | github.com/emilkowalski/sonner | OK | Approved |
| `@tanstack/react-query` | npm | 5+ yrs | 58,541,863 | github.com/TanStack/query | SUS (too-new flag) | Approved — false positive; 58M downloads/week; established TanStack org; already pinned in project as ^5.101.2 |
| `@tanstack/react-start` | npm | 1+ yr | 17,411,349 | github.com/TanStack/router | SUS (too-new flag) | Approved — false positive; 17M downloads/week; already installed and pinned in project |
| `drizzle-orm` | npm | 3+ yrs | 11,333,091 | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `drizzle-kit` | npm | 3+ yrs | 9,447,847 | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `zustand` | npm | 5+ yrs | 41,812,747 | github.com/pmndrs/zustand | OK | Approved |

**Packages removed due to SLOP verdict:** none

**Packages flagged SUS:** `@tanstack/react-query` and `@tanstack/react-start` — flagged as "too-new" by the seam because their latest patch was published within 30 days. Both are already installed in the project at pinned versions, have millions of weekly downloads, and come from the verified TanStack GitHub org. False positives — no checkpoint needed.

---

## Architecture Patterns

### System Architecture Diagram

```
[User clicks mastery button in panel]
         │
         ▼
[MasteryControls.tsx]
  ToggleGroup onChange
         │
  ┌──────┴──────────────────────────────────────────────────┐
  │                                                         │
  ▼ (1) optimistic                                         ▼ (2) server write
[graph-store.ts]                                  [TanStack Query useMutation]
masteryMap[nodeId] = newState                      mutationFn: setNodeMastery()
         │                                                   │
         ▼                                         ┌─────────┴──────────┐
[RoadmapGraph.tsx]                                 │                    │
getMasteryFromStore(id)                       success              error
→ GraphNode re-renders                             │                    │
  (only affected node,                        invalidate          rollback:
   React.memo guards rest)                    progressKeys        graph-store
                                                   │               → show toast
                                             [Neon DB]
                                             nodeProgress upsert
                                             (userId, nodeId, state, source, patchId)

[On first sign-in]
[local-progress.ts].getLocalProgress()
         │
         ▼
[mergeProgressOnSignIn server fn]
  (authedServerFn POST)
  fill-gaps: insert rows server has no record for
  set 'wc3rm:merged' flag
         │
         ▼
[TanStack Query invalidate progressKeys]
[localStorage cleared]
[show merge toast if any merged]
```

### Recommended Project Structure

```
src/
├── db/
│   ├── schema.ts              # ADD: nodeProgress table
│   └── migrations/
│       └── 0001_progress.sql  # generated by drizzle-kit generate
├── schemas/
│   └── progress.ts            # EDIT: learning → in-progress, add source field
├── server/
│   ├── user-profile.ts        # existing template
│   └── progress.ts            # NEW: getUserProgress + setNodeMastery server fns
├── lib/
│   ├── local-progress.ts      # NEW: localStorage store module (SSR-safe)
│   ├── progress-keys.ts       # NEW: TanStack Query key factory
│   ├── graph-store.ts         # EDIT: add masteryMap + setNodeMastery action
│   └── mock-mastery.ts        # EDIT: keep file, mark as deprecated in Phase 5
├── hooks/
│   └── useProgressMutation.ts # NEW: useMutation wrapper with optimistic logic
└── components/graph/
    ├── MasteryControls.tsx    # NEW: ToggleGroup + source attribution
    ├── MasteryBadge.tsx       # EDIT: "Learning" → "In Progress"
    ├── GraphNode.tsx          # EDIT: masteryState from store, not getMockMastery
    ├── NodePanelContent.tsx   # EDIT: mount MasteryControls at top
    └── RoadmapGraph.tsx       # EDIT: replace getMockMastery calls with store
```

### Pattern 1: Drizzle Progress Table (Claude's Discretion — surrogate PK + unique index)

**Recommendation:** Surrogate text PK + UNIQUE INDEX on `(userId, nodeId)`. Matches the existing project convention (`id: text("id").primaryKey()`), and the UNIQUE INDEX becomes the `onConflictDoUpdate` target cleanly.

**What:** `nodeProgress` table with surrogate PK, composite unique constraint for upsert, FK to `users`, text mastery columns.

```typescript
// Source: project/codebase-verified pattern from src/db/schema.ts
// [CITED: src/db/schema.ts — established column/index conventions]
export const nodeProgress = pgTable(
  "node_progress",
  {
    id: text("id").primaryKey(), // surrogate — matches project convention
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    masteryState: text("mastery_state").notNull(), // text, not pgEnum — see Pitfall 1
    source: text("source").notNull().default("manual"), // "manual" | "auto" — D-04
    patchId: text("patch_id").notNull(), // CURRENT_PATCH.id stamped on write — D-05
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Upsert target: only one record per (user, node)
    uniqueIndex("progress_user_node_unique").on(table.userId, table.nodeId),
    // Bulk fetch index: load all progress for a user in one query
    index("progress_userId_idx").on(table.userId),
  ]
);
```

### Pattern 2: Upsert with `onConflictDoUpdate`

**What:** Insert-or-update one progress record using the unique (userId, nodeId) constraint as the conflict target.

**When to use:** Every `setNodeMastery` call — user may be marking a node for the first time (INSERT) or updating an existing state (UPDATE). Always upsert, never insert-only.

```typescript
// Source: [ASSUMED] Drizzle ORM onConflictDoUpdate pattern
// [CITED: drizzle.config.ts — confirmed non-pooled connection for writes]
import { sql } from "drizzle-orm";
import { CURRENT_PATCH } from "#/lib/patches";
import { crypto } from "#/lib/crypto-utils"; // or: crypto.randomUUID()

await db
  .insert(nodeProgress)
  .values({
    id: crypto.randomUUID(),
    userId: principal.id, // D-06: from context, never from input
    nodeId: input.nodeId,
    masteryState: input.masteryState,
    source: "manual", // D-04: only "manual" this phase
    patchId: CURRENT_PATCH.id, // D-05: patch-stamp on write
  })
  .onConflictDoUpdate({
    target: [nodeProgress.userId, nodeProgress.nodeId], // unique index target
    set: {
      masteryState: sql`excluded.mastery_state`,
      source: sql`excluded.source`,
      patchId: sql`excluded.patch_id`,
      updatedAt: sql`now()`,
    },
  });
```

### Pattern 3: authedServerFn for Progress (copy of getUserProfile template)

**What:** Progress server functions follow the exact `getUserProfileHandler` template — exported named handler + server fn wrapper.

```typescript
// Source: [CITED: src/server/user-profile.ts — established authedServerFn template]
// src/server/progress.ts

import { eq } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress } from "#/db/schema";
import { authedServerFn, type AuthedContext } from "#/lib/auth-middleware";
import { z } from "zod";
import { MasteryStateSchema } from "#/schemas/progress";

// READ: all progress for the authenticated user
export async function getUserProgressHandler({ context }: AuthedContext) {
  const { principal } = context;
  return db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
}
export const getUserProgress = authedServerFn({ method: "GET" }).handler(
  getUserProgressHandler
);

// WRITE: upsert one node's mastery state (principal-keyed, D-06)
const SetNodeMasteryInput = z.object({
  nodeId: z.string().min(1),
  masteryState: MasteryStateSchema, // ["untouched","in-progress","mastered"]
});

export async function setNodeMasteryHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof SetNodeMasteryInput> }) {
  const { principal } = context;
  const { nodeId, masteryState } = SetNodeMasteryInput.parse(data);
  await db.insert(nodeProgress).values({ ... }).onConflictDoUpdate({ ... });
  return { ok: true };
}
export const setNodeMastery = authedServerFn({ method: "POST" }).handler(
  setNodeMasteryHandler
);
```

### Pattern 4: TanStack Query optimistic update + Zustand hybrid

**What:** `useProgressMutation` hook that updates Zustand `masteryMap` immediately and fires the server mutation async. On error, reverts Zustand and shows error toast. On settle, invalidates the progress query to sync server truth.

```typescript
// Source: [ASSUMED] TanStack Query 5 useMutation optimistic update pattern
// src/hooks/useProgressMutation.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { setNodeMastery } from "#/server/progress";
import type { MasteryState } from "#/schemas/progress";

export function useProgressMutation() {
  const queryClient = useQueryClient();
  const { setNodeMastery: setStoreState } = useGraphStore();

  return useMutation({
    mutationFn: ({ nodeId, masteryState }: { nodeId: string; masteryState: MasteryState }) =>
      setNodeMastery({ data: { nodeId, masteryState } }),

    onMutate: async ({ nodeId, masteryState }) => {
      // Cancel any in-flight fetches to prevent race
      await queryClient.cancelQueries({ queryKey: progressKeys.byUser() });
      // Snapshot previous state for rollback
      const previousState = useGraphStore.getState().masteryMap[nodeId];
      // Optimistic update — Zustand drives the graph re-render immediately
      setStoreState(nodeId, masteryState);
      return { previousState, nodeId };
    },

    onError: (_err, _vars, ctx) => {
      // Rollback Zustand to previous state
      if (ctx) {
        setStoreState(ctx.nodeId, ctx.previousState ?? "untouched");
      }
      // Show error toast per UI-SPEC
      toast.error("Couldn't save your progress", {
        description: "Your selection has been reverted. Please try again.",
        action: { label: "Retry", onClick: () => { /* re-fire */ } },
        duration: Infinity,
      });
    },

    onSettled: () => {
      // Sync server truth regardless of outcome
      queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
    },
  });
}
```

### Pattern 5: Query key factory

**What:** Typed query key factory for all progress queries. Enables selective invalidation without string collisions.

```typescript
// Source: [ASSUMED] TanStack Query 5 query key factory pattern
// src/lib/progress-keys.ts

export const progressKeys = {
  all: () => ["progress"] as const,
  byUser: () => [...progressKeys.all(), "byUser"] as const,
} as const;
```

### Pattern 6: SSR-safe localStorage store module

**What:** A plain TypeScript module (not a React hook) that reads/writes localStorage with SSR guards. Used for signed-out progress and the merge detection flag.

```typescript
// Source: [CITED: src/lib/mock-mastery.ts — private backing store pattern]
// [ASSUMED] typeof window guard for SSR safety
// src/lib/local-progress.ts

import type { MasteryState } from "#/schemas/progress";

const PROGRESS_KEY = "wc3rm:progress";
const MERGED_FLAG = "wc3rm:merged";

export function getLocalProgress(): Record<string, MasteryState> {
  if (typeof window === "undefined") return {}; // SSR guard
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setLocalMastery(nodeId: string, state: MasteryState): void {
  if (typeof window === "undefined") return;
  const current = getLocalProgress();
  current[nodeId] = state;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(current));
}

export function clearLocalProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROGRESS_KEY);
}

export function isAlreadyMerged(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MERGED_FLAG) === "true";
}

export function markMerged(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MERGED_FLAG, "true");
}
```

### Pattern 7: Zustand store extension for masteryMap

**What:** Extend existing `graph-store.ts` with `masteryMap` and `setNodeMastery`. The existing `ActiveFilters.mastery` already references `"in-progress"` — aligns with D-03.

```typescript
// Source: [CITED: src/lib/graph-store.ts — existing store shape]
// ADDITIONS to GraphStore interface:
masteryMap: Record<string, MasteryState>;
setNodeMastery: (nodeId: string, state: MasteryState) => void;
initMasteryMap: (map: Record<string, MasteryState>) => void;

// ADDITIONS to create() implementation:
masteryMap: {},
setNodeMastery: (nodeId, state) => {
  set((s) => ({ masteryMap: { ...s.masteryMap, [nodeId]: state } }));
},
initMasteryMap: (map) => {
  set({ masteryMap: map });
},
```

### Pattern 8: Replace getMockMastery call sites in RoadmapGraph.tsx

**What:** The two `getMockMastery(n.id)` calls in `displayNodes` and `filteredDisplayNodes` useMemo hooks become reads from `useGraphStore`.

```typescript
// Source: [CITED: src/components/graph/RoadmapGraph.tsx lines ~151, ~211]
// BEFORE:
const masteryState = getMockMastery(n.id);

// AFTER:
const masteryMap = useGraphStore.getState().masteryMap;
// ...inside useMemo:
const masteryState: MasteryState = masteryMap[n.id] ?? "untouched";
```

**Important:** `useGraphStore.getState()` (not `useGraphStore()` hook) inside a `useMemo` is correct — the memo already re-runs when `masteryMap` is passed as a dependency. Add `masteryMap` to the `useMemo` dependency array.

### Pattern 9: Schema enum migration (no data migration needed)

**What:** Rename `"learning"` to `"in-progress"` in `MasteryStateSchema`. No DB migration needed — no progress table exists yet; the new table is created with `in-progress` from day one.

```typescript
// Source: [CITED: src/schemas/progress.ts — current schema to modify]
// BEFORE:
export const MasteryStateSchema = z.enum(["untouched", "learning", "mastered"]);

// AFTER:
export const MasteryStateSchema = z.enum(["untouched", "in-progress", "mastered"]);
// Remove "learning" entirely — no backward-compat needed (no persisted data yet)
```

**Test file must also be updated:** `src/schemas/progress.test.ts` currently asserts `"learning"` as valid and includes it in multi-state loops. All `"learning"` references become `"in-progress"` in the test file.

### Anti-Patterns to Avoid

- **Composite PK for upsert target:** Using `primaryKey({ columns: [userId, nodeId] })` as the PK makes `onConflictDoUpdate` reference the composite PK — workable but inconsistent with the project's surrogate-PK convention. Stick with surrogate PK + uniqueIndex.
- **pgEnum for masteryState:** `pgEnum("mastery_state", ["untouched","in-progress","mastered"])` — the hyphen in `in-progress` requires quoting in Postgres DDL. More critically, adding a new enum value (`quiz-pending` in Phase 6) requires `ALTER TYPE` DDL — costly on a live table. Use `text()` + Zod validation at the app layer.
- **userId in server fn input:** Never accept `userId` as a request parameter in progress server functions (D-06, ADR-007). Principal-keyed only.
- **Calling localStorage in server code:** `localStorage` does not exist in server functions or SSR. Always guard with `typeof window !== 'undefined'` or confine to `useEffect`.
- **Full-graph invalidation on mark:** Do not call `queryClient.invalidateQueries({ queryKey: progressKeys.all() })` inside `onMutate`. Invalidation happens only in `onSettled`, and Zustand drives the immediate visual update.
- **Importing local-progress.ts in server functions:** The localStorage module is client-only. Import it only in client components/hooks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | `sonner` (shadcn official) | AnimatePresence, queue management, dismiss, positioning, accessibility — all handled |
| Mastery toggle buttons | Custom radio/button group | shadcn `toggle-group` | Radix ToggleGroup handles `role="group"`, `aria-pressed`, keyboard navigation |
| Optimistic update rollback | Manual state tracking | TanStack Query `onMutate`/`onError`/`onSettled` | Race condition prevention (`cancelQueries`), snapshot/rollback, settled sync — 3 callbacks handle all cases |
| Query key management | String constants | `progressKeys` factory object | Typed keys prevent key typos; `invalidateQueries` prefix matching works on factory output |
| Upsert logic | SELECT + conditional INSERT/UPDATE | `onConflictDoUpdate` | Avoids race conditions inherent in check-then-write; atomic in Postgres |
| Auth check in handlers | Custom session verification | `authedServerFn` (ADR-007) | One audit point; IDOR impossible by construction; established pattern |

**Key insight:** The optimistic update pattern has 3 failure modes (race condition, rollback timing, stale cache) that `onMutate`/`onError`/`onSettled` handle atomically. Hand-rolling any part loses one of these guarantees.

---

## Common Pitfalls

### Pitfall 1: pgEnum with hyphenated values
**What goes wrong:** Using `pgEnum("mastery_state", ["untouched", "in-progress", "mastered"])` — `in-progress` contains a hyphen. Postgres requires quoting hyphenated enum values. When Drizzle generates the SQL, the hyphen may cause a parse error in the generated DDL.
**Why it happens:** Postgres enum labels with special characters need `"in-progress"` (quoted) in DDL. Drizzle's pgEnum may not quote them correctly in all versions.
**How to avoid:** Use `text("mastery_state").notNull()` and validate at the Zod layer. This is the correct pattern for any enum that may change over time.
**Warning signs:** Drizzle generate produces `CREATE TYPE mastery_state AS ENUM ('untouched', 'in-progress', ...)` — check that `in-progress` is quoted in the generated SQL.

### Pitfall 2: useGraphStore() hook inside useMemo dependency array
**What goes wrong:** Adding the entire `useGraphStore()` selector return to the `useMemo` dep array causes the entire graph to re-render when any store state changes (e.g. hover, selectedNode).
**Why it happens:** `useGraphStore()` without a selector subscribes to the full store. A `hoveredNodeId` change re-runs the `displayNodes` memo, updating all 50+ nodes unnecessarily.
**How to avoid:** Extract `masteryMap` via a shallow selector: `const masteryMap = useGraphStore(useShallow((s) => s.masteryMap))`. Then add only `masteryMap` to the `useMemo` dep array. `setNodeMastery` only changes one key in `masteryMap`, so `useShallow` will not trigger a re-render unless the reference changes.

### Pitfall 3: setNodeMastery spreading masteryMap creates new object
**What goes wrong:** `set((s) => ({ masteryMap: { ...s.masteryMap, [nodeId]: state } }))` creates a new object every time. If `useShallow` is applied to `masteryMap`, it compares object references — new object = re-render of `displayNodes`.
**Why it happens:** Zustand `set` always creates a new state object. `useShallow` compares the map's values, not its reference, so shallow equality still works correctly here.
**How to avoid:** `useShallow` does a shallow key-by-key comparison of the `masteryMap` object values. Only the changed key triggers re-computation. This works correctly — the single affected `GraphNode` (which subscribes to `masteryMap[id]` via a per-node selector) re-renders; others do not.

### Pitfall 4: localStorage merge triggered on every session load
**What goes wrong:** If the merge trigger watches `session !== null` without the `wc3rm:merged` flag, the merge fires on every page load after sign-in, not just the first time.
**Why it happens:** TanStack Start uses SSR — the session is often available on the first render. Without a persistence flag, the merge re-fires every time the app loads.
**How to avoid:** Use the `wc3rm:merged` flag in localStorage. Only trigger the merge when: (1) session transitions from null/undefined to a session object, AND (2) `isAlreadyMerged()` returns false. Set `markMerged()` after the server merge fn succeeds.

### Pitfall 5: masteryMap not populated before RoadmapGraph renders
**What goes wrong:** `getUserProgress` fetch takes 200–500ms. During that window, all nodes show "untouched" (the graceful default), then flash to their real state when the query resolves.
**Why it happens:** TanStack Query fetches asynchronously after mount; there's no SSR prefetch configured.
**How to avoid:** Accept the flash as acceptable UX for Phase 5 (the state resolves within one render cycle, and the graceful "untouched" default is correct). Alternatively: prefetch `getUserProgress` in the route loader using `queryClient.ensureQueryData()`. Mark this as optional — the flash is subtle and Phase 5 is not the polish phase.

### Pitfall 6: Schema test file still references "learning"
**What goes wrong:** `src/schemas/progress.test.ts` has `it("accepts 'learning'", ...)` and loops over `["untouched","learning","mastered"]`. After the D-03 migration, these tests fail.
**Why it happens:** The test was authored before the vocabulary cleanup decision.
**How to avoid:** Update the test file in the same plan that changes `MasteryStateSchema`. Replace all `"learning"` with `"in-progress"`. Add a new test: `it("rejects 'learning' (renamed to in-progress)", ...)`.

### Pitfall 7: Importing nodeProgress from schema.ts without adding to relations
**What goes wrong:** Drizzle relational queries (`db.query.nodeProgress.findMany`) require the table to be registered in relations. If `nodeProgressRelations` is missing, the query builder cannot resolve the `userId` FK.
**Why it happens:** Drizzle's query builder uses the relations export to build joins. Tables not in relations can still be queried with `db.select().from(nodeProgress)` but not via `db.query.*`.
**How to avoid:** Add `nodeProgressRelations` to `schema.ts` and add `nodeProgress: many(nodeProgress)` to `usersRelations`. For Phase 5, `db.query.nodeProgress.findMany` is the preferred API (consistent with `db.query.users.findFirst` in getUserProfile).

---

## Code Examples

### Running migrations after adding nodeProgress table

```bash
# Source: [CITED: drizzle.config.ts — confirmed DATABASE_URL_DIRECT convention]
# Step 1: Generate SQL diff
npx drizzle-kit generate
# → creates src/db/migrations/0001_progress.sql

# Step 2: Review generated SQL, then apply
DATABASE_URL_DIRECT=<neon-direct-url> npx drizzle-kit migrate
```

### Initializing masteryMap from TanStack Query data

```typescript
// Source: [ASSUMED] TanStack Query useQuery + Zustand effect pattern
// In a route component or provider that wraps the graph:
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { getUserProgress } from "#/server/progress";

function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession(); // from better-auth
  const { initMasteryMap } = useGraphStore();
  const { data: progressRecords } = useQuery({
    queryKey: progressKeys.byUser(),
    queryFn: () => getUserProgress(),
    enabled: !!session, // only fetch when signed in
    staleTime: 1000 * 60 * 5, // 5 minutes — progress changes are user-triggered
  });

  useEffect(() => {
    if (progressRecords) {
      const map: Record<string, MasteryState> = {};
      for (const r of progressRecords) {
        map[r.nodeId] = r.masteryState as MasteryState;
      }
      initMasteryMap(map);
    }
  }, [progressRecords, initMasteryMap]);

  // Signed-out: populate from localStorage
  useEffect(() => {
    if (!session) {
      initMasteryMap(getLocalProgress());
    }
  }, [session, initMasteryMap]);

  return <>{children}</>;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.enum(["untouched","learning","mastered"])` | `z.enum(["untouched","in-progress","mastered"])` | Phase 5 (D-03) | No data migration (no persisted data yet); test updates only |
| `getMockMastery(nodeId)` hardcoded mock | `useGraphStore.getState().masteryMap[nodeId]` | Phase 5 | Real progress drives graph |
| No progress table | `nodeProgress` Drizzle table | Phase 5 | Persistent server-side progress |
| No `source` field | `source: "manual" \| "auto"` on progress record | Phase 5 (D-04) | Forward-compatible for Phase 7/8 |

**Deprecated/outdated:**
- `getMockMastery` import in `RoadmapGraph.tsx` and `GraphNode.tsx`: removed in Phase 5 (or deprecated marker added to `mock-mastery.ts`)
- `"learning"` as a valid `MasteryState` value: removed in Phase 5, replaced with `"in-progress"`
- `userId: z.string()` placeholder in `ProgressRecordSchema`: replaced with UUID from `users.id`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `onConflictDoUpdate` upsert using `sql\`excluded.col\`` works correctly with Drizzle 0.45.x | Code Examples — Pattern 2 | Wrong column names in `excluded` expression would silently insert wrong values; caught by integration test |
| A2 | `useGraphStore.getState().masteryMap` inside `useMemo` dep array does not cause excessive re-renders when using `useShallow` | Architecture Patterns — Pattern 8 | Would cause full graph re-render on hover — observable in React DevTools Profiler |
| A3 | TanStack Start does not automatically prefetch `getUserProgress` in the route loader; manual `ensureQueryData` is needed for SSR hydration | Common Pitfalls — Pitfall 5 | If Start auto-hydrates, the flash described in Pitfall 5 would not occur |
| A4 | `better-auth`'s `useSession()` hook returns `null` before the session resolves and a session object after sign-in — transition is reliably observable in `useEffect` | Code Examples — ProgressProvider | If session doesn't transition cleanly, merge trigger fires at wrong time |
| A5 | `npx shadcn add toggle-group sonner` installs `sonner` as an npm dep AND copies the Toaster wrapper to `src/components/ui/` | Standard Stack | If shadcn CLI behavior differs, manual npm install + component creation needed |

---

## Open Questions

1. **Should `getMockMastery` and `mock-mastery.ts` be deleted or just deprecated?**
   - What we know: The file is imported in `GraphNode.tsx` (for the `MasteryState` type) and `RoadmapGraph.tsx` (for the `getMockMastery` call).
   - What's unclear: Whether other components import the `MasteryState` type from `mock-mastery.ts` rather than from `schemas/progress.ts`.
   - Recommendation: In Phase 5, migrate the `MasteryState` type export to `schemas/progress.ts` (it belongs there) and update all imports. Then delete `mock-mastery.ts`. Grep for `from.*mock-mastery` to find all consumers.

2. **Route loader prefetch for `getUserProgress`?**
   - What we know: TanStack Query fetches on client mount; the graph will show "untouched" for ~200ms until the query resolves.
   - What's unclear: Whether the user notices or cares at Phase 5 milestone.
   - Recommendation: Accept the flash for Phase 5. Add route loader prefetch in Phase 9 as a polish item.

3. **localStorage merge server fn: separate endpoint or inline in sign-in flow?**
   - What we know: better-auth does not expose a sign-in callback that can run server-side user code.
   - What's unclear: The exact mechanism to trigger the merge server fn immediately after session establishment.
   - Recommendation: Trigger from a client `useEffect` that watches `session` transitioning from null to non-null + `!isAlreadyMerged()`. Fire the `mergeProgressOnSignIn` server fn (POST with the localStorage payload), await it, then clear localStorage and `markMerged()`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | drizzle-kit generate/migrate | ✓ | 22.x (inferred from pkg.json) | — |
| DATABASE_URL_DIRECT | drizzle-kit migrate | must be set in .env.local | — | — |
| DATABASE_URL | app runtime queries | must be set | — | — |
| npx shadcn | toggle-group + sonner install | ✓ | (with npx) | Manual copy from shadcn.ui website |

**Missing dependencies with no fallback:**
- `DATABASE_URL_DIRECT` env var must be set to the Neon non-pooled connection string before running `drizzle-kit migrate`. Migration will fail silently or with a connection error otherwise.

**Missing dependencies with fallback:**
- shadcn CLI: if `npx shadcn add` fails, components can be copied manually from ui.shadcn.com.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Per-component DOM tests | `// @vitest-environment jsdom` at top of file |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROG-01 | `MasteryStateSchema` accepts `"in-progress"`, rejects `"learning"` | unit | `npm test -- progress` | ✅ (needs edit) |
| PROG-01 | `ProgressRecordSchema` accepts `source: "manual"` | unit | `npm test -- progress` | ✅ (needs edit) |
| PROG-02 | `getUserProgressHandler` returns records keyed by `principal.id` | unit | `npm test -- server/progress` | ❌ Wave 0 |
| PROG-02 | `setNodeMasteryHandler` upserts with `principal.id`, not request input | unit | `npm test -- server/progress` | ❌ Wave 0 |
| PROG-03 | `getLocalProgress()` returns `{}` when `window` is undefined | unit | `npm test -- local-progress` | ❌ Wave 0 |
| PROG-03 | `isAlreadyMerged()` returns `false` before merge, `true` after | unit | `npm test -- local-progress` | ❌ Wave 0 |
| PROG-04 | `MasteryControls` renders 3 state buttons in ToggleGroup | unit (jsdom) | `npm test -- MasteryControls` | ❌ Wave 0 |
| PROG-04 | Clicking a mastery button fires the mutation (mocked) | unit (jsdom) | `npm test -- MasteryControls` | ❌ Wave 0 |
| PROG-05 | No aggregation/count rendered in panel or graph | manual | — | manual-only |

### Sampling Rate

- **Per task commit:** `npm test` — full Vitest suite (fast, <5s for unit tests)
- **Per wave merge:** `npm test` + manual check for gamification elements in browser
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/server/progress.test.ts` — covers PROG-01/02 (getUserProgressHandler, setNodeMasteryHandler)
- [ ] `src/lib/local-progress.test.ts` — covers PROG-03 (SSR guards, merge flag)
- [ ] `src/components/graph/MasteryControls.test.tsx` — covers PROG-04 (jsdom, `// @vitest-environment jsdom`)
- [ ] `src/schemas/progress.test.ts` — EDIT (not create): replace `"learning"` with `"in-progress"` in existing tests, add rejection test for `"learning"`

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` per `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (Phase 4 established) | better-auth session; Phase 5 consumes session only |
| V3 Session Management | no (Phase 4 established) | Phase 4 session cookies; no new session management |
| V4 Access Control | **yes** | `authedServerFn` (D-06, ADR-007) — IDOR prevention by construction |
| V5 Input Validation | **yes** | Zod `MasteryStateSchema` + `nodeId` validation on every server fn call |
| V6 Cryptography | no | No new crypto; surrogate PK uses `crypto.randomUUID()` (Web Crypto API) |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on progress records | Tampering / Info Disclosure | `authedServerFn` principal-keyed by construction; no `userId` input (D-06, ADR-007) |
| Crafted masteryState value (e.g. `"MASTERED"`, `"hacked"`) | Tampering | `MasteryStateSchema` Zod parse in `setNodeMasteryHandler` before DB write |
| Crafted patchId in progress record | Tampering | Server fn stamps `CURRENT_PATCH.id` — patchId never taken from client input |
| localStorage poisoning (pre-merge) | Tampering | Merge fn validates each record's masteryState via Zod before upsert; invalid records skipped |
| Mass progress manipulation via direct server fn call | Tampering | authedServerFn session gate (D-11); only the principal's own records are ever written |

**Security note on `source` field:** The `source` field is always hardcoded to `"manual"` server-side in Phase 5 — the client cannot influence this value. Phase 7/8 will write `"auto"` from their own server functions. A client cannot claim `source: "auto"` because the server fn never reads `source` from the request.

---

## Sources

### Primary (from this session — codebase-verified)

- `src/lib/auth-middleware.ts` — `authedServerFn` factory + `AuthedContext` type (exact template for progress server fns)
- `src/server/user-profile.ts` — `getUserProfileHandler` template (named-export pattern for testability)
- `src/db/schema.ts` — established Drizzle column conventions (text PK, index array, FK cascade)
- `src/db/migrations/0000_dapper_gressill.sql` — confirms migration output format
- `drizzle.config.ts` — confirms `DATABASE_URL_DIRECT` requirement for migrations
- `src/lib/graph-store.ts` — confirmed store shape; `masteryMap` integrates here
- `src/components/graph/RoadmapGraph.tsx` — confirmed `getMockMastery` call sites at lines ~151, ~211
- `src/schemas/progress.ts` — confirmed current `"learning"` enum value to migrate
- `src/schemas/progress.test.ts` — confirmed existing tests reference `"learning"` — must update
- `package.json` — confirmed all installed package versions
- npm view (this session) — confirmed `sonner@2.0.7`, `drizzle-orm@0.45.2`, `@tanstack/react-query@5.101.2`
- `docs/adr/007-authed-server-fn-authorization.md` — authorization pattern rationale
- `.planning/phases/05-progress-tracking/05-CONTEXT.md` — locked decisions D-01..D-10
- `.planning/phases/05-progress-tracking/05-UI-SPEC.md` — MasteryControls spec, sonner/toggle-group requirements

### Secondary (training knowledge — [ASSUMED])

- TanStack Query 5 `useMutation` optimistic update pattern (`onMutate`/`onError`/`onSettled`)
- Drizzle ORM `onConflictDoUpdate` with `sql\`excluded.col\`` syntax
- Query key factory pattern for TanStack Query
- SSR-safe localStorage guard pattern (`typeof window !== 'undefined'`)
- shadcn `toggle-group` / `sonner` CLI install pattern

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 5 |
|-----------|------------------|
| TanStack ecosystem (Start, Router, Query) | All server fns use `createServerFn`; all client fetches use `useQuery`/`useMutation` |
| No tRPC | `createServerFn` / `authedServerFn` is the RPC layer — no tRPC |
| Drizzle ORM + Neon | nodeProgress table uses Drizzle; neon HTTP driver for runtime queries |
| GPL-3.0-or-later SPDX header | Every new `.ts`/`.tsx` file gets line-1 SPDX header |
| Deep module discipline | progress.ts server fn module = deep module (simple `authedServerFn` interface hiding upsert complexity) |
| CONTEXT.md must be extended | Add Phase 5 terms: `masterySource`, `localProgress`, `mergeOnSignIn` |
| ADR in docs/adr/ | One ADR for the progress table design decision (surrogate PK, text enum, source field) — continues from ADR 008 |
| No secrets in git | DATABASE_URL_DIRECT stays in .env.local (not committed); already in .gitignore |
| Context7 for external library docs | Fetched: TanStack Query mutation pattern, Drizzle upsert, drizzle-kit workflow |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed + npm-verified this session
- Architecture (DB table, server fns): MEDIUM — follows established project patterns but upsert/migration details are [ASSUMED]
- Optimistic update pattern: MEDIUM — TanStack Query 5 patterns from training knowledge, not Context7-verified this session
- localStorage merge: MEDIUM — SSR guard pattern well-established; specific flag mechanism is [ASSUMED]
- Pitfalls: HIGH — Pitfalls 1/3/4/6/7 confirmed via codebase inspection; Pitfall 2/5 from training knowledge

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable libraries; TanStack Start RC may have weekly releases but API is stable)
