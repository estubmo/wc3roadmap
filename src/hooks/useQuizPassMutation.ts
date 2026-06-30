// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * useQuizPassMutation — optimistic quiz-pass mastery write hook (QUIZ-02, D-12/D-14).
 *
 * Mirrors `useProgressMutation` (Phase 5) with these deltas:
 *   - Mutation vars are `{ nodeId: string }` only — no masteryState or source.
 *   - `onMutate` optimistically sets BOTH mastery to "mastered" AND source to "quiz",
 *     so the node re-renders immediately (single-node, no reload — criterion 2).
 *   - Snapshots BOTH `previousState` and `previousSource` for rollback.
 *   - `onError` rolls back both mastery and source (T-06-14 mitigation).
 *
 * Dual signed-in / signed-out path (mirrors useProgressMutation D-08):
 *   - Signed-in:  persists via `recordQuizPass` authedServerFn (QUIZ-02, D-12/D-13).
 *   - Signed-out: writes mastered to localStorage via `setLocalMastery` (05-05).
 *     Source persistence is session-only for signed-out users — `local-progress`
 *     does not track source. This mirrors the existing local mastery model and is
 *     out of scope this phase.
 *
 * Invalidation: on settle (signed-in only), invalidates `progressKeys.byUser()`
 * so the TanStack Query cache re-syncs with server truth after the mutation.
 * Invalidation does NOT happen inside `onMutate` (RESEARCH.md Anti-Pattern).
 *
 * Security (T-06-13): only `{ nodeId }` is passed to `recordQuizPass` — no
 * userId, source, masteryState, or patchId is ever passed by this hook
 * (server-stamped only, D-12/D-13).
 *
 * Toast copy (mirrors UI-SPEC §Toast Specifications, adapted for quiz context):
 *   - Error: "Couldn't save quiz result" / "Your mastery state has been reverted."
 *   - Success: silent (no toast on successful save per UI-SPEC).
 */

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { recordQuizPass } from "#/server/quiz";
import { setLocalMastery } from "#/lib/local-progress";
import { useSession } from "#/lib/auth-client";
import type { MasteryState } from "#/schemas/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Variables passed to the mutation on each quiz-pass action. */
interface QuizPassMutationVars {
  nodeId: string;
}

/**
 * Context returned from `onMutate` for use in `onError`/`onSettled`.
 *
 * Carries both mastery and source snapshots so both can be rolled back
 * independently on error (T-06-14 mitigation).
 */
interface QuizPassMutationContext {
  /** The node's mastery state immediately before the optimistic update. */
  previousState: MasteryState | undefined;
  /**
   * The node's source value immediately before the optimistic update.
   * `undefined` when the node had no prior source entry in `sourceMap`.
   */
  previousSource: string | undefined;
  /** The node ID being updated — carried for rollback in `onError`. */
  nodeId: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `useMutation` for recording a quiz pass.
 *
 * Optimistically marks the node as mastered with source "quiz" before the
 * server responds, rolling back both on error.
 *
 * Usage:
 *   const { mutate } = useQuizPassMutation();
 *   mutate({ nodeId: "tech-timing" });
 */
export function useQuizPassMutation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Forward-reference to the mutation's `mutate` fn for the Retry toast action.
  // Assigned after useMutation() returns; safe because onClick fires after render.
  const mutateRef = useRef<(vars: QuizPassMutationVars) => void>(() => void 0);

  const mutation = useMutation<
    unknown,
    Error,
    QuizPassMutationVars,
    QuizPassMutationContext
  >({
    mutationFn: async ({ nodeId }) => {
      if (session) {
        // Signed-in: persist to the server via authedServerFn (D-12/D-13).
        // Only nodeId is sent — source, masteryState, and patchId are server-stamped.
        return recordQuizPass({ data: { nodeId } });
      }
      // Signed-out: write mastered to localStorage (PROG-03, D-08 dual-path mirror).
      // Source persistence is session-only for signed-out users (local-progress
      // does not track source — out of scope this phase, see module JSDoc).
      // setLocalMastery is synchronous; wrap in Promise so mutationFn always
      // returns a Promise (TanStack Query requirement).
      setLocalMastery(nodeId, "mastered");
      return;
    },

    onMutate: async ({ nodeId }) => {
      // Cancel any in-flight queries so their settled values don't overwrite
      // the optimistic Zustand update (D-09 race-condition prevention).
      await queryClient.cancelQueries({ queryKey: progressKeys.byUser() });

      // Snapshot both mastery and source for rollback on error (T-06-14).
      const previousState = useGraphStore.getState().masteryMap[nodeId];
      const previousSource = useGraphStore.getState().sourceMap[nodeId];

      // Optimistic update — immediate Zustand writes so the graph re-renders
      // this single node now, before the server responds (criterion 2, D-09).
      // Both mastery AND source are set atomically from the UI's perspective.
      useGraphStore.getState().setNodeMastery(nodeId, "mastered");
      useGraphStore.getState().setSource(nodeId, "quiz");

      return { previousState, previousSource, nodeId };
    },

    onError: (_err, vars, ctx) => {
      // Roll back mastery to the pre-mutation snapshot (T-06-14 / T-05-06b pattern).
      useGraphStore.getState().setNodeMastery(
        ctx?.nodeId ?? vars.nodeId,
        ctx?.previousState ?? "untouched"
      );

      // Roll back source only when it was previously set — `setSource` requires
      // a string argument (no delete API). If the node had no prior source, the
      // "quiz" entry stays until `onSettled` re-syncs from server truth (signed-in)
      // or the session ends (signed-out — acceptable per local mastery model).
      if (ctx?.previousSource !== undefined) {
        useGraphStore.getState().setSource(
          ctx.nodeId ?? vars.nodeId,
          ctx.previousSource
        );
      }

      // Surface error toast with Retry action (UI-SPEC §Toast Specifications).
      // duration: Infinity keeps the toast until the user dismisses or retries.
      toast.error("Couldn't save quiz result", {
        description: "Your mastery state has been reverted. Please try again.",
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
