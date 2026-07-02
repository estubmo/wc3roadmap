// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Wave-0 server-fn tests for the replay convergence module (REPLAY-04,
 * ADR-007/009, D-02/D-03/D-04/D-14/D-15). These encode the load-bearing
 * invariants of `uploadReplayHandler` (08-11 Task 1):
 *
 *   - "authorization" (ADR 007): the handler keys the write by
 *     `context.principal` only — no userId body channel.
 *
 *   - "monotonic-max" (D-03/D-04): the replay write only ever raises
 *     masteryState and re-stamps source:"replay" only when it actually
 *     raises the state — proven via the `.returning()` race-safe signal, not
 *     a JS pre-check.
 *
 *   - "player-slot match" (D-14, Pitfall 6): case-insensitive,
 *     clan-tag-tolerant BattleTag matching; no match -> `no-player-match`.
 *
 *   - "1v1 gate" (D-15): a team/FFA fixture returns signals but advances
 *     zero nodes.
 *
 *   - "upload size backstop" (T-08-11d, ADR 011 §3): an oversized upload is
 *     rejected server-side BEFORE parsing.
 *
 * Mocking strategy mirrors w3champions.test.ts / quiz.test.ts: vi.doMock()
 * (not hoisted) + vi.resetModules() + dynamic import() per test. Real
 * (unmocked): patches (CURRENT_PATCH); drizzle-orm's `eq`/`sql` are recorded
 * as inert stand-ins (matching the established convention). Mocked: db,
 * db/schema, replay-parser, replay-signals, replay-thresholds,
 * content-collections, auth chain.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CURRENT_PATCH } from "#/lib/patches";

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

/** A minimal ParserOutput-shaped fixture — a 1v1 match by default. */
function makeParsedFixture(overrides?: {
  players?: { id: number; name: string }[];
  buildNumber?: number;
}) {
  return {
    buildNumber: overrides?.buildNumber ?? 6117,
    version: "2.00",
    duration: 300000,
    matchup: "HvO",
    players: overrides?.players ?? [
      { id: 0, name: "Player#1234" },
      { id: 1, name: "Opponent#5678" },
    ],
  };
}

/** allNodes fixture: one MECHANIC node with an eapm replayCriteria. */
const allNodesFixture = [
  { id: "creep-routing", nodeType: "MECHANIC", replayCriteria: { signal: "eapm", gte: 80 } },
];

/** Default detectReplaySignals result: one node meeting its threshold. */
const defaultNodeResults = [
  { nodeId: "creep-routing", targetState: "mastered", actual: 100, target: 80, signal: "eapm" },
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
  parseReplay: ReturnType<typeof vi.fn>;
  deriveReplaySignals: ReturnType<typeof vi.fn>;
  isSoloMatch: ReturnType<typeof vi.fn>;
  detectReplaySignals: ReturnType<typeof vi.fn>;
  insertCalls: InsertRecord[];
  /** Controls what `.returning()` resolves to for a given insert record (default: "raised"). */
  returningImpl: (rec: InsertRecord) => unknown[];
}

let mocks: TestMocks;

/** All nodeProgress insert records issued during a handler call. */
function nodeProgressInserts(): InsertRecord[] {
  return mocks.insertCalls.filter((r) => r.table === "node_progress");
}

/** Build a FormData carrying a `.w3g`-ish file under the "file" field. */
function makeUploadFormData(sizeBytes = 128): FormData {
  const fd = new FormData();
  const file = new File([new Uint8Array(sizeBytes)], "test.w3g", {
    type: "application/octet-stream",
  });
  fd.set("file", file);
  return fd;
}

beforeEach(() => {
  vi.resetModules();

  const insertCalls: InsertRecord[] = [];
  const parseReplay = vi.fn().mockResolvedValue(makeParsedFixture());
  const deriveReplaySignals = vi.fn().mockReturnValue({ eapm: 100 });
  const isSoloMatch = vi.fn().mockReturnValue(true);
  const detectReplaySignals = vi.fn().mockReturnValue(defaultNodeResults);

  const defaultReturningImpl = (rec: InsertRecord): unknown[] => {
    if (rec.table === "node_progress") return [{ nodeId: rec.values?.nodeId }];
    return [];
  };

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
        return chain;
      }),
      onConflictDoNothing: vi.fn(() => {
        rec.usedOnConflictDoNothing = true;
        return Promise.resolve(undefined);
      }),
      returning: vi.fn(() => Promise.resolve(mocks.returningImpl(rec))),
    };
    return chain;
  });

  mocks = {
    parseReplay,
    deriveReplaySignals,
    isSoloMatch,
    detectReplaySignals,
    insertCalls,
    returningImpl: defaultReturningImpl,
  };

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
      query: {},
      insert: mockInsert,
    },
  }));

  vi.doMock("#/lib/replay-parser", () => {
    class ReplayParseError extends Error {
      constructor() {
        super("Failed to parse replay");
        this.name = "ReplayParseError";
      }
    }
    return { parseReplay, ReplayParseError };
  });

  vi.doMock("#/lib/replay-signals", () => ({
    deriveReplaySignals,
    isSoloMatch,
  }));

  vi.doMock("#/lib/replay-thresholds", () => ({
    detectReplaySignals,
  }));

  vi.doMock("content-collections", () => ({
    allNodes: allNodesFixture,
  }));
});

// ---------------------------------------------------------------------------
// Test helper — dynamic import (module under test)
// ---------------------------------------------------------------------------

async function importReplay() {
  return import("#/server/replay");
}

// ---------------------------------------------------------------------------
// uploadReplayHandler — parse, match, derive, monotonic-max write (REPLAY-04)
// ---------------------------------------------------------------------------

describe("uploadReplayHandler — monotonic-max write (D-02/D-03/D-04)", () => {
  it("a 1v1 fixture whose signals meet threshold writes masteryState 'mastered' source 'replay'", async () => {
    const { uploadReplayHandler } = await importReplay();

    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result.status).toBe("ok");
    const inserts = nodeProgressInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.values?.masteryState).toBe("mastered");
    expect(inserts[0]?.values?.source).toBe("replay");
    expect(inserts[0]?.values?.patchId).toBe(CURRENT_PATCH.id);
    expect(inserts[0]?.values?.userId).toBe(principalA.id);
    expect(inserts[0]?.usedOnConflictDoUpdate).toBe(true);
    expect(result.advanced).toContain("creep-routing");
  });

  it("does NOT downgrade an existing higher state (returning() reports zero rows raised)", async () => {
    // Simulate Postgres's ON CONFLICT DO UPDATE ... WHERE evaluating false —
    // no row is "actually updated", so .returning() yields nothing.
    mocks.returningImpl = () => [];

    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result.status).toBe("ok");
    expect(result.advanced).toEqual([]);
    // The atomic guard was still applied — this was an attempted, guarded write.
    expect(nodeProgressInserts()[0]?.usedOnConflictDoUpdate).toBe(true);
  });

  it("source/patchId/userId are server-derived; a forged field in the upload is ignored", async () => {
    const fd = makeUploadFormData();
    fd.append("userId", "attacker");
    fd.append("source", "manual");

    const { uploadReplayHandler } = await importReplay();
    await uploadReplayHandler({ context: { principal: principalA }, data: fd });

    const insert = nodeProgressInserts()[0];
    expect(insert?.values?.userId).toBe(principalA.id);
    expect(insert?.values?.userId).not.toBe("attacker");
    expect(insert?.values?.source).toBe("replay");
  });

  it("a non-1v1 (team/FFA) fixture returns signals but advances zero nodes (D-15)", async () => {
    mocks.isSoloMatch.mockReturnValue(false);

    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result.status).toBe("ok");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.advanced).toEqual([]);
    expect(nodeProgressInserts()).toHaveLength(0);
  });

  it("matches a clan-tag-prefixed, differently-cased in-replay name to the BattleTag (Pitfall 6/D-14)", async () => {
    mocks.parseReplay.mockResolvedValue(
      makeParsedFixture({
        players: [
          { id: 0, name: "[CLAN]player#1234" },
          { id: 1, name: "Opponent#5678" },
        ],
      }),
    );

    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result.status).toBe("ok");
    expect(mocks.deriveReplaySignals).toHaveBeenCalled();
  });

  it("returns 'no-player-match' and issues zero writes when no player matches the BattleTag (D-14)", async () => {
    mocks.parseReplay.mockResolvedValue(
      makeParsedFixture({
        players: [
          { id: 0, name: "Stranger#0000" },
          { id: 1, name: "Opponent#5678" },
        ],
      }),
    );

    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result).toEqual({ status: "no-player-match", signals: [], advanced: [] });
    expect(nodeProgressInserts()).toHaveLength(0);
    expect(mocks.deriveReplaySignals).not.toHaveBeenCalled();
  });

  it("returns 'parse-failed' and issues zero writes on a ReplayParseError", async () => {
    const { ReplayParseError } = await import("#/lib/replay-parser");
    mocks.parseReplay.mockRejectedValue(new ReplayParseError());

    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(),
    });

    expect(result).toEqual({ status: "parse-failed", signals: [], advanced: [] });
    expect(nodeProgressInserts()).toHaveLength(0);
  });

  it("rejects an oversized upload BEFORE parsing (T-08-11d, ADR 011 §3 server backstop)", async () => {
    const { uploadReplayHandler } = await importReplay();
    const result = await uploadReplayHandler({
      context: { principal: principalA },
      data: makeUploadFormData(4 * 1024 * 1024 + 1),
    });

    expect(result).toEqual({ status: "parse-failed", signals: [], advanced: [] });
    expect(mocks.parseReplay).not.toHaveBeenCalled();
    expect(nodeProgressInserts()).toHaveLength(0);
  });
});
