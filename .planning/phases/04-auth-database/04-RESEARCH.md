# Phase 4: Auth & Database - Research

**Researched:** 2026-06-29
**Domain:** Authentication (better-auth + Battle.net OAuth), Database (Drizzle + Neon), TanStack Start server functions
**Confidence:** MEDIUM (core patterns verified; Battle.net + better-auth integration is LOW-MEDIUM — spike required)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sign-in & Identity UI (AUTH-01)**
- D-01: Sign-in is a persistent header button (top-right), always visible over the full-screen graph. Gold-accent CTA, obsidian+gold design direction.
- D-02: Signed-in state shows BattleTag + Battle.net avatar + dropdown (dropdown: sign-out now, future "Sync with w3champions" in Phase 7).
- D-03: Sign-in is purely additive — graph and all content fully usable signed-out.

**Identity Data Model (AUTH-04)**
- D-04: Progress key is a stable internal UUID — never the BattleTag (survives display-name changes).
- D-05: Full identity profile: UUID + BattleTag + gateway/region + avatar URL + created/updated timestamps.
- D-06: Stored BattleTag MUST be the exact canonical form w3champions queries by (`Name#1234`); gateway/region persisted so Phase 7/8 can resolve the player without re-capture.
- D-07: Sign-in supports all western Battle.net regions (US / EU / KR / APAC; non-China); store user's region/gateway.
- D-08: Refresh BattleTag + avatar on every login from Battle.net so display name stays current; UUID stays stable.

**Sessions (AUTH-02)**
- D-09: Sessions are 30-day rolling — refreshes on activity, expires after 30 days idle.
- D-10: Always-persistent cookie — no "remember me" toggle.

**Server-Function Authorization (AUTH-03 — centerpiece)**
- D-11: Single reusable `authedServerFn` deep module: resolves `getSession()`, injects principal UUID, throws 401 on no valid session.
- D-12: Resource ownership enforced principal-keyed by construction — user-data server functions ignore any client-supplied userId entirely.
- D-13: This phase includes an automated authorization test: call a user-data server function with a forged/other user's id, assert it returns the principal's data (or 401), never the forged target.

**Architecture discipline**
- D-14: Extend root `CONTEXT.md` with new domain terms (principal, session, BattleTag, gateway/region, account UUID). Record ADRs in `docs/adr/` for `authedServerFn` authorization convention (D-11/D-12) and better-auth + Battle.net integration.

### Claude's Discretion
- Local dev DB + contributor secrets workflow — Neon dev branch vs local Docker Postgres, drizzle-kit migration workflow, `.env.example` documentation.
- better-auth schema details — exact better-auth table set and how custom `users` profile fields attach (user-table extension vs adjacent table).
- Battle.net OAuth host/scope specifics — which regional authorization endpoints and the minimal scope (BattleTag/`openid`).
- Header dropdown component — reuse shadcn primitives (button/badge/tooltip; add dropdown-menu via shadcn CLI as needed).

### Deferred Ideas (OUT OF SCOPE)
- w3champions ladder sync (MMR tier, games volume, W/L) — Phase 7.
- Replay upload + auto-pull from w3champions — Phase 8.
- Progress persistence + localStorage merge on first sign-in — Phase 5.
- Profile page (beyond the header dropdown) — future.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in with Battle.net OAuth (returns BattleTag identity) | Battle.net generic-OAuth plugin config; battletag field in userinfo; shadcn dropdown-menu + avatar components |
| AUTH-02 | Session persists across browser refresh | better-auth session.expiresIn + updateAge; tanstackStartCookies(); cookie persistence confirmed |
| AUTH-03 | Server functions enforce session-based authorization on all user-data access (not just input-shape validation) | authedServerFn pattern via createMiddleware; getRequestHeaders() + auth.api.getSession(); principal-keyed queries |
| AUTH-04 | A stable account identifier is used as the progress key (survives BattleTag display changes) | better-auth user table has stable internal UUID; sub from Battle.net is the external stable ID; UUID keyed in users table |
</phase_requirements>

---

## Summary

Phase 4 establishes two foundational primitives: (1) the database layer (Drizzle + Neon PostgreSQL) and (2) the auth/session layer (better-auth with Battle.net OAuth via the generic-OAuth plugin). Both are well-understood individually; their integration in TanStack Start is documented and broadly community-validated. The one genuinely LOW-MEDIUM confidence area is the Battle.net generic-OAuth plugin specific wiring — no community-validated example exists with this exact stack — which the ADR and CONTEXT.md flag as needing a 1-2 day spike before the rest of the phase can proceed.

The centerpiece deliverable is the `authedServerFn` deep module (D-11/D-12): a reusable TanStack Start middleware that resolves `getSession()`, injects the principal UUID, and throws 401 on no session. Every user-data server function in Phases 5–8 builds on this pattern — getting it right at commit one is the highest-stakes design decision of this phase.

Critical finding: **Battle.net OAuth does not return an avatar URL** (confirmed by Blizzard developer in a forum thread; feature has been requested since 2020 and explicitly declined). D-05's `avatarUrl` field must be populated from a non-OAuth source (e.g., initials-based generated avatar from Dicebear or similar). The plan must address this gap.

Critical finding: **The user's region (gateway) is NOT returned by the Battle.net userinfo endpoint** — only `sub`, `id`, and `battletag` are in the response. D-05/D-06 require storing the region. The plan must include a region-selector step in the sign-in UI before the OAuth redirect.

**Primary recommendation:** Wave 1 = Neon DB + Drizzle schema + better-auth wiring (no UI). Wave 2 = the `authedServerFn` middleware (deep module). Wave 3 = sign-in UI (header button + signed-in dropdown). Wave 4 = authorization test. Treat the region-selector flow as part of Wave 3.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Battle.net OAuth redirect | Frontend Server (SSR) | — | The auth handler is a server route; the redirect is browser-native |
| Session cookie management | Frontend Server (SSR) | Browser | Cookie set by server; browser transmits it on every request |
| Session resolution (getSession) | API / Backend (server function) | — | Must happen server-side; never derived from client input |
| User identity storage (users table) | Database / Storage | — | Neon Postgres; stable UUID is the primary key |
| better-auth tables (account/session) | Database / Storage | — | Managed by better-auth adapter; not directly queried by app code |
| authedServerFn authorization | API / Backend | — | Middleware runs before the server function handler; security boundary |
| Sign-in UI (header button) | Browser / Client | Frontend Server (SSR) | React component; renders in both SSR pass and client |
| Signed-in dropdown (BattleTag + sign-out) | Browser / Client | — | Client-interactive; reads session from client auth store |
| Region selector | Browser / Client | — | Captured before OAuth redirect; passed as URL param to auth |

---

## Standard Stack

### Core (Phase 4 additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.6.22 | Authentication framework — sessions, OAuth, DB adapter | Official TanStack Start adapter; absorbed Auth.js 2025; generic OAuth plugin for Battle.net; 4.2M weekly downloads |
| `drizzle-orm` | 0.45.2 | ORM for PostgreSQL | Already locked in ADR-001. Edge-first, type-safe. Note: CLAUDE.md cites 0.44.x — drifted to 0.45.2 on npm. |
| `drizzle-kit` | 0.31.10 | Schema migrations | Paired with drizzle-orm. CLAUDE.md cites 0.25.x — drifted to 0.31.10. Pin 0.31.10 at install. |
| `@neondatabase/serverless` | 1.1.0 | Neon HTTP driver for Postgres | Edge-compatible; works on Vercel Node.js + Cloudflare Workers. Required for Neon. |

### Supporting (shadcn components to add)

| Component | How to Install | Purpose |
|-----------|----------------|---------|
| `dropdown-menu` | `npx shadcn add dropdown-menu` | Signed-in header dropdown (sign-out, future profile link) |
| `avatar` | `npx shadcn add avatar` | BattleTag avatar display in header |

### Packages Already in package.json (no install needed)
- `@tanstack/react-start` 1.168.26 — `createServerFn`, `createMiddleware`, `getRequestHeaders`
- `@tanstack/react-query` ^5.101.2 — session state on client
- `zod` 4.4.3 — validation

### Installation (new packages only)
```bash
npm install better-auth drizzle-orm@0.45.2 @neondatabase/serverless
npm install -D drizzle-kit@0.31.10
npx shadcn add dropdown-menu avatar
```

### Version verification

```
better-auth      1.6.22   (npm view better-auth version — confirmed 2026-06-29)
drizzle-orm      0.45.2   (npm view drizzle-orm version — confirmed 2026-06-29)
drizzle-kit      0.31.10  (npm view drizzle-kit version — confirmed 2026-06-29)
@neondatabase/serverless 1.1.0 (npm view @neondatabase/serverless version — confirmed 2026-06-29)
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| `better-auth` | npm | 2 yrs (Apr 2024) | 4.2M | github.com/better-auth/better-auth | SUS (false positive — "too-new" flag triggered by latest version date 2026-06-26, not package creation date) | **Approved** — 4.2M downloads, 2-year history, locked in CLAUDE.md and ADR-001 |
| `drizzle-orm` | npm | 4 yrs (Sep 2021) | ~millions | github.com/drizzle-team/drizzle-orm | SUS (false positive — legitimacy checker returned unknown signals; npm view confirms creation 2021, repo confirmed) | **Approved** — locked in ADR-001, industry standard |
| `drizzle-kit` | npm | — | 9.4M | github.com/drizzle-team/drizzle-orm | OK | Approved |
| `@neondatabase/serverless` | npm | — | 2.2M | github.com/neondatabase/serverless | OK | Approved |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as [SUS]:** both flags are false positives confirmed by manual verification; all packages approved.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │ click "Sign in with Battle.net"
  │ (optional: region selector → stores region in sessionStorage)
  ▼
TanStack Start Server (Vercel Node.js)
  │
  ├── src/routes/api/auth/$.ts         ← better-auth handler (GET/POST)
  │     auth.handler(request)
  │       └─ generic-OAuth plugin
  │            ├── redirect to https://oauth.battle.net/authorize
  │            ├── receive callback with code
  │            ├── exchange code → token
  │            ├── fetch https://oauth.battle.net/userinfo → {sub, id, battletag}
  │            ├── map profile → users table row (UUID, battleTag, gateway, image)
  │            ├── write session row (token, expiresAt)
  │            └── set session cookie (tanstackStartCookies plugin)
  │
  ├── src/lib/auth.ts                   ← betterAuth instance (single export)
  │     drizzleAdapter(db, {provider:'pg'})
  │     genericOAuth([battlenet config])
  │     tanstackStartCookies()
  │
  ├── src/lib/auth-middleware.ts        ← authedServerFn deep module
  │     authMiddleware = createMiddleware({type:'function'})
  │       .server(async ({next}) => {
  │           const session = await auth.api.getSession({
  │               headers: getRequestHeaders()
  │           })
  │           if (!session) throw 401
  │           return next({context: {principal: session.user}})
  │       })
  │
  ├── src/server/user-data.ts           ← example user-data server fn
  │     createServerFn()
  │       .middleware([authMiddleware])
  │       .handler(async ({context}) => {
  │           const {principal} = context   ← UUID from session, never from input
  │           return db.query.users.findFirst({where: eq(users.id, principal.id)})
  │       })
  │
Neon PostgreSQL (Neon dev branch for dev; main branch for prod)
  ├── users        (UUID, battleTag, gateway, image, sub, createdAt, updatedAt)
  ├── session      (id, userId→users.id, token, expiresAt, ...)
  ├── account      (id, userId→users.id, accountId, providerId, accessToken, ...)
  └── verification (id, identifier, value, expiresAt, ...)
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── auth.ts                # betterAuth instance — single export, consumed server-side
│   ├── auth-client.ts         # createAuthClient() — consumed client-side only
│   ├── auth-middleware.ts     # authMiddleware (deep module) + authedServerFn factory
│   └── db.ts                  # drizzle(neon(DATABASE_URL)) singleton
├── db/
│   ├── schema.ts              # all Drizzle table defs (generated + custom extension)
│   └── migrations/            # drizzle-kit generated migration SQL files
├── server/
│   └── user-profile.ts        # first user-data server function (uses authMiddleware)
├── routes/
│   └── api/auth/$.ts          # better-auth handler route (catch-all)
└── components/
    ├── auth/
    │   ├── SignInButton.tsx    # gold-accent CTA (D-01)
    │   └── UserDropdown.tsx    # BattleTag + avatar + dropdown (D-02)
    └── ui/                     # existing + new: dropdown-menu, avatar
```

### Pattern 1: better-auth Instance (auth.ts)

```typescript
// src/lib/auth.ts
// SPDX-License-Identifier: GPL-3.0-or-later
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  user: {
    additionalFields: {
      // D-05: BattleTag in canonical Name#1234 format
      battleTag: { type: "string", required: true, input: false },
      // D-05/D-06: gateway = us | eu | kr (persisted for Phase 7/8)
      gateway: { type: "string", required: true, input: false },
      // D-05: avatarUrl nullable — Battle.net does NOT provide avatar; may be null
      avatarUrl: { type: "string", required: false, input: false },
      // D-05: stable sub from Battle.net (for deduplication across re-auths)
      bnetSub: { type: "string", required: true, input: false },
    },
  },

  session: {
    // D-09: 30-day rolling session
    expiresIn: 60 * 60 * 24 * 30,
    // Rolling: refresh window extends every 24h of activity
    updateAge: 60 * 60 * 24,
    // Cache session in signed cookie to avoid DB round-trip per request
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "battlenet",
          clientId: process.env.BNET_CLIENT_ID!,
          clientSecret: process.env.BNET_CLIENT_SECRET!,
          // Global endpoint handles US/EU/KR/APAC (non-China)
          // SPIKE: verify this works for EU/KR players — see Open Questions #1
          authorizationUrl: "https://oauth.battle.net/authorize",
          tokenUrl: "https://oauth.battle.net/token",
          userInfoUrl: "https://oauth.battle.net/userinfo",
          // No scopes required for battletag
          scopes: [],
          // D-08: Refresh battleTag on every login (overrideUserInfo updates DB)
          overrideUserInfo: true,
          mapProfileToUser: async (profile: { battletag: string; sub: string }) => ({
            name: profile.battletag,
            battleTag: profile.battletag,
            bnetSub: profile.sub,
            // avatarUrl: null — Battle.net has no OAuth avatar endpoint
            // gateway: captured from UI region selector BEFORE redirect
            // (see Open Question #2 for gateway capture strategy)
          }),
        },
      ],
    }),
    // D-10: tanstackStartCookies MUST be last plugin
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

### Pattern 2: Auth Handler Route

```typescript
// src/routes/api/auth/$.ts
// SPDX-License-Identifier: GPL-3.0-or-later
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

### Pattern 3: authedServerFn Deep Module (D-11/D-12)

```typescript
// src/lib/auth-middleware.ts
// SPDX-License-Identifier: GPL-3.0-or-later
//
// authedServerFn — the authorization deep module.
//
// INTERFACE: Simple. Callers add .middleware([authMiddleware]) to any server
// function. The handler receives context.principal (the session user) and
// must key all queries by principal.id — never by client-supplied userId.
//
// IMPLEMENTATION: Hides the getRequestHeaders() + auth.api.getSession() +
// 401-throw logic behind a single composable primitive. One file to audit.
//
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth, type User } from "./auth";

// Source: dev.to/hirotoshioi/how-to-protect-server-functions-with-auth-middleware
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      // 401 — no valid session. Client receives this as a thrown error.
      throw new Error("Unauthorized");
    }

    // Inject principal — downstream handlers read context.principal.id
    return next({ context: { principal: session.user as User } });
  }
);

// Convenience factory: wraps createServerFn with auth middleware pre-applied.
// Usage: const myFn = authedServerFn({ method: "GET" }).handler(async ({context}) => {
//   const { principal } = context;  // principal.id is the UUID progress key
//   ...
// });
export function authedServerFn(options: { method: "GET" | "POST" }) {
  return createServerFn(options).middleware([authMiddleware]);
}
```

### Pattern 4: Database Connection (Vercel Node.js runtime)

```typescript
// src/lib/db.ts
// SPDX-License-Identifier: GPL-3.0-or-later
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

// neon-http driver works on both Vercel Node.js and edge runtimes.
// For migrations, use direct (non-pooled) connection string (see drizzle-kit config).
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

### Pattern 5: drizzle.config.ts (migrations)

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT (non-pooled) connection for migrations
    // Neon Console → Connection string → "Direct connection"
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
```

### Pattern 6: Authorization Test (D-13 / Success Criterion 3)

```typescript
// src/lib/auth-middleware.test.ts
// Tests that a forged userId is IGNORED and 401 is thrown when no session exists.
// This is an integration-style test that mocks the auth.api.getSession call.
import { describe, expect, it, vi } from "vitest";

// Mock auth.api.getSession to simulate no session (forged token scenario)
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null), // No valid session
    },
  },
}));

// Mock getRequestHeaders — required by the server context
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: vi.fn().mockReturnValue(new Headers()),
}));

describe("authMiddleware", () => {
  it("throws Unauthorized when no session exists (forged userId scenario)", async () => {
    const { authMiddleware } = await import("./auth-middleware");

    // Simulate the middleware being invoked with a next() that should never run
    const next = vi.fn();
    await expect(
      // @ts-expect-error -- partial mock
      authMiddleware.server({ next })
    ).rejects.toThrow("Unauthorized");

    // next() was never called — handler never ran with forged principal
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Anti-Patterns to Avoid

- **Accepting userId from client input:** Server functions MUST ignore any `userId` in the request body/params. Use `context.principal.id` exclusively.
- **Calling `auth.api.getSession` with `new Headers()`:** Must use `getRequestHeaders()` from `@tanstack/react-start/server` — the request context is bound to the current server function invocation.
- **Using the old `request.headers` middleware pattern:** The `getRequestHeaders()` function is the current correct API (confirmed via GitHub issue #6818; the docs were updated). `request.headers` from middleware params does NOT work in TanStack Start 1.168.x.
- **Putting auth logic in `beforeLoad`:** `beforeLoad` guards the route UX but does NOT protect server function endpoints — a direct `curl` can still call the server function. The `authMiddleware` in the server function IS the security boundary.
- **One auth handler file per HTTP method:** Use the catch-all `$.ts` pattern — one file, GET + POST handlers.
- **Running `drizzle-kit migrate` with a pooled connection string:** Neon pooled connections (port 5432 on neon.tech) fail migrations. Use the direct connection string (Neon Console → "Direct connection" toggle).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session token generation + storage | Custom JWT or cookie session | `better-auth` session module | Token signing, rotation, cookie security, replay protection are non-trivial |
| OAuth code exchange | Custom Battle.net OAuth flow | `better-auth` generic-OAuth plugin | PKCE, state param, token validation, callback URL management are fiddly |
| DB migrations | Manual `ALTER TABLE` SQL | `drizzle-kit generate` + `migrate` | Schema diffing, rollback tracking, migration ordering |
| Session caching | Per-request DB lookup | `better-auth` cookieCache | 5-minute signed cookie prevents >1 DB round-trip per user per page |
| Auth middleware | Custom Express-like middleware | `createMiddleware({type:'function'})` | TanStack Start has native typed middleware that integrates with server functions |
| UUID generation | Custom ID generator | PostgreSQL `gen_random_uuid()` via Drizzle | DB-native; no application layer code needed |

**Key insight:** The auth primitives are a mine-field of security edge cases. better-auth handles token replay, cookie scope, CSRF, session fixation, and PKCE. Do not replicate any of this.

---

## Common Pitfalls

### Pitfall 1: Region Not in Battle.net Userinfo Response
**What goes wrong:** Phase 4 stores `gateway` as a required field (D-05/D-06), but `https://oauth.battle.net/userinfo` returns only `{sub, id, battletag}` — no region field.
**Why it happens:** Battle.net identifies users by account, not by the region their games live on. A player's BattleTag is the same on US and EU.
**How to avoid:** Capture the region via a UI selector before initiating the OAuth redirect. Pass it as a state parameter or store it temporarily in sessionStorage, then write it to the users table during the `mapProfileToUser` callback (requires the region to survive the OAuth round-trip — use better-auth's `authorizationUrlParams` to embed it).
**Warning signs:** If gateway is always null or always "us" — means the capture step was missed.

### Pitfall 2: Avatar URL is Not Available from Battle.net OAuth
**What goes wrong:** D-02 shows BattleTag + Battle.net avatar in the header; D-05 includes avatarUrl. But the Battle.net OAuth userinfo endpoint does NOT return an avatar URL. Blizzard explicitly declined to add it.
**Why it happens:** Blizzard's battle.net profile picture is separate from the OAuth userinfo endpoint and not exposed to third parties.
**How to avoid:** Make `avatarUrl` nullable in the schema. For the header display, generate a deterministic avatar from the BattleTag (e.g., DiceBear API `https://api.dicebear.com/9.x/initials/svg?seed={battleTag}` or a locally-generated initials avatar) and populate `avatarUrl` with that. This satisfies D-02 without requiring Battle.net to provide it.
**Warning signs:** `avatarUrl` is always null or the `image` field in better-auth's user record is never populated.

### Pitfall 3: mapProfileToUser Only Runs on User Creation (not every login) by Default
**What goes wrong:** D-08 requires refreshing BattleTag on every login, but `mapProfileToUser` without `overrideUserInfo: true` only runs once during initial account creation. Subsequent logins do not update the users table.
**Why it happens:** better-auth default: create the user once, update nothing on re-login.
**How to avoid:** Set `overrideUserInfo: true` in the genericOAuth config. This causes `mapProfileToUser` to be called and the user record to be updated on every successful sign-in.
**Warning signs:** A player who changed their BattleTag still sees the old one in the app after signing in again.

### Pitfall 4: Wrong Import for getRequestHeaders
**What goes wrong:** `auth.api.getSession({headers: request.headers})` from the old middleware docs fails silently or throws a runtime error in TanStack Start 1.168.x.
**Why it happens:** TanStack Start changed how request headers are accessed in server contexts. The old `request` parameter from middleware is no longer the correct access point.
**How to avoid:** Always import and call `getRequestHeaders()` from `@tanstack/react-start/server`:
```typescript
import { getRequestHeaders } from "@tanstack/react-start/server";
const headers = getRequestHeaders();
const session = await auth.api.getSession({ headers });
```
**Warning signs:** GitHub issue #6818 documents this change. If getSession returns null on every call despite a valid cookie, this is the likely cause.

### Pitfall 5: Migration Connection String Must Be Non-Pooled
**What goes wrong:** Running `drizzle-kit migrate` with a Neon pooled connection string (the default one in the Neon Console) fails with connection timeout or transaction errors.
**Why it happens:** Neon pooled connections don't support the extended transactions drizzle-kit uses for migration operations.
**How to avoid:** Use separate env vars: `DATABASE_URL` (pooled, for app queries) and `DATABASE_URL_DIRECT` (direct/non-pooled, for migrations only). The `drizzle.config.ts` reads from `DATABASE_URL_DIRECT`. Both are in `.env.local` / CI secrets.
**Warning signs:** `drizzle-kit migrate` hangs or errors with "cannot begin/end transactions in pgbouncer".

### Pitfall 6: drizzle-orm Version Drift from CLAUDE.md
**What goes wrong:** CLAUDE.md pins `drizzle-orm@0.44.x` and `drizzle-kit@0.25.x`, but npm latest is 0.45.2 / 0.31.10 as of June 2026. Installing `drizzle-orm@0.44.x` may conflict with better-auth's adapter expectations.
**Why it happens:** ADR-001 notes this drift explicitly: "drizzle-orm has drifted to 0.45.2 and drizzle-kit to 0.31.10 on npm since the CLAUDE.md table was written."
**How to avoid:** Pin `drizzle-orm@0.45.2` and `drizzle-kit@0.31.10` at install time. Update CLAUDE.md version table and ADR-001 changelog note after installing. Do NOT use `0.44.x` — install the verified current versions.

### Pitfall 7: beforeLoad is Not the Auth Security Boundary
**What goes wrong:** A developer puts an auth check in a route's `beforeLoad` and assumes the server function is protected. A direct `curl` or Postman call to the server function's URL bypasses the route entirely.
**Why it happens:** Common mental model from traditional page-based auth. TanStack Start's `beforeLoad` guards page navigation UX, not server function HTTP endpoints.
**How to avoid:** Every server function that touches user data MUST apply `authMiddleware`. `beforeLoad` is for UX-only — redirect unsigned-out users to the homepage, but rely on `authMiddleware` for actual data protection. This is why D-11/D-12 establishes the `authedServerFn` pattern as mandatory.

---

## Runtime State Inventory

> This is not a rename/refactor phase. Included here to flag the state introduced by this phase (for future phases' awareness) and any prior state that Phase 4 must wire into.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `src/schemas/progress.ts` — `ProgressRecordSchema.userId: z.string()` (Phase 1 slot) | Phase 4 establishes this as the UUID from the `users` table. Phase 5 actually starts writing progress records. No data migration needed — no progress records exist yet. |
| Live service config | Neon Postgres project — newly created in this phase | Provision Neon project (main + dev branches); add connection string to Vercel env vars and local `.env.local` |
| OS-registered state | None | None |
| Secrets/env vars | `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET` — newly registered at Blizzard developer portal | Register at https://develop.battle.net/access/clients ; add to Vercel env vars and local `.env.local` |
| Build artifacts | None (new packages; no stale artifacts) | None |

**Nothing found in category:** OS-registered state, build artifacts — verified by inspection (Phase 4 is new capability, not a rename/migration).

---

## Code Examples

### Drizzle Schema (generated by better-auth CLI + custom fields)

```typescript
// src/db/schema.ts (illustrative — run `npx auth@latest generate` for actual output)
// SPDX-License-Identifier: GPL-3.0-or-later
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),                    // better-auth UUID
  name: text("name").notNull(),                   // = battleTag (display)
  email: text("email").notNull().unique(),         // battle.net account email (may not be available)
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),                           // nullable — see Avatar pitfall
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  // Custom fields (D-05)
  battleTag: text("battleTag").notNull(),         // "Name#1234" — w3champions key (D-06)
  gateway: text("gateway").notNull(),             // "us" | "eu" | "kr" (D-05/D-06/D-07)
  avatarUrl: text("avatarUrl"),                   // nullable — generated avatar URL (see Pitfall 2)
  bnetSub: text("bnetSub").notNull(),             // stable Battle.net sub identifier
});

export const sessions = pgTable("session", { /* generated by better-auth CLI */ });
export const accounts = pgTable("account", { /* generated by better-auth CLI */ });
export const verifications = pgTable("verification", { /* generated by better-auth CLI */ });
```

### Client-Side Auth Client

```typescript
// src/lib/auth-client.ts
// SPDX-License-Identifier: GPL-3.0-or-later
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL ?? "http://localhost:3000",
  plugins: [genericOAuthClient()],
});

export const { useSession, signIn, signOut } = authClient;
```

### Sign-In Button (D-01)

```typescript
// src/components/auth/SignInButton.tsx
// SPDX-License-Identifier: GPL-3.0-or-later
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const handleSignIn = async () => {
    // TODO: capture region from a selector before this call (see Open Question #2)
    await authClient.signIn.oauth2({
      providerId: "battlenet",
      callbackURL: "/",
    });
  };
  return (
    <button onClick={handleSignIn} className="...gold-accent styles...">
      Sign in with Battle.net
    </button>
  );
}
```

### First User-Data Server Function (uses authedServerFn)

```typescript
// src/server/user-profile.ts
// SPDX-License-Identifier: GPL-3.0-or-later
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { authedServerFn } from "@/lib/auth-middleware";

// getUserProfile — the FIRST server function using the authedServerFn pattern.
// context.principal.id is the UUID from the session — never from client input.
export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  async ({ context }) => {
    const { principal } = context;
    const user = await db.query.users.findFirst({
      where: eq(users.id, principal.id),
    });
    return user ?? null;
  }
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `contentlayer` | `@content-collections` (already in use) | ~2024 | No impact — already using correct stack |
| Auth.js / NextAuth | `better-auth` | 2025 (better-auth absorbed Auth.js) | better-auth has official TanStack Start adapter; Auth.js v5 is Next.js-centric |
| `@tanstack/start` (old pkg name) | `@tanstack/react-start` | TanStack Start v1 | Already on correct package |
| `reactflow` | `@xyflow/react` v12 (already in use) | Oct 2025 | Already on correct package |
| `framer-motion` | `motion` (already in use) | 2024 | Already on correct package |
| Prisma | Drizzle (locked in ADR-001) | 2024–2025 | Drizzle is edge-first, no Prisma Accelerate needed |
| `request.headers` in server fn middleware | `getRequestHeaders()` from `@tanstack/react-start/server` | TanStack Start ~1.16x | Auth middleware must use new import |

**Deprecated/outdated:**
- `tailwindcss-animate`: Deprecated in shadcn/ui March 2025 — use CSS transitions or Motion (already avoided in this project)
- `contentlayer`: Unmaintained since ~2024 — using `@content-collections` (already done)

---

## Battle.net Developer Portal Setup (User Action Required)

The planner must include a task for the user to:

1. Go to https://develop.battle.net/access/clients
2. Create an OAuth client
3. Set "Redirect URIs" to: `http://localhost:3000/api/auth/oauth2/callback/battlenet` (dev) and `https://your-vercel-domain.vercel.app/api/auth/oauth2/callback/battlenet` (prod)
4. Note the **Client ID** and **Client Secret**
5. Add to `.env.local`: `BNET_CLIENT_ID=... BNET_CLIENT_SECRET=...`
6. Add to Vercel dashboard environment variables: `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET`

**Key constraint:** The Battle.net OAuth app registration is NOT automated — it requires a user login at develop.battle.net and manual creation. This must be a `checkpoint:human-verify` task in the plan, blocking Wave 2+ work that exercises the OAuth flow.

---

## OSS Contributor Dev DB Recommendation (Claude's Discretion)

**Recommendation: Neon dev branch for primary contributors; Docker Postgres as a documented fallback.**

**Primary (Neon dev branch):**
- Create `dev` branch from `main` in Neon Console (free tier, included in all Neon plans)
- `.env.local` points `DATABASE_URL` to dev branch connection string
- `DATABASE_URL_DIRECT` points to dev branch direct (non-pooled) connection
- Vercel production uses `main` branch connection strings
- Migrations: run `drizzle-kit migrate` against dev branch, then promote to main after review
- OSS contributors: each creates their own free Neon project (free tier: 500MB + 100 CU-hours/month)

**Fallback (Docker Postgres — for offline dev):**
```bash
docker run --name wc3roadmap-db \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=wc3roadmap \
  -p 5432:5432 \
  -d postgres:17
```
`DATABASE_URL=postgresql://postgres:localdev@localhost:5432/wc3roadmap`
`DATABASE_URL_DIRECT=postgresql://postgres:localdev@localhost:5432/wc3roadmap`

**`.env.example` contents:**
```bash
# better-auth
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Battle.net OAuth (register at https://develop.battle.net/access/clients)
BNET_CLIENT_ID=your_client_id
BNET_CLIENT_SECRET=your_client_secret

# Neon Postgres (create a free project at https://neon.tech)
# Use your Neon dev branch connection strings for local development
DATABASE_URL=postgresql://...@...neon.tech/wc3roadmap?sslmode=require
DATABASE_URL_DIRECT=postgresql://...@...neon.tech/wc3roadmap?sslmode=require  # Non-pooled, for drizzle-kit

# App URL (for OAuth callback registration)
VITE_APP_URL=http://localhost:3000
```

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — include this section.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Battle.net OAuth callback creates users table row with battleTag, gateway, bnetSub | Integration (mock OAuth) | `npm test -- auth` | ❌ Wave 0 |
| AUTH-02 | Session cookie survives browser refresh (30-day rolling) | unit (session config) | `npm test -- auth-session` | ❌ Wave 0 |
| AUTH-03 | authMiddleware throws 401 with no session / forged token | unit (mock getSession) | `npm test -- auth-middleware` | ❌ Wave 0 |
| AUTH-03 | User-data server function returns principal's data, not forged target's | unit (mock getSession) | `npm test -- auth-middleware` | ❌ Wave 0 |
| AUTH-04 | UUID stays stable across battleTag update (overrideUserInfo) | unit (mock OAuth profile) | `npm test -- auth-user-uuid` | ❌ Wave 0 |

**Note on AUTH-01:** Full OAuth round-trip (redirect → callback → token exchange) requires a live Battle.net developer credential and cannot be automated in CI without a test credential. The automated test scope for AUTH-01 is the profile-mapping function (`mapProfileToUser`) and the DB write — mock the OAuth token; verify the resulting users table row.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/auth-middleware.test.ts` — covers AUTH-03 (D-13)
- [ ] `src/lib/auth.test.ts` — covers AUTH-01 profile mapping + AUTH-04 UUID stability
- [ ] `src/lib/db.test.ts` — smoke test: db connection returns non-null (requires test DATABASE_URL)

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | better-auth OAuth flow; no password auth in this phase |
| V3 Session Management | yes | better-auth session: httpOnly cookie, 30-day rolling, SameSite=Lax |
| V4 Access Control | yes | authMiddleware: principal-keyed queries, 401 on missing session |
| V5 Input Validation | yes | Zod on all server function inputs; client-supplied userId never used |
| V6 Cryptography | partial | `BETTER_AUTH_SECRET` must be ≥32 chars; session tokens signed by better-auth |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session fixation | Elevation of Privilege | better-auth generates new session token on each OAuth callback |
| CSRF on auth callback | Tampering | better-auth manages `state` param in OAuth flow |
| Forged userId in request body | Elevation of Privilege | authMiddleware ignores client input; uses session principal exclusively (D-12) |
| Token replay (session token theft) | Elevation of Privilege | HttpOnly cookie; SameSite=Lax; 30-day expiry; cookieCache signed |
| Open redirect on callbackURL | Tampering | better-auth validates callbackURL against allowlist; do NOT accept callbackURL from client input |
| SQL injection | Tampering | Drizzle parameterized queries; no raw SQL |
| Secret exposure in client bundle | Information Disclosure | `BNET_CLIENT_SECRET` and `BETTER_AUTH_SECRET` server-only env vars; NEVER import auth.ts in client components |

**Critical:** `src/lib/auth.ts` (the betterAuth instance) must NEVER be imported by client-side components. It embeds the database adapter and secrets. Only `src/lib/auth-client.ts` (the createAuthClient instance) is safe to import on the client.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install / dev server | ✓ | 24.10.0 | — |
| npm / npx | package install + shadcn CLI | ✓ | bundled with Node 24 | — |
| Docker | Local Postgres fallback | ✓ | 29.6.0 | Use Neon free tier (primary) |
| Neon CLI | Neon branch management | ✗ | — | Use Neon Console (web UI) |
| Battle.net OAuth credentials | AUTH-01 OAuth flow | ✗ (must register) | — | None — requires human action at develop.battle.net |

**Missing dependencies with no fallback:**
- Battle.net OAuth credentials — blocks the OAuth flow entirely. Must be registered by the user at the Blizzard developer portal. Plan must include a `checkpoint:human-verify` task for this before any task that tests the OAuth redirect.

**Missing dependencies with fallback:**
- Neon CLI — Neon Console (web) is equivalent for branch management. No plan tasks should depend on the Neon CLI.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `https://oauth.battle.net/authorize` works for EU/KR/APAC players (single global endpoint) | Battle.net OAuth, Pattern 1 | EU/KR players may need to use region-specific authorize URLs (`eu.battle.net/oauth/authorize`, `kr.battle.net/oauth/authorize`). If wrong, multi-region support requires separate genericOAuth provider configs per region — more UI complexity. **Spike required.** |
| A2 | `overrideUserInfo: true` reliably updates custom `additionalFields` (battleTag, gateway) in Drizzle on every login | Pattern 1 (auth.ts), Pitfall 3 | Known limitation: custom fields may only be set on creation even with overrideUserInfo. Fallback: use `databaseHooks.account.update.after` to manually update user row. |
| A3 | `gateway` can be captured from UI before OAuth redirect and survive the OAuth round-trip (via state param or sessionStorage) | Pitfall 1, Open Questions | If state param approach fails, gateway must be collected post-login (extra UX step) or derived from the user's region heuristic. |
| A4 | The better-auth `tanstackStartCookies()` plugin correctly handles cookies in TanStack Start 1.168.26 with Nitro 3.x | Pattern 1 | If cookies are not set correctly, sessions will not persist. Smoke test: sign in, refresh page, verify session cookie present. |
| A5 | w3champions uses `Name#1234` format (from Battle.net `battletag` field) as the player lookup key without URL-encoding the `#` | w3champions BattleTag section | If w3champions uses a different format (e.g., `Name-1234` or URL-encoded `Name%231234`), Phase 7 will need a transformation step. Low risk: the w3champions UI clearly shows `Name#1234` format. |
| A6 | `better-auth` user table `id` is a UUID (random, stable) | Pattern 1, Schema | If better-auth generates non-UUID IDs (e.g., cuid or nanoid), the `ProgressRecordSchema.userId` type contract still holds (it's z.string()). Impact: low. |
| A7 | DiceBear or another avatar generation service can serve as the avatarUrl fallback without rate-limiting concerns | Pitfall 2 | DiceBear has a public API at api.dicebear.com that should handle OSS-scale traffic. If rate-limited, fall back to CSS-generated initials avatar (no external dependency). |

---

## Open Questions

1. **Battle.net single vs. per-region OAuth endpoint (CRITICAL — spike required)**
   - What we know: `https://oauth.battle.net/authorize` is documented as the global host. Auth.js uses region-specific `issuer` values. Blizzard's Passport library uses per-region URLs.
   - What's unclear: Does the global endpoint correctly redirect EU/KR players to their regional Battle.net login, or does it always send them to US?
   - Recommendation: Spike in Wave 1 — test with an EU Battle.net account. If global endpoint works for all non-China regions, use one provider config. If not, implement per-region configs with a region selector UI before sign-in.

2. **Gateway capture strategy (affects Wave 3 UI)**
   - What we know: Region is not in the userinfo response. D-07 requires storing it.
   - Options: (a) UI region selector before OAuth redirect → pass as `authorizationUrlParams` state → extract in `mapProfileToUser`; (b) region selector post-login in a profile setup step; (c) derive from `sub` claim if regional subs are partitioned.
   - Recommendation: Option (a) — pre-redirect region selector. Simple dropdown (Americas / Europe / Korea-Asia) prepended to the sign-in button flow. Stores region in sessionStorage before redirect; `mapProfileToUser` reads it after callback.

3. **overrideUserInfo + additionalFields reliability**
   - What we know: `overrideUserInfo: true` is documented to refresh user info on every login. Known GitHub issues suggest custom fields may not be updated reliably.
   - Recommendation: Spike test in Wave 1 — sign in, change mock battleTag, sign in again, verify DB row updated. If not: add a `databaseHooks.account.update.after` hook as fallback.

4. **better-auth `id` field type — UUID or CUID?**
   - What we know: better-auth's `user.id` is a string PK. Docs don't specify the generation algorithm.
   - Recommendation: Run `npx auth@latest generate` and inspect the generated schema — if the ID default is not UUID, add `.default(sql\`gen_random_uuid()\`)` via Drizzle's customization.

---

## Sources

### Primary (MEDIUM confidence — Context7 / official docs)
- [better-auth generic OAuth plugin docs](https://better-auth.com/docs/plugins/generic-oauth) — full GenericOAuthConfig API surface including overrideUserInfo, mapProfileToUser
- [better-auth TanStack Start integration](https://better-auth.com/docs/integrations/tanstack) — handler setup, tanstackStartCookies, getSession pattern
- [better-auth database schema](https://better-auth.com/docs/concepts/database) — 4-table schema, Drizzle adapter, additionalFields
- [better-auth session management](https://better-auth.com/docs/concepts/session-management) — expiresIn, updateAge, cookieCache
- [Drizzle + Neon setup docs](https://orm.drizzle.team/docs/get-started/neon-new) — neon-http driver, schema definition, migration commands
- [Neon schema migration with Drizzle](https://neon.com/docs/guides/drizzle-migrations) — direct vs pooled connection, drizzle-kit generate + migrate workflow

### Secondary (MEDIUM confidence — official developer portal / Auth.js reference)
- [Auth.js Battlenet provider](https://authjs.dev/reference/core/providers/battlenet) — confirmed field names: `sub`, `battle_tag` (Auth.js uses `battle_tag`; Battle.net actual field is `battletag`)
- [Battle.net developer forum — OAuth unique user identifier](https://us.forums.blizzard.com/en/blizzard/t/oauth-unique-user-identifier/21213) — confirmed userinfo fields: sub, id, battletag
- [Battle.net developer forum — avatar in OAuth endpoint](https://us.forums.blizzard.com/en/blizzard/t/include-account-avatar-in-oauth-user-info-endpoint/9455) — confirmed avatar NOT available; Blizzard declined to add it

### Tertiary (LOW confidence — community articles + GitHub)
- [better-auth GitHub issue #6818](https://github.com/better-auth/better-auth/issues/6818) — getRequestHeaders() vs request.headers change
- [Dev.to: protect server functions with auth middleware](https://dev.to/hirotoshioi/how-to-protect-server-functions-with-auth-middleware-in-tanstack-start-opj) — createMiddleware + authMiddleware pattern
- [Tomas Altrui blog: TanStack Start + better-auth](https://tomasaltrui.dev/blog/tanstack-start-app-with-better-auth/) — handler setup, getSessionFn, middleware pattern
- [Frontend Masters: TanStack Start Middleware](https://frontendmasters.com/blog/introducing-tanstack-start-middleware/) — createMiddleware API, sendContext, type:"function"
- [w3champions website README](https://github.com/w3champions/w3champions-ui) — BattleTag format "Name#1234", identification-service backend

---

## Metadata

**Confidence breakdown:**
- Standard stack (drizzle + neon): HIGH — locked in ADR-001, multiple tutorials, official docs
- better-auth setup (non-Battle.net): MEDIUM — official docs + community validated
- better-auth + Battle.net integration: LOW-MEDIUM — generic OAuth plugin confirmed; exact Battle.net config not community-validated at this stack combination. Spike required.
- authedServerFn pattern: MEDIUM — createMiddleware + getRequestHeaders pattern confirmed via official TanStack Start docs + community articles
- Battle.net OAuth endpoints/fields: MEDIUM — confirmed in Auth.js source + Blizzard forum threads
- w3champions BattleTag format: LOW — inferred from GitHub source code comments; no official API docs

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days) for stable items; 2026-07-06 (7 days) for better-auth version specifics (fast-moving package)
