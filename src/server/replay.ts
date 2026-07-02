// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Replay convergence server module — the orchestrating deep module where
 * REPLAY-04/05/06/07 converge (ADR 007/009, ADR 011, D-03/D-04/D-15).
 *
 * This is Phase 8's analog of `w3champions.ts`: `uploadReplay` (this task)
 * and `pullReplays` (08-11 Task 2) wrap the pure `deriveReplaySignals`
 * (replay-signals.ts) + `detectReplaySignals` (replay-thresholds.ts)
 * functions with the four responsibilities those pure layers deliberately
 * do NOT own — authorization, the `.w3g` parse (replay-parser.ts), the
 * gameId cache gate (D-17, Task 2), and the mastery write — behind a single
 * `.middleware([authMiddleware]).handler(...)` seam that mirrors
 * `w3champions.ts` / `quiz.ts` exactly.
 *
 * Authorization contract (ADR 007, principal-keyed by construction):
 *   Every handler reads userId/battleTag ONLY from `context.principal`.
 *   `writeMonotonicMax` always writes `userId: principal.id` — never from
 *   client input. Cross-user access (IDOR) is structurally impossible.
 *
 * Server-stamped write (ADR 009, D-03/D-04):
 *   Every replay nodeProgress write hardcodes `source: "replay"` and stamps
 *   `patchId`/`userId` server-side — none of these are ever read from the
 *   uploaded `.w3g` bytes.
 *
 * Monotonic-max write (D-03/D-04, the ONE new write semantic this phase
 * introduces — see `writeMonotonicMax` below): unlike quiz's unconditional
 * latest-write-wins upsert and auto's plain additive insert, replay's write
 * only ever RAISES `masteryState` (untouched -> in-progress -> mastered) and
 * only re-stamps `source: "replay"` when it actually raises the state. The
 * guard is an atomic SQL `setWhere` ordinal comparison — not a
 * check-then-write race in application code.
 *
 * 1v1 gate (D-15, Pitfall 7): team/FFA replays still parse and return
 * signals as feedback, but `writeMonotonicMax` is only invoked when
 * `isSoloMatch(parsed)` is true. Enforced structurally, never left to the
 * pure threshold layer alone.
 *
 * Patch resolution (D-12): this module resolves every write's `patchId` as
 * `CURRENT_PATCH.id` — the raw WC3 `buildNumber` reported by the replay
 * header is stored alongside it (in `replayAnalysis.buildNumber`, Task 2) as
 * the immutable source fact, but no buildNumber -> patch-boundary mapping
 * table exists yet in `patches.ts` (only the `objectIdMapVersion` hook is
 * wired, consumed by the pure `replay-thresholds.ts` layer). Storing both
 * fields (per D-12) means a future, more precise buildNumber -> patch
 * resolution can be added without re-parsing any cached replay.
 *
 * Exported handlers follow the same testability pattern as
 * `syncW3championsHandler` / `recordQuizPassHandler`: named async functions
 * exported so tests can call them directly without the TanStack Start
 * runtime.
 */

import { sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, type AuthedContext } from "#/lib/auth-middleware";
import { CURRENT_PATCH } from "#/lib/patches";
import {
  parseReplay,
  ReplayParseError,
  type ParserOutput,
  type Player,
} from "#/lib/replay-parser";
import { deriveReplaySignals, isSoloMatch, type ReplaySignals } from "#/lib/replay-signals";
import {
  detectReplaySignals,
  type ReplayNodeResult,
  type ReplayThresholdInput,
} from "#/lib/replay-thresholds";
import type { ReplayCriteria } from "#/schemas/node";
import { allNodes } from "content-collections";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Server-side defensive backstop for the ADR 011 §3 4 MB client-side upload
 * cap. The client-side check (08-12) is a UX guard, not a security boundary
 * — this module never trusts it alone (ADR 011 Consequences, Rule 2). An
 * oversized upload is rejected BEFORE `parseReplay` is invoked.
 */
const MAX_REPLAY_BYTES = 4 * 1024 * 1024;

/** The FormData field name `uploadReplay` reads the `.w3g` file from. */
const UPLOAD_FIELD_NAME = "file";

// ---------------------------------------------------------------------------
// Result shape (opaque bucket status + per-signal report — no upstream leakage)
// ---------------------------------------------------------------------------

/**
 * Discriminated replay-analysis status surfaced to the UI. Mirrors the
 * `SyncStatus`/`W3cSyncStatus` opaque-bucket convention (T-07-06c precedent,
 * now T-08-11e): only these fixed strings ever leave this module — no
 * upstream/internal parser or fetch error strings.
 */
export type ReplayStatus =
  | "ok"
  | "cached"
  | "no-data"
  | "unreachable"
  | "rate-limited"
  | "parse-failed"
  | "no-player-match";

/** One reported signal: the node it maps to, the actual/target pairing, and which signal it was (REPLAY-07/D-16). */
export interface ReplaySignalItem {
  nodeId: string;
  actual: number | null;
  target: number;
  signal: ReplayCriteria["signal"];
}

/** Result of an upload/pull attempt: the bucket status + the actionable report (D-16). */
export interface ReplayReport {
  status: ReplayStatus;
  /** Per-node actual-vs-target feedback (D-16) — populated even when nothing advanced. */
  signals: ReplaySignalItem[];
  /** Node ids actually raised to a higher masteryState by THIS analysis (D-03/D-04). */
  advanced: string[];
}

/** The minimal node shape this module needs from content-collections — a structural subset of NodeFrontmatter. */
type ReplayContentNode = ReplayThresholdInput;

// ---------------------------------------------------------------------------
// writeMonotonicMax — D-03/D-04 monotonic-max upsert (the phase's ONE new write semantic)
// ---------------------------------------------------------------------------

/**
 * Write a batch of replay-derived mastery results with the monotonic-max
 * upsert (D-03/D-04, RESEARCH.md Pattern 2): `masteryState` only ever RISES,
 * and `source`/`patchId` are re-stamped only when the write actually raises
 * the state.
 *
 * The atomic guard: `onConflictDoUpdate`'s `setWhere` compares an ordinal
 * CASE expression on `excluded.mastery_state` (the incoming value) against
 * the same CASE expression on the existing row's `mastery_state` — the
 * update (including the source stamp) fires ONLY when the incoming state
 * ranks strictly higher. This is an atomic SQL-level guard, not a
 * check-then-write race: two concurrent writes for the same node can never
 * both "win" a downgrade.
 *
 * DRIFT GUARD (Pitfall 5): the ordinal literals below (`mastered`=2,
 * `in-progress`=1, else 0) MUST stay in the exact same order as
 * `MasteryStateSchema.options` (src/schemas/progress.ts) / the
 * `_MASTERY_STATES` registry (src/lib/mastery-ordinal.ts) — Postgres cannot
 * import a TypeScript enum, so this SQL fragment is a parallel constant that
 * has to be kept in sync by hand. A future reordering of `MasteryStateSchema`
 * must update this literal CASE too.
 *
 * Returns the node ids that were ACTUALLY raised by this call (i.e. rows
 * where the atomic guard fired), determined via `.returning()` — Postgres's
 * `ON CONFLICT DO UPDATE ... WHERE` only returns a row when the WHERE
 * predicate was true (a row that failed the predicate is treated as if
 * `DO NOTHING` had been specified and is NOT returned), so this is an
 * accurate, race-safe signal — never a JS-level pre-check.
 */
export async function writeMonotonicMax(
  results: ReplayNodeResult[],
  principal: { id: string },
  patchId: string,
): Promise<string[]> {
  const advanced: string[] = [];

  for (const result of results) {
    const written = await db
      .insert(nodeProgress)
      .values({
        id: crypto.randomUUID(),
        userId: principal.id, // ADR 007: NEVER from data
        nodeId: result.nodeId,
        masteryState: result.targetState, // D-02: the pure threshold detector's output — always "mastered"
        source: "replay", // ADR 009: server-stamped, NEVER from data/upstream
        patchId, // server-resolved (D-12) — see module doc
      })
      .onConflictDoUpdate({
        target: [nodeProgress.userId, nodeProgress.nodeId],
        set: {
          masteryState: sql`excluded.mastery_state`,
          source: sql`excluded.source`,
          patchId: sql`excluded.patch_id`,
          updatedAt: sql`now()`,
        },
        // D-03/D-04 (RESEARCH.md Pattern 2): only fires when the incoming
        // state ranks strictly higher than the existing one — see the
        // DRIFT GUARD doc-comment above.
        setWhere: sql`(CASE excluded.mastery_state
                          WHEN 'mastered' THEN 2 WHEN 'in-progress' THEN 1 ELSE 0 END)
                       > (CASE ${nodeProgress.masteryState}
                          WHEN 'mastered' THEN 2 WHEN 'in-progress' THEN 1 ELSE 0 END)`,
      })
      .returning({ nodeId: nodeProgress.nodeId });

    if (written.length > 0) advanced.push(result.nodeId);
  }

  return advanced;
}

// ---------------------------------------------------------------------------
// Player-slot matching (D-14, Pitfall 6)
// ---------------------------------------------------------------------------

/**
 * Normalize a BattleTag / in-replay player name for case-insensitive,
 * clan-tag-tolerant comparison (Pitfall 6, D-14). Strips a leading
 * `[TAG]`/`<TAG>`/`(TAG)` bracketed prefix or a bare `TAG)` prefix (a common
 * WC3 clan-tag convention), then lowercases the remainder. `[ASSUMED]`
 * (A4, RESEARCH.md): if WC3 names always match BattleTags exactly, this
 * normalization is harmless extra robustness; if not, it reduces (but does
 * not eliminate) how often a player falls through to the manual-pick
 * fallback the UI (08-12) must still offer for a `no-player-match` result.
 */
export function normalizePlayerName(name: string): string {
  return name
    .replace(/^\[[^\]]*\]\s*/, "")
    .replace(/^<[^>]*>\s*/, "")
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/^[^\s)]+\)\s*/, "")
    .trim()
    .toLowerCase();
}

/**
 * Find the replay `Player` slot matching the principal's BattleTag
 * (normalized comparison). Returns `null` when no player matches — the
 * caller must surface `no-player-match` (D-14) rather than guessing.
 */
export function findPrincipalPlayer(
  players: readonly Player[],
  battleTag: string,
): Player | null {
  const target = normalizePlayerName(battleTag);
  return players.find((p) => normalizePlayerName(p.name) === target) ?? null;
}

// ---------------------------------------------------------------------------
// Shared analysis pipeline — parsed replay -> signals -> threshold results
// ---------------------------------------------------------------------------

/** The content nodes this module evaluates replay criteria against, cast from content-collections. */
function contentNodes(): ReplayContentNode[] {
  return allNodes as unknown as ReplayContentNode[];
}

/** Map pure ReplayNodeResult entries (replay-thresholds.ts) to the public report shape (D-16). */
function toSignalItems(results: ReplayNodeResult[]): ReplaySignalItem[] {
  return results.map((r) => ({
    nodeId: r.nodeId,
    actual: r.actual,
    target: r.target,
    signal: r.signal,
  }));
}

/**
 * Run the pure signal-derivation + threshold-detection pipeline for one
 * parsed replay + matched player, then apply the D-15 1v1 gate: writes only
 * happen for a solo (1v1) match — team/FFA replays still return `signals`
 * for feedback but `advanced` is always empty (D-15).
 */
async function analyzeAndWrite(
  parsed: Pick<ParserOutput, "duration" | "players">,
  player: Player,
  principal: { id: string },
  patchId: string,
): Promise<{ signals: ReplaySignalItem[]; advanced: string[] }> {
  const signals: ReplaySignals = deriveReplaySignals(parsed, player);
  const nodeResults = detectReplaySignals(contentNodes(), signals, patchId);

  if (!isSoloMatch(parsed)) {
    // D-15 / Pitfall 7: team/FFA replays parse and report signals, but never
    // advance mastery. writeMonotonicMax is deliberately NOT called here.
    return { signals: toSignalItems(nodeResults), advanced: [] };
  }

  const advanced = await writeMonotonicMax(nodeResults, principal, patchId);
  return { signals: toSignalItems(nodeResults), advanced };
}

// ---------------------------------------------------------------------------
// uploadReplayHandler — manual .w3g upload (REPLAY-04)
// ---------------------------------------------------------------------------

/**
 * Parse an uploaded `.w3g` file, match the principal's slot by BattleTag,
 * derive signals, and (for 1v1 matches) apply the monotonic-max write.
 *
 * Reads the file from FormData field `"file"` (`UPLOAD_FIELD_NAME`) — the
 * only field this handler reads; every other write field
 * (`source`/`patchId`/`userId`) is server-stamped (T-08-11b).
 *
 * Exported as a named function for unit testability.
 */
export async function uploadReplayHandler({
  context,
  data,
}: AuthedContext & { data: FormData }): Promise<ReplayReport> {
  const { principal } = context;

  const file = data.get(UPLOAD_FIELD_NAME);
  if (!(file instanceof Blob)) {
    return { status: "parse-failed", signals: [], advanced: [] };
  }

  // T-08-11d: server-side defensive size backstop (ADR 011 §3) — the
  // client-side cap (08-12) is a UX guard only, never trusted alone.
  if (file.size > MAX_REPLAY_BYTES) {
    return { status: "parse-failed", signals: [], advanced: [] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed: ParserOutput;
  try {
    parsed = await parseReplay(buffer);
  } catch (err) {
    if (err instanceof ReplayParseError) {
      return { status: "parse-failed", signals: [], advanced: [] };
    }
    throw err;
  }

  const player = findPrincipalPlayer(parsed.players, principal.battleTag ?? "");
  if (!player) {
    // D-14: no automatic match — the UI (08-12) offers a manual player pick.
    return { status: "no-player-match", signals: [], advanced: [] };
  }

  const patchId = CURRENT_PATCH.id; // D-12 — see module doc "Patch resolution"
  const { signals, advanced } = await analyzeAndWrite(parsed, player, principal, patchId);

  return { status: "ok", signals, advanced };
}

/**
 * Parse a manually-uploaded `.w3g` replay for the authenticated user.
 *
 * Accepts a raw `FormData` (validated as a pass-through — the only trusted
 * field is the file itself; every DB-write field is server-stamped).
 */
export const uploadReplay = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: FormData) => data)
  .handler(uploadReplayHandler);
