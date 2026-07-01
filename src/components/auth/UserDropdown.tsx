// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * UserDropdown — signed-in header widget showing BattleTag + generated avatar.
 *
 * Reads session state via useSession from #/lib/auth-client (client-safe —
 * never imports #/lib/auth which contains server-only secrets).
 *
 * Avatar is generated via DiceBear initials because Battle.net provides no
 * user avatar API (RESEARCH Pitfall 2). The AvatarFallback renders the first
 * 2 characters of the BattleTag (before the "#" discriminator) in case the
 * DiceBear URL fails to load.
 *
 * No rune-500 accent — the gold accent is reserved exclusively for
 * SignInButton (ADR 0001 / UI-SPEC §Color).
 *
 * The w3champions sync item (SyncW3championsButton) is mounted above the
 * Sign-out item (Phase 7, AUTO-01) — a signed-in user triggers the sync and
 * sees "Last synced Xm ago" directly from this profile surface. No separate
 * linking step: the BattleTag is already in the session.
 */

import { ChevronDown, LogOut } from "lucide-react";
import { useSession, signOut } from "#/lib/auth-client";
import { Button } from "#/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "#/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SyncW3championsButton } from "#/components/profile/SyncW3championsButton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the DiceBear initials avatar URL for a BattleTag.
 *
 * DiceBear generates a consistent SVG avatar seeded from the BattleTag string.
 * This is the fallback for Battle.net's absent avatar API (Pitfall 2 / A7).
 * Can be swapped for a local CSS-generated initials avatar without changing
 * the public interface of this component.
 */
function buildAvatarUrl(battleTag: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(battleTag)}`;
}

/**
 * Extracts 2-char initials from a BattleTag (e.g. "Grubby#1234" → "Gr").
 * Falls back to "??" when the BattleTag is empty or has no "#" separator.
 */
function buildInitials(battleTag: string): string {
  return battleTag.split("#")[0]?.slice(0, 2) ?? "??";
}

// ---------------------------------------------------------------------------
// UserDropdown — named export
// ---------------------------------------------------------------------------

/**
 * Ghost-trigger dropdown for the signed-in header state (D-02).
 *
 * Trigger layout: Avatar (32px circle) + BattleTag label (hidden < 480px) +
 * ChevronDown (16px). Panel: obsidian-800 bg, obsidian-600 border, 8px radius,
 * min-width 180px. Single item: "Sign out" (LogOut icon, ghost, no confirmation
 * dialog — no user data at risk in Phase 4).
 *
 * Accessibility: Radix DropdownMenu Trigger automatically sets aria-haspopup
 * and aria-expanded on the child button element.
 */
export function UserDropdown() {
  const { data: session } = useSession();
  const battleTag = session?.user?.name ?? "";
  const initials = buildInitials(battleTag);
  const avatarUrl = buildAvatarUrl(battleTag);

  async function handleSignOut(): Promise<void> {
    await signOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-haspopup="menu"
          style={{
            height: "36px",
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Avatar — DiceBear initials (Pitfall 2 — no Battle.net avatar API) */}
          <Avatar style={{ width: "32px", height: "32px", flexShrink: 0 }}>
            <AvatarImage src={avatarUrl} alt={battleTag} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* BattleTag label — hidden on mobile (< 480px), max 140px + ellipsis */}
          {battleTag && (
            <span
              className="hidden min-[480px]:inline"
              style={{
                fontSize: "13px",
                fontWeight: 400,
                lineHeight: 1.4,
                color: "#e9e8ee",
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {battleTag}
            </span>
          )}

          <ChevronDown
            style={{ width: "16px", height: "16px", flexShrink: 0 }}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        style={{
          backgroundColor: "var(--color-obsidian-800)",
          border: "1px solid var(--color-obsidian-600)",
          borderRadius: "8px",
          minWidth: "180px",
          padding: "4px 0",
        }}
      >
        {/* w3champions sync — always-live action + "Last synced Xm ago" (Phase 7, AUTO-01) */}
        <SyncW3championsButton />

        {/* Sign out — ghost variant, LogOut icon, no confirmation (Phase 4 safe) */}
        <DropdownMenuItem
          onClick={() => void handleSignOut()}
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#e9e8ee",
            cursor: "pointer",
            gap: "8px",
          }}
        >
          <LogOut style={{ width: "16px", height: "16px" }} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
