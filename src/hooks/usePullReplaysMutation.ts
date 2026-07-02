// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * usePullReplaysMutation — auto-pull recent replays from w3champions
 * (REPLAY-05, D-13). Matches `useSyncW3championsMutation` almost exactly:
 * zero-arg principal-keyed `pullReplays()` call, same bucket switch + D-05
 * pulse + dual-cache invalidation.
 *
 * No signed-out branch: this hook is only ever used from the authed-only
 * `/replays` route (D-13), so the mutation always calls the authed
 * `pullReplays` server fn. It takes no client data — gameId candidates are
 * resolved server-side from `context.principal.battleTag` only (ADR 007).
 *
 * Outcome branching (mirrors the `ReplayStatus` bucket convention from
 * `src/server/replay.ts`, T-08-11e — identical bucket set to
 * `useUploadReplayMutation`, since both return `ReplayReport`):
 *   - `ok` / `cached` + advanced.length > 0 → `setRecentlyAdvanced` (D-05
 *     pulse) + a summary success toast.
 *   - `ok` / `cached` + advanced.length === 0 → a REASSURING success toast
 *     (D-08-style — never an error; `cached` in particular means the D-17
 *     gameId cache gate skipped re-parsing already-known replays).
 *   - `rate-limited` → neutral info toast, not an error.
 *   - `unreachable` → error toast with a Retry action.
 *   - `no-data` → reassuring info toast (no recent 1v1 matches found).
 *   - `parse-failed` → error toast — a fetched replay could not be parsed.
 *   - `no-player-match` → info toast — a fetched replay's players didn't
 *     match the principal's BattleTag (D-14).
 *
 * Invalidation (onSettled — never inside onMutate, RESEARCH Anti-Pattern):
 * invalidates BOTH `replayKeys.analysisStatus()` AND `progressKeys.byUser()`
 * so the graph re-hydrates with any newly-written replay mastery rows.
 *
 * NOTE: all toast copy below is a functional PLACEHOLDER — exact wording is
 * deferred to the UI-SPEC pass.
 */

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGraphStore } from "#/lib/graph-store";
import { progressKeys } from "#/lib/progress-keys";
import { replayKeys } from "#/lib/replay-keys";
import { pullReplays } from "#/server/replay";
import type { ReplayReport } from "#/server/replay";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `useMutation` that triggers a w3champions recent-replays auto-pull.
 *
 * Usage:
 *   const { mutate, isPending } = usePullReplaysMutation();
 *   mutate();
 */
export function usePullReplaysMutation() {
  const queryClient = useQueryClient();

  // Forward-reference to the mutation's `mutate` fn for the Retry toast action.
  // Assigned after useMutation() returns; safe because onClick fires after render.
  const mutateRef = useRef<() => void>(() => void 0);

  const mutation = useMutation<ReplayReport, Error, void>({
    // No client data — the server fn is principal-keyed (ADR 007). There is no
    // userId/battleTag channel here by construction.
    mutationFn: () => pullReplays(),

    onSuccess: (result) => {
      switch (result.status) {
        case "ok":
        case "cached": {
          if (result.advanced.length > 0) {
            // D-05: drive the one-shot pulse for freshly advanced nodes.
            useGraphStore.getState().setRecentlyAdvanced(result.advanced);
            // Placeholder copy — final wording in the UI-SPEC pass.
            toast.success("Replays pulled", {
              description: `${result.advanced.length} node${
                result.advanced.length === 1 ? "" : "s"
              } advanced from your recent replays.`,
            });
          } else {
            // Reassuring success, not an error — the report below still
            // lists every measured signal.
            toast.success("Replays pulled", {
              description: "No new nodes advanced — see the report below.",
            });
          }
          break;
        }

        case "rate-limited": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("w3champions is busy right now", {
            description: "Please try again shortly.",
            action: {
              label: "Retry",
              onClick: () => mutateRef.current(),
            },
          });
          break;
        }

        case "no-data": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("No recent 1v1 replays found", {
            description: "Play some ranked games and pull again to auto-detect progress.",
          });
          break;
        }

        case "unreachable": {
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

        case "parse-failed": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.error("Couldn't read one of your replays", {
            description: "A fetched replay didn't parse as a valid .w3g file.",
            duration: Infinity,
          });
          break;
        }

        case "no-player-match": {
          // D-14: BattleTag not found among a fetched replay's players.
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("Couldn't match you in a recent replay", {
            description: "Your BattleTag wasn't matched to a player in one of your games.",
          });
          break;
        }
      }
    },

    onError: () => {
      // Network/transport failure before a bucket status could be resolved.
      // Placeholder copy — final wording in the UI-SPEC pass.
      toast.error("Couldn't pull replays", {
        description: "Please try again in a moment.",
        action: {
          label: "Retry",
          onClick: () => mutateRef.current(),
        },
        duration: Infinity,
      });
    },

    onSettled: () => {
      // Refresh BOTH caches: the analysis-status query AND the graph's
      // per-user progress (which now includes any new replay rows).
      // Invalidation happens on settle, NEVER inside onMutate.
      void queryClient.invalidateQueries({ queryKey: replayKeys.analysisStatus() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
    },
  });

  // Keep the Retry action pointing at the latest mutate reference each render.
  mutateRef.current = mutation.mutate;

  return mutation;
}
