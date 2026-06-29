// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * RegionSelector — modal dialog that captures the Battle.net gateway before
 * initiating the OAuth redirect.
 *
 * RESEARCH Pitfall 1: Battle.net userinfo does not return the region/gateway.
 * This dialog captures the user's choice (us / eu / kr) and stores it in
 * sessionStorage under the key "bnet_region" immediately before calling
 * signIn.oauth2 — so the gateway is available for w3champions API lookups
 * in Phase 7 without requiring a second sign-in step.
 *
 * The dialog is modal and not dismissible by clicking outside — user must
 * pick a region or press ESC. No rune accent in this component; rune-500 is
 * reserved exclusively for SignInButton (ADR 0001 / UI-SPEC §Color).
 */

import { signIn } from "#/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Battle.net regional gateway key. */
type Gateway = "us" | "eu" | "kr";

interface Region {
  label: string;
  gateway: Gateway;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Ordered region options per UI-SPEC §RegionSelector.
 * APAC western players use Americas (us) — consistent with Battle.net mapping.
 */
const REGIONS: Region[] = [
  { label: "Americas", gateway: "us" },
  { label: "Europe", gateway: "eu" },
  { label: "Korea", gateway: "kr" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RegionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// RegionSelector — named export
// ---------------------------------------------------------------------------

/**
 * Controlled modal offering the three Battle.net regions.
 *
 * On region selection:
 *  1. Stores the gateway value in sessionStorage["bnet_region"].
 *  2. Calls signIn.oauth2 to initiate the battlenet OAuth redirect.
 *
 * Outside-click is suppressed via onInteractOutside — the user must choose a
 * region or press ESC. No separate "Continue" button — selection is immediate.
 */
export function RegionSelector({ open, onOpenChange }: RegionSelectorProps) {
  async function handleRegionSelect(gateway: Gateway): Promise<void> {
    // Persist locally as a same-origin backup, AND thread the region through the
    // OAuth flow via additionalData so the server-side databaseHooks.user.create
    // hook can read it (getOAuthState) and persist it to users.gateway at
    // creation. Battle.net userinfo never returns the region (RESEARCH Pitfall 1).
    sessionStorage.setItem("bnet_region", gateway);
    await signIn.oauth2({
      providerId: "battlenet",
      callbackURL: "/",
      additionalData: { region: gateway },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        style={{
          backgroundColor: "var(--color-obsidian-800)",
          border: "1px solid var(--color-obsidian-600)",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            Choose your Battle.net region
          </DialogTitle>
          <DialogDescription
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#e9e8ee",
              lineHeight: 1.5,
            }}
          >
            Your region determines which Battle.net server handles sign-in.
          </DialogDescription>
        </DialogHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Region option buttons (stacked, 44px height, font-normal 400)    */}
        {/* ---------------------------------------------------------------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {REGIONS.map(({ label, gateway }) => (
            <button
              key={gateway}
              type="button"
              onClick={() => void handleRegionSelect(gateway)}
              style={{
                width: "100%",
                height: "44px",
                backgroundColor: "transparent",
                color: "#e9e8ee",
                border: "1px solid var(--color-obsidian-600)",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 400,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                transition: "background-color 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-obsidian-700)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
