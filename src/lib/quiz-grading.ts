// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Quiz grading engine — pure, dependency-free utility module (QUIZ-02).
 *
 * Deep-module contract: a single import gives callers everything they need
 * to prepare, display, and grade a quiz:
 *
 *   prepareQuiz(questions)         → shuffled questions with shuffled options
 *   gradeAnswers(questions, picks) → { passed, correctCount, missedIndexes }
 *
 * Implementation details (pass-rule table, Fisher-Yates, index math) are
 * hidden behind this minimal interface.
 *
 * Pass-threshold decisions (D-05):
 *   3q → 3/3 (100%) — all three required; "at most one wrong" does NOT apply
 *   4q → 3/4 (75%)
 *   5q → 4/5 (80%)
 *
 * The 3-question case is intentionally stricter: authors must ensure all
 * three questions are fair (no cheap distractors). This is an explicit
 * design decision, not a rounding artefact (Pitfall 2).
 *
 * Grading operates on shuffled option indexes directly — because options are
 * shuffled BY VALUE (not index-remapped), `selectedOptionIndexes[i]` maps to
 * `shuffledQuestions[i].options[selectedIdx]` which carries the canonical
 * `isCorrect` flag. No translation layer is needed.
 *
 * Client-side grading keeps the answer key off the server. The server fn
 * (quiz.ts) is invoked only on a true pass (T-06-07 accepted tradeoff,
 * documented in ADR 010).
 */

import type { QuizQuestion } from "#/schemas/node";

// ---------------------------------------------------------------------------
// Pass threshold table (D-05)
// ---------------------------------------------------------------------------

/**
 * Explicit pass-threshold lookup per question count (D-05).
 *
 * Key: total question count (must be 3, 4, or 5).
 * Value: minimum correct answers required to pass.
 *
 * IMPORTANT: the 3-question case requires ALL THREE correct (3/3 = 100%).
 * "At most one wrong" only applies to 4q (3/4) and 5q (4/5).
 * This is D-05's explicit table — do not derive from a formula.
 */
export const PASS_THRESHOLD: Record<number, number> = {
  3: 3, // 3/3 — 100% (3q authors must make all questions fair — no cheap distractors)
  4: 3, // 3/4 — 75%
  5: 4, // 4/5 — 80%
} as const;

// ---------------------------------------------------------------------------
// gradeQuiz
// ---------------------------------------------------------------------------

/**
 * Determine quiz pass/fail from the raw correct-answer count.
 *
 * @param total        - Total number of quiz questions (must be 3, 4, or 5).
 * @param correctCount - Number of questions the user answered correctly.
 * @returns            True if correctCount meets or exceeds the D-05 threshold.
 * @throws             Error if `total` is not a valid quiz length (3, 4, or 5).
 */
export function gradeQuiz(total: number, correctCount: number): boolean {
  const threshold = PASS_THRESHOLD[total];
  if (threshold === undefined) {
    throw new Error(
      `gradeQuiz: invalid question count ${total}; must be 3, 4, or 5 (QUIZ-01 / D-05)`,
    );
  }
  return correctCount >= threshold;
}

// ---------------------------------------------------------------------------
// gradeAnswers
// ---------------------------------------------------------------------------

/**
 * Grade a completed quiz attempt against the shuffled question set.
 *
 * A question is counted correct only when:
 *   - `selectedOptionIndexes[i]` is a non-null number, AND
 *   - `shuffledQuestions[i].options[selectedIdx].isCorrect === true`
 *
 * Unanswered questions (null) are always counted as missed.
 *
 * @param shuffledQuestions     - Questions in shuffled display order (from prepareQuiz).
 * @param selectedOptionIndexes - User's selected option index per question; null = unanswered.
 * @returns Object with `passed` (boolean), `correctCount` (number), and
 *          `missedIndexes` (array of question indexes the user got wrong or skipped).
 */
export function gradeAnswers(
  shuffledQuestions: QuizQuestion[],
  selectedOptionIndexes: (number | null)[],
): { passed: boolean; correctCount: number; missedIndexes: number[] } {
  let correctCount = 0;
  const missedIndexes: number[] = [];

  for (let i = 0; i < shuffledQuestions.length; i++) {
    const q = shuffledQuestions[i];
    const selectedIdx = selectedOptionIndexes[i];
    const isCorrect =
      selectedIdx !== null && q.options[selectedIdx]?.isCorrect === true;

    if (isCorrect) {
      correctCount++;
    } else {
      missedIndexes.push(i);
    }
  }

  return {
    passed: gradeQuiz(shuffledQuestions.length, correctCount),
    correctCount,
    missedIndexes,
  };
}

// ---------------------------------------------------------------------------
// shuffle (Fisher-Yates)
// ---------------------------------------------------------------------------

/**
 * Return a new randomly shuffled copy of the input array.
 *
 * Uses Fisher-Yates (Knuth) shuffle on a shallow copy so the source array
 * and its elements are never mutated. Safe to call on frozen/const arrays
 * (e.g. MDX-sourced content-collections data).
 *
 * @param arr - Source array (not mutated).
 * @returns   A new array containing the same elements in a random order.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// prepareQuiz
// ---------------------------------------------------------------------------

/**
 * Prepare a quiz for display by shuffling both the question order and each
 * question's option order.
 *
 * Grading works directly on the shuffled result: because options are shuffled
 * BY VALUE (carrying their `isCorrect` flags), no canonical-index remapping is
 * needed when evaluating user selections.
 *
 * Call again (with the original questions) to reshuffle on retry (D-06).
 *
 * @param questions - Source quiz questions (not mutated — spread-copied internally).
 * @returns         New array of questions with shuffled order and shuffled options.
 */
export function prepareQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffle(questions).map((q) => ({
    ...q,
    options: shuffle(q.options),
  }));
}
