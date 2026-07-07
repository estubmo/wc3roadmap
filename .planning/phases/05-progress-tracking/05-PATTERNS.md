# Phase 5: Progress Tracking - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 14 new/modified files
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema.ts` (EDIT) | model | CRUD | `src/db/schema.ts` itself (existing tables) | self |
| `src/schemas/progress.ts` (EDIT) | model | transform | `src/schemas/progress.ts` itself | self |
| `src/schemas/progress.test.ts` (EDIT) | test | — | `src/schemas/progress.test.ts` itself | self |
| `src/server/progress.ts` (NEW) | service | request-response | `src/server/user-profile.ts` | exact |
| `src/lib/local-progress.ts` (NEW) | utility | file-I/O | `src/lib/patches.ts` | role-match |
| `src/lib/progress-keys.ts` (NEW) | utility | — | `src/lib/patches.ts` (typed registry) | partial |
| `src/lib/graph-store.ts` (EDIT) | store | event-driven | `src/lib/graph-store.ts` itself | self |
| `src/lib/mock-mastery.ts` (EDIT/DELETE) | utility | — | self (deprecation marker only) | self |
| `src/hooks/useProgressMutation.ts` (NEW) | hook | event-driven | `src/components/graph/NodePanelContent.tsx` (useQuery pattern) | partial |
| `src/components/graph/MasteryControls.tsx` (NEW) | component | event-driven | `src/components/graph/MasteryBadge.tsx` | role-match |
| `src/components/graph/MasteryBadge.tsx` (EDIT) | component | — | self (label text change only) | self |
| `src/components/graph/GraphNode.tsx` (EDIT) | component | — | self (import swap) | self |
| `src/components/graph/NodePanelContent.tsx` (EDIT) | component | request-response | self + `NodePanelContent.tsx` existing pattern | self |
| `src/components/graph/RoadmapGraph.tsx` (EDIT) | component | event-driven | self (seam swap at lines 151, 211) | self |

---

## Pattern Assignments

### `src/server/progress.ts` (NEW — service, request-response)

**Analog:** `src/server/user-profile.ts` (lines 1–69) — **exact copy template**

**SPDX header + imports pattern** (copy from analog lines 1–26):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

import { eq, sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress } from "#/db/schema";
import { authedServerFn, type AuthedContext } from "#/lib/auth-middleware";
import { z } from "zod";
import { MasteryStateSchema } from "#/schemas/progress";
import { CURRENT_PATCH } from "#/lib/patches";
```

**Named handler export pattern** (analog lines 43–54 — exact structure to copy):
```typescript
// src/server/user-profile.ts lines 43-54
export async function getUserProfileHandler({ context }: AuthedContext) {
  const { principal } = context;
  // Key the query by the session principal's UUID — NEVER by client input.
  const user = await db.query.users.findFirst({
    where: eq(users.id, principal.id),
  });
  return user ?? null;
}
```

**GET progress handler** (copy getUserProfileHandler shape; swap `users.findFirst` → `nodeProgress.findMany`):
```typescript
export async function getUserProgressHandler({ context }: AuthedContext) {
  const { principal } = context;
  return db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
}
export const getUserProgress = authedServerFn({ method: "GET" }).handler(
  getUserProgressHandler
);
```

**POST handler with input schema** (no analog in codebase — use RESEARCH.md Pattern 3):
- Input schema: `z.object({ nodeId: z.string().min(1), masteryState: MasteryStateSchema })`
- Auth: `context.principal.id` — NEVER from input (D-06)
- DB: `db.insert(nodeProgress).values({...}).onConflictDoUpdate({...})` (RESEARCH.md Pattern 2)
- `source` hardcoded to `"manual"` server-side — never read from client input (D-04)
- `patchId` stamped from `CURRENT_PATCH.id` — never from client input (D-05)

**authedServerFn wrapper pattern** (analog `src/server/user-profile.ts` line 67–69):
```typescript
// src/server/user-profile.ts lines 67-69
export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  getUserProfileHandler
);
```

**mergeProgressOnSignIn handler** — same authedServerFn POST shape; input is an array of `{ nodeId, masteryState }` from localStorage; fill-gaps only (skip nodes where `userId`+`nodeId` already has a server record); validate each record with `MasteryStateSchema` before upsert.

---

### `src/db/schema.ts` (EDIT — add `nodeProgress` table + relations)

**Analog:** `src/db/schema.ts` — existing table definitions (lines 44–263)

**Table column pattern** (lines 44–128 / `users` table as model):
```typescript
// src/db/schema.ts lines 44-53 — surrogate text PK convention
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  // ... text() columns, timestamp() with .$onUpdate(), notNull()
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
```

**Index pattern** (lines 141–169 — sessions table):
```typescript
// src/db/schema.ts lines 141-169
export const sessions = pgTable(
  "session",
  { ... },
  (table) => [index("session_userId_idx").on(table.userId)],
);
```

**FK with cascade pattern** (lines 163–166):
```typescript
// src/db/schema.ts lines 163-166
userId: text("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

**Relations pattern** (lines 245–263 — usersRelations):
```typescript
// src/db/schema.ts lines 245-248
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));
```

**New `nodeProgress` table** — apply surrogate PK + `uniqueIndex` + `index` pattern (two entries in the table index array, same as RESEARCH.md Pattern 1). Add `nodeProgressRelations` + extend `usersRelations` with `nodeProgress: many(nodeProgress)`.

**Critical:** Use `text("mastery_state")` not `pgEnum` — hyphen in `"in-progress"` causes DDL quoting issues (RESEARCH.md Pitfall 1). Validation lives in `MasteryStateSchema` at the Zod layer.

---

### `src/schemas/progress.ts` (EDIT)

**Self-analog** — two targeted edits:

1. **MasteryStateSchema enum rename** (line 37):
```typescript
// BEFORE (line 37):
export const MasteryStateSchema = z.enum(["untouched", "learning", "mastered"]);
// AFTER:
export const MasteryStateSchema = z.enum(["untouched", "in-progress", "mastered"]);
```

2. **ProgressRecordSchema additions** — add `source` field (D-04) after `masteryState`:
```typescript
source: z.enum(["manual", "auto"]).default("manual"),
```

`userId` stays `z.string()` in the schema (UUID format guaranteed by the auth layer, not the schema). No change needed per D-05 — the DB column references `users.id` UUID; the Zod schema does not need uuid() validation at this layer.

---

### `src/schemas/progress.test.ts` (EDIT)

**Self-analog** (lines 1–163) — targeted replacements:

```typescript
// line 36: BEFORE
it("accepts 'learning'", () => {
  expect(MasteryStateSchema.safeParse("learning").success).toBe(true);
// AFTER:
it("accepts 'in-progress'", () => {
  expect(MasteryStateSchema.safeParse("in-progress").success).toBe(true);

// line 72: BEFORE
for (const masteryState of ["untouched", "learning", "mastered"] as const) {
// AFTER:
for (const masteryState of ["untouched", "in-progress", "mastered"] as const) {
```

Add a new rejection test after line 43 area:
```typescript
it("rejects 'learning' (renamed to in-progress)", () => {
  expect(MasteryStateSchema.safeParse("learning").success).toBe(false);
});
```

Add tests for `source` field in `ProgressRecordSchema` acceptance block:
```typescript
it("accepts source: 'manual'", () => { ... });
it("accepts source: 'auto'", () => { ... });
it("defaults source to 'manual' when absent", () => { ... });
```

---

### `src/lib/graph-store.ts` (EDIT — add masteryMap slice)

**Self-analog** (lines 1–196) — additive changes only; existing shape must not change.

**Zustand state + action pattern** (lines 157–196 — existing `create()` body):
```typescript
// src/lib/graph-store.ts lines 157-170
export const useGraphStore = create<GraphStore>((set) => ({
  hoveredNodeId: null,
  ancestorEdgeIds: new Set<string>(),
  setHoveredNode: (nodeId, edges) => {
    if (nodeId === null) {
      set({ hoveredNodeId: null, ancestorEdgeIds: new Set<string>() });
      return;
    }
    const ancestorEdgeIds = computeAncestorEdgeIds(nodeId, edges);
    set({ hoveredNodeId: nodeId, ancestorEdgeIds });
  },
```

**Additions to `GraphStore` interface** (after line 143 `clearFilters` method):
```typescript
// --- Phase 5: mastery state map ---
masteryMap: Record<string, MasteryState>;
setNodeMastery: (nodeId: string, state: MasteryState) => void;
initMasteryMap: (map: Record<string, MasteryState>) => void;
```

**Additions to `create()` body** (after `clearFilters` implementation):
```typescript
masteryMap: {},
setNodeMastery: (nodeId, state) => {
  set((s) => ({ masteryMap: { ...s.masteryMap, [nodeId]: state } }));
},
initMasteryMap: (map) => {
  set({ masteryMap: map });
},
```

**Import addition** at top: `import type { MasteryState } from "#/schemas/progress";`

**Pitfall (RESEARCH.md Pitfall 2):** Consumers must subscribe via `useShallow` to extract only `masteryMap`:
```typescript
const masteryMap = useGraphStore(useShallow((s) => s.masteryMap));
```
Never subscribe to the full store — that triggers re-renders on hover changes.

---

### `src/lib/local-progress.ts` (NEW — utility, file-I/O)

**Analog:** `src/lib/patches.ts` (lines 1–61) — private backing store pattern + read-only accessor with graceful default.

**Private backing store pattern** (patches.ts lines 32–38):
```typescript
// src/lib/patches.ts lines 32-38
const _PATCHES = [ ... ] as const satisfies readonly PatchEntry[];
export const PATCHES: readonly PatchEntry[] = _PATCHES;
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];
```

**mock-mastery.ts graceful default pattern** (lines 58–60 — adapt for `getLocalProgress`):
```typescript
// src/lib/mock-mastery.ts lines 58-60
export function getMockMastery(nodeId: string): MasteryState {
  return _MOCK_MASTERY[nodeId] ?? "untouched";
}
```

**SSR guard pattern** (no codebase analog — use RESEARCH.md Pattern 6):
```typescript
if (typeof window === "undefined") return {};
```

Full module shape (RESEARCH.md Pattern 6 — confirmed approach):
- `PROGRESS_KEY = "wc3rm:progress"` / `MERGED_FLAG = "wc3rm:merged"`
- `getLocalProgress(): Record<string, MasteryState>` — SSR-safe, try/catch on JSON.parse
- `setLocalMastery(nodeId, state)` — reads then writes full map
- `clearLocalProgress()` — removes PROGRESS_KEY
- `isAlreadyMerged(): boolean` — reads MERGED_FLAG
- `markMerged()` — sets MERGED_FLAG to `"true"`

**SPDX header required** on this new file.

---

### `src/lib/progress-keys.ts` (NEW — utility)

**No close analog** — minimal typed constant module. Use RESEARCH.md Pattern 5 directly:
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
export const progressKeys = {
  all: () => ["progress"] as const,
  byUser: () => [...progressKeys.all(), "byUser"] as const,
} as const;
```

---

### `src/hooks/useProgressMutation.ts` (NEW — hook, event-driven)

**No hook analog exists in the codebase.** Partial analog: `src/components/graph/NodePanelContent.tsx` (lines 31–36) shows the `useQuery` import pattern from TanStack Query — same package, same conventions.

**TanStack Query import pattern** (NodePanelContent.tsx lines 31–32):
```typescript
// src/components/graph/NodePanelContent.tsx lines 31-32
import { useQuery } from "@tanstack/react-query";
```

Full hook shape from RESEARCH.md Pattern 4 (no codebase analog — training knowledge):
- `useMutation` with `onMutate` / `onError` / `onSettled` callbacks
- `onMutate`: cancel in-flight queries + snapshot Zustand + call `setNodeMastery` (Zustand optimistic update)
- `onError`: rollback Zustand to snapshot + `toast.error(...)` via `sonner`
- `onSettled`: `queryClient.invalidateQueries({ queryKey: progressKeys.byUser() })`
- Rollback uses `useGraphStore.getState().setNodeMastery(ctx.nodeId, ctx.previousState ?? "untouched")`

**SPDX header required.**

---

### `src/components/graph/MasteryControls.tsx` (NEW — component, event-driven)

**Analog:** `src/components/graph/MasteryBadge.tsx` (lines 1–72) — same mastery-state vocabulary, same CSS variable color conventions, same typed `MasteryState` prop pattern.

**Props + import pattern** (MasteryBadge.tsx lines 1–19):
```typescript
// src/components/graph/MasteryBadge.tsx lines 15-19
import type { MasteryState } from "#/lib/mock-mastery";
// Phase 5: update this import to "#/schemas/progress"

interface MasteryBadgeProps {
  state: MasteryState;
}
```

**MasteryControls props:**
```typescript
interface MasteryControlsProps {
  nodeId: string;
  currentState: MasteryState;
}
```

**Component pattern** — shadcn `ToggleGroup` (3 buttons: untouched / in-progress / mastered); calls `useProgressMutation()` on value change. No count/aggregate text (D-10). Import `MasteryState` from `"#/schemas/progress"` (not `mock-mastery`).

**CSS variable color convention** (MasteryBadge.tsx lines 36–49 — replicate the style pattern):
```typescript
// src/components/graph/MasteryBadge.tsx lines 36-49
backgroundColor: "var(--color-rune-600)",
color: "var(--color-rune-300)",
```

**SPDX header required.**

---

### `src/components/graph/RoadmapGraph.tsx` (EDIT — seam swap)

**Self-analog** — two call sites replaced (lines 151, 211):

```typescript
// BEFORE (line 151):
const masteryState = getMockMastery(n.id);

// AFTER:
const masteryState: MasteryState = masteryMap[n.id] ?? "untouched";
```

```typescript
// BEFORE (line 211):
const mastery = getMockMastery(n.id);

// AFTER:
const mastery: MasteryState = masteryMap[n.id] ?? "untouched";
```

**masteryMap subscription** — add before `displayNodes` useMemo (after line 200 `useShallow` block):
```typescript
const masteryMap = useGraphStore(useShallow((s) => s.masteryMap));
```

**useMemo dependency arrays** — add `masteryMap` to both `displayNodes` (line 166) and `filteredDisplayNodes` (line 220) dep arrays.

**Remove import** (line 50): `import { getMockMastery } from "#/lib/mock-mastery";`

**Add import** (with `MasteryState` type): `import type { MasteryState } from "#/schemas/progress";`

---

### `src/components/graph/MasteryBadge.tsx` (EDIT — label + import)

**Self-analog** (lines 1–72) — two changes:

1. **Import update** (line 15): `"#/lib/mock-mastery"` → `"#/schemas/progress"`
2. **Label text** (line 45): `Learning` → `In Progress` (aligns with D-03 canonical vocabulary)

---

### `src/components/graph/NodePanelContent.tsx` (EDIT — add MasteryControls)

**Self-analog** (lines 1–60+) — mount `<MasteryControls>` at top of rendered content. Props: `nodeId` (from existing `nodeId` prop) + `currentState` (from `masteryMap[nodeId] ?? "untouched"` via `useGraphStore`).

**useQuery import already present** (line 31) — no new TanStack Query imports needed. Add `useGraphStore` and `useShallow` for masteryMap read. Add `MasteryControls` import.

---

### `src/lib/mock-mastery.ts` (EDIT — deprecation marker)

**Self-analog** — add deprecation JSDoc to `getMockMastery` and `MasteryState` type export; **do not delete** until all call sites are confirmed migrated (grep for `from.*mock-mastery` before delete). The `MasteryState` type export in this file must be migrated to `src/schemas/progress.ts` and all import sites updated (confirmed consumers: `MasteryBadge.tsx` line 15, `GraphNode.tsx` — verify).

---

## Shared Patterns

### SPDX Header (every new file)
**Source:** `src/server/user-profile.ts` lines 1–2 / `src/lib/auth-middleware.ts` lines 1–2
**Apply to:** All new `.ts` / `.tsx` files
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

### authedServerFn Authorization
**Source:** `src/lib/auth-middleware.ts` lines 59–102 + `src/server/user-profile.ts` lines 43–69
**Apply to:** `src/server/progress.ts` (all handlers)
- Named handler fn exported for testability (e.g. `getUserProgressHandler`)
- Wrapper: `authedServerFn({ method }).handler(namedHandler)`
- Handler destructures `{ context }: AuthedContext` — never `{ context, data: { userId } }`
- All DB queries keyed by `context.principal.id` exclusively

### Drizzle Table Conventions
**Source:** `src/db/schema.ts` lines 44–213
**Apply to:** `nodeProgress` table addition in `src/db/schema.ts`
- Surrogate PK: `id: text("id").primaryKey()`
- Timestamps: `createdAt: timestamp("created_at").defaultNow().notNull()` + `updatedAt` with `.$onUpdate(() => new Date())`
- FK: `.references(() => users.id, { onDelete: "cascade" })`
- Indexes in second pgTable arg as an array: `(table) => [index(...), uniqueIndex(...)]`
- Relations: matching `*Relations` export using `relations()` + extend `usersRelations`

### Zustand Store Extension Pattern
**Source:** `src/lib/graph-store.ts` lines 73–196
**Apply to:** `masteryMap` slice addition in `src/lib/graph-store.ts`
- Add interface properties to `GraphStore` with JSDoc matching existing phase comments
- Add initial state + action implementations inside `create<GraphStore>((set) => ({...}))`
- Use `set((s) => ({ ... }))` form for derived state (matches `setFilter` pattern lines 186–190)
- Mark new properties with `// --- Phase 5: ... ---` section comment

### TanStack Query `useQuery` Pattern
**Source:** `src/components/graph/NodePanelContent.tsx` lines 31–36
**Apply to:** `ProgressProvider` / route component that initializes `masteryMap`
```typescript
import { useQuery } from "@tanstack/react-query";
const { data } = useQuery({ queryKey: progressKeys.byUser(), queryFn: () => getUserProgress(), enabled: !!session, staleTime: 1000 * 60 * 5 });
```

### CSS Variable Colors
**Source:** `src/components/graph/MasteryBadge.tsx` lines 36–49
**Apply to:** `src/components/graph/MasteryControls.tsx` button states
- Use `var(--color-rune-*)` and `var(--color-obsidian-*)` — never hardcoded hex
- Consistent with existing mastery state color encoding

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/useProgressMutation.ts` | hook | event-driven | No `useMutation` hook exists in the codebase; NodePanelContent.tsx only uses `useQuery` |
| `src/lib/progress-keys.ts` | utility | — | No query key factory exists yet; nearest structure is `patches.ts` but semantics differ |

---

## Metadata

**Analog search scope:** `src/server/`, `src/lib/`, `src/db/`, `src/schemas/`, `src/components/graph/`, `src/hooks/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-06-30
