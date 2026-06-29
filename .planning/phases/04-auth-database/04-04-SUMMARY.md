---
phase: 04-auth-database
plan: "04"
subsystem: auth-middleware
status: complete
tags: [auth, middleware, server-functions, tdd, authorization, cross-user-security]
completed: "2026-06-29"
duration: "10m"
tasks_completed: 2
files_changed: 3

dependency_graph:
  requires:
    - 04-03 (src/lib/auth.ts — betterAuth instance providing auth.api.getSession and User type)
    - 04-02 (src/lib/db.ts and src/db/schema.ts — db singleton and users table)
  provides:
    - src/lib/auth-middleware.ts (authMiddleware, authedServerFn, AuthedContext)
    - src/lib/auth-middleware.test.ts (5 tests: D-11/D-12/D-13 regression gate)
    - src/server/user-profile.ts (getUserProfile, getUserProfileHandler)
  affects:
    - 04-05 and beyond (all user-data server fns use authedServerFn pattern)
    - Phase 5 (progress server fns built on authedServerFn)
    - Phase 7 (w3champions server fns built on authedServerFn)

tech_stack:
  added:
    - "authMiddleware: createMiddleware({type:'function'}).server() — reads getRequestHeaders + auth.api.getSession, throws 401 on no session, injects context.principal"
    - "authedServerFn: factory returning createServerFn(opts).middleware([authMiddleware])"
    - "AuthedContext: exported type for handler functions ({ context: { principal: User } })"
    - "getUserProfileHandler: extracted handler for unit testability (mapBattlenetProfile pattern)"
    - "getUserProfile: authedServerFn wrapper; no userId input — principal-keyed by construction"
  patterns:
    - "TDD RED/GREEN: test(04-04) commits first (failing), then feat(04-04) commits (passing)"
    - "authMiddleware.options.server({ next }) — direct call to registered server fn for middleware unit tests"
    - "Handler extracted as named export for testability — same pattern as mapBattlenetProfile"
    - "vi.doMock for dynamic mocks in beforeEach+resetModules test pattern"
    - "AuthedContext type exported from auth-middleware.ts — callers import for typed handlers"

key_files:
  created:
    - src/lib/auth-middleware.ts
    - src/lib/auth-middleware.test.ts
    - src/server/user-profile.ts
  modified: []

decisions:
  - "getUserProfileHandler exported as named function (not inline closure) for unit testability without TanStack Start runtime — same pattern as mapBattlenetProfile in auth.ts"
  - "AuthedContext type exported from auth-middleware.ts to type handler function parameters — avoids callers redefining the context shape"
  - "authMiddleware.options.server() is the direct test call path — not authMiddleware.server() (which is the fluent chaining method, not the registered handler)"
  - "cross-user test calls getUserProfileHandler directly with mock context — TanStack Start server fns require AsyncLocalStorage runtime, not available in vitest"
  - "eq() mock in cross-user test captures [col, val] args to assert principal.id is used, not principalB.id"

metrics:
  duration: "10m"
  completed: "2026-06-29"
  tasks: 2
  files: 3
---

# Phase 04 Plan 04: authedServerFn Deep Module Summary

**One-liner:** authMiddleware resolves getRequestHeaders + auth.api.getSession + 401 throw; authedServerFn factory wraps createServerFn with that middleware; getUserProfile is the first principal-keyed server function with an exported handler for offline testing.

## What Was Built

### Task 1: authMiddleware + authedServerFn deep module (TDD RED/GREEN)

`src/lib/auth-middleware.ts` is the authorization primitive every later user-data server function builds on. Design:

**authMiddleware:**
```typescript
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();          // RESEARCH Pitfall 4 — correct API
    const session = await auth.api.getSession({ headers });
    if (!session?.user) throw new Error("Unauthorized");  // D-11: never calls next()
    return next({ context: { principal: session.user as User } });  // D-11: injects principal
  }
);
```

Key: `getRequestHeaders()` from `@tanstack/react-start/server` is the correct API for TanStack Start 1.168.x. Using `request.headers` from middleware params is broken (Pitfall 4). The 401 throw happens BEFORE `next()` — the D-13 regression test asserts `next` was never called.

**authedServerFn factory:**
```typescript
export function authedServerFn(options: { method: "GET" | "POST" }) {
  return createServerFn(options).middleware([authMiddleware]);
}
```

**AuthedContext type (Rule 2 addition — missing critical functionality):**
```typescript
export type AuthedContext = { context: { principal: User } };
```
Added so handler functions can type their parameter without redeclaring the context shape.

**TDD flow:**
- RED: `bc4df60` — 4 failing tests (auth-middleware.ts absent)
- GREEN: `9ca8946` — 4 tests pass; typecheck clean

### Task 2: getUserProfile + cross-user D-13 regression test (TDD RED/GREEN)

`src/server/user-profile.ts` is the first user-data server function:

```typescript
export async function getUserProfileHandler({ context }: AuthedContext) {
  const { principal } = context;
  const user = await db.query.users.findFirst({
    where: eq(users.id, principal.id),  // D-12: principal.id, never client input
  });
  return user ?? null;
}

export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  getUserProfileHandler
);
```

No userId parameter exists. Cross-user access is impossible by construction.

**Cross-user D-13 test:** mocks `drizzle-orm`'s `eq()` function and tracks its second argument. Calls `getUserProfileHandler` directly with principal A's context. Asserts `eq()` was called with `principalA.id` and never `principalB.id`.

**TDD flow:**
- RED: `34e72d2` — 1 new failing test (user-profile.ts absent), 4 still passing
- GREEN: `4e09431` — all 5 tests pass; typecheck clean

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | bc4df60 | 4 failing auth-middleware tests (D-11/D-12/D-13) |
| Task 1 GREEN | 9ca8946 | authedServerFn deep module; all tests green |
| Task 2 RED | 34e72d2 | 1 failing getUserProfile cross-user test (D-12/D-13) |
| Task 2 GREEN | 4e09431 | getUserProfile server fn; all 5 tests green |

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Critical functionality] Added AuthedContext exported type**
- **Found during:** Task 2 — user-profile.ts needed a typed parameter for `{ context: { principal: User } }`
- **Issue:** Without an exported type, every future handler would redeclare the context shape manually, leading to drift and errors
- **Fix:** Added `export type AuthedContext = { context: { principal: User } }` to auth-middleware.ts
- **Files modified:** `src/lib/auth-middleware.ts`
- **Commit:** 4e09431

**2. [Rule 2 - Critical functionality] Exported getUserProfileHandler as named function**
- **Found during:** Task 2 test writing — TanStack Start server fns require AsyncLocalStorage runtime; `getUserProfile.__executeServer` and `.options.serverFn` are inaccessible in vitest
- **Issue:** Without an exported handler function, the cross-user test cannot invoke the DB query logic in isolation (same root cause as mapBattlenetProfile export in plan 04-03)
- **Fix:** Extracted the handler as `getUserProfileHandler` (exported for testability); `getUserProfile` wraps it via `.handler(getUserProfileHandler)`
- **Files modified:** `src/server/user-profile.ts`
- **Commit:** 4e09431

### Test Implementation Adjustments

**authMiddleware test call path:** The RESEARCH.md Pattern 6 shows `authMiddleware.server({ next })` but the TanStack Start createMiddleware API has `.server` as a fluent chaining method (not the registered handler). The correct test path is `authMiddleware.options.server({ next })` — the registered fn is stored in `.options.server`. Used a cast-to-any approach in the cross-user test to avoid complex internal type signatures.

## Threat Surface Scan

No new threat surface beyond the plan's threat model:

| Coverage | Assessment |
|----------|------------|
| T-04-04a (forged userId) | Mitigated — getUserProfile has no userId param; structural impossibility tested by D-13 |
| T-04-04b (missing/forged session) | Mitigated — authMiddleware throws 401 before handler; next() non-call asserted |
| T-04-04c (beforeLoad reliance) | Convention documented — authMiddleware IS the security boundary |

## Known Stubs

None. All exports are functional:
- `authMiddleware` — fully implemented; 401 gate tested
- `authedServerFn` — fully implemented; wraps createServerFn correctly
- `getUserProfile` — fully implemented; queries live DB when session present (requires NEON DATABASE_URL in env)
- `getUserProfileHandler` — fully implemented; tested offline with mocked db

## TDD Gate Compliance

**Task 1:**
- RED gate: `bc4df60` — `test(04-04): add failing auth-middleware tests (D-11/D-12/D-13)` (4 tests, all failing)
- GREEN gate: `9ca8946` — `feat(04-04): authedServerFn deep module (D-11/D-12/D-13)` (4 tests, all passing)

**Task 2:**
- RED gate: `34e72d2` — `test(04-04): add failing getUserProfile cross-user test (D-12/D-13)` (1 new failing test)
- GREEN gate: `4e09431` — `feat(04-04): getUserProfile server fn with principal-keyed DB query (D-12)` (5 tests, all passing)

## Self-Check: PASSED
