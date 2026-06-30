# Phase 6: Self-Assessment Quizzes - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

CONCEPTUAL nodes gain a short (3–5 question) multiple-choice, auto-graded recall quiz launched from a "Take Assessment" CTA in the node detail panel. Passing drives that node's mastery state to `mastered` with `source: "quiz"` (a new third source alongside `manual`/`auto`), re-rendering only the affected node (reuse the Phase-5 optimistic single-node update). MECHANIC nodes never render a quiz button. Quiz content is authored co-located in each node's MDX frontmatter and validated by the existing content-collections Zod pipeline. The design embodies two learning-science principles: **active recall** (auto-graded retrieval with the node's learning text hidden during the quiz) and **spaced repetition** (data designed forward this phase; the scheduler/decay/review-queue itself is deferred).

**In scope:**
- A `quiz` field on the node frontmatter schema (`src/schemas/node.ts` + mirrored in `content-collections.ts`) — array of 3–5 MCQ questions, each with options, correct answer(s), and a **required `explanation`** (the QUIZ-03 structural guardrail).
- CI/build-time validation of quiz structure (count 3–5, exactly-correct-answer presence, required `explanation`) — extend the existing content-collections enforcement.
- The `source` enum extended to `["manual", "auto", "quiz"]` (`src/schemas/progress.ts`) and the persistence needed to store a quiz pass: `passed`, last-attempt timestamp, attempt count (the forward-designed spaced-repetition signals).
- A quiz-mastery write path (parallel to `setNodeMastery`) that, on pass, stamps `mastered` + `source:"quiz"` + `CURRENT_PATCH`, principal-keyed via `authedServerFn` (never trusts client input).
- The quiz-taking UI: one-question-at-a-time stepper, results + missed-question explanations on completion, retry/reshuffle, launched from a CONCEPTUAL-only "Take Assessment"/"Retake assessment" CTA grouped with `MasteryControls`.
- Surfacing `source:"quiz"` distinctly in the panel **and** as a subtle visual differentiator on the graph node (criterion 2).
- At least one CONCEPTUAL node authored with a real quiz to demonstrate the end-to-end flow.

**Out of scope (own phases / deferred):**
- The actual **spaced-repetition scheduler** — expanding intervals (SM-2/Leitner/FSRS), mastery decay, "due for review" states, review-queue/dashboard UX. Phase 6 only *stores the signals* an SRS needs. This becomes its own phase, coordinated with Phase 9 staleness UI.
- w3champions auto-detection writing `source:"auto"` (Phase 7); replay signals (Phase 8); pathway completion / aggregate progress visuals (Phase 9).
- Quizzes for MECHANIC nodes (never — they use auto-detection/replay signals).
- Free-text / self-graded questions (rejected — gameable, can't drive an honest mastery state).

</domain>

<decisions>
## Implementation Decisions

### Quiz content model (QUIZ-01, QUIZ-03)
- **D-01:** Quiz questions are **co-located in the node's existing MDX frontmatter** under a new `quiz` field — one file per node, authored alongside its citations, validated by the same content-collections Zod pipeline (ADR 002). No separate quiz collection. Mirror the schema change into `content-collections.ts` (parallel-schema sync note).
- **D-02:** Questions are **multiple-choice, auto-graded** — objective, non-gameable, deterministic pass/fail. Free-recall/self-graded was rejected because it cannot honestly drive a real mastery state.
- **D-03 (QUIZ-03 guardrail):** Each question schema **requires an `explanation` field** (why the correct answer is right) and authoring guidance frames questions as **scenarios / application** ("opponent does X — what do you do?") rather than definitions. The required `explanation` forces the author to justify recall depth — a structural mechanism, not just a checklist.
- **D-04 (derived default):** "Take Assessment" renders **only for CONCEPTUAL nodes that have authored quiz content.** A CONCEPTUAL node with no `quiz` in frontmatter shows no button (graceful, mirrors the `getMockMastery` "untouched" default). Quizzes roll out incrementally as content is written.

### Pass rule & retries (QUIZ-02)
- **D-05:** **Pass = at most one wrong (≈80%)** — 5q→4/5, 4q→3/4, 3q→3/3. Allows a single tricky-distractor slip without blocking a player who understands the concept.
- **D-06:** On completion (pass or fail): **reveal which questions were missed + their `explanation`, allow immediate retry, reshuffle** question and answer order. Gaming only fools yourself (no leaderboard), so revealing is pedagogically net-positive.
- **D-07:** **Retake allowed anytime**; persist **minimal** data — `passed`, last-attempt timestamp, attempt count. No score history, no streaks, no points (no-gamification, P5 D-10).

### Spaced repetition (learning-science steer — design-forward only)
- **D-08:** Phase 6 stays "quiz → mastered" but the quiz/progress records **store everything a future spaced-repetition engine needs**: last-passed timestamp, attempt count, and `source:"quiz"`. The **scheduler itself is deferred** to a dedicated review phase (expanding intervals, mastery decay, "due for review", review queue), coordinated with Phase 9 staleness. Same forward-design discipline as the patch primitive and the `source` field. **Active recall is fully in-phase** — it *is* the auto-graded retrieval quiz with the node text hidden (D-11).

### Quiz UX surface
- **D-09:** **Surface is the planner's call**, hard-constrained: the node's learning prose/citations **must not be readable while answering** (active recall). The in-panel-takeover approach satisfies this naturally; a modal must explicitly hide the node content.
- **D-10:** **One question at a time** (stepper); **results + explanations at the end** (no per-question reveal mid-quiz — consistent with D-06).
- **D-11:** Entry point is a **dedicated "Take Assessment" CTA grouped with the existing `MasteryControls`** block, rendered only for CONCEPTUAL nodes; label becomes **"Retake assessment"** once passed (D-15).

### Mastery write & source precedence (criterion 2)
- **D-12:** **Latest write wins.** A quiz pass **only ever sets `mastered`** + `source:"quiz"` (it never downgrades). A later **manual** mark overrides to any state with `source:"manual"`. Extends P5 D-04 ("manual can override auto") to the third source — symmetric and simple.
- **D-13:** The quiz-mastery write reuses the **`authedServerFn` principal-keyed pattern** (P4 D-11/D-12, P5 D-06) — a parallel server fn to `setNodeMastery` that hardcodes `source:"quiz"` server-side and stamps `CURRENT_PATCH`; no `userId`/`source` accepted from client input. On pass, the graph re-renders **only the affected node** (P5 D-09 optimistic path).
- **D-14:** `source:"quiz"` is surfaced **in the panel** (e.g. "Mastered · via quiz" near `MasteryBadge`/`MasteryControls`) **and** as a **distinct, subtle visual on the graph node** (user choice). Guardrail: keep it a *source distinction*, not a reward badge/score — must not drift into gamification (P5 D-10).
- **D-15:** "Take Assessment" is **always available** for CONCEPTUAL nodes with a quiz, regardless of current mastery state (so a manually-mastered node can still be quiz-validated, and knowledge can be re-checked).

### Claude's Discretion
- Exact quiz surface (in-panel takeover vs hidden-content modal) — D-09, constrained by "node text not readable during quiz".
- Quiz attempt persistence shape — extend the `nodeProgress` table vs a sibling quiz-attempts table; columns/indexes for the D-07/D-08 signals — planner's call, constrained by no-gamification and forward-SRS storage.
- Graph-node visual treatment for quiz-mastered (D-14) — exact marker, within the obsidian/rune-gold system and the subtle/non-gamified guardrail.
- MCQ schema details — single- vs multi-correct answers, option count, shuffling implementation (D-06).
- TanStack Query wiring for the quiz-pass mutation (optimistic update / invalidation), reusing the P5 mutation pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 6: Self-Assessment Quizzes" — goal + 3 success criteria (the acceptance bar: criterion 1 = CONCEPTUAL-only button, criterion 2 = pass→mastered + source labeled "quiz" + no reload, criterion 3 = questions test understanding not surface recall).
- `.planning/REQUIREMENTS.md` — QUIZ-01 (3–5 recall questions), QUIZ-02 (passing → mastered), QUIZ-03 (test understanding, not surface recall).
- `.planning/PROJECT.md` — Core Value (content must stand on its own); "Mastery measurement" note (ladder data is a weak/gameable proxy for *conceptual* mastery → understanding validated by self-assessment, not metric-chasing); no-gamification stance.

### Learning-science grounding (evidence base for the design + quiz authoring)
- Coursera — **"The Science of Learning – How Learning Works"** (https://www.coursera.org/learn/the-science-of-learning-how-learning-works-mqfoa) — user-provided grounding for the **active recall** + **spaced repetition** approach. Behind Coursera auth (not fetchable); treat as the rationale for why quizzes are auto-graded retrieval + application-framed, and why SRS signals are designed forward. Content authors should align quiz design with active-recall/retrieval-practice principles.

### Data contract & schema (the fields this phase adds)
- `src/schemas/node.ts` — `NodeFrontmatterSchema`; `nodeType: z.enum(["MECHANIC","CONCEPTUAL"])` is the gating dimension (button only for CONCEPTUAL). Add the `quiz` field here (D-01/D-02/D-03). **Parallel-schema sync: mirror into `content-collections.ts`.**
- `content-collections.ts` — MDX pipeline + transform + CI enforcement (currently enforces `## How to Apply`); extend with quiz-structure validation (D-03). Keep parallel schema in sync with `node.ts`.
- `src/schemas/progress.ts` — `MasteryStateSchema` (`untouched`/`in-progress`/`mastered`) and `source: z.enum(["manual","auto"]).default("manual")` → **extend to `["manual","auto","quiz"]`** (D-12). `ProgressRecordSchema` is patch-tagged + UUID-keyed (P5 D-05).
- `docs/adr/002-content-graph-decoupling.md` — quiz content is a content field; the graph layer must NOT receive it (nodes hold IDs only; quiz loads with panel content).
- `docs/adr/005-graph-display-node.md` — `GraphDisplayNode` projection rule; quiz-mastered graph-node visual (D-14) must use existing projected fields / mastery state, not leak quiz content into the projection.

### Auth / persistence / mastery-write pattern (reuse, do not reinvent)
- `src/lib/auth-middleware.ts` — `authedServerFn` + `AuthedContext`; the only authorization path.
- `src/server/progress.ts` + `src/server/progress.test.ts` — `setNodeMasteryHandler` (hardcodes `source` server-side, ignores forged `userId`/`source`/`patchId`); the exact template for the quiz-pass write fn (D-13).
- `src/server/user-profile.ts` — canonical `authedServerFn` consumer shape.
- `src/db/schema.ts` + `src/lib/db.ts` — Drizzle `nodeProgress` table + db singleton; quiz-attempt persistence lands here (extend table or sibling).
- `src/lib/patches.ts` — `CURRENT_PATCH` for stamping a quiz-driven mastery write.

### UI integration points (where the quiz attaches)
- `src/components/graph/NodeDetailPanel.tsx` + `src/components/graph/NodePanelContent.tsx` — the live-inspector panel (P3 D-01/D-02); host for the "Take Assessment" CTA and the quiz-taking UI / in-panel takeover (D-09/D-11).
- `src/components/graph/MasteryControls.tsx` + `MasteryControls.test.tsx` — the 3-state manual control; the CTA groups here (D-11) and quiz/manual writes share the precedence model (D-12).
- `src/components/graph/MasteryBadge.tsx` — mastery state display; extend to label `source:"quiz"` (D-14).
- `src/lib/graph-store.ts` — Zustand graph UI store; quiz-open / selected-node state likely extends here.
- `src/components/graph/RoadmapGraph.tsx` + `src/components/graph/GraphNode.tsx` — the optimistic single-node re-render seam (P5 D-09) and where the quiz-mastered graph-node visual (D-14) renders.

### Architecture discipline (cross-cutting)
- `.agents/skills/codebase-design/SKILL.md` + `.agents/skills/improve-codebase-architecture/SKILL.md` — deep-module discipline; the quiz engine (grading + pass rule + reshuffle) and the quiz-content schema are the candidate deep modules.
- `CONTEXT.md` (repo root) — domain language; extend with Phase-6 terms (quiz, assessment, active recall, spaced repetition, quiz source, pass threshold). Record significant choices as the next ADR in `docs/adr/` (numbering continues from 009).
- `docs/adr/0001-visual-design-direction.md` — obsidian/rune-gold tokens the quiz UI + node visual must consume.

### Prior context
- `.planning/phases/05-progress-tracking/05-CONTEXT.md` — mastery vocabulary, `source` field design-forward (D-04), `authedServerFn` write pattern, optimistic single-node re-render (D-09), no-gamification (D-10).
- `.planning/phases/03-content-pipeline-node-panel/03-CONTEXT.md` — panel as live inspector, lazy-loaded content, citation/frontmatter authoring model, CI structure enforcement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/progress.ts` (`setNodeMasteryHandler`) — exact server-side-stamping, input-rejecting `authedServerFn` template to copy for the quiz-pass write (hardcode `source:"quiz"`).
- `src/components/graph/MasteryControls.tsx` — the mastery-control block; the "Take Assessment" CTA groups here and shares the precedence model.
- `src/components/graph/NodeDetailPanel.tsx` / `NodePanelContent.tsx` — the live-inspector panel that hosts the quiz UI; content lazy-loads per node (so the `quiz` frontmatter field loads with it).
- `src/lib/mock-mastery.ts` → real progress map (P5) — the "untouched default for unknown IDs" graciousness mirrors D-04 (no quiz authored → no button).
- `src/schemas/progress.ts` `source` enum — the slot to extend to `"quiz"`.
- content-collections enforcement (the `## How to Apply` CI check) — the pattern to copy for quiz-structure validation.

### Established Patterns
- `nodeType: z.enum(["MECHANIC","CONCEPTUAL"])` (uppercase) — gate the button on `=== "CONCEPTUAL"`.
- `authedServerFn` is THE write pattern — principal-keyed, no `userId`/`source` input channel (regression-tested in `progress.test.ts`).
- Parallel-schema sync between `src/schemas/node.ts` and `content-collections.ts` — every frontmatter change goes in both.
- Optimistic single-node re-render via the graph store / `data.masteryState` (P5 D-09).
- SPDX `GPL-3.0-or-later` header on every new `.ts/.tsx`; Vitest colocated `*.test.ts(x)`; Zod 4 strict idioms; Motion via `motion/react`; CVA for state variants.

### Integration Points
- node frontmatter `quiz` → content-collections validation → lazy-loaded with panel content → quiz UI.
- quiz pass → quiz-mastery server fn (`authedServerFn`, `source:"quiz"`, `CURRENT_PATCH`) → Drizzle progress/attempt rows → optimistic single-node graph update → panel label + graph-node visual (criterion 2).
- "Take Assessment" CTA ↔ `MasteryControls` ↔ panel; CONCEPTUAL-only + quiz-content-present gating.
- precedence: quiz write (mastered-only) and manual write (any state) → latest wins, source relabeled (D-12).

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants **active recall and spaced repetition** as the pedagogical backbone, grounded in the Coursera "Science of Learning — How Learning Works" course. Active recall is realized fully now (auto-graded retrieval, node text hidden during the quiz, application-framed questions, explanations). Spaced repetition is realized as **forward-designed data only** — the user accepted deferring the scheduler to its own phase rather than bolting a half-built SRS onto Phase 6.
- Questions must be **application/scenario-framed**, not definitional — "you can't answer by re-reading the node" (QUIZ-03). The required per-question `explanation` is the structural enforcement, not a vibe.
- The user wants quiz-mastered nodes **visually distinct on the graph canvas itself** (not only in the panel) — honor criterion 2 strongly, but keep it a subtle source distinction, NOT a gamified reward/badge.
- Honest-signal stance: MCQ auto-grading was chosen specifically so a player can't self-pass; mastery from a quiz means something.

</specifics>

<deferred>
## Deferred Ideas

- **Spaced-repetition scheduler** — expanding review intervals (SM-2/Leitner/FSRS), mastery decay, "due for review" state, review queue/dashboard. Its own future phase; Phase 6 stores the signals (D-08). Coordinate with Phase 9 staleness UI.
- **Quizzes for MECHANIC nodes** — explicitly never (those nodes use w3champions auto-detection / replay signals).
- **Free-text / self-graded recall questions** — rejected for the pass path (gameable). Could return as a non-scored reflection step later.
- **Per-question immediate feedback mode** — declined for Phase 6 (D-10); reveal-on-completion chosen.
- **Quiz authoring to a full content gate** — bulk-authoring quizzes across the ~25 launch nodes pairs with the Phase 9 content gate; Phase 6 builds the engine + schema + at least one demo quiz, not the full corpus.

None of the above are scope creep into Phase 6 — they are forward hooks this phase's structure deliberately reserves.

</deferred>

---

*Phase: 6-Self-Assessment Quizzes*
*Context gathered: 2026-06-30*
