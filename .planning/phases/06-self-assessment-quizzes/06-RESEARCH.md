# Phase 6: Self-Assessment Quizzes - Research

**Researched:** 2026-06-30
**Domain:** MCQ quiz engine, content-collections Zod v4 validation, progress persistence, spaced-repetition forward design
**Confidence:** HIGH (decisions locked via CONTEXT.md; research verifies implementation patterns against existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Quiz questions co-located in node MDX frontmatter under a new `quiz` field — same content-collections Zod pipeline. No separate quiz collection. Mirror schema change into `content-collections.ts`.
- **D-02:** Questions are multiple-choice, auto-graded. Free-recall/self-graded rejected.
- **D-03 (QUIZ-03 guardrail):** Each question schema requires an `explanation` field + authoring guidance for scenario/application framing.
- **D-04:** "Take Assessment" renders only for CONCEPTUAL nodes that have authored quiz content. Graceful no-button default for CONCEPTUAL nodes without `quiz` in frontmatter.
- **D-05:** Pass = at most one wrong — 5q→4/5, 4q→3/4, 3q→3/3.
- **D-06:** On completion: reveal missed questions + explanations, allow immediate retry with reshuffle.
- **D-07:** Retake allowed anytime; persist minimal data — `passed`, last-attempt timestamp, attempt count. No score history, streaks, or points.
- **D-08:** Phase 6 stores SRS signals (passed, lastAttemptAt, attemptCount, source:"quiz") but the scheduler/decay/review-queue is DEFERRED.
- **D-09:** Surface is planner's call, hard-constrained: node learning prose/citations must NOT be readable during quiz.
- **D-10:** One question at a time (stepper); results + explanations at the end (no per-question reveal mid-quiz).
- **D-11:** Entry point: "Take Assessment" CTA grouped with existing `MasteryControls` block; label becomes "Retake assessment" once passed (D-15).
- **D-12:** Latest write wins; quiz only ever sets `mastered`. Manual can override to any state with `source:"manual"`. Quiz never downgrades.
- **D-13:** Quiz-mastery write reuses `authedServerFn` principal-keyed pattern. Hardcodes `source:"quiz"` server-side and stamps `CURRENT_PATCH`. No `userId`/`source` accepted from client.
- **D-14:** `source:"quiz"` surfaced in panel (e.g. "Mastered · via quiz") AND as subtle visual differentiator on graph node. Must not drift into gamification.
- **D-15:** "Take Assessment" always available for CONCEPTUAL nodes with a quiz, regardless of current mastery state.

### Claude's Discretion
- Exact quiz surface (in-panel takeover vs hidden-content modal) — constrained: node text not readable during quiz (D-09).
- Quiz attempt persistence shape — extend `nodeProgress` vs sibling `quizProgress` table; columns/indexes for D-07/D-08 signals.
- Graph-node visual treatment for quiz-mastered (D-14) — within obsidian/rune-gold system, subtle/non-gamified.
- MCQ schema details — single- vs multi-correct answers, option count, shuffle implementation.
- TanStack Query mutation wiring (optimistic update / invalidation), reusing P5 pattern.

### Deferred Ideas (OUT OF SCOPE)
- SRS scheduler (expanding intervals, mastery decay, "due for review" queue).
- Quizzes for MECHANIC nodes — explicitly never.
- Free-text / self-graded recall as non-scored reflection step.
- Per-question immediate feedback mode.
- Bulk quiz authoring to the ~25-node launch gate (Phase 9).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUIZ-01 | CONCEPTUAL nodes have a short self-assessment quiz (3–5 recall-based questions) | Zod array `.min(3).max(5)` on `QuizSchema`; frontmatter `quiz?` field on `NodeFrontmatterSchema`; content-collections build-time validation |
| QUIZ-02 | Passing a node's quiz drives that CONCEPTUAL node toward "mastered" | `recordQuizPass` server fn pattern (parallel to `setNodeMasteryHandler`); optimistic single-node re-render via `setNodeMastery` in graph store |
| QUIZ-03 | Quizzes test understanding, not surface recall | Required `explanation` field enforced by Zod schema; authoring guidance for scenario/application framing; structural guardrail at build time |
</phase_requirements>

---

## Summary

Phase 6 adds a quiz engine to CONCEPTUAL nodes — the simplest path is to reuse every established pattern from Phase 3 (content-collections Zod pipeline) and Phase 5 (authedServerFn write, optimistic single-node re-render, graph store masteryMap). The quiz schema is a Zod-validated nested array in the existing node frontmatter; the server fn is a direct copy of `setNodeMasteryHandler` with `source` hardcoded to `"quiz"`; the UI is an in-panel takeover animated via Motion's AnimatePresence.

The three research areas that needed verification: (1) the forward-SRS data model — the CONTEXT.md-committed 3 fields (passed + lastAttemptAt + attemptCount) are sufficient for SM-2 bootstrapping but `lapseCount` should be added now as it is impossible to reconstruct retroactively; (2) Zod v4 `superRefine` idioms — confirmed from Context7 official docs with the `{ code, message, input }` v4 signature; (3) the `source` field needs to propagate into the graph store via a new `sourceMap` slice so both the panel label (D-14) and the graph-node visual (D-14) can read it.

**Primary recommendation:** Add a separate `quizProgress` Drizzle table (not extending `nodeProgress`) for quiz-attempt tracking; extend the graph store with a `sourceMap` slice; add the shadcn `radio-group` component (Radix already in node_modules, no new npm install); follow the `setNodeMasteryHandler` template exactly for the quiz-pass write.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Quiz schema validation | Build-time (content-collections CI) | — | Zod validation in `content-collections.ts` transform; schema errors fail the build |
| Quiz content access | Frontend Server (SSR loader) | Browser (lazy panel) | Loaded with node content via `nodeContentQueryOptions` — already lazy-loaded per ADR 002 |
| Quiz UI state (stepper, answers) | Browser/Client | — | Local React state; no server round-trip until quiz pass |
| Pass/fail grading | Browser/Client | — | Pure deterministic function with no I/O; runs client-side before server write |
| Quiz-pass mastery write | API/Backend (authedServerFn) | — | Principal-keyed, server-stamped source/patch (D-13, ADR 007) |
| Quiz attempt persistence | Database (Drizzle/Neon) | — | `quizProgress` table; one row per user-node pair |
| Mastery state propagation | Browser (Zustand graph store) | — | Optimistic single-node re-render via `setNodeMastery` + `setSource` |
| Source surfacing (panel + graph) | Browser (Zustand sourceMap) | — | `sourceMap` slice in graph store feeds both `MasteryBadge` (panel) and `GraphNode` (canvas) |

---

## Standard Stack

### Core (no new npm packages — everything reuses existing deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | 4.x (already installed) | Quiz question schema validation | Already the project schema language; `superRefine` handles exactly-one-correct constraint |
| `@content-collections/core` | already installed | Build-time quiz schema enforcement | Extend existing `transform` to validate quiz structure |
| `drizzle-orm` | 0.45.2 (already installed) | `quizProgress` table definition + migrations | Already the ORM; new table follows existing `nodeProgress` pattern |
| `@tanstack/react-start` `createServerFn` | 1.168.x (already installed) | `recordQuizPass` server function | `authedServerFn` pattern from Phase 5 |
| `@tanstack/react-query` | 5.x (already installed) | `useQuizPassMutation` + `progressKeys.byUser()` invalidation | Already the mutation pattern from Phase 5 |
| `motion/react` | 12.x (already installed) | In-panel takeover AnimatePresence transition | Already used in `NodeDetailPanel.tsx` for panel animations |
| `shadcn radio-group` | CLI add (no new npm install) | Accessible radio group for MCQ options | `@radix-ui/react-radio-group` already in node_modules via `radix-ui@1.6.0` bundle |

[VERIFIED: npm registry] `radix-ui@1.6.0` already in `package.json` and includes `@radix-ui/react-radio-group` as a dependency — confirmed via `node_modules/@radix-ui/react-radio-group` presence.

### Adding shadcn radio-group

```bash
# No npm install needed — @radix-ui/react-radio-group already in node_modules
npx shadcn@latest add radio-group
# Writes: src/components/ui/radio-group.tsx
```

---

## Package Legitimacy Audit

No new npm packages are installed in this phase. All dependencies are already present:
- `zod`, `drizzle-orm`, `@tanstack/react-query`, `motion`, `radix-ui` — all installed and legitimacy-verified in prior phases.
- `shadcn radio-group` is added via the shadcn CLI (copies a component file, not an npm publish).

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
MDX frontmatter (quiz field)
         │ build-time Zod validation
         ▼
content-collections transform ──→ CI fails if quiz schema invalid
         │ (compiled at build, lazy-loaded per ADR 002)
         ▼
nodeContentQueryOptions (TanStack Query, staleTime:Infinity)
         │ fetches full node content including quiz[]
         ▼
NodePanelContent
    │
    ├── quiz === undefined OR nodeType !== "CONCEPTUAL"?
    │       └─→ render nothing (D-04 gate)
    │
    └── quiz present + nodeType === "CONCEPTUAL"?
            │
            ├── QuizCTA ("Take Assessment" / "Retake assessment")
            │       │ user clicks
            │       ▼
            │   QuizTakeover (in-panel AnimatePresence takeover)
            │       │ shuffle questions+options at quiz start
            │       │
            │       ├── Stepper (one question at a time, D-10)
            │       │     └── RadioGroup + options (Radix RadioGroup, accessible)
            │       │
            │       └── ResultsScreen (after last answer)
            │             ├── gradeQuiz() → pass/fail (D-05)
            │             ├── MissedQuestionsWithExplanations
            │             └── RetakeButton (reshuffle, D-06)
            │
            │   [on pass only]
            │       ▼
            │   useQuizPassMutation.mutate({ nodeId })
            │       │ optimistic: setNodeMastery(nodeId,"mastered") + setSource(nodeId,"quiz")
            │       ▼
            │   recordQuizPass server fn (authedServerFn)
            │       │ stamps: source:"quiz", masteryState:"mastered", CURRENT_PATCH
            │       ├── upserts nodeProgress (mastery write, D-12)
            │       └── upserts quizProgress (attempt tracking, D-07/D-08)
            │       ▼
            │   invalidate progressKeys.byUser() → re-sync graph store
            │
            └── GraphNode (canvas) reads sourceMap["nodeId"] === "quiz" → subtle visual (D-14)
```

### Recommended Project Structure

```
src/
├── schemas/
│   ├── node.ts          # Add QuizOptionSchema + QuizQuestionSchema + QuizSchema; NodeFrontmatterSchema.quiz
│   └── progress.ts      # source enum: ["manual","auto","quiz"]
├── db/
│   └── schema.ts        # Add quizProgress table
├── server/
│   ├── progress.ts      # Existing — unchanged
│   └── quiz.ts          # NEW: recordQuizPass server fn + handler + types
├── lib/
│   ├── graph-store.ts   # Add sourceMap slice + setSource + initSourceMap
│   └── quiz-grading.ts  # NEW: gradeQuiz() pure function + PASS_THRESHOLD
├── hooks/
│   └── useQuizPassMutation.ts  # NEW: useMutation wrapping recordQuizPass
└── components/
    └── graph/
        ├── NodePanelContent.tsx   # Integrate QuizSection (D-09/D-11)
        ├── MasteryBadge.tsx       # Extend to show "via quiz" source label (D-14)
        ├── GraphNode.tsx          # Add quiz-mastered visual variant (D-14)
        └── quiz/                  # NEW quiz UI sub-directory
            ├── QuizTakeover.tsx   # In-panel AnimatePresence takeover host
            ├── QuizStepper.tsx    # One-question-at-a-time stepper (D-10)
            ├── QuizQuestion.tsx   # RadioGroup question + options
            └── QuizResults.tsx    # Pass/fail + missed questions + explanations (D-06)
```

### Pattern 1: Quiz Schema (Zod v4, content-collections)

**What:** Nested Zod schema for quiz questions in node frontmatter, with `superRefine` for exactly-one-correct enforcement and required `explanation`.
**When to use:** Add to `src/schemas/node.ts` + mirror in `content-collections.ts`.

```typescript
// Source: Context7 / colinhacks/zod official docs — superRefine v4 signature
// SPDX-License-Identifier: GPL-3.0-or-later

const QuizOptionSchema = z.object({
  text: z.string().min(1, { error: "Option text cannot be empty (QUIZ-01)" }),
  isCorrect: z.boolean(),
});

const QuizQuestionSchema = z.object({
  text: z.string().min(1, { error: "Question text cannot be empty (QUIZ-01)" }),
  options: z
    .array(QuizOptionSchema)
    .min(2, { error: "Each question needs at least 2 options" })
    .max(5, { error: "Each question can have at most 5 options" })
    .superRefine((options, ctx) => {
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message: `Question must have exactly one correct answer (found ${correctCount}) (QUIZ-03)`,
          input: options,
        });
      }
    }),
  /**
   * Required per D-03/QUIZ-03: explains WHY the correct answer is right.
   * Forces the author to justify the recall depth of the question.
   * CI fails if absent or empty.
   */
  explanation: z.string().min(1, {
    error: "explanation is required on every quiz question (D-03/QUIZ-03 structural guardrail)",
  }),
});

/**
 * QuizSchema — validated array of 3–5 MCQ questions (QUIZ-01).
 * Optional on NodeFrontmatterSchema: CONCEPTUAL nodes without a `quiz` field
 * show no "Take Assessment" button (D-04 graceful default).
 */
export const QuizSchema = z
  .array(QuizQuestionSchema)
  .min(3, { error: "A quiz requires at least 3 questions (QUIZ-01)" })
  .max(5, { error: "A quiz may have at most 5 questions (QUIZ-01)" });

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
```

**NodeFrontmatterSchema extension:**
```typescript
// Add to NodeFrontmatterSchema.extend({...}):
quiz: QuizSchema.optional(),  // D-04: undefined → no button
```

**PARALLEL-SCHEMA SYNC:** Mirror `QuizOptionSchema`, `QuizQuestionSchema`, `QuizSchema` identically in `content-collections.ts` schema object. The content-collections schema validation runs at build time (CI enforces). No `transform` changes needed — Zod rejects malformed quiz frontmatter before transform runs.

### Pattern 2: Quiz-pass Server Function

**What:** Parallel to `setNodeMasteryHandler` — stamps `source:"quiz"` server-side, upserts `nodeProgress` + `quizProgress`.
**When to use:** Called only on quiz pass; never accepts `source`/`userId`/`masteryState` from client.

```typescript
// Source: mirrors src/server/progress.ts setNodeMasteryHandler pattern (ADR 007)
// SPDX-License-Identifier: GPL-3.0-or-later

export const RecordQuizPassInput = z.object({
  nodeId: z.string().min(1, { error: "nodeId required" }),
  // CRITICAL: no source, userId, masteryState, patchId — all server-stamped
});

export async function recordQuizPassHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof RecordQuizPassInput> }) {
  const { principal } = context;
  const { nodeId } = RecordQuizPassInput.parse(data);

  // 1. Upsert nodeProgress: mastered + source:"quiz" + CURRENT_PATCH (D-12/D-13)
  await db
    .insert(nodeProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id,       // D-13: NEVER from data
      nodeId,
      masteryState: "mastered",   // D-12: quiz only ever sets mastered
      source: "quiz",             // D-13: NEVER from data
      patchId: CURRENT_PATCH.id,  // D-13: NEVER from data
    })
    .onConflictDoUpdate({
      target: [nodeProgress.userId, nodeProgress.nodeId],
      set: {
        masteryState: sql`'mastered'`,
        source: sql`'quiz'`,
        patchId: sql`excluded.patch_id`,
        updatedAt: sql`now()`,
      },
    });

  // 2. Upsert quizProgress: increment attemptCount, set passed=true, stamp lastAttemptAt
  await db
    .insert(quizProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id,
      nodeId,
      passed: true,
      lastAttemptAt: new Date(),
      attemptCount: 1,
      lapseCount: 0,
    })
    .onConflictDoUpdate({
      target: [quizProgress.userId, quizProgress.nodeId],
      set: {
        passed: sql`true`,
        lastAttemptAt: sql`now()`,
        attemptCount: sql`${quizProgress.attemptCount} + 1`,
        // lapseCount: NOT incremented on pass (only on fail-after-pass)
      },
    });

  return { ok: true };
}

export const recordQuizPass = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(RecordQuizPassInput)
  .handler(recordQuizPassHandler);
```

**Failed-attempt tracking (for lapseCount):** A separate `recordQuizAttempt` server fn (or extend `recordQuizPass` to accept `{ nodeId, passed: boolean }`) increments `lapseCount` when `passed=false` AND the user already has a `quizProgress` row with `passed=true`. See Pattern 6.

### Pattern 3: quizProgress Drizzle Table (Forward-SRS Design)

**What:** Separate table from `nodeProgress` tracking quiz-attempt statistics and SRS seed fields.
**Why separate:** `nodeProgress` is the mastery state record (what the graph shows). `quizProgress` is the SRS tracking record (what the future scheduler needs). Mixing them would couple the mastery display to the quiz retention model.

```typescript
// Source: mirrors src/db/schema.ts nodeProgress pattern
// SPDX-License-Identifier: GPL-3.0-or-later

export const quizProgress = pgTable(
  "quiz_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),

    // D-07: minimum required fields
    passed: boolean("passed").notNull().default(false),
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),

    /**
     * lapseCount — RECOMMENDED addition (see SRS data model research below).
     * Count of failed quiz attempts AFTER the user has passed at least once.
     * Distinct from `attemptCount` (total). FSRS uses lapses to distinguish
     * "new card still being learned" from "previously mastered card that lapsed."
     * This field is trivially maintained (increment on fail-after-pass) and
     * IMPOSSIBLE to reconstruct retroactively from attemptCount alone.
     * Default 0; future SRS phase adds srsStability/srsDifficulty/dueAt columns.
     */
    lapseCount: integer("lapse_count").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("quiz_progress_user_node_unique").on(table.userId, table.nodeId),
    index("quiz_progress_userId_idx").on(table.userId),
  ]
);
```

**Relations:** Add `quizProgress: many(quizProgress)` to `usersRelations`, plus `quizProgressRelations` mirroring `nodeProgressRelations`.

### Pattern 4: Pass-rule Grading Engine

**What:** Pure deterministic function for QUIZ-02. Note: the D-05 table overrides the "at most one wrong" description for the 3-question case (3q→3/3, NOT 2/3).

```typescript
// src/lib/quiz-grading.ts
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Pass thresholds per question count (D-05).
 *
 * Key insight: the 3-question case is 3/3 (not 2/3).
 * "At most one wrong" only applies to 4q and 5q.
 * 3q authors must ensure all three questions are fair (no cheap distractors).
 */
export const PASS_THRESHOLD: Record<number, number> = {
  3: 3, // 3/3 — 100%
  4: 3, // 3/4 — 75%
  5: 4, // 4/5 — 80%
} as const;

/**
 * Determine quiz pass/fail from correct answer count.
 * @throws if total is not in [3, 5]
 */
export function gradeQuiz(total: number, correctCount: number): boolean {
  const threshold = PASS_THRESHOLD[total];
  if (threshold === undefined) {
    throw new Error(`gradeQuiz: invalid question count ${total}; must be 3, 4, or 5`);
  }
  return correctCount >= threshold;
}

/**
 * Grade a set of answers against shuffled questions.
 *
 * @param shuffledQuestions - questions in shuffled order
 * @param selectedOptionIndexes - user's selected option index per question (null = unanswered)
 * @returns { passed, correctCount, missedIndexes }
 */
export function gradeAnswers(
  shuffledQuestions: QuizQuestion[],
  selectedOptionIndexes: (number | null)[]
): { passed: boolean; correctCount: number; missedIndexes: number[] } {
  let correctCount = 0;
  const missedIndexes: number[] = [];

  for (let i = 0; i < shuffledQuestions.length; i++) {
    const q = shuffledQuestions[i];
    const selectedIdx = selectedOptionIndexes[i];
    const isCorrect = selectedIdx !== null && q.options[selectedIdx]?.isCorrect === true;
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
```

### Pattern 5: Quiz Shuffle (Fisher-Yates)

**What:** Shuffle questions and options at quiz start. Reshuffled on retry (D-06). Grading uses `isCorrect` on the shuffled option directly — no canonical-index remapping needed.

```typescript
// src/lib/quiz-grading.ts (continued)
// Fisher-Yates in-place shuffle (pure, no side effects)
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function prepareQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffle(questions).map((q) => ({
    ...q,
    options: shuffle(q.options),
  }));
}
```

**Key insight:** Because options are shuffled BY VALUE (not index-remapped), `selectedOptionIndexes[i]` maps directly to `shuffledQuestions[i].options[selectedIdx]` which carries the canonical `isCorrect` flag. No index translation layer needed.

### Pattern 6: sourceMap Slice in Graph Store

**What:** Add a `sourceMap: Record<string, string>` slice to `graph-store.ts` so both `MasteryBadge` (panel label) and `GraphNode` (canvas visual) can read `source:"quiz"` without leaking it into `GraphDisplayNode` projection (ADR 002/005).

```typescript
// src/lib/graph-store.ts additions
sourceMap: Record<string, string>;       // nodeId → source value
setSource: (nodeId: string, source: string) => void;
initSourceMap: (map: Record<string, string>) => void;
```

**ProgressProvider extension:** When hydrating from `progressRecords`, also build and call `initSourceMap`:
```typescript
const sourceMap: Record<string, string> = {};
for (const r of progressRecords) {
  map[r.nodeId] = r.masteryState as MasteryState;
  sourceMap[r.nodeId] = r.source;         // carry source through
}
initMasteryMap(map);
initSourceMap(sourceMap);                 // NEW
```

**Quiz mutation extension:** On pass, call `setSource(nodeId, "quiz")` alongside `setNodeMastery(nodeId, "mastered")` in `onMutate`.

### Pattern 7: Quiz UI Surface (In-Panel Takeover — D-09)

**Recommendation (Claude's Discretion D-09):** Use an in-panel takeover via Motion AnimatePresence, replacing `NodePanelContent`'s main content area with the `QuizTakeover` when quiz-open state is true.

**Why in-panel takeover over modal:**
- Reuses the existing panel z-index stack and scroll container
- No separate portal needed (consistent with Pitfall 1 from 03-RESEARCH: no Radix portals that escape CSS cascade)
- Node content is naturally hidden (replaced, not overlaid) — satisfies D-09 active recall constraint
- AnimatePresence cross-fade between content and quiz is 3 lines of Motion code

**Quiz-open state location:** Local component state (`useState`) inside `NodePanelContent`. Not in the graph store — quiz-open is panel-internal state that doesn't affect the graph canvas.

**Transition:** crossfade using Motion `key` prop + AnimatePresence. Content pane and quiz pane have the same layout container; key changes trigger exit/enter animations.

```tsx
// src/components/graph/NodePanelContent.tsx (sketch — planner fills in)
const [quizOpen, setQuizOpen] = useState(false);

<AnimatePresence mode="wait">
  {quizOpen ? (
    <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <QuizTakeover
        quiz={prepareQuiz(node.quiz)}
        nodeId={nodeId}
        onClose={() => setQuizOpen(false)}
      />
    </motion.div>
  ) : (
    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* ... existing panel content ... */}
      <QuizCTA
        nodeId={nodeId}
        hasQuiz={!!node.quiz}
        nodeType={node.nodeType}
        onStart={() => setQuizOpen(true)}
      />
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 8: Accessible RadioGroup for MCQ Options

**What:** Each quiz question renders options as a Radix RadioGroup. Provides role="radiogroup", role="radio", aria-checked, and Arrow key navigation natively.

```bash
npx shadcn@latest add radio-group
# Writes src/components/ui/radio-group.tsx
# No new npm install — @radix-ui/react-radio-group already in node_modules
```

```tsx
// src/components/graph/quiz/QuizQuestion.tsx (sketch)
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Label } from "#/components/ui/label";  // already in shadcn

function QuizQuestion({ question, selectedIndex, onSelect }: {...}) {
  return (
    <fieldset>
      <legend style={{ /* question text styles */ }}>{question.text}</legend>
      <RadioGroup
        value={selectedIndex !== null ? String(selectedIndex) : undefined}
        onValueChange={(v) => onSelect(Number(v))}
        aria-label={question.text}
      >
        {question.options.map((opt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RadioGroupItem value={String(i)} id={`opt-${i}`} />
            <Label htmlFor={`opt-${i}`}>{opt.text}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
```

**Accessibility:** Arrow keys navigate between options (Radix native). `fieldset` + `legend` wraps each question for screen reader context. After answer is selected, the "Next" button receives focus.

### Anti-Patterns to Avoid

- **Leaking quiz content into `GraphDisplayNode` projection:** ADR 002/005 prohibit content fields in the graph node data. Quiz questions must NOT appear in `displayNodes` or `layoutNodes`. They load lazily with panel content only.
- **Accepting `source` from client input:** The `recordQuizPass` input schema must have ZERO `source`/`userId`/`patchId` fields. Zod's default object stripping provides defense-in-depth.
- **Gamification drift in D-14 visual:** The quiz-mastered graph node indicator must be a subtle source distinction (e.g., a small rune glyph or a slightly brightened node border) — NOT a star, trophy, or XP badge. The anti-gamification guardrail from PROG-05 extends to visual design here.
- **Calling `recordQuizPass` on quiz fail:** Grading must run client-side first; the server fn is called ONLY on pass. The server fn itself cannot verify this — it stamps mastered unconditionally — so the client gate is the only protection. Tests must verify the UI never calls it on fail.
- **Storing quizProgress in nodeProgress:** Mixing mastery state tracking with quiz attempt statistics creates a future schema conflict when the SRS phase needs per-quiz fields that don't belong on the mastery record.
- **Using Fisher-Yates on the canonical question array:** Always shuffle a copy (`[...questions]`), never mutate the original loaded from content-collections. MDX compiled content is effectively frozen; mutations would corrupt the cache.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible single-select | Custom div-based radio | `shadcn radio-group` (Radix RadioGroup) | Arrow key nav, aria-checked, role="radio" are non-trivial to implement correctly; Radix handles all ARIA states |
| Panel animation | CSS transitions on class toggle | `motion/react` AnimatePresence with `mode="wait"` | AnimatePresence ensures exit animation completes before enter; class toggle causes layout flash |
| SRS scheduling | Custom interval calculator | Defer to dedicated SRS phase | SM-2 and FSRS have dozens of edge cases (lapses, relearn steps, optimal retention curves); Phase 6 only stores the seed data |
| Shuffle | `Math.random()` sort hack | Fisher-Yates on a copy | `arr.sort(() => Math.random() - 0.5)` is statistically biased (non-uniform distribution); Fisher-Yates is O(n) and unbiased |
| Server-side grading | Grading in `recordQuizPass` server fn | Client-side grading + call fn only on pass | Server-side grading would require sending all quiz questions to the server, violating the "client sends only nodeId" contract and leaking the answer key to the server unnecessarily |

**Key insight:** Lean on the existing `setNodeMasteryHandler` template for the quiz-pass write — do NOT reinvent the authorization pattern. The only delta is `source:"quiz"` + `masteryState` hardcoded to `"mastered"` + a second table upsert.

---

## Forward-SRS Data Model Research

### What SM-2, Leitner, and FSRS Actually Need

[CITED: https://faqs.ankiweb.net/what-spaced-repetition-algorithm] [CITED: https://expertium.github.io/Algorithm.html]

| Algorithm | Required Per-Card Persistent Fields |
|-----------|-------------------------------------|
| SM-2 | ease_factor (float, init 2.5), interval (int days), repetition_count (int), last_review_date |
| Leitner | box_number (int), last_review_date |
| FSRS | stability S (float, days to 90% retention drop), difficulty D (float 1–10), lapses (int), reps (int), last_review_date |

All three algorithms **do NOT need** to store retrievability/probability (computed dynamically from S + elapsed days).

### CONTEXT.md-Committed Fields vs Actual SRS Needs

| Field (CONTEXT.md D-07) | SM-2 Equivalent | FSRS Equivalent | Reconstructable? |
|-------------------------|-----------------|-----------------|------------------|
| `passed` (boolean) | last quality ≥ 3 | last rating = Good/Easy | Yes |
| `lastAttemptAt` (timestamp) | `last_review_date` | `last_review_date` | — |
| `attemptCount` (int, total) | NOT the same as `repetition_count` (consecutive correct) | `reps` | Approximate only |

**Gap identified:** Neither SM-2's `ease_factor` nor FSRS's `stability`/`difficulty` can be derived from the committed fields alone. However, these can be **initialized to defaults** by the SRS phase when it first schedules a review:
- SM-2: initialize `ease_factor=2.5`, `interval=1` for all passed nodes
- FSRS: initialize `stability=1.0`, `difficulty=5.0` (midpoint defaults) for all passed nodes

This is a safe bootstrap strategy — the SRS phase will schedule the first real review and learn the user's actual retention from their responses.

**The one field that CANNOT be reconstructed:** `lapseCount` — the count of failed attempts AFTER the user already passed. This is distinct from `attemptCount`. If a user passes, then retakes and fails 3 times, `attemptCount=4` and `lapseCount=3`. You cannot derive `lapseCount=3` from `attemptCount=4` without knowing the attempt history. FSRS uses lapses to select the "relearning" (vs "new card learning") algorithm branch.

### Recommendation: Add `lapseCount` Now

The committed fields (`passed`, `lastAttemptAt`, `attemptCount`) are SUFFICIENT to bootstrap SM-2 and most FSRS behavior. Adding `lapseCount` now costs zero migration risk (nullable-with-default=0 column in a new table) and prevents a hard-to-fix gap when the SRS phase runs.

**The future SRS phase will still need to add:** `srsStability` (float), `srsDifficulty` (float), `dueAt` (timestamp) — all as nullable columns with defaults. These are trivial `ALTER TABLE ADD COLUMN` migrations in Drizzle.

**Recommended `quizProgress` table columns for Phase 6:**
```
id, userId, nodeId, passed, lastAttemptAt, attemptCount, lapseCount, createdAt, updatedAt
```
(9 columns total — matches the nodeProgress column count pattern)

---

## Source Enum Extension

[ASSUMED] Extending a text column's valid values is a Zod-only change (no DDL migration needed for the `source` column since it's TEXT, not pgEnum):

**In `src/schemas/progress.ts`:**
```typescript
source: z.enum(["manual", "auto", "quiz"]).default("manual"),
```

**In `src/db/schema.ts`:** No change to the `source` column DDL (TEXT). The Zod schema enforces the valid values at the app layer (consistent with the existing pattern for `masteryState` TEXT column).

**In `src/server/progress.ts`:** No change. `setNodeMasteryHandler` still hardcodes `"manual"`.

**In `src/server/quiz.ts`:** `recordQuizPassHandler` hardcodes `"quiz"` (never read from input).

---

## Common Pitfalls

### Pitfall 1: Parallel-schema sync missed for quiz fields
**What goes wrong:** `src/schemas/node.ts` gets `QuizSchema` but `content-collections.ts` is not updated, or vice versa. Build passes locally (TypeScript checks `node.ts`) but content-collections fails to compile quiz frontmatter at runtime.
**Why it happens:** The PARALLEL-SCHEMA SYNC NOTE in `content-collections.ts` is a comment convention, not an enforced contract.
**How to avoid:** Update BOTH files in the same task/commit. The plan should have a single task that adds quiz schema to both files simultaneously.
**Warning signs:** Build succeeds but `quiz` field is typed as `undefined` in components despite MDX having quiz frontmatter.

### Pitfall 2: 3-question pass threshold misimplemented as 2/3
**What goes wrong:** "At most one wrong" rule applied uniformly → 3q pass = 2/3 correct. D-05 explicitly states 3q→3/3 (all three required).
**Why it happens:** The general description "at most one wrong (≈80%)" suggests 1 wrong is always allowed, but the explicit table overrides for the 3q case.
**How to avoid:** Use the explicit `PASS_THRESHOLD` lookup table (Pattern 4). Write property-based tests for all three counts. The implementation must throw for counts outside 3–5.
**Warning signs:** Test `gradeQuiz(3, 2)` returns true.

### Pitfall 3: Quiz content leaks into GraphDisplayNode
**What goes wrong:** `quiz` frontmatter field flows through the loader projection into `GraphDisplayNode`, violating ADR 002 (content/graph decoupling) and ADR 005 (projection rule).
**Why it happens:** Phase 3 extended `GraphDisplayNodeSchema` with `skillType` + `tags`; Phase 6 developers may copy that pattern for quiz content.
**How to avoid:** The loader must NOT project quiz content. Quiz loads only via `nodeContentQueryOptions` (the same path as citations/body). The graph store never holds quiz questions.
**Warning signs:** `GraphDisplayNode` type gains a `quiz?` field, or `allNodes` is accessed inside `RoadmapGraph.tsx` for quiz purposes.

### Pitfall 4: source field not threaded through to sourceMap
**What goes wrong:** `recordQuizPass` writes `source:"quiz"` to the DB. `ProgressProvider` re-fetches and calls `initMasteryMap` but NOT `initSourceMap`. The graph-node visual (D-14) and panel label (D-14) see no source distinction even after a quiz pass.
**Why it happens:** The existing ProgressProvider only builds a `Record<string, MasteryState>` map, discarding `source`. The sourceMap slice doesn't exist yet.
**How to avoid:** Add `initSourceMap` to graph store. Extend ProgressProvider hydration to build and call it. Quiz mutation's `onMutate` must call `setSource(nodeId, "quiz")` optimistically alongside `setNodeMastery`.
**Warning signs:** Graph node always shows the "untouched" visual even after a quiz pass.

### Pitfall 5: recordQuizPass called on every quiz completion (pass and fail)
**What goes wrong:** The quiz UI calls `recordQuizPass` unconditionally at the end of the quiz, regardless of grade.
**Why it happens:** The server fn name "recordQuizPass" doesn't itself gate on pass — it unconditionally stamps `mastered`. A UX bug that calls it on fail would stamp nodes as mastered without earning it.
**How to avoid:** The client-side grading (`gradeAnswers`) must return `passed=true` before the mutation fires. The `ResultsScreen` component receives `passed` as a prop and only calls the mutation if `passed`. Write a test that verifies `useQuizPassMutation.mutate` is NOT called when `gradeAnswers.passed === false`.
**Warning signs:** Failing the quiz sets the node to mastered.

### Pitfall 6: lapseCount not tracked on failed retakes
**What goes wrong:** A user passes a quiz, retakes it and fails, but `lapseCount` stays 0 because only `recordQuizPass` updates `quizProgress`.
**Why it happens:** There's only a "pass" server fn; no "attempt" server fn.
**How to avoid:** Add a `recordQuizAttempt` server fn (or extend `recordQuizPass` to accept `{ nodeId, passed: boolean }`). On `passed=false`: increment `attemptCount` and also increment `lapseCount` IF the user already has a row with `passed=true`. This way `lapseCount` correctly tracks failures-after-mastery.
**Warning signs:** `lapseCount` stays 0 for users who retake and fail after passing.

---

## Code Examples

### Content node frontmatter with quiz (CONCEPTUAL node example)

```yaml
# Source: content/nodes/[node-id].mdx — example for a CONCEPTUAL node
---
id: active-recall-training
nodeType: CONCEPTUAL
# ... other fields unchanged ...
quiz:
  - text: "You've just reviewed a build order note for the third time this week. What does spacing your next review session by several days accomplish?"
    options:
      - text: "It avoids disrupting your in-game routine"
        isCorrect: false
      - text: "It targets the memory trace right before it fades, strengthening long-term retention"
        isCorrect: true
      - text: "It ensures you review when the information is still fresh"
        isCorrect: false
      - text: "It maximizes the number of review sessions in a day"
        isCorrect: false
    explanation: "The spacing effect strengthens a memory trace precisely by allowing partial forgetting — retrieving the information just before it would be lost requires more cognitive effort, which signals to the brain to consolidate it more strongly."
---
```

### useQuizPassMutation hook

```typescript
// Source: mirrors src/hooks/useProgressMutation.ts pattern (Phase 5)
// SPDX-License-Identifier: GPL-3.0-or-later

export function useQuizPassMutation() {
  const queryClient = useQueryClient();
  const setNodeMastery = useGraphStore((s) => s.setNodeMastery);
  const setSource = useGraphStore((s) => s.setSource);
  const previousStateRef = useRef<MasteryState | undefined>(undefined);

  return useMutation({
    mutationFn: ({ nodeId }: { nodeId: string }) =>
      recordQuizPass({ data: { nodeId } }),

    onMutate: async ({ nodeId }) => {
      // Optimistic update: mastered + quiz source (D-09 parallel)
      const previousState = useGraphStore.getState().masteryMap[nodeId];
      previousStateRef.current = previousState;
      setNodeMastery(nodeId, "mastered");
      setSource(nodeId, "quiz");
      return { nodeId, previousState };
    },

    onError: (_err, { nodeId }, ctx) => {
      // Rollback optimistic update
      if (ctx?.previousState) setNodeMastery(nodeId, ctx.previousState);
      // Note: sourceMap rollback — if previousState existed, source was already there
      toast.error("Couldn't save quiz result", {
        description: "Your mastery state has been reverted.",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SM-2 (1987, SuperMemo) | FSRS (2022, open-source) | 2022–2024, Anki default since 2024 | FSRS better models per-card difficulty; Phase 6 data model should be FSRS-compatible (lapseCount is the key enabler) |
| Radix UI components individually (`@radix-ui/react-radio-group`) | `radix-ui` monorepo bundle | 2024 | Project already uses `radix-ui@1.6.0`; all Radix primitives included |
| `framer-motion` | `motion` (import from `motion/react`) | 2024 | Already followed per CLAUDE.md; no change needed |
| `tailwindcss-animate` | CSS transitions or Motion | March 2025 | Already followed per CLAUDE.md |

**Deprecated/outdated:**
- SM-2's "quality rating 0–5" model: Phase 6's binary pass/fail maps to SM-2 quality=4 ("correct with hesitation") — sufficient for initialization but not for accurate interval tuning. FSRS handles this more gracefully.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/quiz-grading.test.ts src/schemas/node.test.ts src/server/quiz.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUIZ-01 | QuizSchema rejects <3 questions | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-01 | QuizSchema rejects >5 questions | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-01 | Quiz frontmatter accepted by NodeFrontmatterSchema | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-01 | `quiz: undefined` → NodeFrontmatterSchema still valid (CONCEPTUAL no-quiz) | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-02 | `gradeQuiz(3,3)=true, gradeQuiz(3,2)=false` | unit | `npx vitest run src/lib/quiz-grading.test.ts` | ❌ Wave 0 |
| QUIZ-02 | `gradeQuiz(4,3)=true, gradeQuiz(4,2)=false` | unit | `npx vitest run src/lib/quiz-grading.test.ts` | ❌ Wave 0 |
| QUIZ-02 | `gradeQuiz(5,4)=true, gradeQuiz(5,3)=false` | unit | `npx vitest run src/lib/quiz-grading.test.ts` | ❌ Wave 0 |
| QUIZ-02 | `recordQuizPassHandler` stamps source="quiz", masteryState="mastered" (ignores forged values) | unit | `npx vitest run src/server/quiz.test.ts` | ❌ Wave 0 |
| QUIZ-02 | `recordQuizPassHandler` rejects nodeId from forged data containing userId/source/masteryState | unit | `npx vitest run src/server/quiz.test.ts` | ❌ Wave 0 |
| QUIZ-02 | Graph re-renders affected node only after quiz pass (no page reload) | manual | end-of-phase human verify | — |
| QUIZ-03 | QuizQuestionSchema rejects question with 0 correct answers | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-03 | QuizQuestionSchema rejects question with >1 correct answers | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-03 | QuizQuestionSchema rejects question missing `explanation` | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| QUIZ-03 | Demo quiz questions cannot be answered by re-reading node surface text | manual review | human subject-matter review | — |
| D-04 | MECHANIC nodeType → no "Take Assessment" CTA rendered | component | `npx vitest run src/components/graph/quiz/*.test.tsx` | ❌ Wave 0 |
| D-04 | CONCEPTUAL + no quiz field → no CTA | component | `npx vitest run src/components/graph/quiz/*.test.tsx` | ❌ Wave 0 |
| D-04 | CONCEPTUAL + quiz present → CTA renders | component | `npx vitest run src/components/graph/quiz/*.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/quiz-grading.test.ts src/schemas/node.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/schemas/node.test.ts` — extend existing file: QuizSchema tests (QUIZ-01, QUIZ-03)
- [ ] `src/lib/quiz-grading.test.ts` — NEW: gradeQuiz boundary tests, gradeAnswers, shuffle purity
- [ ] `src/server/quiz.test.ts` — NEW: recordQuizPassHandler server-stamp tests (QUIZ-02 security)
- [ ] `src/components/graph/quiz/QuizCTA.test.tsx` — NEW: nodeType gate rendering tests (D-04)

*(Existing test infrastructure: Vitest + jsdom already configured. Component tests use `@vitest-environment jsdom` directive at file top — consistent with `MasteryControls.test.tsx` pattern.)*

---

## Security Domain

> `security_enforcement: true` in `.planning/config.json`. ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Quiz is auth-gated (authedServerFn) but no new auth flows |
| V3 Session Management | no | Reuses existing session infrastructure |
| V4 Access Control | yes | `recordQuizPassHandler` principal-keyed; no userId from client (ADR 007) |
| V5 Input Validation | yes | `RecordQuizPassInput` Zod schema — strips all fields except `nodeId`; no quiz answers sent to server |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged mastery write: client sends `{ nodeId, source:"quiz", masteryState:"mastered" }` | Tampering | `RecordQuizPassInput` has no `source`/`masteryState` fields; Zod strips extra fields; server hardcodes both |
| IDOR: client sends another user's `nodeId` | Elevation of Privilege | Server fn is principal-keyed — `userId` comes from session, not input (ADR 007) |
| Quiz bypass: client calls `recordQuizPass` without completing quiz | Tampering | Unavoidable without server-side grading. Accepted trade-off: quiz is not security-critical (no monetary or competitive consequence; self-mastery tracking only). Document in ADR 010. |
| Shuffle prediction: attacker intercepts shuffled questions to determine correct answers | Information Disclosure | Answers are in the MDX content (open source, GPL-3.0). No server-side secret. Accepted: the project is public OSS; the integrity value is self-honesty, not secret verification. |
| XSS via quiz question text | Tampering | Quiz text is authored in version-controlled MDX, not user-submitted. Same trust level as existing citation text. No sanitization needed beyond existing MDX compile pipeline. |

---

## Environment Availability

No external dependencies introduced in Phase 6. All runtimes, services, and tools are already confirmed from prior phases:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Drizzle migration, Vitest | ✓ | (existing) | — |
| Neon PostgreSQL | quizProgress table migration | ✓ | (existing, Phase 4) | — |
| `shadcn` CLI | radio-group component add | ✓ | (existing) | Write component manually |
| `@radix-ui/react-radio-group` | shadcn radio-group | ✓ | bundled in `radix-ui@1.6.0` | — |

---

## Project Constraints (from CLAUDE.md)

- TanStack Start + TanStack Router + TanStack Query — no alternatives
- `@xyflow/react` 12.x — already present; quiz-mastered visual uses existing node component
- `drizzle-orm` 0.45.2 + `drizzle-kit` 0.31.10 — pinned; use for quizProgress migration
- `zod` 4.x — strict idioms: `{ error: "..." }` not `{ message: "..." }`; no `z.nativeEnum()`
- `motion` (from `motion/react`) — not `framer-motion`
- SPDX `GPL-3.0-or-later` header on every new `.ts/.tsx`
- Vitest colocated `*.test.ts(x)` — per-file `@vitest-environment jsdom` for React component tests
- Parallel-schema sync: any frontmatter schema change must go into BOTH `src/schemas/node.ts` AND `content-collections.ts`
- Architecture discipline: deep modules — `quiz-grading.ts` and `src/server/quiz.ts` are the candidate deep modules for this phase
- ADR in `docs/adr/` for significant choices; next number is ADR 010
- CONTEXT.md domain terms to add: `quiz`, `assessment`, `active recall`, `quiz source`, `pass threshold`, `quiz mastery`, `lapse`
- No XP, streaks, leaderboards, or gamification in any surface (PROG-05 extends to Phase 6)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding `lapseCount` as int with default 0 to `quizProgress` is the right FSRS forward hook (vs also adding `srsStability`, `srsDifficulty` now) | Forward-SRS Data Model | Low: if FSRS is chosen as the SRS algorithm, SRS phase will add stability/difficulty as nullable columns — a trivial migration |
| A2 | `@radix-ui/react-radio-group` in `radix-ui@1.6.0` is API-compatible with the `shadcn radio-group` component template | Standard Stack | Low: confirmed package is in node_modules; shadcn CLI generates compatible component — if version mismatch, write component manually |
| A3 | The `content-collections.ts` schema validation (at build time) enforces `QuizSchema` before `transform` runs, so no manual quiz validation needed in `transform` | Architecture Patterns Pitfall 1 | Low: if validation order differs, add explicit quiz validation to transform (same as the How-to-Apply check) |
| A4 | The `TEXT` source column in `nodeProgress` allows the value `"quiz"` without DDL change | Source Enum Extension | Low: TEXT column accepts any string; Zod validates at app layer; no pgEnum to migrate |

---

## Open Questions

1. **lapseCount recording on failed attempts**
   - What we know: `recordQuizPass` handles the pass path. Failed attempts also need `attemptCount++` and (conditionally) `lapseCount++`.
   - What's unclear: Should there be a separate `recordQuizAttempt({ nodeId, passed: boolean })` server fn, or should `recordQuizPass` be renamed to handle both outcomes?
   - Recommendation: Implement `recordQuizAttempt` (a second server fn that handles both pass and fail paths with a `passed` boolean). It handles: pass→upsert nodeProgress, pass→upsert quizProgress(passed=true,lapseCount unchanged), fail-after-pass→upsert quizProgress(lapseCount++). Keep `recordQuizPass` as a convenience alias or remove if the planner prefers one fn. The planner decides the naming.

2. **Graph-node quiz-mastered visual (D-14)**
   - What we know: Must be subtle, within obsidian/rune-gold system, not a gamification badge.
   - What's unclear: Exact visual treatment — a small `◆` rune marker? A slightly brighter rune-gold border? An underline?
   - Recommendation: Small rune-gold diamond `◆` icon in the top-right corner of the node face (where the node type icon currently is, or adjacent to it). Requires extending `GraphNode.tsx` and `GraphDisplayNodeData` type with a `masterySource` prop (or subscribing to `sourceMap` directly in `GraphNode` via `useGraphStore`). The plan-design-review should confirm the visual.

3. **shadcn `label` component availability**
   - What we know: The quiz RadioGroup pattern uses `Label` from shadcn. The shadcn `label` component is NOT currently installed (only `button`, `badge`, `tooltip`, `dialog`, `dropdown-menu`, `toggle-group`, `toggle`, `sonner`, `avatar` are in `src/components/ui/`).
   - What's unclear: Should the planner add `npx shadcn add label` in Wave 0, or use a `<label>` HTML element directly?
   - Recommendation: Use plain `<label htmlFor>` with inline styles rather than installing another shadcn component. Keeps component surface minimal.

---

## Sources

### Primary (MEDIUM confidence)
- [Context7 /colinhacks/zod — superRefine, array.min/max](https://github.com/colinhacks/zod) — Zod v4 superRefine `ctx.addIssue` signature; `origin` field in v4; `z.array().min().max()`
- [Anki FAQ — SM-2 algorithm](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) — SM-2 required fields: ease_factor, interval, repetition_count
- [Expertium's blog — FSRS technical explanation](https://expertium.github.io/Algorithm.html) — FSRS per-card fields: stability S, difficulty D, lapses, reps; retrievability R is computed

### Secondary (MEDIUM confidence)
- [RemNote help — SM-2 algorithm](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm) — ease factor min 1.3, default 2.5
- [RemNote help — FSRS algorithm](https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm) — stability/difficulty/retrievability model
- [open-spaced-repetition/rs-fsrs DeepWiki](https://deepwiki.com/open-spaced-repetition/rs-fsrs/3.1-fsrs-algorithm-overview) — FSRS persistent fields

### Codebase (HIGH confidence — read directly)
- `src/schemas/node.ts` — NodeFrontmatterSchema, CitationSchema, parallel-sync note
- `src/schemas/progress.ts` — MasteryStateSchema, ProgressRecordSchema, source enum
- `src/db/schema.ts` — nodeProgress table pattern; surrogate PK, TEXT mastery/source, uniqueIndex
- `src/server/progress.ts` — setNodeMasteryHandler (exact template for recordQuizPassHandler)
- `src/server/progress.test.ts` — vi.doMock + resetModules test pattern
- `src/lib/graph-store.ts` — masteryMap slice; setNodeMastery + initMasteryMap pattern
- `src/components/graph/ProgressProvider.tsx` — hydration pattern; sourceMap extension point
- `src/components/graph/NodePanelContent.tsx` — panel integration point; currentState from store
- `src/components/graph/MasteryControls.tsx` — CTA grouping integration point (D-11)
- `src/components/graph/MasteryBadge.tsx` — source label extension point (D-14)
- `src/components/graph/NodeDetailPanel.tsx` — AnimatePresence pattern for in-panel takeover
- `content-collections.ts` — parallel-schema sync, transform enforcement pattern
- `content/nodes/tech-timing.mdx` — CONCEPTUAL node frontmatter example
- `package.json` / `node_modules/@radix-ui/react-radio-group` — Radix RadioGroup confirmed available

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new npm packages
- Architecture: HIGH — directly modeled on Phase 5 patterns with verified codebase inspection
- SRS data model: MEDIUM — SM-2/FSRS fields confirmed via multiple authoritative sources (Anki docs, FSRS technical blog)
- Zod v4 patterns: MEDIUM — verified via Context7 official Zod docs
- Pitfalls: HIGH — derived from direct codebase inspection of existing patterns

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable tech; no external API dependencies)

## RESEARCH COMPLETE
