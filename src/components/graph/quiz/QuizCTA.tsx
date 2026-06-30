// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * QuizCTA — self-gating "Take Assessment" / "Retake assessment" button (D-04/D-11/D-15).
 *
 * Gating (D-04, criterion 1):
 *   - Returns `null` for MECHANIC nodes (no quiz concept applies).
 *   - Returns `null` for CONCEPTUAL nodes without a quiz (`hasQuiz=false`).
 *   - Renders a button for CONCEPTUAL nodes that have a quiz.
 *
 * Label (D-11/D-15):
 *   - "Retake assessment" when the node is mastered specifically via quiz
 *     (`currentState === "mastered" && currentSource === "quiz"`).
 *   - "Take Assessment" for every other mastery state or source combination.
 *   - The button is always rendered when the gate passes — not hidden when
 *     mastered (D-15: allow reassessment regardless of mastery state).
 *
 * Styling: uses obsidian/rune CSS-variable tokens to visually distinguish this
 * CTA from the three mastery toggle buttons in MasteryControls.
 *
 * Pure presentational: no hooks, no side effects. `onStart` callback fires on click.
 *
 * Security (T-06-19): The CONCEPTUAL+hasQuiz gate is enforced in this component and
 * unit-tested (D-04). A MECHANIC node or quiz-less CONCEPTUAL node can never present
 * a quiz CTA regardless of the surrounding context.
 */

import type { MasteryState } from "#/schemas/progress";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuizCTAProps {
  /** The content node ID (passed through to the host's onStart for context). */
  nodeId: string;
  /** The node type — only CONCEPTUAL nodes can have quizzes (D-04). */
  nodeType: "MECHANIC" | "CONCEPTUAL";
  /** Whether the node has a quiz in its content frontmatter (D-04). */
  hasQuiz: boolean;
  /** The node's current mastery state — drives the label (D-11/D-15). */
  currentState: MasteryState;
  /**
   * The mastery source — used to distinguish quiz-mastered from manually-mastered
   * nodes for the label (D-11/D-15). Undefined when no mastery record exists.
   */
  currentSource?: string;
  /** Called when the user clicks the button. Host manages quiz-open state. */
  onStart: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Self-gating quiz CTA button for the node detail panel.
 *
 * Returns null immediately for any context where a quiz cannot apply (D-04).
 * When rendered, the label reflects whether the user has already passed the quiz
 * via this exact mechanism (D-11/D-15).
 */
export function QuizCTA({
  nodeType,
  hasQuiz,
  currentState,
  currentSource,
  onStart,
}: QuizCTAProps) {
  // D-04 gate: only CONCEPTUAL nodes with a quiz get this CTA.
  if (nodeType !== "CONCEPTUAL" || !hasQuiz) {
    return null;
  }

  // D-11/D-15: show "Retake" only when the node is MASTERED via quiz specifically.
  // Any other mastery state (untouched, in-progress) or any other source (manual,
  // auto, undefined) gets the default "Take Assessment" label.
  const hasQuizPassed = currentState === "mastered" && currentSource === "quiz";
  const label = hasQuizPassed ? "Retake assessment" : "Take Assessment";

  return (
    <div
      style={{
        paddingBlock: "12px",
        borderBottom: "1px solid var(--color-obsidian-600)",
        marginBottom: "16px",
      }}
    >
      <button
        type="button"
        onClick={onStart}
        style={{
          width: "100%",
          height: "36px",
          padding: 0,
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          lineHeight: 1.2,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          // Obsidian-700 background with rune-400 text and rune-600 border —
          // visually distinct from the rune-500/rune-600 mastery toggle buttons.
          backgroundColor: "var(--color-obsidian-700)",
          color: "var(--color-rune-400)",
          border: "1px solid var(--color-rune-600)",
          transition: "background-color 0.15s, border-color 0.15s",
        }}
      >
        {label}
      </button>
    </div>
  );
}
