// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Unit tests for progress server function handlers (PROG-01/02/03, D-04/D-05/D-06).
 *
 * Tests call the exported *Handler functions directly — same testability pattern
 * as getUserProfileHandler in src/server/user-profile.ts. The TanStack Start
 * runtime (authMiddleware, createServerFn) is bypassed; context is injected
 * explicitly so tests run offline without a live DB or session.
 *
 * What these tests prove:
 *   - getUserProgressHandler keys the query by principal.id (D-06 IDOR prevention)
 *   - setNodeMasteryHandler ignores forged userId/source/patchId in data (T-05-04c)
 *   - setNodeMasteryHandler rejects invalid masteryState values (T-05-04b)
 *   - setNodeMasteryHandler stamps source="manual" + patchId=CURRENT_PATCH.id (D-04/D-05)
 *   - mergeProgressOnSignInHandler inserts only gap nodes; server wins (D-07/T-05-04d)
 *
 * Mocking strategy: vi.doMock() (not hoisted) + vi.resetModules() + dynamic
 * import() per test. This avoids the temporal dead zone that arises when
 * vi.mock() factory closures reference module-level `const` variables.
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
  gateway: "us",
  avatarUrl: null as string | null,
  bnetSub: "sub-a",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null as string | null,
};

// ---------------------------------------------------------------------------
// Shared mock state (reset in beforeEach; closures capture by reference)
// ---------------------------------------------------------------------------

/** Holds mock function references and captured call arguments for each test. */
interface TestMocks {
  eqCalls: Array<[unknown, unknown]>;
  capturedInsertValues: Array<unknown>;
  findMany: ReturnType<typeof vi.fn>;
  mockValues: ReturnType<typeof vi.fn>;
  mockOnConflictDoUpdate: ReturnType<typeof vi.fn>;
}

let mocks: TestMocks;

beforeEach(() => {
  vi.resetModules();

  // Fresh state for each test
  const eqCalls: Array<[unknown, unknown]> = [];
  const capturedInsertValues: Array<unknown> = [];
  const findMany = vi.fn().mockResolvedValue([]);
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockImplementation((vals: unknown) => {
    capturedInsertValues.push(vals);
    return { onConflictDoUpdate: mockOnConflictDoUpdate };
  });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  // Expose for assertions
  mocks = { eqCalls, capturedInsertValues, findMany, mockValues, mockOnConflictDoUpdate };

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
    eq: vi.fn((col: unknown, val: unknown) => {
      eqCalls.push([col, val]);
      return { __eq: [col, val] };
    }),
    sql: vi.fn().mockReturnValue({ __sql: "mock" }),
  }));

  vi.doMock("#/db/schema", () => ({
    nodeProgress: {
      userId: "__userId_col",
      nodeId: "__nodeId_col",
      masteryState: "__masteryState_col",
      source: "__source_col",
      patchId: "__patchId_col",
    },
  }));

  vi.doMock("#/lib/db", () => ({
    db: {
      query: { nodeProgress: { findMany } },
      insert: mockInsert,
    },
  }));
});

// ---------------------------------------------------------------------------
// getUserProgressHandler — principal-keying (PROG-01/02, D-06)
// ---------------------------------------------------------------------------

describe("getUserProgressHandler — principal-keying (D-06)", () => {
  it("passes principal.id to eq() for the WHERE clause, never a forged id", async () => {
    const { getUserProgressHandler } = await import("#/server/progress");
    await getUserProgressHandler({ context: { principal: principalA } });

    // eq() must have been called with principal.id as the second argument.
    // This proves the query is keyed by the session-derived UUID, not by any input.
    expect(mocks.eqCalls.some(([, val]) => val === "user-uuid-1")).toBe(true);
    expect(mocks.eqCalls.some(([, val]) => val === "attacker")).toBe(false);
  });

  it("returns the result of db.query.nodeProgress.findMany", async () => {
    const fakeRow = { nodeId: "scouting", masteryState: "in-progress" };
    mocks.findMany.mockResolvedValue([fakeRow]);

    const { getUserProgressHandler } = await import("#/server/progress");
    const result = await getUserProgressHandler({ context: { principal: principalA } });

    expect(result).toEqual([fakeRow]);
  });
});

// ---------------------------------------------------------------------------
// setNodeMasteryHandler — server stamping + input rejection (D-04/D-05/D-06)
// ---------------------------------------------------------------------------

describe("setNodeMasteryHandler — server stamping (D-04/D-05/D-06, T-05-04c)", () => {
  it("writes userId from principal.id, not from any forged field in data", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    // Simulate HTTP-level injection of extra fields (bypassing TypeScript via cast).
    // The SetNodeMasteryInput schema strips these at the Zod parse layer — the
    // handler must NEVER write the forged values.
    const dataWithForgedFields = {
      nodeId: "supply-management",
      masteryState: "mastered",
      userId: "attacker",    // forged — must be stripped + ignored
      source: "auto",         // forged — must be stripped + ignored
      patchId: "patch-99",    // forged — must be stripped + ignored
    } as unknown as { nodeId: string; masteryState: "mastered" };

    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: dataWithForgedFields,
    });

    expect(mocks.mockValues).toHaveBeenCalledTimes(1);
    const written = mocks.capturedInsertValues[0] as Record<string, unknown>;
    // userId comes from principal.id, NEVER from data
    expect(written.userId).toBe("user-uuid-1");
    expect(written.userId).not.toBe("attacker");
  });

  it("stamps source='manual' regardless of any source field in data", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", masteryState: "in-progress" },
    });

    const written = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(written.source).toBe("manual"); // D-04: hardcoded, never from data
  });

  it("stamps patchId=CURRENT_PATCH.id regardless of any patchId in data", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "army-positioning", masteryState: "mastered" },
    });

    const written = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(written.patchId).toBe(CURRENT_PATCH.id); // D-05: server-stamped
    expect(written.patchId).not.toBe("patch-99");
  });

  it("rejects masteryState 'learning' (renamed to in-progress per D-03, T-05-04b)", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    await expect(
      setNodeMasteryHandler({
        context: { principal: principalA },
        // Cast via unknown to simulate a malicious/outdated client sending "learning"
        data: { nodeId: "scouting", masteryState: "learning" as unknown as "mastered" },
      })
    ).rejects.toThrow();
  });

  it("rejects masteryState 'MASTERED' (wrong case — T-05-04b)", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    await expect(
      setNodeMasteryHandler({
        context: { principal: principalA },
        data: { nodeId: "scouting", masteryState: "MASTERED" as unknown as "mastered" },
      })
    ).rejects.toThrow();
  });

  it("returns { ok: true } on successful upsert", async () => {
    const { setNodeMasteryHandler } = await import("#/server/progress");

    const result = await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", masteryState: "in-progress" },
    });

    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// mergeProgressOnSignInHandler — fill-gaps merge (PROG-03, D-07, T-05-04d)
// ---------------------------------------------------------------------------

describe("mergeProgressOnSignInHandler — fill-gaps merge (D-07, T-05-04d)", () => {
  it("inserts only gap nodes; skips nodeIds the principal already has server-side", async () => {
    // Principal already has a server row for "map-control"
    mocks.findMany.mockResolvedValue([{ nodeId: "map-control" }]);

    const { mergeProgressOnSignInHandler } = await import("#/server/progress");
    const result = await mergeProgressOnSignInHandler({
      context: { principal: principalA },
      data: {
        records: [
          { nodeId: "map-control", masteryState: "mastered" },  // existing — SKIP
          { nodeId: "scouting", masteryState: "in-progress" },   // gap — INSERT
        ],
      },
    });

    // Only "scouting" should be inserted (one db.insert().values() call)
    expect(mocks.mockValues).toHaveBeenCalledTimes(1);
    const insertedRows = mocks.capturedInsertValues[0] as Array<Record<string, unknown>>;
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]?.nodeId).toBe("scouting");
    expect(insertedRows[0]?.userId).toBe("user-uuid-1"); // principal.id, not from data
    expect(insertedRows[0]?.source).toBe("manual");
    expect(insertedRows[0]?.patchId).toBe(CURRENT_PATCH.id);

    // Merge count = number of gap nodes inserted
    expect(result).toEqual({ merged: 1 });
  });

  it("returns { merged: 0 } and makes no insert when all records already exist", async () => {
    mocks.findMany.mockResolvedValue([{ nodeId: "map-control" }, { nodeId: "scouting" }]);

    const { mergeProgressOnSignInHandler } = await import("#/server/progress");
    const result = await mergeProgressOnSignInHandler({
      context: { principal: principalA },
      data: {
        records: [
          { nodeId: "map-control", masteryState: "mastered" },
          { nodeId: "scouting", masteryState: "in-progress" },
        ],
      },
    });

    // No insert call when there are no gaps (D-07 server wins on all records)
    expect(mocks.mockValues).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it("rejects an invalid masteryState value in the records payload (T-05-04d)", async () => {
    const { mergeProgressOnSignInHandler } = await import("#/server/progress");

    await expect(
      mergeProgressOnSignInHandler({
        context: { principal: principalA },
        data: {
          records: [
            // Entire payload parse rejects because of this one invalid record
            { nodeId: "scouting", masteryState: "invalid-state" as unknown as "mastered" },
          ],
        },
      })
    ).rejects.toThrow();
  });
});
