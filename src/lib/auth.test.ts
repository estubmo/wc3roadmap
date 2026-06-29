// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for src/lib/auth.ts — betterAuth instance configuration (AUTH-01/AUTH-02/AUTH-04).
 *
 * What is proven:
 *   - mapBattlenetProfile maps Battle.net userinfo fields correctly (AUTH-01)
 *   - session expiresIn is 30 days; updateAge is set for rolling sessions (AUTH-02, D-09)
 *   - additionalFields declares battleTag/gateway/avatarUrl/bnetSub, all input:false (AUTH-04, D-05)
 *   - overrideUserInfo: true on the battlenet provider config (AUTH-04, D-08)
 *
 * All tests run OFFLINE — #/lib/db is mocked so no Neon connection is needed.
 * No live OAuth round-trip is performed (manual verification per VALIDATION.md).
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before any imports of the module under test
// ---------------------------------------------------------------------------

/**
 * Mock the db singleton so betterAuth's drizzleAdapter receives a stub.
 * The drizzleAdapter is lazy: it only accesses db._ when a query runs,
 * not at initialization. The stub is therefore sufficient for config tests.
 */
vi.mock("#/lib/db", () => ({
  db: {
    _: { fullSchema: {} },
    query: {},
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Stub Battle.net profile — shape returned by https://oauth.battle.net/userinfo */
const stubProfile = {
  battletag: "TestPlayer#1234",
  sub: "987654321",
};

let mapBattlenetProfile: (profile: { battletag: string; sub: string }) => {
  name: string;
  battleTag: string;
  bnetSub: string;
};

// Typed to expose the genericOAuth plugin's stored options for assertions.
// The `options` property is present on the plugin object returned by genericOAuth().
type GenericOAuthPluginOptions = {
  id: string;
  options?: {
    config?: Array<{
      providerId: string;
      overrideUserInfo?: boolean;
    }>;
  };
};

let authOptions: {
  session?: { expiresIn?: number; updateAge?: number };
  user?: { additionalFields?: Record<string, { type?: string; required?: boolean; input?: boolean }> };
  plugins?: GenericOAuthPluginOptions[];
};

beforeAll(async () => {
  // Set stub env vars so betterAuth initializes without throwing.
  process.env.BNET_CLIENT_ID = "test-client-id";
  process.env.BNET_CLIENT_SECRET = "test-client-secret";
  process.env.BETTER_AUTH_SECRET =
    "test-secret-at-least-32-chars-long-abcdefghijklmno";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  const mod = await import("#/lib/auth");
  mapBattlenetProfile = mod.mapBattlenetProfile;
  authOptions = mod.auth.options as typeof authOptions;
});

// ---------------------------------------------------------------------------
// mapBattlenetProfile — AUTH-01 profile mapping
// ---------------------------------------------------------------------------

describe("mapBattlenetProfile", () => {
  it("maps battletag to name field (display name)", () => {
    const result = mapBattlenetProfile(stubProfile);
    expect(result.name).toBe("TestPlayer#1234");
  });

  it("maps battletag to battleTag field (canonical w3champions key, D-06)", () => {
    const result = mapBattlenetProfile(stubProfile);
    expect(result.battleTag).toBe("TestPlayer#1234");
  });

  it("maps sub to bnetSub (stable Battle.net identifier)", () => {
    const result = mapBattlenetProfile(stubProfile);
    expect(result.bnetSub).toBe("987654321");
  });

  it("does NOT include gateway (captured from UI region selector, not OAuth)", () => {
    const result = mapBattlenetProfile(stubProfile);
    // gateway MUST NOT come from OAuth — only from UI (Pitfall 1, RESEARCH.md)
    expect("gateway" in result).toBe(false);
  });

  it("does NOT include avatarUrl (Battle.net OAuth has no avatar endpoint, Pitfall 2)", () => {
    const result = mapBattlenetProfile(stubProfile);
    // avatarUrl MUST NOT come from OAuth — it is generated later (Pitfall 2)
    expect("avatarUrl" in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session config — AUTH-02 / D-09
// ---------------------------------------------------------------------------

describe("auth session config", () => {
  it("expiresIn is 30 days (2592000 seconds)", () => {
    expect(authOptions.session?.expiresIn).toBe(60 * 60 * 24 * 30);
  });

  it("updateAge is defined (rolling window — session refreshes on activity)", () => {
    expect(authOptions.session?.updateAge).toBeDefined();
    expect(typeof authOptions.session?.updateAge).toBe("number");
    expect(authOptions.session!.updateAge!).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// additionalFields — AUTH-04 / D-05
// ---------------------------------------------------------------------------

describe("auth user additionalFields", () => {
  it("declares battleTag with input: false (server-populated only, D-05/D-06)", () => {
    const fields = authOptions.user?.additionalFields;
    expect(fields?.battleTag).toBeDefined();
    expect(fields?.battleTag?.input).toBe(false);
  });

  it("declares gateway with input: false (captured from UI, not client input, Pitfall 1)", () => {
    const fields = authOptions.user?.additionalFields;
    expect(fields?.gateway).toBeDefined();
    expect(fields?.gateway?.input).toBe(false);
  });

  it("declares bnetSub with input: false (from OAuth profile only)", () => {
    const fields = authOptions.user?.additionalFields;
    expect(fields?.bnetSub).toBeDefined();
    expect(fields?.bnetSub?.input).toBe(false);
  });

  it("declares avatarUrl as optional (nullable — no avatar from OAuth, Pitfall 2)", () => {
    const fields = authOptions.user?.additionalFields;
    expect(fields?.avatarUrl).toBeDefined();
    // required should be false or falsy (field is optional)
    expect(fields?.avatarUrl?.required).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// overrideUserInfo — AUTH-04 / D-08
// ---------------------------------------------------------------------------

describe("battlenet provider overrideUserInfo", () => {
  it("overrideUserInfo is true on battlenet config (AUTH-04, D-08 — refreshes BattleTag on re-login)", () => {
    const plugins = authOptions.plugins ?? [];
    // auth.options.plugins[0] is the result of genericOAuth({...})
    // genericOAuth returns { id, version, init, endpoints, options, $ERROR_CODES }
    // where options = the original GenericOAuthOptions we passed
    const genericOAuthPlugin = plugins[0];
    expect(genericOAuthPlugin?.id).toBe("generic-oauth");

    const battlenetConfig = genericOAuthPlugin?.options?.config?.find(
      (c) => c.providerId === "battlenet",
    );
    expect(battlenetConfig).toBeDefined();
    expect(battlenetConfig?.overrideUserInfo).toBe(true);
  });
});
