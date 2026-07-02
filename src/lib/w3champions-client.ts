// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * w3champions HTTP client — the phase's only outbound integration (AUTO-01/02).
 *
 * A thin, native-`fetch` wrapper (no new npm packages, no retry/backoff, no
 * client-side rate limiter — the DB TTL gate in 07-07 already bounds call
 * volume) that:
 *   1. resolves the current season (`GET /api/ladder/seasons`, first/descending),
 *   2. reads career games volume (`GET /api/players/{tag}` -> sum winLosses.games),
 *   3. reads current-season MMR (`GET /api/players/{tag}/game-mode-stats`), and
 *   4. classifies every outcome into the four D-10 buckets via the pure
 *      `classifyW3championsResponse` function (mock-`fetch`-testable in isolation).
 *
 * DEEP MODULE: the server fn (07-07) consumes a clean tagged result
 * (`{ status, signals? }`) and never re-parses HTTP status codes or upstream
 * JSON. The status->bucket mapping lives here, once.
 *
 * THREAT MODEL (07-06):
 *   - T-07-06a SSRF: `W3C_BASE_URL` is a hardcoded constant, never
 *     client-configurable; the only interpolated value is the server-read
 *     BattleTag, always `encodeURIComponent`-ed before URL construction.
 *   - T-07-06b hostile upstream JSON: every parsed body is Zod-validated before
 *     any field is read (ASVS V5).
 *   - T-07-06c info disclosure: the classifier returns only opaque bucket tags
 *     (ok/no-data/unreachable/rate-limited) — no status codes or upstream error
 *     strings ever leave this module.
 *
 * Server-only (uses `fetch` against an external host). The client hook (07-08)
 * imports `SYNC_TTL_MS` from `w3champions-keys.ts` instead, never this file.
 */

import { z } from "zod";
import { tierForMmr } from "./mmr-tiers";
import type { W3cSignals } from "./detect-mastery-signals";

/**
 * Fixed w3champions backend host. HARDCODED — never sourced from user input,
 * env, or request data (SSRF guard, T-07-06a). The only interpolated URL
 * segment anywhere below is an `encodeURIComponent`-ed BattleTag.
 */
export const W3C_BASE_URL = "https://website-backend.w3champions.com";

/** Discriminated status buckets surfaced to the UI (D-10). */
export type W3cSyncStatus = "ok" | "no-data" | "unreachable" | "rate-limited";

/** Tagged result: `signals` present only when `status === "ok"`. */
export interface W3cSyncResult {
  status: W3cSyncStatus;
  signals?: W3cSignals;
}

// ---------------------------------------------------------------------------
// Upstream response schemas (Zod-validated before any field is read — ASVS V5)
// ---------------------------------------------------------------------------

/** `GET /api/ladder/seasons` -> `[{ id }, ...]` descending; first = current. */
const SeasonsSchema = z.array(z.object({ id: z.number() })).min(1);

/** `GET /api/players/{tag}` -> career games via `winLosses[].games`. */
const PlayerStatsSchema = z.object({
  winLosses: z
    .array(z.object({ games: z.number() }))
    .default([]),
});

/** `GET /.../game-mode-stats` -> per-race/mode rows; `mmr` + `rankingPoints`. */
const GameModeStatsSchema = z.array(
  z.object({
    mmr: z.number(),
    rankingPoints: z.number(),
  }),
);

type PlayerStats = z.infer<typeof PlayerStatsSchema>;
type GameModeStats = z.infer<typeof GameModeStatsSchema>;

// ---------------------------------------------------------------------------
// Gateway mapping (Pitfall 4)
// ---------------------------------------------------------------------------

/**
 * Map the project's `users.gateway` ("us" | "eu" | "kr") onto the w3champions
 * `GateWay` string param. The w3champions enum has only `America` (10) and
 * `Europe` (20) — there is NO Korea/Asia gateway.
 *
 * `[ASSUMED]` (Pitfall 4): `kr` -> `America`. WC3's Asian competitive
 * playerbase has historically clustered on the America gateway for
 * latency/population reasons. If wrong, the failure mode is graceful — the
 * lookup returns an empty/unranked result that degrades into the D-10c
 * "no ladder data" bucket rather than crashing or showing a wrong tier. Change
 * this one line if evidence later contradicts the assumption.
 */
function mapGateway(gateway: string): "America" | "Europe" {
  return gateway === "eu" ? "Europe" : "America";
}

// ---------------------------------------------------------------------------
// Pure classifier (D-10 buckets) — the mock-fetch-testable core
// ---------------------------------------------------------------------------

/** Input to the pure classifier: either a network failure or an HTTP outcome. */
export type ClassifyInput =
  | { kind: "network-error" }
  | {
      kind: "http";
      status: number;
      player?: PlayerStats;
      gameModeStats?: GameModeStats;
    };

/**
 * Map a fetch outcome to a D-10 bucket. Pure — no I/O, fully unit-testable.
 *
 *   - network throw / timeout                -> "unreachable"  (D-10a)
 *   - 429                                    -> "rate-limited" (D-10b)
 *   - 404 (never-onboarded BattleTag)        -> "no-data"      (D-10c, Pitfall 2)
 *   - other non-2xx (e.g. 500)               -> "unreachable"  (server problem)
 *   - 200 with any usable signal             -> "ok"
 *   - 200 with empty stats AND zero games    -> "no-data"      (D-10c, Pitfall 1)
 *
 * On "ok" the returned `signals.mmrTier` is derived from the raw `mmr` integer
 * of the highest-`rankingPoints` entry via `tierForMmr` — NEVER from the
 * upstream `leagueId`/League name (season-fragile, Pitfall 5). `mmrTier` is
 * `null` when there are no ranked stats this season (D-10c).
 */
export function classifyW3championsResponse(input: ClassifyInput): W3cSyncResult {
  if (input.kind === "network-error") return { status: "unreachable" };

  if (input.status === 429) return { status: "rate-limited" };
  if (input.status === 404) return { status: "no-data" };
  if (input.status < 200 || input.status >= 300) return { status: "unreachable" };

  // 2xx — derive coarse signals.
  const gamesPlayed = (input.player?.winLosses ?? []).reduce(
    (sum, wl) => sum + wl.games,
    0,
  );

  const stats = input.gameModeStats ?? [];
  const mmrTier = stats.length
    ? tierForMmr(
        stats.reduce((best, s) => (s.rankingPoints > best.rankingPoints ? s : best))
          .mmr,
      )
    : null;

  // No ranked stats AND no career games -> the "new player, no ladder data
  // yet" case (Pitfall 1). Otherwise there is a usable signal (a tier and/or a
  // games-played volume) -> ok.
  if (stats.length === 0 && gamesPlayed === 0) return { status: "no-data" };

  return { status: "ok", signals: { mmrTier, gamesPlayed } };
}

// ---------------------------------------------------------------------------
// Orchestration — native fetch, no retry/backoff, single try/catch -> D-10a
// ---------------------------------------------------------------------------

/**
 * Fetch coarse w3champions signals for a BattleTag + gateway and classify the
 * outcome into a D-10 bucket. Any thrown/timed-out fetch collapses to
 * "unreachable"; there is deliberately NO retry/backoff loop (the DB TTL gate
 * in 07-07 bounds call volume, and a failure degrades to D-10 messaging).
 */
export async function fetchW3championsSignals(
  battleTag: string,
  gateway: string,
): Promise<W3cSyncResult> {
  const enc = encodeURIComponent(battleTag);
  const mappedGateway = mapGateway(gateway);

  try {
    // 1. Resolve the current season (first element of the descending list).
    const seasonsRes = await fetch(`${W3C_BASE_URL}/api/ladder/seasons`);
    const seasonsShortCircuit = statusShortCircuit(seasonsRes.status);
    if (seasonsShortCircuit) return seasonsShortCircuit;
    const seasons = SeasonsSchema.parse(await seasonsRes.json());
    const season = seasons[0].id;

    // 2. Career games volume.
    const playerRes = await fetch(`${W3C_BASE_URL}/api/players/${enc}`);
    const playerShortCircuit = statusShortCircuit(playerRes.status);
    if (playerShortCircuit) return playerShortCircuit;
    const player = PlayerStatsSchema.parse(await playerRes.json());

    // 3. Current-season MMR per race/game-mode.
    const gmsRes = await fetch(
      `${W3C_BASE_URL}/api/players/${enc}/game-mode-stats?gateWay=${mappedGateway}&season=${season}`,
    );
    const gmsShortCircuit = statusShortCircuit(gmsRes.status);
    if (gmsShortCircuit) return gmsShortCircuit;
    const gameModeStats = GameModeStatsSchema.parse(await gmsRes.json());

    return classifyW3championsResponse({
      kind: "http",
      status: 200,
      player,
      gameModeStats,
    });
  } catch {
    // Network throw, timeout, or malformed/hostile upstream JSON (Zod parse
    // failure) — surface as unreachable rather than leaking upstream detail
    // (T-07-06b/c). Manual tracking (AUTO-05) is unaffected.
    return { status: "unreachable" };
  }
}

/**
 * Return a terminal classification for a non-2xx status (429/404/other), or
 * `undefined` to signal "keep going" for a 2xx. Keeps the orchestration flow
 * flat — each fetch short-circuits on its own error status before the body is
 * parsed.
 */
function statusShortCircuit(status: number): W3cSyncResult | undefined {
  if (status >= 200 && status < 300) return undefined;
  return classifyW3championsResponse({ kind: "http", status });
}

// ---------------------------------------------------------------------------
// Replay auto-pull download primitive (REPLAY-05, T-08-08a/b)
// ---------------------------------------------------------------------------

/** Discriminated status buckets for a replay-bytes download attempt. */
export type ReplayDownloadStatus = "ok" | "rate-limited" | "no-data" | "unreachable";

/** Tagged result: `bytes` present only when `status === "ok"`. */
export interface ReplayDownloadResult {
  status: ReplayDownloadStatus;
  bytes?: Buffer;
}

/**
 * Download the raw `.w3g` bytes for a w3champions `gameId` via the public,
 * unauthenticated `GET /api/replays/{gameId}` endpoint (Spike 2 — no bearer
 * token required for the base download).
 *
 * PITFALL 8 (watch item, not solved here): the w3champions replay-download
 * endpoint rate-limits per caller (IP or API token), not per end-user — at
 * v1-scale traffic this project's serverless egress shares one budget across
 * all users. Accepted per T-08-08c; an API-token partition is the future
 * mitigation if traffic grows.
 *
 * Reuses the exact SSRF guard from `fetchW3championsSignals` (T-07-06a
 * precedent, now T-08-08a): the URL is built ONLY from the hardcoded
 * `W3C_BASE_URL` host plus an `encodeURIComponent`-ed `gameId` — never any
 * other field. Never forwards upstream status codes or bodies (T-07-06c /
 * T-08-08b) — every outcome collapses to an opaque bucket.
 */
export async function fetchReplayBytes(gameId: string): Promise<ReplayDownloadResult> {
  try {
    const res = await fetch(
      `${W3C_BASE_URL}/api/replays/${encodeURIComponent(gameId)}`,
    );
    if (res.status === 429) return { status: "rate-limited" };
    if (!res.ok) return { status: "no-data" };
    return { status: "ok", bytes: Buffer.from(await res.arrayBuffer()) };
  } catch {
    // Network throw / timeout — never leak the underlying error (T-08-08b).
    return { status: "unreachable" };
  }
}
