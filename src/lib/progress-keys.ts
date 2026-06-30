// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * TanStack Query key factory for progress queries (PROG-01, PROG-03).
 *
 * Typed, readonly key tuples enable selective cache invalidation without
 * string-literal drift:
 *
 *   - `progressKeys.all()` — base key; invalidates ALL progress queries at once.
 *   - `progressKeys.byUser()` — per-authenticated-user progress record list;
 *     used as `queryKey` in the `useQuery` call (05-07 ProgressProvider) and
 *     as the `invalidateQueries` target in `useProgressMutation.onSettled` (05-06).
 *
 * Usage:
 *   ```ts
 *   // In useQuery (05-07):
 *   useQuery({ queryKey: progressKeys.byUser(), queryFn: getUserProgress })
 *
 *   // In useMutation onSettled (05-06):
 *   queryClient.invalidateQueries({ queryKey: progressKeys.byUser() })
 *   ```
 */
export const progressKeys = {
  /** Base key — invalidates all progress-related queries. */
  all: () => ["progress"] as const,
  /**
   * Per-user progress list key — the authoritative query for the signed-in
   * user's full mastery map fetched from the server.
   */
  byUser: () => [...progressKeys.all(), "byUser"] as const,
} as const;
