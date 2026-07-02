# Phase 8: Replay Parsing - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users **upload a `.w3g` replay** (or **auto-pull recent replays from w3champions**), a **semantic signal layer** turns raw w3gjs output into meaningful WC3 events (build-order timing, APM/eAPM, control-group usage, hero/expansion timing), and those signals **advance MECHANIC nodes against patch-aware thresholds** with **actionable feedback** ("you did X at time Y; target is Z"). A wc3v (GPL-3.0) fork adds an advanced-analysis layer (supply/economy curves, precise expansion detection, compare-to-pro).

Replay is the **fine-grained, strongest-evidence** counterpart to Phase 7's coarse ladder auto-detection — it is the ONLY signal source permitted to set a node to `mastered`.

Locked by roadmap / prior phases (NOT re-discussed):
- Identity (BattleTag, gateway) comes from Battle.net login — no separate linking step (Phase 4, ADR 008).
- `source` is **server-stamped**, never client-supplied (Phase 5, ADR 009).
- Only `MECHANIC` nodes advance from replay signals; CONCEPTUAL nodes never advance from a sync/replay.
- Server functions are **principal-keyed** via `authMiddleware` (ADR 007) — no `userId` input channel.
- Patch versioning is cross-cutting; `patches.ts` `objectIdMapVersion` is the reserved hook for per-patch replay object-ID maps (ADR 003).
- GPL-3.0 copyleft accepted (ADR 004) — the wc3v fork inherits it.

**Feasibility is spike/research territory, not locked here:** (1) w3gjs parse time/memory on Vercel serverless; (2) w3champions replay endpoint functional test + API token; (3) wc3v fork build + current-patch parse + output usability. All three gate planning.

</domain>

<decisions>
## Implementation Decisions

### Replay Mastery Power (source, ceiling, precedence, monotonicity)
- **D-01:** Introduce a new mastery source **`"replay"`**. Extend the `source` enum (`manual|auto|quiz` → `+replay`) in `src/schemas/progress.ts` and the `text()` column default in `src/db/schema.ts` (no `pgEnum` migration — ADR 009 forward-designed `text()` for exactly this). Server-stamped, never client-supplied.
- **D-02:** A replay signal meeting its patch-aware threshold sets a MECHANIC node **directly to `mastered`** (criterion 3). Replay is the strongest evidence and the **only source** permitted to reach `mastered` from a signal. (Auto still caps at `in-progress`; quiz still masters CONCEPTUAL nodes.)
- **D-03:** **Replay wins over ALL sources** (auto, quiz, and manual) for upgrades — objective measured execution outranks self-report. This deliberately **inverts** Phase 7 auto's defer-to-everything rule (D-05).
- **D-04:** **Monotonic — replay never downgrades.** A worse later replay is ignored for an already-higher node. Combined with D-03, replay is a **one-way UPWARD ratchet**: it applies `max(existing, replayState)` and only stamps `source:"replay"` when it actually *raises* the state. A bad game never costs a user progress.
- **Write semantic (NEW):** differs from both prior write paths — quiz uses latest-write-wins `onConflictDoUpdate`; auto uses plain-insert `onConflictDoNothing`. Replay uses a **monotonic-max upsert**: `onConflictDoUpdate` guarded so `masteryState` only rises (untouched→in-progress→mastered) and `source` flips to `"replay"` only on an actual raise.
- **D-05:** Replay progress is **labeled distinctly** ("Mastered · from replay" or similar) with a distinct canvas marker, reusing the Phase 6/7 `MasteryBadge` `source` prop + `sourceMap` selector in `GraphNode`. Newly-advanced nodes **pulse** on graph return via the Phase 7 D-07 transient "recently advanced" marker. Exact copy/marker → UI-SPEC.

### wc3v Fork Scope
- **D-06:** Attempt the wc3v (GPL-3.0) fork **integrated from the start** alongside w3gjs — one combined effort targeting criterion 4 (supply/economy curves, precise expansion detection, compare-to-pro) in-phase, as an advanced layer on top of the w3gjs base signals.
- **D-07 (descope valve):** If the wc3v fork proves heavy (fails feasibility / blows budget), it **splits to its own follow-up phase (Phase 8.x)** and base-signal replay parsing (w3gjs: REPLAY-01/02/04/05/06/07) ships as **complete**. The base signals alone close the mastery + actionable-feedback loop; wc3v is additive.
- **D-08 (gate):** wc3v-fork feasibility is a **planning-gate spike**, joining the two already flagged in STATE.md. The three spikes that gate planning: (1) w3gjs serverless parse cost; (2) w3champions `/api/replays/{gameId}` functional test + token; (3) wc3v fork builds + parses current-patch replays + emits usable output.

### Signal & Race Coverage
- **D-09:** In-scope base signals that **drive mastery** are the **race-agnostic** ones: APM, eAPM approximation, control-group/hotkey usage, hero buy timing, expansion timing. Each maps to MECHANIC nodes evaluated against patch-aware thresholds.
- **D-10:** Build-order timing is **extracted + shown in feedback for everyone** (criterion 1), and this phase authors **one canonical opening build-order MECHANIC node per race (4 nodes total)** so replay build-order mastery has real targets. This is a **bounded, deliberate pull-forward of a thin slice of RACE-\***, NOT the full v2 race workstream. Remaining race/matchup build-order nodes stay v2 — they become **pure content additions** once schema + parser handle them here.

### Semantic Signal Layer & Patch Awareness
- **D-11:** The semantic signal layer (REPLAY-02) is a **pure, framework-free deep module** turning raw w3gjs output into typed WC3 events/signals mapped to mechanic nodes — mirroring the Phase 7 `detectMasterySignals` discipline (pure eligibility function; caller owns fetch/cache/persist). A new pure detector evaluates signals against patch-aware thresholds and emits a per-node **target masteryState**. **Unlike Phase 7 it is NOT untouched-only** — replay can override existing rows per D-03/D-04.
- **D-12:** Patch-aware object-ID maps (REPLAY-08) resolve by patch via the reserved `patches.ts` `objectIdMapVersion` hook. Phase 8 adds the actual object-ID map data keyed by that version. Both the resolved `patchId` **and** the raw WC3 build number from the replay header are stored alongside the result (criterion 3).

### Upload, Auto-Pull & Feedback UX (Claude autonomous — user said "drive autonomously")
- **D-13:** Manual upload (REPLAY-04) + auto-pull (REPLAY-05) live on a **dedicated Replay Analysis surface** (new route, e.g. `/replays`, reachable from profile/nav): drag-drop `.w3g` uploader + a "Pull recent replays from w3champions" action. Auto-pull reuses the Phase 7 w3champions client + rate-limit/TTL guard precedent.
- **D-14:** **Player identification** — match the user's slot in the replay by BattleTag from the Battle.net identity (Phase 4). No match → clear message + manual player pick.
- **D-15:** **Only 1v1 replays drive node mastery** this phase (mechanic targets are 1v1-calibrated). Team/FFA replays still parse and show signals as feedback but do **not** advance nodes — keeps thresholds meaningful and scope bounded.
- **D-16:** **Feedback presentation** (REPLAY-07) — a per-replay **analysis report** on the Replay Analysis surface listing each detected signal as "you did X at time Y; target is Z" + which node it maps to + which nodes advanced; **plus** graph pulse on newly-advanced nodes (D-05); **plus** the latest-replay signal shown inline in the node detail panel. Exact layout → UI-SPEC.
- **D-17:** **Parsed-result cache** (criterion 5) — a new table keyed by **gameId** storing extracted signals + `patchId` + build number; a replay with a known gameId is **never re-parsed**, and auto-pull dedupes on gameId.

### Claude's Discretion
- **BO threshold source of truth (D-10, research-gated):** content-authored from pro/creator wisdom vs derived from a replay corpus (ties to wc3v compare-to-pro). Default toward content-authored + citations (fits core value) unless the wc3v corpus makes empirical targets near-free.
- **Threshold location (research-gated):** per-node frontmatter (extend the `autoDetect` pattern) vs a central patch-keyed threshold table — depends on how many nodes share thresholds and how object-ID maps resolve per patch.
- **Parse location** (client vs serverless vs background job) → spike/research (STATE blocker 1).
- **Cache table keying** (per-user history vs global-by-gameId) → planner.
- **Exact UI copy, report layout, marker styling** → UI-SPEC / UI phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authorization & Auth
- `docs/adr/007-authed-server-fn-authorization.md` — principal-keyed server-fn pattern; replay server fns MUST key off `context.principal.id`, no `userId` input channel.
- `docs/adr/008-betterauth-battlenet-integration.md` — BattleTag + gateway capture; used for auto-pull query + replay player identification (D-14).
- `src/lib/auth-middleware.ts` — `authMiddleware` + `AuthedContext` (`context.principal` carries `battleTag`, `gateway`).

### Progress / Mastery Model
- `docs/adr/009-progress-persistence.md` — `nodeProgress` shape, forward-designed `text()` `source` field, patch stamping, merge model. D-01 extends `source` with `"replay"`.
- `docs/adr/010-quiz-mastery-design.md` — latest-write-wins precedence baseline + source-labeling UI precedent. Replay REPLACES this with monotonic-max, replay-wins semantics (D-03/D-04).
- `src/db/schema.ts` — `nodeProgress` (masteryState, source, patchId; unique `(userId,nodeId)`), `w3championsSync`. Add replay-analysis cache table (D-17).
- `src/schemas/progress.ts` — `MasteryStateSchema`, `ProgressRecordSchema` (`source` enum to extend, D-01).
- `src/server/w3champions.ts` — the orchestrating write path to mirror (auth + TTL cache + detect + server-stamped write); replay write inverts its plain-insert into a monotonic-max upsert (D-04).
- `src/lib/detect-mastery-signals.ts` — the pure-detector template (deep module discipline) for the new semantic signal layer (D-11).

### Content Schema & Patch
- `docs/adr/003-patch-registry-primitive.md` + `src/lib/patches.ts` — `CURRENT_PATCH.id` + `objectIdMapVersion` hook (D-12); replay object-ID maps key off this.
- `docs/adr/002-content-graph-decoupling.md` + `src/schemas/node.ts` — `nodeType` enum + the `autoDetect` frontmatter pattern to extend/parallel for replay criteria; `content-collections.ts` must stay mirrored (parallel-schema-sync).

### w3champions Client (auto-pull)
- `src/lib/w3champions-client.ts`, `src/lib/w3champions-keys.ts` (`SYNC_TTL_MS`), `src/hooks/useSyncW3championsMutation.ts`, `src/components/profile/SyncW3championsButton.tsx` — the fetch/cache/rate-limit + sync-UX precedent to reuse for replay auto-pull (D-13).

### Licensing
- `docs/adr/004-gpl3-licensing.md` — GPL-3.0 copyleft; the wc3v fork inherits it (D-06).

### Roadmap / Requirements
- `.planning/ROADMAP.md` §"Phase 8" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — REPLAY-01..REPLAY-08.

### Project Domain Language
- `CONTEXT.md` (repo root) — signal, mastery state, mastery source, patch/patchId, principal. Phase 8 adds: replay signal, semantic signal layer, object-ID map, build number, replay-detected source, compare-to-pro.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Orchestrating write path:** `src/server/w3champions.ts` `syncW3championsHandler` — copy the auth + DB-TTL-cache + pure-detect + server-stamped-write structure. Replay differs in the write: **monotonic-max upsert** (D-04), not `onConflictDoNothing`.
- **Pure detector:** `src/lib/detect-mastery-signals.ts` — the deep-module template for the semantic signal layer (pure, zero-I/O, caller owns persistence). New detector is NOT untouched-only (D-11).
- **w3champions client + rate-limit guard:** `src/lib/w3champions-client.ts`, `w3champions-keys.ts` (`SYNC_TTL_MS`), `useSyncW3championsMutation.ts`, `SyncW3championsButton.tsx` — reuse for auto-pull (D-13).
- **Source-labeled mastery UI:** `MasteryBadge` `source` prop + `sourceMap` in `GraphNode` + Phase 7 D-07 transient pulse marker — extend with a `"replay"` label + marker (D-05).
- **Patch primitive:** `src/lib/patches.ts` `CURRENT_PATCH` + `objectIdMapVersion` (D-12).
- **Progress write/read templates:** `src/server/quiz.ts` `recordQuizPassHandler`, `src/server/progress.ts` `getUserProgressHandler`.

### Established Patterns
- Pure eligibility/detection function + thin orchestrating server fn (deep-module discipline).
- Server-stamped `source`/`patchId`/`userId`; principal-keyed queries (no client key channel).
- Content-driven per-node config in frontmatter mirrored field-for-field in `content-collections.ts`.

### Integration Points
- New **w3gjs parser + semantic signal layer** (greenfield pure modules).
- New **wc3v fork** advanced-analysis layer (GPL-3.0) on top of base signals (D-06).
- New **replay-analysis cache table** keyed by gameId (D-17) + `source` enum migration (D-01).
- New **`/replays` route** (upload + auto-pull + report) (D-13/D-16).
- **Node frontmatter extension** for replay criteria + object-ID maps (D-11/D-12).
- Four new **canonical build-order MECHANIC nodes** (one per race) as content (D-10).

</code_context>

<specifics>
## Specific Ideas

- Replay as the **one-way UPWARD ratchet that outranks everything** — the mirror image of Phase 7's additive-but-deferential auto. Replay is the only source strong enough to master a node, but it can never take mastery away.
- "Actionable, not raw numbers" is load-bearing: every signal must render as "you did X at Y; target Z", tied to a node — never a bare stat dump (criterion 2 / REPLAY-07).
- wc3v is aimed for in-phase but explicitly **droppable** to keep the phase shippable — ambition with a safety valve.

</specifics>

<deferred>
## Deferred Ideas

- **Full race/matchup build-order coverage** beyond one canonical build per race (RACE-01..05) — v2 content additions once the Phase 8 schema + parser support them.
- **Matchup W/L & finer matchup detection** (ADET-01..02) — v2, race/matchup-specific (also deferred in Phase 7 D-03).
- **Team/FFA replay → mastery mapping** — future; targets are 1v1-calibrated (D-15). Team/FFA still parse for feedback.
- **wc3v advanced-analysis layer** — may split to Phase 8.x if the fork proves heavy (D-07).
- **Background/automatic replay ingestion** (no user action) — out of scope; upload + auto-pull are user-triggered.

</deferred>

---

*Phase: 8-replay-parsing*
*Context gathered: 2026-07-02*
