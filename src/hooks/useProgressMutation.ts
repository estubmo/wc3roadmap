// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * useProgressMutation — optimistic mastery state write hook (PROG-04, D-09).
 *
 * Branches on session state (D-08):
 *   - Signed-in:  calls `setNodeMastery` server fn (authedServerFn POST, 05-04).
 *   - Signed-out: writes to localStorage via `setLocalMastery` (05-05).
 *
 * In both paths, `masteryMap` in the Zustand graph-store is updated immediately
 * (optimistic update, D-09) so the affected node re-renders before the async
 * persist completes. Only the single marked node re-renders — not the whole graph.
 *
 * Error path (T-05-06b):
 *   Rolls back the Zustand store to the pre-mutation snapshot and surfaces an
 *   error toast with a Retry action. The user sees the original state restored —
 *   never a misleading "saved" state after a failed write.
 *
 * Invalidation: on settle (signed-in only), invalidates `progressKeys.byUser()`
 * so the TanStack Query cache re-syncs with server truth after the mutation.
 * Invalidation does NOT happen inside `onMutate` (RESEARCH.md Anti-Pattern).
 *
 * Security (T-05-06a): `masteryState` is typed as `MasteryState` — only the three
 * canonical enum values reach the server fn's Zod validator. No userId, source, or
 * patchId is ever passed by this hook (server-stamped only, D-04/D-05/D-06).
 *
 * Toast copy (UI-SPEC §Toast Specifications):
 *   - Error: "Couldn't save your progress" / "Your selection has been reverted."
 *   - Success: silent (no toast on successful save per UI-SPEC).
 */

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { setNodeMastery } from "#/server/progress";
import { setLocalMastery } from "#/lib/local-progress";
import { useSession } from "#/lib/auth-client";
import type { MasteryState } from "#/schemas/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Variables passed to the mutation on each mark action. */
interface ProgressMutationVars {
  nodeId: string;
  masteryState: MasteryState;
}

/** Context returned from `onMutate` for use in `onError`/`onSettled`. */
interface ProgressMutationContext {
  /** The node's mastery state immediately before the optimistic update. */
  previousState: MasteryState | undefined;
  /** The node ID being updated — carried for rollback in `onError`. */
  nodeId: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `useMutation` for updating a node's mastery state.
 *
 * Usage:
 *   const { mutate } = useProgressMutation();
 *   mutate({ nodeId: "supply-management", masteryState: "mastered" });
 */
export function useProgressMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Forward-reference to the mutation's `mutate` fn for the Retry toast action.
  // Assigned after useMutation() returns; safe because onClick fires after render.
  const mutateRef = useRef<(vars: ProgressMutationVars) => void>(() => void 0);

  const mutation = useMutation<
    unknown,
    Error,
    ProgressMutationVars,
    ProgressMutationContext
  >({
    mutationFn: async ({ nodeId, masteryState }) => {
      if (session) {
        // Signed-in: persist to the server via authedServerFn (D-06).
        return setNodeMastery({ data: { nodeId, masteryState } });
      }
      // Signed-out: write to localStorage (PROG-03, D-08).
      // setLocalMastery is synchronous; wrap in Promise so mutationFn always
      // returns a Promise (TanStack Query requirement).
      setLocalMastery(nodeId, masteryState);
      return;
    },

    onMutate: async ({ nodeId, masteryState }) => {
      // Cancel any in-flight queries so their settled values don't overwrite
      // the optimistic Zustand update (D-09 race-condition prevention).
      await queryClient.cancelQueries({ queryKey: progressKeys.byUser() });

      // Snapshot the current state for rollback on error.
      const previousState = useGraphStore.getState().masteryMap[nodeId];

      // Optimistic update — immediate Zustand write so the graph re-renders
      // this single node now, before the server responds (D-09).
      useGraphStore.getState().setNodeMastery(nodeId, masteryState);

      return { previousState, nodeId };
    },

    onError: (_err, vars, ctx) => {
      // Roll back the optimistic update to the pre-mutation state (T-05-06b).
      useGraphStore.getState().setNodeMastery(
        ctx?.nodeId ?? vars.nodeId,
        ctx?.previousState ?? "untouched"
      );

      // Surface error toast with Retry action (UI-SPEC §Toast Specifications).
      // duration: Infinity keeps the toast until the user dismisses or retries.
      toast.error("Couldn't save your progress", {
        description: "Your selection has been reverted. Please try again.",
        action: {
          label: "Retry",
          onClick: () => mutateRef.current(vars),
        },
        duration: Infinity,
      });
    },

    onSettled: () => {
      // Sync server truth regardless of outcome, but only when signed-in.
      // Signed-out users have no server query to invalidate (PROG-03, D-08).
      if (session) {
        void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
      }
    },
  });

  // Update the forward-reference so the Retry action always fires the latest
  // mutate fn reference (stable identity from useMutation, but updated each render).
  mutateRef.current = mutation.mutate;

  return mutation;
}
