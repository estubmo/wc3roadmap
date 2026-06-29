// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * MasteryBadge — small pill indicating mastery state on a graph node face.
 *
 * Renders nothing for "untouched" (no badge per UI-SPEC §Mastery State Encoding).
 * Renders "Learning" pill for "in-progress" (rune-600 bg, rune-300 text).
 * Renders "Mastered" pill for "mastered" (rune-500 bg, obsidian-950 text).
 *
 * All colors use CSS variable references — no hardcoded hex (UI-SPEC §Color).
 * Font: 11px / 600 (semibold) per UI-SPEC §Typography §Badge.
 */

import type { MasteryState } from "#/lib/mock-mastery";

interface MasteryBadgeProps {
  state: MasteryState;
}

/**
 * Named export for use in GraphNode and mobile node cards.
 * Returns null when state is "untouched" — no badge rendered.
 */
export function MasteryBadge({ state }: MasteryBadgeProps) {
  if (state === "untouched") {
    return null;
  }

  if (state === "in-progress") {
    return (
      <span
        style={{
          backgroundColor: "var(--color-rune-600)",
          color: "var(--color-rune-300)",
          fontSize: "11px",
          fontWeight: 600,
          lineHeight: 1.2,
          paddingInline: "6px",
          paddingBlock: "2px",
          borderRadius: "9999px",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        Learning
      </span>
    );
  }

  // state === "mastered"
  return (
    <span
      style={{
        backgroundColor: "var(--color-rune-500)",
        color: "var(--color-obsidian-950)",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.2,
        paddingInline: "6px",
        paddingBlock: "2px",
        borderRadius: "9999px",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      Mastered
    </span>
  );
}
