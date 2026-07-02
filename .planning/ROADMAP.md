# Roadmap: WC3 Learning Roadmap

## Overview

The project is built in nine phases that follow a strict content-first, dependency-respecting order. Phase 1 locks the data schema so every downstream phase has typed content to build on. Phases 2 and 3 deliver the graph engine and content pipeline — the core product experience — using only static data. Phase 4 introduces auth and the database, enabling the user-data features that follow: progress tracking (Phase 5), self-assessment quizzes (Phase 6), w3champions coarse auto-detection (Phase 7), and replay parsing for fine mechanical signals (Phase 8). Phase 9 completes the guided pathways overlay, meets the minimum publishable content gate (~25 nodes), and prepares for launch. Content authoring runs throughout as a parallel workstream gated by Phase 3's content pipeline.

**Architecture principles (cross-cutting, all phases).** Every phase applies the `/improve-codebase-architecture` + `codebase-design` discipline: design **deep modules** (simple interfaces over substantial implementation — e.g. the replay-signal layer, the content schema, the auto-detection engine), keep modules testable and AI-navigable, and minimize coupling (notably the content/graph-engine decoupling). Phase 1 scaffolds **`CONTEXT.md`** (the project's ubiquitous domain language) and **`docs/adr/`** (Architecture Decision Records). Each subsequent phase reads and extends `CONTEXT.md`, and records significant choices as ADRs. Plan reviews check interface depth and coupling, not just correctness.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Schema** - Zod content schema, MECHANIC/CONCEPTUAL taxonomy, patch-version primitive, CI validation, GPL-3.0 license (completed 2026-06-28)
- [x] **Phase 2: Graph Engine** - React Flow canvas, memoized custom nodes, mastery state visualization, guided-pathway default view (static data only) (completed 2026-06-29)
- [x] **Phase 3: Content Pipeline & Node Panel** - MDX authoring pipeline, lazy-loading node detail panel, citation template, search/filter (completed 2026-06-29)
- [x] **Phase 4: Auth & Database** - Battle.net OAuth via better-auth, Drizzle+Postgres, session-based server function authorization (completed 2026-06-29)
- [x] **Phase 5: Progress Tracking** - Per-node mastery persistence, manual check-off, localStorage merge on sign-in, no gamification (completed 2026-06-30)
- [x] **Phase 6: Self-Assessment Quizzes** - Recall-based quizzes for CONCEPTUAL nodes driving mastery state (completed 2026-07-01)
- [x] **Phase 7: w3champions Auto-Detection** - Coarse ladder signal sync, MECHANIC node auto-advance, DB cache with rate-limit guard (completed 2026-07-01)
- [ ] **Phase 8: Replay Parsing** - w3gjs parser + semantic signal layer, manual upload + w3champions auto-pull, patch-aware mastery thresholds
- [ ] **Phase 9: Guided Pathways & Launch** - Pathway overlay with Beginner Fundamentals track, staleness UI, ~25-node content gate, citation review

## Phase Details

### Phase 1: Foundation & Schema

**Goal**: Typed, Zod-validated content schema with MECHANIC/CONCEPTUAL node taxonomy and patch-version primitive is established as the single source of truth; CI rejects malformed content; project licensed GPL-3.0 with pinned TanStack Start dependencies; architecture foundations (`CONTEXT.md` domain language + `docs/adr/`) scaffolded
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, OSS-01, OSS-02
**Success Criteria** (what must be TRUE):

  1. A developer can add a new node by creating a JSON/MDX file — CI validates it automatically against the Zod schema and fails the build with a clear error if fields are missing or malformed
  2. MECHANIC and CONCEPTUAL are distinct first-class enum values in the node schema; downstream code can switch on `nodeType` without ambiguity
  3. Every node schema field for `patch_context`, `last_reviewed`, and `meta_volatile` is required (not optional/nullable) — a node missing any of them fails CI
  4. The patch-version field appears on node, mastery threshold, and progress schema definitions — it is not a late add, it is present from the first schema commit
  5. The project builds, deploys, and carries a GPL-3.0 license; TanStack Start and all core dependencies are pinned to known-working versions with an explicit upgrade policy documented
  6. `CONTEXT.md` exists capturing the ubiquitous domain language (node, nodeType, mastery state, pathway, signal, patch, threshold) and `docs/adr/` holds at least the foundational ADRs (stack choice, content/engine decoupling, patch-version primitive, GPL-3.0) — the deep-module + ADR discipline is in place before feature phases begin

**Plans**: 8/8 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold TanStack Start app, pin deps, wire content-collections + nitro + Vitest [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Patch registry deep module (PATCHES, CURRENT_PATCH, PATCH_IDS, getPatch) [wave 2]
- [x] 01-03-PLAN.md — CONTEXT.md domain language + foundational ADRs 001-003 + upgrade policy [wave 2]
- [x] 01-04-PLAN.md — GPL-3.0 LICENSE + variant decision checkpoint + SPDX convention + ADR 004 [wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — Three Zod schemas (node, masteryThreshold, progressRecord) with patchId [wave 3]
- [x] 01-06-PLAN.md — content-collections nodes collection (build-time validation) + seed node [wave 3]

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-07-PLAN.md — CI validation (prereq resolution, acyclicity, patchId) + GitHub Actions [wave 4]

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-08-PLAN.md — Live Vercel deploy from day one [wave 5]

### Phase 2: Graph Engine

**Goal**: Interactive React Flow canvas renders seed nodes from static JSON with correct memoization conventions, three-state mastery visualization, and a guided-pathway default view — no auth or DB required
**Depends on**: Phase 1
**Requirements**: GRAPH-01, GRAPH-02, GRAPH-05, GRAPH-06
**Success Criteria** (what must be TRUE):

  1. A user can pan, zoom, and click any node on the graph without visible frame drops — React DevTools Profiler confirms fewer than 3 re-renders per custom node component during a pan gesture
  2. Nodes display three visually distinct mastery states (untouched / in-progress / mastered) using mocked data — the graph is the source of truth for visual state
  3. First-load camera frames the guided pathway (8–12 highlighted nodes) with non-pathway nodes heavily de-emphasized (dimmed, not absent); the full graph is revealed only via an explicit "Explore full map" action — non-pathway nodes remain mounted in the DOM to satisfy the memoization criterion (D-09 interpretation)
  4. On a desktop browser the graph is fully interactive (pan/zoom/click); on a mobile viewport the graph renders node content in a readable simplified form without breaking the page
  5. All custom node components are `React.memo`-wrapped, all graph event handlers use `useCallback`, and `onlyRenderVisibleElements` is enabled — these conventions are present in the first prototype commit, not retrofitted

**Plans**: 10/10 plans complete
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tooling bootstrap: graph deps install, shadcn init (button/badge/tooltip), @xyflow CSS import [wave 1]
- [x] 02-02-PLAN.md — GraphDisplayNode + Pathway Zod schemas + tests, ADR 005, CONTEXT.md glossary [wave 1]
- [x] 02-03-PLAN.md — 10–15 seed MDX nodes (DAG) + mocked mastery map [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-04-PLAN.md — Pure dagre layout + ancestor-chain BFS engine + tests [wave 2]
- [x] 02-05-PLAN.md — Beginner Fundamentals pathway data file + CI referential-integrity check [wave 2]
- [x] 02-06-PLAN.md — Memoized custom node component + mastery badge (D-04/D-05/D-06) [wave 2]
- [x] 02-07-PLAN.md — SSR-safe mobile node list + pathway banner (D-11/D-12) [wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-08-PLAN.md — Edge-highlight subsystem: Zustand store + animated custom edge (D-03) [wave 3]

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-09-PLAN.md — Client-only canvas assembly + memoization conventions + pathway spotlight [wave 4]

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-10-PLAN.md — Route integration (loader + responsive switch) + preview routes + human verify [wave 5]

### Phase 3: Content Pipeline & Node Panel

**Goal**: MDX content pipeline processes node files with citations and application notes; clicking a node opens a lazy-loading detail panel; the citation template enforces "how to apply" siblings; search and filter work on the graph
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, GRAPH-03, GRAPH-04
**Success Criteria** (what must be TRUE):

  1. Clicking a node opens a detail panel showing learning content, inline citations that link to real sources, and a required "How to apply in your next game" section — content loads lazily per node without a full-page reload
  2. Updating a node's content requires only editing its MDX file and deploying — no graph engine or component code changes are needed
  3. A node MDX file without a `howToApply` section or with a citation missing its `applicationNote` field fails the CI build — the template enforces the structure before any content reaches production
  4. Node content attributing wisdom to recognized WC3 players/guides names the source visibly in the panel; attribution is not buried in a footnote
  5. A user can filter nodes by skill type and mastery state — the graph narrows to matching nodes in real time without a page reload

**Plans**: 9/9 plans complete
**UI hint**: yes

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Test/infra foundation: install react-query + jsdom, QueryClientProvider, RED Nyquist test scaffolds [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — CitationSchema discriminated union (node.ts + content-collections.ts) + D-13 How-to-Apply split + migrate 13 seed MDX [wave 2]
- [x] 03-03-PLAN.md — GraphDisplayNode projection extension (skillType + tags) + ADR-006 + loader projection [wave 2]

**Wave 3** *(blocked on Wave 2)*

- [x] 03-04-PLAN.md — graph-store panel + filter state; pure matchesFilter / isFilterActive [wave 3]
- [x] 03-05-PLAN.md — nodeContentQueryOptions lazy per-node content query [wave 3]
- [x] 03-06-PLAN.md — CitationList (numbered science refs) + ProWisdomCallout (creator) + URL allowlist [wave 3]

**Wave 4** *(blocked on Wave 3)*

- [x] 03-07-PLAN.md — PrerequisiteChips (panel swap) + FilterBar (top-bar search + facets) [wave 4]

**Wave 5** *(blocked on Wave 4)*

- [x] 03-08-PLAN.md — NodePanelContent (pinned How-to-Apply + body + citations) + NodeDetailPanel (drawer/sheet) [wave 5]

**Wave 6** *(blocked on Wave 5)*

- [x] 03-09-PLAN.md — Wire onNodeClick + filter dim + mount FilterBar/panel + human-verify checkpoint [wave 6]

### Phase 4: Auth & Database

**Goal**: Users can sign in with Battle.net OAuth; sessions persist across browser refreshes; every server function that reads or writes user data derives the user identity from the server-side session, never from client input
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):

  1. A user can click "Sign in with Battle.net", authenticate on battle.net, and return to the app recognized by their BattleTag — the first server function written follows the `getSession()` → ownership-check pattern before touching any input parameter
  2. Refreshing the browser does not log the user out — the session cookie survives a normal browser refresh
  3. Calling a user-data server function directly (e.g., via curl or Postman) with a different user's resource ID returns an authorization error, not data — client-supplied user IDs are ignored in favor of the session principal
  4. The progress key stored in the database is a stable internal account identifier (UUID from the `users` table) that survives a BattleTag display-name change without breaking progress records

**Plans**: 7/7 plans complete

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Tooling bootstrap: install better-auth/drizzle/neon (pinned), shadcn dropdown-menu/avatar/dialog, drizzle.config.ts, .env.example [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [x] 04-02-PLAN.md — Drizzle schema (users/sessions/accounts/verifications + identity fields), db singleton, smoke test, [BLOCKING] schema push to Neon [wave 2]

**Wave 3** *(blocked on Wave 2)*

- [x] 04-03-PLAN.md — betterAuth instance (Battle.net generic-OAuth, 30-day rolling sessions), auth-client, auth handler route, profile-mapping test [wave 3]

**Wave 4** *(blocked on Wave 3)*

- [x] 04-04-PLAN.md — authedServerFn deep module + first user-data server fn + cross-user authorization test (AUTH-03 centerpiece) [wave 4]
- [x] 04-05-PLAN.md — Auth UI leaf components: SignInButton (gold CTA), RegionSelector (gateway capture), UserDropdown [wave 4]

**Wave 5** *(blocked on Wave 4)*

- [x] 04-06-PLAN.md — SiteHeader compose + __root mount + end-of-phase OAuth/session-persistence verification [wave 5]
- [x] 04-07-PLAN.md — D-14 docs: CONTEXT.md domain terms + ADR 007 (authorization) + ADR 008 (Battle.net integration) [wave 5]

**UI hint**: yes

### Phase 5: Progress Tracking

**Goal**: Logged-in users can manually mark per-node mastery state and have it persist server-side; pre-login progress from localStorage merges on first sign-in; no gamification mechanics exist anywhere in the UI
**Depends on**: Phase 4
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, PROG-05
**Success Criteria** (what must be TRUE):

  1. A logged-in user can manually mark any node as in-progress or mastered, and that state is reflected in the graph immediately and persists across browser sessions and devices
  2. Progress a user accumulated before logging in (stored in localStorage) is merged into their server-side record on first sign-in — no prior progress is silently discarded
  3. Mastery states are visually updated in the graph after marking without a full-page reload — the graph re-renders the affected node only
  4. The progress UI contains no XP points, streak counters, or global leaderboards — the only progress indicator is the user's own mastery state per node, framed as personal skill growth
  5. Clearing localStorage as an authenticated user and reopening the app shows the same server-persisted mastery states as before — client-side state is a cache, not the source of truth

**Plans**: 9/9 plans complete
**UI hint**: yes

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Tooling: install sonner, shadcn toggle-group + sonner, mount Toaster at root [wave 1]
- [x] 05-02-PLAN.md — Schema vocabulary: learning→in-progress (D-03), source field (D-04), single-source MasteryState, MasteryBadge label [wave 1]
- [x] 05-03-PLAN.md — nodeProgress Drizzle table (surrogate PK + unique index, FK, source/patch) + [BLOCKING] schema push [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [x] 05-04-PLAN.md — Progress server fns: getUserProgress / setNodeMastery / mergeProgressOnSignIn (principal-keyed, D-06) [wave 2]
- [x] 05-05-PLAN.md — Client primitives: SSR-safe local-progress store, progressKeys factory, graph-store masteryMap slice [wave 2]

**Wave 3** *(blocked on Wave 2)*

- [x] 05-06-PLAN.md — useProgressMutation (optimistic + rollback, D-09) + MasteryControls 3-state panel control (no gamification) [wave 3]
- [x] 05-07-PLAN.md — ProgressProvider: hydrate masteryMap + one-time fill-gaps merge on sign-in (D-07) + mount in home route [wave 3]

**Wave 4** *(blocked on Wave 3)*

- [x] 05-08-PLAN.md — Seam swap: RoadmapGraph getMockMastery→masteryMap (single-node re-render) + mount MasteryControls in panel [wave 4]

**Wave 5** *(blocked on Wave 4)*

- [x] 05-09-PLAN.md — Docs (CONTEXT.md terms + ADR 009) + end-of-phase human-verify checkpoint [wave 5]

### Phase 6: Self-Assessment Quizzes

**Goal**: CONCEPTUAL nodes offer short recall-based quizzes that drive that node's mastery state to mastered on passing; MECHANIC nodes never surface a quiz
**Depends on**: Phase 3, Phase 5
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03
**Success Criteria** (what must be TRUE):

  1. A CONCEPTUAL node's detail panel shows a "Take Assessment" button that launches a short quiz (3–5 questions); a MECHANIC node's panel has no such button
  2. Passing a quiz updates that node's mastery state to mastered — the graph reflects the update without a page reload, and the source is labeled "quiz" (not manual)
  3. A quiz question cannot be answered correctly by re-reading the node's surface text; questions require genuine recall or application of the concept — a subject-matter expert would agree the question tests understanding

**Plans**: 11/11 plans complete

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Quiz content schema (QuizSchema) + CI validation, parallel-synced node.ts + content-collections.ts
- [x] 06-02-PLAN.md — Source enum → quiz + quizProgress table (forward-SRS signals) + [BLOCKING] drizzle-kit push
- [x] 06-03-PLAN.md — graph-store sourceMap slice + ProgressProvider hydration

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-04-PLAN.md — Pure grading engine (PASS_THRESHOLD, gradeQuiz/gradeAnswers, shuffle) [TDD]
- [x] 06-05-PLAN.md — recordQuizPass/recordQuizAttempt principal-keyed server fns [TDD]
- [x] 06-06-PLAN.md — MasteryBadge "via quiz" label + GraphNode subtle quiz marker (D-14)
- [x] 06-07-PLAN.md — Author tech-timing demo quiz + SME review (criterion 3)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-08-PLAN.md — useQuizPassMutation optimistic no-reload hook
- [x] 06-09-PLAN.md — Quiz UI primitives: radio-group + QuizQuestion/QuizStepper/QuizResults

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-10-PLAN.md — QuizCTA gating (+tests) + QuizTakeover flow host

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 06-11-PLAN.md — Panel integration (in-panel takeover) + CONTEXT.md terms + ADR 010 + end-to-end verify

**UI hint**: yes

### Phase 7: w3champions Auto-Detection

**Goal**: Authenticated users can link their w3champions ladder data and have coarse signals (MMR tier, games volume, matchup W/L trends) auto-advance eligible MECHANIC nodes; the sync is user-triggered, rate-limit-respecting, and never blocks manual tracking
**Depends on**: Phase 5
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05
**Success Criteria** (what must be TRUE):

  1. A logged-in user can trigger "Sync with w3champions" from their profile and see "Last synced: Xm ago" after it completes — the sync uses their BattleTag from their Battle.net identity, no separate linking step required
  2. After a successful sync, MECHANIC nodes for which coarse signals qualify automatically advance in mastery state — the change is labeled "auto-detected from w3champions" and is visible as distinct from manual check-off
  3. Triggering the sync twice within the cache TTL returns cached data and does not make a second API call — the app respects TanStack Query stale-while-revalidate and the DB TTL layer
  4. A user who has no linked data, whose sync fails, or who skips the feature entirely can still track all progress manually and take quizzes — auto-detection is an enhancement, not a prerequisite
  5. CONCEPTUAL nodes never advance from a sync result — the `detectMasterySignals()` pure function only emits updates for nodes with `nodeType === 'mechanical'`

**Plans**: 8/8 plans complete
**Wave 1**

- [x] 07-01-PLAN.md — mmr-tiers ordinal registry (tierForMmr/tierIndex/TIER_IDS)
- [x] 07-02-PLAN.md — w3championsSync cache table + [BLOCKING] drizzle-kit push
- [x] 07-03-PLAN.md — auto-source labeling + graph highlight slice (MasteryBadge/GraphNode/store)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-04-PLAN.md — content schema autoDetect criterion (node.ts + content-collections mirror)
- [x] 07-05-PLAN.md — detectMasterySignals pure function (MECHANIC-only, untouched-only)
- [x] 07-06-PLAN.md — w3champions fetch client + D-10 status classifier + SYNC_TTL_MS/keys

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-07-PLAN.md — sync + status server fns (principal-keyed, TTL gate, additive ratchet)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-08-PLAN.md — sync UX hook + always-live button + UserDropdown mount

**UI hint**: yes

### Phase 8: Replay Parsing

**Goal**: Users can upload a `.w3g` replay or trigger auto-pull from w3champions and receive fine-grained mechanical signal analysis — build-order timing, APM/eAPM, control-group usage, hero timing — mapped to MECHANIC node mastery against patch-aware thresholds, with actionable feedback
**Depends on**: Phase 4, Phase 5
**Requirements**: REPLAY-01, REPLAY-02, REPLAY-03, REPLAY-04, REPLAY-05, REPLAY-06, REPLAY-07, REPLAY-08
**Success Criteria** (what must be TRUE):

  1. A user can upload a `.w3g` replay file from their WC3 replay folder and receive a breakdown of their build-order timing, APM, eAPM approximation, hero buy timing, control-group usage, and expansion timing — all extracted by w3gjs with the semantic signal layer
  2. The analysis feedback is actionable: each signal is presented as "you executed X at time Y; the target for this mechanic node is Z" — raw numbers alone are not returned without context
  3. Signals that meet patch-aware mastery thresholds automatically advance the relevant MECHANIC node toward mastered — the source is labeled "replay-detected" and the WC3 build number is stored alongside the result
  4. The wc3v fork integration provides advanced analysis output (supply curves, precise expansion detection, compare-to-pro signals) as an additional analysis layer on top of w3gjs base signals
  5. Users can trigger auto-pull of recent w3champions replays from their profile (after rate-limit confirmation via the w3champions API token); parsed results are cached by gameId so the same replay is never re-parsed

**Plans**: 4/13 plans executed

Plans:
**Wave 1**

- [ ] 08-01-PLAN.md — Wave 0: w3gjs legitimacy checkpoint + install + parse/endpoint spike (ADR 011)
- [x] 08-02-PLAN.md — mastery-ordinal helper + progress source enum +replay (D-01)
- [ ] 08-03-PLAN.md — parseReplay w3gjs Buffer wrapper (fail-safe)
- [x] 08-04-PLAN.md — patch-aware object-ID maps (D-12)
- [ ] 08-05-PLAN.md — pure semantic signal layer + 1v1 gate (D-11/D-15)
- [ ] 08-06-PLAN.md — replayAnalysis cache table + [BLOCKING] drizzle-kit push (D-17)
- [x] 08-07-PLAN.md — replayCriteria frontmatter + content-collections mirror
- [x] 08-08-PLAN.md — fetchReplayBytes SSRF-guarded download + replay-keys

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 08-09-PLAN.md — pure patch-aware threshold detector (feedback data)
- [ ] 08-10-PLAN.md — 4 canonical build-order MECHANIC nodes, one per race (D-10)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 08-11-PLAN.md — server orchestration: upload/pull/read + monotonic-max write (D-03/D-04)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 08-12-PLAN.md — /replays route + upload/pull hooks + actionable report

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 08-13-PLAN.md — wc3v advanced-analysis layer (isolatable/descopable, D-06/D-07)

### Phase 9: Guided Pathways & Launch

**Goal**: The guided pathway overlay ships as the default landing view with a Beginner Fundamentals track; the minimum publishable content gate (~25 fully-authored nodes) is met; a citation review pass confirms no decorative science; staleness indicators surface on meta-volatile nodes
**Depends on**: Phase 2, Phase 5
**Requirements**: PATH-01, PATH-02, PATH-03, PATH-04, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):

  1. A first-time visitor lands on the Beginner Fundamentals guided pathway by default — they see an ordered, highlighted subset of 8–12 nodes with a progress indicator, not the raw full graph
  2. As a user masters nodes in the pathway, the pathway completion progress bar advances — the progress is visually tied to their mastery state, not to page visits
  3. At least 25 race-agnostic fundamentals nodes are fully authored with real peer-reviewed citations, concrete "how to apply in your next game" sections, and attributed WC3 player wisdom before the app is publicly announced
  4. A citation review audit confirms every citation on every launched node supports a specific verifiable claim and pairs it with a concrete WC3 drill — any node failing this audit is withheld from launch
  5. Meta-volatile nodes that have not been reviewed against the current WC3 patch display a visible staleness indicator in their detail panel so users can calibrate their trust appropriately

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Schema | 8/8 | Complete    | 2026-06-28 |
| 2. Graph Engine | 10/10 | Complete    | 2026-06-29 |
| 3. Content Pipeline & Node Panel | 9/9 | Complete    | 2026-06-29 |
| 4. Auth & Database | 7/7 | Complete    | 2026-06-29 |
| 5. Progress Tracking | 9/9 | Complete    | 2026-06-30 |
| 6. Self-Assessment Quizzes | 11/11 | Complete    | 2026-07-01 |
| 7. w3champions Auto-Detection | 8/8 | Complete    | 2026-07-01 |
| 8. Replay Parsing | 4/13 | In Progress|  |
| 9. Guided Pathways & Launch | 0/? | Not started | - |
