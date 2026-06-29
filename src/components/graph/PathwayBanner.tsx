// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * PathwayBanner — pathway identity overlay with explore/back CTA.
 *
 * Renders the pathway title (Space Grotesk 22px/600, UI-SPEC §Typography
 * §Pathway heading), subtitle, and a step-count label "{N} of {total} nodes"
 * (UI-SPEC §Copywriting Contract).
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

import { Button } from "#/components/ui/button";
import type { Pathway } from "#/schemas/pathway";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PathwayBannerProps {
  /** Active pathway providing title, subtitle, and step IDs. */
  pathway: Pathway;
  /** Total number of nodes in the graph (denominator of the step-count label). */
  totalNodes: number;
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
  totalNodes,
  exploring,
  onToggleExplore,
}: PathwayBannerProps) {
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

        <p
          style={{
            fontSize: "13px",
            fontWeight: 400,
            lineHeight: 1.4,
            margin: 0,
            opacity: 0.5,
          }}
        >
          {pathway.steps.length} of {totalNodes} nodes
        </p>
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
