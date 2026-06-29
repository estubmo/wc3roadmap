// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * authedServerFn — the authorization deep module (AUTH-03, D-11/D-12).
 *
 * INTERFACE (simple — this is all callers need to know):
 *   Add `.middleware([authMiddleware])` to any server function, or use
 *   `authedServerFn({ method })` as a factory. The handler receives
 *   `context.principal` (the session user). Key every query by
 *   `principal.id` — NEVER by any client-supplied userId.
 *
 * IMPLEMENTATION (hidden here — one file to audit):
 *   Resolves `getRequestHeaders()` from the current server context, calls
 *   `auth.api.getSession({ headers })`, throws `Error("Unauthorized")` when
 *   the session is absent or invalid, and injects `principal` into context
 *   via `next()` when the session is valid. getRequestHeaders() is the
 *   correct API for TanStack Start 1.168.x (not request.headers — see
 *   RESEARCH.md Pitfall 4 / Anti-Patterns).
 *
 * Security guarantees:
 *   - A request with no valid session NEVER reaches the handler (D-11).
 *   - next() is only called when getSession returns a user (D-13 test gate).
 *   - User-data handlers built on authedServerFn accept no userId input;
 *     they read principal.id from context only (D-12 — cross-user access
 *     impossible by construction).
 *
 * Do NOT put auth logic in beforeLoad — that guards UX navigation only and
 * is bypassed by direct server function calls (RESEARCH.md Pitfall 7).
 */

import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth, type User } from "#/lib/auth";

// ---------------------------------------------------------------------------
// AuthedContext — type helper for handler functions using authedServerFn
// ---------------------------------------------------------------------------

/**
 * The context shape injected by authMiddleware.
 *
 * Import in handler functions to type the `context` destructure:
 *   `async function myHandler({ context }: AuthedContext) { ... }`
 */
export type AuthedContext = { context: { principal: User } };

// ---------------------------------------------------------------------------
// authMiddleware — D-11: 401 gate before any user-data handler
// ---------------------------------------------------------------------------

/**
 * TanStack Start function middleware that resolves the session and injects the
 * principal into server function context.
 *
 * Usage: `createServerFn(...).middleware([authMiddleware]).handler(...)`
 * Or via the factory: `authedServerFn({ method }).handler(...)`
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    // getRequestHeaders() binds to the current server function request context.
    // This is the only correct way to get headers in TanStack Start 1.168.x —
    // using request.headers from middleware params is broken (Pitfall 4).
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      // D-11: Throw before calling next() — handler NEVER runs without a session.
      // This is what the D-13 test asserts: next() was not called.
      throw new Error("Unauthorized");
    }

    // Inject principal: downstream handlers read context.principal.id.
    // The User cast is safe because getSession's user shape matches our inferred
    // User type (including additionalFields battleTag, gateway, avatarUrl, bnetSub).
    return next({ context: { principal: session.user as User } });
  }
);

// ---------------------------------------------------------------------------
// authedServerFn — convenience factory (D-12)
// ---------------------------------------------------------------------------

/**
 * Factory for server functions that require authentication (AUTH-03, D-12).
 *
 * Equivalent to `createServerFn(options).middleware([authMiddleware])`.
 * Handlers receive `context.principal` (the session user, type `User`).
 * Key every DB query by `principal.id` — NEVER accept a userId from the
 * request body or params (D-12: principal-keyed by construction, not by trust).
 *
 * Example:
 *   export const getUserProfile = authedServerFn({ method: "GET" }).handler(
 *     async ({ context }) => {
 *       const { principal } = context;
 *       return db.query.users.findFirst({ where: eq(users.id, principal.id) });
 *     }
 *   );
 */
export function authedServerFn(options: { method: "GET" | "POST" }) {
  return createServerFn(options).middleware([authMiddleware]);
}
