# Phase 7: w3champions Auto-Detection - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A **user-triggered sync** that pulls coarse w3champions ladder signals (MMR tier, games-played volume, matchup W/L) and **auto-advances eligible MECHANIC nodes** to `in-progress`. The sync is rate-limit-respecting (DB TTL + TanStack stale-while-revalidate), labels its results as distinct from manual/quiz progress, and **never blocks manual tracking** — auto-detection is an enhancement, not a prerequisite.

Locked by roadmap/prior phases (NOT re-discussed):
- BattleTag + gateway come from the Battle.net identity captured at login — **no separate linking step** (Phase 4, ADR 008).
- `source: "auto"` is **server-stamped**, never client-supplied (Phase 5, ADR 009).
- Only `MECHANIC` nodes auto-advance; **CONCEPTUAL nodes never advance from a sync** (criterion 5).
- Server functions are **principal-keyed** via `authMiddleware` (ADR 007).
- Cache respects criterion 3: two syncs within TTL return cached data, no 2nd API call.

</domain>

<decisions>
## Implementation Decisions

### Signal → Node Mapping
- **D-01:** Auto-detect criteria live **per-node in MDX frontmatter** (content), not in a central rule table. `detectMasterySignals()` reads node metadata to decide eligibility. Rationale: extensibility — authors add/adjust nodes without touching detection code (project priority). Extends the Phase 1 content schema (`src/schemas/node.ts`).
- **D-02:** Criteria shape is **single signal + threshold** per node (e.g. `{ signal: 'mmrTier', gte: 'gold' }` or `{ signal: 'gamesPlayed', gte: N }`). No compound AND/OR rule engine — matches the "coarse" framing and keeps authoring/validation simple.
- **D-03 (Claude's discretion, research-gated):** In-scope signals are the **race-agnostic ones — MMR tier + games-played volume**. Matchup W/L is race/matchup-specific and belongs with race branches (RACE-*, ADET-*), which are deferred to v2. Research confirms what the w3champions API cleanly exposes (overall MMR + volume vs per-matchup); default to shipping MMR tier + games volume only, and do **not** build matchup W/L code paths unless the API makes it trivial and near-free.

### Advancement Ceiling & Precedence
- **D-04:** Auto-detect can set a node to **at most `in-progress`** — it **never sets `mastered`**. `mastered` stays reserved for stronger evidence (quiz pass, Phase 8 replay). This refines criterion 2: eligible nodes advance to *in-progress*, not mastered. Protects the credibility of the `mastered` state (coarse MMR is a weak proxy for any single mechanic).
- **D-05:** Auto-detect touches **only `untouched` nodes** (no existing record). It **never overwrites** a node already marked by manual or quiz — even a manual `in-progress`. Weakest evidence source defers to any human/quiz signal. This is stricter than ADR 010's latest-write-wins *by design* for the auto source: auto is purely additive.
- **D-06:** Auto is **monotonic — never downgrades**. Once a node is auto-advanced it stays advanced even if a later sync wouldn't re-qualify it (MMR dropped, criteria changed). Combined with D-05, auto becomes a **one-way additive ratchet**: it only ever does `untouched → in-progress`, never revisits its own records, and never flaps near a threshold.

### Sync UX & Feedback
- **D-07:** On a successful sync that advances nodes: show a **summary count** on the profile (e.g. "3 nodes advanced from your ladder data") **and** briefly **highlight/pulse the newly-advanced nodes** on the graph when the user returns to it. Requires a transient "recently auto-advanced" marker to drive the highlight (Motion is available).
- **D-08:** A sync that qualifies **0 nodes** shows an **explicit reassuring message** (e.g. "Synced successfully — no new nodes qualified yet. Keep laddering!"), clearly distinct from a failure.
- **D-09:** Auto-advanced nodes are labeled **distinct from manual/quiz**, following the Phase 6 precedent: **panel label** ("In progress · from w3champions" or similar) **plus a distinct canvas marker** (parallel to quiz's ◆). Reuses the `MasteryBadge` `source` prop + `sourceMap` pattern from Phase 6. Exact copy/marker style → UI-SPEC.

### Failure & Rate-Limit Guard
- **D-10:** **Three tailored messages** for the distinct outcomes: (a) API unreachable/timeout → "w3champions is unreachable right now — try again later"; (b) rate-limited → **fall back to cached data** (not an error), e.g. "showing recent data"; (c) BattleTag not found / unranked / no ladder data → "no ladder data found for your BattleTag — play some ranked games". Case (c) is common for new players and must read as normal, not broken. Exact status-code → bucket mapping → research (w3champions 404 vs empty body, 429 behavior).
- **D-11:** Re-sync guard is **silent cache within TTL, button always live**. The "Sync with w3champions" button is always clickable; pressing it within the TTL serves cached data (may show "showing recent data"). No disabled state, no countdown. DB TTL + TanStack `staleTime` do the throttling invisibly — matches criterion 3 exactly.

### Claude's Discretion
- **D-03** signal scope (above) — research-gated; default MMR tier + games volume only.
- **Exact TTL value** (DB cache + TanStack `staleTime`) → research. w3champions rate limits are **undocumented/unknown** (flagged project risk, LOW confidence). Research must surface real limits (or empirical/Discord findings) and recommend a TTL that respects them while keeping data reasonably fresh.
- **Exact UI copy and marker styling** (D-08, D-09, D-10) → UI-SPEC / UI phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authorization & Auth
- `docs/adr/007-authed-server-fn-authorization.md` — principal-keyed server-function pattern; the sync server fn MUST key all queries off `context.principal.id`, no `userId` input channel.
- `docs/adr/008-betterauth-battlenet-integration.md` — how BattleTag + gateway are captured/refreshed at login; these are the w3champions query keys.
- `src/lib/auth-middleware.ts` — `authMiddleware` + `AuthedContext`; `context.principal` carries `battleTag`, `gateway`.

### Progress / Mastery Model
- `docs/adr/009-progress-persistence.md` — `nodeProgress` table shape, forward-designed `source` field (`manual` | `auto` | `quiz`), `text()` over `pgEnum`, patch stamping, server-wins merge.
- `docs/adr/010-quiz-mastery-design.md` — latest-write-wins source precedence baseline and the source-labeling UI precedent (Phase 7 defers to human/quiz per D-05, stricter than the baseline).
- `src/db/schema.ts` — `users` (battleTag, gateway, bnetSub), `nodeProgress` (masteryState, source, patchId; unique `(userId,nodeId)`).
- `src/schemas/progress.ts` — `MasteryStateSchema`, `ProgressRecordSchema` with `source: z.enum(["manual","auto","quiz"])`.

### Content Schema & Patch
- `docs/adr/003-patch-registry-primitive.md` + `src/lib/patches.ts` — `CURRENT_PATCH.id` stamped on every write.
- `docs/adr/002-content-graph-decoupling.md` + `src/schemas/node.ts` — `nodeType: z.enum(["MECHANIC","CONCEPTUAL"])`; Phase 7 extends node frontmatter with per-node auto-detect criteria (D-01/D-02).

### Roadmap / Requirements
- `.planning/ROADMAP.md` §"Phase 7" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — AUTO-01..AUTO-05.

### Project Domain Language
- `CONTEXT.md` (repo root) — defines: mastery state, mastery source, principal, session, BattleTag, gateway/region, progress record, **signal**, patch/patchId. Phase 7 adds a domain term for the w3champions auto-detect criteria / signal-source labeling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Progress write template:** `src/server/quiz.ts` `recordQuizPassHandler` — exact pattern to copy for the auto write: `authMiddleware` + server-stamped fields (`userId`, `source`, `patchId`) + `onConflictDoUpdate` upsert keyed on `(userId, nodeId)`. Phase 7 hardcodes `source: "auto"` and caps state at `in-progress`.
- **Progress read:** `src/server/progress.ts` `getUserProgressHandler` — template for reading current progress to determine which nodes are `untouched` (needed for D-05).
- **Auth session helper:** `src/server/user-profile.ts` `getUserProfile` — shows accessing `context.principal.battleTag` / `.gateway` for the API call.
- **Query keys:** `src/lib/progress-keys.ts` `progressKeys` — invalidate `progressKeys.byUser()` after sync. Add a `w3championsKeys` factory for the sync/cache query.
- **Mastery UI source labeling:** `MasteryBadge` `source` prop + `sourceMap` selector in `GraphNode` (Phase 6) — extend with a w3champions source label + canvas marker (D-09).
- **Optimistic/invalidation pattern:** `src/hooks/useProgressMutation.ts` — mutation → optimistic Zustand update → invalidate on settle. Sync result should invalidate progress so the graph re-hydrates.
- **DB client / patch:** `src/lib/db.ts` (lazy Neon), `src/lib/patches.ts` (`CURRENT_PATCH.id`).

### Established Patterns
- **`detectMasterySignals()` as a pure function** (from criterion 5): reads node metadata + w3champions signals, emits update candidates ONLY for `nodeType === 'MECHANIC'`. Keep it pure and unit-testable (deep-module discipline) — the server fn wraps it with fetch + cache + persistence.
- **Server-stamped source, principal-keyed queries** — no `userId` or `source` from client input.
- **Content-driven config** — per-node criteria in frontmatter mirrors how content already drives the graph (ADR 002).

### Integration Points
- New **w3champions API client** (server-side; no existing client — greenfield). Wrapped by cache (DB TTL row + TanStack `staleTime`).
- New **sync server function** on the profile page ("Sync with w3champions" + "Last synced Xm ago").
- **Node frontmatter schema extension** for auto-detect criteria (`src/schemas/node.ts`) — cross-cutting with content authoring.
- **Graph highlight** for recently-advanced nodes (transient marker consumed by graph store / Motion).

</code_context>

<specifics>
## Specific Ideas

- Auto-detection as a **one-way additive ratchet** on untouched MECHANIC nodes only — the strongest recurring theme. It must feel like a gentle nudge that never fights the user's manual/quiz input and never regresses.
- The word "coarse" is load-bearing: MMR tier and games volume are blunt proxies, so the design deliberately caps confidence (in-progress only, D-04) and defers to any stronger evidence (D-05).

</specifics>

<deferred>
## Deferred Ideas

- **Matchup W/L trend signals & finer matchup detection** (ADET-01..02) — inherently race/matchup-specific; belongs with race-specific branch content (RACE-01..05). Already a v2 deferred item. Phase 7 does not build these code paths (D-03).
- **Auto-advancing to `mastered` from ladder data** — explicitly rejected for coarse signals (D-04). Fine mechanical mastery from strong evidence is Phase 8 (replay parsing).
- **Background/automatic sync (no user click)** — out of scope; sync is user-triggered per criterion 1.

</deferred>

---

*Phase: 7-w3champions-auto-detection*
*Context gathered: 2026-07-01*
