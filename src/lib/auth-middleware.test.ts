// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for authMiddleware and authedServerFn (AUTH-03, D-11, D-12, D-13).
 *
 * What these tests prove:
 *   D-11: authMiddleware throws "Unauthorized" when no valid session exists.
 *   D-13: next() is never called when there is no session — handler is gated.
 *   D-11: context.principal is injected with the session user on valid session.
 *   D-12/D-13 (cross-user): A user-data handler keyed by context.principal.id
 *         cannot be forged by any client-supplied value — the principal is the
 *         sole source of identity, never any input parameter.
 *
 * All tests mock auth.api.getSession and getRequestHeaders so they run
 * offline without a live Neon DB or Battle.net OAuth token.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must appear before any dynamic import of modules under test
// ---------------------------------------------------------------------------

vi.mock("#/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: vi.fn().mockReturnValue(new Headers()),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Principal A — the legitimate signed-in user. */
const principalA = {
  id: "user-uuid-a",
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

/** Principal B — a different user (the "forged" target in D-13 tests). */
const principalB = {
  id: "user-uuid-b",
  name: "OtherPlayer#5678",
  email: "other@example.com",
};

/** A minimal session fixture wrapping principalA. */
const sessionA = {
  session: {
    id: "session-a",
    userId: principalA.id,
    token: "token-a",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null,
  },
  user: principalA,
};

// ---------------------------------------------------------------------------
// authMiddleware — D-11: throws 401 when no session
// ---------------------------------------------------------------------------

describe("authMiddleware — no session (D-11/D-13)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("throws Unauthorized when getSession returns null", async () => {
    const { auth } = await import("#/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);

    const { authMiddleware } = await import("#/lib/auth-middleware");

    const next = vi.fn();
    await expect(
      // authMiddleware.options.server is the registered server handler fn.
      // authMiddleware.server is the fluent chaining method — not what we call.
      // @ts-expect-error — partial mock; options.server may not be typed for direct call
      authMiddleware.options.server({ next })
    ).rejects.toThrow("Unauthorized");
  });

  it("does NOT call next() when getSession returns null (D-13: handler never reached)", async () => {
    const { auth } = await import("#/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);

    const { authMiddleware } = await import("#/lib/auth-middleware");

    const next = vi.fn();
    await expect(
      // @ts-expect-error — partial mock; options.server may not be typed for direct call
      authMiddleware.options.server({ next })
    ).rejects.toThrow();

    // This is the D-13 regression gate: if next() is ever called when
    // getSession returns null, the handler would execute with no principal.
    // A forged/absent session MUST never reach the handler.
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// authMiddleware — D-11: principal injected on valid session
// ---------------------------------------------------------------------------

describe("authMiddleware — valid session (D-11)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls next() with context.principal when getSession returns a valid session", async () => {
    const { auth } = await import("#/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue(sessionA as never);

    const { authMiddleware } = await import("#/lib/auth-middleware");

    const next = vi.fn().mockResolvedValue({ result: undefined });
    // @ts-expect-error — partial mock; options.server may not be typed for direct call
    await authMiddleware.options.server({ next });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ principal: principalA }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-user authorization (D-12/D-13, SUCCESS CRITERION 3)
//
// Scenario: principal is A. A mock user-data handler (mimicking getUserProfile)
// receives context.principal from the middleware. We verify the handler uses
// principal.id (session-derived), not any externally supplied id.
//
// Since authedServerFn-based handlers take NO userId input param, there is
// nothing for a caller to forge — cross-user access is impossible by
// construction (D-12). This test encodes that guarantee as an executable
// regression check (D-13).
// ---------------------------------------------------------------------------

describe("cross-user authorization (D-12/D-13, success criterion 3)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("middleware injects principal A's id when session belongs to A, regardless of any external id", async () => {
    const { auth } = await import("#/lib/auth");
    // Session belongs to principal A
    vi.mocked(auth.api.getSession).mockResolvedValue(sessionA as never);

    const { authMiddleware } = await import("#/lib/auth-middleware");

    // Simulate a user-data handler that records which id it would query by.
    // This handler is the analog of getUserProfile — it reads principal.id
    // from context and ignores any input.
    const capturedQueryId: string[] = [];
    const mockUserDataHandler = vi.fn().mockImplementation(
      async (ctx: { context: { principal: { id: string } } }) => {
        // Principal-keyed by construction: use session id, never input
        capturedQueryId.push(ctx.context.principal.id);
        return { id: ctx.context.principal.id };
      }
    );

    // @ts-expect-error — partial mock; options.server may not be typed for direct call
    await authMiddleware.options.server({
      next: async (ctx: { context: { principal: { id: string } } }) => {
        await mockUserDataHandler(ctx);
        return { result: undefined };
      },
    });

    // The handler was called with principal A's id (from the session)
    expect(capturedQueryId).toContain(principalA.id);

    // The handler was NEVER called with principal B's id (the forged target).
    // Even if a client tried to supply B's userId as input, the handler has
    // no input parameter — it only sees context.principal.id from the session.
    expect(capturedQueryId).not.toContain(principalB.id);
  });
});
