// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Quiz mastery write path deep module (QUIZ-02, D-12/D-13, ADR-007).
 *
 * Authorization contract (D-13, principal-keyed by construction):
 *   Neither `recordQuizPass` nor `recordQuizAttempt` accept `userId`, `source`,
 *   `masteryState`, or `patchId` from client input. Every DB write is keyed
 *   exclusively by `context.principal.id` — the UUID injected by authMiddleware
 *   from the server-side session.
 *   Cross-user access (IDOR) is structurally impossible (ADR-007).
 *
 * Server-stamped fields (D-12/D-13):
 *   `source` is hardcoded `"quiz"` in this module — the quiz pass path is the
 *   only writer allowed to set source:"quiz" on nodeProgress.
 *   `masteryState` is hardcoded `"mastered"` — a quiz pass always and only
 *   advances the player to mastered (D-12); a fail NEVER touches nodeProgress.
 *   `patchId` is stamped from `CURRENT_PATCH.id` — never read from client input.
 *
 * Two-table upsert contract (QUIZ-02):
 *   A quiz pass upserts BOTH nodeProgress (mastery record, displayed in graph)
 *   and quizProgress (SRS signals: passed, attemptCount, lapseCount, lastAttemptAt).
 *   A quiz fail upserts ONLY quizProgress — the nodeProgress mastery state is
 *   NOT downgraded (D-12: fail never changes mastery).
 *
 * lapseCount (D-08, Pitfall 6):
 *   lapseCount in quizProgress increments on a failed re-attempt AFTER a prior pass.
 *   This is the FSRS forward hook — cannot be reconstructed retroactively. The SQL
 *   CASE expression (`CASE WHEN passed THEN lapseCount + 1 ELSE lapseCount END`) is
 *   the correct implementation: it reads the existing row's `passed` value and
 *   increments lapseCount only when the player had previously passed.
 *
 * Deep-module discipline: authMiddleware + handler interface hides the two-table
 * upsert + patch-stamping + lapseCount logic. All quiz-mastery writes flow
 * through this single auditable seam (CLAUDE.md architecture § deep modules).
 *
 * Exported handlers follow the same testability pattern as `setNodeMasteryHandler`
 * in `src/server/progress.ts`: named functions exported so tests can call them
 * directly without the TanStack Start server runtime.
 */

import { sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress, quizProgress } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, type AuthedContext } from "#/lib/auth-middleware";
import { z } from "zod";
import { CURRENT_PATCH } from "#/lib/patches";

// ---------------------------------------------------------------------------
// Input schemas (exported for test-time type assertions and re-use)
// ---------------------------------------------------------------------------

/**
 * Validated input for recordQuizPass.
 *
 * CRITICAL: no `userId`, `source`, `masteryState`, or `patchId` field — those
 * are all server-stamped (D-12/D-13). The schema strips any extra fields
 * injected at the HTTP level via Zod's default object stripping behavior
 * (defense-in-depth, T-06-05-01 / T-06-05-02).
 */
export const RecordQuizPassInput = z.object({
  /** Content node identifier — must be non-empty. */
  nodeId: z.string().min(1),
});

/**
 * Validated input for recordQuizAttempt.
 *
 * The `passed` boolean drives whether the handler delegates to the pass path
 * (recordQuizPassHandler) or the fail path (quizProgress-only upsert).
 * CRITICAL: no `userId`, `source`, `masteryState`, or `patchId` fields.
 */
export const RecordQuizAttemptInput = z.object({
  /** Content node identifier — must be non-empty. */
  nodeId: z.string().min(1),
  /** Whether this attempt resulted in a pass (meets PASS_THRESHOLD). */
  passed: z.boolean(),
});

// ---------------------------------------------------------------------------
// recordQuizPassHandler — upsert nodeProgress + quizProgress on pass (QUIZ-02)
// ---------------------------------------------------------------------------

/**
 * Upserts nodeProgress (mastered + source:"quiz" + CURRENT_PATCH) and
 * quizProgress (passed=true, attemptCount+1, lastAttemptAt) for the
 * authenticated principal on a quiz pass.
 *
 * Server-stamped fields (never from client input):
 *   - `userId`: from `context.principal.id` (D-13)
 *   - `source`: hardcoded `"quiz"` (D-13)
 *   - `masteryState`: hardcoded `"mastered"` (D-12)
 *   - `patchId`: from `CURRENT_PATCH.id` (D-13)
 *
 * The Zod parse inside strips any extra fields injected at the HTTP level
 * (e.g. a forged `userId`, `source`, `masteryState`, or `patchId`). Only
 * `nodeId` is read from `data` (defense-in-depth, T-06-05-01/T-06-05-02).
 *
 * Exported as a named function for unit testability.
 */
export async function recordQuizPassHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof RecordQuizPassInput> }) {
  const { principal } = context;

  // Runtime parse strips any extra fields; validates nodeId is non-empty.
  // This is a defense-in-depth layer — the .validator() on the exported fn
  // already strips/validates at the TanStack Start layer.
  const { nodeId } = RecordQuizPassInput.parse(data);

  // 1. Upsert nodeProgress: mastered + source:"quiz" + CURRENT_PATCH (D-12/D-13)
  await db
    .insert(nodeProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id,       // D-13: NEVER from data
      nodeId,
      masteryState: "mastered",   // D-12: quiz pass always and only sets mastered
      source: "quiz",             // D-13: NEVER from data (hardcoded quiz source)
      patchId: CURRENT_PATCH.id,  // D-13: NEVER from data
    })
    .onConflictDoUpdate({
      target: [nodeProgress.userId, nodeProgress.nodeId],
      set: {
        masteryState: sql`'mastered'`,
        source: sql`'quiz'`,
        patchId: sql`excluded.patch_id`,
        updatedAt: sql`now()`,
      },
    });

  // 2. Upsert quizProgress: track pass + SRS seed fields (D-07/D-08)
  await db
    .insert(quizProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id,       // D-13: NEVER from data
      nodeId,
      passed: true,
      lastAttemptAt: new Date(),
      attemptCount: 1,
      lapseCount: 0,
    })
    .onConflictDoUpdate({
      target: [quizProgress.userId, quizProgress.nodeId],
      set: {
        passed: sql`true`,
        lastAttemptAt: sql`now()`,
        attemptCount: sql`${quizProgress.attemptCount} + 1`,
        updatedAt: sql`now()`,
        // lapseCount is NOT reset on a pass — only incremented on fail-after-pass (D-08)
      },
    });

  return { ok: true };
}

/**
 * Record a quiz pass for the authenticated user.
 *
 * Accepts `{ nodeId }` — no userId, source, masteryState, or patchId.
 * All those are stamped server-side (D-12/D-13).
 * Upserts both nodeProgress (mastered) and quizProgress (passed=true).
 */
export const recordQuizPass = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(RecordQuizPassInput)
  .handler(recordQuizPassHandler);

// ---------------------------------------------------------------------------
// recordQuizAttemptHandler — handle pass AND fail paths (D-08, Pitfall 6)
// ---------------------------------------------------------------------------

/**
 * Handles both quiz pass and fail outcomes.
 *
 * On pass (passed=true): delegates to recordQuizPassHandler which upserts
 * BOTH nodeProgress (mastered) and quizProgress (passed=true, attemptCount+1).
 *
 * On fail (passed=false): upserts ONLY quizProgress — nodeProgress is NEVER
 * touched (D-12: a fail never changes mastery state).
 *
 * lapseCount (D-08, Pitfall 6):
 *   On fail, lapseCount is incremented ONLY when the existing quizProgress row
 *   has `passed = true` (i.e. the player had previously passed this quiz). The
 *   SQL CASE expression reads the existing row's value:
 *     CASE WHEN quiz_progress.passed THEN lapse_count + 1 ELSE lapse_count END
 *   This correctly tracks re-attempt failures after a first pass without
 *   counting failures before the first pass as lapses.
 *
 * Exported as a named function for unit testability.
 */
export async function recordQuizAttemptHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof RecordQuizAttemptInput> }) {
  const { principal } = context;

  const { nodeId, passed } = RecordQuizAttemptInput.parse(data);

  // Delegate to the pass handler when the attempt was a pass
  if (passed) {
    return recordQuizPassHandler({ context, data: { nodeId } });
  }

  // Fail path: upsert quizProgress only — nodeProgress is NEVER touched (D-12)
  await db
    .insert(quizProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id,       // D-13: NEVER from data
      nodeId,
      passed: false,
      lastAttemptAt: new Date(),
      attemptCount: 1,
      lapseCount: 0,
    })
    .onConflictDoUpdate({
      target: [quizProgress.userId, quizProgress.nodeId],
      set: {
        passed: sql`false`,
        lastAttemptAt: sql`now()`,
        attemptCount: sql`${quizProgress.attemptCount} + 1`,
        // D-08 / Pitfall 6: increment lapseCount ONLY when prior row had passed=true.
        // A fail before the first pass is not a lapse — the player never mastered it.
        lapseCount: sql`${quizProgress.lapseCount} + (CASE WHEN ${quizProgress.passed} THEN 1 ELSE 0 END)`,
        updatedAt: sql`now()`,
      },
    });

  return { ok: true };
}

/**
 * Record a quiz attempt (pass or fail) for the authenticated user.
 *
 * Accepts `{ nodeId, passed }` — no userId, source, masteryState, or patchId.
 * On pass: upserts both nodeProgress (mastered) and quizProgress.
 * On fail: upserts quizProgress only (D-12: fail never changes mastery).
 * lapseCount increments on fail only when prior state was passed (D-08).
 */
export const recordQuizAttempt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(RecordQuizAttemptInput)
  .handler(recordQuizAttemptHandler);
