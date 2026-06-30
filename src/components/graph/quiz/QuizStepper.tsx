// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * QuizStepper — one-question-at-a-time quiz stepper (D-10).
 *
 * Renders a single QuizQuestion with:
 *   - Progress label: "Question {i+1} of {total}"
 *   - A Next button that is DISABLED until the user has selected an option
 *     (D-10 gate: cannot advance without answering)
 *   - No per-question correctness reveal mid-quiz (D-10)
 *   - On the last question, the Next button label becomes "See results"
 *
 * Pure presentational: props in, callbacks out. All state lives in the host.
 *
 * Anti-gamification enforcement (PROG-05):
 *   Renders no score, no percentage, no streak, no XP during the quiz.
 *   Only "Question i of N" progress is shown.
 */

import type { QuizQuestion as QuizQuestionType } from "#/schemas/node";
import { QuizQuestion } from "#/components/graph/quiz/QuizQuestion";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuizStepperProps {
  /** The current question to display. */
  question: QuizQuestionType;
  /** Zero-based index of the current question. */
  questionIndex: number;
  /** Total number of questions in the quiz. */
  totalQuestions: number;
  /** Index of the currently selected option, or null if not yet answered. */
  selectedIndex: number | null;
  /** Called when the user selects an option in the current question. */
  onSelect: (i: number) => void;
  /** Called when the user clicks Next / See results. */
  onNext: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Stepper shell that presents one question at a time and gates progress
 * behind an answered state (D-10).
 */
export function QuizStepper({
  question,
  questionIndex,
  totalQuestions,
  selectedIndex,
  onSelect,
  onNext,
}: QuizStepperProps) {
  const isLastQuestion = questionIndex === totalQuestions - 1;
  const canAdvance = selectedIndex !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Progress label — no score, only position (D-10, PROG-05) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          Question {questionIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Progress bar — positional only, not score-bearing */}
      <div
        style={{
          height: "3px",
          backgroundColor: "var(--color-obsidian-600)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((questionIndex) / totalQuestions) * 100}%`,
            backgroundColor: "var(--color-rune-500)",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* The current question with its options */}
      <QuizQuestion
        question={question}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
      />

      {/* Next / See results — disabled until an option is selected (D-10 gate) */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        style={{
          width: "100%",
          height: "40px",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          lineHeight: 1.2,
          cursor: canAdvance ? "pointer" : "not-allowed",
          fontFamily: "var(--font-sans)",
          backgroundColor: canAdvance
            ? "var(--color-rune-500)"
            : "var(--color-obsidian-700)",
          color: canAdvance
            ? "var(--color-obsidian-950)"
            : "var(--color-obsidian-600)",
          opacity: canAdvance ? 1 : 0.6,
          transition: "background-color 0.15s, color 0.15s, opacity 0.15s",
        }}
        aria-disabled={!canAdvance}
      >
        {isLastQuestion ? "See results" : "Next"}
      </button>
    </div>
  );
}
