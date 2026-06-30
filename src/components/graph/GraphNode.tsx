// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * GraphNode — memoized custom node component for @xyflow/react.
 *
 * Serves both MECHANIC (sharp 4px corners) and CONCEPTUAL (16px rounded) node
 * types via a single component. Shape switches on `data.nodeType`.
 *
 * Renders the full D-04 node face (UI-SPEC §Node Anatomy):
 *   - Top-left: lucide type icon (Sword | BookOpen) with aria-label
 *   - Top-right: <MasteryBadge> (absent when untouched)
 *   - Center: title (15px/600, max 2 lines, ellipsis overflow)
 *   - Bottom-left: 3-dot difficulty row with aria-label
 *
 * Three mastery states (D-05, UI-SPEC §Mastery State Encoding):
 *   untouched   — obsidian-800 bg, 1px obsidian-600 border, no glow
 *   in-progress — obsidian-800 bg, 2px rune-600 border, soft ambient glow
 *   mastered    — rune-500-tinted bg, 2px rune-500 border, strong glow
 *
 * All colors use CSS variable references — no hardcoded hex.
 *
 * Faction-tint hook (D-07): dormant for race: agnostic. A code path keyed on
 * data.race would apply --color-faction-* but is a no-op for "agnostic".
 * v1 content is all agnostic; this hook is built for future race-specific
 * branches (v2, RACE-01..05).
 *
 * React.memo from first commit — GRAPH-06 requirement (memoization at birth,
 * not retrofitted). Named inner function for React DevTools label.
 */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Sword, BookOpen } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "#/lib/utils";
import type { GraphDisplayNode } from "#/schemas/graph";
import type { MasteryState } from "#/lib/mock-mastery";
import { useGraphStore } from "#/lib/graph-store";
import { MasteryBadge } from "./MasteryBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Node data type: GraphDisplayNode fields + masteryState from mock-mastery. */
type GraphNodeData = GraphDisplayNode & {
  masteryState: MasteryState;
};

// ---------------------------------------------------------------------------
// CVA variant map — mastery × shape (D-05, D-06)
// ---------------------------------------------------------------------------

/**
 * class-variance-authority variant map for the node container.
 *
 * Mastery dimension:
 *   untouched   — obsidian-800 bg, thin obsidian border, no glow
 *   in-progress — obsidian-800 bg, rune-600 ring, soft glow
 *   mastered    — rune-500 tinted bg, rune-500 ring, strong glow
 *
 * Shape dimension:
 *   mechanic    — rounded-sm  (4px)
 *   conceptual  — rounded-2xl (16px)
 *
 * Colors MUST be CSS variable inline-style references — Tailwind does not
 * have generated classes for our custom design tokens (see UI-SPEC §Color).
 * CVA provides the class structure; inline styles carry the token values.
 */
const nodeVariants = cva(
  // Base: fixed dimensions + internal padding + flex column layout
  "relative flex flex-col justify-between p-2 overflow-hidden",
  {
    variants: {
      masteryState: {
        untouched: "node-untouched",
        "in-progress": "node-in-progress",
        mastered: "node-mastered",
      },
      nodeType: {
        MECHANIC: "rounded-sm",
        CONCEPTUAL: "rounded-2xl",
      },
    },
    defaultVariants: {
      masteryState: "untouched",
      nodeType: "MECHANIC",
    },
  }
);

// ---------------------------------------------------------------------------
// Mastery style maps — inline styles for token-based colors
// ---------------------------------------------------------------------------

/** Inline styles per mastery state (tokens can't be Tailwind utility classes). */
const masteryStyles: Record<MasteryState, React.CSSProperties> = {
  untouched: {
    width: "160px",
    height: "80px",
    backgroundColor: "var(--color-obsidian-800)",
    border: "1px solid var(--color-obsidian-600)",
    boxShadow: "none",
  },
  "in-progress": {
    width: "160px",
    height: "80px",
    backgroundColor: "var(--color-obsidian-800)",
    border: "2px solid var(--color-rune-600)",
    boxShadow:
      "0 0 8px 1px color-mix(in oklab, var(--color-rune-600) 30%, transparent)",
  },
  mastered: {
    width: "160px",
    height: "80px",
    backgroundColor:
      "color-mix(in oklab, var(--color-rune-500) 15%, var(--color-obsidian-800))",
    border: "2px solid var(--color-rune-500)",
    boxShadow:
      "0 0 16px 4px color-mix(in oklab, var(--color-rune-500) 40%, transparent)",
  },
};

// ---------------------------------------------------------------------------
// Difficulty dot helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_ARIA: Record<GraphDisplayNode["difficulty"], string> = {
  beginner: "Beginner difficulty",
  intermediate: "Intermediate difficulty",
  advanced: "Advanced difficulty",
};

const DIFFICULTY_FILLED: Record<GraphDisplayNode["difficulty"], number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

// ---------------------------------------------------------------------------
// Faction-tint hook (D-07) — DORMANT for race: agnostic
// ---------------------------------------------------------------------------

/**
 * Returns the CSS faction tint color for a given race, or undefined for
 * "agnostic". Hook is built but inert for v1 content (all agnostic).
 *
 * @see UI-SPEC §Faction colors — "faction tint hook is implemented in Phase 2
 *   for MECHANIC/CONCEPTUAL node type encoding, but v1 content is all
 *   race: agnostic so tints remain dormant."
 *
 * v2 (RACE-01..05): remove the "agnostic" guard to activate.
 */
function getFactionTint(
  race: GraphDisplayNode["race"]
): string | undefined {
  if (race === "agnostic") {
    // v1: no faction tint applied — all content is race-agnostic
    return undefined;
  }
  // v2+: map race to faction CSS variable
  const factionMap: Record<string, string> = {
    human: "var(--color-faction-human)",
    orc: "var(--color-faction-orc)",
    nightelf: "var(--color-faction-nightelf)",
    undead: "var(--color-faction-undead)",
  };
  return factionMap[race];
}

// ---------------------------------------------------------------------------
// GraphNode — the component
// ---------------------------------------------------------------------------

/**
 * Memoized custom node for @xyflow/react. Handles both MECHANIC and CONCEPTUAL
 * node types. React.memo from first commit (GRAPH-06).
 */
export const GraphNode = memo(function GraphNode({ data }: NodeProps) {
  const d = data as GraphNodeData;
  const { masteryState, nodeType, difficulty, race, title } = d;

  // Subscribe to sourceMap for this node (D-14 canvas visual — ADR 002/005).
  // Source MUST be read from the store only; never from the graph projection.
  const masterySource = useGraphStore((s) => s.sourceMap[d.id]);

  // Faction tint hook (dormant for agnostic — v1 is all agnostic)
  const _factionTint = getFactionTint(race);
  // _factionTint would be applied to the node accent layer in v2.
  // Currently unused — suppress unused-variable lint with void:
  void _factionTint;

  const filledDots = DIFFICULTY_FILLED[difficulty];
  const difficultyAriaLabel = DIFFICULTY_ARIA[difficulty];

  const typeIconAriaLabel =
    nodeType === "MECHANIC" ? "Mechanic node" : "Conceptual node";

  return (
    <div
      className={cn(
        nodeVariants({ masteryState, nodeType })
      )}
      style={masteryStyles[masteryState]}
    >
      {/* React Flow handles — invisible, at top and bottom edges */}
      <Handle
        type="target"
        position={Position.Top}
        className="invisible"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="invisible"
      />

      {/* Top row: type icon (left) + quiz marker + mastery badge (right) */}
      <div className="flex items-start justify-between gap-1">
        <span aria-label={typeIconAriaLabel} role="img">
          {nodeType === "MECHANIC" ? (
            <Sword
              size={16}
              style={{ color: "currentColor" }}
              aria-hidden="true"
            />
          ) : (
            <BookOpen
              size={16}
              style={{ color: "currentColor" }}
              aria-hidden="true"
            />
          )}
        </span>
        {/* Right-side slot: quiz-source marker + mastery badge */}
        <div className="flex items-center gap-1">
          {/* Quiz-mastered canvas marker (D-14, PROG-05 anti-gamification).
              A single rune-400 glyph — source distinction only, never a reward. */}
          {masterySource === "quiz" && masteryState === "mastered" && (
            <span
              aria-label="Mastered via quiz"
              style={{
                fontSize: "9px",
                color: "var(--color-rune-400)",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ◆
            </span>
          )}
          <MasteryBadge state={masteryState} source={masterySource} />
        </div>
      </div>

      {/* Title: 15px / 600, max 2 lines, ellipsis */}
      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          lineHeight: 1.25,
          color: "inherit",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        {title}
      </div>

      {/* Bottom row: difficulty dots (left) */}
      <div
        className="flex items-center gap-1"
        aria-label={difficultyAriaLabel}
        role="img"
      >
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "9999px",
              backgroundColor:
                dot <= filledDots
                  ? "currentColor"
                  : "var(--color-obsidian-600)",
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
});
