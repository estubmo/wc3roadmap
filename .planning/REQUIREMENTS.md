# Requirements: WC3 Learning Roadmap

**Defined:** 2026-06-28
**Core Value:** The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.
v1 content scope = **race-agnostic fundamentals core, fully fleshed** (race-specific branches deferred to v2). Minimum publishable gate: **~25 fully-authored nodes**.

### Content Data Model

- [x] **DATA-01**: Node taxonomy distinguishes MECHANIC vs CONCEPTUAL nodes, baked into the schema from day one
- [x] **DATA-02**: Node content schema is Zod-validated and decoupled from the graph/UI engine (graph receives only display-essential data; full content loads lazily per node)
- [x] **DATA-03**: Each node carries `patch_context`, `last_reviewed` date, and a `meta_volatile` flag
- [x] **DATA-04**: Patch version is a system-wide primitive — content, build orders, mastery thresholds, parsed replays, and progress records are all tagged with the WC3 patch they apply to
- [x] **DATA-05**: Graph edges are soft prerequisites (suggested order via arrows); nodes are never hard-locked
- [x] **DATA-06**: Node content stored as version-controlled MDX/JSON files in the repo (content-collections pipeline), enabling easy updates and future community PRs
- [x] **DATA-07**: Content schema validated in CI so malformed nodes fail the build

### Content

- [x] **CONT-01**: Each relevant node has visible inline citations to real peer-reviewed / scientific sources (motor learning, deliberate practice, sport/competitive psychology) linking to the source
- [x] **CONT-02**: Every node has a required, concrete "How to apply this in your next game" section (practical foreground, theory background)
- [x] **CONT-03**: Node content distills wisdom from recognized WC3 players/guides/content-creators
- [ ] **CONT-04**: Race-agnostic fundamentals core is authored to the minimum publishable gate (~25 nodes) before launch
- [x] **CONT-05**: Citations are real and correctly applied (a review pass guards against pseudo-intellectual/misapplied science)

### Graph UI

- [x] **GRAPH-01**: Interactive node graph with pan / zoom / click (React Flow / @xyflow), non-linear exploration
- [x] **GRAPH-02**: Node mastery states shown visually in the graph (untouched / learning / mastered)
- [x] **GRAPH-03**: Clicking a node opens a detail panel with its content, citations, and "next game" section (content lazy-loaded)
- [x] **GRAPH-04**: Search / filter nodes by race, skill type (macro/micro/mental), difficulty, and mastery state
- [x] **GRAPH-05**: Desktop-first interactive graph; mobile renders node content readably (simplified / read-only graph acceptable)
- [x] **GRAPH-06**: Graph performs smoothly at the v1 node count (memoization conventions established from the first prototype)

### Guided Pathways

- [ ] **PATH-01**: Guided Pathways overlay highlights an ordered subset of nodes on the graph
- [ ] **PATH-02**: At least one "Beginner Fundamentals" pathway ships at launch
- [ ] **PATH-03**: The default landing view is a guided pathway, not the full sprawling graph (novice anti-overwhelm)
- [x] **PATH-04**: Pathway shows completion progress as the user masters its nodes

### Authentication

- [x] **AUTH-01**: User can sign in with Battle.net OAuth (returns BattleTag identity)
- [x] **AUTH-02**: Session persists across browser refresh
- [x] **AUTH-03**: Server functions enforce session-based authorization on all user-data access (not just input-shape validation)
- [x] **AUTH-04**: A stable account identifier is used as the progress key (survives BattleTag display changes)

### Progress Tracking

- [x] **PROG-01**: Per-node mastery state is tracked per user
- [x] **PROG-02**: Progress persists server-side, tied to the account
- [x] **PROG-03**: Pre-login progress is stored in localStorage and merges on sign-in
- [x] **PROG-04**: User can manually mark any node's mastery state
- [x] **PROG-05**: No XP, streaks, or leaderboards (deliberate — avoids gaming the metric)

### Self-Assessment Quizzes

- [x] **QUIZ-01**: CONCEPTUAL nodes have a short self-assessment quiz (3–5 recall-based questions)
- [x] **QUIZ-02**: Passing a node's quiz drives that conceptual node toward "mastered"
- [x] **QUIZ-03**: Quizzes test understanding, not surface recall

### w3champions Auto-Detection (Coarse)

- [x] **AUTO-01**: User links their w3champions data via BattleTag from Battle.net login
- [x] **AUTO-02**: Coarse signals from the w3champions API (games-played volume, MMR tier, matchup W/L trends) auto-advance eligible MECHANIC nodes
- [x] **AUTO-03**: Auto-detection only ever advances MECHANIC nodes — never CONCEPTUAL ones
- [x] **AUTO-04**: w3champions API calls are cached and rate-limit-respecting (TanStack Query stale-while-revalidate)
- [x] **AUTO-05**: Auto-detection enhances but never blocks progress — manual/quiz tracking works without a linked account

### Replay Parsing (Fine Mechanical Signals)

- [x] **REPLAY-01**: Parse `.w3g` replays with w3gjs to extract mechanical signals (build-order timings, APM/eAPM, control-group/hotkey use, hero/item build timing, unit/upgrade timeline)
- [x] **REPLAY-02**: A semantic-signal layer turns w3gjs output into meaningful WC3 events mapped to specific mechanic nodes
- [~] **REPLAY-03**: Integrate a fork of wc3v (GPL-3.0) for advanced analysis (supply/economy curves, battle detection, compare-to-pro) — **DESCOPED to Phase 8.x** (08-13): wc3v vendored + w3gjs internals reconciled, but full resim is blocked by proprietary/gitignored data (UnitBalance cost tables + per-map pathing). See ADR 012.
- [x] **REPLAY-04**: User can manually upload a `.w3g` replay for analysis
- [x] **REPLAY-05**: System can auto-pull replays from the w3champions replay endpoint (`/api/replays/{gameId}`)
- [x] **REPLAY-06**: Replay-derived signals auto-mark MECHANIC node mastery against patch-aware thresholds (e.g. "build order executed under target time")
- [x] **REPLAY-07**: Replay analysis returns actionable feedback ("you did X at time Y; target is Z")
- [x] **REPLAY-08**: Replay parsing is patch-version aware (object-ID maps and thresholds resolve by patch)

### Project / Open Source

- [x] **OSS-01**: Project is released under GPL-3.0 (required by the wc3v fork) with public code and content
- [x] **OSS-02**: Data model and content pipeline are extensible (add nodes, races, sources, pathways without rework)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Race-Specific Content

- **RACE-01**: Human-specific branch nodes
- **RACE-02**: Orc-specific branch nodes
- **RACE-03**: Undead-specific branch nodes
- **RACE-04**: Night Elf-specific branch nodes
- **RACE-05**: Race-specific guided pathways (e.g. "Undead Macro track")

### Community & Sharing

- **COMM-01**: In-app community content contribution UI (wiki-style, moderated) on top of the GitHub PR pipeline
- **COMM-02**: Shareable progress map (static image / URL of mastered nodes)
- **COMM-03**: Multiple advanced guided pathways beyond the beginner track

### Advanced Detection

- **ADET-01**: Finer matchup-specific auto-detection as signals/thresholds mature
- **ADET-02**: Replay-based personalized weakness detection and node recommendations

### Reach

- **REACH-01**: Mobile-native interactive graph
- **REACH-02**: Public API exposing mastery data for other WC3 tools

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| XP / points for completing nodes | Goodhart's Law — rewards consumption, not mastery; defeats the learning purpose |
| Streaks / daily-login gamification | Measures app visits, not improvement; WC3 progress happens in-game |
| Global "nodes mastered" leaderboard | Rewards gaming the system, not real WC3 skill; harmful to the mission |
| Hard prerequisite locking | WC3 learning is non-linear; locking frustrates players jumping in mid-graph (use soft edges + pathways) |
| In-app AI chat tutor | TanStack AI was a misunderstanding; risks hallucinated "facts" undermining curated, cited content |
| Social feed / activity stream | Adds social-graph complexity; encourages shallow engagement over deep learning |
| Community wiki editing (in v1) | Quality risk to science-backed content; v1 is curated, contribution deferred to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| OSS-01 | Phase 1 | Complete |
| OSS-02 | Phase 1 | Complete |
| GRAPH-01 | Phase 2 | Complete |
| GRAPH-02 | Phase 2 | Complete |
| GRAPH-05 | Phase 2 | Complete |
| GRAPH-06 | Phase 2 | Complete |
| CONT-01 | Phase 3 | Complete |
| CONT-02 | Phase 3 | Complete |
| CONT-03 | Phase 3 | Complete |
| GRAPH-03 | Phase 3 | Complete |
| GRAPH-04 | Phase 3 | Complete |
| AUTH-01 | Phase 4 | Complete |
| AUTH-02 | Phase 4 | Complete |
| AUTH-03 | Phase 4 | Complete |
| AUTH-04 | Phase 4 | Complete |
| PROG-01 | Phase 5 | Complete |
| PROG-02 | Phase 5 | Complete |
| PROG-03 | Phase 5 | Complete |
| PROG-04 | Phase 5 | Complete |
| PROG-05 | Phase 5 | Complete |
| QUIZ-01 | Phase 6 | Complete |
| QUIZ-02 | Phase 6 | Complete |
| QUIZ-03 | Phase 6 | Complete |
| AUTO-01 | Phase 7 | Complete |
| AUTO-02 | Phase 7 | Complete |
| AUTO-03 | Phase 7 | Complete |
| AUTO-04 | Phase 7 | Complete |
| AUTO-05 | Phase 7 | Complete |
| REPLAY-01 | Phase 8 | Complete |
| REPLAY-02 | Phase 8 | Complete |
| REPLAY-03 | Phase 8 | Descoped → 8.x |
| REPLAY-04 | Phase 8 | Complete |
| REPLAY-05 | Phase 8 | Complete |
| REPLAY-06 | Phase 8 | Complete |
| REPLAY-07 | Phase 8 | Complete |
| REPLAY-08 | Phase 8 | Complete |
| PATH-01 | Phase 9 | Pending |
| PATH-02 | Phase 9 | Pending |
| PATH-03 | Phase 9 | Pending |
| PATH-04 | Phase 9 | Complete |
| CONT-04 | Phase 9 | Pending |
| CONT-05 | Phase 9 | Complete |

**Coverage:**

- v1 requirements: 49 total (note: original count of 46 was understated; actual count from defined requirements is 49)
- Mapped to phases: 49 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after roadmap creation*
