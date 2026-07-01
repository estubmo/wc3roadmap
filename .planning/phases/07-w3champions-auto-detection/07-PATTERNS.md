# Phase 7: w3champions Auto-Detection - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 12
**Analogs found:** 12 / 12 (all greenfield files map to a strong structural analog; no true "no analog" files)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/server/w3champions.ts` (`syncW3championsHandler`) | service (server fn) | request-response + external-fetch | `src/server/quiz.ts` (`recordQuizPassHandler`) | exact (shape) / role-match (adds external fetch, absent from analog) |
| `src/lib/w3champions-client.ts` | utility (HTTP client) | request-response (outbound fetch) | none in-repo — greenfield; nearest shape is `src/lib/db.ts`'s lazy-singleton discipline for the module boundary | no analog (external client is new to this codebase) |
| `src/lib/detect-mastery-signals.ts` | utility (pure function) | transform | none in-repo — greenfield; mirrors the deep-module contract described inline in `src/server/progress.ts`'s `mergeProgressOnSignInHandler` gap-filter logic (`existingSet`/`.filter()`) | role-match (pure filter/transform logic pattern) |
| `src/lib/mmr-tiers.ts` | config (static registry) | transform (lookup) | `src/lib/patches.ts` | exact |
| `src/lib/w3champions-keys.ts` | utility (query-key factory) | transform | `src/lib/progress-keys.ts` | exact |
| `src/db/schema.ts` (+ `w3championsSync` table) | model (DB table) | CRUD | `nodeProgress` table def in `src/db/schema.ts` (lines 294-349) | exact |
| `src/schemas/node.ts` (+ `AutoDetectCriteriaSchema`) | model (Zod schema) | transform (validation) | `CitationSchema` discriminated union (lines 137-140) in same file | exact |
| `src/hooks/useSyncW3championsMutation.ts` | hook | request-response + optimistic | `src/hooks/useProgressMutation.ts` | exact |
| `src/components/profile/SyncW3championsButton.tsx` | component | request-response | no direct profile-button analog found in repo scope reviewed — mirrors `useProgressMutation` consumer pattern generally; UI-SPEC governs exact copy | role-match |
| `MasteryBadge.tsx` (extend `sourceMap`) | component | transform (render) | `src/components/graph/MasteryBadge.tsx` (existing file, modified) | exact (self) |
| `GraphNode.tsx` (extend `sourceMap`/highlight) | component | transform (render) | `src/components/graph/GraphNode.tsx` (existing file, modified) | exact (self) |
| `src/server/w3champions.test.ts` | test | request-response (mocked) | `src/server/quiz.test.ts` / `src/server/progress.test.ts` | exact |
| `src/lib/detect-mastery-signals.test.ts`, `src/lib/mmr-tiers.test.ts`, `src/lib/w3champions-client.test.ts` | test | transform (pure-fn unit tests) | no direct pure-fn test analog surfaced in this repo pass — mirror Vitest `describe`/`it` conventions from `quiz.test.ts` (mocking not needed for pure fns) | role-match |

## Pattern Assignments

### `src/server/w3champions.ts` (service, request-response + external-fetch)

**Analog:** `src/server/quiz.ts` (`recordQuizPassHandler`) + `src/server/progress.ts` (`getUserProgressHandler`, `mergeProgressOnSignInHandler`)

**Imports pattern** (`src/server/quiz.ts` lines 43-49):
```typescript
import { sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress, quizProgress } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, type AuthedContext } from "#/lib/auth-middleware";
import { z } from "zod";
import { CURRENT_PATCH } from "#/lib/patches";
```
For `w3champions.ts`, add: `import { w3championsSync, nodeProgress } from "#/db/schema";`, `import { detectMasterySignals } from "#/lib/detect-mastery-signals";`, `import { fetchW3championsSignals } from "#/lib/w3champions-client";`.

**Auth pattern — principal-keyed, no client `userId`** (`src/server/progress.ts` lines 84-91, `getUserProgressHandler`):
```typescript
export async function getUserProgressHandler({ context }: AuthedContext) {
  const { principal } = context;
  // Key the query by the session principal's UUID — NEVER by client input (D-06).
  return db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
}
```
`syncW3championsHandler` must read `context.principal.id`, `.battleTag`, `.gateway` — NEVER accept these from `data`. `context.principal` type is `User` (from `src/lib/auth-middleware.ts` `AuthedContext = { context: { principal: User } }`), and `User` already carries `battleTag`/`gateway` per `src/db/schema.ts` `users` table (lines 100-110).

**Write/upsert pattern — server-stamped fields** (`src/server/quiz.ts` lines 114-133, adapted):
```typescript
await db
  .insert(nodeProgress)
  .values({
    id: crypto.randomUUID(),
    userId: principal.id,       // NEVER from data
    nodeId,
    masteryState: "mastered",   // hardcoded per source's ceiling rule
    source: "quiz",             // NEVER from data (hardcoded)
    patchId: CURRENT_PATCH.id,  // NEVER from data
  })
  .onConflictDoUpdate({ target: [nodeProgress.userId, nodeProgress.nodeId], set: { /* ... */ } });
```
**Deviation required by D-05/D-06:** the auto-write path must NOT use `onConflictDoUpdate` (unlike quiz/manual paths, which intentionally overwrite). Per RESEARCH.md Anti-Patterns: use a plain `insert` (optionally `.onConflictDoNothing()` for defensive concurrency safety) since `detectMasterySignals` already filtered to untouched-only nodeIds — auto is purely additive, D-04 caps `masteryState: "in-progress"` (never `"mastered"`), `source: "auto"` (hardcoded).

**Read-existing-progress pattern (for untouched-filter, D-05)** — mirrors `mergeProgressOnSignInHandler` (`src/server/progress.ts` lines 196-203):
```typescript
const existing = await db.query.nodeProgress.findMany({
  where: eq(nodeProgress.userId, principal.id),
});
const existingSet = new Set(existing.map((r) => r.nodeId));
```

**Server fn declaration wiring** (`src/server/quiz.ts` lines 168-171):
```typescript
export const recordQuizPass = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(RecordQuizPassInput)
  .handler(recordQuizPassHandler);
```
`syncW3champions` takes no meaningful client input (all keying is principal-derived) — validator may be an empty/no-op schema or omitted per TanStack Start conventions; confirm during planning against `createServerFn` no-input usage elsewhere in repo.

**CRITICAL constraint from `src/lib/auth-middleware.ts` (lines 96-104):** `createServerFn` must be called directly and lexically visible at the definition site — do NOT wrap in a factory function, or the compiler fails to split the handler to the server and it ships to the client bundle (breaks `db`/`process.env` access).

---

### `src/lib/w3champions-client.ts` (utility, external fetch + status classifier)

**No direct in-repo analog** — this is the first outbound HTTP client in the codebase. Structural precedent for "server-only module, lazily reads environment / external resource" comes from `src/lib/db.ts`'s lazy singleton discipline (lines 43-47):
```typescript
let instance: Database | undefined;
function getDb(): Database {
  instance ??= createDb();
  return instance;
}
```
Apply the same "no eager module-load side effects" discipline to any client-level constants (e.g. base URL) — safe to be a plain constant since w3champions requires no secret/env var, but avoid top-level `fetch` calls.

**Concrete request/response contract to implement (from RESEARCH.md, verified live):**
```
GET https://website-backend.w3champions.com/api/players/{encodeURIComponent(battleTag)}
GET https://website-backend.w3champions.com/api/players/{encodeURIComponent(battleTag)}/game-mode-stats?gateWay=Europe&season=25
```
- 200 + populated body → success (compute `gamesPlayed` = sum of `winLosses[].games`; `mmrTier` via `tierForMmr(mmr)` from the season's highest-rankingPoints entry).
- 200 + `[]` or all-zero → success, `mmrTier: null` / `gamesPlayed: 0` (D-10c "no ladder data", NOT an error).
- 404 → also D-10c bucket (never-onboarded BattleTag reads the same as "no data yet" per Pitfall 2).
- network throw / timeout → D-10a "unreachable".
- 429 → D-10b "rate-limited, fall back to cached data" (no `Retry-After` header present — do not depend on it).
- Always `encodeURIComponent(battleTag)` before interpolating into the URL path (raw `#` truncates at fragment — Pitfall 3).
- Map `gateway === "kr"` → w3champions `GateWay.America` (`[ASSUMED]`, document inline per Pitfall 4).

**Error-handling shape to mirror** — follow the same `try/catch` + typed-result discriminant used generally in this codebase's server layer (no throw-to-caller pattern found for external calls; return a tagged result e.g. `{ status: "ok" | "unreachable" | "rate-limited" | "no-data", signals? }`) so `w3champions.ts` can branch cleanly per D-10.

---

### `src/lib/detect-mastery-signals.ts` (utility, pure function)

**No direct in-repo pure-function analog of this shape**, but the *filter discipline* mirrors `mergeProgressOnSignInHandler`'s gap-filter (`src/server/progress.ts` lines 200-203):
```typescript
const existingSet = new Set(existing.map((r) => r.nodeId));
const gaps = records.filter((r) => !existingSet.has(r.nodeId));
```
Implement `detectMasterySignals(nodes, signals, existingProgressNodeIds)` as zero-I/O: filter `nodeType === "MECHANIC"` → filter `autoDetect !== undefined` → filter not in `existingProgressNodeIds` → filter `meetsThreshold(...)` → map to `{ nodeId }`. RESEARCH.md Pattern 3 gives the exact reference implementation — copy field names (`AutoDetectableNode`, `W3cSignals`) directly since they were designed against this repo's real `NodeSummary`/`nodeType` shape (`src/schemas/node.ts` lines 46-67, `nodeType: z.enum(["MECHANIC","CONCEPTUAL"])`).

---

### `src/lib/mmr-tiers.ts` (config, static registry)

**Analog:** `src/lib/patches.ts` (full file — read in entirety, 62 lines)

**Registry pattern to copy verbatim** (`src/lib/patches.ts` lines 32-61):
```typescript
const _PATCHES = [
  { id: "patch-1.36.1", order: 0, released: "2022-11-16", objectIdMapVersion: 1 },
  { id: "patch-1.36.2", order: 1, released: "2024-03-15", objectIdMapVersion: 1 },
] as const satisfies readonly PatchEntry[];

export const PATCHES: readonly PatchEntry[] = _PATCHES;
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];
export const PATCH_IDS: [string, ...string[]] = _PATCHES.map((p) => p.id) as [string, ...string[]];

export function getPatch(id: string): PatchEntry {
  const patch = _PATCHES.find((p) => p.id === id);
  if (!patch) throw new Error(`Unknown patch id: "${id}"`);
  return patch;
}
```
Mirror this exact private-array + public-readonly-view + `_IDS` tuple export + throwing lookup-helper shape for `mmr-tiers.ts` (private `_TIERS`, `TIER_IDS` tuple for `z.enum()`, `tierForMmr()`, `tierIndex()`). RESEARCH.md Pattern 2 gives the full reference implementation calibrated to this exact structure — use it directly.

---

### `src/lib/w3champions-keys.ts` (utility, query-key factory)

**Analog:** `src/lib/progress-keys.ts` (full file, 33 lines)

**Pattern to copy verbatim, adapted:**
```typescript
export const progressKeys = {
  all: () => ["progress"] as const,
  byUser: () => [...progressKeys.all(), "byUser"] as const,
} as const;
```
For `w3championsKeys`: `all: () => ["w3champions"] as const`, plus e.g. `syncStatus: () => [...w3championsKeys.all(), "syncStatus"] as const`. Invalidate `progressKeys.byUser()` (not a new progress key) after a successful sync, per `code_context` — the sync mutation's `onSettled` should invalidate BOTH `w3championsKeys` (for "last synced Xm ago" UI) and `progressKeys.byUser()` (graph re-hydration).

---

### `src/db/schema.ts` — add `w3championsSync` table (model, CRUD)

**Analog:** `nodeProgress` table definition, same file, lines 294-349 (read in full above)

**Structural pattern to copy:**
```typescript
export const nodeProgress = pgTable(
  "node_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    masteryState: text("mastery_state").notNull(),
    source: text("source").notNull().default("manual"),
    patchId: text("patch_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("progress_user_node_unique").on(table.userId, table.nodeId),
    index("progress_userId_idx").on(table.userId),
  ],
);
```
`w3championsSync` needs: surrogate `text("id").primaryKey()`, FK `userId` → `users.id` cascade, `mmrTier: text("mmr_tier")` (nullable), `gamesPlayed: integer("games_played").notNull()`, `lastSyncedAt: timestamp("last_synced_at").notNull()`, unique index on `userId` alone (one row per user — this is a single-row cache, not a per-nodeId table like `nodeProgress`). Note `source` column in `nodeProgress` is `text` not `pgEnum` specifically because `"in-progress"` breaks pgEnum DDL quoting (documented Pitfall in schema.ts comment, lines 279-282) — follow the same `text()`-over-`pgEnum` convention for any new enum-like column.

---

### `src/schemas/node.ts` — add `AutoDetectCriteriaSchema` (model, Zod validation)

**Analog:** `CitationSchema` discriminated union, same file, lines 137-140 (full file read above)

**Discriminated-union pattern to copy:**
```typescript
export const CitationSchema = z.discriminatedUnion("kind", [
  ScienceCitationSchema,
  CreatorCitationSchema,
]);
```
RESEARCH.md Pattern 1 gives the exact target shape:
```typescript
import { TIER_IDS } from "../lib/mmr-tiers";

const AutoDetectCriteriaSchema = z.discriminatedUnion("signal", [
  z.object({ signal: z.literal("mmrTier"), gte: z.enum(TIER_IDS) }),
  z.object({ signal: z.literal("gamesPlayed"), gte: z.number().int().positive() }),
]);
```
Add to `NodeFrontmatterSchema.extend({ ... })` (lines 237-295) as `autoDetect: AutoDetectCriteriaSchema.optional()`, following the exact same `.optional()` graceful-default convention already used for `quiz` (line 294: `quiz: QuizSchema.optional()`).

**CRITICAL — PARALLEL-SCHEMA SYNC convention** (file header comment, lines 22-27, and repeated at lines 153-158 for `QuizSchema`): every schema addition here MUST be mirrored field-for-field in `content-collections.ts`'s inline Zod schema. This is a structural, CI-enforced pattern already established for `CitationSchema` and `QuizSchema` — apply identically to `AutoDetectCriteriaSchema`.

---

### `src/hooks/useSyncW3championsMutation.ts` (hook, request-response + optimistic)

**Analog:** `src/hooks/useProgressMutation.ts` (full file, 147 lines)

**Mutation shape to mirror:**
```typescript
export function useProgressMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const mutation = useMutation<unknown, Error, ProgressMutationVars, ProgressMutationContext>({
    mutationFn: async ({ nodeId, masteryState }) => {
      if (session) return setNodeMastery({ data: { nodeId, masteryState } });
      setLocalMastery(nodeId, masteryState);
      return;
    },
    onMutate: async (...) => { /* cancel queries, snapshot, optimistic Zustand write */ },
    onError: (...) => { /* rollback + toast.error with Retry action, duration: Infinity */ },
    onSettled: () => {
      if (session) void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
    },
  });
  return mutation;
}
```
For `useSyncW3championsMutation`: no signed-out branch needed (sync requires auth by definition — button should be gated to signed-in profile view). No optimistic Zustand write for mastery state per se (server determines candidates), but the D-07 "highlight newly-advanced nodes" marker IS a good candidate for an optimistic-style Zustand write on success (store `recentlyAdvancedNodeIds` transiently). `onSettled`/`onSuccess` must invalidate BOTH `w3championsKeys.syncStatus()` and `progressKeys.byUser()` (per Shared Patterns below). Toast usage should follow the exact `sonner` `toast.error(...)`/success pattern (lines 122-129) but with D-08/D-10's three-bucket-plus-reassurance copy instead of a generic Retry — reuse the `action: { label: "Retry", onClick: ... }` shape only for the D-10a/D-10b failure buckets, not for D-08's "0 nodes qualified" (which is a success, not a retry candidate).

---

## Shared Patterns

### Authentication / Authorization
**Source:** `src/lib/auth-middleware.ts` (`authMiddleware`, `AuthedContext`)
**Apply to:** `src/server/w3champions.ts` exclusively — same `.middleware([authMiddleware])` wiring as `quiz.ts`/`progress.ts`. `context.principal` (typed `User`) carries `id`, `battleTag`, `gateway` — never accept these from client `data`.
```typescript
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session?.user) throw new Error("Unauthorized");
    return next({ context: { principal: session.user as User } });
  }
);
```

### Server-stamped write fields (ADR 007/009, D-04/D-05/D-06/D-13)
**Source:** `src/server/quiz.ts` lines 114-124, `src/server/progress.ts` lines 121-141
**Apply to:** `src/server/w3champions.ts`'s auto-write. `userId`, `source`, `masteryState` (capped), `patchId` are ALL server-derived — never read from any client-controlled or upstream-API-derived field directly into these columns without the hardcoded literals shown in the analog.

### Server fn declaration constraint (compiler-visibility requirement)
**Source:** `src/lib/auth-middleware.ts` lines 96-104
**Apply to:** `src/server/w3champions.ts` — `createServerFn(...).middleware([authMiddleware]).handler(...)` must be lexically direct at the call site, never wrapped in a factory function, or the handler leaks into the client bundle.

### Query-key factory + invalidation
**Source:** `src/lib/progress-keys.ts`, `src/hooks/useProgressMutation.ts` lines 132-138
**Apply to:** `src/lib/w3champions-keys.ts` (new factory) + `useSyncW3championsMutation.ts` (invalidate both `w3championsKeys` and `progressKeys.byUser()` on settle).

### Registry-module structure (private array + public readonly view + ID tuple + throwing lookup)
**Source:** `src/lib/patches.ts` (full file)
**Apply to:** `src/lib/mmr-tiers.ts`.

### Discriminated-union content schema + PARALLEL-SCHEMA SYNC
**Source:** `src/schemas/node.ts` `CitationSchema`/`QuizSchema` (+ mandatory mirror in `content-collections.ts`)
**Apply to:** `AutoDetectCriteriaSchema` — must be added to BOTH `src/schemas/node.ts` and `content-collections.ts`, field-for-field identical, per the file's own documented convention.

### Testability: exported *Handler functions + vi.doMock/resetModules
**Source:** `src/server/quiz.test.ts` (header comment, lines 1-27), same convention in `src/server/progress.test.ts`
**Apply to:** `src/server/w3champions.test.ts` — export `syncW3championsHandler` as a named function (not just the wrapped `createServerFn` export) so tests can call it directly with an injected `{ context: { principal } }`, bypassing the TanStack Start runtime. Use `vi.doMock()` (not hoisted `vi.mock()`) + `vi.resetModules()` + dynamic `import()` per test to avoid temporal-dead-zone issues with mocked `db` module-level consts — this is an established, deliberate convention (see comment block, quiz.test.ts lines 24-27), not incidental.

### Source-labeling UI (badge + canvas marker)
**Source:** `src/components/graph/MasteryBadge.tsx` (full file), `src/components/graph/GraphNode.tsx` lines 185-254 (`sourceMap`, `masterySource` subscription, right-side marker slot)
**Apply to:** Extend `MasteryBadge`'s `source` prop handling (currently only special-cases `source === "quiz"` at line 72: `{source === "quiz" ? "Mastered · via quiz" : "Mastered"}`) to also handle `source === "auto"` at `in-progress` state (D-09) — note `in-progress` badge (lines 33-52) currently has NO source-conditional text at all, so this is a new branch, not a modification of existing quiz logic. `GraphNode.tsx`'s `sourceMap` (Zustand-derived, line 187: `const masterySource = useGraphStore((s) => s.sourceMap[d.id]);`) and the right-side canvas marker slot (lines 237-254, the "single rune-400 glyph" comment at 240) are the mechanism to extend with a distinct w3champions/auto marker glyph, parallel to the existing quiz ◆ marker.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/w3champions-client.ts` | utility | request-response (external) | First outbound HTTP client in the codebase — no prior external-API integration exists to copy from. Use RESEARCH.md's Pattern 4 code sketch + `src/lib/db.ts`'s lazy-singleton module discipline as the closest structural precedent. |
| `src/components/profile/SyncW3championsButton.tsx` | component | request-response | No existing profile-page action-button component was found in the files reviewed for this pass; planner should grep `src/components/profile/` directly during planning for any sibling components (e.g. sign-out button) not surfaced here, and otherwise follow `useSyncW3championsMutation` + `sonner` toast conventions from `useProgressMutation.ts`. |

## Metadata

**Analog search scope:** `src/server/`, `src/lib/`, `src/hooks/`, `src/db/schema.ts`, `src/schemas/node.ts`, `src/components/graph/` (MasteryBadge, GraphNode), test files `src/server/quiz.test.ts`.
**Files scanned:** 11 read in full (quiz.ts, progress.ts, auth-middleware.ts, patches.ts, progress-keys.ts, useProgressMutation.ts, node.ts, MasteryBadge.tsx, db.ts, schema.ts excerpt, GraphNode.tsx excerpt) + 1 partial (quiz.test.ts header + fixtures) + 1 grep pass (user-profile.ts).
**Pattern extraction date:** 2026-07-01
