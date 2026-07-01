// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * w3champions auto-detection sync — the orchestrating deep module (AUTO-01..05,
 * ADR-007/009, D-04/D-05/D-06).
 *
 * This is where every AUTO requirement converges. It wraps the pure
 * `detectMasterySignals` eligibility function with the four responsibilities the
 * pure function deliberately does NOT own — authorization, the durable DB-TTL
 * cache gate, the outbound fetch, and the additive auto-write — behind a single
 * `.middleware([authMiddleware]).handler(...)` seam that mirrors `quiz.ts` /
 * `progress.ts` exactly.
 *
 * Authorization contract (ADR 007, AUTO-01, principal-keyed by construction):
 *   `syncW3championsHandler` reads userId/battleTag/gateway ONLY from
 *   `context.principal` (the session user injected by authMiddleware). There is
 *   NO userId/battleTag/gateway body channel — the sync fn takes no meaningful
 *   client input. Cross-user access (IDOR) is structurally impossible.
 *
 * TTL gate (AUTO-04, criterion 3):
 *   The per-user `w3championsSync` row is the durable rate-limit gate. When its
 *   `lastSyncedAt` is within `SYNC_TTL_MS`, the outbound fetch is skipped
 *   entirely and the cached signals are reused. Because the gate lives in the DB
 *   it survives across tabs and devices — two back-to-back syncs make exactly
 *   ONE upstream fetch, regardless of click frequency (T-07-07c).
 *
 * Server-stamped write (ADR 009, D-04, T-07-07e):
 *   Every auto nodeProgress insert hardcodes `masteryState: "in-progress"` (D-04
 *   ceiling — auto NEVER sets "mastered"), `source: "auto"`, `patchId:
 *   CURRENT_PATCH.id`, and `userId: principal.id`. None of these are ever read
 *   from client input or the upstream API JSON.
 *
 * Additive one-way ratchet (D-05/D-06, T-07-07b):
 *   The auto-write is a PLAIN insert (`.onConflictDoNothing()` for defensive
 *   concurrency) — NEVER `onConflictDoUpdate`. `detectMasterySignals` already
 *   filtered to untouched nodes (D-05), so auto can only ADD progress for nodes
 *   the player has not touched; it can never overwrite or downgrade a manual or
 *   quiz row (D-06 monotonic). This is the critical deviation from the
 *   quiz/manual write paths, which intentionally upsert.
 *
 * Failure safety (AUTO-05, criterion 4, T-07-07d):
 *   A non-ok fetch bucket (`unreachable`/`no-data`) returns `{ status,
 *   advanced: [] }` and issues ZERO writes — manual/quiz progress is untouched.
 *   A `rate-limited` result falls back to the cached row's signals when present
 *   (D-10b, not an error). Only opaque bucket statuses from the 07-06 classifier
 *   are returned — no upstream status codes or error strings are surfaced.
 *
 * Exported handlers follow the same testability pattern as
 * `recordQuizPassHandler` / `getUserProgressHandler`: named async functions
 * exported so tests can call them directly without the TanStack Start runtime.
 */

import { eq } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress, w3championsSync } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, type AuthedContext } from "#/lib/auth-middleware";
import { CURRENT_PATCH } from "#/lib/patches";
import { SYNC_TTL_MS } from "#/lib/w3champions-keys";
import { fetchW3championsSignals } from "#/lib/w3champions-client";
import {
  detectMasterySignals,
  type AutoDetectableNode,
  type W3cSignals,
} from "#/lib/detect-mastery-signals";
import { allNodes } from "content-collections";

// ---------------------------------------------------------------------------
// Result shape (opaque bucket status + advanced node ids — no upstream leakage)
// ---------------------------------------------------------------------------

/** Discriminated sync status surfaced to the UI (mirrors the 07-06 buckets). */
export type SyncStatus = "ok" | "cached" | "no-data" | "unreachable" | "rate-limited";

/** Result of a sync attempt: the bucket status + any newly auto-advanced ids. */
export interface SyncResult {
  status: SyncStatus;
  /** Node ids auto-advanced to in-progress by THIS sync (untouched-only, D-05). */
  advanced: string[];
}

// ---------------------------------------------------------------------------
// syncW3championsHandler — the orchestrating write path (AUTO-01..05)
// ---------------------------------------------------------------------------

/**
 * Sync the authenticated principal's w3champions ladder signals and additively
 * auto-advance any untouched MECHANIC nodes whose criterion the signals meet.
 *
 * Principal-keyed (ADR 007): id/battleTag/gateway come from `context.principal`
 * ONLY — there is no client-input channel for them.
 *
 * Exported as a named function for unit testability.
 */
export async function syncW3championsHandler({ context }: AuthedContext): Promise<SyncResult> {
  const { principal } = context;

  // 1. Load the durable TTL cache row for this principal (AUTO-04 / criterion 3).
  const cached = await db.query.w3championsSync.findFirst({
    where: eq(w3championsSync.userId, principal.id),
  });

  const withinTtl =
    cached != null && Date.now() - cached.lastSyncedAt.getTime() < SYNC_TTL_MS;

  // 2. Resolve the signals to detect against, plus the status to report.
  let signals: W3cSignals | undefined;
  let status: SyncStatus;

  if (withinTtl && cached != null) {
    // TTL hit: reuse the cached signals — DO NOT call fetch (single-fetch gate).
    signals = { mmrTier: cached.mmrTier, gamesPlayed: cached.gamesPlayed };
    status = "cached";
  } else {
    // TTL miss: one outbound fetch (no retry/backoff — the DB gate bounds volume).
    // battleTag/gateway are nullable on the inferred User type (input:false
    // additionalFields); coerce to "" so a missing value degrades gracefully to a
    // no-data/unreachable bucket rather than a type error (AUTO-05 failure-safe).
    const result = await fetchW3championsSignals(
      principal.battleTag ?? "",
      principal.gateway ?? "",
    );

    if (result.status === "ok" && result.signals) {
      signals = result.signals;
      status = "ok";
      // Refresh the durable cache row so the next sync within the window is gated.
      await db
        .insert(w3championsSync)
        .values({
          id: crypto.randomUUID(),
          userId: principal.id, // ADR 007: NEVER from data
          mmrTier: signals.mmrTier,
          gamesPlayed: signals.gamesPlayed,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: w3championsSync.userId,
          set: {
            mmrTier: signals.mmrTier,
            gamesPlayed: signals.gamesPlayed,
            lastSyncedAt: new Date(),
          },
        });
    } else if (result.status === "rate-limited" && cached != null) {
      // D-10b: serve the cached signals rather than erroring — not a failure.
      signals = { mmrTier: cached.mmrTier, gamesPlayed: cached.gamesPlayed };
      status = "rate-limited";
    } else {
      // AUTO-05 / criterion 4: unreachable / no-data / rate-limited-without-cache
      // advance nothing and touch no progress rows — manual/quiz untouched.
      return { status: result.status, advanced: [] };
    }
  }

  // 3. Detect untouched-only auto-advance candidates (D-05 via detectMasterySignals).
  const existing = await db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });
  const existingSet = new Set(existing.map((r) => r.nodeId));

  const mapped: AutoDetectableNode[] = (
    allNodes as unknown as AutoDetectableNode[]
  ).map((n) => ({ id: n.id, nodeType: n.nodeType, autoDetect: n.autoDetect }));

  const candidates = detectMasterySignals(mapped, signals, existingSet);

  // 4. Additive plain insert per candidate (D-04 ceiling + D-06 monotonic).
  //    detectMasterySignals guaranteed untouched-only, so there is no conflict;
  //    .onConflictDoNothing() is a defensive concurrency guard — NEVER DoUpdate.
  for (const { nodeId } of candidates) {
    await db
      .insert(nodeProgress)
      .values({
        id: crypto.randomUUID(),
        userId: principal.id, // ADR 007: NEVER from data
        nodeId,
        masteryState: "in-progress", // D-04 ceiling — auto NEVER sets "mastered"
        source: "auto", // ADR 009: server-stamped, NEVER from data/upstream
        patchId: CURRENT_PATCH.id, // server-stamped
      })
      .onConflictDoNothing();
  }

  return { status, advanced: candidates.map((c) => c.nodeId) };
}

/**
 * Sync the authenticated user's w3champions signals and auto-advance untouched
 * MECHANIC nodes. Takes no client input — all keying is principal-derived.
 */
export const syncW3champions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(syncW3championsHandler);

// ---------------------------------------------------------------------------
// getW3championsSyncStatusHandler — principal-keyed read for the sync UI
// ---------------------------------------------------------------------------

/**
 * Return the principal's w3championsSync cache row (or null if never synced).
 *
 * Principal-keyed (ADR 007): the WHERE clause uses `context.principal.id`
 * exclusively — there is no userId input channel. Drives the "Last synced Xm
 * ago" UI (07-08).
 *
 * Exported as a named function for unit testability.
 */
export async function getW3championsSyncStatusHandler({ context }: AuthedContext) {
  const { principal } = context;

  const row = await db.query.w3championsSync.findFirst({
    where: eq(w3championsSync.userId, principal.id),
  });

  return row ?? null;
}

/**
 * Fetch the authenticated user's last w3champions sync status.
 *
 * Returns the w3championsSync row keyed by `context.principal.id`, or null.
 * No userId parameter is accepted — see module JSDoc for the authorization
 * contract.
 */
export const getW3championsSyncStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(getW3championsSyncStatusHandler);
