// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * QuizResults — pass/fail results screen with missed-question explanations (D-06).
 *
 * Anti-gamification enforcement (D-06, PROG-05):
 *   - Renders NO score percentage, NO points, NO XP, NO streaks, NO badges
 *   - Shows only: a pass/fail headline, the list of missed questions + their
 *     explanations, and a Retry button
 *   - Does NOT show the correct answer text — only the explanation (active-recall
 *     principle: the player must re-attempt to retrieve the correct answer)
 *
 * Pure presentational: props in, onRetry callback out. No side effects.
 */

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MissedQuestion {
  /** The question text that was answered incorrectly. */
  text: string;
  /** The author-written explanation — WHY the correct answer is right. */
  explanation: string;
}

interface QuizResultsProps {
  /** True if the player passed the quiz (correctCount >= threshold). */
  passed: boolean;
  /** Number of questions answered correctly. */
  correctCount: number;
  /** Total number of questions in the quiz. */
  total: number;
  /** Missed questions with their explanations (empty array if all correct). */
  missedQuestions: MissedQuestion[];
  /** Called when the user clicks Retry — the host reshuffles and resets state. */
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Results screen shown after completing a quiz.
 *
 * Displays pass/fail state and missed questions with explanations.
 * Never displays score percentage or points (PROG-05, D-06).
 */
export function QuizResults({
  passed,
  correctCount,
  total,
  missedQuestions,
  onRetry,
}: QuizResultsProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Pass / fail headline — text only, no numeric score or percentage */}
      <div
        style={{
          textAlign: "center",
          paddingBlock: "8px",
        }}
      >
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            lineHeight: 1.2,
            fontFamily: "var(--font-display)",
            color: passed ? "var(--color-rune-400)" : "#9998a8",
            marginBottom: "6px",
          }}
        >
          {passed ? "Assessment passed" : "Not quite yet"}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 400,
            lineHeight: 1.5,
            color: "#9998a8",
            fontFamily: "var(--font-sans)",
          }}
        >
          {passed
            ? correctCount === total
              ? "You answered every question correctly."
              : `You answered ${correctCount} of ${total} questions correctly.`
            : `You answered ${correctCount} of ${total} questions correctly. Review the explanations below and try again.`}
        </div>
      </div>

      {/* Missed questions + explanations — active recall: shows explanation only, not the correct answer */}
      {missedQuestions.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9998a8",
              fontFamily: "var(--font-sans)",
            }}
          >
            Review
          </span>

          {missedQuestions.map((q, i) => (
            <div
              key={i}
              style={{
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid var(--color-obsidian-600)",
                backgroundColor: "var(--color-obsidian-800)",
              }}
            >
              {/* Question text */}
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color: "var(--color-rune-300)",
                  marginBottom: "8px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {q.text}
              </div>

              {/* Explanation — WHY the correct answer is right; no correct option text shown */}
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: "#9998a8",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {q.explanation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retry button — triggers reshuffle + full reset (D-06) */}
      <button
        type="button"
        onClick={onRetry}
        style={{
          width: "100%",
          height: "40px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          lineHeight: 1.2,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          backgroundColor: passed
            ? "var(--color-obsidian-700)"
            : "var(--color-rune-600)",
          color: passed ? "#9998a8" : "var(--color-rune-300)",
          border: passed
            ? "1px solid var(--color-obsidian-600)"
            : "none",
          transition: "background-color 0.15s",
        }}
      >
        {passed ? "Retake assessment" : "Try again"}
      </button>
    </div>
  );
}
