# Phase 05: Progress Tracking — Learnings

Lessons, patterns, and traps discovered during Phase 5 execution.
Apply these from Phase 6 onward.

---

## L-01: TanStack Start — `createServerFn` MUST be lexically visible at the call site

**Discovered:** Phase 5 end-of-phase verification (commit `a4c4032`)
**Severity:** High — silent runtime failure, not caught by TypeScript or unit tests

### What happened

The Phase 4 `authedServerFn` factory wrapped `createServerFn(opts).middleware([authMiddleware])`
and returned the builder. Callers chained `.handler(fn)` on the returned builder. This
compiled the handler body into the **client** bundle — TanStack Start's Vite compiler
extracts server functions by statically matching the literal `createServerFn(…).handler(…)`
pattern at the definition site. When the pattern is hidden inside a factory, the handler
runs in the browser: `process.env` is empty, the DB client crashes.

Auth routes (file routes like `/api/auth/$`) were unaffected — only `createServerFn`-based
server functions are subject to this constraint.

### Rule

> **Never wrap `createServerFn` in a factory or helper that returns the builder.**
> Every server function must have `createServerFn(…).handler(…)` lexically at the
> definition site — even if the middleware chain is identical across all functions.
> Use a shared middleware array entry (e.g. `[authMiddleware]`) for DRY auth enforcement.

### Pattern

```typescript
// WRONG — factory hides createServerFn from the compiler
const authedFn = (opts) => createServerFn(opts).middleware([authMiddleware]);
export const myFn = authedFn({ method: "POST" }).handler(async ({ context }) => { … });

// CORRECT — createServerFn visible at the definition site
export const myFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => { … });
```

### Why tests won't catch it

Unit tests that call handler functions directly (e.g. `myFnHandler({ context, data })`)
bypass the TanStack Start runtime and run handler code directly. The bug only manifests
when the function is invoked from the client — the client bundle contains the handler
body and the `process.env` / DB access fails in the browser.

**Test-authoring note:** To catch this class of bug, integration/e2e tests that invoke
server functions from a real browser context are required.

### Reference

- ADR 009 "Verification Notes & Implementation Fixes" § Fix 2
- Commit `a4c4032` — fix(05): define authed server fns with createServerFn directly

---

## L-02: Neon DB client — never instantiate at module scope

**Discovered:** Phase 5 end-of-phase verification (commit `da0af1a`)
**Severity:** Medium — crashes on first real client→server call, but caught quickly

### What happened

`src/lib/db.ts` called `neon(process.env.DATABASE_URL!)` at module load time.
During SSR module-graph initialization, the `better-auth` import chain caused
`db.ts` to be evaluated before the Nitro env injection had populated
`process.env.DATABASE_URL`. The call became `neon("")` — a crash on any DB
access from a server function.

This did not appear earlier because Phase 4 server functions were tested via
unit tests (direct handler imports) that never actually reached the DB, and
the auth file route doesn't use `db.ts` directly.

### Rule

> **Never call `neon()`, `new Client()`, or any network-client constructor
> at module scope** in files that are transitively imported by the auth setup
> or any file evaluated during SSR module-graph initialization.
>
> Create the client lazily — inside a getter, a `Proxy`, or the first call
> of a factory function — so it is constructed inside a request handler where
> `process.env` is fully populated.

### Pattern

```typescript
// WRONG — evaluated at module load, before env is populated
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!); // crashes during SSR init

// CORRECT — lazy Proxy; client built on first property access
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
let _client: ReturnType<typeof neon> | null = null;
const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(_, prop) {
    if (!_client) _client = neon(process.env.DATABASE_URL!);
    return (_client as any)[prop];
  },
});
export const db = drizzle(sql, { schema });
```

### Reference

- ADR 009 "Verification Notes & Implementation Fixes" § Fix 1
- Commit `da0af1a` — fix(05): lazily instantiate Neon db client
