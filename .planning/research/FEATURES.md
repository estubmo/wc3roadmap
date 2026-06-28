# Feature Research

**Domain:** WC3 / RTS learning roadmap — skill-progression web app
**Researched:** 2026-06-28
**Confidence:** MEDIUM (all findings from web search, cross-verified with w3champions GitHub repos and Blizzard developer docs)

---

## Research Angles

Three angles covered per the research brief:
1. **Learning/skill-roadmap platforms generally** — what makes them effective and sticky
2. **WC3/RTS improvement specifically** — what learners need, what exists, what is missing
3. **Product-specific feature set** — node graph, auto-detection, OAuth, guided pathways

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing = product feels broken or useless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Interactive node graph (pan/zoom/click) | The entire product premise is a visual graph; any degradation here destroys the concept | HIGH | React Flow handles this; performance degrades on 200+ nodes — must be tested |
| Substantive per-node learning content | Without real content the graph is a skeleton; users leave immediately | HIGH | This is the most labor-intensive part; content pipeline needed, not just UI |
| Node mastery state indicators (untouched / learning / mastered) | Every skill-tree platform (roadmap.sh, beautiful-skill-tree) has visual node states; users expect color-coded status | LOW | Three states minimum; store server-side once auth is in |
| Persistent progress across sessions | Users will not re-mark nodes every visit | MEDIUM | Requires backend + auth, or localStorage fallback pre-auth |
| User accounts | Progress must be tied to an identity | MEDIUM | Battle.net OAuth is the right provider; needs identification-service-style wrapper |
| Guided Pathways / Learning Tracks | Free-form graph alone overwhelms novices; roadmap.sh's "recommended path" feature is universally expected | MEDIUM | Overlay on graph — highlight ordered subset of nodes; multiple tracks (Beginner, Specific Race, etc.) |
| Mobile-readable layout | Players check WC3 resources on phones between sessions; must at minimum render readably | MEDIUM | Interactive graph on mobile is hard; acceptable to be read-only / simplified on mobile |
| Visible citations / sources per node | If science-backed credibility is the core pitch, citations must be visible — not buried in a footer | LOW | Per-node citation list rendered inline; links to abstracts/papers |
| Search / filter nodes by topic or race | Any non-trivial content set (20+ nodes) needs search | MEDIUM | Filter by: race, skill type (macro/micro/mental), difficulty, mastery state |
| Content that is actionable (not purely theoretical) | Research shows learners abandon theory-only resources; Back2Warcraft/coaching resources that survive are practical | LOW | Per-node "How to apply in your next game" section — already in PROJECT.md; must not be optional |

### Differentiators (Competitive Advantage)

Features that set this product apart from everything the WC3 community currently has.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Science citations per node with visible provenance | No WC3 resource (w3champions, Back2Warcraft, Ape Science, wc3v) cites learning science; this is the trust-and-credibility moat | LOW (impl) / HIGH (content) | Peer-reviewed sources must be real and correctly applied; false citations would destroy credibility; deliberate practice / motor learning / sport psych research is the target corpus |
| "Next game application" section per node (foreground, not footnote) | Theory-to-practice bridge is missing everywhere; Ericsson's deliberate practice specifically requires knowing what to practice — this section makes it actionable | LOW (impl) | Must not be a throwaway bullet; should be a concrete in-game drill or focus point |
| Race-agnostic fundamentals as the graph core | All existing WC3 learning resources are race-specific (Ark's NE series, orc guides, UD forums); this unites the community and reduces duplication | HIGH (content) | Requires validated cross-race applicability; need pro community review |
| Auto-detection of mastery from w3champions ladder data | Objective external feedback loop from real games — deliberate practice research shows external feedback is far more reliable than self-assessment; no WC3 learning tool currently does this | HIGH | Scoped and significant limitations — see w3champions API Assessment below |
| Dual progress model (MECHANIC = auto-detected / CONCEPTUAL = self-assessed quiz) | Principled distinction prevents the main failure mode of metric-based mastery systems (Goodhart's Law); aligns with what ladder data can and cannot measure | MEDIUM | Requires node taxonomy baked into data model from day one |
| Self-assessment quizzes on conceptual nodes | Recall-based testing is more effective than re-reading (testing effect / retrieval practice from cognitive science); no WC3 resource does this | MEDIUM | Short quizzes (3–5 questions per node); must be genuinely hard enough to test understanding, not just recall of surface facts |
| Meta-volatile node dating + staleness flags | WC3 balance patches shift build orders and matchup strategies quickly; existing resources go stale silently; visible "last reviewed" dates + patch-context flags build trust | LOW | Data model: each node has `last_reviewed_date`, `patch_context`, `meta_volatile: boolean` |
| Guided Pathways overlay with multiple pre-defined tracks | roadmap.sh has this for tech skills; no WC3 learning tool does; "Beginner Basics," "Human fundamentals," "Undead Macro track" etc. turn the graph into an entry ramp without removing exploration | MEDIUM | Pathways stored as ordered node-ID arrays; UI highlights the path nodes; user can follow or deviate |
| Free-form node graph (not a linear skill tree) | Every skill tree app (beautiful-skill-tree, SkillTreeApp, roadmap.sh) uses hierarchical trees; a free-form graph shows interconnections between concepts (e.g. "resource float" connects to "build order" AND "macro timing" AND "mental focus") that trees cannot represent | HIGH | React Flow needed; requires careful content design so graph doesn't collapse into a wall of chaos |
| Open source + community-extensible content pipeline | WC3 community has deep expertise that can extend content over time; open-source also enables trust (no hidden agendas) | LOW (platform) | v1 is curated; extensibility baked into data model; community contribution layer deferred |

### Anti-Features (Deliberately NOT Build)

Features that seem appealing but cause harm or dilute the core value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| XP / point system for completing nodes | Duolingo-style motivation; "progress feels tangible" | Goodhart's Law: users click through content to earn XP without reading or applying it; XP for consumption ≠ XP for mastery; defeats the entire learning purpose | Node mastery states (untouched/learning/mastered) based on quiz or auto-detection — not points |
| Streaks / daily login gamification | Proven retention driver (Duolingo 3x daily return) | For a learning roadmap, a streak means "you opened the app today" not "you improved today"; WC3 improvement happens in-game, not in the app; streaks create compulsive checking without learning value | W3champions auto-detection: improvement shows up as real ladder progress, not app-visit metrics |
| Global leaderboard ("most nodes mastered") | Social competition is motivating | Measures gaming the system, not WC3 skill; top leaderboard spots go to whoever marks all nodes fastest; actively harmful to the mission of genuine improvement | No leaderboard; progress is personal; community sharing can be aspirational (share your mastered-node map) without rankings |
| AI chat tutor in v1 | AI can answer WC3 questions on demand | Explicitly out of scope (PROJECT.md); adds infrastructure complexity; risks hallucinated WC3 "facts" being presented as authoritative; undermines the curated, science-backed content | Well-researched curated content with real citations; community Discord links (WC3 Gym) for Q&A |
| In-app replay analyzer / parser | wc3v.com and wc3ai.com exist; players want one place for everything | Very high implementation complexity; requires server-side .w3g parsing; duplicates what wc3v/wc3ai already do well; scope creep from core curriculum mission | Deep-link to wc3ai.com / wc3v.com from relevant mechanic nodes; frame them as complementary tools |
| Community wiki editing (v1) | Users want to contribute their knowledge | Quality risk: unvetted edits degrade trust in the science-backed content prop; moderation overhead | v1 curated only; GitHub PRs for community content contributions; wiki-style contribution deferred to v2 |
| Hard prerequisite locking (must complete A to unlock B) | Mimics RPG skill trees; feels structured | WC3 improvement is non-linear; players should be able to read macro theory before fully mastering micro; hard locking frustrates experienced players jumping in mid-graph | Soft prerequisites: edge arrows suggest order; nodes are never locked; guided pathways recommend order without enforcing it |
| Social feed / activity stream | Community visibility; see what others are working on | Adds social graph complexity; feeds encourage shallow engagement (liking, commenting) over deep learning; for v1, zero users means the feed is empty and depressing | Personal progress map shareable as a static image/link |
| Race-specific-first content structure | Players identify with their race; "I'm an Orc player" | Splits the user base; race-specific nodes can't benefit cross-race players; delays the fundamentals content that has the highest leverage for all players | Race-agnostic core is the graph center; race branches radiate outward; navigation can filter to your race |

---

## w3champions API Assessment for Auto-Detection

**This is the most critical feasibility question in the feature set.**

### What the w3champions API exposes (CONFIRMED via open-source GitHub):

The backend is at `website-backend.w3champions.com/api/` (open-source, no auth required to read public player stats).

| Data Available | Endpoint Pattern | Usable For Auto-Detection? |
|---------------|-----------------|--------------------------|
| Player MMR per race per season | `/players/{battletag}/game-mode-stats` | YES — tier signal (Gold/Plat/Diamond context for node difficulty calibration) |
| Win/loss record per race per season | Same endpoint | YES — playing consistently → exposure; win-rate trend → improvement |
| Match history (result, race played, heroes, duration) | `/players/{battletag}/matches` | PARTIAL — confirms race being played; game count; opponent race (matchup-specific W/L) |
| Season rankings / global rank | `/rankings` | LOW VALUE — relative rank, not absolute mastery of specific skills |
| Winrates per race and map (global stats) | `/OverallStatistics/winrates-per-race-and-map` | NO — global, not player-specific |

### What w3champions does NOT expose:

| Data NOT Available | Why Matters | Workaround |
|-------------------|-------------|------------|
| Build order timing / execution steps | PROJECT.md example "execute under 4:00" — NOT feasible via w3champions API | Requires .w3g replay parsing (wc3ai, w3g library) — out of scope v1 |
| APM / eAPM | Key mechanical skill signal | Requires replay parsing |
| Hotkey usage patterns | Efficiency proxy | Requires replay parsing |
| Specific unit actions / micro events | Can't detect "did you use Shockwave correctly" | Impossible without deep replay parsing + WC3 game event knowledge |
| Replay file download | The .w3g file itself | w3champions stores replay outcomes but does not serve replay files |

### What auto-detection CAN realistically do in v1:

**Coarse, but honest, signals:**

| Auto-Detectable Proxy | Mechanic Nodes It Could Mark | Confidence |
|----------------------|------------------------------|-----------|
| `games_played[race] >= 20` in current season | "Race identity established" / "Game volume" nodes | MEDIUM — it's a proxy for exposure, not mastery |
| `mmr[race] >= X` threshold | Broad tier-based nodes ("Competitive ladder ready") | LOW-MEDIUM — MMR reflects relative ELO, not specific skill mastery |
| `win_rate[race][vs_matchup] improving over 30+ games` | Matchup-specific learning progress | LOW — noisy; opponent quality, patches, luck all affect this |
| `total_games_this_season >= 50` | "Active practice" / "Volume practice" nodes | MEDIUM — games volume is weakly but genuinely correlated with improvement |

**CRITICAL IMPLICATION:** The PROJECT.md example "build order executed under 4:00" is NOT achievable from w3champions data alone. Auto-detection in v1 must be re-scoped to coarse ladder signals. Precise mechanical auto-detection (timing, execution accuracy) requires a separate replay-parsing integration that is v2+ scope. This does not kill the differentiator — it constrains it. Honest scoping is better than a broken promise.

### Battle.net OAuth feasibility:

- **CONFIRMED feasible.** Battle.net uses standard OAuth 2.0 authorization code flow.
- No WC3-specific OAuth scope exists in Blizzard's API (WC3 is not a supported profile game).
- The auth flow returns: `account_id` + `BattleTag` (no additional scopes needed).
- W3champions itself uses this exact pattern: Battle.net OAuth → BattleTag → look up in w3champions own database.
- Auth.js has a `battlenet` provider; implementation is straightforward.
- Rate limits on w3champions API are undocumented but the backend is open-source and caching-heavy; TanStack Query's stale-while-revalidate + infrequent polling is the right approach.

---

## Feature Dependencies

```
[Node Content / Data Model]
    └──required by──> [Interactive Node Graph]
    └──required by──> [Guided Pathways]
    └──required by──> [Node Mastery States]
    └──required by──> [Self-Assessment Quizzes]
    └──required by──> [Meta-Volatile Dating]

[User Accounts (Battle.net OAuth)]
    └──required by──> [Progress Persistence (server-side)]
    └──required by──> [Auto-Detection via w3champions API]

[Battle.net OAuth → BattleTag]
    └──enables──> [w3champions API lookup by BattleTag]
                    └──enables──> [Mechanic Node Auto-Detection]

[Node Taxonomy (MECHANIC vs CONCEPTUAL)]
    └──required by──> [Auto-Detection scoping]
    └──required by──> [Self-Assessment Quiz routing]

[Guided Pathways data]
    └──required by──> [Pathway UI overlay on graph]

[Node Mastery States]
    └──drives──> [Graph visual state (untouched/learning/mastered colors)]
    └──drives──> [Pathway completion progress bar]
```

### Dependency Notes

- **Node content is the hard dependency for everything.** An empty graph with great auth integration has zero value. Content pipeline must be planned before any graph UI work — data shapes must be finalized before UI is built around them.
- **Battle.net OAuth requires w3champions API for WC3 data.** Blizzard's own API has no WC3 stats. The two are chained.
- **Node taxonomy (MECHANIC/CONCEPTUAL) must be baked into content data model on day one.** Retrofitting this later means re-classifying all content. Get the taxonomy right in the schema before any content is authored.
- **Auto-detection enhances but does not block progress tracking.** Self-assessment (manual check-off + quiz) is the fallback for all nodes if w3champions integration is unavailable or the user has not linked their account.
- **Guided Pathways require enough nodes to be meaningful.** At least 20–30 nodes with real content before pathways make sense; pathways should be designed after the node graph is substantially populated.

---

## MVP Definition

### Launch With (v1)

Minimum viable for the product to have actual value and validate the core concept.

- [ ] **Interactive node graph** with pan/zoom/click — without this, nothing else matters
- [ ] **Substantive per-node content** for all nodes: science citation + practical application section — this IS the product
- [ ] **Node mastery states** (untouched / learning / mastered) with visual state in graph
- [ ] **Battle.net OAuth login** — tied to real player identity
- [ ] **Progress persistence** — server-side, tied to account; localStorage fallback pre-login
- [ ] **At least one Guided Pathway** ("Beginner Fundamentals") — necessary to onboard novices
- [ ] **Meta-volatile dating** — node-level `last_reviewed` + `patch_context` flags baked into data model
- [ ] **Node taxonomy** (MECHANIC vs CONCEPTUAL) — required before any progress logic is written
- [ ] **Self-assessment quizzes** for CONCEPTUAL nodes — recall-based, 3–5 questions
- [ ] **w3champions API integration** (coarse auto-detection for MECHANIC nodes) — MMR, games volume, race W/L — scoped honestly to what the API actually provides
- [ ] **Race-agnostic fundamentals** as core nodes, with clear extensibility for race branches
- [ ] **Visible citations** inline per node linking to real sources
- [ ] **"Next game application" section** per node — non-optional
- [ ] **Search / filter** by race / skill type / mastery state

### Add After Validation (v1.x)

Add once core is working and users are engaging.

- [ ] **Multiple Guided Pathways** (race-specific tracks, advanced macro track, etc.) — trigger: first pathway used and users ask for more
- [ ] **Race-specific branch nodes** (Human/Orc/Undead/Night Elf specific content) — trigger: community feedback identifies race-specific gaps
- [ ] **Community content contributions** (GitHub PR pipeline made accessible via in-app UI) — trigger: community proves demand
- [ ] **Shareable progress map** (static image or shareable URL of your mastered-node state) — low complexity, high community value
- [ ] **Finer matchup-specific auto-detection** (if w3champions API expands or replay parsing becomes viable)

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] **Replay parsing integration** (link to wc3ai/wc3v or build native .w3g parsing) — enables precise mechanical auto-detection; HIGH complexity
- [ ] **AI-assisted content suggestions / personalized learning** — see PROJECT.md rationale for deferring
- [ ] **Mobile-native interactive graph** — desktop-first is correct for v1; full mobile interactivity is a significant UX challenge with React Flow
- [ ] **API public exposure** (let other WC3 tools consume this app's mastery data) — if community builds on top of this

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Interactive node graph | HIGH | HIGH | P1 |
| Per-node learning content (all nodes populated) | HIGH | HIGH (content) | P1 |
| Visible citations + practical application section | HIGH | LOW (impl) / HIGH (content) | P1 |
| Node mastery states (visual in graph) | HIGH | LOW | P1 |
| Battle.net OAuth + account system | HIGH | MEDIUM | P1 |
| Progress persistence (server-side) | HIGH | MEDIUM | P1 |
| Node taxonomy (MECHANIC vs CONCEPTUAL) | HIGH | LOW | P1 — must precede all content |
| At least one Guided Pathway | HIGH | MEDIUM | P1 |
| Self-assessment quizzes (CONCEPTUAL nodes) | HIGH | MEDIUM | P1 |
| w3champions API auto-detection (coarse) | MEDIUM | MEDIUM | P1 — core differentiator, even scoped |
| Meta-volatile dating / staleness flags | MEDIUM | LOW | P1 — data model only |
| Search / filter | MEDIUM | MEDIUM | P1 |
| Race-specific branch nodes | MEDIUM | HIGH (content) | P2 |
| Multiple Guided Pathways | MEDIUM | LOW (given first pathway done) | P2 |
| Shareable progress map | LOW | LOW | P2 |
| Mobile interactive graph | LOW | HIGH | P3 |
| Replay parsing integration | MEDIUM | VERY HIGH | P3 |
| Community contribution UI | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | roadmap.sh | wc3v.com (replay analyze) | WC3 Gym Discord | w3champions site | This Product |
|---------|------------|--------------------------|-----------------|------------------|--------------|
| Structured learning path | YES (linear roadmap) | NO | NO (Q&A only) | NO (stats only) | YES (node graph + pathways) |
| Science-backed citations | NO | NO | NO | NO | YES (differentiator) |
| "How to apply" practical section | NO | PARTIAL (letter grades) | Partial (advice) | NO | YES (required per node) |
| Progress tracking | YES (check-off) | NO | NO | NO (ladder is not learning tracking) | YES (mastery states + auto-detect) |
| User accounts | YES | NO | Discord login | YES (Battle.net) | YES (Battle.net OAuth) |
| Auto-detection from game data | NO | Replay upload only | NO | Stats visible, not linked to learning | YES (w3champions API integration) |
| Quizzes / self-assessment | NO | NO | NO | NO | YES (CONCEPTUAL nodes) |
| Cross-race fundamentals | NO (tech, not WC3) | NO (per-game analysis) | PARTIAL | NO | YES (core of product) |
| Race-specific content | N/A | YES (matchup-graded) | YES | Partial (winrates) | YES (branch nodes, v1.x) |
| Visual node graph | YES (roadmap style) | NO | NO | NO | YES (free-form, richer) |
| Meta-volatile dating | NO | N/A | N/A | NO | YES (patch context per node) |
| Free & open source | YES | Unknown | YES (Discord) | YES | YES |

---

## Sources

- [roadmap.sh](https://roadmap.sh/) — feature inspection and premium tier analysis
- [roadmap.sh DEV community review](https://dev.to/yspermana/roadmapsh-learning-guide-platform-for-continue-to-grow-5fod) — user perspective on what makes it sticky
- [beautiful-skill-tree v1 introduction](https://thelinuxcode.com/introducing-beautiful-skill-tree-v1-an-interactive-way-to-visualize-user-progression/) — skill tree UX patterns
- [Ericsson deliberate practice — PMC review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6731745/) — deliberate practice research for feature design rationale
- [Duolingo gamification case study — Trophy](https://trophy.so/blog/duolingo-gamification-case-study) — what works and what creates problematic behavior
- [When gamification spoils learning — arXiv](https://arxiv.org/pdf/2203.16175) — research on gamification misuse
- [w3champions website-backend GitHub](https://github.com/w3champions/website-backend) — open-source backend revealing available API data
- [w3champions identification-service GitHub](https://github.com/w3champions/identification-service) — OAuth via Battle.net, BattleTag as player identifier
- [Battle.net OAuth documentation](https://community.developer.battle.net/documentation/guides/using-oauth) — scopes, authorization code flow, what data is accessible
- [Auth.js BattleNet provider](https://authjs.dev/getting-started/providers/battlenet) — implementation reference
- [WC3AI replay analyzer](https://wc3ai.com/) — what replay data actually contains (APM, eAPM, hotkeys, hero builds)
- [WC3 Gym new/returning players guide](https://warcraft-gym.com/new-returning-players-guide-to-warcraft-iii/) — WC3 learning landscape from practitioner perspective
- [warcraft3.info — beyond APM stats article](https://warcraft3.info/articles/394/warcraft-3-beyond-apm-a-brief-exploration-of-in-game-statistics) — what game statistics are actually tracked
- [Blizzard forums: where to find build orders](https://us.forums.blizzard.com/en/warcraft3/t/where-can-i-find-competitive-build-orders/18290) — community learning patterns
- [ProductTeacher: table stakes vs differentiators](https://www.productteacher.com/articles/sequencing-table-stakes-and-differentiators) — framing reference

---

*Feature research for: WC3 Learning Roadmap web app*
*Researched: 2026-06-28*
