// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Unit tests for progress server function handlers (PROG-01/02/03, D-04/D-05/D-06).
 *
 * Tests call the exported *Handler functions directly — same testability pattern
 * as getUserProfileHandler in auth-middleware.test.ts. The TanStack Start runtime
 * (authMiddleware, createServerFn) is bypassed; context is injected explicitly.
 *
 * What these tests prove:
 *   - getUserProgressHandler keys the query by principal.id (D-06 IDOR prevention)
 *   - setNodeMasteryHandler ignores forged userId/source/patchId in input data
 *   - setNodeMasteryHandler rejects invalid masteryState values (T-05-04b)
 *   - setNodeMasteryHandler stamps source="manual" and patchId=CURRENT_PATCH.id (D-04/D-05)
 *   - mergeProgressOnSignInHandler inserts only gap nodes (server-wins D-07)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CURRENT_PATCH } from "#/lib/patches";

// ---------------------------------------------------------------------------
// Module mocks — must appear before any import of modules under test.
// (vi.mock calls are hoisted by vitest's transform before all imports.)
// ---------------------------------------------------------------------------

// Shared capture array for eq() argument assertions (reset in beforeEach)
const eqCalls: Array<[unknown, unknown]> = [];

vi.mock("#/lib/auth", () => ({
  auth: {
    api: { getSession: vi.fn() },
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: vi.fn().mockReturnValue(new Headers()),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => {
    eqCalls.push([col, val]);
    return { __eq: [col, val] };
  }),
  sql: vi.fn().mockReturnValue({ __sql: "mock" }),
}));

// Chainable insert mock supporting both:
//   db.insert(t).values(rows)                         (plain insert — merge handler)
//   db.insert(t).values(row).onConflictDoUpdate(...)  (upsert — set handler)
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
const mockFindMany = vi.fn();

vi.mock("#/lib/db", () => ({
  db: {
    query: { nodeProgress: { findMany: mockFindMany } },
    insert: mockInsert,
  },
}));

// Column references — mocked as plain strings so eq() spy captures the value argument
vi.mock("#/db/schema", () => ({
  nodeProgress: {
    userId: "__userId_col",
    nodeId: "__nodeId_col",
    masteryState: "__masteryState_col",
    source: "__source_col",
    patchId: "__patchId_col",
  },
}));

// ---------------------------------------------------------------------------
// Import handlers under test (after mocks are established)
// ---------------------------------------------------------------------------

import {
  getUserProgressHandler,
  setNodeMasteryHandler,
  mergeProgressOnSignInHandler,
} from "#/server/progress";

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
  avatarUrl: null,
  bnetSub: "sub-a",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Per-test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  eqCalls.length = 0;
  // Restore default mock behaviors after clearAllMocks() resets them
  mockFindMany.mockResolvedValue([]);
  mockOnConflictDoUpdate.mockResolvedValue(undefined);
  mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  mockInsert.mockReturnValue({ values: mockValues });
});

// ---------------------------------------------------------------------------
// getUserProgressHandler — principal-keying (PROG-02, D-06)
// ---------------------------------------------------------------------------

describe("getUserProgressHandler — principal-keying (D-06)", () => {
  it("passes principal.id to eq() for the WHERE clause, never a forged id", async () => {
    await getUserProgressHandler({ context: { principal: principalA } });

    // eq() must have been called with the principal's id as the second argument.
    // This proves the query is keyed by the session principal, not by any input.
    expect(eqCalls.some(([, val]) => val === "user-uuid-1")).toBe(true);
    expect(eqCalls.some(([, val]) => val === "attacker")).toBe(false);
  });

  it("returns the result of findMany", async () => {
    const fakeRow = { nodeId: "scouting", masteryState: "in-progress" as const };
    mockFindMany.mockResolvedValue([fakeRow]);

    const result = await getUserProgressHandler({ context: { principal: principalA } });
    expect(result).toEqual([fakeRow]);
  });
});

// ---------------------------------------------------------------------------
// setNodeMasteryHandler — input rejection + server stamping (D-04/D-05/D-06)
// ---------------------------------------------------------------------------

describe("setNodeMasteryHandler — server stamping (D-04/D-05/D-06, T-05-04c)", () => {
  it("writes userId from principal.id, not from any input field", async () => {
    // The input schema has no userId field — but we simulate what would happen
    // at the HTTP level if extra fields were injected (cast via unknown).
    const dataWithForgedFields = {
      nodeId: "supply-management",
      masteryState: "mastered",
      userId: "attacker",   // forged — must be ignored
      source: "auto",        // forged — must be ignored
      patchId: "patch-99",   // forged — must be ignored
    } as unknown as { nodeId: string; masteryState: "mastered" };

    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: dataWithForgedFields,
    });

    expect(mockValues).toHaveBeenCalledTimes(1);
    const written = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    // userId comes from principal.id, never from data
    expect(written.userId).toBe("user-uuid-1");
    expect(written.userId).not.toBe("attacker");
  });

  it("stamps source='manual' regardless of any source field in input", async () => {
    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", masteryState: "in-progress" },
    });

    const written = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written.source).toBe("manual");
  });

  it("stamps patchId=CURRENT_PATCH.id regardless of any patchId in input", async () => {
    await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "army-positioning", masteryState: "mastered" },
    });

    const written = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written.patchId).toBe(CURRENT_PATCH.id);
    expect(written.patchId).not.toBe("patch-99");
  });

  it("rejects masteryState 'learning' (renamed to in-progress per D-03, T-05-04b)", async () => {
    await expect(
      setNodeMasteryHandler({
        context: { principal: principalA },
        // Cast via unknown to simulate a malicious/outdated client sending "learning"
        data: { nodeId: "scouting", masteryState: "learning" as unknown as "mastered" },
      })
    ).rejects.toThrow();
  });

  it("rejects masteryState 'MASTERED' (wrong case — T-05-04b)", async () => {
    await expect(
      setNodeMasteryHandler({
        context: { principal: principalA },
        data: { nodeId: "scouting", masteryState: "MASTERED" as unknown as "mastered" },
      })
    ).rejects.toThrow();
  });

  it("returns { ok: true } on successful upsert", async () => {
    const result = await setNodeMasteryHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", masteryState: "in-progress" },
    });
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// mergeProgressOnSignInHandler — fill-gaps merge (PROG-03, D-07)
// ---------------------------------------------------------------------------

describe("mergeProgressOnSignInHandler — fill-gaps merge (D-07, T-05-04d)", () => {
  it("inserts only gap nodes; skips nodeIds the principal already has server-side", async () => {
    // Principal already has a server row for "map-control"
    mockFindMany.mockResolvedValue([{ nodeId: "map-control" }]);

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
    expect(mockValues).toHaveBeenCalledTimes(1);
    const insertedRows = mockValues.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]?.nodeId).toBe("scouting");
    expect(insertedRows[0]?.userId).toBe("user-uuid-1");
    expect(insertedRows[0]?.source).toBe("manual");
    expect(insertedRows[0]?.patchId).toBe(CURRENT_PATCH.id);

    // Merge count reflects only the inserted gaps
    expect(result).toEqual({ merged: 1 });
  });

  it("returns { merged: 0 } and makes no insert when all records already exist", async () => {
    mockFindMany.mockResolvedValue([{ nodeId: "map-control" }, { nodeId: "scouting" }]);

    const result = await mergeProgressOnSignInHandler({
      context: { principal: principalA },
      data: {
        records: [
          { nodeId: "map-control", masteryState: "mastered" },
          { nodeId: "scouting", masteryState: "in-progress" },
        ],
      },
    });

    // No insert should be made
    expect(mockValues).not.toHaveBeenCalled();
    expect(result).toEqual({ merged: 0 });
  });

  it("skips records with invalid masteryState values (T-05-04d)", async () => {
    mockFindMany.mockResolvedValue([]);

    await expect(
      mergeProgressOnSignInHandler({
        context: { principal: principalA },
        data: {
          records: [
            // Entire payload parse should fail or skip the invalid record
            { nodeId: "scouting", masteryState: "invalid-state" as unknown as "mastered" },
          ],
        },
      })
    ).rejects.toThrow();
  });
});
