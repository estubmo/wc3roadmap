// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * TanStack Query key factory for w3champions sync queries (AUTO-01/AUTO-04) and
 * the single shared sync-freshness TTL constant.
 *
 * This module is intentionally client-safe: it contains only pure constants and
 * key-tuple factories — NO `fetch`, NO `db`, NO server-only imports. Keeping it
 * separate from `w3champions-client.ts` lets a client hook (07-08) import
 * `SYNC_TTL_MS` for its TanStack `staleTime` mirror without pulling the outbound
 * fetch client (and its Zod/upstream-parsing code) into the client bundle.
 *
 * Mirrors the readonly-tuple shape of `src/lib/progress-keys.ts`:
 *
 *   - `w3championsKeys.all()` — base key; invalidates ALL w3champions queries.
 *   - `w3championsKeys.syncStatus()` — the "last synced Xm ago" / sync-status
 *     query used by the sync UI (07-08); also an `invalidateQueries` target in
 *     the sync mutation's `onSettled` (alongside `progressKeys.byUser()`).
 *
 * Usage:
 *   ```ts
 *   useQuery({ queryKey: w3championsKeys.syncStatus(), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: w3championsKeys.all() })
 *   ```
 */
export const w3championsKeys = {
  /** Base key — invalidates all w3champions-related queries. */
  all: () => ["w3champions"] as const,
  /**
   * Sync-status key — drives the "last synced Xm ago" UI and is invalidated
   * after a sync completes.
   */
  syncStatus: () => [...w3championsKeys.all(), "syncStatus"] as const,
} as const;

/**
 * Shared sync-freshness TTL: 15 minutes, in milliseconds.
 *
 * This is the SINGLE source of truth for BOTH:
 *   1. the durable DB-side TTL gate in the sync server fn (07-07), which bounds
 *      outbound w3champions calls to at most once per TTL per user, AND
 *   2. the TanStack `staleTime` mirror in the client sync hook (07-08).
 *
 * Naming it once here (not two independent literals) is what makes AUTO-04
 * criterion 3 hold consistently across tabs and devices — the DB gate and the
 * client cache agree on the same freshness window.
 *
 * `[ASSUMED]` (RESEARCH A2): no authoritative w3champions rate limit exists for
 * the player-stat endpoints this phase uses — only the replay-download
 * endpoints are code-rate-limited (`ReplayRateLimitAttribute`). 15 minutes is a
 * deliberately conservative default: long enough to make accidental
 * spam-clicking irrelevant, short enough to stay useful within an active
 * laddering session. Recalibrate here in one place if real limits surface.
 */
export const SYNC_TTL_MS = 15 * 60 * 1000;
