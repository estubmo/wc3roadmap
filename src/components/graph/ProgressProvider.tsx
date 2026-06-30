// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * ProgressProvider — populates the graph store's `masteryMap` from the correct
 * source and runs the one-time fill-gaps merge on first sign-in.
 *
 * Hydration strategy (D-08):
 *   - Signed-in:  TanStack Query fetches `getUserProgress` from the server;
 *                 on resolve, `initMasteryMap` populates the Zustand store
 *                 (server is the source of truth).
 *   - Signed-out: `getLocalProgress()` populates the store from localStorage.
 *
 * One-time merge (PROG-03, D-07 — fill-gaps / server-wins):
 *   On first sign-in only, if localStorage has any progress entries, they are
 *   merged into the server account via `mergeProgressOnSignIn`. The server only
 *   fills gaps — nodes where the account already has a record are NOT overwritten.
 *   After the merge, localStorage is cleared and the `wc3rm:merged` flag is set
 *   so the merge never runs again in this browser (Pitfall 4).
 *
 * Acceptable flash (Pitfall 5): masteryMap shows "untouched" for ~200ms while
 * the `getUserProgress` query resolves. Phase 5 accepts this.
 *
 * Threat model (T-05-07a/b/c):
 *   - Merge payload is validated by `mergeProgressOnSignIn` (Zod + server-wins).
 *   - Merge runs at most once per browser (useRef + wc3rm:merged guard).
 *   - masteryMap only ever holds the authenticated principal's rows.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "#/lib/auth-client";
import { useGraphStore } from "#/lib/graph-store";
import { getUserProgress, mergeProgressOnSignIn } from "#/server/progress";
import {
  getLocalProgress,
  clearLocalProgress,
  isAlreadyMerged,
  markMerged,
} from "#/lib/local-progress";
import { progressKeys } from "#/lib/progress-keys";
import type { MasteryState } from "#/schemas/progress";

// ---------------------------------------------------------------------------
// ProgressProvider
// ---------------------------------------------------------------------------

interface ProgressProviderProps {
  children: ReactNode;
}

/**
 * Wraps graph + panel children; hydrates `masteryMap` and runs the first-sign-in
 * fill-gaps merge. Mount once in the home route (src/routes/index.tsx).
 */
export function ProgressProvider({ children }: ProgressProviderProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const initMasteryMap = useGraphStore((s) => s.initMasteryMap);

  // Guard: prevents double-firing the merge within a single browser session
  // even if this component re-renders (isAlreadyMerged() guards across sessions).
  const mergeInitiatedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Server progress query — enabled only when signed in (D-08)
  // ---------------------------------------------------------------------------

  const { data: progressRecords } = useQuery({
    queryKey: progressKeys.byUser(),
    queryFn: () => getUserProgress(),
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes — progress changes are user-triggered
  });

  // ---------------------------------------------------------------------------
  // Effect A: signed-in hydrate — server progress → masteryMap (PROG-01)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!progressRecords) return;

    const map: Record<string, MasteryState> = {};
    for (const r of progressRecords) {
      // Cast: DB returns `text` column; Zod guarantees valid values at write time.
      map[r.nodeId] = r.masteryState as MasteryState;
    }
    initMasteryMap(map);
  }, [progressRecords, initMasteryMap]);

  // ---------------------------------------------------------------------------
  // Effect B: signed-out hydrate — localStorage → masteryMap (D-08)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (session) return;
    initMasteryMap(getLocalProgress());
  }, [session, initMasteryMap]);

  // ---------------------------------------------------------------------------
  // Effect C: one-time fill-gaps merge on first sign-in (PROG-03, D-07)
  //
  // Guard order:
  //   1. session must be present (signed-in transition)
  //   2. mergeInitiatedRef prevents double-fire within this render lifecycle
  //   3. isAlreadyMerged() prevents re-merge across page reloads (Pitfall 4)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return;
    if (mergeInitiatedRef.current) return;
    if (isAlreadyMerged()) return;

    // Mark initiated immediately — prevents a second execution if the effect
    // re-fires (React Strict Mode double-invoke or Fast Refresh).
    mergeInitiatedRef.current = true;

    void (async () => {
      const local = getLocalProgress();

      if (Object.keys(local).length > 0) {
        // Build the merge payload from localStorage entries.
        const records = Object.entries(local).map(([nodeId, masteryState]) => ({
          nodeId,
          masteryState,
        }));

        // Fill-gaps merge (server-wins on conflict — D-07, T-05-07a).
        const result = await mergeProgressOnSignIn({ data: { records } });

        // Clear local store and persist the merge flag (T-05-07b).
        clearLocalProgress();
        markMerged();

        // Refetch to sync the Zustand store with the freshly merged server state.
        await queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });

        // Show success toast only when at least one record was merged
        // (UI-SPEC §Copywriting Contract merge toast, 5s auto-dismiss).
        if (result.merged > 0) {
          toast.success("Progress synced", {
            description:
              "Your progress from your previous session has been synced.",
            duration: 5000,
          });
        }
      } else {
        // No local entries — mark as merged silently to prevent future attempts.
        markMerged();
      }
    })();
  }, [session, queryClient]);

  return <>{children}</>;
}
