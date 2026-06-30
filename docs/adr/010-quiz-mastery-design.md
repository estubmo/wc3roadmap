# ADR 010: Quiz-Mastery Design

**Status:** Accepted
**Date:** 2026-07-01
**Phase:** 06-self-assessment-quizzes

---

## Context

Phase 6 adds a self-assessment quiz system for CONCEPTUAL nodes. Players can
take a MCQ quiz to earn mastery — the quiz pass sets `masteryState: "mastered"`
with `source: "quiz"` on their progress record. Six design decisions needed
explicit rationale so that Phase 7/8 auto-detection (w3champions, replays) and
a future spaced-repetition scheduler can build on Phase 6 without a migration.

### What needed deciding

1. **Source-precedence model** — how does quiz mastery interact with manual
   mastery and future auto-detection signals?
2. **Client-side grading tradeoff** — should quiz answers be graded on the
   client or server-validated?
3. **Quiz-only mastery gate** — can a quiz fail transition the node to a lower
   state, or can it only set `mastered`?
4. **Separate `quizProgress` table** — why not reuse `nodeProgress` for
   attempt/SRS data?
5. **Forward-designed FSRS signals** — `lapseCount` and `attemptCount` in
   `quizProgress`.
6. **Active-recall enforcement** — how is the "don't read while answering"
   principle structurally enforced?

---

## Decision

### 1. Latest-write-wins source precedence (D-12/D-14)

`source` on a progress record is always the source of the **most recent write**.
Quiz and manual writes share the same `node_progress` upsert target
`(userId, nodeId)`:

- A quiz pass sets `masteryState: "mastered"`, `source: "quiz"`.
- A subsequent manual write sets `masteryState: <any>`, `source: "manual"`.
- A subsequent quiz pass again sets `masteryState: "mastered"`, `source: "quiz"`.

Latest write wins — no merge or conflict logic is needed. Both write paths are
principal-keyed `authedServerFn` calls, so cross-user contamination is
structurally impossible.

**Why not "quiz wins" or "manual wins" precedence:**

- A player who manually sets `untouched` to reset their progress should not be
  blocked from overriding quiz mastery; they made a deliberate choice.
- A player who then passes the quiz again should regain quiz mastery — they
  earned it through the assessment mechanism.
- Complexity is minimized: no precedence table, no merge conflict surface.

**Phase 7/8 `source: "auto"` extension:** The same latest-write-wins rule
applies. An auto-detection write overwrites the previous source; a subsequent
manual or quiz write overwrites auto. The three-value enum
(`"manual"` | `"auto"` | `"quiz"`) was forward-designed in Phase 5 (ADR 009
§3) specifically to accommodate this model without a DDL migration.

### 2. Accepted: client-side grading (self-honesty model)

Quiz answers are graded entirely on the client by `gradeAnswers` in
`src/lib/quiz-grading.ts`. The `recordQuizPass` server function is called only
when the client reports `gradeAnswers.passed === true`. The server does not
re-validate the answers — it accepts the client's pass claim and stamps
`mastered + source:"quiz"`.

**Why this is acceptable (deliberate tradeoff):**

- **Not security-critical.** Mastery state has no monetary value, no access
  gate, and no competitive ranking consequence in this app. A player who
  self-cheats their mastery state degrades only their own learning. There is no
  leaderboard, no unlock, and no downstream privilege that a forged `mastered`
  state can claim. The core value proposition is: "the learning content makes
  you better at WC3" — not "the badge proves you passed."
- **Server-side validation requires leaking the answer key.** To grade on the
  server, the client must send the player's selected answers alongside the
  question set — or the question set must be fetched from the server and kept
  secret from the client. Both approaches add significant complexity: a
  question-delivery server function, a separate answer-key store, and a timing
  attack surface against the MCQ format. For MCQs authored in a public OSS
  repo, the question/answer set is already public; server-side grading adds
  no real security value.
- **The pass-gate client guard is deterministic.** `mutation.mutate({ nodeId })`
  fires inside `handleNext()` only when `result.passed === true` — a single
  conditional in the event handler, not in a `useEffect`. Concurrent re-renders
  cannot double-fire the mutation (T-06-17/T-06-18).
- **The Zod validator on `RecordQuizPassInput` rejects any `source`,
  `masteryState`, `userId`, or `patchId` the client might forge.** The server
  always stamps `masteryState: "mastered"` and `source: "quiz"` — it cannot be
  persuaded to stamp a different state via the input.

**Accepted risk:** A player who edits the client JS or intercepts the network
call can submit a pass claim without answering. The app's stance is honest-
signal self-regulation: if a player cheats the quiz, they are harming only
their own learning. This is documented here so future phases do not add
server-side answer validation without a new ADR that re-evaluates the tradeoff.

### 3. Quiz can only set `mastered`; never downgrades (D-12)

The `recordQuizPass` server function always sets `masteryState: "mastered"`.
It is never called on a failed attempt (`gradeAnswers.passed === false`). A
failed quiz attempt leaves the `nodeProgress` row unchanged — it only
increments `lapseCount` in the separate `quizProgress` table (§4 below).

**Why:**

- A player who has manually marked a node as `mastered` should not have a
  failed quiz attempt revert it to `in-progress`. That would punish re-
  engagement with the material.
- The quiz is a positive signal only: passing elevates mastery. Failing is
  informational (missed questions shown with explanations) but not punitive.
- Downgrade behavior could deter players from attempting the quiz if they
  fear losing a manually-earned mastery mark.

### 4. Separate `quizProgress` table for attempt/SRS signals (D-07/D-08)

A second table (`quizProgress` / `quiz_progress`) tracks per-user, per-node
quiz attempt history alongside the existing `nodeProgress` upsert:

```typescript
export const quizProgress = pgTable(
  "quiz_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    passed: boolean("passed").notNull().default(false),
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),
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

**Why a separate table (not adding columns to `nodeProgress`):**

- `nodeProgress` is the current-mastery record: one row per `(user, node)` at
  all times, always reflecting the _latest_ state. It has no concept of attempt
  count or history — its design is current-state-only (ADR 009 §1).
- `quizProgress` is an attempt-history record: how many times the player has
  tried the quiz and what the outcomes were. These are orthogonal concerns with
  different update semantics (mastery upserts on _any_ manual write; quiz
  attempts upsert only on quiz events).
- Future spaced-repetition logic reads `lapseCount`, `attemptCount`, and
  `lastAttemptAt` — all quiz-specific fields with no analog in `nodeProgress`.
  Stuffing them into `nodeProgress` would pollute the clean mastery model with
  SRS concerns.

### 5. Forward-designed FSRS signals: `lapseCount` + `attemptCount`

`quizProgress` stores `lapseCount` and `attemptCount` from Phase 6:

- `attemptCount` — total quiz attempts (pass + fail combined). Incremented on
  every `recordQuizPass` call (which is called only when `passed === true`, so
  this counts passes; lapses are not currently server-recorded — see note).
- `lapseCount` — number of times the player has _failed_ the quiz after having
  previously passed it. A forward hook for FSRS's lapse concept: the scheduler
  needs to distinguish "never passed" from "passed, then lapsed" because lapsed
  items require a different review interval. **This field cannot be
  reconstructed retroactively** from `attemptCount` alone after the Phase 6
  data is on disk, so it must be captured now.

**Note (Phase 6 scope):** `lapseCount` is incremented in the Phase 6 DB schema
but the `recordQuizPass` handler currently only upserts on pass — fail attempts
are client-only and do not yet write to `quizProgress`. The field is designed
in and the SRS schema is ready; the scheduler and fail-path write are deferred
to the spaced-repetition phase (Phase N). A future migration to start counting
lapses server-side will NOT require a schema change.

### 6. Active-recall enforcement via body swap (D-09, T-06-20)

The "active recall" constraint — the player must not be able to re-read the
node's prose while answering the quiz — is enforced **structurally** in
`NodePanelContent.tsx`:

```tsx
<AnimatePresence mode="wait">
  {quizOpen && node.quiz ? (
    <motion.div key="quiz">
      <QuizTakeover quiz={node.quiz} nodeId={nodeId} onClose={...} />
    </motion.div>
  ) : (
    <motion.div key="content">
      {/* Normal panel: MasteryControls, QuizCTA, How to Apply, prose, citations */}
    </motion.div>
  )}
</AnimatePresence>
```

When `quizOpen` is true, the content variant is **not rendered** — it exits via
`AnimatePresence`. The node's MDX prose, How-to-Apply section, Pro Wisdom
callout, and citations are all unmounted from the DOM. The player cannot scroll
the panel to read the answer; the read affordance simply does not exist while
the quiz is open.

**Why structural enforcement over a visual overlay:**

- A semi-transparent overlay with `pointer-events: none` on the content would
  still allow the text to be highlighted, copied, or read through the overlay.
- Unmounting the content is the only approach that truly prevents access (short
  of a cryptographic scheme, which is out of scope).
- The approach also simplifies the component tree: the quiz phase is a clean
  swap, not a z-index battle.

---

## Consequences

**Positive:**

- **No Phase-7/8 migration.** The three-value `source` enum
  (`"manual"` | `"auto"` | `"quiz"`) and the `quizProgress` table are designed
  in from Phase 6. Auto-detection writes `"auto"` into the existing `source`
  column; the SRS scheduler reads from the existing `quizProgress` table.
- **Latest-write-wins is predictable.** A player who manually resets a
  quiz-mastered node and then re-passes the quiz ends up quiz-mastered again.
  No hidden precedence rule surprises them.
- **Client-side grading reduces infrastructure.** No question-delivery server
  function, no answer-key secret, no additional DB table for question-answer
  pairs. The public OSS repo contains the answers openly — consistent with the
  honest-signal model.
- **Active recall is structurally guaranteed.** No future refactor of the quiz
  UI can accidentally introduce a "read while answering" regression without
  also refactoring the `AnimatePresence` body swap.
- **`lapseCount` is captured early.** FSRS-aware SRS schedulers use lapse
  history to set longer re-review intervals for items that were once learned
  and then forgotten. Capturing it from Phase 6 onward gives the scheduler
  meaningful data from the first user cohort.

**Negative / trade-offs:**

- **Client-side grading is gameable.** A technically sophisticated player can
  submit a pass claim without actually passing. Accepted because mastery has
  no privilege gate, and the OSS answer key is already public.
- **`lapseCount` undercount in Phase 6.** Failed attempts do not yet write to
  the server — `lapseCount` will be 0 for all Phase-6 users until the SRS
  phase adds the fail-path write. The field is schema-ready; the data gap is
  intentional (deferred to the phase that needs the data).
- **No conflict surfacing on quiz vs. manual source collision.** If a player
  passes the quiz, then manually marks `untouched`, they lose the `"quiz"`
  source label. No conflict dialog or warning is shown. Accepted trade-off —
  consistent with the ADR 009 §6 "server wins, no conflict UI" philosophy.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Server-side grading | Requires leaking the answer key to the server (or encrypting and decrypting it per request), adds a question-delivery server function, and adds no real security value for MCQs authored in a public OSS repo. |
| "Quiz wins" precedence (quiz-mastered cannot be downgraded by manual) | Would prevent players from deliberately resetting a node they want to re-study — violates the "player in control" design principle from Phase 5 (ADR 009 §6 server-wins rationale). |
| Store attempt data in `nodeProgress` | Pollutes the current-mastery single-upsert model with SRS concerns; `masteryState` upsert semantics differ from attempt-increment semantics. |
| Overlay quiz over the node content | Overlay does not prevent reading — text is still selectable/readable through a translucent layer. Structural unmount is the only true enforcement of active recall. |
| `pgEnum` for source field | Already rejected in ADR 009 §2 — hyphen issues and non-transactional `ALTER TYPE`. `text()` + Zod enforces valid values. |
| Defer `lapseCount` to the SRS phase | Cannot reconstruct lapse history retroactively from `attemptCount` alone. Forward design discipline (established in Phase 5 ADR 009 §3) requires capturing the signal now. |

---

## Related Decisions

- **D-04** — `source` field forward-designed at Phase 5; `"quiz"` is the Phase 6 extension
- **D-05** — `patchId` stamped server-side with `CURRENT_PATCH.id` on every write (including quiz pass)
- **D-07** — `quizProgress` forward-designed for SRS scheduler; `lapseCount` captured from Phase 6
- **D-08** — spaced-repetition scheduler deferred to its own phase; `quizProgress` is the data hook
- **D-09** — `AnimatePresence` body swap as the structural active-recall enforcement mechanism
- **D-12** — quiz writes only `mastered`; fails never change `masteryState`; latest-write-wins source
- **D-13** — all server-stamped fields (`source`, `masteryState`, `patchId`, `userId`); never from client input
- **D-14** — quiz source surfaces in the panel badge ("Mastered · via quiz") and canvas marker (`◆`)
- **QUIZ-01** — MCQ format, 3–5 questions, CONCEPTUAL-only gate
- **QUIZ-02** — pass threshold per question count (3/3, 3/4, 4/5)
- **QUIZ-03** — application-framed questions with required `explanation` field
- **ADR 007** — `authedServerFn` principal-keyed authorization convention
- **ADR 009** — progress persistence design; `source` field forward-design; `text()` over `pgEnum`
