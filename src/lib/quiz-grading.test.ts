// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { describe, it, expect } from "vitest";
import {
  PASS_THRESHOLD,
  gradeQuiz,
  gradeAnswers,
  shuffle,
  prepareQuiz,
} from "#/lib/quiz-grading";
import type { QuizQuestion } from "#/schemas/node";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Three-question quiz fixture — minimum length. */
const threeQ: QuizQuestion[] = [
  {
    text: "Which resource is worker-produced in WC3?",
    options: [
      { text: "Gold", isCorrect: true },
      { text: "Lumber (auto)", isCorrect: false },
    ],
    explanation: "Workers must mine gold manually; lumber auto-harvests.",
  },
  {
    text: "What does supply cap determine?",
    options: [
      { text: "Maximum food", isCorrect: true },
      { text: "Maximum gold", isCorrect: false },
    ],
    explanation: "Supply cap limits the number of food units you can field.",
  },
  {
    text: "Upkeep penalty begins at how many food?",
    options: [
      { text: "50", isCorrect: true },
      { text: "60", isCorrect: false },
      { text: "40", isCorrect: false },
    ],
    explanation: "Low upkeep ends at 50 food; medium upkeep begins there.",
  },
];

// ---------------------------------------------------------------------------
// PASS_THRESHOLD
// ---------------------------------------------------------------------------

describe("PASS_THRESHOLD", () => {
  it("maps 3 questions → threshold 3 (3/3, Pitfall 2 — NOT 2/3)", () => {
    expect(PASS_THRESHOLD[3]).toBe(3);
  });

  it("maps 4 questions → threshold 3 (3/4)", () => {
    expect(PASS_THRESHOLD[4]).toBe(3);
  });

  it("maps 5 questions → threshold 4 (4/5)", () => {
    expect(PASS_THRESHOLD[5]).toBe(4);
  });

  it("does not have entries outside 3-5", () => {
    expect(PASS_THRESHOLD[2]).toBeUndefined();
    expect(PASS_THRESHOLD[6]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// gradeQuiz
// ---------------------------------------------------------------------------

describe("gradeQuiz", () => {
  // 3-question boundary — the critical Pitfall-2 case
  it("gradeQuiz(3, 3) = true (all three correct)", () => {
    expect(gradeQuiz(3, 3)).toBe(true);
  });

  it("gradeQuiz(3, 2) = false (3q requires 3/3, NOT 2/3)", () => {
    expect(gradeQuiz(3, 2)).toBe(false);
  });

  it("gradeQuiz(3, 1) = false", () => {
    expect(gradeQuiz(3, 1)).toBe(false);
  });

  it("gradeQuiz(3, 0) = false", () => {
    expect(gradeQuiz(3, 0)).toBe(false);
  });

  // 4-question boundary
  it("gradeQuiz(4, 3) = true", () => {
    expect(gradeQuiz(4, 3)).toBe(true);
  });

  it("gradeQuiz(4, 4) = true", () => {
    expect(gradeQuiz(4, 4)).toBe(true);
  });

  it("gradeQuiz(4, 2) = false", () => {
    expect(gradeQuiz(4, 2)).toBe(false);
  });

  // 5-question boundary
  it("gradeQuiz(5, 4) = true", () => {
    expect(gradeQuiz(5, 4)).toBe(true);
  });

  it("gradeQuiz(5, 5) = true", () => {
    expect(gradeQuiz(5, 5)).toBe(true);
  });

  it("gradeQuiz(5, 3) = false", () => {
    expect(gradeQuiz(5, 3)).toBe(false);
  });

  // Invalid counts
  it("throws for total = 2 (below range)", () => {
    expect(() => gradeQuiz(2, 2)).toThrow();
  });

  it("throws for total = 6 (above range)", () => {
    expect(() => gradeQuiz(6, 6)).toThrow();
  });

  it("throws for total = 0", () => {
    expect(() => gradeQuiz(0, 0)).toThrow();
  });

  it("throws for total = 1", () => {
    expect(() => gradeQuiz(1, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// gradeAnswers
// ---------------------------------------------------------------------------

describe("gradeAnswers — 3-question fixture", () => {
  it("all correct → passed true, correctCount 3, missedIndexes []", () => {
    // All three questions: option 0 is correct in the fixture
    const result = gradeAnswers(threeQ, [0, 0, 0]);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(result.missedIndexes).toEqual([]);
  });

  it("one wrong (index 1) → passed false (3q requires 3/3), missedIndexes [1]", () => {
    // Q0: correct (0), Q1: wrong (1 — the wrong option), Q2: correct (0)
    const result = gradeAnswers(threeQ, [0, 1, 0]);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(2);
    expect(result.missedIndexes).toEqual([1]);
  });

  it("all wrong → passed false, correctCount 0, missedIndexes [0,1,2]", () => {
    const result = gradeAnswers(threeQ, [1, 1, 1]);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(0);
    expect(result.missedIndexes).toEqual([0, 1, 2]);
  });

  it("null (unanswered) counts as missed", () => {
    // Q0: null (unanswered), Q1: correct (0), Q2: correct (0)
    const result = gradeAnswers(threeQ, [null, 0, 0]);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(2);
    expect(result.missedIndexes).toContain(0);
  });

  it("all null → correctCount 0, all missed", () => {
    const result = gradeAnswers(threeQ, [null, null, null]);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(0);
    expect(result.missedIndexes).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------

describe("shuffle", () => {
  it("returns an array with the same elements (permutation)", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("input array identity is unchanged after call", () => {
    const input = ["a", "b", "c"];
    const ref = input;
    shuffle(input);
    expect(input).toBe(ref);
  });

  it("returns a new array (not the same reference)", () => {
    const input = [1, 2, 3];
    const result = shuffle(input);
    expect(result).not.toBe(input);
  });

  it("handles an empty array without throwing", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

// ---------------------------------------------------------------------------
// prepareQuiz
// ---------------------------------------------------------------------------

describe("prepareQuiz", () => {
  it("returns the same number of questions", () => {
    const result = prepareQuiz(threeQ);
    expect(result).toHaveLength(threeQ.length);
  });

  it("does not mutate the source questions array", () => {
    const copy = JSON.parse(JSON.stringify(threeQ)) as QuizQuestion[];
    prepareQuiz(threeQ);
    expect(threeQ).toEqual(copy);
  });

  it("does not mutate the source options arrays", () => {
    const originalOptions0 = [...threeQ[0].options];
    prepareQuiz(threeQ);
    expect(threeQ[0].options).toEqual(originalOptions0);
  });

  it("preserves isCorrect flags after option shuffle", () => {
    // Run prepareQuiz many times to increase chance of actual shuffle
    for (let i = 0; i < 20; i++) {
      const result = prepareQuiz(threeQ);
      for (const q of result) {
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        expect(correctCount).toBe(1);
      }
    }
  });

  it("all question texts are preserved (same set, may be reordered)", () => {
    const result = prepareQuiz(threeQ);
    const originalTexts = threeQ.map((q) => q.text).sort();
    const resultTexts = result.map((q) => q.text).sort();
    expect(resultTexts).toEqual(originalTexts);
  });

  it("all explanations are preserved", () => {
    const result = prepareQuiz(threeQ);
    const originalExplanations = threeQ.map((q) => q.explanation).sort();
    const resultExplanations = result.map((q) => q.explanation).sort();
    expect(resultExplanations).toEqual(originalExplanations);
  });
});
