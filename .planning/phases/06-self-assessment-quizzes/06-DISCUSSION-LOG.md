# Phase 6: Self-Assessment Quizzes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 6-Self-Assessment Quizzes
**Areas discussed:** Quiz content model, Pass rule & retries, Spaced repetition scope, Quiz UX surface, Mastery write & source precedence

---

## Quiz content model

### Where quiz questions live
| Option | Description | Selected |
|--------|-------------|----------|
| Co-located in node MDX frontmatter | New `quiz` field beside citations; one file per node; same Zod pipeline | ✓ |
| Separate quiz collection | New content-collection keyed by node id; splits authoring across two files | |

### Question/answer format
| Option | Description | Selected |
|--------|-------------|----------|
| Multiple-choice, auto-graded | Objective, non-gameable, deterministic pass | ✓ |
| Free-recall, self-graded | Subjective + gameable; conflicts with driving a real mastery state | |
| Mix (MCQ + recall step) | Mostly MCQ + optional non-scored recall; more authoring effort | |

### QUIZ-03 understanding-not-surface mechanism
| Option | Description | Selected |
|--------|-------------|----------|
| Per-question `explanation` + application framing | Schema-required explanation forces recall-depth justification | ✓ |
| Author checklist / review gate only | No schema change; relies on discipline | |
| You decide during planning | Leave to planning | |

**Notes:** All three chosen as recommended. Honest-signal stance drove MCQ auto-grading; the required `explanation` is the structural QUIZ-03 enforcement.

---

## Pass rule & retries

### Passing score
| Option | Description | Selected |
|--------|-------------|----------|
| Proportional — at most one wrong (≈80%) | 5q→4, 4q→3, 3q→3; tolerates one tricky distractor | ✓ |
| Perfect — all correct | Simplest, most meaningful, but punishing on ambiguity | |

### Fail/finish flow
| Option | Description | Selected |
|--------|-------------|----------|
| Reveal explanations, retry immediately, reshuffle | Teaching moment; gaming only fools yourself | ✓ |
| Show pass/fail only, retry | Less answer-key leak, loses teaching | |
| Cooldown before retry | Discourages brute-force, adds friction | |

### Retake + storage
| Option | Description | Selected |
|--------|-------------|----------|
| Retake anytime; store minimal (passed + last attempt) | No history/streaks (no-gamification) | ✓ |
| Lock quiz after passing | Blocks honest re-checking | |
| You decide during planning | Leave to planning | |

**Notes:** Minimal persistence intentionally also seeds the forward-designed spaced-repetition signals.

---

## Spaced repetition scope

*(Raised by user mid-discussion: "employ the teachings of spaced repetition and active recall.")*

| Option | Description | Selected |
|--------|-------------|----------|
| Design-forward only (defer scheduler) | Store SRS signals now; scheduler/decay/review-queue is its own later phase | ✓ |
| Lightweight review signal in-phase | One fixed-interval "due for review"; overlaps Phase 9 staleness | |
| Full SRS now (intervals + queue + decay) | Reshapes Phase 6 into a learning-scheduler phase | |

**Notes:** Active recall is already in-phase (it IS the auto-graded retrieval quiz). Spaced repetition exceeds Phase 6's locked scope, so the scheduler is deferred while the persistence is designed forward — same discipline as the patch primitive and `source` field. User also shared the Coursera "Science of Learning — How Learning Works" course as the grounding reference; captured in CONTEXT.md canonical refs (Coursera-auth-gated, not fetched).

---

## Quiz UX surface

### Presentation vs node content
| Option | Description | Selected |
|--------|-------------|----------|
| In-panel takeover that hides node text | True active recall; reuses panel | |
| Modal over dimmed graph | Focus, but text may be glimpsed | |
| You decide during planning | Constrained: node text not readable during quiz | ✓ |

### Pacing + feedback
| Option | Description | Selected |
|--------|-------------|----------|
| One at a time, results at end | Stronger retrieval, no mid-quiz leak | ✓ |
| One at a time, immediate feedback | Conflicts with reveal-on-completion | |
| All on one screen, single submit | Easier cross-referencing, less focused | |

### Entry point
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated CTA near mastery controls (CONCEPTUAL-only) | Groups mastery affordances; MECHANIC never renders it | ✓ |
| CTA pinned at top of panel | Competes with pinned How-to-Apply | |
| You decide during planning | Leave to UI planning | |

**Notes:** Surface left to planner but hard-constrained by the active-recall requirement (node prose/citations not readable while answering).

---

## Mastery write & source precedence

### Precedence
| Option | Description | Selected |
|--------|-------------|----------|
| Latest write wins; quiz only ever sets 'mastered' | Manual can override; quiz never downgrades | ✓ |
| Manual always wins | Quiz pass could silently not update; weakens criterion 2 | |
| You decide during planning | Leave to planning | |

### Button visibility when already mastered
| Option | Description | Selected |
|--------|-------------|----------|
| Always show; "Retake assessment" once passed | Allows quiz-validating a manual mastery; re-checking | ✓ |
| Hide once mastered | Cleaner, but blocks re-checking | |

### Source UI surfacing
| Option | Description | Selected |
|--------|-------------|----------|
| Label on mastery indicator in panel | Satisfies criterion 2 without canvas clutter | |
| Distinct visual on the graph node too | More prominent differentiation on the canvas | ✓ |
| You decide during planning | Leave to UI planning | |

**Notes:** User wants quiz-mastered nodes visually distinct on the graph itself (in addition to the panel). Captured with a guardrail: keep it a source distinction, not a gamified reward/badge.

---

## Claude's Discretion

- Exact quiz surface (in-panel takeover vs hidden-content modal), constrained to "node text not readable during quiz" (D-09).
- Quiz attempt persistence shape (extend `nodeProgress` vs sibling attempts table) + columns for forward-SRS signals.
- Graph-node visual treatment for quiz-mastered (subtle, non-gamified).
- MCQ schema details (single/multi-correct, option count, shuffle implementation).
- TanStack Query mutation wiring (reuse P5 optimistic pattern).

## Deferred Ideas

- Spaced-repetition scheduler (intervals/decay/review-queue) — own phase; signals stored now.
- Quizzes for MECHANIC nodes — explicitly never.
- Free-text / self-graded recall as a non-scored reflection step — possible later.
- Per-question immediate feedback mode — declined this phase.
- Bulk quiz authoring to the ~25-node launch gate — pairs with Phase 9 content gate.
