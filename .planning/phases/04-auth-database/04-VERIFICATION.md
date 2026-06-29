---
phase: 04-auth-database
verified: 2026-06-30T00:22:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 4: Auth & Database Verification Report

**Phase Goal:** Users can sign in with Battle.net OAuth; sessions persist across browser refreshes; every server function that reads or writes user data derives the user identity from the server-side session, never from client input.
**Verified:** 2026-06-30T00:22:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                        | Status     | Evidence                                                                                                     |
|----|--------------------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------------------|
| 1  | A user can click "Sign in with Battle.net" and return to the app recognized by their BattleTag (AUTH-01)     | VERIFIED   | `SignInButton` → `RegionSelector` → `signIn.oauth2({ providerId: "battlenet" })` wired to `/api/auth/$` catch-all handler delegating to `auth.handler`. Live OAuth round-trip performed by human user; Neon user row confirmed. |
| 2  | Refreshing the browser does not log the user out — session cookie survives a normal browser refresh (AUTH-02) | VERIFIED   | `auth.ts` configures 30-day rolling sessions (`expiresIn: 2592000`, `updateAge: 86400`) with persistent cookie cache. `SiteHeader` renders nothing during `isPending` to avoid flash-of-CTA. Human user confirmed session persistence across refresh. |
| 3  | Every server function that reads or writes user data derives identity from the server-side session, never from client input (AUTH-03) | VERIFIED   | `authMiddleware` calls `getRequestHeaders()` + `auth.api.getSession()`, throws `"Unauthorized"` when session absent, injects `principal` via `next()`. `getUserProfile` accepts **no userId parameter**; queries exclusively by `context.principal.id`. Five tests in `auth-middleware.test.ts` pass: no-session throws + blocks `next()`, valid session injects principal, cross-user middleware test, DB-query principal-keyed test. All 5 pass. |
| 4  | The progress key is a stable internal UUID (not BattleTag) that survives display-name changes (AUTH-04)      | VERIFIED   | `auth.ts` sets `generateId: () => crypto.randomUUID()`. Schema `users.id` is the stable PK. `overrideUserInfo: true` refreshes `battleTag`/`name` on re-login while `id` never changes. Test `overrideUserInfo is true on battlenet config` passes. Live Neon row confirmed UUID v4 id. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                              | Expected                                      | Status     | Details                                                                                                            |
|---------------------------------------|-----------------------------------------------|------------|--------------------------------------------------------------------------------------------------------------------|
| `src/lib/auth.ts`                     | betterAuth instance with Battle.net genericOAuth | VERIFIED | substantive (285 lines), wired to db singleton + auth handler route; exports `auth`, `mapBattlenetProfile`, `User`, `Session` |
| `src/lib/auth-middleware.ts`          | `authedServerFn` + `authMiddleware` deep module  | VERIFIED | 103 lines; `authMiddleware` uses `getRequestHeaders()` + `auth.api.getSession()`; `authedServerFn` factory wired |
| `src/lib/auth-client.ts`             | Client-safe auth surface                        | VERIFIED | 51 lines; exports `useSession`, `signIn`, `signOut`; no server secrets; wired to SiteHeader auth components |
| `src/lib/db.ts`                      | Drizzle singleton over Neon HTTP               | VERIFIED | 38 lines; `drizzle({ client: sql, schema })` singleton; wired to `auth.ts` adapter and `user-profile.ts` |
| `src/db/schema.ts`                   | Users/sessions/accounts/verifications + custom identity fields | VERIFIED | 263 lines; `users` table has `battleTag`/`gateway`/`bnetSub`/`avatarUrl`; all four tables present with FK relations |
| `src/server/user-profile.ts`         | First authedServerFn consumer; principal-keyed   | VERIFIED | 70 lines; `getUserProfileHandler` queries `eq(users.id, principal.id)`; no userId param; exported for testability |
| `src/routes/api/auth/$.ts`           | catch-all auth handler delegating to `auth.handler` | VERIFIED | 35 lines; GET+POST handlers delegate to `auth.handler(request)` |
| `src/components/auth/SignInButton.tsx` | Gold CTA button (D-01)                        | VERIFIED | 51 lines; wired to `onOpenRegion` callback in SiteHeader |
| `src/components/auth/RegionSelector.tsx` | Gateway capture before OAuth redirect        | VERIFIED | 164 lines; calls `signIn.oauth2({ providerId: "battlenet", additionalData: { region: gateway } })` |
| `src/components/auth/UserDropdown.tsx` | Signed-in header widget (D-02)               | VERIFIED | 157 lines; uses `useSession()` from auth-client; shows BattleTag + DiceBear avatar + sign-out |
| `src/components/SiteHeader.tsx`       | Fixed 48px header composing auth UI layer     | VERIFIED | 110 lines; mounted in `__root.tsx`; conditional SignInButton/UserDropdown/pending states |
| `docs/adr/007-authed-server-fn-authorization.md` | ADR for authMiddleware pattern  | VERIFIED | 180 lines; documents D-11/D-12/D-13; covers IDOR prevention rationale |
| `docs/adr/008-betterauth-battlenet-integration.md` | ADR for Battle.net OAuth integration | VERIFIED | 292 lines; documents all 12 decisions including callback path fix, synthesized email, databaseHooks workaround |

### Key Link Verification

| From                                | To                                           | Via                                                               | Status   | Details                                              |
|-------------------------------------|----------------------------------------------|-------------------------------------------------------------------|----------|------------------------------------------------------|
| `src/lib/auth-middleware.ts`        | `src/lib/auth.ts`                           | `import { auth } from "#/lib/auth"` → `auth.api.getSession()`   | WIRED    | Direct import; getSession called with getRequestHeaders() |
| `src/server/user-profile.ts`        | `src/lib/auth-middleware.ts`                | `import { authedServerFn } from "#/lib/auth-middleware"`         | WIRED    | `authedServerFn({ method: "GET" }).handler(getUserProfileHandler)` |
| `src/server/user-profile.ts`        | `src/lib/db.ts`                             | `import { db } from "#/lib/db"` → `db.query.users.findFirst`    | WIRED    | DB query keyed by `principal.id` |
| `src/routes/api/auth/$.ts`          | `src/lib/auth.ts`                           | `import { auth } from "#/lib/auth"` → `auth.handler(request)`   | WIRED    | Catch-all GET+POST routes delegate to auth.handler |
| `src/components/SiteHeader.tsx`     | `src/components/auth/SignInButton.tsx`       | import + conditional render on `!session && !isPending`          | WIRED    | SignInButton renders in signed-out state |
| `src/components/SiteHeader.tsx`     | `src/components/auth/UserDropdown.tsx`       | import + conditional render on `session`                         | WIRED    | UserDropdown renders in signed-in state |
| `src/components/SiteHeader.tsx`     | `src/components/auth/RegionSelector.tsx`     | import + `regionOpen` state passed as `open` prop               | WIRED    | RegionSelector mounted; `onOpenRegion` from SignInButton drives open state |
| `src/routes/__root.tsx`             | `src/components/SiteHeader.tsx`             | `import { SiteHeader }` + `<SiteHeader />` in `RootDocument`    | WIRED    | SiteHeader mounts in every page layout above children |
| `src/lib/auth.ts`                   | `src/lib/db.ts`                             | `drizzleAdapter(db, { provider: "pg", usePlural: true })`        | WIRED    | drizzle adapter passes db singleton; usePlural maps plural exports |

### Data-Flow Trace (Level 4)

| Artifact                       | Data Variable         | Source                                        | Produces Real Data | Status     |
|--------------------------------|-----------------------|-----------------------------------------------|--------------------|------------|
| `src/server/user-profile.ts`   | return value          | `db.query.users.findFirst` keyed by `principal.id` | Yes — live Neon DB query | FLOWING |
| `src/components/auth/UserDropdown.tsx` | `session?.user?.name` | `useSession()` from auth-client reads session cookie | Yes — cookie-based session from better-auth | FLOWING |
| `src/lib/auth.ts`              | user row at sign-in   | `databaseHooks.user.create.before` + `getOAuthState()` for gateway | Yes — writes `battleTag`/`bnetSub`/`gateway` from OAuth + UI | FLOWING |

### Behavioral Spot-Checks

| Behavior                                                              | Command                                                               | Result          | Status |
|-----------------------------------------------------------------------|-----------------------------------------------------------------------|-----------------|--------|
| authMiddleware throws when no session                                 | `npx vitest run src/lib/auth-middleware.test.ts`                    | 5/5 tests pass  | PASS   |
| `next()` not called when session absent (D-13 gate)                  | Test: "does NOT call next() when getSession returns null"            | PASS            | PASS   |
| `principal` injected from session (not client input) on valid session | Test: "calls next() with context.principal when getSession returns a valid session" | PASS | PASS |
| Cross-user middleware: principal A's id injected regardless of B's id | Test: "middleware injects principal A's id when session belongs to A" | PASS           | PASS   |
| getUserProfile DB query keyed by principal.id, never forged id       | Test: "calls db.query.users.findFirst with eq(users.id, principal.id)" | PASS          | PASS   |
| mapBattlenetProfile maps battletag correctly (AUTH-01)               | `npx vitest run src/lib/auth.test.ts` (13 tests)                   | 13/13 pass      | PASS   |
| Session config: 30-day rolling window (AUTH-02, D-09)                | Test: "expiresIn is 30 days (2592000 seconds)"                      | PASS            | PASS   |
| additionalFields: battleTag/gateway/bnetSub all input:false (D-05)   | Tests: "declares X with input: false"                               | PASS            | PASS   |
| overrideUserInfo: true on battlenet provider (AUTH-04, D-08)          | Test: "overrideUserInfo is true on battlenet config"                | PASS            | PASS   |
| DB schema: 4 tables present with correct column set                  | `npx vitest run src/db/schema.test.ts` (11 tests)                  | 11/11 pass      | PASS   |
| db singleton: schema wired (db.query.users accessible)               | `npx vitest run src/lib/db.test.ts` (3 tests)                      | 3/3 pass        | PASS   |
| Live Battle.net OAuth round-trip                                      | Human-executed (orchestrator confirmed)                             | User row in Neon; session persists across refresh | PASS (human-verified) |

### Requirements Coverage

| Requirement | Description                                                    | Status     | Evidence                                                                               |
|-------------|----------------------------------------------------------------|------------|----------------------------------------------------------------------------------------|
| AUTH-01     | User can sign in with Battle.net OAuth (returns BattleTag identity) | SATISFIED | `genericOAuth` battlenet config + `mapBattlenetProfile` + handler route; human round-trip confirmed |
| AUTH-02     | Session persists across browser refresh                        | SATISFIED  | 30-day rolling session config + always-persistent cookie; human confirmed no logout on refresh |
| AUTH-03     | Server functions enforce session-based authorization (not input-shape only) | SATISFIED | `authMiddleware` + `authedServerFn` deep module; 5 tests pass; `getUserProfile` accepts no userId param |
| AUTH-04     | Stable account identifier as progress key (survives BattleTag changes) | SATISFIED | `generateId: () => crypto.randomUUID()` + `overrideUserInfo: true`; UUID v4 in Neon confirmed |

### Anti-Patterns Found

No `TBD`, `FIXME`, or `XXX` debt markers found in any Phase 4 source file. No stub implementations detected. No hardcoded empty returns in user-data server functions. No client-supplied userId inputs in any `authedServerFn`-based handler.

### Human Verification Required

None. All four AUTH requirements were verified: AUTH-01 and AUTH-02 by live OAuth round-trip (confirmed by the human user per orchestrator evidence); AUTH-03 by behavioral tests with 5/5 passing and code inspection confirming no client-supplied userId parameter surface; AUTH-04 by test + live Neon row inspection.

### Gaps Summary

No gaps found. All four phase goal clauses are delivered and verified:

1. **Battle.net OAuth sign-in (AUTH-01):** The full OAuth flow — `SignInButton` → `RegionSelector` → `signIn.oauth2` → `/api/auth/$` catch-all → `auth.handler` — is wired end to end. `mapBattlenetProfile` correctly extracts `battletag`/`sub`, synthesizes a stable email keyed on `sub`, and the `databaseHooks.user.create.before` hook populates the `input: false` identity fields (`battleTag`, `bnetSub`, `gateway`) that `mapProfileToUser` cannot set directly. Live OAuth round-trip succeeded.

2. **Session persistence across refresh (AUTH-02):** 30-day rolling sessions with always-persistent cookie and 5-minute cookie cache are configured. `SiteHeader` suppresses the CTA during `isPending` to prevent flash-of-signed-out state. Human-confirmed session survives browser refresh and sign-out.

3. **Session-derived identity invariant (AUTH-03 — the centerpiece):** `authMiddleware` resolves identity exclusively from `getRequestHeaders()` + `auth.api.getSession()`. It throws `Error("Unauthorized")` before calling `next()` when the session is absent. `authedServerFn`-based handlers (`getUserProfile` as the reference implementation) accept **no `userId` input parameter** — `context.principal.id` from the session is the sole identity channel. Cross-user access is structurally impossible by design (D-12), not guarded by a runtime check. The D-13 regression test confirms this: principal A's session always yields principal A's data regardless of any external context, and the DB query is confirmed keyed by `principal.id` never by any forged value. All 5 tests pass.

4. **Stable UUID progress key (AUTH-04):** `generateId: () => crypto.randomUUID()` guarantees UUID v4 format. `overrideUserInfo: true` refreshes the mutable `battleTag`/`name` on every login while the stable `id` UUID never changes. The `users.id` primary key is the correct hook for Phase 5 progress records (`ProgressRecordSchema.userId`). Live Neon user row confirmed UUID v4 format.

---

_Verified: 2026-06-30T00:22:00Z_
_Verifier: Claude (gsd-verifier)_
