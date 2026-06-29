// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Server-side betterAuth instance — single export.
 *
 * ⚠  NEVER import this module from client components (React components, browser
 * bundles, or anything that runs in the browser). This file embeds the Drizzle
 * database adapter, reads BNET_CLIENT_SECRET and BETTER_AUTH_SECRET from
 * process.env, and will expose those secrets if bundled into client code.
 *
 * Client-safe auth surface: import from #/lib/auth-client instead.
 *
 * What this module wires:
 *   - Battle.net OAuth via the generic-OAuth plugin (AUTH-01)
 *   - Drizzle adapter over the shared Neon HTTP db singleton
 *   - 30-day rolling sessions, always-persistent cookie (AUTH-02, D-09/D-10)
 *   - overrideUserInfo: true — refreshes BattleTag on every login (AUTH-04, D-08)
 *   - generateId: () => crypto.randomUUID() — UUID v4 stable progress key (AUTH-04, D-04)
 */

import { betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/lib/db";

/** Battle.net regional gateways (D-07). Matches the RegionSelector UI values. */
const GATEWAYS = ["us", "eu", "kr"] as const;

// ---------------------------------------------------------------------------
// Battle.net OAuth profile mapper (AUTH-01)
// ---------------------------------------------------------------------------

/**
 * Map the Battle.net OAuth userinfo response to a better-auth user record.
 *
 * Battle.net userinfo endpoint returns: { sub, id, battletag }
 *
 * Notable omissions (see RESEARCH.md for details):
 *   - No avatar URL (Pitfall 2): Battle.net OAuth explicitly does NOT expose
 *     avatar images. avatarUrl is nullable; a generated avatar is populated
 *     separately (Plan 04-05).
 *   - No region/gateway (Pitfall 1): Battle.net accounts span regions.
 *     Gateway is captured from a UI region selector BEFORE the OAuth redirect
 *     and persisted separately (Plan 04-05/Plan 04-06).
 *
 * Exported as a named function so it can be unit-tested in isolation (AUTH-01).
 * Referenced directly from the genericOAuth battlenet config below — this
 * ensures the same function is tested AND used at runtime.
 */
export function mapBattlenetProfile(profile: Record<string, unknown>): {
  name: string;
  email: string;
  emailVerified: boolean;
  battleTag: string;
  bnetSub: string;
} {
  // Battle.net userinfo: { sub: string, id: string, battletag: string }
  const battletag = String(profile["battletag"] ?? "");
  const sub = String(profile["sub"] ?? "");
  return {
    // name = battleTag keeps the user's display name current on every sign-in.
    // better-auth uses the `name` field as the primary display name.
    name: battletag,

    // Synthesized email (Pitfall: Battle.net OAuth has NO email scope, so the
    // userinfo response never includes one — see the 400-less `email_is_missing`
    // path in better-auth). better-auth requires a unique, non-null email to
    // create the user row, so we derive a stable placeholder from the immutable
    // Battle.net `sub`. This address is never used for delivery; it only
    // satisfies better-auth's identity model. ADR 008 records this decision.
    email: `${sub}@battlenet.local`,

    // Battle.net vouches for the account identity at OAuth time and there is no
    // real inbox to verify, so the synthesized address is treated as verified.
    emailVerified: true,

    // battleTag in canonical "Name#1234" format — the exact key w3champions
    // queries by (D-06). Refreshed on every login via overrideUserInfo: true.
    battleTag: battletag,

    // Stable Battle.net account sub — used for deduplication across re-auths
    // (e.g. same account signing in from different regions). Not the progress key.
    bnetSub: sub,

    // avatarUrl: intentionally omitted — Battle.net has no OAuth avatar endpoint.
    //   See RESEARCH.md Pitfall 2. avatarUrl column is nullable; a deterministic
    //   generated avatar (DiceBear) is populated in Plan 04-05.
    //
    // gateway: intentionally omitted — not in the OAuth userinfo response.
    //   See RESEARCH.md Pitfall 1. Captured from a UI region selector before
    //   the OAuth redirect and stored separately in Plan 04-05/Plan 04-06.
  };
}

// ---------------------------------------------------------------------------
// betterAuth instance
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  // ---------------------------------------------------------------------------
  // Database adapter — Drizzle ORM over the Neon HTTP singleton (db.ts)
  //
  // usePlural: true — our schema exports plural JS keys (users, sessions,
  // accounts, verifications) while better-auth internally uses singular model
  // names (user, session, account, verification). This option tells the adapter
  // to look for `users` instead of `user` in db._.fullSchema when resolving
  // table references. Without this, all auth DB operations would fail.
  // ---------------------------------------------------------------------------
  database: drizzleAdapter(db, { provider: "pg", usePlural: true }),

  // ---------------------------------------------------------------------------
  // ID generation — UUID v4 for stable progress keys (AUTH-04, D-04)
  //
  // better-auth generates random IDs by default; we override to guarantee
  // UUID v4 format so Phase 5 progress records can reliably use users.id as
  // a UUID primary key.
  // ---------------------------------------------------------------------------
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  // ---------------------------------------------------------------------------
  // Database hooks — populate server-derived identity at user creation (D-05).
  //
  // WHY THIS EXISTS: battleTag, gateway, and bnetSub are `input: false` (D-05 —
  // never settable from client API input). better-auth deliberately IGNORES
  // `input: false` fields returned from `mapProfileToUser` during OAuth
  // provisioning, so those columns can only be written by a trusted server-side
  // hook like this one. This keeps the D-05 guarantee intact (clients still
  // cannot set these) while actually populating the NOT NULL columns.
  //
  // Sources of each field (none are trusted client input):
  //   - battleTag: recovered from `user.name`, which mapBattlenetProfile set to
  //     the BattleTag (an `input: true` standard field, so it IS applied).
  //   - bnetSub:   recovered from the synthesized `user.email` (`${sub}@battlenet.local`).
  //   - gateway:   the region the user chose in RegionSelector, threaded through
  //     the OAuth flow via additionalData and read back with getOAuthState.
  //     Defaults to "us" if absent so sign-in never fails on a missing region.
  // ---------------------------------------------------------------------------
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const battleTag = typeof user.name === "string" ? user.name : "";
          const email = typeof user.email === "string" ? user.email : "";
          const bnetSub = email.includes("@") ? email.split("@")[0] : "";

          // Region is client-chosen but server-validated here against the allow-list.
          const state = (await getOAuthState().catch(() => null)) as
            | { region?: string }
            | null;
          const region = state?.region;
          const gateway = (GATEWAYS as readonly string[]).includes(
            String(region),
          )
            ? (region as string)
            : "us";

          return { data: { ...user, battleTag, bnetSub, gateway } };
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Custom user fields (D-05 — identity profile beyond better-auth defaults)
  //
  // input: false on all fields — these are NEVER accepted from client input.
  // They are populated exclusively from:
  //   - Battle.net OAuth userinfo (battleTag, bnetSub via mapBattlenetProfile)
  //   - UI region selector before redirect (gateway, Plan 04-05/06)
  //   - Generated avatar service (avatarUrl, Plan 04-05)
  // ---------------------------------------------------------------------------
  user: {
    additionalFields: {
      /** Canonical BattleTag "Name#1234" — w3champions key (D-06). Refreshed on every login. */
      battleTag: { type: "string", required: true, input: false },
      /** Region/gateway "us" | "eu" | "kr" — from UI selector, not OAuth (D-05/D-07). */
      gateway: { type: "string", required: true, input: false },
      /** Generated avatar URL (nullable — no avatar from Battle.net OAuth, Pitfall 2). */
      avatarUrl: { type: "string", required: false, input: false },
      /** Stable Battle.net sub from OAuth — for deduplication across re-auths. */
      bnetSub: { type: "string", required: true, input: false },
    },
  },

  // ---------------------------------------------------------------------------
  // Session configuration (AUTH-02, D-09/D-10)
  // ---------------------------------------------------------------------------
  session: {
    /** 30-day rolling window (D-09) — session is active as long as user returns within updateAge. */
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds

    /** Rolling refresh: extend session on activity. 24h window keeps light users from expiring. */
    updateAge: 60 * 60 * 24, // 24 hours

    /** Cache session in a signed cookie to avoid a DB round-trip on every request (D-10). */
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute signed-cookie cache
    },
  },

  plugins: [
    // -----------------------------------------------------------------------
    // Battle.net OAuth via the generic-OAuth plugin (AUTH-01)
    // -----------------------------------------------------------------------
    genericOAuth({
      config: [
        {
          providerId: "battlenet",
          clientId: process.env.BNET_CLIENT_ID!,
          clientSecret: process.env.BNET_CLIENT_SECRET!,

          // Global Battle.net OAuth endpoint — handles US/EU/KR/APAC (non-China).
          //
          // Assumption A1 (RESEARCH.md): The global endpoint correctly redirects
          // all non-China regions to their Battle.net login. If EU/KR players are
          // sent to US auth servers, per-region configs may be needed:
          //   eu: https://eu.battle.net/oauth/authorize
          //   kr: https://kr.battle.net/oauth/authorize
          // Spike required with an EU Battle.net account to validate.
          authorizationUrl: "https://oauth.battle.net/authorize",
          tokenUrl: "https://oauth.battle.net/token",
          userInfoUrl: "https://oauth.battle.net/userinfo",

          // No scopes required — Battle.net returns battletag + sub from userinfo
          // without any additional OAuth scope declarations.
          scopes: [],

          // D-08 / AUTH-04: Refresh BattleTag on every login.
          // better-auth default: mapProfileToUser runs only on first sign-in.
          // With overrideUserInfo: true, the user record is updated on every
          // successful OAuth callback — keeping BattleTag current while the
          // stable UUID (user.id) never changes.
          overrideUserInfo: true,

          // AUTH-01 profile mapping — uses the exported function so it is
          // unit-testable independently of the full auth initialization.
          mapProfileToUser: mapBattlenetProfile,
        },
      ],
    }),

    // D-10: TanStack Start cookie plugin — MUST be last.
    // This plugin hooks into the response pipeline to set session cookies
    // using @tanstack/react-start-server. It must run after all other plugins
    // have processed the response.
    tanstackStartCookies(),
  ],
});

// ---------------------------------------------------------------------------
// Inferred types — server-only re-exports
// ---------------------------------------------------------------------------

/**
 * Inferred session type — includes session + user with all additionalFields.
 *
 * Server-only: import from #/lib/auth only in server functions and middleware.
 * For client components, import useSession from #/lib/auth-client.
 */
export type Session = typeof auth.$Infer.Session;

/**
 * Inferred user type — the user object within a session, including custom
 * fields battleTag, gateway, avatarUrl, bnetSub (D-05).
 *
 * Server-only: same constraint as Session above.
 */
export type User = typeof auth.$Infer.Session.user;
