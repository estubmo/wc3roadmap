// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Progress persistence deep module (PROG-01/02/03, D-04/D-05/D-06, ADR-007).
 *
 * Authorization contract (D-06, principal-keyed by construction):
 *   None of these functions accept `userId`, `source`, or `patchId` from client
 *   input. Every DB read and write is keyed exclusively by `context.principal.id`
 *   — the UUID injected by authMiddleware from the server-side session.
 *   Cross-user access (IDOR) is structurally impossible (ADR-007).
 *
 * Server-stamped fields (T-05-04c):
 *   `source` is hardcoded `"manual"` in this phase (D-04). Future Phase-7
 *   auto-detection will write `"auto"` via a separate server function.
 *   `patchId` is stamped from `CURRENT_PATCH.id` (D-05). Neither field is ever
 *   read from client input.
 *
 * Deep-module discipline: the simple `authedServerFn` interface hides upsert +
 * patch-stamping + fill-gaps complexity. All progress writes flow through this
 * single auditable seam (CLAUDE.md architecture § deep modules).
 *
 * Exported handlers follow the same testability pattern as `getUserProfileHandler`
 * in `src/server/user-profile.ts`: named functions exported so tests can call
 * them directly without the TanStack Start server runtime.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress } from "#/db/schema";
import { authedServerFn, type AuthedContext } from "#/lib/auth-middleware";
import { z } from "zod";
import { MasteryStateSchema } from "#/schemas/progress";
import { CURRENT_PATCH } from "#/lib/patches";

// ---------------------------------------------------------------------------
// Input schemas (exported for test-time type assertions and re-use)
// ---------------------------------------------------------------------------

/**
 * Validated input for setNodeMastery.
 *
 * CRITICAL: no `userId`, `source`, or `patchId` field — those are server-only.
 * The schema strips any extra fields injected at the HTTP level via Zod's default
 * object stripping behavior (defense-in-depth, T-05-04c).
 */
export const SetNodeMasteryInput = z.object({
  /** Content node identifier — must be non-empty. */
  nodeId: z.string().min(1),
  /** Mastery state — one of the three canonical values (D-03). */
  masteryState: MasteryStateSchema,
});

/**
 * Validated input for mergeProgressOnSignIn.
 *
 * Records come from localStorage (signed-out store). Each record is validated
 * individually via MasteryStateSchema — invalid records cause the entire parse
 * to fail (T-05-04d fail-safe: reject malformed payloads entirely).
 */
export const MergeProgressInput = z.object({
  records: z.array(
    z.object({
      nodeId: z.string().min(1),
      masteryState: MasteryStateSchema,
    })
  ),
});

// ---------------------------------------------------------------------------
// getUserProgressHandler — read all progress for the principal (PROG-01)
// ---------------------------------------------------------------------------

/**
 * Returns all nodeProgress rows for the authenticated principal.
 *
 * Principal-keyed by construction (D-06): the WHERE clause uses
 * `context.principal.id` exclusively — there is no `userId` input channel.
 *
 * Exported as a named function for unit testability (bypass TanStack Start
 * server runtime in tests).
 */
export async function getUserProgressHandler({ context }: AuthedContext) {
  const { principal } = context;

  // Key the query by the session principal's UUID — NEVER by client input (D-06).
  return db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
}

/**
 * Fetch all progress rows for the authenticated user.
 *
 * Returns an array of nodeProgress rows keyed by `context.principal.id`.
 * No userId parameter is accepted — see module JSDoc for authorization contract.
 */
export const getUserProgress = authedServerFn({ method: "GET" }).handler(
  getUserProgressHandler
);

// ---------------------------------------------------------------------------
// setNodeMasteryHandler — upsert one node's mastery state (PROG-02)
// ---------------------------------------------------------------------------

/**
 * Upserts one node's mastery state for the authenticated principal.
 *
 * Server-stamped fields (never from client input):
 *   - `userId`: from `context.principal.id` (D-06)
 *   - `source`: hardcoded `"manual"` (D-04)
 *   - `patchId`: from `CURRENT_PATCH.id` (D-05)
 *
 * The Zod parse inside strips any extra fields injected at the HTTP level
 * (e.g. a forged `userId`, `source`, or `patchId`). Only `nodeId` and
 * `masteryState` are read from `data` (defense-in-depth, T-05-04c).
 *
 * Exported as a named function for unit testability.
 */
export async function setNodeMasteryHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof SetNodeMasteryInput> }) {
  const { principal } = context;

  // Runtime parse strips any extra fields; validates enum membership.
  // This is a defense-in-depth layer — the .validator() on the exported fn
  // already strips/validates at the TanStack Start layer.
  const { nodeId, masteryState } = SetNodeMasteryInput.parse(data);

  await db
    .insert(nodeProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id, // D-06: NEVER from data
      nodeId,
      masteryState,
      source: "manual", // D-04: NEVER from data
      patchId: CURRENT_PATCH.id, // D-05: NEVER from data
    })
    .onConflictDoUpdate({
      target: [nodeProgress.userId, nodeProgress.nodeId],
      set: {
        masteryState: sql`excluded.mastery_state`,
        source: sql`excluded.source`,
        patchId: sql`excluded.patch_id`,
        updatedAt: sql`now()`,
      },
    });

  return { ok: true };
}

/**
 * Upsert one node's mastery state for the authenticated user.
 *
 * Accepts `{ nodeId, masteryState }` — no userId, source, or patchId.
 * Those are stamped server-side (D-04/D-05/D-06).
 */
export const setNodeMastery = authedServerFn({ method: "POST" })
  .validator(SetNodeMasteryInput)
  .handler(setNodeMasteryHandler);

// ---------------------------------------------------------------------------
// mergeProgressOnSignInHandler — fill-gaps merge (PROG-03, D-07)
// ---------------------------------------------------------------------------

/**
 * One-time fill-gaps merge of localStorage progress on first sign-in (PROG-03).
 *
 * Strategy (D-07 — server wins):
 *   1. Load all nodeIds the principal already has a server row for.
 *   2. From the incoming records, keep only those NOT already present (gaps).
 *   3. Insert the gaps with source="manual" and patchId=CURRENT_PATCH.id.
 *   4. Server records are NEVER overwritten — the client cannot use this
 *      endpoint to downgrade or override server-side progress.
 *
 * Security (T-05-04d): the entire `records` array is validated by Zod before
 * any DB operation. A record with an invalid masteryState causes the whole
 * payload to be rejected (fail-closed). Valid records are then inserted with
 * server-stamped source and patchId — the client cannot influence either.
 *
 * Exported as a named function for unit testability.
 */
export async function mergeProgressOnSignInHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof MergeProgressInput> }) {
  const { principal } = context;

  // Validate the entire payload — invalid masteryState values reject the merge.
  const { records } = MergeProgressInput.parse(data);

  // Load existing nodeIds for this principal (server wins on conflict — D-07).
  const existing = await db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
  const existingSet = new Set(existing.map((r) => r.nodeId));

  // Keep only records the server has no row for (gap nodes).
  const gaps = records.filter((r) => !existingSet.has(r.nodeId));

  if (gaps.length > 0) {
    await db.insert(nodeProgress).values(
      gaps.map((r) => ({
        id: crypto.randomUUID(),
        userId: principal.id, // D-06: NEVER from data
        nodeId: r.nodeId,
        masteryState: r.masteryState,
        source: "manual" as const, // D-04: NEVER from data
        patchId: CURRENT_PATCH.id, // D-05: NEVER from data
      }))
    );
  }

  return { merged: gaps.length };
}

/**
 * Merge localStorage progress into the server on first sign-in (fill-gaps only).
 *
 * Accepts `{ records: [{ nodeId, masteryState }][] }`.
 * Server records are never overwritten (D-07 server wins).
 */
export const mergeProgressOnSignIn = authedServerFn({ method: "POST" })
  .validator(MergeProgressInput)
  .handler(mergeProgressOnSignInHandler);
