// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * MasteryBadge — small pill indicating mastery state on a graph node face.
 *
 * Renders nothing for "untouched" (no badge per UI-SPEC §Mastery State Encoding).
 * Renders "In Progress" pill for "in-progress" (rune-600 bg, rune-300 text).
 * Renders "In progress · from w3champions" when in-progress + source "auto" (D-09 panel surfacing).
 * Renders "Mastered" pill for "mastered" (rune-500 bg, obsidian-950 text).
 * Renders "Mastered · via quiz" when mastered + source "quiz" (D-14 panel surfacing).
 *
 * All colors use CSS variable references — no hardcoded hex (UI-SPEC §Color).
 * Font: 11px / 600 (semibold) per UI-SPEC §Typography §Badge.
 */

import type { MasteryState } from "#/schemas/progress";

interface MasteryBadgeProps {
  state: MasteryState;
  /**
   * Optional mastery source (D-14 / D-09). Renders "Mastered · via quiz" when
   * source === "quiz" and state === "mastered"; renders "In progress · from
   * w3champions" when source === "auto" and state === "in-progress".
   */
  source?: string;
}

/**
 * Named export for use in GraphNode and mobile node cards.
 * Returns null when state is "untouched" — no badge rendered.
 */
export function MasteryBadge({ state, source }: MasteryBadgeProps) {
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
        {/* PLACEHOLDER copy — exact wording finalized in the UI-SPEC pass
            (CONTEXT.md). Auto-detected in-progress reads distinct from a
            manual in-progress mark (D-09), reusing the same in-progress pill
            styling (no new accent color). */}
        {source === "auto" ? "In progress · from w3champions" : "In Progress"}
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
      {source === "quiz" ? "Mastered · via quiz" : "Mastered"}
    </span>
  );
}
