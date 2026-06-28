# Pitfalls Research

**Domain:** WC3/RTS learning roadmap — interactive node-graph web app with science-backed content, OAuth identity, and external ladder API integration
**Researched:** 2026-06-28
**Confidence:** MEDIUM (web research, cross-checked across multiple sources; no WC3-specific academic literature exists)

---

## Critical Pitfalls

### Pitfall 1: W3Champions Has No Public Third-Party API

**What goes wrong:**
The entire auto-mastery detection feature — auto-detecting skill from ladder data — is built on an assumption that w3champions exposes a usable API to third-party apps. The w3champions identification service is designed as the auth backend for their own website and launcher, not as an OAuth provider for external applications. No official documentation for a third-party integration path exists.

**Why it happens:**
W3Champions is open-source and community-run, so developers assume "open source = open API." The GitHub repos are public but the API surface changes without versioning guarantees. The OAuth flow authenticates users through Blizzard OAuth and then maps to a w3champions identity — an external app cannot simply piggyback this without coordination with the w3champions team.

**How to avoid:**
Before writing a single line of integration code, contact the w3champions Discord/team directly and confirm:
- Whether a public API exists for ladder statistics (player MMR, match history, race data)
- Whether third-party OAuth via w3champions identity is permitted/supported
- Rate limits and ToS for any allowed API access

wc3stats.com has some public API endpoints (https://wc3stats.com/docs/api) and is worth evaluating as an alternative or supplement. Build the progress tracking UI with a manual-fallback-first architecture so the app ships regardless of API availability.

**Warning signs:**
- No official API documentation page on w3champions.com or GitHub
- Identification service README focuses on internal certificate generation, not external consumers
- Any answer like "just reverse-engineer the network requests" = unsupported usage

**Phase to address:**
API feasibility must be verified as a dedicated spike before any integration work begins — not during the integration phase itself. If the API is unavailable, auto-mastery detection is out of scope for v1.

---

### Pitfall 2: Server Functions Are Public HTTP Endpoints (TanStack Start Security Boundary Confusion)

**What goes wrong:**
Developers treat `createServerFn` like a private internal function protected by the route that renders the UI triggering it. In reality, every server function is a POST-able HTTP RPC endpoint callable by anyone with a browser, Postman, or curl — completely independent of which route rendered the call site. A user could bypass the UI entirely and call `getPlayerProgress({ userId: "someone_elses_id" })` directly.

**Why it happens:**
The mental model of "this function only runs in my component" carries over from client-side React. TanStack Start's `use server` annotation makes the security boundary invisible at the call site.

**How to avoid:**
Every server function that reads or mutates user data must:
1. Extract the authenticated session from middleware (not from client-supplied parameters)
2. Authorize that the session principal owns/can access the requested resource
3. Use Zod (or similar) for input shape — but treat this as sanitization, not authorization

The pattern is: `const user = await getAuthenticatedUser(ctx)` at the top of every sensitive server function, before touching any input parameter. The TanStack Start docs explicitly note that route guards do not protect server functions.

**Warning signs:**
- Server functions accepting `userId` or `nodeId` as parameters without validating the caller owns that resource
- No middleware enforcing authentication on data-mutating functions
- Integration tests that only test the happy path from the UI, not direct API calls

**Phase to address:**
Authentication and authorization phase (whenever OAuth and user accounts are built). Establish the middleware pattern on the first server function written; do not retrofit later.

---

### Pitfall 3: React Flow Memoization Failures Causing Render Loops and Jank

**What goes wrong:**
A learning roadmap with 50-150+ nodes and edges is firmly in the territory where React Flow's default rendering behavior becomes a problem. Two failure modes are common: (a) infinite re-render loops caused by event handlers or node arrays defined inline in the parent component, and (b) visible frame drops caused by custom node components re-rendering on every pan, zoom, or drag event.

**Why it happens:**
React Flow re-renders custom node components aggressively because its internal store emits updates during every viewport interaction. Without memoization, each node component re-renders tens of times per second during user interaction. Defining `onNodesChange` or `onEdgesChange` as inline arrow functions creates a new reference every render, which React Flow treats as a changed prop, triggering another render cycle.

**How to avoid:**
- All custom node components: wrap with `React.memo` or define outside the parent component entirely
- All event handlers (`onNodesChange`, `onEdgesChange`, `onConnect`): use `useCallback` with stable dependency arrays
- Enable `onlyRenderVisibleElements` prop from the start — all nodes render off-screen by default, even if invisible
- Never access the `nodes` or `edges` arrays from the React Flow store directly in child components — subscribe to only what you need
- Layout computation (dagre, elk, or custom): compute once on data load, memoize with `useMemo`, do not recompute on every render
- Defer complex CSS effects (box-shadow, gradients, animations) to the detail panel, not the node thumbnail

**Warning signs:**
- React DevTools Profiler showing node components rendering 30-60 times during a pan gesture
- Console warnings about "Maximum update depth exceeded"
- Noticeable jank or dropped frames when moving a node on a graph with 80+ nodes

**Phase to address:**
Graph UI phase (initial build). Establish memoization conventions in the first prototype. Performance debt in graph libraries compounds — it is far harder to retrofit than to start with.

---

### Pitfall 4: Ladder Metrics as Mastery Proxy — Expanded (User Critique #1)

**What goes wrong:**
MMR and APM are aggregate performance outcomes, not skill-component measurements. A player can gain MMR by playing exclusively mirror matchups where their weakness is irrelevant. APM can be inflated by spam-clicking on minerals. If the app detects "build order node mastered" based on a winning streak, the player never internalized why the build order works — they just got lucky against weaker opponents. The metric rewards gaming the metric, not learning the concept.

**Why it happens:**
Quantified signals feel objective and scientific. MMR/APM are the only machine-readable data points available from external APIs. There is a natural desire to automate what should require human judgment.

**How to avoid:**
The mitigation is already partially encoded in PROJECT.md: limit auto-detection strictly to objective mechanical signals (e.g., "build order completed in under X minutes" where the timing is a precise mechanical threshold, not a win/loss signal). For every other node, use manual check-off combined with short self-assessment quizzes with objective criteria. Crucially:

- Define mastery thresholds for mechanical nodes *before* integration — not during — based on expert WC3 player input
- Never derive mastery from win/loss outcomes, only from verifiable in-game timing/action data
- Make the quiz criteria transparent to the user ("You mastered this when you can explain X, not when you won Y games")
- Periodically audit whether the detected signals correlate with actual improvement

**Warning signs:**
- A mechanical node's mastery threshold is defined as "win 5 games using this build"
- No expert review of mastery thresholds before they go live
- Users reporting they feel "stuck" at a node they already understand but can't unlock

**Phase to address:**
Content architecture phase (node data model design) and the w3champions integration phase. Mastery signal definitions must be settled before the data model is locked.

---

### Pitfall 5: "Comprehensive at Launch" Is a Permanent Shipping Blocker

**What goes wrong:**
The requirement for comprehensive content at launch means every incomplete node is a blocker. WC3 has four races, dozens of matchups, hundreds of distinct concepts across macro, micro, mechanics, psychology, and strategy. Attempting to launch with all nodes fully researched and written guarantees the project ships years late or never.

**Why it happens:**
The project's core value proposition is high-quality, science-backed content — partially-filled nodes feel like a violation of that promise. But perfection paralysis and the pursuit of completeness at launch are a well-documented trap in solo OSS projects, where scope creep feels like craftsmanship.

**How to avoid:**
Define a Minimum Publishable Content set: race-agnostic fundamentals only (macro basics, worker production, scouting, resource management, decision loops). These ~10-15 nodes fully researched and written provide genuine value and validate the format. Race-specific branches can launch as "coming soon" stubs with estimated timelines. The data model and architecture are already designed for extensibility — use that architecture to launch thin and grow.

Explicitly define "launch" as: the graph is navigable, the core pathway works, and at least one race-agnostic pathway has full content. Not "every node has content."

**Warning signs:**
- Planning documents show more than 40 nodes with full content as a launch requirement
- Race-specific branches being written before race-agnostic fundamentals are complete
- No documented definition of "launch-ready content threshold"

**Phase to address:**
Content architecture phase and MVP scoping. Must define the minimum content set as a hard constraint before content authoring begins.

---

### Pitfall 6: Zombie Project — Build-It-and-They-Will-Come Adoption Failure (User Critique #4 Expanded)

**What goes wrong:**
A beautifully built WC3 learning tool ships with no existing community relationship, no early adopters seeded, and no launch strategy. The WC3 community is small, concentrated on specific Discord servers and subreddits, and very protective of its time and attention. Without a credible community voice endorsing the tool at launch, it gets scrolled past and forgotten. The project becomes unmaintained within six months because the silence is demoralizing.

**Why it happens:**
Technical teams tend to optimize for the product and treat distribution as something to figure out post-launch. Gaming communities in particular are skeptical of outsider tools — they need social proof from recognized players to trust a new resource.

**How to avoid:**
Community embedding must happen in parallel with development, not after ship:
1. Identify 2-3 high-reputation WC3 players or content creators (known from WC3 community context: Grubby, TasteAlert, Lucifron-level recognition) and pitch them on reviewing the fundamentals nodes before launch
2. Get one recognized player to validate or co-author one race-agnostic pathway — their name on the tool is a credibility anchor
3. Post a "building in public" thread in r/WC3 and the w3champions Discord *while building*, not just at launch
4. Time the public launch to a WC3 community moment: a major patch, a tournament, a new season start
5. Establish a feedback mechanism from day one (GitHub Discussions or a Discord server) so early users can report issues and feel heard

**Warning signs:**
- No community communication planned before MVP completion
- No endorsement or review from any recognized WC3 player at launch
- Launch announcement is a single Reddit post with no prior relationship to the audience

**Phase to address:**
Begins in planning/MVP phase (relationship-building is a long-lead activity) and culminates in a dedicated pre-launch community phase before the public announcement.

---

## Moderate Pitfalls

### Pitfall 7: Content Staleness Without an Editorial Process (User Critique #2 Expanded)

**What goes wrong:**
The data/content architecture is correctly decoupled (JSON/MDX files, node-level dating) — but architecture is a necessary condition, not a sufficient one. After a balance patch drops, who checks which nodes are stale? Without an explicit editorial process, staleness accumulates silently. Users encounter outdated build-order timings, incorrect meta assessments, or references to nerfed unit stats — and trust collapses.

**Why it happens:**
The technical solution (decoupled data, flagged nodes) gives a false sense that the content maintenance problem is solved. It's not. It reduces the cost of updating but does not create the habit or workflow for doing so.

**How to avoid:**
- Every meta-volatile node must include a `last_verified` date and the patch version it was written against
- Create a lightweight patch-tracking workflow: when a balance patch drops, a GitHub issue is auto-opened (or manually opened within 24 hours) listing all affected node slugs
- Define a "staleness SLA": any node with `last_verified` more than 2 patch cycles old is automatically flagged in the UI as "may be outdated"
- Document who is responsible for reviewing flagged nodes — if it's just the solo maintainer, scope the volatile content accordingly

**Warning signs:**
- Nodes lack `last_verified` or patch-version metadata
- No process for translating patch notes into a review checklist
- Race-specific build orders written more than 6 months ago with no review flag

**Phase to address:**
Content data model phase (metadata fields) and content authoring phase (editorial process documentation).

---

### Pitfall 8: Graph Overwhelm — No Guided Entry Point for Novices (User Critique #3 Expanded)

**What goes wrong:**
A new user lands on the app and sees a web of 80+ interconnected nodes with no clear starting point. Even with a guided pathway overlay, if the default view is the full graph, cognitive load immediately exceeds the user's ability to orient. Research on knowledge graph UX confirms that showing the full graph first is consistently the wrong choice — users need a filtered, focused entry experience.

**Why it happens:**
The graph feels impressive when you know it and built it. The builder sees a coherent architecture; the novice sees visual noise. The full graph is also the natural default state of any graph library.

**How to avoid:**
- Default view: do not show the full graph. Show only the selected guided pathway (e.g., "Beginner Basics") with 8-12 nodes visible
- Provide "explore the full map" as an explicit secondary action, not the first-load experience
- Use progressive disclosure: clicking a node reveals its neighbors; the full graph expands from user action
- Search and filter must work at any graph size — this is not optional UX, it's a navigation requirement for 30+ nodes
- On first visit, start users on the pathway selector, not the graph canvas

**Warning signs:**
- First-load renders the entire node graph by default
- No pathway is selected by default on a new user's first session
- Graph loads with zoom-to-fit showing all nodes at once

**Phase to address:**
Graph UI phase (default view and onboarding flow) and pathway/guided tracks feature.

---

### Pitfall 9: Science Citation as Credibility Theater (User Critique #5 Expanded)

**What goes wrong:**
A node about "macro timing" cites Ericsson's deliberate practice paper. The citation is technically accurate (deliberate practice is real research) but the application is lazy: the node doesn't explain how deliberate practice principles apply to a specific WC3 skill, what the practice drill is, how to get feedback, or what mastery looks like. The citation becomes decorative. Readers — especially skeptical competitive players — immediately identify this as pseudo-intellectual padding and lose trust in the entire site.

**Why it happens:**
Citing a respected paper is easy. Translating that paper's mechanism into a specific, actionable WC3 drill that embodies the principle is hard and requires domain expertise to validate.

**How to avoid:**
Every citation must be accompanied by explicit reasoning:
1. What specific claim does this citation support?
2. What is the analogous mechanism in WC3 practice?
3. What is the concrete drill or exercise that operationalizes it for this specific concept?

Avoid citing:
- Discredited neuromyths (learning styles/VAK, left-right brain dominance, 10% brain usage)
- Studies on populations radically different from WC3 players (physical sport motor learning research applied directly to RTS hand-eye coordination)
- Esports research that studied League of Legends, CS:GO, or other genres without reasoning about WC3 specificity

A useful test: if a skeptical WC3 pro read the citation section and couldn't find a specific WC3 drill that embodied the principle, the citation is decorative, not functional.

**Warning signs:**
- Node citations list papers without explaining the specific claim each paper supports
- Motor learning papers cited for cognitive strategy concepts
- Same 3-4 papers cited across 20+ different nodes

**Phase to address:**
Content authoring phase. Establish a citation template that enforces the reasoning structure before any content is written.

---

### Pitfall 10: Battle.net OAuth Token Management Failures

**What goes wrong:**
OAuth access tokens expire after 24 hours. User changes password or revokes app access mid-session — token invalidates immediately. Without proper error handling, authenticated users see silent failures: mastery data stops updating, progress saves fail, and no useful error message explains why. This is particularly bad for a learning tool where "my progress didn't save" is a trust-destroying experience.

**Why it happens:**
OAuth token refresh is easy to implement for the happy path but edge cases (revocation, account lock, password change) require additional error handling that teams often defer.

**How to avoid:**
- Always handle HTTP 401 from Battle.net API gracefully: prompt re-authentication, never fail silently
- Store refresh tokens server-side, never in client storage (XSS risk)
- Do not pass OAuth tokens in URL query parameters — HTTP Authorization header only (enforced by Blizzard)
- Use PKCE for the authorization code flow (Blizzard announced this as mandatory for public clients)
- Implement exponential backoff on Battle.net API calls — rate limit is 36,000 req/hour / 100 req/sec per app, not per user; a burst of concurrent users can exhaust this

**Warning signs:**
- App crashes or shows blank state when a 401 is returned from the Battle.net API
- OAuth tokens stored in localStorage
- No retry/refresh logic in the API client

**Phase to address:**
Authentication and OAuth integration phase.

---

### Pitfall 11: Extrinsic Motivation Collapse in Progress Tracking

**What goes wrong:**
Progress bars, node completion counts, and mastery badges feel compelling at first. After a week, the novelty wears off and the extrinsic reward loses its pull. If the content itself isn't intrinsically engaging, users churn. Worse, if progress is lost to a bug or a data migration, users feel robbed of weeks of investment and abandon permanently.

**Why it happens:**
Gamification is borrowed from games where the reward loop is tightly coupled to the core engagement. In a learning app, the content is the core — gamification is at best a nudge, not a reason to return.

**How to avoid:**
- Design progress tracking to surface mastery growth, not just completion counts. "You now understand macro fundamentals — here's what that unlocks" is more motivating than "12/47 nodes complete"
- Never use streak mechanics — a missed day due to a bug or travel causes streak loss that punishes the user for external circumstances
- Avoid leaderboards — they shift focus from personal skill growth to competitive ranking, which is exactly the wrong frame for a learning tool (players already have the w3champions ladder for that)
- Progress state must be backed by server-side persistence, not localStorage — loss of local data should never mean loss of progress

**Warning signs:**
- Streak counter as a primary engagement mechanic
- Leaderboard showing "most nodes mastered" globally
- Progress stored only in client-side state

**Phase to address:**
Progress tracking feature design phase.

---

### Pitfall 12: TanStack Start Maturity — Breaking Changes and RSC Gaps

**What goes wrong:**
TanStack Start is at v1 RC / recently released v1, but it is not as battle-tested as Next.js. Point releases have introduced breaking changes in production builds (the 1.142.x Cloudflare Workers middleware import issue is one documented example). React Server Components support is still in active development and will land as a v1.x addition — building architecture that assumes RSC today will require rework.

**Why it happens:**
The v1 label implies stability, but the ecosystem and tooling around TanStack Start is smaller and less documented than Next.js. Community support for edge cases is limited. The framework moves fast.

**How to avoid:**
- Pin dependency versions and do not auto-upgrade — test each minor upgrade in a branch before merging
- Do not architect around React Server Components until they land in a stable TanStack Start release
- Prefer Nitro/Node adapter over Cloudflare Workers if targeting Cloudflare — edge adapter has had more instability
- Track the TanStack router GitHub releases page and CHANGELOG actively
- Budget for framework upgrade work in each phase — not as a risk, but as a certainty

**Warning signs:**
- Production build failures after an automatic npm dependency upgrade
- Architecture documents specifying RSC-dependent patterns before RSC is stable in TanStack Start
- No dependency pinning strategy

**Phase to address:**
Project setup phase (dependency pinning and upgrade workflow established from day one) and reviewed at each phase transition.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode node layout positions | Avoid building layout algorithm | Layout becomes a manual maintenance burden as nodes are added; positions drift | Never — use dagre/elk from the start |
| Store node content inline in graph data | Simple data model | Content and graph structure become inseparable; impossible to update content without touching graph | Never for v1+ — content must be decoupled |
| Skip per-node `last_verified` metadata | Simpler data model | Cannot identify stale content at scale; no systematic staleness detection | Never — add from day one |
| Use localStorage for auth tokens | Simple auth implementation | XSS risk; data loss on browser clear | Never for auth tokens — server-side sessions only |
| Inline React Flow event handlers | Faster initial dev | Infinite re-render loops that are painful to debug later | Never — establish memoization patterns immediately |
| Manual mastery check-off only, no quiz | Skips quiz design work | No validation of conceptual understanding; mastery becomes self-reported noise | Acceptable for MVP v1 if quiz design is documented for v2 |
| Launch without community engagement | Ship faster | No users, project dies quietly | Never — community engagement starts during build |
| Skip API feasibility spike for w3champions | Avoid blocking uncertainty | Build integration feature that can never ship | Never — spike before any integration code |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Battle.net OAuth | Passing access token in URL query string | Use HTTP `Authorization: Bearer <token>` header |
| Battle.net OAuth | Assuming token is valid indefinitely | Check for 401 on every request; refresh or re-authenticate |
| Battle.net OAuth | Not implementing PKCE | PKCE is now mandatory for public clients |
| Battle.net API | Polling player data on every page load | Cache API responses with TanStack Query; set stale time to hours not seconds |
| Battle.net API | One API client for all users | Rate limit is per-app (36k req/hr); fan-out polling for many users hits this ceiling fast |
| w3champions API | Assuming a public API exists | Verify API availability with w3champions team before building; have manual fallback ready |
| w3champions API | Treating open-source code as a stable API contract | Open-source ≠ versioned API; endpoints can change without notice |
| React Flow | Defining node types inside the parent component render | Node type components must be defined outside render or memoized — creates infinite loops otherwise |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All nodes rendered regardless of viewport | Frame drops when panning large graphs | Enable `onlyRenderVisibleElements` prop from the start | ~80+ nodes visible |
| Force layout recomputed on every render | Graph "jumps" or freezes on interaction | Memoize layout with `useMemo`; recompute only when graph data changes | Noticeable at 30+ nodes |
| Custom node CSS with shadows/gradients on all nodes | Consistent jank during pan/zoom | Move visual complexity to the detail panel; keep node thumbnails visually simple | 50+ styled nodes |
| Polling w3champions API per user per page load | API rate limit exhausted during traffic spike | Cache responses for hours; sync only on explicit user refresh | 50+ concurrent active users |
| Full graph rendered on first load with no spatial context | Users cannot orient; zoom-to-fit shows everything tiny | Default to guided pathway view; full graph is opt-in | Any graph with 30+ nodes |
| Battle.net API calls without caching | 401 failures under load; rate limit exhaustion | TanStack Query with appropriate stale times (hours, not seconds) | Any sustained usage |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Server function that accepts user ID from client and queries without authorization check | Horizontal privilege escalation — any user reads any user's progress | Derive user ID from server-side session, never from client input |
| OAuth token stored in localStorage | XSS attack extracts token; account hijack | Store tokens server-side in httpOnly cookies |
| Server function validates input shape but not ownership | Well-formed but unauthorized data access | Shape validation ≠ authorization; check ownership separately |
| Proxying w3champions API calls without rate-limit protection | Authenticated user can exhaust app's API quota | Implement request rate limiting per-session on server functions that call external APIs |
| No CSRF protection on state-mutating server functions | Cross-site request forgery against authenticated users | TanStack Start middleware should enforce CSRF tokens for mutations |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Full graph as default first-load view | Cognitive overload; novices cannot find a starting point | Default to guided pathway selector; full graph is discoverable, not default |
| Streak counter as engagement mechanic | Users feel punished by bugs/travel/life; churn after first missed day | Remove streaks; show cumulative mastery growth instead |
| Leaderboard for node completion | Shifts motivation from personal growth to ranking; destroys intrinsic motivation | Remove global leaderboards entirely; progress tracking is personal only |
| Automatic layout algorithm placing nodes by graph topology | Domain-adjacent concepts end up visually scattered | Manual or semi-manual layout with fixed positions per concept category; supplement with auto-layout suggestions |
| No search/filter in the graph | Users cannot find a specific concept without scanning all nodes | Search by node name/tag must be available at any graph size |
| Inline citations with no "how to apply" section | Research feels academic and inaccessible to players | Every citation gets a sibling "What this means for your practice" section |
| Mobile pan/zoom with pinch gesture conflicting with browser scroll | Unusable on mobile | Acknowledge mobile as secondary; implement scroll-lock on graph focus; test on iOS/Android before any mobile claims |

---

## "Looks Done But Isn't" Checklist

- [ ] **OAuth integration:** Token refresh on 401 implemented — verify by expiring a test token and checking the app re-auths gracefully
- [ ] **Server functions:** Every function that reads user data checks session ownership — verify by calling the function directly (not via UI) with a different user's resource ID
- [ ] **React Flow graph:** Custom nodes are memoized — verify with React DevTools Profiler that nodes don't re-render during pan/zoom when not selected
- [ ] **Node content:** Every node has `last_verified` and `patch_version` metadata — verify by querying for nodes missing these fields
- [ ] **Citation quality:** Every citation has an accompanying "how to apply in your next game" section — verify by auditing 10 random nodes
- [ ] **Graph entry point:** First-load experience starts on pathway selector, not full graph — verify with a fresh incognito browser session
- [ ] **Progress persistence:** Server-side progress save confirmed working — verify by clearing localStorage and confirming progress survives
- [ ] **w3champions API feasibility:** Confirmed with w3champions team (not assumed) — verify before writing integration code
- [ ] **Rate limiting:** Battle.net API calls go through a server-side caching layer — verify by checking TanStack Query config for stale time settings

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| w3champions API unavailable | LOW (if caught early) / HIGH (if built against) | Activate manual-fallback-first architecture; document auto-detection as "coming soon" |
| Server function authorization failure found post-launch | HIGH | Audit all server functions; add ownership checks; invalidate potentially leaked data; disclose if user data was exposed |
| React Flow re-render loop in production | MEDIUM | Add React.memo to all custom node components; move event handlers to useCallback; patch release within hours if caught quickly |
| "Comprehensive at launch" delayed ship 6+ months | HIGH | Hard-cut scope to race-agnostic fundamentals only; ship with explicit "Phase 1 of N" framing |
| Launch to silence (no community adoption) | MEDIUM | Begin community engagement immediately — post in w3champions Discord with context, not just a link; reach out to one respected player directly |
| Stale content discovered after balance patch | LOW | Node-level `last_verified` flag + UI staleness indicator; open GitHub issue for affected nodes; prioritize in next content sprint |
| TanStack Start breaking change in production | MEDIUM | Pin to last known working version; create upgrade branch; test against RC release before upgrading main |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| W3Champions API unavailability | Phase 1: Feasibility spike — before any other integration work | Confirmed API access with w3champions team; or manual-fallback architecture spec written |
| Server function authorization confusion | Phase 2: Auth and OAuth | Security review of all server functions before phase ships |
| React Flow memoization failures | Phase 2: Graph UI foundation | React DevTools Profiler shows <3 renders per node during pan gesture |
| Ladder metrics as gameable mastery proxy | Phase 1: Data model design; Phase 3: Mastery integration | Expert WC3 player signs off on mastery thresholds before integration |
| "Comprehensive at launch" trap | Phase 0: Scoping | Minimum publishable content set explicitly defined and enforced as launch gate |
| Community adoption failure | Starts Phase 0; culminates pre-launch | At least one recognized WC3 player has reviewed content and agreed to share |
| Content staleness without editorial process | Phase 2: Content data model | All nodes have `last_verified` + `patch_version`; staleness workflow documented |
| Graph overwhelm / no entry point | Phase 2: Graph UI | Guided pathway is default; full graph is opt-in |
| Science citation as credibility theater | Phase 2: Content authoring | Citation template enforced; 10-node audit passes "how to apply" test |
| Battle.net OAuth token management failures | Phase 2: Auth integration | Confirmed token refresh works; 401 handling tested manually |
| Extrinsic motivation collapse | Phase 2: Progress tracking design | No streaks; no global leaderboard; progress is personal-mastery-framed |
| TanStack Start breaking changes | Phase 0: Project setup; ongoing | Dependency pinning policy in place; CHANGELOG tracked |

---

## Sources

- [TanStack Start Server Functions docs](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start v1 RC announcement](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [TanStack Start: Import Protection for server/client boundaries (InfoQ, March 2026)](https://www.infoq.com/news/2026/03/tanstack-import-protection/)
- [TanStack Start Cloudflare Workers breaking change — Issue #6185](https://github.com/TanStack/router/issues/6185)
- [React Flow Performance docs](https://reactflow.dev/learn/advanced-use/performance)
- [React Flow: How to improve performance with large number of nodes (xyflow Discussion #4975)](https://github.com/xyflow/xyflow/discussions/4975)
- [The ultimate guide to optimize React Flow performance (Synergy Codes)](https://www.synergycodes.com/blog/guide-to-optimize-react-flow-project-performance)
- [Battle.net API rate limits — Blizzard Forums](https://us.forums.blizzard.com/en/blizzard/t/api-access-clients-rate-limits/5602)
- [Battle.net OAuth guide](https://community.developer.battle.net/documentation/guides/using-oauth)
- [Battle.net PKCE hardening — Blizzard Forums](https://us.forums.blizzard.com/en/blizzard/t/hardening-oauth-20-flows-for-public-clients-with-pkce/52377)
- [w3champions identification service (GitHub)](https://github.com/w3champions/identification-service)
- [The Prevalence of Pseudoscientific Ideas Among Sports Coaches (Frontiers in Psychology 2018)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00641/full)
- [Introducing esports coaching to sport coaching (not as sport coaching) — Sports Coaching Review](https://www.tandfonline.com/doi/full/10.1080/21640629.2022.2123960)
- [4 Gamification Pitfalls And How To Avoid Them (eLearning Industry)](https://elearningindustry.com/4-gamification-pitfalls-avoid)
- [Knowledge graph UX challenges — Expero](https://www.experoinc.com/insights/blog/minding-the-sharp-edges-ux-considerations-with-graph-data-part-1-the-design-challenges-and-opportunities-of-graph-data)
- [Managing Scope Creep in Open Source Projects (MoldStud)](https://moldstud.com/articles/p-managing-scope-creep-in-open-source-projects)
- [Open Source Guides: Best Practices for Maintainers](https://opensource.guide/best-practices/)

---
*Pitfalls research for: WC3 Learning Roadmap (node-graph web app)*
*Researched: 2026-06-28*
