// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * PathwayIntroOverlay — first-visit intro overlay (PATH-01/03, D-05).
 *
 * A dismissible shadcn Dialog that auto-opens exactly once per browser to
 * orient a novice ("Start here — the landing view is an ordered pathway")
 * before the raw graph competes for attention. Returning visitors — anyone
 * whose browser already carries the seen flag — never see it again.
 *
 * SSR-safety (RESEARCH Pitfall 3): the Dialog defaults to CLOSED and the
 * localStorage read happens inside a post-mount useEffect, never in a
 * useState initializer or render body. TanStack Start SSRs the shell where
 * `window`/`localStorage` are undefined; deriving open-state synchronously
 * from localStorage would produce a server/client mismatch and a flash of the
 * dialog. Flipping open one frame after mount is standard first-visit UX.
 *
 * The flag read/write mirrors the `local-progress.ts` convention: guard
 * `typeof window === "undefined"` and wrap in try/catch so a tampered or
 * malformed value degrades to a no-op rather than throwing (T-09-07). A
 * poisoned value only affects whether a dismissible dialog shows — zero
 * security impact.
 *
 * Every dismissal path — the CTA button, the built-in X, Escape, and a
 * backdrop click — flows through `onOpenChange`, which writes the seen flag
 * before closing. Unlike RegionSelector's captive flow, `onInteractOutside`
 * is intentionally NOT overridden: backdrop dismissal is allowed here.
 *
 * Self-gating: no required props. Mount it once (plan 09-10 mounts it inside
 * the home route ProgressProvider) and it decides for itself whether to show.
 */

import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * localStorage key for the one-time intro-seen flag (string "true" when set).
 *
 * Uses the verified in-repo `wc3rm:` prefix (see `local-progress.ts`:
 * `wc3rm:progress`, `wc3rm:merged`) — NOT the `wc3roadmap:` prefix assumed by
 * the UI-SPEC. Correcting this keeps the single localStorage-key convention
 * consistent across the codebase.
 */
const INTRO_SEEN_KEY = "wc3rm:pathway-intro-seen";

// ---------------------------------------------------------------------------
// PathwayIntroOverlay — named export
// ---------------------------------------------------------------------------

/**
 * First-visit intro overlay. Self-gates via localStorage — takes no props.
 */
export function PathwayIntroOverlay() {
  // Default CLOSED so the server render and the client's first paint agree
  // (Pitfall 3). The post-mount effect below is the only thing that can open it.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Post-mount localStorage check — never in the useState initializer.
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(INTRO_SEEN_KEY) !== "true") {
        setOpen(true);
      }
    } catch {
      // Tampered/unavailable storage — leave the overlay closed. No re-nag,
      // no throw (T-09-07).
    }
  }, []);

  /**
   * Single dismiss path for every close trigger (CTA / X / Escape / backdrop).
   *
   * Radix drives `onOpenChange(false)` for all of them; we persist the seen
   * flag before closing so the overlay never reappears. Writing on any close
   * — not just the CTA — means an Escape or backdrop dismiss still counts as
   * "seen".
   */
  function handleOpenChange(next: boolean): void {
    if (!next) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(INTRO_SEEN_KEY, "true");
        } catch {
          // Persisting failed — the dialog still closes for this session; the
          // worst case is it re-shows on next load. Non-fatal (T-09-07).
        }
      }
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        style={{
          backgroundColor: "var(--color-obsidian-800)",
          border: "1px solid var(--color-obsidian-600)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Start here
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.65,
              // Neutral light body text. No CSS variable exists for this role
              // (the obsidian scale is 600–950, all dark); matches the verified
              // RegionSelector precedent and the global `body` color token.
              color: "#e9e8ee",
            }}
          >
            8 fundamentals, ordered top to bottom. Click any node to learn —
            mastering them lights up your map.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            size="lg"
            onClick={() => handleOpenChange(false)}
            className="w-full bg-[var(--color-rune-500)] text-[var(--color-obsidian-950)] text-base font-semibold hover:bg-[var(--color-rune-400)] focus-visible:ring-[var(--color-rune-400)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Got it — let&apos;s start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
