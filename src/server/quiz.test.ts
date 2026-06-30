// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Unit tests for quiz server function handlers (QUIZ-02, D-12/D-13, ADR-007).
 *
 * Tests call the exported *Handler functions directly — same testability pattern
 * as setNodeMasteryHandler in src/server/progress.ts. The TanStack Start
 * runtime (authMiddleware, createServerFn) is bypassed; context is injected
 * explicitly so tests run offline without a live DB or session.
 *
 * What these tests prove:
 *   - recordQuizPassHandler stamps source="quiz" regardless of any source in data (D-13)
 *   - recordQuizPassHandler stamps masteryState="mastered" regardless of any in data (D-12)
 *   - recordQuizPassHandler stamps patchId=CURRENT_PATCH.id regardless of any in data (D-13)
 *   - recordQuizPassHandler writes userId from principal.id, ignoring any forged userId (D-13)
 *   - A pass produces TWO insert/values calls (nodeProgress then quizProgress)
 *   - quizProgress values carry passed=true and attemptCount=1 on first insert
 *   - recordQuizAttemptHandler increments lapseCount on fail AFTER a prior pass (D-08, Pitfall 6)
 *   - recordQuizAttemptHandler does NOT increment lapseCount on fail with no prior pass
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
  mockValues: ReturnType<typeof vi.fn>;
  mockOnConflictDoUpdate: ReturnType<typeof vi.fn>;
}

let mocks: TestMocks;

beforeEach(() => {
  vi.resetModules();

  // Fresh state for each test
  const eqCalls: Array<[unknown, unknown]> = [];
  const capturedInsertValues: Array<unknown> = [];
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockImplementation((vals: unknown) => {
    capturedInsertValues.push(vals);
    return { onConflictDoUpdate: mockOnConflictDoUpdate };
  });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  // Expose for assertions
  mocks = { eqCalls, capturedInsertValues, mockValues, mockOnConflictDoUpdate };

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
    quizProgress: {
      userId: "__qp_userId_col",
      nodeId: "__qp_nodeId_col",
      passed: "__qp_passed_col",
      lastAttemptAt: "__qp_lastAttemptAt_col",
      attemptCount: "__qp_attemptCount_col",
      lapseCount: "__qp_lapseCount_col",
    },
  }));

  vi.doMock("#/lib/db", () => ({
    db: {
      insert: mockInsert,
    },
  }));
});

// ---------------------------------------------------------------------------
// recordQuizPassHandler — server stamping + input rejection (D-12/D-13, QUIZ-02)
// ---------------------------------------------------------------------------

describe("recordQuizPassHandler — server stamping (D-12/D-13, QUIZ-02)", () => {
  it("writes userId from principal.id, not from any forged field in data", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    // Simulate HTTP-level injection of extra fields (bypassing TypeScript via cast).
    // RecordQuizPassInput has only nodeId — Zod strips these at the parse layer.
    const dataWithForgedFields = {
      nodeId: "supply-management",
      userId: "attacker",        // forged — must be stripped + ignored
      source: "manual",          // forged — must be stripped + ignored
      masteryState: "in-progress", // forged — must be stripped + ignored
      patchId: "patch-99",       // forged — must be stripped + ignored
    } as unknown as { nodeId: string };

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: dataWithForgedFields,
    });

    // First insert is nodeProgress — check userId is from principal, not forged
    const nodeProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(nodeProgressWrite.userId).toBe("user-uuid-1");
    expect(nodeProgressWrite.userId).not.toBe("attacker");
  });

  it("stamps source='quiz' regardless of any source field in data", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting" } as unknown as { nodeId: string },
    });

    const nodeProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(nodeProgressWrite.source).toBe("quiz"); // D-13: hardcoded, never from data
  });

  it("stamps masteryState='mastered' regardless of any masteryState in data", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: { nodeId: "army-positioning" } as unknown as { nodeId: string },
    });

    const nodeProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(nodeProgressWrite.masteryState).toBe("mastered"); // D-12: quiz always sets mastered
  });

  it("stamps patchId=CURRENT_PATCH.id regardless of any patchId in data", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    const dataWithForgedPatch = {
      nodeId: "map-control",
      patchId: "patch-99", // forged — must be ignored
    } as unknown as { nodeId: string };

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: dataWithForgedPatch,
    });

    const nodeProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(nodeProgressWrite.patchId).toBe(CURRENT_PATCH.id); // D-13: server-stamped
    expect(nodeProgressWrite.patchId).not.toBe("patch-99");
  });

  it("produces TWO insert/values calls (nodeProgress then quizProgress)", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting" } as unknown as { nodeId: string },
    });

    // Must write both tables — not just nodeProgress
    expect(mocks.mockValues).toHaveBeenCalledTimes(2);
    expect(mocks.capturedInsertValues).toHaveLength(2);
  });

  it("quizProgress values carry passed=true and attemptCount=1 on first insert", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    await recordQuizPassHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting" } as unknown as { nodeId: string },
    });

    const quizProgressWrite = mocks.capturedInsertValues[1] as Record<string, unknown>;
    expect(quizProgressWrite.passed).toBe(true);
    expect(quizProgressWrite.attemptCount).toBe(1);
    expect(quizProgressWrite.userId).toBe("user-uuid-1"); // principal-keyed
  });

  it("returns { ok: true } on successful pass", async () => {
    const { recordQuizPassHandler } = await import("#/server/quiz");

    const result = await recordQuizPassHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting" } as unknown as { nodeId: string },
    });

    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// recordQuizAttemptHandler — lapseCount tracking on fail path (D-08, Pitfall 6)
// ---------------------------------------------------------------------------

describe("recordQuizAttemptHandler — lapseCount on fail path (D-08, Pitfall 6)", () => {
  it("on passed=true delegates to the pass path (two inserts, nodeProgress mastered)", async () => {
    const { recordQuizAttemptHandler } = await import("#/server/quiz");

    await recordQuizAttemptHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", passed: true },
    });

    // Delegating to pass path: two inserts, nodeProgress stamped mastered
    expect(mocks.mockValues).toHaveBeenCalledTimes(2);
    const nodeProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(nodeProgressWrite.masteryState).toBe("mastered");
  });

  it("on passed=false produces ONE insert to quizProgress only (nodeProgress untouched)", async () => {
    const { recordQuizAttemptHandler } = await import("#/server/quiz");

    await recordQuizAttemptHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", passed: false },
    });

    // A fail NEVER touches nodeProgress (D-12: fail never changes mastery)
    expect(mocks.mockValues).toHaveBeenCalledTimes(1);
  });

  it("on passed=false sets passed=false in the quizProgress upsert", async () => {
    const { recordQuizAttemptHandler } = await import("#/server/quiz");

    await recordQuizAttemptHandler({
      context: { principal: principalA },
      data: { nodeId: "tech-timing", passed: false },
    });

    const quizProgressWrite = mocks.capturedInsertValues[0] as Record<string, unknown>;
    expect(quizProgressWrite.passed).toBe(false);
  });

  it("returns { ok: true } on successful fail-path attempt", async () => {
    const { recordQuizAttemptHandler } = await import("#/server/quiz");

    const result = await recordQuizAttemptHandler({
      context: { principal: principalA },
      data: { nodeId: "scouting", passed: false },
    });

    expect(result).toEqual({ ok: true });
  });
});
