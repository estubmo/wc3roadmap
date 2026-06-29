// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * SignInButton — gold-accent CTA (D-01) that opens the RegionSelector dialog.
 *
 * Clicking this button opens RegionSelector — it does NOT initiate the OAuth
 * redirect directly. The user's Battle.net region must be captured first
 * (RESEARCH Pitfall 1: the gateway is absent from Battle.net userinfo).
 *
 * Design: rune-500 gold background (var(--color-rune-500)), obsidian-950
 * text, font-semibold (600). The rune-500 accent is reserved exclusively for
 * this button (ADR 0001 / UI-SPEC §Color).
 */

import { Button } from "#/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SignInButtonProps {
  /** Called when the button is clicked. Parent opens the RegionSelector dialog. */
  onOpenRegion: () => void;
}

// ---------------------------------------------------------------------------
// SignInButton — named export
// ---------------------------------------------------------------------------

/**
 * Gold "Sign in with Battle.net" CTA (D-01).
 *
 * Accepts an `onOpenRegion` callback so the parent (SiteHeader in plan 04-06)
 * controls the RegionSelector open state without coupling the button to dialog
 * state. The button itself never calls authClient.signIn directly.
 */
export function SignInButton({ onOpenRegion }: SignInButtonProps) {
  return (
    <Button
      size="lg"
      aria-label="Sign in with Battle.net"
      onClick={onOpenRegion}
      className="bg-[var(--color-rune-500)] text-[var(--color-obsidian-950)] text-base font-semibold hover:bg-[var(--color-rune-400)] focus-visible:ring-[var(--color-rune-400)]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Sign in with Battle.net
    </Button>
  );
}
