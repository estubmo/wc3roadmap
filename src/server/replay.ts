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
 * Recent-gameId resolution ([ASSUMED], pullReplaysHandler only): the
 * w3champions API exposes a global, unauthenticated "recent matches" feed
 * (`GET /api/matches?gameMode=1&offset&pageSize`, confirmed live during this
 * plan — the same endpoint 08-01's fixture-sourcing spike used) but no
 * verified player-scoped server-side filter parameter was found in this
 * session (unlike the RESEARCH-cited `/api/replays/{gameId}` download
 * endpoint). `resolveRecentGameIds` queries the general feed and filters
 * CLIENT-SIDE for matches containing the principal's own BattleTag (reusing
 * the same normalized-comparison discipline as the player-slot match below)
 * — correct regardless of whether the upstream endpoint's query params do
 * any server-side filtering, at the cost of only searching the most recent
 * page of the global feed. If this proves too shallow in practice, a future
 * plan should re-verify the upstream API for a proper player-scoped search
 * endpoint.
 *
 * Exported handlers follow the same testability pattern as
 * `syncW3championsHandler` / `recordQuizPassHandler`: named async functions
 * exported so tests can call them directly without the TanStack Start
 * runtime.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "#/lib/db";
import { nodeProgress, replayAnalysis } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, type AuthedContext } from "#/lib/auth-middleware";
import { CURRENT_PATCH } from "#/lib/patches";
// Types only — the w3gjs-backed `parseReplay`/`ReplayParseError` are loaded
// via a dynamic `import()` inside the handlers below (08-12 fix). A static
// value import here drags `w3gjs` (whose `class W3GReplay extends EventEmitter`
// crashes at eval in the browser) into the client bundle for this route,
// because TanStack Start retains the exported handler functions client-side.
// `replay-parser.ts` documents itself as server-only-never-bundled; the
// dynamic import is what actually enforces that.
import type { ParserOutput, Player } from "#/lib/replay-parser";
import { deriveReplaySignals, isSoloMatch, type ReplaySignals } from "#/lib/replay-signals";
import {
  detectReplaySignals,
  type ReplayNodeResult,
  type ReplayThresholdInput,
} from "#/lib/replay-thresholds";
import { W3C_BASE_URL, fetchReplayBytes } from "#/lib/w3champions-client";
import type { ReplayCriteria } from "#/schemas/node";
import { allNodes } from "content-collections";
import { z } from "zod";

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

/**
 * The JSON payload stored in `replayAnalysis.signals` (D-17 cache, Task 2).
 *
 * Extends the column's documented "JSON-stringified `ReplaySignals`" shape
 * (schema.ts, 08-06) with a sibling `isSolo` flag — WITHOUT a schema/column
 * change (out of this plan's file scope) — so the D-15 1v1 gate can be
 * enforced STRUCTURALLY on a cache HIT too (Pitfall 7: "must be enforced
 * structurally, not just at threshold-check time"), not just on the
 * fresh-parse path where `isSoloMatch(parsed)` is directly available. A
 * cache-hit has no raw `ParserOutput` to re-check `players.length` against
 * — this flag is the only way to avoid ever writing mastery from a cached
 * team/FFA replay's signals.
 */
interface CachedReplayPayload {
  signals: ReplaySignals;
  isSolo: boolean;
}

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

  // Server-only lazy load: keeps w3gjs out of the client bundle (08-12 fix).
  const { parseReplay, ReplayParseError } = await import("#/lib/replay-parser");

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

// ---------------------------------------------------------------------------
// pullReplaysHandler — auto-pull from w3champions (REPLAY-05, D-17 cache gate)
// ---------------------------------------------------------------------------

/** How many most-recent 1v1 matches to scan for the principal (see module doc). */
const RECENT_MATCHES_PAGE_SIZE = 25;

/** Minimal Zod shape read from the general `/api/matches` feed (see module doc, "Recent-gameId resolution"). */
const RecentMatchSchema = z.object({
  id: z.string(),
  teams: z.array(
    z.object({
      players: z.array(z.object({ battleTag: z.string() })),
    }),
  ),
});
const RecentMatchesResponseSchema = z.object({
  matches: z.array(RecentMatchSchema),
});

/**
 * Resolve candidate gameIds for the principal from the general w3champions
 * "recent matches" feed, filtered client-side by BattleTag (see module doc —
 * no verified player-scoped upstream filter was found this session). Never
 * accepts a gameId from client input (ADR 007) — `battleTag` is the only
 * input, always sourced from `context.principal`.
 */
async function resolveRecentGameIds(
  battleTag: string,
): Promise<{ status: ReplayStatus; gameIds: string[] }> {
  const target = normalizePlayerName(battleTag);

  try {
    const res = await fetch(
      `${W3C_BASE_URL}/api/matches?gameMode=1&offset=0&pageSize=${RECENT_MATCHES_PAGE_SIZE}`,
    );
    if (res.status === 429) return { status: "rate-limited", gameIds: [] };
    if (!res.ok) return { status: "no-data", gameIds: [] };

    const parsed = RecentMatchesResponseSchema.parse(await res.json());
    const gameIds = parsed.matches
      .filter((m) =>
        m.teams.some((t) => t.players.some((p) => normalizePlayerName(p.battleTag) === target)),
      )
      .map((m) => m.id);

    return { status: gameIds.length > 0 ? "ok" : "no-data", gameIds };
  } catch {
    // Network throw or hostile/malformed upstream JSON — never leak detail (T-07-06c precedent).
    return { status: "unreachable", gameIds: [] };
  }
}

/**
 * Auto-pull the principal's recent 1v1 replays from w3champions, applying
 * the D-17 gameId cache gate (a known gameId is NEVER re-parsed) and the
 * monotonic-max write for each solo match found.
 *
 * Exported as a named function for unit testability.
 */
export async function pullReplaysHandler({ context }: AuthedContext): Promise<ReplayReport> {
  const { principal } = context;

  const resolved = await resolveRecentGameIds(principal.battleTag ?? "");
  if (resolved.gameIds.length === 0) {
    // No candidates found at all — surface the resolver's own bucket
    // (rate-limited/unreachable/no-data), zero writes.
    return { status: resolved.status, signals: [], advanced: [] };
  }

  const signals: ReplaySignalItem[] = [];
  const advanced: string[] = [];
  let anyFresh = false;
  let anyCached = false;
  let lastFailureStatus: ReplayStatus | null = null;

  // Server-only lazy load: keeps w3gjs out of the client bundle (08-12 fix).
  const { parseReplay, ReplayParseError } = await import("#/lib/replay-parser");

  for (const gameId of resolved.gameIds) {
    // D-17 cache gate: a known gameId is NEVER re-parsed — reuse cached signals.
    const cached = await db.query.replayAnalysis.findFirst({
      where: eq(replayAnalysis.gameId, gameId),
    });

    if (cached) {
      anyCached = true;
      const payload = JSON.parse(cached.signals) as CachedReplayPayload;
      const nodeResults = detectReplaySignals(contentNodes(), payload.signals, cached.patchId);
      signals.push(...toSignalItems(nodeResults));
      // D-15 / Pitfall 7: structural gate on the cached flag — a cache hit
      // has no raw ParserOutput to re-derive player count from.
      if (payload.isSolo) {
        const raised = await writeMonotonicMax(nodeResults, principal, cached.patchId);
        advanced.push(...raised);
      }
      continue;
    }

    const download = await fetchReplayBytes(gameId);
    if (download.status !== "ok" || !download.bytes) {
      lastFailureStatus = download.status;
      continue;
    }

    let parsed: ParserOutput;
    try {
      parsed = await parseReplay(download.bytes);
    } catch (err) {
      if (err instanceof ReplayParseError) {
        lastFailureStatus = "parse-failed";
        continue;
      }
      throw err;
    }

    const player = findPrincipalPlayer(parsed.players, principal.battleTag ?? "");
    if (!player) {
      lastFailureStatus = "no-player-match";
      continue;
    }

    const patchId = CURRENT_PATCH.id; // D-12 — see module doc "Patch resolution"
    const derivedSignals = deriveReplaySignals(parsed, player);
    const solo = isSoloMatch(parsed); // Pitfall 7: derived BEFORE any threshold evaluation

    // Cache the signals (+ the D-15 isSolo flag, see CachedReplayPayload)
    // BEFORE writing mastery (D-17) — a raced concurrent pull for the same
    // gameId defensively no-ops on the cache row.
    await db
      .insert(replayAnalysis)
      .values({
        id: crypto.randomUUID(),
        gameId,
        signals: JSON.stringify({ signals: derivedSignals, isSolo: solo } satisfies CachedReplayPayload),
        patchId,
        buildNumber: parsed.buildNumber,
      })
      .onConflictDoNothing();

    anyFresh = true;
    const nodeResults = detectReplaySignals(contentNodes(), derivedSignals, patchId);
    signals.push(...toSignalItems(nodeResults));

    if (solo) {
      const raised = await writeMonotonicMax(nodeResults, principal, patchId);
      advanced.push(...raised);
    }
    // D-15: non-solo matches still report signals but never advance (no write call above).
  }

  if (anyFresh) return { status: "ok", signals, advanced };
  if (anyCached) return { status: "cached", signals, advanced };
  return { status: lastFailureStatus ?? "no-data", signals, advanced };
}

/**
 * Auto-pull the authenticated user's recent 1v1 replays from w3champions.
 *
 * Takes no client input — gameId candidates are resolved server-side from
 * `context.principal.battleTag` only (ADR 007).
 */
export const pullReplays = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(pullReplaysHandler);

// ---------------------------------------------------------------------------
// getReplayAnalysisHandler — principal-keyed read (REPLAY-07)
// ---------------------------------------------------------------------------

/**
 * One durable replay-mastery entry for the report surface / node detail
 * panel: which node, which signal, and its content-authored target.
 *
 * `actual` is always `null` here — the measured value from a specific parse
 * is only available at upload/pull time (returned directly in that
 * operation's `ReplayReport`, see 08-12's mutation-result rendering); this
 * durable read has no per-principal "last report" store to recover it from
 * after the fact (only the GLOBAL, gameId-keyed `replayAnalysis` cache
 * exists, D-17). Deliberate simplification — see SUMMARY "Known Stubs".
 */
export interface ReplayAnalysisEntry {
  nodeId: string;
  signal: ReplayCriteria["signal"];
  target: number;
  actual: number | null;
}

function targetOf(criteria: ReplayCriteria): number {
  return "beforeMs" in criteria ? criteria.beforeMs : criteria.gte;
}

/**
 * Return the principal's durable replay-mastery entries — every node whose
 * `nodeProgress.source === "replay"` — paired with its content-authored
 * target for the node detail panel / report surface (D-16).
 *
 * Principal-keyed (ADR 007): the WHERE clause uses `context.principal.id`
 * exclusively — there is no userId input channel.
 *
 * Exported as a named function for unit testability.
 */
export async function getReplayAnalysisHandler({
  context,
}: AuthedContext): Promise<ReplayAnalysisEntry[]> {
  const { principal } = context;

  const rows = await db.query.nodeProgress.findMany({
    where: eq(nodeProgress.userId, principal.id),
  });

  const nodesById = new Map(contentNodes().map((n) => [n.id, n]));

  const entries: ReplayAnalysisEntry[] = [];
  for (const row of rows) {
    if (row.source !== "replay") continue;
    const node = nodesById.get(row.nodeId);
    if (!node?.replayCriteria) continue;
    entries.push({
      nodeId: row.nodeId,
      signal: node.replayCriteria.signal,
      target: targetOf(node.replayCriteria),
      actual: null,
    });
  }

  return entries;
}

/**
 * Fetch the authenticated user's durable replay-mastery entries.
 *
 * Returns entries keyed by `context.principal.id` only — no userId
 * parameter is accepted. See module JSDoc for the authorization contract.
 */
export const getReplayAnalysis = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(getReplayAnalysisHandler);
