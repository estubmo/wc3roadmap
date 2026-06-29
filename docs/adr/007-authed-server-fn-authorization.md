# ADR 007: authedServerFn — Principal-Keyed Authorization Convention

**Status:** Accepted
**Date:** 2026-06-29
**Phase:** 04-auth-database

---

## Context

TanStack Start server functions (created via `createServerFn`) are HTTP
endpoints exposed by Nitro at runtime. They are reachable by any HTTP client
— including `curl` — independent of any React route rendering. This means:

1. **`beforeLoad` is not a security boundary.** Route guards placed in
   `beforeLoad` or `loader` protect the navigation UX but are bypassed by
   direct server-function calls. Any authorization logic that relies solely on
   `beforeLoad` can be circumvented by a caller who knows the internal RPC path
   (RESEARCH.md Pitfall 7).

2. **Client-supplied `userId` is untrusted.** A server function that accepts a
   `userId` parameter and returns that user's data can be exploited to read
   arbitrary users' data by substituting a different ID in the request body.
   This is a classic IDOR (Insecure Direct Object Reference) vulnerability.

3. **Authorization must be server-side and session-derived.** The server-side
   session resolved by `auth.api.getSession()` is the only trustworthy source
   of caller identity — it cannot be forged by a client without a valid cookie.

Phase 4 ships the first user-data server function (`getUserProfile`), and
subsequent phases (5 — progress, 7 — w3champions sync, 8 — replay) will add
many more. Without a mandated pattern, each phase is a new opportunity to
accidentally introduce a client-trusting authorization bug.

The `authedServerFn` deep module (`src/lib/auth-middleware.ts`) was designed to
eliminate this class of bug by construction.

---

## Decision

**The `authedServerFn` factory and `authMiddleware` middleware are the mandatory
pattern for all server functions that read or write user-specific data.**

### The module interface (callers only need to know this)

```typescript
// Factory — preferred entry point
export function authedServerFn(options: { method: "GET" | "POST" }) {
  return createServerFn(options).middleware([authMiddleware]);
}

// Context type for handler functions
export type AuthedContext = { context: { principal: User } };
```

Callers write:

```typescript
export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  async ({ context }: AuthedContext) => {
    const { principal } = context;
    return db.query.users.findFirst({ where: eq(users.id, principal.id) });
  }
);
```

No `userId` parameter. No `req.body.userId`. No client-supplied identity at all.

### Authorization rules enforced by this module (D-11/D-12)

1. **D-11 — 401 gate before the handler:** `authMiddleware` calls
   `auth.api.getSession({ headers })` and throws `Error("Unauthorized")` when
   the session is absent or invalid. The handler's `next()` is **never called**
   without a valid session. This is verified by the D-13 regression test (see
   below).

2. **D-12 — Principal-keyed by construction:** User-data server functions built
   on `authedServerFn` accept no `userId` input. Every DB query is keyed by
   `context.principal.id` — the UUID injected by `authMiddleware` from the
   session. Cross-user access is structurally impossible, not merely guarded by
   a check.

3. **D-13 — Regression test gate:** `src/lib/auth-middleware.test.ts` asserts:
   - A call with no session receives `Error("Unauthorized")` and `next()` is
     never called.
   - A call with a valid session injects the correct `principal`.
   - A `getUserProfileHandler` call with Principal A's context queries
     `principal.id === A.id` and never `B.id`, even when B's ID is present in
     the environment. This test is the standing regression lock against
     inadvertent IDOR introduction.

### Implementation note

`authMiddleware` uses `getRequestHeaders()` from `@tanstack/react-start/server`
to retrieve the current request's headers. This is the only correct API in
TanStack Start 1.168.x — `request.headers` from middleware params is broken
in this version (RESEARCH.md Pitfall 4).

### Handler testability pattern

Handlers are extracted as named exported functions so they can be tested in
isolation without the TanStack Start server runtime (which requires
`AsyncLocalStorage` context not available in Vitest):

```typescript
// Extracted handler — directly testable
export async function getUserProfileHandler({ context }: AuthedContext) { ... }

// Server function wraps the handler
export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  getUserProfileHandler
);
```

This pattern (same function exported for tests and used at runtime) is
established in Phase 4 as `mapBattlenetProfile` / `getUserProfileHandler` and
must be followed in every subsequent authed server function.

### Files implementing this convention

- **`src/lib/auth-middleware.ts`** — `authMiddleware`, `authedServerFn`,
  `AuthedContext`. The one file to audit for the authorization boundary.
- **`src/lib/auth-middleware.test.ts`** — 5 tests covering D-11/D-12/D-13.
  The regression gate.
- **`src/server/user-profile.ts`** — first consumer; the reference
  implementation every later phase copies.

---

## Consequences

**Positive:**

- **One audit point.** Authorization logic is concentrated in
  `src/lib/auth-middleware.ts`. Reviewing this single file is sufficient to
  verify the authorization boundary for all user-data server functions in the
  project.
- **IDOR is structurally impossible** for any server function built on
  `authedServerFn`. There is no client input channel to forge.
- **The D-13 regression test is a standing gate.** If a future developer
  accidentally adds a `userId` parameter or changes the query key, the test
  will fail before merge.
- **The pattern is copy-pasteable.** Each new phase's user-data server
  functions follow an identical structure — minimal cognitive overhead for
  contributors.

**Negative / trade-offs:**

- Every user-data server function must use `authedServerFn` — callers cannot
  bypass it "just this once". This is intentional friction.
- The handler extraction pattern (exported named function + server fn wrapper)
  adds a small amount of boilerplate. This is the cost of testability without
  the TanStack Start runtime.
- If `getRequestHeaders()` API changes in a future TanStack Start version,
  `authMiddleware` is the single point that must be updated — but this is a
  positive (one change point, not N scattered).

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Check `beforeLoad` in route guards only | `beforeLoad` guards UX navigation; direct server-function HTTP calls bypass it entirely (Pitfall 7). Not a real security boundary. |
| Accept `userId` parameter, validate ownership in handler | Requires a check in every handler. One missed check = IDOR. Also verbose. Principal-keyed-by-construction eliminates the entire class of mistake. |
| Use a shared utility `validateOwnership(userId, principal)` | Still requires callers to call it; one omission = bug. Structural prevention is stronger than convention enforcement. |
| Session check inline in each handler | No single audit point; duplication; drift risk. The middleware extracts exactly this logic once. |

---

## Related Decisions

- **D-11** — 401 gate before any user-data handler; authMiddleware is the enforcement point
- **D-12** — Principal-keyed by construction; no `userId` param on any user-data server fn
- **D-13** — Cross-user regression test ships with the module
- **AUTH-03** — Server-function authorization requirement
- **ADR 001** — TanStack Start as the server-function framework
- **RESEARCH.md Pitfall 4** — `getRequestHeaders()` vs `request.headers` in TanStack Start 1.168.x
- **RESEARCH.md Pitfall 7** — `beforeLoad` is UX-only, not a security boundary
