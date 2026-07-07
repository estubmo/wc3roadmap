# WC3 Learning Roadmap

## What This Is

A free, open-source public web app that presents an interactive, beautifully designed **node graph** of Warcraft III / RTS learning concepts. Race-agnostic fundamentals form the core, with race-specific branches layered on top. Each node carries science-backed learning content with **visible per-node citations** (motor learning, deliberate practice, sport/competitive psychology) plus distilled wisdom from the most recognized WC3 players and content-creators. Players sign in with Battle.net / w3champions identity and the app auto-detects skill mastery from real w3champions ladder data to track progress as they learn.

It is for the WC3 community — players of any race and any skill level who want a structured, evidence-based path to genuinely improve.

## Core Value

The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy. If the interface, tracking, and integrations all failed, the substance of the guidance must still stand on its own.

## Business Context

<!-- Free & open-source community project — no monetization. -->

- **Customer**: WC3 players of all skill levels (public community tool)
- **Revenue model**: None — free and open source (public good)
- **Success metric**: Players using it report measurable improvement / return to keep learning
- **Strategy notes**: Code and content public on GitHub; designed for community contribution over time

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User accounts via Battle.net OAuth (returns BattleTag identity) — v1.0 (Phase 4; live sign-in, UUID-keyed identity, session-derived authorization)
- ✓ Interactive node-graph UI for navigating WC3/RTS learning concepts (pan/zoom, non-linear) — v1.0 (Phases 2–3; React Flow canvas, memoized nodes, filter/search)
- ✓ Race-agnostic fundamentals as the graph core, structured for race-specific branches — v1.0 (25-node agnostic core; race branches deferred to v1.x by design)
- ✓ Per-node learning content with visible citations to peer-reviewed / scientific sources — v1.0 (Phases 3/9; 25 launch-ready nodes, verified per-node citations)
- ✓ Every citation paired with a concrete "how to apply in your next game" section — v1.0 (enforced by content schema; audited)
- ✓ Node content distills wisdom from recognized WC3 creators — v1.0 (Warcraft Gym / Liquipedia / named creators, URL-verified)
- ✓ Comprehensive content at launch — v1.0 *(scoped to the fully-authored race-agnostic core, 25 nodes; breadth into race branches is v1.x)*
- ✓ Content stored as decoupled, version-controlled MDX independent of the graph engine — v1.0 (Phases 1/3; ADR 002 content/engine decoupling)
- ✓ Patch-version awareness across the ENTIRE system (content, build orders, thresholds, replays, progress) — v1.0 (single patch registry; ADR 003; staleness UI)
- ✓ Guided Pathways / Learning Tracks overlay — v1.0 (Phase 9; Beginner Fundamentals ordered spotlight + mastery-tied progress)
- ✓ Progress tracking per node (mark / show mastery state) — v1.0 (Phase 5; server-persisted, localStorage merge on sign-in, no gamification)
- ✓ Coarse auto-detection from the w3champions API (games volume, MMR tier) — v1.0 (Phase 7; DB-cached, rate-limit-guarded)
- ✓ `.w3g` replay parsing for fine mechanical signals — v1.0 *(Phase 8; w3gjs base loop ships complete. Forked-wc3v advanced analysis (REPLAY-03) descoped to v1.x — blocked by external proprietary data, not code; ADR 012)*
- ✓ Replay ingest both ways: manual `.w3g` upload + auto-pull from w3champions — v1.0 (Phase 8)
- ✓ Auto-detect mastery scoped to foundational/mechanic nodes; conceptual nodes never auto-detected — v1.0 (Phases 7/8; structural filter)
- ✓ Manual check-off + self-assessment quizzes for conceptual/strategic nodes — v1.0 (Phase 6; SME-approved, no score)
- ✓ Easily extensible content + data model — v1.0 (schema + content-collections; add nodes/sources from frontmatter)

### Active

<!-- Next milestone (v1.x) candidates. Not yet scoped — define via /gsd-new-milestone. -->

- [ ] Race-specific branch nodes (Human / Orc / Undead / Night Elf) layered on the agnostic core
- [ ] Forked-wc3v advanced replay analysis (REPLAY-03) — supply curves, battle detection, compare-to-pro *(needs external WC3 data sourcing: SLK-derived unit costs + per-map pathing grids)*
- [ ] Community contribution UI + additional guided pathways beyond Beginner Fundamentals
- [ ] Finer matchup-level auto-detection (per-race W/L trends)
- [ ] Mobile-graph interaction (v1.0 renders mobile content readably but not the interactive canvas)
- [ ] In-app navigation surfacing of `/replays` beyond the header link (e.g. contextual CTA from MECHANIC nodes)
- [ ] Community + pro-player validation pass before wider promotion (adoption strategy)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- In-app AI tutor / chat assistant — TanStack AI was a misunderstanding; no committed AI product feature. Revisit later if desired.
- Monetization / paid tiers — project is a free public good
- Gamification (XP, streaks, global leaderboards) — measures consumption/app-visits, not real WC3 improvement; actively harmful to the learning mission (v1.0 confirmed this stance in code — no gamification anywhere)
- Hard prerequisite locking — WC3 learning is non-linear; soft edges + guided pathways instead

## Context

- **Current state (v1.0, shipped 2026-07-07)**: Live at https://wc3roadmap.vercel.app. 9 phases / 88 plans / ~21.3k LOC TS/TSX / 541 tests. Stack in production: TanStack Start (React 19, Vite) on Vercel, @xyflow/react graph, better-auth (Battle.net OAuth), Drizzle + Neon Postgres, content-collections MDX (25 launch-ready nodes), Tailwind v4. Four mastery-detection sources live (manual, quiz, w3champions auto, `.w3g` replay). 13 ADRs, CONTEXT.md domain language, CI content-validation + LAUNCH_GATE. Not yet promoted to the community (adoption/validation pass is a v1.x Active item).
- **Known tech debt / notes**: wc3v advanced replay analysis (REPLAY-03) descoped to v1.x (external data-sourcing wall, ADR 012); manual mastery writes are intentionally non-monotonic; mobile renders content but not the interactive graph canvas.
- **Domain**: Competitive Warcraft III (Reforged / classic ladder via w3champions). Race-agnostic RTS fundamentals (macro, micro, mechanics, decision-making) plus the four races (Human, Orc, Undead, Night Elf).
- **Evidence base**: Learning design grounded in motor-skill acquisition, deliberate practice, and competitive/sport psychology research — surfaced as clickable citations per node.
- **Content sourcing**: Node content to be researched against peer-reviewed sources and authoritative WC3 creators (likely a `/deep-research`-driven authoring pipeline during build).
- **w3champions**: External community ladder platform. Identity comes from Battle.net OAuth (BattleTag); the w3champions API is a separate BattleTag-keyed lookup that exposes coarse outcome stats only (MMR, W/L by race/season, match history). Fine-grained mechanical signals come from `.w3g` replay parsing, not the API. API rate limits are undocumented — cache aggressively (TanStack Query).
- **Replay parsing**: `.w3g` replay files are parsed to extract objective mechanical signals (build timings, expansion timing, APM/eAPM, control-group/hotkey use, hero/item builds, supply/economy curves). Stack: **w3gjs** (MIT, v4.x) as the base parser — it already decodes unit/building/item IDs and gives ~80% of signals in a Node server function — plus a **fork of wc3v (jblanchette/wc3v, GPL-3.0)** for sophisticated analysis (supply curves, battle detection, compare-to-pro, creep routing). Replays are ingested two ways: manual `.w3g` upload AND auto-pull from w3champions' replay endpoint (`GET api.w3champions.com/api/replays/{gameId}`, ~50/hr rate limit, token available). Parsing must be patch-version aware (object-ID maps + build-order correctness vary by patch).
- **Curation model**: Content authored/curated by the project owners for v1; designed so community contribution can be added later.
- **Meta volatility**: WC3 balance patches shift the strategic meta quickly. Content/UI decoupling and node-level dating exist specifically to keep updates cheap. Foundational mechanics/psychology are stable; race/matchup specifics are volatile.
- **Mastery measurement**: Ladder data (MMR/APM/W-L) is a weak proxy for *conceptual* mastery and is easy to game. Auto-detection is therefore deliberately limited to objective mechanical signals; understanding is validated by self-assessment, not metric-chasing.
- **Adoption strategy**: "Build it and they will come" is a known failure mode. Plan to engage the WC3 community (subreddit/official + w3champions Discord) before MVP completion and get a high-level player to validate the core fundamentals nodes for launch credibility.

## Constraints

- **Tech stack**: Centered on the **TanStack ecosystem** — **TanStack Start** (React, full-stack, type-safe) as the core framework, **TanStack Router** for routing, **TanStack Query** for data fetching/caching (incl. the w3champions API). Form/Table from TanStack as needed. — User preference; want a cohesive, modern, type-safe stack.
- **Graph visualization**: Interactive node graph is the centerpiece; React Flow is the likely fit in a React/TanStack world — confirm during research.
- **Design bar**: Must be elegant, intuitive, and beautifully designed — this is a stated product priority, not an afterthought.
- **Extensibility**: Architecture must make adding nodes, races, and sources easy without rework — User priority ("make changes along the way").
- **Architecture discipline (cross-cutting)**: Apply the `/improve-codebase-architecture` + `codebase-design` teachings throughout planning AND implementation — design **deep modules** (simple interfaces hiding substantial implementation), keep the codebase testable and AI-navigable, and reduce coupling. Maintain a **`CONTEXT.md`** capturing the project's ubiquitous domain language (node, mastery, pathway, signal, patch, etc.) and record significant choices as **ADRs in `docs/adr/`**. Every phase plan should reference and extend these. — User priority.
- **Openness**: Free and open source under **GPL-3.0** (strong copyleft) — no paywalls, code/content public. License is GPL-3.0 specifically because the project forks/integrates wc3v (jblanchette/wc3v), which is GPL-3.0; user accepted this.
- **Feasibility risk**: Battle.net OAuth is confirmed; w3champions API rate limits/stability are undocumented (treat as fragile). `.w3g` replay parsing feasibility/maturity for the current patch is the new key unknown — needs a spike. Manual tracking + self-assessment is the fallback if auto-detection underdelivers.
- **Patch versioning**: Patch version is a cross-cutting concern, not a single feature — it touches the content schema, replay parser, mastery thresholds, and progress records. Must be designed in from the data-model phase, not bolted on.
- **Operational cost/limits**: Even as a free OSS project, the web app + database + w3champions API calls have real hosting costs and likely API rate limits — research must surface these so the architecture (caching via TanStack Query, sync cadence) respects them.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Node-graph (free-form) layout, not linear path or skill-tree | User wants non-linear exploration of interconnected concepts | ✓ v1.0 |
| Race-agnostic core first, race branches layered on | Fundamentals apply to every race; biggest shared value first | ✓ v1.0 |
| TanStack Start + TanStack-centered stack | User preference for a cohesive, type-safe React stack | ✓ v1.0 |
| Battle.net / w3champions OAuth for accounts | Ties progress to real ladder identity; enables auto-detection | ✓ Good — validated live in v1.0 |
| Auto-detect mastery from w3champions, manual fallback | Real-performance feedback loop is the differentiator; degrade gracefully | ✓ Good — validated live in v1.0 |
| Visible per-node citations to scientific sources | Trust + the science-backed differentiator made tangible | ✓ v1.0 |
| Curated content for v1, community contribution later | Quality control now; extensibility preserved in data model | ✓ v1.0 |
| No AI product feature in v1 | TanStack AI was a misunderstanding; keep v1 focused | ✓ v1.0 |
| Auto-detect limited to foundational/mechanic nodes; conceptual nodes use manual + self-assessment quizzes | Ladder data is a weak, gameable proxy for conceptual mastery (Gemini critique #1) | ✓ v1.0 |
| Two-tier auto-detection: coarse from w3champions API + fine from `.w3g` replay parsing | w3champions API exposes outcome stats only (research finding); replay parsing is required for build-timing/APM/expansion signals — user accepted the added scope | ✓ v1.0 |
| Patch-version is a system-wide primitive (content, build orders, thresholds, replays, progress) | WC3 meta shifts on balance patches; tagging everything by patch keeps correctness across patches and lets the UI show staleness — user decision | ✓ v1.0 |
| Replay stack = w3gjs (MIT) base + forked wc3v (GPL-3.0) analysis | w3gjs gives ~80% of signals fast; wc3v adds the sophisticated "learn the most" analysis the user wants | ⚠️ Partial — w3gjs base shipped v1.0; wc3v layer (REPLAY-03) descoped to v1.x, blocked by external proprietary data (ADR 012) |
| Project licensed GPL-3.0 | Forking GPL-3.0 wc3v forces copyleft; user accepted — aligned with free OSS public-good goal | ✓ v1.0 |
| Replay ingest = manual upload + auto-pull from w3champions replay endpoint | w3champions DOES serve `.w3g` files (research-verified); both paths maximize coverage | ✓ v1.0 |
| v1 content = race-agnostic core fully fleshed; race branches deferred to v1.x | Avoid the "comprehensive at launch" shipping trap; depth over breadth | ✓ v1.0 |
| Minimum publishable gate: ~25 fully-authored nodes before launch | Gives content authoring a finish line; ~20-30 is where guided pathways become meaningful | ✓ v1.0 |
| Desktop-first, mobile-readable for v1 | Interactive React Flow graph is hard on touch; mobile renders content readably | ✓ v1.0 |
| Adopt deep-module architecture discipline (`improve-codebase-architecture`); maintain `CONTEXT.md` + `docs/adr/` | User wants the codebase testable, AI-navigable, low-coupling; applied across all phases, scaffolded in Phase 1 | ✓ v1.0 |
| Battle.net OAuth for identity; w3champions accessed as a BattleTag-keyed API lookup (not an OAuth provider) | Research finding: w3champions is not an OAuth provider; Battle.net returns BattleTag which keys the w3c API | ✓ v1.0 |
| Content decoupled from graph engine as version-controlled JSON/MDX, with node-level dating | WC3 meta shifts on balance patches; hard-coded content would be a maintenance trap (Gemini critique #2) | ✓ v1.0 |
| Add Guided Pathways / Learning Tracks overlay on the free-form graph | A sprawling graph overwhelms novices ("analysis paralysis"); guided tracks give structure without losing exploration (Gemini critique #3) | ✓ v1.0 |
| Every citation paired with "how to apply in your next game" | Science cited without tight, practical application reads as pseudo-intellectual (Gemini critique #5) | ✓ v1.0 |
| Engage community + get pro validation before MVP completion | Avoid the "zombie project" / build-it-and-they-will-come fallacy (Gemini critique #4) | ✓ v1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-07 after v1.0 MVP milestone*
