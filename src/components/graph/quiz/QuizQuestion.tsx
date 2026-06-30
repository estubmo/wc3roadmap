// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * QuizQuestion — accessible multiple-choice question (QUIZ-01, D-10).
 *
 * Renders a single MCQ using a <fieldset> + <legend> for screen-reader context
 * and a Radix RadioGroup for native role="radio", aria-checked, and arrow-key
 * navigation. Does NOT reveal correctness — that is deferred to QuizResults
 * (D-10, active-recall principle).
 *
 * Pure presentational: props in, onSelect callback out. No side effects.
 *
 * Accessibility:
 *   - fieldset + legend: groups options under the question text for AT
 *   - RadioGroup aria-label mirrors the legend (belt-and-suspenders for
 *     screen readers that skip fieldset semantics in some ARIA roles)
 *   - RadioGroupItem pairs with a plain <label htmlFor> — no shadcn Label
 *     component required (RESEARCH Open Question 3)
 *   - Arrow-key navigation is Radix-native; no custom key handler needed
 */

import type { QuizQuestion as QuizQuestionType } from "#/schemas/node";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuizQuestionProps {
  /** The quiz question to render (text + options). */
  question: QuizQuestionType;
  /** Index of the currently selected option, or null if none. */
  selectedIndex: number | null;
  /** Called with the newly selected option index. */
  onSelect: (i: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders one MCQ question with its options as a Radix radio group.
 * The caller (QuizStepper) controls which question is visible.
 */
export function QuizQuestion({
  question,
  selectedIndex,
  onSelect,
}: QuizQuestionProps) {
  const radioGroupId = `quiz-question-${question.text.slice(0, 20).replace(/\s+/g, "-")}`;

  return (
    <fieldset
      style={{
        border: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {/* legend provides the question text to screen readers as group label */}
      <legend
        style={{
          fontSize: "15px",
          fontWeight: 600,
          lineHeight: 1.5,
          color: "var(--color-rune-300)",
          marginBottom: "16px",
          fontFamily: "var(--font-sans)",
        }}
      >
        {question.text}
      </legend>

      <RadioGroup
        aria-label={question.text}
        value={selectedIndex !== null ? String(selectedIndex) : undefined}
        onValueChange={(v) => onSelect(Number(v))}
        style={{ gap: "10px" }}
      >
        {question.options.map((option, i) => {
          const itemId = `${radioGroupId}-option-${i}`;
          const isSelected = selectedIndex === i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "6px",
                border: isSelected
                  ? "1px solid var(--color-rune-500)"
                  : "1px solid var(--color-obsidian-600)",
                backgroundColor: isSelected
                  ? "var(--color-obsidian-700)"
                  : "var(--color-obsidian-800)",
                cursor: "pointer",
                transition: "border-color 0.15s, background-color 0.15s",
              }}
              onClick={() => onSelect(i)}
            >
              <RadioGroupItem
                value={String(i)}
                id={itemId}
                style={{
                  marginTop: "2px",
                  flexShrink: 0,
                  borderColor: isSelected
                    ? "var(--color-rune-500)"
                    : "var(--color-obsidian-600)",
                  color: "var(--color-rune-500)",
                }}
              />
              <label
                htmlFor={itemId}
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: isSelected ? "var(--color-rune-300)" : "#9998a8",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {option.text}
              </label>
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
