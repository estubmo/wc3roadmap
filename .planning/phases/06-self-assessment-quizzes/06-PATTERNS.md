# Phase 6: Self-Assessment Quizzes - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/schemas/node.ts` | schema | transform | `src/schemas/node.ts` (existing) | extend |
| `content-collections.ts` | config | transform | `content-collections.ts` (existing) | extend |
| `src/schemas/progress.ts` | schema | transform | `src/schemas/progress.ts` (existing) | extend |
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` `nodeProgress` table | exact |
| `src/server/quiz.ts` | service | request-response | `src/server/progress.ts` `setNodeMasteryHandler` | exact |
| `src/lib/quiz-grading.ts` | utility | transform | `src/lib/pathway-utils.ts` (pure fn module) | role-match |
| `src/lib/graph-store.ts` | store | event-driven | `src/lib/graph-store.ts` (existing) | extend |
| `src/hooks/useQuizPassMutation.ts` | hook | request-response | `src/hooks/useProgressMutation.ts` | exact |
| `src/components/graph/ProgressProvider.tsx` | provider | event-driven | `src/components/graph/ProgressProvider.tsx` (existing) | extend |
| `src/components/graph/NodePanelContent.tsx` | component | request-response | `src/components/graph/NodePanelContent.tsx` (existing) | extend |
| `src/components/graph/MasteryControls.tsx` | component | event-driven | `src/components/graph/MasteryControls.tsx` (existing) | extend |
| `src/components/graph/MasteryBadge.tsx` | component | transform | `src/components/graph/MasteryBadge.tsx` (existing) | extend |
| `src/components/graph/GraphNode.tsx` | component | transform | `src/components/graph/GraphNode.tsx` (existing) | extend |
| `src/components/graph/quiz/` (4 new files) | component | event-driven | `src/components/graph/NodeDetailPanel.tsx` (AnimatePresence) | role-match |

---

## Pattern Assignments

### `src/schemas/node.ts` — extend with QuizSchema

**Analog:** `src/schemas/node.ts` lines 82–126 (CitationSchema sub-schema pattern)

**Sub-schema nesting pattern** (lines 82–99 — `ScienceCitationSchema` as the model):
```typescript
// PARALLEL-SCHEMA SYNC NOTE: mirror QuizOptionSchema, QuizQuestionSchema,
// QuizSchema identically in content-collections.ts schema object.
const QuizOptionSchema = z.object({
  text: z.string().min(1, { error: "Option text cannot be empty (QUIZ-01)" }),
  isCorrect: z.boolean(),
});

const QuizQuestionSchema = z.object({
  text: z.string().min(1, { error: "Question text cannot be empty (QUIZ-01)" }),
  options: z
    .array(QuizOptionSchema)
    .min(2)
    .max(5)
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
  explanation: z.string().min(1, {
    error: "explanation is required on every quiz question (D-03/QUIZ-03 structural guardrail)",
  }),
});

export const QuizSchema = z
  .array(QuizQuestionSchema)
  .min(3, { error: "A quiz requires at least 3 questions (QUIZ-01)" })
  .max(5, { error: "A quiz may have at most 5 questions (QUIZ-01)" });
```

**NodeFrontmatterSchema extension** (line 162 — `.extend({...})` pattern):
```typescript
// Add inside NodeFrontmatterSchema.extend({...}):
quiz: QuizSchema.optional(),  // D-04: undefined → no "Take Assessment" button
```

**Zod v4 idiom rule** (from existing file throughout): always `{ error: "..." }` not `{ message: "..." }`, never `z.nativeEnum()`.

---

### `content-collections.ts` — mirror quiz schema + add CI enforcement

**Analog:** `content-collections.ts` lines 61–81 (citations discriminated union inline mirror) + lines 83–116 (transform enforcement pattern)

**Inline mirror pattern** (add after `citations` field, lines 61–81):
```typescript
// PARALLEL-SCHEMA SYNC NOTE: mirror of QuizOptionSchema/QuizQuestionSchema/QuizSchema
// in src/schemas/node.ts. Keep field-for-field identical.
quiz: z.array(
  z.object({
    text: z.string().min(1),
    options: z.array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
      .min(2).max(5)
      .superRefine((options, ctx) => {
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          ctx.addIssue({ code: "custom", message: `exactly one correct answer required`, input: options });
        }
      }),
    explanation: z.string().min(1, { error: "explanation required (QUIZ-03)" }),
  })
).min(3).max(5).optional(),
```

**Transform CI enforcement pattern** (copy from lines 86–91 — `## How to Apply` check):
```typescript
// In transform(), BEFORE compileMDX — same pattern as How-to-Apply check:
if (document.quiz !== undefined) {
  if (document.quiz.length < 3 || document.quiz.length > 5) {
    throw new Error(
      `Node "${document.id}": quiz must have 3–5 questions (QUIZ-01).`
    );
  }
  // Zod superRefine already enforced exactly-one-correct at schema parse time.
  // No redundant check needed here — build fails before transform runs.
}
```

> Note: Zod schema validation runs before `transform`. The `superRefine` in the schema catches missing/multiple correct answers at parse time. The transform guard above is a belt-and-suspenders count check only — the explanation/correct-answer guardrails are schema-enforced.

---

### `src/schemas/progress.ts` — extend `source` enum

**Analog:** `src/schemas/progress.ts` lines 93 (source enum definition)

**Current (line 93):**
```typescript
source: z.enum(["manual", "auto"]).default("manual"),
```

**Extended (Phase 6 change):**
```typescript
source: z.enum(["manual", "auto", "quiz"]).default("manual"),
```

No DDL migration needed — `source` column is TEXT in `nodeProgress`. Zod enforces valid values at the app layer (same as `masteryState` TEXT column pattern, schema.ts lines 311–321).

---

### `src/db/schema.ts` — add `quizProgress` table

**Analog:** `src/db/schema.ts` lines 292–347 (`nodeProgress` table — exact structural template)

**Column pattern** (copy `nodeProgress`, lines 292–347, replace mastery-specific columns):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
export const quizProgress = pgTable(
  "quiz_progress",
  {
    id: text("id").primaryKey(),                                 // surrogate text PK — line 296 pattern
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),     // FK + cascade — line 299 pattern
    nodeId: text("node_id").notNull(),                           // content node ref — line 304 pattern

    // D-07: minimal SRS seed fields
    passed: boolean("passed").notNull().default(false),
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lapseCount: integer("lapse_count").notNull().default(0),     // FSRS forward hook — cannot reconstruct retroactively

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),                                                // $onUpdate pattern — line 332 pattern
  },
  (table) => [
    uniqueIndex("quiz_progress_user_node_unique").on(table.userId, table.nodeId), // upsert target — line 343 pattern
    index("quiz_progress_userId_idx").on(table.userId),          // covering index — line 345 pattern
  ]
);
```

**Relations pattern** (copy `usersRelations` line 246–250 + `nodeProgressRelations` lines 353–358):
```typescript
// Add to usersRelations:
quizProgress: many(quizProgress),

// New relation (mirrors nodeProgressRelations):
export const quizProgressRelations = relations(quizProgress, ({ one }) => ({
  user: one(users, {
    fields: [quizProgress.userId],
    references: [users.id],
  }),
}));
```

**Drizzle imports to add:** `boolean`, `integer` (add to existing `pg-core` import at line 22).

---

### `src/server/quiz.ts` — NEW: `recordQuizPass` server function

**Analog:** `src/server/progress.ts` lines 48–164 (`SetNodeMasteryInput` + `setNodeMasteryHandler` + `setNodeMastery` — the EXACT template)

**Input schema** (copy `SetNodeMasteryInput` lines 48–53, strip all but `nodeId`):
```typescript
// CRITICAL: no source, userId, masteryState, patchId — all server-stamped (D-13)
export const RecordQuizPassInput = z.object({
  nodeId: z.string().min(1),
});
```

**Handler** (copy `setNodeMasteryHandler` lines 121–153, add second table upsert):
```typescript
export async function recordQuizPassHandler({
  context,
  data,
}: AuthedContext & { data: z.infer<typeof RecordQuizPassInput> }) {
  const { principal } = context;
  const { nodeId } = RecordQuizPassInput.parse(data);  // strips extra fields — line 130 pattern

  // 1. Upsert nodeProgress: mastered + source:"quiz" + CURRENT_PATCH (D-12/D-13)
  await db
    .insert(nodeProgress)
    .values({
      id: crypto.randomUUID(),            // line 135 pattern
      userId: principal.id,              // D-13: NEVER from data — line 136 pattern
      nodeId,
      masteryState: "mastered",          // D-12: quiz only ever sets mastered
      source: "quiz",                    // D-13: NEVER from data (hardcoded)
      patchId: CURRENT_PATCH.id,        // D-13: NEVER from data — line 139 pattern
    })
    .onConflictDoUpdate({
      target: [nodeProgress.userId, nodeProgress.nodeId],  // line 143 pattern
      set: {
        masteryState: sql`'mastered'`,
        source: sql`'quiz'`,
        patchId: sql`excluded.patch_id`,
        updatedAt: sql`now()`,           // line 149 pattern
      },
    });

  // 2. Upsert quizProgress: track attempt + SRS seed fields (D-07/D-08)
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
        updatedAt: sql`now()`,
      },
    });

  return { ok: true };  // line 152 pattern
}

export const recordQuizPass = createServerFn({ method: "POST" })  // line 161 pattern
  .middleware([authMiddleware])
  .validator(RecordQuizPassInput)
  .handler(recordQuizPassHandler);
```

**Module JSDoc contract** (copy from `progress.ts` lines 4–26 — authorization contract, server-stamped fields, deep-module discipline).

**Imports** (copy lines 28–35 from `progress.ts`, replace `nodeProgress` with `{ nodeProgress, quizProgress }`).

---

### `src/server/quiz.test.ts` — NEW: server-stamp regression tests

**Analog:** `src/server/progress.test.ts` — the complete `vi.doMock` + `vi.resetModules` + dynamic `import()` pattern

**Test structure** (copy `progress.test.ts` lines 1–113 — fixtures + beforeEach mock wiring):
```typescript
// Copy principalA fixture (lines 32–44) — identical shape
// Copy beforeEach vi.resetModules() + vi.doMock() block (lines 61–113) verbatim
// Replace "#/db/schema" mock to expose quizProgress columns alongside nodeProgress
// Replace "#/server/progress" import with "#/server/quiz"
```

**Critical test to copy** (`setNodeMasteryHandler` stamps test, lines 146–231):
```typescript
// Copy test pattern exactly — rename for quiz:
it("stamps source='quiz' regardless of any source field in data", ...);
it("stamps masteryState='mastered' regardless of any masteryState in data", ...);
it("stamps patchId=CURRENT_PATCH.id regardless of any patchId in data", ...);
it("writes userId from principal.id, not from any forged field in data", ...);
```

**Mock wiring for two-table upsert** (extend `mockValues` from line 70 to capture both insert calls):
```typescript
// mockValues is called once per db.insert().values() — need to capture both:
expect(mocks.capturedInsertValues).toHaveLength(2);  // nodeProgress + quizProgress
const [nodeProgressWrite, quizProgressWrite] = mocks.capturedInsertValues;
```

---

### `src/lib/quiz-grading.ts` — NEW: pure grading engine

**Analog:** No direct analog (no existing pure-function utility modules with this shape). Follow the existing `src/lib/patches.ts` pattern (lines 1–62) for pure module structure: SPDX header, JSDoc per export, typed const records.

**File structure:**
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

import type { QuizQuestion } from "#/schemas/node";

export const PASS_THRESHOLD: Record<number, number> = {
  3: 3,  // 3/3 — 100% (3q case requires all correct per D-05)
  4: 3,  // 3/4 — 75%
  5: 4,  // 4/5 — 80%
} as const;

export function gradeQuiz(total: number, correctCount: number): boolean { ... }
export function gradeAnswers(shuffledQuestions: QuizQuestion[], selectedOptionIndexes: (number | null)[]): { passed: boolean; correctCount: number; missedIndexes: number[] } { ... }
export function shuffle<T>(arr: T[]): T[] { ... }  // Fisher-Yates on a copy
export function prepareQuiz(questions: QuizQuestion[]): QuizQuestion[] { ... }
```

---

### `src/lib/graph-store.ts` — extend with `sourceMap` slice

**Analog:** `src/lib/graph-store.ts` lines 162–185 (`masteryMap` slice — the exact parallel to extend)

**Interface extension** (add after `initMasteryMap` at line 184):
```typescript
// --- Phase 6: source map (quiz vs manual vs auto label) ---

/**
 * Per-node mastery source map, keyed by node ID (D-14).
 * Parallel to masteryMap — same subscription pattern.
 * Use useShallow when subscribing (same Pitfall 2 from 05-RESEARCH.md applies).
 */
sourceMap: Record<string, string>;

/** Optimistically update a single node's source value. */
setSource: (nodeId: string, source: string) => void;

/** Bulk-initialize the source map from a server response. */
initSourceMap: (map: Record<string, string>) => void;
```

**Implementation** (copy `masteryMap` slice, lines 239–247, rename):
```typescript
// Phase 6: source map
sourceMap: {},

setSource: (nodeId, source) => {
  set((s) => ({ sourceMap: { ...s.sourceMap, [nodeId]: source } }));
},

initSourceMap: (map) => {
  set({ sourceMap: map });
},
```

---

### `src/hooks/useQuizPassMutation.ts` — NEW: quiz-pass mutation hook

**Analog:** `src/hooks/useProgressMutation.ts` lines 72–146 — the EXACT template

**Copy structure** (lines 72–146 verbatim, with these deltas only):
```typescript
// Delta 1: mutationFn — only signed-in path (quiz always requires auth)
mutationFn: ({ nodeId }: { nodeId: string }) =>
  recordQuizPass({ data: { nodeId } }),  // no masteryState/source input

// Delta 2: onMutate — set BOTH mastery AND source optimistically
onMutate: async ({ nodeId }) => {
  await queryClient.cancelQueries({ queryKey: progressKeys.byUser() });
  const previousState = useGraphStore.getState().masteryMap[nodeId];
  const previousSource = useGraphStore.getState().sourceMap[nodeId];
  useGraphStore.getState().setNodeMastery(nodeId, "mastered");  // line 108 pattern
  useGraphStore.getState().setSource(nodeId, "quiz");           // NEW
  return { previousState, previousSource, nodeId };
},

// Delta 3: onError rollback — also rollback source
onError: (_err, { nodeId }, ctx) => {
  if (ctx?.previousState) useGraphStore.getState().setNodeMastery(nodeId, ctx.previousState);
  if (ctx?.previousSource) useGraphStore.getState().setSource(nodeId, ctx.previousSource);
  toast.error("Couldn't save quiz result", {      // copy toast pattern from lines 122–130
    description: "Your mastery state has been reverted.",
  });
},

// Delta 4: onSettled — same invalidation pattern (line 132–137)
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
},
```

---

### `src/components/graph/ProgressProvider.tsx` — extend `sourceMap` hydration

**Analog:** `src/components/graph/ProgressProvider.tsx` lines 80–90 (Effect A — server progress hydration)

**Extension point** (lines 81–90 — add `sourceMap` build alongside `masteryMap`):
```typescript
// In Effect A (useEffect for progressRecords), extend the loop:
useEffect(() => {
  if (!progressRecords) return;
  const map: Record<string, MasteryState> = {};
  const sourceMap: Record<string, string> = {};  // NEW
  for (const r of progressRecords) {
    map[r.nodeId] = r.masteryState as MasteryState;
    sourceMap[r.nodeId] = r.source;              // NEW — carry source through
  }
  initMasteryMap(map);
  initSourceMap(sourceMap);                      // NEW
}, [progressRecords, initMasteryMap, initSourceMap]);
```

---

### `src/components/graph/NodePanelContent.tsx` — add quiz CTA + takeover

**Analog:** `src/components/graph/NodePanelContent.tsx` lines 220–431 — panel content integration pattern

**AnimatePresence takeover pattern** (from `NodeDetailPanel.tsx` lines 88–158):
```typescript
// Add to NodePanelContent: local quiz-open state
const [quizOpen, setQuizOpen] = useState(false);

// Wrap panel body content in AnimatePresence (same motion/react import as NodeDetailPanel.tsx line 42):
<AnimatePresence mode="wait">
  {quizOpen ? (
    <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <QuizTakeover quiz={prepareQuiz(node.quiz)} nodeId={nodeId} onClose={() => setQuizOpen(false)} />
    </motion.div>
  ) : (
    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      {/* existing panel body content (lines 330–426) */}
      {node.nodeType === "CONCEPTUAL" && node.quiz && (
        <QuizCTA
          nodeId={nodeId}
          onStart={() => setQuizOpen(true)}
        />
      )}
    </motion.div>
  )}
</AnimatePresence>
```

**CTA placement** (after `<MasteryControls>` at line 339, before `How to Apply` section):
- Group `QuizCTA` with or immediately below `MasteryControls` (D-11).
- Gate: `node.nodeType === "CONCEPTUAL" && node.quiz !== undefined` (D-04/D-15).

**Source from store** (extend line 227–229 selector):
```typescript
const currentState = useGraphStore(useShallow((s) => s.masteryMap[nodeId] ?? "untouched"));
const currentSource = useGraphStore(useShallow((s) => s.sourceMap[nodeId]));  // NEW
```

---

### `src/components/graph/MasteryControls.tsx` — add "Take Assessment" CTA grouping

**Analog:** `src/components/graph/MasteryControls.tsx` lines 55–145

**Integration point:** The `QuizCTA` is a sibling component rendered below `MasteryControls` in `NodePanelContent.tsx` (not inside `MasteryControls.tsx`). This keeps the CTA grouped visually with mastery controls without coupling the two components.

**Label logic** (reads from `sourceMap` via `NodePanelContent` prop threading):
```typescript
// QuizCTA label (D-11/D-15):
const hasQuizPassed = currentState === "mastered" && currentSource === "quiz";
const ctaLabel = hasQuizPassed ? "Retake assessment" : "Take Assessment";
```

**Button style** (copy inactive toggle style from `MasteryControls` lines 176–183):
```typescript
// Use obsidian-700 bg + rune-400 text + rune-600 border for quiz CTA
// to visually separate it from the three mastery toggles
```

---

### `src/components/graph/MasteryBadge.tsx` — extend to label `source:"quiz"`

**Analog:** `src/components/graph/MasteryBadge.tsx` lines 15–72 — full file

**Props extension:**
```typescript
interface MasteryBadgeProps {
  state: MasteryState;
  source?: string;  // NEW: "quiz" | "manual" | "auto" | undefined
}
```

**Label extension** (add to the `state === "mastered"` branch, lines 53–72):
```typescript
// state === "mastered"
return (
  <span style={{ /* existing mastered styles — lines 55–69 */ }}>
    {source === "quiz" ? "Mastered · via quiz" : "Mastered"}
  </span>
);
```

---

### `src/components/graph/GraphNode.tsx` — add quiz-mastered visual variant

**Analog:** `src/components/graph/GraphNode.tsx` lines 71–123 (CVA variants + `masteryStyles` map)

**sourceMap subscription** (add after `data` cast at line 181):
```typescript
// Subscribe to sourceMap for this node (D-14 canvas visual)
// Use useGraphStore.getState() inside memo or subscribe in the component:
const masterySource = useGraphStore((s) => s.sourceMap[d.id]);
```

**CVA variant extension** (add after `mastered` variant in `masteryStyles`, lines 114–123):
```typescript
// "mastered-quiz" is NOT a separate CVA variant — it reuses the "mastered"
// CVA class (same color contract) with a subtle overlay/marker added in JSX.
// This avoids adding a fourth masteryState value to MasteryStateSchema.
```

**Visual marker** (add inside the top-right slot alongside `<MasteryBadge>`, lines 216–232):
```typescript
{/* Quiz-mastered indicator (D-14) — subtle source distinction only */}
{masterySource === "quiz" && masteryState === "mastered" && (
  <span
    aria-label="Mastered via quiz"
    style={{
      fontSize: "9px",
      color: "var(--color-rune-400)",
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    ◆
  </span>
)}
```

> Design guardrail: the `◆` marker is the lightest possible indicator — a single rune-400 glyph in 9px. Must NOT drift to a star, trophy, or badge (PROG-05 anti-gamification).

---

### `src/components/graph/quiz/` — NEW quiz UI components (4 files)

**Analog for AnimatePresence host:** `src/components/graph/NodeDetailPanel.tsx` lines 81–158 (AnimatePresence + motion.div cross-fade pattern)

**QuizTakeover.tsx** — in-panel takeover host:
```typescript
// Imports pattern (copy NodeDetailPanel.tsx lines 40–44):
import { motion, AnimatePresence } from "motion/react";
// Local state: currentQuestion index, selectedAnswers array, phase ("quiz" | "results")
// On pass: call useQuizPassMutation().mutate({ nodeId })
// On results phase: show QuizResults with missedIndexes + explanations
```

**QuizStepper.tsx** — one question at a time (D-10):
```typescript
// Props: question, questionIndex, totalQuestions, selectedIndex, onSelect, onNext
// "Next" button disabled until an option is selected
// Progress: "Question {i+1} of {total}" — no per-question score reveal (D-10)
```

**QuizQuestion.tsx** — RadioGroup MCQ (shadcn radio-group):
```typescript
// After: npx shadcn@latest add radio-group → src/components/ui/radio-group.tsx
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
// Wrap in <fieldset> + <legend> for screen reader context
// aria-label={question.text} on RadioGroup
// Arrow key nav is Radix-native (no custom impl needed)
```

**QuizResults.tsx** — pass/fail + explanations (D-06):
```typescript
// Props: passed, correctCount, total, missedQuestions (with explanations), onRetry
// onRetry: calls prepareQuiz() for reshuffle + resets quiz state (D-06)
// NO score percentage display — anti-gamification (PROG-05)
// Shows: missed question text + explanation only (not the correct answer text — active recall principle)
```

**Styling** — all components use CSS variable tokens from `app.css` (no hardcoded hex), same as `MasteryControls.tsx` inline style pattern (lines 73–144).

---

### `src/components/ui/radio-group.tsx` — NEW shadcn component

**Install command:** `npx shadcn@latest add radio-group`

No manual authoring required. `@radix-ui/react-radio-group` is already in `node_modules` via `radix-ui@1.6.0`.

---

## Shared Patterns

### SPDX Header
**Source:** Every `.ts/.tsx` file in the codebase (e.g. `src/server/progress.ts` line 1)
**Apply to:** All new files
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

### Authentication / Authorization
**Source:** `src/lib/auth-middleware.ts` lines 60–78 + `src/server/progress.ts` lines 121–164
**Apply to:** `src/server/quiz.ts`

Critical rule (auth-middleware.ts lines 85–108): `createServerFn` MUST be lexically visible where `.handler()` is called — do NOT wrap in a factory. Use `.middleware([authMiddleware])` directly.

```typescript
export const recordQuizPass = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(RecordQuizPassInput)
  .handler(recordQuizPassHandler);
```

### Server-Stamped Fields (Input Rejection)
**Source:** `src/server/progress.ts` lines 44–52 (input schema), lines 130–152 (handler stamping)
**Apply to:** `src/server/quiz.ts` `RecordQuizPassInput` + `recordQuizPassHandler`

Rule: input schema has ZERO `userId`/`source`/`masteryState`/`patchId` fields. Zod's default object stripping is the first defense layer; the handler's re-parse is the second.

### Optimistic Single-Node Update
**Source:** `src/hooks/useProgressMutation.ts` lines 98–110 (`onMutate` — cancel, snapshot, update)
**Apply to:** `src/hooks/useQuizPassMutation.ts`

```typescript
onMutate: async ({ nodeId }) => {
  await queryClient.cancelQueries({ queryKey: progressKeys.byUser() });
  const previousState = useGraphStore.getState().masteryMap[nodeId];
  useGraphStore.getState().setNodeMastery(nodeId, "mastered");
  useGraphStore.getState().setSource(nodeId, "quiz");  // Phase 6 addition
  return { previousState, nodeId };
},
```

### Error Toast + Rollback
**Source:** `src/hooks/useProgressMutation.ts` lines 113–130 (`onError`)
**Apply to:** `src/hooks/useQuizPassMutation.ts`

### Query Invalidation
**Source:** `src/hooks/useProgressMutation.ts` lines 132–137 (`onSettled`)
**Apply to:** `src/hooks/useQuizPassMutation.ts`

```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
},
```

### CSS Token Convention
**Source:** `src/components/graph/MasteryControls.tsx` lines 73–210, `GraphNode.tsx` lines 98–123
**Apply to:** All quiz UI components

All colors via CSS variables — no hardcoded hex:
- `var(--color-obsidian-{800,700,600})` — backgrounds, borders
- `var(--color-rune-{300,400,500,600})` — accent/mastery colors
- `var(--font-display)` / `var(--font-sans)` — typography

### React.memo for Graph Components
**Source:** `src/components/graph/GraphNode.tsx` line 180 (`export const GraphNode = memo(...)`)
**Apply to:** Any new component rendered inside `@xyflow/react` node tree

### Zod v4 Idioms
**Source:** `src/schemas/node.ts` throughout
**Apply to:** All new schemas

- `{ error: "..." }` not `{ message: "..." }`
- `z.enum([...])` not `z.nativeEnum()`
- `.min(1)` on all required strings

### Parallel-Schema Sync Discipline
**Source:** `content-collections.ts` lines 1–18 (PARALLEL-SCHEMA SYNC NOTE), `src/schemas/node.ts` lines 23–28
**Apply to:** Quiz schema fields in `src/schemas/node.ts` AND `content-collections.ts`

These two files MUST be updated in the same commit. The build fails if one is updated without the other — `content-collections.ts` validates at build time; `src/schemas/node.ts` at runtime/test time.

### vi.doMock + vi.resetModules Test Pattern
**Source:** `src/server/progress.test.ts` lines 61–113 (`beforeEach` mock wiring)
**Apply to:** `src/server/quiz.test.ts`

Do NOT use `vi.mock()` (hoisted) — use `vi.doMock()` (not hoisted) with `vi.resetModules()` in `beforeEach` and dynamic `import()` inside each test. This avoids temporal dead zone issues with module-level `const` references in factory closures.

---

## No Analog Found

All files have close analogs. The quiz UI components (`QuizTakeover`, `QuizStepper`, `QuizQuestion`, `QuizResults`) are genuinely new but follow `NodeDetailPanel.tsx` (AnimatePresence), `MasteryControls.tsx` (inline style + ToggleGroup), and standard Radix RadioGroup patterns.

`src/lib/quiz-grading.ts` has no structural analog (no other pure-function math modules) but follows the `src/lib/patches.ts` style: SPDX header, typed const tables, named exported functions with JSDoc.

---

## Metadata

**Analog search scope:** `src/server/`, `src/lib/`, `src/schemas/`, `src/db/`, `src/components/graph/`, `src/hooks/`, `content-collections.ts`
**Files scanned:** 14 source files read in full
**Pattern extraction date:** 2026-06-30
