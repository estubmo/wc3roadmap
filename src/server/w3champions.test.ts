// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Wave-0 server-fn tests for the w3champions sync handler (AUTO-01..05, ADR-007,
 * D-04/D-05/D-06). These encode the four load-bearing invariants of the phase:
 *
 *   - "authorization" (ADR 007 / AUTO-01): the handler keys every read and write
 *     by `context.principal` (id/battleTag/gateway) — there is NO userId body
 *     channel. A forged userId in `data` is ignored; writes carry principal.id.
 *
 *   - "TTL" (AUTO-04 / criterion 3): the DB w3championsSync row is the durable
 *     TTL gate. A fresh row (lastSyncedAt within SYNC_TTL_MS) skips the outbound
 *     fetch entirely; two back-to-back syncs make exactly ONE upstream fetch.
 *
 *   - "ceiling" (D-04): every auto nodeProgress insert uses masteryState
 *     "in-progress" — never "mastered" — and source "auto" (both server-stamped).
 *
 *   - "monotonic" (D-05/D-06): the auto write is a plain additive insert with NO
 *     onConflictDoUpdate. A node already present in existing progress is filtered
 *     out by detectMasterySignals and never re-written or downgraded.
 *
 * Plus AUTO-05: a non-ok fetch bucket (unreachable/no-data/rate-limited) returns
 * a bucket status and advances nothing — manual/quiz progress is never disturbed.
 *
 * Mocking strategy mirrors quiz.test.ts / progress.test.ts: vi.doMock() (not
 * hoisted) + vi.resetModules() + dynamic import() per test. Real (unmocked)
 * modules: patches (CURRENT_PATCH), w3champions-keys (SYNC_TTL_MS),
 * detect-mastery-signals + mmr-tiers (pure). Mocked: db, w3champions-client
 * (to count/stub fetch), content-collections (allNodes fixture), drizzle-orm,
 * db/schema, auth chain.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CURRENT_PATCH } from "#/lib/patches";
import { SYNC_TTL_MS } from "#/lib/w3champions-keys";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Principal A — the legitimate signed-in user for all tests. */
const principalA = {
  id: "user-uuid-1",
  name: "Player#1234",
  email: "player@example.com",
  battleTag: "Player#1234",
  gateway: "eu",
  avatarUrl: null as string | null,
  bnetSub: "sub-a",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null as string | null,
};

/**
 * allNodes fixture supplied via the content-collections mock.
 *   - creep-routing:    MECHANIC + gamesPlayed>=10   -> qualifies at 50 games
 *   - micro-management: MECHANIC + mmrTier>=gold      -> qualifies at gold
 *   - no-criterion:     MECHANIC, no autoDetect       -> never advances (D-01)
 *   - map-theory:       CONCEPTUAL + gamesPlayed>=1    -> never advances (AUTO-03)
 */
const allNodesFixture = [
  { id: "creep-routing", nodeType: "MECHANIC", autoDetect: { signal: "gamesPlayed", gte: 10 } },
  { id: "micro-management", nodeType: "MECHANIC", autoDetect: { signal: "mmrTier", gte: "gold" } },
  { id: "no-criterion", nodeType: "MECHANIC" },
  { id: "map-theory", nodeType: "CONCEPTUAL", autoDetect: { signal: "gamesPlayed", gte: 1 } },
];

// ---------------------------------------------------------------------------
// Shared mock state (reset in beforeEach; closures capture by reference)
// ---------------------------------------------------------------------------

interface InsertRecord {
  table: string;
  values: Record<string, unknown> | undefined;
  usedOnConflictDoUpdate: boolean;
  usedOnConflictDoNothing: boolean;
}

interface TestMocks {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  fetchSignals: ReturnType<typeof vi.fn>;
  insertCalls: InsertRecord[];
}

let mocks: TestMocks;

/** All nodeProgress insert records issued during a handler call. */
function nodeProgressInserts(): InsertRecord[] {
  return mocks.insertCalls.filter((r) => r.table === "node_progress");
}

beforeEach(() => {
  vi.resetModules();

  const insertCalls: InsertRecord[] = [];
  const findFirst = vi.fn().mockResolvedValue(null);
  const findMany = vi.fn().mockResolvedValue([]);
  const fetchSignals = vi
    .fn()
    .mockResolvedValue({ status: "ok", signals: { mmrTier: "gold", gamesPlayed: 50 } });

  const mockInsert = vi.fn((table: { __table: string }) => {
    const rec: InsertRecord = {
      table: table.__table,
      values: undefined,
      usedOnConflictDoUpdate: false,
      usedOnConflictDoNothing: false,
    };
    insertCalls.push(rec);
    const chain: Record<string, unknown> = {
      values: vi.fn((vals: Record<string, unknown>) => {
        rec.values = vals;
        return chain;
      }),
      onConflictDoUpdate: vi.fn(() => {
        rec.usedOnConflictDoUpdate = true;
        return Promise.resolve(undefined);
      }),
      onConflictDoNothing: vi.fn(() => {
        rec.usedOnConflictDoNothing = true;
        return Promise.resolve(undefined);
      }),
    };
    return chain;
  });

  mocks = { findFirst, findMany, fetchSignals, insertCalls };

  // ---------------------------------------------------------------------------
  // Module mocks (vi.doMock — NOT hoisted; closures capture above variables)
  // ---------------------------------------------------------------------------

  vi.doMock("#/lib/auth", () => ({
    auth: { api: { getSession: vi.fn() } },
  }));

  vi.doMock("@tanstack/react-start/server", () => ({
    getRequestHeaders: vi.fn().mockReturnValue(new Headers()),
  }));

  vi.doMock("drizzle-orm", () => ({
    eq: vi.fn((col: unknown, val: unknown) => ({ __eq: [col, val] })),
    sql: vi.fn().mockReturnValue({ __sql: "mock" }),
  }));

  vi.doMock("#/db/schema", () => ({
    w3championsSync: {
      __table: "w3champions_sync",
      id: "__w3c_id",
      userId: "__w3c_userId",
      mmrTier: "__w3c_mmrTier",
      gamesPlayed: "__w3c_gamesPlayed",
      lastSyncedAt: "__w3c_lastSyncedAt",
    },
    nodeProgress: {
      __table: "node_progress",
      id: "__np_id",
      userId: "__np_userId",
      nodeId: "__np_nodeId",
      masteryState: "__np_masteryState",
      source: "__np_source",
      patchId: "__np_patchId",
    },
  }));

  vi.doMock("#/lib/db", () => ({
    db: {
      query: {
        w3championsSync: { findFirst },
        nodeProgress: { findMany },
      },
      insert: mockInsert,
    },
  }));

  vi.doMock("#/lib/w3champions-client", () => ({
    fetchW3championsSignals: fetchSignals,
  }));

  vi.doMock("content-collections", () => ({
    allNodes: allNodesFixture,
  }));
});

// ---------------------------------------------------------------------------
// Test helper — call the handler with an injected principal (no data channel)
// ---------------------------------------------------------------------------

async function importSync() {
  return import("#/server/w3champions");
}

// ---------------------------------------------------------------------------
// authorization (ADR 007 / AUTO-01) — principal-keyed, no userId body channel
// ---------------------------------------------------------------------------

describe("syncW3championsHandler — authorization (ADR 007, AUTO-01)", () => {
  it("authorization: writes userId from principal.id, never a forged userId in data", async () => {
    const { syncW3championsHandler } = await importSync();

    // Simulate an attacker injecting a userId at the HTTP level. The handler must
    // read the principal from context ONLY — data has no userId channel.
    await syncW3championsHandler({
      context: { principal: principalA },
      // @ts-expect-error — sync takes no meaningful client input; forged data is ignored.
      data: { userId: "attacker" },
    });

    // The w3championsSync cache upsert is keyed by principal.id.
    const syncWrite = mocks.insertCalls.find((r) => r.table === "w3champions_sync");
    expect(syncWrite?.values?.userId).toBe("user-uuid-1");
    expect(syncWrite?.values?.userId).not.toBe("attacker");

    // Every nodeProgress auto insert is keyed by principal.id.
    for (const rec of nodeProgressInserts()) {
      expect(rec.values?.userId).toBe("user-uuid-1");
      expect(rec.values?.userId).not.toBe("attacker");
    }
  });

  it("authorization: passes principal.battleTag + gateway to the fetch, not client input", async () => {
    const { syncW3championsHandler } = await importSync();

    await syncW3championsHandler({ context: { principal: principalA } });

    expect(mocks.fetchSignals).toHaveBeenCalledWith("Player#1234", "eu");
  });
});

// ---------------------------------------------------------------------------
// TTL (AUTO-04 / criterion 3) — DB row is the durable single-fetch gate
// ---------------------------------------------------------------------------

describe("syncW3championsHandler — TTL gate (AUTO-04, criterion 3)", () => {
  it("TTL: a fresh cache row within SYNC_TTL_MS does NOT call fetch", async () => {
    mocks.findFirst.mockResolvedValue({
      mmrTier: "gold",
      gamesPlayed: 50,
      lastSyncedAt: new Date(Date.now() - 1000), // fresh: 1s ago
    });

    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    expect(mocks.fetchSignals).not.toHaveBeenCalled();
  });

  it("TTL: an expired/missing cache row calls fetch exactly once", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    expect(mocks.fetchSignals).toHaveBeenCalledTimes(1);
  });

  it("TTL: two back-to-back syncs make exactly ONE upstream fetch", async () => {
    // First sync: no cache row -> fetches. Second sync: fresh row -> skips fetch.
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        mmrTier: "gold",
        gamesPlayed: 50,
        lastSyncedAt: new Date(Date.now() - 1000),
      });

    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });
    await syncW3championsHandler({ context: { principal: principalA } });

    expect(mocks.fetchSignals).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ceiling (D-04) — auto write caps at in-progress + source auto
// ---------------------------------------------------------------------------

describe("syncW3championsHandler — ceiling (D-04)", () => {
  it("ceiling: every nodeProgress insert uses masteryState 'in-progress', never 'mastered'", async () => {
    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    const inserts = nodeProgressInserts();
    expect(inserts.length).toBeGreaterThan(0);
    for (const rec of inserts) {
      expect(rec.values?.masteryState).toBe("in-progress");
      expect(rec.values?.masteryState).not.toBe("mastered");
      expect(rec.values?.source).toBe("auto");
      expect(rec.values?.patchId).toBe(CURRENT_PATCH.id);
    }
  });

  it("ceiling: a CONCEPTUAL node never advances (AUTO-03)", async () => {
    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    const advancedNodeIds = nodeProgressInserts().map((r) => r.values?.nodeId);
    expect(advancedNodeIds).not.toContain("map-theory"); // CONCEPTUAL
    expect(advancedNodeIds).not.toContain("no-criterion"); // no autoDetect
    expect(advancedNodeIds).toEqual(
      expect.arrayContaining(["creep-routing", "micro-management"]),
    );
  });
});

// ---------------------------------------------------------------------------
// monotonic (D-05/D-06) — plain additive insert, no DoUpdate, untouched-only
// ---------------------------------------------------------------------------

describe("syncW3championsHandler — monotonic (D-05/D-06)", () => {
  it("monotonic: the auto write uses NO onConflictDoUpdate on the nodeProgress path", async () => {
    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    const inserts = nodeProgressInserts();
    expect(inserts.length).toBeGreaterThan(0);
    for (const rec of inserts) {
      expect(rec.usedOnConflictDoUpdate).toBe(false);
    }
  });

  it("monotonic: a node already in existing progress is never re-written", async () => {
    // creep-routing already has a progress row -> must be filtered out (D-05/D-06)
    mocks.findMany.mockResolvedValue([{ nodeId: "creep-routing" }]);

    const { syncW3championsHandler } = await importSync();
    await syncW3championsHandler({ context: { principal: principalA } });

    const advancedNodeIds = nodeProgressInserts().map((r) => r.values?.nodeId);
    expect(advancedNodeIds).not.toContain("creep-routing");
    expect(advancedNodeIds).toContain("micro-management");
  });
});

// ---------------------------------------------------------------------------
// AUTO-05 — failure buckets advance nothing; manual/quiz untouched
// ---------------------------------------------------------------------------

describe("syncW3championsHandler — failure buckets (AUTO-05, criterion 4)", () => {
  it("returns { status: 'unreachable', advanced: [] } and issues ZERO nodeProgress inserts", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.fetchSignals.mockResolvedValue({ status: "unreachable" });

    const { syncW3championsHandler } = await importSync();
    const result = await syncW3championsHandler({ context: { principal: principalA } });

    expect(result).toEqual({ status: "unreachable", advanced: [] });
    expect(nodeProgressInserts()).toHaveLength(0);
  });

  it("returns { status: 'no-data', advanced: [] } and issues ZERO nodeProgress inserts", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.fetchSignals.mockResolvedValue({ status: "no-data" });

    const { syncW3championsHandler } = await importSync();
    const result = await syncW3championsHandler({ context: { principal: principalA } });

    expect(result).toEqual({ status: "no-data", advanced: [] });
    expect(nodeProgressInserts()).toHaveLength(0);
  });

  it("rate-limited serves the cached row's signals (does not error)", async () => {
    // Expired cache row -> fetch attempted -> rate-limited -> fall back to cache.
    mocks.findFirst.mockResolvedValue({
      mmrTier: "gold",
      gamesPlayed: 50,
      lastSyncedAt: new Date(Date.now() - SYNC_TTL_MS - 1000), // expired
    });
    mocks.fetchSignals.mockResolvedValue({ status: "rate-limited" });

    const { syncW3championsHandler } = await importSync();
    const result = await syncW3championsHandler({ context: { principal: principalA } });

    // Cached signals are still usable -> candidates advance; no throw.
    expect(result.status).toBe("rate-limited");
    expect(nodeProgressInserts().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getW3championsSyncStatusHandler — principal-keyed read for "Last synced" UI
// ---------------------------------------------------------------------------

describe("getW3championsSyncStatusHandler — principal-keyed status read", () => {
  it("returns the principal's w3championsSync row", async () => {
    const row = { mmrTier: "gold", gamesPlayed: 50, lastSyncedAt: new Date() };
    mocks.findFirst.mockResolvedValue(row);

    const { getW3championsSyncStatusHandler } = await importSync();
    const result = await getW3championsSyncStatusHandler({ context: { principal: principalA } });

    expect(result).toEqual(row);
  });

  it("returns null when the principal has never synced", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const { getW3championsSyncStatusHandler } = await importSync();
    const result = await getW3championsSyncStatusHandler({ context: { principal: principalA } });

    expect(result).toBeNull();
  });
});
