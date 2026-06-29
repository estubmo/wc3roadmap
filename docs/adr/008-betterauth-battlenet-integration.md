# ADR 008: better-auth + Battle.net OAuth Integration

**Status:** Accepted
**Date:** 2026-06-29
**Phase:** 04-auth-database

---

## Context

The WC3 Roadmap requires Battle.net identity for two purposes:

1. **Progress persistence** — sign-in unlocks server-side mastery tracking.
   The stable user UUID (`users.id`) is the progress key.
2. **w3champions integration** (Phase 7/8) — the stored BattleTag + gateway
   must be the exact key the w3champions API queries by, so no re-capture is
   needed when ladder sync and replay features ship.

### Auth library choice

`better-auth` is the selected auth library (ADR 001). It ships an official
TanStack Start adapter, a Drizzle ORM adapter, and a `genericOAuth` plugin
that can configure arbitrary OAuth 2.0 providers. This avoids the
Next.js-centric Auth.js ecosystem and any hosted-SaaS lock-in (Clerk).

### Battle.net OAuth constraints

Battle.net is not a pre-built provider in better-auth. It must be configured
via the `genericOAuth` plugin. As of June 2026, no community-validated
better-auth + Battle.net integration exists — this integration is assessed at
**LOW-MEDIUM confidence** and required a discovery spike to validate.

The Battle.net OAuth userinfo endpoint (`oauth.battle.net/userinfo`) returns a
minimal payload:

```json
{ "sub": "12345678", "id": "12345678", "battletag": "Player#1234" }
```

Notable absences that shaped this ADR:

- **No region/gateway field.** Battle.net accounts span all regions; the
  userinfo payload does not identify which region the player signed in through
  (RESEARCH.md Pitfall 1).
- **No avatar URL.** Battle.net OAuth does not expose avatar images
  (RESEARCH.md Pitfall 2).
- **BattleTag is mutable.** Players can rename their Battle.net display name.
  The stored BattleTag can become stale if the user renames and re-auths
  without `overrideUserInfo` (RESEARCH.md Pitfall 3).

---

## Decision

### 1. Global OAuth endpoint with documented per-region fallback (Assumption A1)

The `genericOAuth` battlenet config uses the global Battle.net OAuth endpoint:

```
authorizationUrl: "https://oauth.battle.net/authorize"
tokenUrl:         "https://oauth.battle.net/token"
userInfoUrl:      "https://oauth.battle.net/userinfo"
```

**Assumption A1:** The global endpoint correctly handles all non-China regions
(US / EU / KR / APAC). If EU or KR players are incorrectly routed through US
auth servers and this causes login failures, per-region endpoint configs can
be added:

```
eu: https://eu.battle.net/oauth/authorize
kr: https://kr.battle.net/oauth/authorize
```

A spike with an EU Battle.net account is required to validate A1 before the
live rollout. The per-region config is a non-breaking additive change if
needed.

Implementation: `src/lib/auth.ts`

### 2. Gateway captured client-side before OAuth redirect (Pitfall 1 workaround)

Because the userinfo endpoint does not expose the gateway/region, gateway is
captured through a **UI region selector dialog** shown before the OAuth
redirect (Plans 04-05/04-06). The selected value (`"us"` | `"eu"` | `"kr"`) is
stored in `sessionStorage` under the key `bnet_gateway` and read on the OAuth
callback to persist into `users.gateway`.

This avoids a second OAuth round-trip or a user profile page step to capture
the gateway. The `RegionSelector` component blocks the OAuth redirect until the
user picks a region — it cannot be dismissed without a selection (only ESC is
allowed, which cancels sign-in entirely).

Implementation: `src/components/auth/RegionSelector.tsx`,
`src/routes/api/auth/$.ts` (callback handler reads `sessionStorage`)

### 3. Generated avatar; `avatarUrl` nullable (Pitfall 2 workaround)

Battle.net OAuth exposes no avatar image. The `users.avatarUrl` column is
nullable. A deterministic generated avatar is produced client-side using the
DiceBear 9.x initials style from `api.dicebear.com`, keyed by the user's
BattleTag. This provides a consistent per-player avatar without any
Battle.net API dependency.

`mapBattlenetProfile` intentionally omits `avatarUrl` — it is populated
separately in Plan 04-05. The `avatarUrl` field is `required: false` in
better-auth `additionalFields`.

Implementation: `src/components/auth/UserDropdown.tsx` (DiceBear URL
construction client-side), `src/lib/auth.ts` (`additionalFields`)

### 4. `overrideUserInfo: true` — BattleTag refreshed on every login (Pitfall 3 / D-08)

By default, better-auth's `mapProfileToUser` runs only on the first sign-in.
With `overrideUserInfo: true`, the user record is updated on every successful
OAuth callback:

- `users.battleTag` → refreshed to the current `battletag` from userinfo
- `users.name` → refreshed to the current `battletag` (display name parity)
- `users.id` (the UUID) → **never changes** — it is the stable progress key

This ensures the stored BattleTag stays current through display-name changes,
while progress records keyed by the UUID remain valid across renames (D-08,
AUTH-04).

### 5. UUID v4 as the stable progress key (D-04)

`generateId: () => crypto.randomUUID()` is set in the `advanced.database`
config. This guarantees the UUID v4 format that Phase 5 progress records
rely on as a primary key type. better-auth's default ID generation is not
UUID v4, so this override is required.

### 6. 30-day rolling, always-persistent sessions (D-09/D-10)

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 30,  // 30-day window
  updateAge:  60 * 60 * 24,       // rolling: refresh when accessed after 24h
  cookieCache: { enabled: true, maxAge: 5 * 60 },  // 5-min signed-cookie cache
}
```

No "remember me" toggle. The cookie is always persistent for the full
30-day window. Rationale: this is a low-stakes learning app with no PII,
payment, or sensitive data. Low friction outweighs the marginal security gain
of session expiry in this context. The 5-minute cookie cache avoids a DB
round-trip on every server-function call.

### 7. Server/client bundle split

- **`src/lib/auth.ts`** — server-only. Contains `BNET_CLIENT_SECRET`,
  `BETTER_AUTH_SECRET`, and the Drizzle database adapter. Must never be
  imported from a client component or browser bundle.
- **`src/lib/auth-client.ts`** — client-safe. Exports `authClient`,
  `useSession()`, and the `signIn`/`signOut` actions. No secrets.

This split is enforced by module convention (comments at the top of both
files) and by the TanStack Start server function boundary. Violating it would
expose DB credentials to the client bundle.

### 8. `usePlural: true` in the Drizzle adapter

The Drizzle schema exports plural JS table references (`users`, `sessions`,
`accounts`, `verifications`) while better-auth internally uses singular model
names (`user`, `session`, `account`, `verification`). `usePlural: true` tells
the adapter to resolve `users` instead of `user` when looking up the table in
`db._.fullSchema`. Without this flag, all auth DB operations fail silently
with a table-not-found error.

### 9. `tanstackStartCookies()` plugin last

The `tanstackStartCookies()` plugin hooks into the response pipeline to set
session cookies using `@tanstack/react-start-server`. It must be the last
entry in the `plugins` array — other plugins must finish processing the
response before the cookie plugin writes the headers.

### 10. OAuth callback path is `/api/auth/oauth2/callback/{providerId}` (genericOAuth)

The `genericOAuth` plugin mounts its callback at
`/api/auth/oauth2/callback/{providerId}` — i.e. the registered Battle.net
Redirect URL **must** be `http://localhost:3000/api/auth/oauth2/callback/battlenet`
(dev) and `https://<vercel-domain>/api/auth/oauth2/callback/battlenet` (prod).
This differs from better-auth's built-in social providers, which use
`/api/auth/callback/{providerId}` (no `oauth2/` segment). An earlier draft of
RESEARCH/PLAN documented the social-provider path; registering it produced a
Battle.net `400 — Invalid grant type or callback URL is not valid` because the
`redirect_uri` better-auth actually sends did not match the registered URL.
The callback path is fixed by the plugin and is not configurable, so the
Battle.net client registration is the side that must match it.

### 11. Synthesized email — Battle.net has no email scope

Battle.net OAuth does not expose an email (there is no email scope; userinfo
returns only `sub`, `id`, `battletag`). better-auth requires a unique, non-null
`email` to create a user row and fails sign-in with `email_is_missing`
otherwise. `mapBattlenetProfile` therefore synthesizes a stable placeholder
keyed on the immutable Battle.net `sub`: `` `${sub}@battlenet.local` ``, with
`emailVerified: true`. This address is never used for delivery — it only
satisfies better-auth's identity model. Keying on `sub` (not BattleTag) keeps
the synthetic email stable across BattleTag changes, mirroring why `sub`/UUID
(not BattleTag) is the identity anchor elsewhere in this ADR.

---

## Consequences

**Positive:**

- **No identity migration for Phases 7/8.** `users.battleTag` and
  `users.gateway` are captured in Phase 4 in the exact format required by
  w3champions. Phases 7 and 8 can resolve a user's ladder/replay data
  immediately using only the stored row — no additional identity capture step.
- **BattleTag always current.** `overrideUserInfo: true` means the stored
  BattleTag reflects the player's current Battle.net display name, even after
  a rename.
- **UUID stability.** Progress records keyed by `users.id` remain valid
  across all BattleTag / avatar changes.
- **Auth + DB in one file to audit.** `src/lib/auth.ts` is the complete
  server-side auth configuration — one place to review secrets usage, session
  config, and OAuth parameters.

**Negative / trade-offs:**

- **Gateway workaround adds UX friction.** The region selector dialog is an
  extra step before sign-in that most OAuth flows do not require. Necessary
  because Battle.net does not expose this in the token response.
- **LOW-MEDIUM confidence on the global endpoint (A1).** If EU/KR routing
  fails with the global endpoint, per-region configs must be added. This
  requires an account in each region to test — budget discovery time before
  the live rollout.
- **No official better-auth + Battle.net example.** This integration was
  built without a community-validated reference. The `genericOAuth` plugin is
  general-purpose — Battle.net-specific edge cases (token format, userinfo
  shape changes) may surface post-launch.
- **Generated avatars.** DiceBear initials are a functional fallback but less
  visually distinctive than actual player avatars. If Blizzard ever exposes
  avatar URLs in the OAuth userinfo, `mapBattlenetProfile` and
  `UserDropdown.tsx` are the two places to update.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Auth.js (NextAuth) v5 | Next.js-centric; TanStack Start integration is community-maintained, not official. better-auth has an official TanStack Start adapter. |
| Clerk | Hosted SaaS; per-MAU cost; vendor lock-in. OSS project should own its auth. |
| Build a custom Battle.net OAuth handler | Reinvents session management, token refresh, and cookie handling that better-auth provides. High maintenance burden. |
| Per-region OAuth configs from the start | Adds complexity before A1 is validated as failing. Global endpoint is simpler; per-region is a documented fallback. |
| Prompt for gateway on the profile page post-sign-in | Introduces a mandatory profile completion step that blocks Phase 7/8 for users who skip it. Pre-redirect capture ensures gateway is always present. |
| Store BattleTag only, not gateway | Phase 7/8 w3champions API requires both BattleTag and gateway to resolve a player's match data. Storing only BattleTag would require a re-capture migration. |

---

## Related Decisions

- **D-04** — Stable internal UUID as the progress key (not BattleTag)
- **D-05** — Full identity profile: UUID + BattleTag + gateway + avatarUrl + timestamps
- **D-06** — Canonical BattleTag format for w3champions compatibility
- **D-07** — All western Battle.net regions supported; gateway persisted
- **D-08** — `overrideUserInfo: true` — BattleTag + avatar refresh on every login; UUID stable
- **D-09** — 30-day rolling session window
- **D-10** — Always-persistent cookie; session cookie cache
- **AUTH-01** — Battle.net OAuth authentication requirement
- **AUTH-02** — Persistent session across browser refreshes
- **AUTH-04** — Stable progress key (UUID) across BattleTag changes
- **ADR 001** — better-auth selected over Auth.js / Clerk
- **RESEARCH.md Pitfall 1** — Battle.net gateway not in userinfo; UI capture required
- **RESEARCH.md Pitfall 2** — Battle.net OAuth has no avatar endpoint
- **RESEARCH.md Pitfall 3** — BattleTag drift without `overrideUserInfo`
