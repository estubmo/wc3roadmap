// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * TanStack Query key factory for replay-analysis queries (REPLAY-05 auto-pull
 * plumbing, D-13).
 *
 * This module is intentionally client-safe: it contains only pure constants
 * and key-tuple factories — NO `fetch`, NO `db`, NO server-only imports.
 * Keeping it separate from `w3champions-client.ts` lets the UI hooks (08-12)
 * import `replayKeys` without pulling the server-only download/parse code
 * (and its Node `Buffer`/w3gjs surface) into the client bundle. Mirrors the
 * readonly-tuple shape of `src/lib/w3champions-keys.ts` and
 * `src/lib/progress-keys.ts`.
 *
 *   - `replayKeys.all()` — base key; invalidates ALL replay-related queries.
 *   - `replayKeys.byGameId(gameId)` — a single replay's analysis result.
 *   - `replayKeys.analysisStatus()` — auto-pull / analysis-in-progress status
 *     query used by the Replay Analysis surface UI (08-12/08-13).
 *
 * Usage:
 *   ```ts
 *   useQuery({ queryKey: replayKeys.byGameId(gameId), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: replayKeys.all() })
 *   ```
 */
export const replayKeys = {
  /** Base key — invalidates all replay-related queries. */
  all: () => ["replays"] as const,
  /** Per-gameId replay analysis result key. */
  byGameId: (gameId: string) => [...replayKeys.all(), "byGameId", gameId] as const,
  /** Auto-pull / analysis-in-progress status key. */
  analysisStatus: () => [...replayKeys.all(), "analysisStatus"] as const,
} as const;
