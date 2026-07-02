// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * useUploadReplayMutation — manual `.w3g` upload mutation (REPLAY-04, D-13).
 *
 * Mirrors `useSyncW3championsMutation` in shape (useMutation + sonner toasts +
 * `setRecentlyAdvanced` pulse + dual-cache `onSettled` invalidation) but takes
 * a `FormData` payload instead of no arguments, and enforces the ADR 011 §3
 * client-side upload size cap (4 MB) BEFORE the server function is ever
 * called (Pitfall 1) — an oversized file never leaves the browser.
 *
 * No signed-out branch: this hook is only ever used from the authed-only
 * `/replays` route (D-13), so the mutation always calls the authed
 * `uploadReplay` server fn.
 *
 * Outcome branching (mirrors the `ReplayStatus` bucket convention from
 * `src/server/replay.ts`, T-08-11e):
 *   - `ok` / `cached` + advanced.length > 0 → `setRecentlyAdvanced` (D-05 pulse)
 *     + a summary success toast.
 *   - `ok` / `cached` + advanced.length === 0 → a REASSURING success toast
 *     (mirrors D-08 — the report itself still lists every signal below the
 *     bare toast; this is never rendered as an error).
 *   - `rate-limited` → neutral info toast, not an error.
 *   - `unreachable` → error toast with a Retry action.
 *   - `no-data` → reassuring info toast.
 *   - `parse-failed` → error toast — the file could not be parsed as a `.w3g`
 *     replay (corrupt file or a server-side backstop rejection).
 *   - `no-player-match` → info toast — the principal's BattleTag was not
 *     found among the replay's players (D-14).
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
import { uploadReplay } from "#/server/replay";
import type { ReplayReport } from "#/server/replay";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Client-side upload size cap (ADR 011 §3) — a UX guard, not a security
 * boundary. The server function re-validates defensively (08-11); this hook
 * never trusts the client check alone as the only line of defense.
 */
const MAX_REPLAY_BYTES = 4 * 1024 * 1024;

/** The FormData field name `uploadReplay` reads the file from (matches src/server/replay.ts). */
const UPLOAD_FIELD_NAME = "file";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `useMutation` that uploads a `.w3g` replay `FormData` payload
 * (field name `"file"`) for analysis.
 *
 * Usage:
 *   const { mutate, isPending, error } = useUploadReplayMutation();
 *   const formData = new FormData();
 *   formData.append("file", file);
 *   mutate(formData);
 */
export function useUploadReplayMutation() {
  const queryClient = useQueryClient();

  // Forward-reference to the mutation's `mutate` fn for the Retry toast action.
  // Assigned after useMutation() returns; safe because onClick fires after render.
  const mutateRef = useRef<(vars: FormData) => void>(() => void 0);
  // Retry needs the same FormData the failed attempt used (unlike the
  // zero-arg sync/pull mutations) — captured on every attempt.
  const lastFormDataRef = useRef<FormData | null>(null);

  const mutation = useMutation<ReplayReport, Error, FormData>({
    mutationFn: async (formData) => {
      lastFormDataRef.current = formData;
      // ADR 011 §3 / Pitfall 1: reject an oversized file BEFORE any server
      // call fires — the size check happens synchronously here, before the
      // `await uploadReplay(...)` below is ever reached.
      const file = formData.get(UPLOAD_FIELD_NAME);
      if (file instanceof Blob && file.size > MAX_REPLAY_BYTES) {
        throw new Error(
          "Replay file is too large — WC3 replays are typically under 1 MB; files over 4 MB are not supported.",
        );
      }

      return uploadReplay({ data: formData });
    },

    onSuccess: (result) => {
      switch (result.status) {
        case "ok":
        case "cached": {
          if (result.advanced.length > 0) {
            // D-05: drive the one-shot pulse for freshly advanced nodes.
            useGraphStore.getState().setRecentlyAdvanced(result.advanced);
            // Placeholder copy — final wording in the UI-SPEC pass.
            toast.success("Replay analyzed", {
              description: `${result.advanced.length} node${
                result.advanced.length === 1 ? "" : "s"
              } advanced from this replay.`,
            });
          } else {
            // Reassuring success, not an error — the report below still
            // lists every measured signal.
            toast.success("Replay analyzed", {
              description: "No new nodes advanced from this replay — see the report below.",
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
              onClick: () => {
                if (lastFormDataRef.current) mutateRef.current(lastFormDataRef.current);
              },
            },
          });
          break;
        }

        case "no-data": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("Nothing to analyze yet", {
            description: "This replay didn't produce any measurable signals.",
          });
          break;
        }

        case "unreachable": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.error("Couldn't reach the analysis service", {
            description: "Please try again in a moment.",
            duration: Infinity,
          });
          break;
        }

        case "parse-failed": {
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.error("Couldn't read this replay", {
            description: "The file doesn't look like a valid .w3g replay.",
            duration: Infinity,
          });
          break;
        }

        case "no-player-match": {
          // D-14: BattleTag not found among the replay's players.
          // Placeholder copy — final wording in the UI-SPEC pass.
          toast.info("Couldn't find you in this replay", {
            description: "Your BattleTag wasn't matched to a player in this game.",
          });
          break;
        }
      }
    },

    onError: (err) => {
      // Either the client-side size-cap rejection above, or a genuine
      // network/transport failure before a bucket status could be resolved.
      // Placeholder copy — final wording in the UI-SPEC pass.
      toast.error("Couldn't upload replay", {
        description: err.message,
        action: {
          label: "Retry",
          onClick: () => {
            if (lastFormDataRef.current) mutateRef.current(lastFormDataRef.current);
          },
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
