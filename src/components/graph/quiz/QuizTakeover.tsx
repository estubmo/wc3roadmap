// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * QuizTakeover — in-panel takeover host for the self-assessment flow (QUIZ-01/02/03, D-09/D-10).
 *
 * Orchestrates the full quiz lifecycle:
 *   1. Shuffled question order + shuffled option order via `prepareQuiz` (D-06).
 *   2. One-question-at-a-time stepping via `QuizStepper` (D-10).
 *   3. Grade on completion via `gradeAnswers` (QUIZ-02, D-05 pass thresholds).
 *   4. Results screen via `QuizResults` — missed questions + explanations (D-06).
 *   5. Fires `useQuizPassMutation` ONLY on a true pass — never on fail (Pitfall 5 / T-06-17).
 *   6. Retry reshuffles the question+option order and resets all state (D-06).
 *
 * Pass-gate implementation (T-06-17, T-06-18):
 *   The mutation fires inside the `handleNext` event handler when the last question
 *   is answered AND `gradeAnswers.passed === true`. It never fires inside a useEffect
 *   or on re-render. A single conditional `if (result.passed)` before `.mutate()` is
 *   the complete protection — deterministic, not state-guarded, not ref-guarded.
 *
 * Node learning prose is NOT rendered here (D-09 active recall): this component
 * replaces the entire panel body while the quiz is open. The close button restores
 * NodePanelContent's normal content view.
 *
 * Anti-gamification (PROG-05, D-06):
 *   - No score percentage, XP, or streak text is rendered anywhere in this flow.
 *   - Pass/fail headline only (delegated to QuizResults).
 *
 * Composing:
 *   - `QuizStepper` (06-09 primitive) — current question + next-gate
 *   - `QuizResults` (06-09 primitive) — pass/fail + missed explanations + retry
 *   - `gradeAnswers` / `prepareQuiz` (06-04 grading engine)
 *   - `useQuizPassMutation` (06-08 persistence seam)
 */

import { useState } from "react";
import type { Quiz } from "#/schemas/node";
import { prepareQuiz, gradeAnswers } from "#/lib/quiz-grading";
import { useQuizPassMutation } from "#/hooks/useQuizPassMutation";
import { QuizStepper } from "#/components/graph/quiz/QuizStepper";
import { QuizResults } from "#/components/graph/quiz/QuizResults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuizTakeoverProps {
  /**
   * The node's quiz questions (original unshuffled array from content-collections).
   * `prepareQuiz` shuffles internally; the original is not mutated.
   */
  quiz: Quiz;
  /** The content node ID whose mastery is being assessed. */
  nodeId: string;
  /** Called when the user exits the quiz. Host sets `quizOpen = false`. */
  onClose: () => void;
}

/** Grade result stored when transitioning from the quiz phase to the results phase. */
interface GradeResult {
  passed: boolean;
  correctCount: number;
  missedIndexes: number[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full quiz flow host — steps through questions, grades on completion,
 * reveals missed explanations, and persists mastery only on a true pass.
 *
 * Renders in place of NodePanelContent's body content (D-09).
 * Closing returns the panel to its normal learning content view.
 */
export function QuizTakeover({ quiz, nodeId, onClose }: QuizTakeoverProps) {
  // Obtain the pass mutation — called only when gradeAnswers.passed === true.
  const mutation = useQuizPassMutation();

  // Shuffled question set — lazy-initialized on first render; re-created on retry (D-06).
  const [shuffled, setShuffled] = useState(() => prepareQuiz(quiz));

  // Per-question selection: index of the chosen option, or null when unanswered.
  // Initialized to an array of nulls matching the quiz length.
  const [selectedOptionIndexes, setSelectedOptionIndexes] = useState<
    (number | null)[]
  >(() => Array<null>(quiz.length).fill(null));

  // Zero-based index of the currently displayed question.
  const [currentIndex, setCurrentIndex] = useState(0);

  // Phase controls which view is shown to the player.
  const [phase, setPhase] = useState<"quiz" | "results">("quiz");

  // Grade stored when transitioning to results; null during the quiz phase.
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Record the player's selection for the current question. */
  function handleSelect(optionIndex: number) {
    setSelectedOptionIndexes((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  }

  /**
   * Advance to the next question, or — on the last question — grade and
   * transition to the results phase.
   *
   * Pitfall 5 / T-06-17: the mutation fires ONLY inside `if (result.passed)`.
   * T-06-18: firing here (in the event handler) rather than in useEffect means
   * concurrent re-renders cannot double-fire the mutation.
   */
  function handleNext() {
    if (currentIndex < shuffled.length - 1) {
      // Not the last question — advance the stepper.
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Last question answered — grade the full attempt.
    const result = gradeAnswers(shuffled, selectedOptionIndexes);
    setGradeResult(result);
    setPhase("results");

    // CRITICAL (Pitfall 5 — T-06-17): call the mutation ONLY on a genuine pass.
    // `recordQuizPass` stamps mastered unconditionally on the server, so this
    // client gate is the sole protection against stamping mastery on a failed attempt.
    if (result.passed) {
      mutation.mutate({ nodeId });
    }
  }

  /**
   * Reset the quiz for another attempt — reshuffles question and option order (D-06).
   *
   * `prepareQuiz` shuffles both question order and each question's option order,
   * so the retry presents genuinely different ordering (active recall principle).
   */
  function handleRetry() {
    setShuffled(prepareQuiz(quiz));
    setSelectedOptionIndexes(Array<null>(quiz.length).fill(null));
    setCurrentIndex(0);
    setPhase("quiz");
    setGradeResult(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* Header: "Assessment" label + close affordance */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-obsidian-600)",
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
          Assessment
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assessment"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            color: "#9998a8",
            fontSize: "16px",
            lineHeight: 1,
            fontFamily: "var(--font-sans)",
            borderRadius: "4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Quiz body: stepper during quiz phase, results after grading */}
      {phase === "quiz" ? (
        <QuizStepper
          question={shuffled[currentIndex]!}
          questionIndex={currentIndex}
          totalQuestions={shuffled.length}
          selectedIndex={selectedOptionIndexes[currentIndex] ?? null}
          onSelect={handleSelect}
          onNext={handleNext}
        />
      ) : (
        gradeResult !== null && (
          <QuizResults
            passed={gradeResult.passed}
            correctCount={gradeResult.correctCount}
            total={shuffled.length}
            missedQuestions={gradeResult.missedIndexes.map((idx) => ({
              text: shuffled[idx]!.text,
              explanation: shuffled[idx]!.explanation,
            }))}
            onRetry={handleRetry}
          />
        )
      )}
    </div>
  );
}
