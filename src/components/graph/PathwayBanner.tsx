// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * PathwayBanner — pathway identity overlay with explore/back CTA.
 *
 * Renders the pathway title (Space Grotesk 22px/600, UI-SPEC §Typography
 * §Pathway heading), subtitle, and a mastery-tied completion progress bar
 * (rune-500 fill over obsidian-700 track, "{N} of {total} mastered" label;
 * "Fundamentals complete" at 100% — no fanfare, PROG-05/D-03). UI-SPEC
 * §Pathway Completion Progress Bar + §Copywriting Contract.
 *
 * CTA button:
 *   exploring=false → "Explore full map"
 *   exploring=true  → "Back to pathway"
 *
 * Button uses shadcn `outline` variant with rune-500 border color — accent
 * reserved item 7 in UI-SPEC §Color §Accent reserved list.
 *
 * No @xyflow/react import. No hardcoded hex — all colors via CSS variables.
 * The `onToggleExplore` handler is wired by the canvas/route layer (plan 10).
 */

import { AnimatePresence, motion } from "motion/react";
import { Button } from "#/components/ui/button";
import type { Pathway } from "#/schemas/pathway";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PathwayBannerProps {
  /** Active pathway providing title, subtitle, and step IDs. */
  pathway: Pathway;
  /**
   * Number of pathway steps in the `mastered` state (D-02: excludes
   * in-progress/untouched). Drives the progress-bar fill + label numerator.
   */
  masteredCount: number;
  /** Total number of pathway steps (progress-bar denominator = pathway.steps.length). */
  total: number;
  /**
   * Whether the "Explore full map" mode is currently active.
   * - false → button shows "Explore full map"
   * - true  → button shows "Back to pathway"
   */
  exploring: boolean;
  /**
   * Handler wired by the route/canvas layer (plan 10).
   * Toggles the explore state and triggers the React Flow fitView animation.
   */
  onToggleExplore: () => void;
}

// ---------------------------------------------------------------------------
// PathwayBanner — named export
// ---------------------------------------------------------------------------

/**
 * Pathway banner component.
 *
 * Positioned by the route layer (plan 10) — this component is purely visual
 * and stateless (all state lifted to the canvas/route layer).
 */
export function PathwayBanner({
  pathway,
  masteredCount,
  total,
  exploring,
  onToggleExplore,
}: PathwayBannerProps) {
  const isComplete = total > 0 && masteredCount === total;
  const fillPercent = total > 0 ? (masteredCount / total) * 100 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        paddingInline: "32px",
        paddingBlock: "12px",
        backgroundColor: "var(--color-obsidian-900)",
        borderBottom: "1px solid var(--color-obsidian-600)",
        flexWrap: "wrap",
      }}
    >
      {/* Left: pathway identity — title, subtitle, step count */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: 0,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 600,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {pathway.title}
        </h2>

        <p
          style={{
            fontSize: "13px",
            fontWeight: 400,
            lineHeight: 1.4,
            margin: 0,
            opacity: 0.7,
          }}
        >
          {pathway.subtitle}
        </p>

        {/* Mastery-tied completion progress bar (PATH-04, D-01/D-02/D-03).
            Replaces the former static "{N} of {total} nodes" line. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxWidth: "240px",
            marginTop: "2px",
          }}
        >
          {/* Track (6px, obsidian-700) + rune-500 animated fill. */}
          <div
            role="progressbar"
            aria-label="Pathway completion"
            aria-valuenow={masteredCount}
            aria-valuemin={0}
            aria-valuemax={total}
            style={{
              height: "6px",
              borderRadius: "9999px",
              backgroundColor: "var(--color-obsidian-700)",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={false}
              animate={{ width: `${fillPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                height: "100%",
                borderRadius: "9999px",
                backgroundColor: "var(--color-rune-500)",
              }}
            />
          </div>

          {/* Label below the bar — live status (13px/600/opacity 0.85).
              At 100% swaps to "Fundamentals complete" (rune-400, no fanfare). */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={isComplete ? "complete" : "progress"}
              initial={{ opacity: 0 }}
              animate={{ opacity: isComplete ? 1 : 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.4,
                margin: 0,
                color: isComplete ? "var(--color-rune-400)" : "inherit",
              }}
            >
              {isComplete
                ? "Fundamentals complete"
                : `${masteredCount} of ${total} mastered`}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: explore / back CTA — rune-500 ring per UI-SPEC accent item 7 */}
      <Button
        variant="outline"
        size="lg"
        style={{
          height: "40px",
          borderColor: "var(--color-rune-500)",
          color: "var(--color-rune-500)",
          flexShrink: 0,
        }}
        onClick={onToggleExplore}
      >
        {exploring ? "Back to pathway" : "Explore full map"}
      </Button>
    </div>
  );
}
