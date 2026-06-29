---
phase: 04-auth-database
plan: "03"
subsystem: auth-wire
status: complete
tags: [auth, better-auth, battle-net, oauth, tdd, session, server-client-boundary]
completed: "2026-06-29"
duration: "40m"
tasks_completed: 3
files_changed: 5

dependency_graph:
  requires:
    - 04-02 (src/lib/db.ts singleton, src/db/schema.ts with custom identity fields)
  provides:
    - src/lib/auth.ts (betterAuth instance — server-only; auth, Session, User, mapBattlenetProfile)
    - src/lib/auth-client.ts (createAuthClient — client-safe; useSession, signIn, signOut)
    - src/routes/api/auth/$.ts (catch-all GET+POST -> auth.handler)
    - src/lib/auth.test.ts (12 offline vitest tests covering AUTH-01/AUTH-02/AUTH-04)
  affects:
    - 04-04 (session middleware reads auth from #/lib/auth)
    - 04-05 (UserDropdown uses useSession from #/lib/auth-client; signIn.oauth2 initiation)
    - 04-06 (gateway capture before OAuth redirect wires into authorizationUrlParams)
    - Phase 5 (progress records keyed on users.id — UUID v4 format enforced via generateId)

tech_stack:
  added:
    - "betterAuth (better-auth 1.6.22) instance with drizzleAdapter + genericOAuth + tanstackStartCookies"
    - "Battle.net OAuth via genericOAuth plugin (global endpoint: oauth.battle.net)"
    - "30-day rolling sessions with 5-min signed-cookie cache (cookieCache)"
    - "createAuthClient from better-auth/react — browser-safe, no DB adapter"
    - "TanStack Start catch-all route /api/auth/$ with server.handlers GET+POST"
  patterns:
    - "TDD RED/GREEN: test(04-03) commit first, then feat(04-03) GREEN commit"
    - "vi.mock('#/lib/db') with lazy-adapter stub — drizzleAdapter accesses db._ only at query time, not at init"
    - "Named export mapBattlenetProfile for unit-testability; referenced directly in genericOAuth config"
    - "auth.options.plugins[0].options.config pattern to inspect genericOAuth plugin config in tests"
    - "Record<string,unknown> input param to satisfy mapProfileToUser (profile: Record<string,any>) contravariance"

key_files:
  created:
    - src/lib/auth.ts
    - src/lib/auth.test.ts
    - src/lib/auth-client.ts
    - src/routes/api/auth/$.ts
  modified:
    - src/routeTree.gen.ts (tsr generate — /api/auth/$ registered)

decisions:
  - "mapBattlenetProfile exported as named function (not inline closure) so it is unit-testable and the same function is tested and used at runtime"
  - "usePlural: true in drizzleAdapter — schema exports plural JS keys (users/sessions) while better-auth uses singular model names internally"
  - "Battle.net returns { sub, id, battletag } only — no avatar, no region; avatarUrl left null until plan 04-05 generated avatar"
  - "gateway NOT mapped from OAuth (Pitfall 1, RESEARCH.md) — captured via UI region selector in plan 04-05/06"
  - "overrideUserInfo: true — refreshes battleTag on every login while user.id (UUID) stays stable (D-08/AUTH-04)"
  - "generateId: () => crypto.randomUUID() at advanced.database — UUID v4 format enforced for stable progress key (D-04/AUTH-04)"
  - "tanstackStartCookies() is LAST plugin — required by better-auth integration docs"
  - "mapProfileToUser param widened to Record<string,unknown> — TS contravariance: narrower { battletag, sub } is not assignable to (profile: Record<string,any>) => ..."
  - "CLI schema guard (@better-auth/cli generate) confirmed: our camelCase column names (battleTag, bnetSub, avatarUrl) are compatible with drizzle adapter — adapter uses JS key not DB column name; live DB has camelCase columns from 04-02 push"
  - "server.handlers: { GET, POST } pattern in TanStack Start route — one $.ts file handles all methods per RESEARCH Anti-Patterns"

metrics:
  duration: "40m"
  completed: "2026-06-29"
  tasks: 3
  files: 5
---

# Phase 04 Plan 03: Wire better-auth Summary

**One-liner:** Server-side betterAuth instance with Battle.net generic-OAuth, 30-day rolling sessions, and overrideUserInfo; client-safe React auth client; and /api/auth/$ catch-all route — all covered by 12 offline vitest tests.

## What Was Built

### Task 1: betterAuth instance + profile mapping + session config (TDD RED/GREEN)

`src/lib/auth.ts` is the server-only betterAuth instance. Key design decisions:

**Profile mapping (`mapBattlenetProfile`):**

Battle.net userinfo returns `{ sub, id, battletag }` only — no avatar, no region/gateway. The mapper:
- `name = battletag` — keeps display name current on re-login
- `battleTag = battletag` — exact key w3champions queries by (D-06)
- `bnetSub = sub` — stable Battle.net account identifier for deduplication

`gateway` and `avatarUrl` are intentionally absent from the mapper (RESEARCH Pitfall 1/2). They are populated separately in plans 04-05/06.

**Drizzle adapter:**

```typescript
database: drizzleAdapter(db, { provider: "pg", usePlural: true })
```

`usePlural: true` is required because the schema exports plural JS keys (`users`, `sessions`, etc.) while better-auth internally uses singular model names (`user`, `session`, etc.).

**Session config (D-09/D-10):**

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 30,  // 30-day rolling window
  updateAge: 60 * 60 * 24,        // 24h activity refresh
  cookieCache: { enabled: true, maxAge: 5 * 60 },  // 5-min signed-cookie cache
}
```

**UUID ID generation (D-04/AUTH-04):**

```typescript
advanced: { database: { generateId: () => crypto.randomUUID() } }
```

Ensures `user.id` is UUID v4 format — the stable progress key for Phase 5. The user.id never changes even when BattleTag is refreshed.

**Plugin order:** `[genericOAuth({...}), tanstackStartCookies()]` — TanStack cookie plugin is last per integration docs.

**TDD flow:**
- RED commit: `bcfcb71` — 12 failing tests covering mapBattlenetProfile (5), session config (2), additionalFields (4), overrideUserInfo (1)
- GREEN commit: `d25fcae` — auth.ts implemented; 12/12 tests pass

**Tests use `vi.mock("#/lib/db")` with a stub `{ _: { fullSchema: {} }, query: {} }`.** The drizzleAdapter is lazy — it only accesses `db._` when a query runs, not at initialization — so the stub is sufficient for config-level tests without a live DB connection.

### Task 2: Client-side auth client

`src/lib/auth-client.ts` is the ONLY auth surface React components may import. It has no database adapter, no secrets, and no server-only imports:

```typescript
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL ?? "http://localhost:3000",
  plugins: [genericOAuthClient()],
});

export const { useSession, signIn, signOut } = authClient;
```

`genericOAuthClient()` enables `authClient.signIn.oauth2({ providerId: "battlenet", ... })` — the method components use to initiate the Battle.net OAuth redirect (AUTH-01).

Verification: `node -e` script confirmed no import of `#/lib/auth`; typecheck clean.

### Task 3: Auth handler route + schema guard

`src/routes/api/auth/$.ts` is a 12-line catch-all route:

```typescript
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

One file handles all methods — per RESEARCH Anti-Patterns "catch-all $.ts, not one file per method".

`npm run generate-routes` (tsr generate) registered the route in `src/routeTree.gen.ts`.

**Schema guard result:** `@better-auth/cli generate` ran against the live auth config and produced a schema with plural table JS exports (matching our `usePlural: true`). Key finding: the CLI uses snake_case column names (`battle_tag`, `bnet_sub`) for custom fields, while our schema uses camelCase (`battleTag`, `bnetSub`). **No schema change required** — the drizzle adapter resolves columns by JS key (`schema["users"]["battleTag"]`), not by DB column name, and the live Neon DB already has camelCase columns from the 04-02 push. Self-consistent.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | bcfcb71 | 12 failing auth.ts tests (offline mocked) |
| Task 1 GREEN | d25fcae | betterAuth instance + profile mapper + session config |
| Task 1 fix | c23d5f5 | Widen mapBattlenetProfile param to Record<string,unknown> (TS type fix) |
| Task 2 | 6cdf3d0 | auth-client — client-safe better-auth React client |
| Task 3 | 07dd394 | Auth handler route /api/auth/$ + routeTree registration |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed param type on mapBattlenetProfile caused TS contravariance error**
- **Found during:** Task 2 typecheck (`npm run typecheck`)
- **Issue:** `mapProfileToUser` expects `(profile: Record<string, any>) => ...`. Our initial signature `(profile: { battletag: string; sub: string })` is a narrower input type — TS2322 contravariance error because a function accepting only specific keys cannot be assigned where a function accepting any Record is expected.
- **Fix:** Changed to `(profile: Record<string, unknown>)` with internal `String(profile["battletag"] ?? "")` extraction.
- **Files modified:** `src/lib/auth.ts`, `src/lib/auth.test.ts`
- **Commit:** c23d5f5

**2. [Rule 2 - Critical functionality] Added `usePlural: true` to drizzleAdapter**
- **Found during:** Task 1 research (Context7 + schema.ts inspection)
- **Issue:** Our schema exports plural JS keys (`users`, `sessions`, `accounts`, `verifications`) while better-auth internally uses singular model names. Without `usePlural: true`, the drizzle adapter would call `schema["user"]` which is `undefined` — all auth DB operations would fail at runtime.
- **Fix:** Added `{ provider: "pg", usePlural: true }` to `drizzleAdapter(db, ...)`.
- **Files modified:** `src/lib/auth.ts`
- **Commit:** d25fcae

## Known Stubs

None. All exports are functional:
- `mapBattlenetProfile` — fully implemented; gateway/avatarUrl intentionally absent (populated in 04-05/06 per plan)
- `authClient` — wired to VITE_APP_URL; Battle.net OAuth flow requires env vars in production
- `/api/auth/$` route — fully delegates to auth.handler

`gateway` being required in `additionalFields` but not populated by the mapper is intentional: it will be captured via a UI region selector and passed as extra data before the OAuth redirect (plan 04-05/06). This is a documented design decision (D-07), not a stub.

## Threat Flags

No new threat surface introduced beyond the plan's threat model:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | src/lib/auth.ts | BNET_CLIENT_SECRET + BETTER_AUTH_SECRET read at module scope — server-only file; verified auth-client.ts never imports this module (T-04-03c) |

T-04-03a (PKCE/state CSRF): delegated to better-auth generic-OAuth — not hand-rolled.
T-04-03b (session fixation, httpOnly cookie): delegated to better-auth's cookie management + tanstackStartCookies.
T-04-03c (secrets in client bundle): enforced — auth-client.ts has no import of #/lib/auth; verified by node script.
T-04-03d (open redirect on callbackURL): callbackURL is app-controlled ("/"), not taken from client input.

## TDD Gate Compliance

- RED gate: `bcfcb71` — `test(04-03): add failing auth.ts tests` (12 tests, all failing)
- GREEN gate: `d25fcae` — `feat(04-03): betterAuth instance + profile mapper + session config`
- REFACTOR: c23d5f5 type fix committed separately (not technically refactor but TypeScript correctness)

## Self-Check: PASSED

- `src/lib/auth.ts` exists with `export const auth`, `mapBattlenetProfile`, `Session`, `User`
- `src/lib/auth.test.ts` exists — 12/12 tests pass offline
- `src/lib/auth-client.ts` exists with `useSession`, `signIn`, `signOut`, `authClient`
- `src/routes/api/auth/$.ts` exists with `auth.handler` delegation
- `/api/auth/$` registered in `src/routeTree.gen.ts`
- 230 total project tests pass; `npm run typecheck` clean
- No secrets printed or committed
- RED commit bcfcb71 confirmed in git log
- GREEN commit d25fcae confirmed in git log
- Final task commit 07dd394 confirmed in git log
