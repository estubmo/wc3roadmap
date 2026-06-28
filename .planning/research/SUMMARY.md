# Project Research Summary

**Project:** WC3 Learning Roadmap
**Domain:** Interactive skill-progression web app — RTS/gaming education with science-backed content and external ladder API integration
**Researched:** 2026-06-28
**Confidence:** MEDIUM

## Executive Summary

The WC3 Learning Roadmap is a content-first interactive graph application where the learning content itself is the product, and the graph UI is the delivery mechanism. Experts build this class of app by strictly decoupling the content data layer (JSON/MDX files, Zod-validated at build time) from the graph rendering engine, so content can be authored, updated, and community-extended independently of UI code. The recommended stack is TanStack Start (full-stack React, Nitro/Vercel deploy) + React Flow v12 (@xyflow/react) + better-auth (Battle.net OAuth) + Drizzle + Neon Postgres + content-collections (MDX/JSON pipeline). All four research streams converged on this combination with no significant dissent.

The most important feasibility constraint surfaced by research: the w3champions public API exposes only outcome stats — MMR, W/L by race/season, match history with result/race/heroes/duration. It does NOT expose fine-grained timing signals. The PROJECT.md example of auto-detecting "build order executed under 4:00" is not achievable from the w3champions API alone — it would require separate .w3g replay parsing (a v2 candidate). Auto-detection in v1 must be re-scoped to coarse ladder signals: games-played volume, MMR tier thresholds, and matchup W/L trends. This constraint does not kill the differentiator — it bounds it honestly. w3champions is also not an OAuth provider; the correct flow is Battle.net OAuth (returns BattleTag) followed by a BattleTag-keyed lookup against the w3champions public API.

The two largest risks are (1) scope: "comprehensive at launch" is a permanent shipping blocker — a minimum publishable content set of ~20-30 fully-authored race-agnostic fundamentals nodes must be a hard launch gate, not a goal; and (2) adoption: this is a small-community niche tool that will die in silence without community relationship-building beginning in parallel with development, not after ship. Both risks are architectural in their implications: the roadmap must treat content authoring as a first-class engineering phase and community engagement as a concurrent workstream, not a post-launch afterthought.

## Key Findings

### Recommended Stack

The stack is well-established within the TanStack ecosystem. TanStack Start v1 (RC but feature-stable, weekly releases since Sep 2025) handles full-stack React with type-safe server functions, file-based routing, and SSR. It deploys zero-config to Vercel via Nitro. React Flow v12 (@xyflow/react) is the clear graph library choice — it is React-native, supports Tailwind v4, integrates with shadcn/ui, and performs excellently at the 50-200 node scale this project requires. The alternative (Cytoscape.js) is irrelevant at this scale and requires imperative DOM manipulation incompatible with the React component model.

**Core technologies:**
- `@tanstack/react-start` 1.168.x: Full-stack framework (SSR, server functions, routing) — committed framework, RC-stable, Nitro deploy covers all targets
- `@xyflow/react` 12.x: Interactive graph — React-native, Tailwind v4, 50-200 node scale, shadcn/ui integration
- `better-auth` (latest): Battle.net OAuth via genericOAuth plugin — official TanStack Start adapter; w3champions is NOT a separate OAuth provider
- `drizzle-orm` 0.44.x + Neon PostgreSQL: Database layer — edge-compatible, lightweight, strong TanStack Start community precedent
- `@content-collections/core`: Build-time content pipeline (MDX/JSON + Zod validation) — official TanStack Start quickstart exists
- `zod` 4.x: Schema validation for content schemas, route search params, API responses
- `motion` 12.x (import from `motion/react`): Animations — formerly framer-motion; React Flow team recommends
- Tailwind CSS 4.x + shadcn/ui: Styling — both updated for v4 + React 19

**Do not use:** `framer-motion` (renamed), `contentlayer` (unmaintained), tRPC (redundant with server functions), Prisma (edge issues), `reactflow` package (old name), `tailwindcss-animate` (deprecated).

**Deployment:** Start with Vercel (zero-config, free hobby tier). Migrate to Cloudflare Workers only if cold starts become a UX problem — Cloudflare requires additional compatibility work with better-auth.

### Expected Features

The product's value proposition rests on three interacting differentiators: science-backed citations with actionable "how to apply" drills (not decorative citations), a dual mastery model (MECHANIC nodes auto-detected from w3champions, CONCEPTUAL nodes via self-assessment quiz), and a free-form graph with guided pathway overlays. No existing WC3 resource has any of these. The critical constraint: auto-detection must be coarse (ladder signals only), and the node taxonomy (MECHANIC vs CONCEPTUAL) must be baked into the data model from day one — retrofitting it later requires re-classifying all content.

**Must have (table stakes):**
- Interactive node graph with pan/zoom/click — product premise; degradation destroys the concept
- Substantive per-node content (citation + actionable drill) for all launched nodes — this IS the product
- Node mastery states (untouched / learning / mastered) with visual state in graph
- Persistent progress across sessions (server-side; localStorage fallback pre-auth)
- Battle.net OAuth login — real player identity
- At least one Guided Pathway ("Beginner Fundamentals") — required to onboard novices
- Node taxonomy (MECHANIC vs CONCEPTUAL) — must precede all content authoring
- Meta-volatile dating (`last_reviewed`, `patch_context`) baked into data model

**Should have (differentiators):**
- Self-assessment quizzes for CONCEPTUAL nodes (retrieval practice; 3-5 questions)
- w3champions API coarse auto-detection for MECHANIC nodes (MMR tier, games volume, matchup W/L)
- Race-agnostic fundamentals as graph core (cross-community appeal)
- Visible citations inline per node with sibling "how to apply" section
- Search/filter by race / skill type / mastery state
- Default view as guided pathway (NOT full graph) — prevents cognitive overload

**Defer (v2+):**
- Replay parsing (.w3g) for fine-grained mechanical auto-detection — high complexity, requires separate infrastructure
- Race-specific branch nodes — after fundamentals are complete and validated
- Multiple guided pathways — after first pathway is used and users request more
- Community contribution UI — after GitHub PR pipeline is proven
- Mobile interactive graph — desktop-first is correct for v1

**Anti-features (deliberately omit):**
- XP/point systems, streaks, global leaderboards — Goodhart's Law; shift motivation from mastery to metric-gaming
- AI chat tutor — hallucination risk undermines science-backed credibility prop
- Hard prerequisite locking — WC3 improvement is non-linear; soft edges only
- Replay analyzer — duplicates wc3ai/wc3v; scope creep from curriculum mission

### Architecture Approach

The load-bearing architecture decision is full decoupling of the content layer from the graph engine. The Graph Engine (React Flow) receives only display data — node IDs, titles, race, type, position, mastery state. It never receives MDX content, citations, or quiz questions. Node detail content loads lazily per node via TanStack Query only when the user opens a node panel. This means the graph renders, pans, and shows mastery states with zero content loaded, and content updates never touch graph engine code. The w3champions sync service is on-demand (user-triggered) with a DB cache layer — never automatic polling of an undocumented community API.

**Major components:**
1. **Graph Engine (React Flow)** — renders interactive canvas; reads compiled node JSON + pathway JSON at SSR time; reads user progress via TanStack Query; all custom node components are React.memo-wrapped per type
2. **Content Data Layer (repo files)** — Zod-validated JSON/MDX at build time; source of truth for all learning content; extensible by adding files; never coupled to graph engine code
3. **Node Detail Panel** — loads MDX lazily per-node (queryKey: `['node-content', nodeId]`, staleTime: Infinity); renders citations, application notes, quiz trigger
4. **Auth Handler (better-auth)** — Battle.net OAuth; session cookies; `getSession()` called at top of every server function
5. **Server Functions (Drizzle ORM)** — all DB reads/writes gated behind session check; called from client via RPC; NEVER accept userId from client input
6. **w3c Sync Service** — on-demand user-triggered sync; DB cache with 5-min TTL; maps coarse ladder signals to node mastery updates via pure `detectMasterySignals()` function
7. **Quiz Subsystem** — pure React state machine (`useReducer`); only final score persisted to DB

**Key patterns:**
- Server Function + TanStack Query cache for all DB ops (SSR prefetch, dehydrate, client rehydrate = no loading states on first paint)
- Content-split node loading (graph structure at SSR time; node content lazy per-panel-open)
- w3c sync on-demand with DB cache (never poll external community API)
- Mastery auto-detection as pure function with unit tests; results stored as `auto_w3c` source, always overridable by manual

**Database schema tables:** `users`, `node_progress` (with `masterySource` enum: manual/auto_w3c/quiz), `quiz_attempts`, `w3c_cache`

### Critical Pitfalls

1. **w3champions API exposes outcomes only, not timing signals** — "build order under 4:00" auto-detection is NOT feasible from this API; re-scope v1 auto-detection to coarse signals (MMR tier, games volume, matchup W/L). Verify API accessibility with w3champions team before writing a line of integration code; build manual-fallback-first so the app ships regardless.

2. **Server functions are public HTTP endpoints** — every `createServerFn` that reads/writes user data must derive the user ID from the server-side session, never from client-supplied parameters. Shape validation (Zod) is not authorization. Establish this pattern on the first server function; do not retrofit.

3. **React Flow memoization failures cause render loops and jank** — all custom node components must be React.memo-wrapped; all event handlers must use useCallback; enable `onlyRenderVisibleElements` from the first prototype. Graph performance debt compounds and is painful to retrofit.

4. **"Comprehensive at launch" is a permanent shipping blocker** — define a Minimum Publishable Content set (~20-30 race-agnostic fundamentals nodes) as a hard launch gate before any content authoring begins. Race-specific branches ship after fundamentals are complete and validated.

5. **Default graph view must be a guided pathway, not the full graph** — full graph as default causes cognitive overload and novice abandonment. First-load must show a selected guided pathway (8-12 nodes). Full graph is an explicit secondary action. This must be a day-one UX decision, not a post-launch fix.

6. **Community adoption requires relationship-building during development** — a technically excellent tool shipped with no community relationships dies in silence in a small niche. Get 2-3 recognized WC3 players to review content before launch; post "building in public" in r/WC3 and w3champions Discord while building.

## Implications for Roadmap

Based on combined research, the architecture's natural dependency graph suggests 7-8 phases. The MECHANIC/CONCEPTUAL node taxonomy and content schema must be locked before any UI is built — this is the hardest upstream dependency. Everything else flows from it.

### Phase 1: Project Foundation and Content Schema
**Rationale:** Node taxonomy (MECHANIC vs CONCEPTUAL), Zod content schemas, and ~15-20 seed nodes are the hard dependency for every downstream phase. Graph UI needs typed data to render; quizzes need taxonomy to route; auto-detection needs the MECHANIC/auto_w3c mastery source to store to. Getting the schema wrong here forces rework of all content.
**Delivers:** Drizzle DB schema, Zod content schemas (node, pathway, citation), 15-20 fully-authored race-agnostic fundamentals nodes in JSON/MDX, CI validation pipeline, project setup with pinned dependencies.
**Addresses:** Node taxonomy requirement; meta-volatile dating data model; minimum publishable content constraint
**Avoids:** "Comprehensive at launch" trap (define hard content gate now); content-in-components anti-pattern; TanStack Start breaking changes (pin deps from day one)

### Phase 2: Graph Engine (No Auth)
**Rationale:** Proves the core UX concept with static data only. React Flow canvas, custom node types, Dagre layout, pan/zoom, pathway overlay can all be validated before any auth complexity. Memoization conventions must be established here — not retrofitted later.
**Delivers:** Interactive React Flow canvas; custom node components (FoundationalNode, MechanicalNode per type, all React.memo'd); pathway overlay; mastery state visualization (mocked); pan/zoom/click; `onlyRenderVisibleElements` enabled; guided pathway as default first-load view.
**Implements:** Graph Engine + Content Data Layer decoupling
**Avoids:** React Flow memoization failures (establish conventions now); full-graph-as-default UX pitfall

### Phase 3: Node Detail Panel and Content Pipeline
**Rationale:** Proves content/engine decoupling. MDX authoring pipeline, citations, application notes, and per-node content loads can be built and validated while auth is being configured in parallel.
**Delivers:** content-collections MDX pipeline; per-node content panel (lazy load via TanStack Query); citation list; "how to apply" application note section; search/filter by race/skill type.
**Uses:** `@content-collections/core`, `@content-collections/mdx`, `@content-collections/vite`
**Avoids:** Citation as credibility theater (enforce citation template with "how to apply" sibling section before any content is authored)

### Phase 4: Auth and User Accounts
**Rationale:** Needed before any progress persistence. better-auth + Battle.net OAuth setup, PostgreSQL schema via Drizzle, session middleware. Must establish the server function authorization pattern on the first function written.
**Delivers:** Battle.net OAuth login flow; better-auth session cookies; user upsert in PostgreSQL; `getSession()` middleware pattern established; `beforeLoad` route guards; auth handler at `/api/auth/$`.
**Uses:** `better-auth` genericOAuth plugin, Drizzle + Neon, `@neondatabase/serverless`
**Avoids:** Server function authorization confusion (establish ownership-check pattern immediately); OAuth token management failures (PKCE, httpOnly cookies, 401 refresh handling)

### Phase 5: Progress Tracking and Manual Check-off
**Rationale:** First end-to-end user feature. Validates the data layer. Self-assessment quizzes for CONCEPTUAL nodes belong here — they depend on auth (Phase 4) and content pipeline (Phase 3).
**Delivers:** Node mastery states persisted server-side (node_progress table); manual check-off UI; self-assessment quiz flow for CONCEPTUAL nodes (QuizFlow state machine; score persistence); progress visible in graph via TanStack Query; localStorage fallback pre-auth.
**Implements:** Quiz Subsystem; Server Functions pattern
**Avoids:** Extrinsic motivation collapse (no streaks, no leaderboards; progress framed as personal mastery growth); progress stored client-side only

### Phase 6: w3champions API Integration (Feasibility-Gated)
**Rationale:** High feasibility risk — must be preceded by a dedicated spike confirming API accessibility with the w3champions team. If API is unavailable, Phase 5 (manual tracking) is the full v1 feature set and this phase is deferred. Build manual fallback first (Phase 5) so this phase is additive, not blocking.
**Delivers:** w3champions API wrapper with DB cache (w3c_cache table); user-triggered sync ("Sync with w3champions" button); `detectMasterySignals()` pure function mapping coarse ladder signals (MMR tier, games volume, matchup W/L) to MECHANIC node mastery updates; "Last synced: Xh ago" UI. COARSE signals only — no timing/APM data.
**Avoids:** API polling anti-pattern (user-triggered only); ladder metrics as mastery proxy (signals are coarse and explicitly bounded; never derive mastery from win/loss outcomes alone)
**Research flag:** Needs feasibility spike before phase planning — contact w3champions team to confirm API access and rate limits

### Phase 7: Polish, Guided Pathways, and Launch Prep
**Rationale:** Once core features are validated, add multiple pathways, staleness indicators, UI animations, and community launch preparation. Community engagement must begin before this phase, not during it.
**Delivers:** Multiple guided pathways (Beginner, Human Fundamentals, etc.); staleness UI indicators for meta-volatile nodes; motion animations for node state transitions; pathway progress bar; shareable progress URL; pre-launch community review by recognized WC3 players.
**Uses:** `motion` 12.x; pathway JSON files (content-collections)
**Avoids:** Zombie project / adoption failure (launch timing, community relationships, pro player endorsement)

### Phase Ordering Rationale

- Content schema before graph UI: typed data shapes must exist before React Flow custom node components are written around them; retrofitting taxonomy into content means re-classifying everything
- Graph UI before auth: React Flow UX can be validated with static/mocked data; no need to block on OAuth integration complexity
- Content pipeline in parallel with auth: MDX authoring and per-node panels have no auth dependency; these phases can partially overlap
- Progress tracking before w3champions sync: manual check-off is the fallback; w3champions integration is additive enhancement, not foundational
- w3champions as a feasibility-gated phase: high risk, must be spiked before planning; Phase 5 delivers value whether or not this phase proceeds

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (w3champions integration):** API feasibility unconfirmed; rate limits unknown; must spike before phase planning. If blocked, defer to v2 with replay parsing alternative.
- **Phase 4 (Auth):** better-auth + Battle.net OAuth combination has no community-validated examples as of June 2026; budget 1-2 days integration time for edge cases (region-specific OAuth hosts: us.battle.net, eu.battle.net).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Drizzle + Neon + content-collections is well-documented with TanStack Start quickstarts
- **Phase 2 (Graph Engine):** React Flow v12 performance patterns are well-documented; memoization conventions are established
- **Phase 5 (Progress/Quiz):** TanStack Query + server functions pattern is standard; quiz state machine is a well-understood pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | All library choices verified via npm/official docs. TanStack Start RC-stable but not GA. better-auth + Battle.net combination unvalidated in community — treat as "probably works, needs 1-2 days." Drizzle + Neon is HIGH. |
| Features | MEDIUM | Feature set is well-reasoned and internally consistent. w3champions API data boundaries confirmed via open-source GitHub inspection. Rate limits unknown — must verify empirically or via Discord. |
| Architecture | MEDIUM | Patterns are sound and internally consistent. Content/engine decoupling is a proven pattern. w3champions API shape inferred from open-source frontend, not official docs. |
| Pitfalls | MEDIUM | Pitfalls are well-sourced and cross-verified. w3champions API availability requires team confirmation before Phase 6 begins. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **w3champions API rate limits and ToS:** Unknown. Contact w3champions Discord/team before Phase 6 planning. Wc3stats.com (`wc3stats.com/docs/api`) is a documented alternative/supplement worth evaluating.
- **better-auth + Battle.net OAuth edge cases:** No community-validated example exists. Budget discovery time in Phase 4. Region-specific OAuth hosts (us/eu/kr) require testing.
- **Mastery signal thresholds for MECHANIC nodes:** Must be defined with expert WC3 player input before Phase 6 integration is written. "Games played >= 20" and "MMR >= X" thresholds are heuristic — require validation.
- **Minimum Publishable Content gate:** Must be explicitly defined (node count, which nodes, acceptance criteria) before Phase 1 content authoring begins. Recommended: ~20-30 race-agnostic fundamentals with full citation + application note.
- **TanStack Start RSC:** React Server Components not yet stable in TanStack Start as of June 2026. Do not architect around RSC until a stable release lands; track CHANGELOG actively.

## Sources

### Primary (HIGH confidence)
- `@tanstack/react-start` npm — version 1.168.26 confirmed June 2026
- Neon pricing page — free tier 100 CU-hours/month confirmed
- Vercel TanStack Start docs — zero-config deploy confirmed
- Drizzle + Neon + TanStack Start — multiple tutorials validated

### Secondary (MEDIUM confidence)
- reactflow.dev / xyflow blog — v12 features, Tailwind v4 update (Oct 2025), performance docs
- better-auth docs — TanStack Start adapter, genericOAuth plugin
- Blizzard OAuth developer portal — Authorization Code flow, BattleTag scope confirmed
- content-collections TanStack Start quickstart — Vite plugin integration confirmed
- InfoQ TanStack Start v1 RC announcement — framework maturity assessment
- w3champions GitHub (identification-service, website-backend) — API shape and OAuth flow inferred from source

### Tertiary (LOW confidence)
- w3champions API rate limits — unknown; inferred from caching-heavy open-source implementation
- Battle.net + better-auth specific integration — no community examples; needs empirical validation in Phase 4

---
*Research completed: 2026-06-28*
*Ready for roadmap: yes*
