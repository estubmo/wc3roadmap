// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * SyncW3championsButton — the always-live "Sync with w3champions" action plus a
 * "Last synced Xm ago" indicator, mounted in the signed-in profile dropdown
 * (AUTO-01 criterion 1, AUTO-04, D-11).
 *
 * Trigger: `useSyncW3championsMutation` fires the principal-keyed sync. Per D-11
 * the action is ALWAYS clickable — there is NO TTL-based disabled state and NO
 * countdown. A mid-flight `isPending` swaps in a spinner for feedback, but the
 * button is never gated by the freshness window; pressing within the TTL is
 * handled silently server-side (the DB gate reuses cached signals — T-07-08b).
 *
 * Last-synced indicator: a `useQuery` on `w3championsKeys.syncStatus()` reads the
 * durable sync row. Its `staleTime` mirrors `SYNC_TTL_MS` (AUTO-04 criterion 3)
 * so a same-tab re-open inside the freshness window serves the cached timestamp
 * without a redundant refetch — the client cache and the DB gate agree on one
 * window.
 *
 * Authed-only: this component assumes it is rendered exclusively in the
 * signed-in surface (UserDropdown), so there is no signed-out branch. The
 * BattleTag is already in the session — there is no separate linking step
 * (AUTO-01).
 *
 * NOTE: copy and visual styling are functional PLACEHOLDERS — final wording,
 * the relative-time formatting, and polish are deferred to the UI-SPEC pass.
 */

import { RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DropdownMenuItem } from "#/components/ui/dropdown-menu";
import { useSyncW3championsMutation } from "#/hooks/useSyncW3championsMutation";
import { w3championsKeys, SYNC_TTL_MS } from "#/lib/w3champions-keys";
import { getW3championsSyncStatus } from "#/server/w3champions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a last-synced timestamp as a coarse relative string
 * (e.g. "Last synced 5m ago"). Placeholder formatting — final relative-time
 * treatment is a UI-SPEC concern.
 *
 * @param lastSyncedAt - The sync row's timestamp (Date or ISO string), or null
 *   when the user has never synced.
 */
function formatLastSynced(lastSyncedAt: Date | string | null | undefined): string {
  if (lastSyncedAt == null) return "Never synced";

  const then = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(then)) return "Never synced";

  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Last synced just now";
  if (diffMin < 60) return `Last synced ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last synced ${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `Last synced ${diffDay}d ago`;
}

// ---------------------------------------------------------------------------
// SyncW3championsButton — named export
// ---------------------------------------------------------------------------

/**
 * The profile-dropdown sync action + last-synced indicator.
 *
 * Rendered inside `UserDropdown`'s `DropdownMenuContent` (signed-in only).
 */
export function SyncW3championsButton() {
  const { mutate, isPending } = useSyncW3championsMutation();

  // staleTime mirrors the DB TTL (AUTO-04 criterion 3) — prevents redundant
  // same-tab refetch of the last-synced timestamp within the freshness window.
  const { data: syncStatus } = useQuery({
    queryKey: w3championsKeys.syncStatus(),
    queryFn: () => getW3championsSyncStatus(),
    staleTime: SYNC_TTL_MS,
  });

  return (
    <DropdownMenuItem
      // D-11: keep the menu open on click so the in-flight spinner is visible;
      // the action is ALWAYS live — never disabled, never a countdown.
      onSelect={(event) => {
        event.preventDefault();
        mutate();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
        fontSize: "14px",
        fontWeight: 400,
        color: "#e9e8ee",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isPending ? (
          <Loader2
            style={{ width: "16px", height: "16px" }}
            className="animate-spin"
            aria-hidden
          />
        ) : (
          <RefreshCw style={{ width: "16px", height: "16px" }} aria-hidden />
        )}
        Sync with w3champions
      </span>

      {/* "Last synced Xm ago" — derived from the TTL-mirroring status query. */}
      <span
        style={{
          fontSize: "12px",
          fontWeight: 400,
          color: "#a8a6b3",
          paddingLeft: "24px",
        }}
      >
        {formatLastSynced(syncStatus?.lastSyncedAt)}
      </span>
    </DropdownMenuItem>
  );
}
