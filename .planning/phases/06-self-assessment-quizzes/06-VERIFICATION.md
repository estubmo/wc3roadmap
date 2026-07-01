---
phase: 06-self-assessment-quizzes
verified: 2026-07-01T09:50:00Z
status: passed
score: 3/3 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 6: Self-Assessment Quizzes Verification Report

**Phase Goal:** CONCEPTUAL nodes offer short recall-based quizzes that drive that node's mastery state to mastered on passing; MECHANIC nodes never surface a quiz.
**Verified:** 2026-07-01T09:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Human Verification Already Performed (context, not re-gated)

Per the verification brief, all three roadmap success criteria were already human-verified during execution and are NOT re-gated here:

- **Criterion 3** (SME review of question quality) — approved during plan 06-07 (recorded in `06-07-SUMMARY.md`; all 4 tech-timing quiz questions confirmed scenario/application-framed, not surface-recall).
- **Criteria 1 & 2** (CTA gating + no-reload mastery update) — approved end-to-end against the running dev server during plan 06-11's checkpoint (recorded in `06-11-SUMMARY.md`; human response: "1 & 2 approved").

This verifier's job was to confirm the code/artifacts backing those three criteria actually exist, are substantive, and are wired — not to re-run the human judgment calls.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A CONCEPTUAL node's detail panel shows a "Take Assessment" button that launches a short quiz (3–5 questions); a MECHANIC node's panel has no such button | ✓ VERIFIED (human + structural) | `QuizCTA.tsx` self-gates on `nodeType !== "CONCEPTUAL" \|\| !hasQuiz` → returns `null`; wired into `NodePanelContent.tsx` with `nodeType={node.nodeType}` and `hasQuiz={!!node.quiz}`. `content/nodes/tech-timing.mdx` (CONCEPTUAL) has a 4-question `quiz:` block; `content/nodes/army-positioning.mdx` (MECHANIC) has no `quiz:` field. 13/13 `QuizCTA.test.tsx` gating tests pass (re-run live). Human end-to-end confirmed both cases in the live app (06-11). |
| 2 | Passing a quiz updates that node's mastery state to mastered — the graph reflects the update without a page reload, and the source is labeled "quiz" (not manual) | ✓ VERIFIED (human + structural) | `recordQuizPassHandler` (`src/server/quiz.ts`) server-stamps `masteryState:"mastered"` + `source:"quiz"` + `patchId` from `principal.id` only (never client data) and two-table upserts `nodeProgress`+`quizProgress`. `useQuizPassMutation` optimistically calls `setNodeMastery`/`setSource` in `onMutate` (Zustand, no reload) and persists via `recordQuizPass` (signed-in) or `setLocalMastery` (signed-out). `MasteryBadge` renders "Mastered · via quiz" when `source==="quiz"`; `GraphNode` renders a ◆ rune-400 canvas marker from the same `sourceMap`. Live DB query confirms `quiz_progress` table exists in Neon with all 9 expected columns (resolves the 06-02 Task-3 DB-push blocker — no gap). Human end-to-end confirmed no-reload update + persistence across refresh (06-11). |
| 3 | A quiz question cannot be answered correctly by re-reading the node's surface text; questions require genuine recall/application — an SME would agree the question tests understanding | ✓ VERIFIED (human, SME) | 4 scenario-framed questions in `content/nodes/tech-timing.mdx` pose in-game decision scenarios (e.g. "your scout confirms X — what does applying tech timing principles require?") rather than quoting node prose. `explanation` is a required, non-empty field enforced by `QuizSchema` (structural QUIZ-03 guardrail). SME reviewed and approved all 4 questions (06-07-SUMMARY.md, "approved", no revisions requested). |

**Score:** 3/3 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/schemas/node.ts` | `QuizOptionSchema`/`QuizQuestionSchema`/`QuizSchema` + types, `quiz?` field | ✓ VERIFIED | `QuizSchema = z.array(QuizQuestionSchema).min(3).max(5)`; `superRefine` exactly-one-correct; required `explanation`; `quiz: QuizSchema.optional()` on `NodeFrontmatterSchema` |
| `content-collections.ts` | Field-for-field mirror + count guard | ✓ VERIFIED | Inline `quiz:` field with matching superRefine + explanation requirement; transform-time count guard (<3 or >5 throws) |
| `src/db/schema.ts` | `quizProgress` pgTable + relations | ✓ VERIFIED | 9-column table, unique index on (userId,nodeId), covering index on userId; **live in Neon** (confirmed via direct query — table + all 9 columns present) |
| `src/schemas/progress.ts` | `source` enum widened to include `"quiz"` | ✓ VERIFIED | `z.enum(["manual","auto","quiz"])` |
| `src/lib/quiz-grading.ts` | `PASS_THRESHOLD`, `gradeQuiz`, `gradeAnswers`, `shuffle`, `prepareQuiz` | ✓ VERIFIED | Explicit `{3:3,4:3,5:4}` table; pure, no mutation; type-imports `QuizQuestion` from node.ts |
| `src/server/quiz.ts` | `recordQuizPass`/`recordQuizAttempt` (principal-keyed) | ✓ VERIFIED | `RecordQuizPassInput`/`RecordQuizAttemptInput` accept only `nodeId`(+`passed`); all mastery-affecting fields server-stamped from `context.principal.id` and `CURRENT_PATCH`; `authMiddleware` applied |
| `src/hooks/useQuizPassMutation.ts` | Optimistic no-reload pass mutation | ✓ VERIFIED | `onMutate` sets `masteryMap`+`sourceMap` via Zustand synchronously; dual signed-in/out persistence; rollback + toast on error |
| `src/components/graph/quiz/QuizCTA.tsx` | Self-gating CTA (D-04) | ✓ VERIFIED | Returns `null` unless `nodeType==="CONCEPTUAL" && hasQuiz`; label switches Take/Retake on `mastered && source==="quiz"` |
| `src/components/graph/quiz/QuizTakeover.tsx` | Stepper→grade→results→retry host | ✓ VERIFIED | `prepareQuiz` shuffles on mount/retry; `gradeAnswers` computed once in event handler; `mutation.mutate` fires only inside `if (result.passed)` |
| `src/components/graph/quiz/QuizQuestion.tsx`, `QuizStepper.tsx`, `QuizResults.tsx` | Accessible MCQ primitives, no score/points | ✓ VERIFIED | Radix RadioGroup (fieldset/legend); gated Next; `QuizResults` shows no percentage/points/XP, only "X of Y correct" contextual sentence + missed-question explanations |
| `src/components/graph/NodePanelContent.tsx` | QuizCTA + AnimatePresence takeover mount | ✓ VERIFIED | `AnimatePresence mode="wait"` swaps full panel body to `QuizTakeover` when `quizOpen && node.quiz`; `QuizCTA` rendered after `MasteryControls`; `MasteryBadge` receives `source={currentSource}` |
| `src/components/graph/GraphNode.tsx`, `MasteryBadge.tsx` | Canvas + panel "via quiz" surfacing (D-14) | ✓ VERIFIED | `GraphNode` subscribes `sourceMap[d.id]`, renders ◆ marker + passes source to badge; `MasteryBadge` renders "Mastered · via quiz" string |
| `src/lib/graph-store.ts`, `ProgressProvider.tsx` | `sourceMap` slice + hydration | ✓ VERIFIED | `sourceMap`/`setSource`/`initSourceMap` in store; `ProgressProvider` hydrates `sourceMap` from `progressRecords[].source` alongside `masteryMap` |
| `content/nodes/tech-timing.mdx` | Authored demo quiz (SME-approved) | ✓ VERIFIED | 4 scenario questions, validated by `npm run build:content` (13 documents, 0 errors) and `npm run validate` |
| `docs/adr/010-quiz-mastery-design.md` | ADR for quiz-mastery design | ✓ VERIFIED | Documents source-precedence, client-grading tradeoff, quiz-only mastery gate, separate quizProgress table, FSRS forward signals, active-recall enforcement |
| `CONTEXT.md` | Phase-6 domain terms | ✓ VERIFIED | "Self-Assessment Quiz Terms (Phase 06)" section with quiz, assessment, active recall, quiz source, pass threshold, quiz mastery, lapse |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `content-collections.ts` | `src/schemas/node.ts` | Identical quiz schema shape (parallel-schema sync) | ✓ WIRED | Tool-verified |
| `src/db/schema.ts quizProgress` | Neon PostgreSQL | `drizzle-kit push` applies DDL | ✓ WIRED (manually confirmed) | Tool false-negative (non-file `from:` string); direct DB query confirms `quiz_progress` table live with all 9 columns — the 06-02 Task-3 blocker was resolved out-of-band and is not a gap |
| `src/components/graph/ProgressProvider.tsx` | `src/lib/graph-store.ts` | `initSourceMap(sourceMap)` built from `progressRecords[].source` | ✓ WIRED | Tool-verified |
| `src/lib/quiz-grading.ts gradeAnswers` | `src/schemas/node.ts QuizQuestion` | Type-only import | ✓ WIRED (manually confirmed) | Tool false-negative (non-file `from:` string); `import type { QuizQuestion } from "#/schemas/node";` confirmed at line 35 |
| `src/server/quiz.ts` | `src/db/schema.ts quizProgress` | `db.insert(quizProgress).onConflictDoUpdate` target (userId,nodeId) | ✓ WIRED | Tool-verified |
| `src/server/quiz.ts` | `src/lib/auth-middleware.ts` | `.middleware([authMiddleware])` | ✓ WIRED | Tool-verified |
| `content/nodes/tech-timing.mdx quiz` | `content-collections.ts` + `src/schemas/node.ts QuizSchema` | Build-time validation | ✓ WIRED (manually confirmed) | Tool false-negative (non-file `from:` string); `npm run build:content` re-run live — 1 collection, 13 documents, 0 errors |
| `src/components/graph/quiz/QuizQuestion.tsx` | `src/components/ui/radio-group.tsx` | Imports RadioGroup/RadioGroupItem | ✓ WIRED | Tool-verified |
| `src/components/graph/GraphNode.tsx` | `src/lib/graph-store.ts sourceMap` | `useGraphStore` selector on `sourceMap[d.id]` | ✓ WIRED | Tool-verified |
| `src/hooks/useQuizPassMutation.ts` | `src/server/quiz.ts recordQuizPass` | `mutationFn` calls `recordQuizPass({ data: { nodeId } })` when signed-in | ✓ WIRED | Tool-verified |
| `src/hooks/useQuizPassMutation.ts` | `src/lib/graph-store.ts setSource/setNodeMastery` | Optimistic `onMutate` + rollback `onError` | ✓ WIRED | Tool-verified |
| `src/components/graph/quiz/QuizTakeover.tsx` | `src/lib/quiz-grading.ts` + `src/hooks/useQuizPassMutation.ts` | `prepareQuiz`/`gradeAnswers` then `mutate({nodeId})` only when passed | ✓ WIRED | Tool-verified |
| `src/components/graph/NodePanelContent.tsx` | `src/components/graph/quiz/QuizCTA.tsx` + `QuizTakeover.tsx` | Renders `QuizCTA` (gated) and swaps body to `QuizTakeover` on start | ✓ WIRED | Tool-verified |
| `src/components/graph/NodePanelContent.tsx` | `src/lib/graph-store.ts sourceMap` | Reads `currentSource` for `MasteryBadge` + CTA label | ✓ WIRED | Tool-verified |

3 links show as tool false-negatives due to non-file-path `from:` field formatting (e.g. `"src/db/schema.ts quizProgress"` instead of a bare path). All 3 were manually verified true — no actual gap.

### Live Database Confirmation

Direct query against Neon (via `DATABASE_URL_DIRECT`) confirms:
- `quiz_progress` table exists with columns: `id, user_id, node_id, passed, last_attempt_at, attempt_count, lapse_count, created_at, updated_at` — matches the plan's 9-column spec exactly.
- This resolves the `[BLOCKING]` Task 3 noted in `06-02-SUMMARY.md` (drizzle-kit push was blocked at plan-execution time due to missing `DATABASE_URL_DIRECT` in that session; the push was completed out-of-band before end-to-end human verification in 06-11, consistent with the human's confirmed "persists across a refresh" observation).
- `node_progress` currently shows only `source="manual"` rows (2), and `quiz_progress` is currently empty — this reflects the current data state (likely because the human's live-app pass was performed signed-out, using the localStorage path, or progress was reset after testing) and does not indicate a wiring defect; the server-side write path (`recordQuizPassHandler`) is present, tested (11/11 passing regression tests), and reachable from the UI.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| QUIZ-01 | 01, 07, 09, 10, 11 | CONCEPTUAL nodes have a short self-assessment quiz (3–5 recall-based questions) | ✓ SATISFIED | `QuizSchema` bounds (3–5), `QuizCTA` gating, tech-timing demo quiz, stepper UI |
| QUIZ-02 | 02, 03, 04, 05, 06, 08, 10, 11 | Passing a node's quiz drives that conceptual node toward "mastered" | ✓ SATISFIED | `recordQuizPass` server-stamped write, `useQuizPassMutation` optimistic no-reload update, `sourceMap`/badge/marker surfacing |
| QUIZ-03 | 01, 07, 09, 10, 11 | Quizzes test understanding, not surface recall | ✓ SATISFIED | Required `explanation` structural guardrail + SME-approved scenario framing (06-07) |

No orphaned requirements — REQUIREMENTS.md maps only QUIZ-01/02/03 to Phase 6, and all three are declared across the 11 plans.

### Anti-Patterns Found

None. Scanned all 18 phase-modified files (schemas, server fn, hooks, quiz components, panel integration, ADR) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and "not yet implemented"/"coming soon" language — zero matches.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| QuizCTA D-04 gating (MECHANIC/no-quiz/CONCEPTUAL+quiz) | `npx vitest run src/components/graph/quiz/QuizCTA.test.tsx` | 13/13 passed | ✓ PASS |
| Grading engine boundary rules (D-05) + server-stamp regression tests | `npx vitest run src/server/quiz.test.ts src/lib/quiz-grading.test.ts` | 46/46 passed | ✓ PASS |
| Content build validates authored quiz | `npm run build:content` | 1 collection, 13 documents, 0 errors | ✓ PASS |
| `quiz_progress` table exists live in Neon | Direct DB query via `DATABASE_URL_DIRECT` | Table + all 9 expected columns present | ✓ PASS |

Full workspace suite (356/356) and typecheck were already run once by the orchestrator this session — not re-run here per spot-check constraints.

### Human Verification Required

None. All three roadmap success criteria (CTA gating, no-reload mastery update with "quiz" source label, SME question-quality review) were already human-verified during phase execution (06-07 and 06-11 checkpoints) and are treated as satisfied per the verification brief.

### Gaps Summary

No gaps. All must-haves across all 11 plans are structurally verified: schemas exist at both build-time and runtime layers, the persistence layer (including the previously-blocked `quiz_progress` table) is live in Neon, the grading engine is pure and tested, the server write path is principal-keyed and cannot be forged, the optimistic UI hook updates the graph without a reload, the CTA is self-gating to CONCEPTUAL+quiz nodes, and the demo quiz is scenario-framed and SME-approved. The 3 "failed" key-link checks were tool parsing false-negatives (non-file-path `from:` strings), each manually confirmed correct.

---

_Verified: 2026-07-01T09:50:00Z_
_Verifier: Claude (gsd-verifier)_
