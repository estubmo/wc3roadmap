// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * User profile server function — first authedServerFn consumer (AUTH-03, D-12).
 *
 * Authorization contract (D-12, principal-keyed by construction):
 *   This function accepts NO userId input parameter. The DB query is keyed
 *   exclusively by `context.principal.id` — the UUID injected by authMiddleware
 *   from the server-side session. A client cannot supply or forge a userId
 *   because there is no such input channel in the function signature.
 *
 * Cross-user access is structurally impossible: even if a client attempted to
 * influence which user's data is returned, there is nothing to forge — the
 * function returns the principal's own row and nothing else (D-12/D-13).
 *
 * Phase 5 scope: getUserProfile is the read path for the auth user row.
 * Progress records, mastery states, and w3champions stats are separate
 * server functions built in Phases 5 and 7 using the same authedServerFn
 * pattern.
 */

import { eq } from "drizzle-orm";
import { db } from "#/lib/db";
import { users } from "#/db/schema";
import { authedServerFn, type AuthedContext } from "#/lib/auth-middleware";

// ---------------------------------------------------------------------------
// getUserProfileHandler — extracted for unit testability (same pattern as
// mapBattlenetProfile in auth.ts: exported named fn so tests call the exact
// same code path that runs at runtime)
// ---------------------------------------------------------------------------

/**
 * The handler for getUserProfile.
 *
 * Exported as a named function so it can be called directly in unit tests
 * without the TanStack Start server runtime (AsyncLocalStorage context),
 * following the same testability pattern as mapBattlenetProfile in auth.ts.
 *
 * Called at runtime via the authedServerFn wrapper below.
 */
export async function getUserProfileHandler({ context }: AuthedContext) {
  const { principal } = context;

  // Key the query by the session principal's UUID — NEVER by client input.
  // This is the D-12 enforcement point: principal.id is the ONLY source
  // of identity used here. There is no request body or param to forge.
  const user = await db.query.users.findFirst({
    where: eq(users.id, principal.id),
  });

  return user ?? null;
}

// ---------------------------------------------------------------------------
// getUserProfile — principal-keyed user row fetch (authedServerFn wrapper)
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's profile row from the users table.
 *
 * Returns the row for `context.principal.id` (UUID from the session), or
 * `null` if the row is not found. No userId parameter is accepted — see the
 * module JSDoc for the principal-keyed-by-construction authorization contract.
 */
export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  getUserProfileHandler
);
