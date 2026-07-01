// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * useSyncW3championsMutation — triggers the principal-keyed w3champions sync
 * server fn and surfaces its tailored outcome (AUTO-01, AUTO-04, AUTO-05).
 *
 * Mirrors `useProgressMutation` in shape (useMutation + sonner toasts +
 * `onSettled` invalidation) but has NO signed-out branch: the sync button is
 * only ever rendered inside the authed profile surface (UserDropdown), so the
 * mutation always calls the authed `syncW3champions` server fn. The fn takes no
 * client data — id/battleTag/gateway are principal-keyed server-side (ADR 007),
 * so `mutationFn` passes no userId/data of any kind.
 *
 * Outcome branching (D-07 / D-08 / D-10, driven by the server `status` bucket):
 *   - `ok` / `cached` + advanced.length > 0 → write the newly-advanced ids to the
 *     graph store via `setRecentlyAdvanced` (drives the D-07 one-shot pulse) and
 *     show a summary success toast.
 *   - `ok` / `cached` + advanced.length === 0 → a REASSURING success toast, never
 *     an error (D-08 — "you're already ahead of the signals", not "nothing found").
 *   - `rate-limited` → a neutral info toast noting recent data is shown (D-10b);
 *     NOT an error. Offers Retry so the user can try again shortly.
 *   - `unreachable` → an error toast with a Retry action (D-10a).
 *   - `no-data` → a reassuring info toast pointing at ranked play (D-10c) — reads
 *     as normal, not broken.
 *
 * Invalidation (onSettled — mirrors the useProgressMutation anti-pattern note:
 * NEVER invalidate inside onMutate): invalidates BOTH
 * `w3championsKeys.syncStatus()` (refreshes "Last synced Xm ago") AND
 * `progressKeys.byUser()` (the graph re-hydrates with the new auto rows).
 *
 * Security (T-07-08a): toast copy is derived ONLY from the opaque bucket status —
 * no raw upstream error text or status codes are ever rendered.
 *
 * Additive-only (T-07-08c / AUTO-05): this hook NEVER disables or short-circuits
 * any manual/quiz mutation path. It only writes the transient highlight set and
 * invalidates caches.
 *
 * NOTE: all toast copy below is a functional PLACEHOLDER — exact wording is
 * deferred to the UI-SPEC pass.
 */

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { w3championsKeys } from "#/lib/w3champions-keys";
import { syncW3champions } from "#/server/w3champions";
import type { SyncResult } from "#/server/w3champions";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `useMutation` that triggers a w3champions ladder sync.
 *
 * Usage:
 *   const { mutate, isPending } = useSyncW3championsMutation();
 *   mutate();
 */
export function useSyncW3championsMutation() {
  const queryClient = useQueryClient();

  // Forward-reference to the mutation's `mutate` fn for the Retry toast action.
  // Assigned after useMutation() returns; safe because onClick fires after render.
  const mutateRef = useRef<() => void>(() => void 0);

  const mutation = useMutation<SyncResult, Error, void>({
    // No client data — the server fn is principal-keyed (ADR 007). There is no
    // userId/battleTag channel here by construction.
    mutationFn: () => syncW3champions(),

    onSuccess: (result) => {
      switch (result.status) {
        case "ok":
        case "cached": {
          if (result.advanced.length > 0) {
            // D-07: drive the one-shot pulse for freshly auto-advanced nodes.
            useGraphStore.getState().setRecentlyAdvanced(result.advanced);
            // Placeholder copy — final wording in the UI-SPEC pass.
            toast.success("Synced with w3champions", {
              description: `${result.advanced.length} node${
                result.advanced.length === 1 ? "" : "s"
              } advanced from your ladder data.`,
            });
          } else {
            // D-08: 0-node result is a reassuring SUCCESS, not an error.
            // Placeholder copy — final wording in the UI-SPEC pass.
            toast.success("You're all caught up", {
              description:
                "Your ladder data didn't unlock new nodes — you're already ahead of it.",
            });
          }
          break;
        }

        case "rate-limited": {
          // D-10b: neutral info, NOT an error — recent data is being shown.
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("Showing your most recent data", {
            description: "w3champions is busy right now — try again shortly.",
            action: {
              label: "Retry",
              onClick: () => mutateRef.current(),
            },
          });
          break;
        }

        case "no-data": {
          // D-10c: reassuring info — reads as normal, not broken.
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("No ladder data found yet", {
            description: "Play some ranked games and sync again to auto-detect progress.",
          });
          break;
        }

        case "unreachable": {
          // D-10a: genuine error with a Retry action.
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.error("Couldn't reach w3champions", {
            description: "Please try again in a moment.",
            action: {
              label: "Retry",
              onClick: () => mutateRef.current(),
            },
            duration: Infinity,
          });
          break;
        }
      }
    },

    onError: () => {
      // Network/transport failure before a bucket status could be resolved.
      // Placeholder copy — final wording in the UI-SPEC pass.
      toast.error("Couldn't sync with w3champions", {
        description: "Please try again in a moment.",
        action: {
          label: "Retry",
          onClick: () => mutateRef.current(),
        },
        duration: Infinity,
      });
    },

    onSettled: () => {
      // Refresh BOTH caches: the "Last synced Xm ago" indicator AND the graph's
      // per-user progress (which now includes any new auto rows). Invalidation
      // happens on settle, NEVER inside onMutate (RESEARCH Anti-Pattern).
      void queryClient.invalidateQueries({ queryKey: w3championsKeys.syncStatus() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
    },
  });

  // Keep the Retry action pointing at the latest mutate reference each render.
  mutateRef.current = mutation.mutate;

  return mutation;
}
