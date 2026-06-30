// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * MasteryControls — three-state mastery selector for the node detail panel (PROG-04).
 *
 * Renders a shadcn ToggleGroup with three mutually-exclusive states:
 *   Untouched | In Progress | Mastered
 *
 * On selection change, fires `useProgressMutation().mutate({ nodeId, masteryState })`
 * for the new state (optimistic update → server persist / localStorage, D-09).
 *
 * Anti-gamification enforcement (PROG-05, ROADMAP criterion 4, D-10):
 *   This component renders NO count, percentage, XP, streak, or leaderboard text.
 *   Progress is surfaced per-node only — the state button and the node's mastery
 *   color on the graph canvas are the ONLY progress signals.
 *
 * Placement: top of NodePanelContent, above "How to Apply" section (D-01).
 * Layout: "Mastery" label → ToggleGroup → optional signed-out hint caption.
 *
 * Active-state colors mirror the mastery color contract from UI-SPEC (also used
 * by MasteryBadge and GraphNode) — all via CSS variables, no hardcoded hex.
 *
 * Accessibility:
 *   - ToggleGroup renders role="group" with aria-label="Mastery state"
 *   - Each item renders aria-pressed (Radix ToggleGroupItem primitive)
 *   - Keyboard: Tab to enter group, Arrow keys cycle items
 */

import { useSession } from "#/lib/auth-client";
import type { MasteryState } from "#/schemas/progress";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useProgressMutation } from "#/hooks/useProgressMutation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MasteryControlsProps {
  /** The content node ID whose mastery state is being displayed and edited. */
  nodeId: string;
  /** The node's current mastery state (controlled — drives ToggleGroup value). */
  currentState: MasteryState;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Three-state mastery controls for use inside the node detail panel.
 *
 * Renders no count, aggregate, XP, streak, or leaderboard text (D-10, PROG-05).
 */
export function MasteryControls({ nodeId, currentState }: MasteryControlsProps) {
  const mutation = useProgressMutation();
  const { data: session } = useSession();

  function handleValueChange(newValue: string) {
    // ToggleGroup may fire onValueChange with "" when the active item is clicked again
    // (deselect attempt on a single-select group). Ignore empty / unchanged values.
    if (!newValue || newValue === currentState) return;
    mutation.mutate({
      nodeId,
      masteryState: newValue as MasteryState,
    });
  }

  return (
    <div
      style={{
        paddingBlock: "16px",
        borderBottom: "1px solid var(--color-obsidian-600)",
        marginBottom: "16px",
      }}
    >
      {/* Section label (13px / 600 — compact variant per UI-SPEC §Typography) */}
      <span
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: 1.2,
          color: "#9998a8",
          marginBottom: "8px",
        }}
      >
        Mastery
      </span>

      {/* Three-state toggle group (UI-SPEC §MasteryControls Component) */}
      <ToggleGroup
        type="single"
        value={currentState}
        onValueChange={handleValueChange}
        aria-label="Mastery state"
        style={{
          display: "flex",
          width: "100%",
          gap: "4px",
        }}
      >
        <ToggleGroupItem
          value="untouched"
          aria-label="Untouched"
          style={getButtonStyle("untouched", currentState)}
        >
          Untouched
        </ToggleGroupItem>

        <ToggleGroupItem
          value="in-progress"
          aria-label="In Progress"
          style={getButtonStyle("in-progress", currentState)}
        >
          In Progress
        </ToggleGroupItem>

        <ToggleGroupItem
          value="mastered"
          aria-label="Mastered"
          style={getButtonStyle("mastered", currentState)}
        >
          Mastered
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Signed-out hint (UI-SPEC §Signed-Out State) */}
      {!session && (
        <span
          style={{
            display: "block",
            marginTop: "8px",
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: 1.4,
            color: "#9998a8",
          }}
        >
          Sign in with Battle.net to save your progress across devices
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns inline style for a mastery state button based on its active/inactive status.
 *
 * Mirrors the UI-SPEC §Mastery State Color Contract for the MasteryControls surface.
 * All colors reference CSS variables from app.css (ADR 0001 design tokens).
 */
function getButtonStyle(
  buttonState: MasteryState,
  currentState: MasteryState
): React.CSSProperties {
  const isActive = buttonState === currentState;

  // Base dimensions (UI-SPEC §MasteryControls — Button dimensions)
  const base: React.CSSProperties = {
    flex: 1,
    height: "36px",
    padding: 0,
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.2,
    cursor: "pointer",
    border: "none",
  };

  if (!isActive) {
    // Inactive button: obsidian-800 bg, subdued text, obsidian-600 border
    return {
      ...base,
      backgroundColor: "var(--color-obsidian-800)",
      color: "#9998a8",
      border: "1px solid var(--color-obsidian-600)",
    };
  }

  // Active button colors per mastery state (UI-SPEC §Mastery State Color Contract)
  switch (buttonState) {
    case "untouched":
      return {
        ...base,
        backgroundColor: "var(--color-obsidian-800)",
        color: "#e9e8ee",
        border: "1px solid var(--color-obsidian-600)",
      };
    case "in-progress":
      return {
        ...base,
        backgroundColor: "var(--color-rune-600)",
        color: "var(--color-rune-300)",
        border: "none",
      };
    case "mastered":
      return {
        ...base,
        backgroundColor: "var(--color-rune-500)",
        color: "var(--color-obsidian-950)",
        border: "none",
      };
  }
}
