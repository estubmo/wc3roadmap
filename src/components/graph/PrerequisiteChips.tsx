// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * PrerequisiteChips — clickable prerequisite chips in the node detail panel.
 *
 * D-14 (in-panel learning-path affordance): each chip represents a prerequisite
 * node. Activating a chip calls useGraphStore.getState().setSelectedNode(prereqId)
 * to swap the panel to that node (D-02 live-inspector). Handler uses getState() —
 * not a hook subscription — so chips do not re-render on unrelated store changes.
 *
 * Style: CVA-styled pills (rounded-full, obsidian-700 bg, rune-gold hover border)
 * following ADR 0001 design tokens. Full keyboard accessibility via role="button",
 * tabIndex={0}, and onKeyDown Enter/Space handling.
 *
 * Renders nothing when the prerequisites array is empty.
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import { useGraphStore } from "#/lib/graph-store";

// ---------------------------------------------------------------------------
// CVA variant definition
// ---------------------------------------------------------------------------

/**
 * CVA variants for prerequisite chips (ADR 0001 obsidian/rune-gold tokens).
 *
 * Default: obsidian-700 background, obsidian-500 border, rune-400 border on hover.
 * Focus ring uses rune-400 accent for keyboard visibility.
 */
const chipVariants = cva(
  [
    "inline-flex items-center rounded-full",
    "px-2.5 py-0.5 text-xs font-medium",
    "cursor-pointer border transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rune-400",
  ].join(" "),
  {
    variants: {
      variant: {
        /**
         * Default chip: obsidian-700 bg, muted border, rune-gold hover border.
         * Active/pressed appearance intentionally deferred to Phase 5 when real
         * mastery state is available.
         */
        default:
          "bg-obsidian-700 border-obsidian-500 text-[#e9e8ee] hover:border-rune-400 hover:bg-obsidian-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrerequisiteChipsProps extends VariantProps<typeof chipVariants> {
  /**
   * IDs of prerequisite nodes for the currently-displayed node.
   * Renders nothing when this array is empty.
   */
  prerequisites: string[];
  /**
   * Map of node ID → human-readable title used to label each chip.
   * Falls back to the raw ID for unknown entries (graceful; no hard error).
   */
  nodeTitles: Record<string, string>;
  /** Additional class names merged via `cn`. */
  className?: string;
}

// ---------------------------------------------------------------------------
// PrerequisiteChips — named export
// ---------------------------------------------------------------------------

/**
 * Renders a flex-wrapped row of clickable prerequisite chips (D-14).
 *
 * Each chip is keyboard-accessible:
 *   - `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space
 *   - Activating calls `useGraphStore.getState().setSelectedNode(prereqId)`
 *     using getState() (not a hook) so the chip list does not subscribe to
 *     the store and avoids re-renders on hover or other unrelated changes.
 *
 * Returns null when `prerequisites` is empty — no wrapper element rendered.
 */
export function PrerequisiteChips({
  prerequisites,
  nodeTitles,
  variant,
  className,
}: PrerequisiteChipsProps) {
  if (prerequisites.length === 0) return null;

  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
      aria-label="Prerequisites"
    >
      {prerequisites.map((prereqId) => {
        const label = nodeTitles[prereqId] ?? prereqId;

        const handleActivate = () => {
          // D-14 / D-02: swap the panel to the selected prerequisite node.
          // getState() avoids a hook subscription — chips never re-render due to
          // unrelated hover or filter changes in the store.
          useGraphStore.getState().setSelectedNode(prereqId);
        };

        return (
          <span
            key={prereqId}
            role="button"
            tabIndex={0}
            className={cn(chipVariants({ variant }), className)}
            onClick={handleActivate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate();
              }
            }}
            aria-label={`View prerequisite: ${label}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
