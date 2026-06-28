# Architecture Research

**Domain:** Interactive learning graph app — WC3 Roadmap
**Researched:** 2026-06-28
**Confidence:** MEDIUM (stack patterns confirmed; w3champions API shape inferred from open-source frontend)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React)                              │
│  ┌─────────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │   Graph Engine   │   │  Node Panel  │   │   User / Progress    │  │
│  │  (React Flow)    │   │  (MDX + Quiz)│   │   (Profile/Sync)     │  │
│  │                  │   │              │   │                      │  │
│  │ Reads: NodeJSON  │   │ Reads: MDX   │   │ Reads: DB via RPC    │  │
│  │ Reads: ProgState │   │ Reads: Quiz  │   │                      │  │
│  └────────┬─────────┘   └──────┬───────┘   └──────────┬───────────┘  │
└───────────┼──────────────────┼────────────────────────┼─────────────┘
            │                  │                        │
            │    TanStack Router / TanStack Query        │
            │    (route loaders + client cache)          │
┌───────────▼──────────────────▼────────────────────────▼─────────────┐
│                    TanStack Start Server Layer                        │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ Server Funcs  │  │  Auth Handler│  │  w3c Sync Service       │    │
│  │ (Drizzle ORM) │  │ (Better Auth)│  │  (API wrapper + cache)  │    │
│  └───────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘    │
└──────────┼────────────────┼───────────────────────┼─────────────────┘
           │                │                       │
┌──────────▼────────────────▼───────────────────────▼─────────────────┐
│                          Data Stores                                  │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │  PostgreSQL DB   │  │  Content (repo) │  │ w3champions API  │    │
│  │  users           │  │  JSON (graph)   │  │ (external)       │    │
│  │  node_progress   │  │  MDX (content)  │  │                  │    │
│  │  quiz_attempts   │  │  pathways JSON  │  │                  │    │
│  │  w3c_cache       │  │  citations JSON │  │                  │    │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Graph Engine (React Flow) | Render interactive node graph; pan/zoom; pathway overlay; mastery state visualization | Reads compiled node JSON + pathway JSON at build time; reads user progress via TanStack Query |
| Node Detail Panel | Display node MDX content, citations, "apply now" section, quiz trigger | Reads MDX lazily via TanStack Query (code-split); writes quiz results via server function |
| Auth Handler (Better Auth) | Battle.net OAuth flow; session cookies; route protection via `beforeLoad` | w3champions identification service; PostgreSQL users table |
| Server Functions (Drizzle ORM) | All DB reads/writes for user data; gated behind session check | PostgreSQL; called from client via RPC |
| w3c Sync Service | Fetch w3champions ladder data on-demand; cache in DB; map signals to mastery states | w3champions API (external); PostgreSQL w3c_cache table |
| Quiz Subsystem | Manage quiz question state; validate answers; persist score; update node mastery | Quiz JSON/MDX content; server functions for persistence |
| Content Data Layer (repo files) | Source of truth for all learning content; Zod-validated at build time | Consumed by graph engine (JSON) and node panel (MDX) |

## Content / Engine Decoupling Design

This is the most critical architectural decision. The graph engine and content layer must be fully decoupled so either can change independently.

### Separation Rule

The Graph Engine **only receives**:
- `NodeDisplayData[]` — id, title, race, type, position, masteryState
- `EdgeDisplayData[]` — source, target, edgeType
- `PathwayHighlight[]` — ordered node id subsets + color

The Graph Engine **never receives**:
- Raw MDX content
- Citation data
- Quiz questions
- Full node content

MDX content is loaded lazily **only when the user opens a node detail panel**, via a separate TanStack Query fetch. The graph can render, pan, zoom, and show mastery states with zero content loaded.

### Content Schema (Zod-validated at build time)

```typescript
// content/schema/node.ts
const GraphNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['foundational', 'mechanical', 'strategic', 'psychological']),
  race: z.enum(['all', 'human', 'orc', 'undead', 'nightelf']),
  prerequisites: z.array(z.string()),  // node IDs
  masterySource: z.enum(['manual', 'auto_w3c', 'quiz']),
  metaSensitivity: z.enum(['stable', 'volatile']),
  lastUpdated: z.string().date(),       // ISO date — for staleness display
  pathways: z.array(z.string()),        // pathway IDs
  position: z.object({ x: z.number(), y: z.number() }),
})

// content/schema/pathway.ts
const PathwaySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetSkillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  race: z.enum(['all', 'human', 'orc', 'undead', 'nightelf']),
  orderedNodes: z.array(z.string()),  // node IDs in sequence
})

// content/schema/citation.ts
const CitationSchema = z.object({
  id: z.string(),
  authors: z.array(z.string()),
  title: z.string(),
  year: z.number(),
  source: z.string(),  // journal, book, video
  url: z.string().url().optional(),
  applicationNote: z.string(),  // "how to apply in your next game"
})
```

### MDX Frontmatter (per node content file)

```yaml
# content/nodes/harvest-before-expand.mdx
---
nodeId: "harvest-before-expand"
summary: "..."
citations: ["ericsson-deliberate-practice", "wc3-grubby-timing"]
quizId: "harvest-expand-quiz"   # optional
---
```

### Build-time Validation Pipeline

```
content/nodes/*.json + *.mdx
          │
     Zod schema validate (CI)
          │
    Fail build on invalid content
          │
    Compile to: dist/content/nodes-index.json
                dist/content/[nodeId].json (per-node content)
```

## Recommended Project Structure

```
src/
├── routes/                          # TanStack file-based routes
│   ├── __root.tsx                   # Root layout, auth session context
│   ├── index.tsx                    # Landing / graph canvas (SSR-rendered)
│   ├── index.lazy.tsx               # Heavy graph canvas (lazy-loaded)
│   ├── _authenticated.tsx           # Pathless layout: session guard
│   ├── _authenticated/
│   │   ├── profile.tsx              # User profile + w3c sync
│   │   └── progress.tsx             # Progress overview
│   └── api/
│       └── auth/
│           └── $.ts                 # Better Auth handler
├── components/
│   ├── graph/
│   │   ├── GraphCanvas.tsx          # React Flow wrapper
│   │   ├── nodes/                   # Custom node components (memo'd)
│   │   │   ├── FoundationalNode.tsx
│   │   │   ├── MechanicalNode.tsx
│   │   │   └── RaceNode.tsx
│   │   ├── edges/                   # Custom edge components (memo'd)
│   │   └── overlays/
│   │       ├── PathwayOverlay.tsx   # Pathway highlight logic
│   │       └── MasteryOverlay.tsx
│   ├── node-panel/
│   │   ├── NodePanel.tsx            # Slide-out detail panel
│   │   ├── CitationList.tsx
│   │   ├── ApplicationNote.tsx
│   │   └── quiz/
│   │       ├── QuizFlow.tsx         # State machine for quiz UX
│   │       └── QuestionTypes/
├── server/
│   ├── functions/                   # All 'use server' server functions
│   │   ├── progress.ts              # Read/write node_progress
│   │   ├── quiz.ts                  # Submit quiz, persist score
│   │   └── w3c-sync.ts             # Fetch + cache w3champions data
│   └── db/
│       ├── client.ts                # Drizzle + PostgreSQL connection
│       └── schema.ts                # All table definitions
├── lib/
│   ├── auth.ts                      # Better Auth config
│   ├── w3c-api.ts                   # w3champions API client
│   └── mastery-detector.ts          # Signal→node mapping logic
└── content/                         # Version-controlled content (or symlink)
    ├── graph/
    │   ├── nodes.json               # All graph nodes
    │   └── edges.json               # All prerequisite edges
    ├── nodes/
    │   └── *.mdx                    # Per-node content
    ├── pathways/
    │   └── *.json                   # Pathway definitions
    ├── citations/
    │   └── citations.json           # Citation library
    └── schema/                      # Zod schemas (shared between build + runtime)
        ├── node.ts
        ├── pathway.ts
        └── citation.ts
```

## Architectural Patterns

### Pattern 1: Server Function + TanStack Query Cache

**What:** Wrap every DB operation in a `'use server'` function. Client code calls it via TanStack Query `queryFn`. SSR prefetches into dehydrated state; client rehydrates.

**When to use:** All user progress reads/writes, w3champions sync, quiz submission.

**Trade-offs:** Adds one indirection; eliminates all direct DB exposure to client bundles.

**Example:**
```typescript
// server/functions/progress.ts
export const getNodeProgress = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')
    return db.select().from(nodeProgress).where(eq(nodeProgress.userId, data.userId))
  })

// components — client side
const { data } = useQuery({
  queryKey: ['node-progress', userId],
  queryFn: () => getNodeProgress({ data: { userId } }),
  staleTime: 60_000,
})
```

### Pattern 2: Content-Split Node Loading

**What:** Load graph structure (JSON) at build/SSR time. Load node detail content (MDX compiled to JSON) lazily per-node via TanStack Query only when user opens a node panel.

**When to use:** Node detail panel open event.

**Trade-offs:** Slightly slower first open of each node; massively reduces initial JS bundle and enables content updates without rebuild of graph engine.

**Example:**
```typescript
// routes/index.tsx — SSR: load graph structure only
export const loader = createServerFn().handler(async () => {
  return { nodes: await getCompiledNodes(), edges: await getCompiledEdges() }
})

// components/node-panel/NodePanel.tsx — lazy per node
const { data: content } = useQuery({
  queryKey: ['node-content', nodeId],
  queryFn: () => fetch(`/api/content/nodes/${nodeId}`).then(r => r.json()),
  staleTime: Infinity,  // content is static until rebuild
  enabled: !!nodeId,
})
```

### Pattern 3: w3champions Sync — On-Demand with DB Cache

**What:** Never poll w3champions API automatically. Sync is user-triggered (or once per login). Cache raw API response in DB with `fetchedAt`. TanStack Query treats cache as fresh for N minutes.

**When to use:** User profile page, explicit "Sync with w3champions" action.

**Trade-offs:** Users may have stale ladder data; avoids hammering an undocumented community API.

**Example:**
```typescript
// server/functions/w3c-sync.ts
export const syncW3CData = createServerFn({ method: 'POST' })
  .handler(async () => {
    const session = await getSession()
    const cached = await db.query.w3cCache.findFirst({ where: eq(w3cCache.userId, session.userId) })
    const FIVE_MIN = 5 * 60 * 1000
    if (cached && Date.now() - cached.fetchedAt.getTime() < FIVE_MIN) {
      return { data: cached.rawStats, fromCache: true }
    }
    const stats = await w3cApiClient.getPlayerStats(session.battleTag)
    await db.insert(w3cCache).values({ userId: session.userId, rawStats: stats, fetchedAt: new Date() })
      .onConflictDoUpdate({ target: w3cCache.userId, set: { rawStats: stats, fetchedAt: new Date() } })
    return { data: stats, fromCache: false }
  })
```

### Pattern 4: Mastery Auto-Detection Mapping

**What:** A pure function `detectMasterySignals(w3cStats) → NodeMasteryUpdate[]` maps ladder signals to specific node mastery states. Isolated as a separate module with unit tests. Results are soft suggestions — stored as `auto_w3c` source, always overridable by manual check-off.

**When to use:** After every w3c sync.

**Signals → Nodes mapping** (initial design, to be refined):
- MMR tier reached → progress on broad strategic nodes
- Win-rate at specific MMR → mechanical execution nodes
- Match timing patterns (early economy, first expansion timing) → build order timing nodes
- APM sustained over N games → mechanical speed nodes

**Trade-offs:** Mapping is inherently heuristic and imprecise. The data WC3 provides through this API may not expose enough granular signals. Keep mapping conservative — false positives are worse than false negatives.

### Pattern 5: Quiz State Machine

**What:** Quiz flow is a pure React state machine (`useReducer`) with states: `idle → question → answered → complete`. Quiz questions stored in content JSON (not DB). Only the final score and pass/fail are persisted to DB via server function.

**When to use:** Conceptual and strategic node types where auto-detection is inappropriate.

**Trade-offs:** No mid-quiz persistence (acceptable for short quizzes). Stateless server side until submit.

```typescript
type QuizState =
  | { phase: 'idle' }
  | { phase: 'question'; index: number; answers: Record<number, string> }
  | { phase: 'complete'; score: number; passed: boolean }

// Persist only on complete
if (state.phase === 'complete') {
  submitQuizResult({ nodeId, score: state.score, passed: state.passed })
}
```

## Data Flow

### Graph Page Load (SSR path)

```
User navigates to /
  ↓
TanStack Router: route loader (server-side)
  ↓
Prefetch: nodes.json + edges.json (static files from content/)
Prefetch: user progress (DB via server function, if authenticated)
  ↓
Dehydrate both into SSR HTML
  ↓
Browser receives fully rendered graph + mastery states
  ↓
TanStack Query hydrates — no loading states on first paint
```

### Node Detail Open (lazy path)

```
User clicks a node
  ↓
GraphCanvas fires onNodeClick(nodeId)
  ↓
NodePanel opens — useQuery(['node-content', nodeId])
  ↓
Cache miss: fetch /api/content/nodes/[nodeId].json (static, built)
  ↓
Render MDX content, citations, application note
  ↓
If node has quizId: show "Take Assessment" button → QuizFlow
```

### w3champions Sync Flow

```
User triggers "Sync" on profile page
  ↓
syncW3CData() server function called
  ↓
Check DB cache (fetchedAt < 5min) → return cached if fresh
  ↓
Call website-backend.w3champions.com/api/players/{battleTag}/statistics
  ↓
Cache raw response in w3c_cache table
  ↓
Pass rawStats through detectMasterySignals() → NodeMasteryUpdate[]
  ↓
Upsert node_progress rows with source='auto_w3c'
  ↓
Invalidate TanStack Query cache for ['node-progress', userId]
  ↓
Graph Engine re-renders with updated mastery states
```

### Auth Flow

```
User clicks "Sign in with Battle.net"
  ↓
Better Auth redirects → oauth.battle.net/authorize
  ↓
User authenticates on Battle.net
  ↓
Battle.net redirects back → /api/auth/callback/battlenet
  ↓
Better Auth exchanges code for token (server-side)
  ↓
Extract BattleTag from token claims
  ↓
Upsert user in PostgreSQL users table
  ↓
Set session cookie (httpOnly, SameSite=Strict)
  ↓
Redirect to graph page — beforeLoad guards now pass
```

## Database Schema (Drizzle)

```typescript
// server/db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  battleTag: text('battle_tag').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const nodeProgress = pgTable('node_progress', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  nodeId: text('node_id').notNull(),
  status: text('status', { enum: ['not_started', 'in_progress', 'mastered'] }).notNull(),
  masterySource: text('mastery_source', { enum: ['manual', 'auto_w3c', 'quiz'] }).notNull(),
  masteredAt: timestamp('mastered_at'),
  quizScore: integer('quiz_score'),
}, (t) => [primaryKey({ columns: [t.userId, t.nodeId] })])

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  nodeId: text('node_id').notNull(),
  score: integer('score').notNull(),
  passed: boolean('passed').notNull(),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
})

export const w3cCache = pgTable('w3c_cache', {
  userId: uuid('user_id').references(() => users.id).primaryKey(),
  battleTag: text('battle_tag').notNull(),
  rawStats: jsonb('raw_stats').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
})

// Better Auth creates its own session/account tables via its schema plugin
```

## Suggested Build Order (Phase Dependencies)

Each phase is a prerequisite for the next. Build in this order:

| Phase | What | Why First |
|-------|------|-----------|
| 1. Content Schema + Seed Data | Zod schemas, 15–20 foundational nodes in JSON, CI validation | Everything downstream depends on having typed, valid content to render |
| 2. Graph Engine (no auth) | React Flow canvas, custom nodes, Dagre layout, pan/zoom, pathway overlay | Proves the core UX; needs only static JSON from Phase 1; can mock mastery state |
| 3. Node Detail Panel + MDX Pipeline | MDX authoring, content pipeline, citations, application notes | Proves content/engine decoupling; content can be authored while auth is built |
| 4. Auth + User DB | Better Auth + Battle.net OAuth, PostgreSQL schema, Drizzle setup | Needed before any progress persistence; blocks Phases 5 and 6 |
| 5. Progress Tracking + Manual Check-off | Progress server functions, mastery state in graph | First end-to-end user feature; validates the data layer |
| 6. Quiz Subsystem | Quiz content JSON, QuizFlow component, score persistence | Depends on Phase 4 (DB) and Phase 3 (content) |
| 7. w3champions Sync | API wrapper, DB cache, mastery signal detection | Depends on Phase 4 (auth/DB); feasibility risk — do Phase 5 first as fallback |
| 8. Polish + Pathways | Pathway guided tracks, staleness indicators, UI animations | Can be done partially in parallel with earlier phases |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Single PostgreSQL instance (Neon serverless or Railway), Vercel/Fly.io deploy — monolith is correct |
| 1k–50k users | Add read replica for progress queries; CDN for compiled content JSON (no change to architecture) |
| 50k+ users | Cache w3c sync results in Redis to avoid thundering-herd on ladder sync; consider edge deployment via Cloudflare Workers (Nitro supports this) |

### First Bottleneck

The w3champions API will be the first bottleneck. It's an undocumented community API with unknown rate limits. Mitigation: aggressive client-side caching (5-min minimum), DB-layer caching, user-triggered sync only (not automatic polling).

## Anti-Patterns

### Anti-Pattern 1: Embedding Content in React Components

**What people do:** Hard-code node titles, descriptions, and citations inside JSX components or config objects.

**Why it's wrong:** Content updates require code changes; WC3 meta patches cause immediate technical debt; community contribution is impossible; no staleness dating possible.

**Do this instead:** All content in `content/` JSON/MDX files. Graph engine only reads display-essential fields. Content updates never touch component code.

### Anti-Pattern 2: Polling w3champions API

**What people do:** Set up a background cron to refresh all users' ladder stats every N minutes.

**Why it's wrong:** No documented rate limits on a community API. Could get the app's IP blocked. Unnecessary if users aren't actively visiting.

**Do this instead:** On-demand sync triggered by user action. Cache result in DB with TTL. Expose "Last synced: 2h ago" UI with a manual refresh button.

### Anti-Pattern 3: Storing React Flow Node Positions in PostgreSQL

**What people do:** Save the user's panned graph position or node drag positions to the DB per user.

**Why it's wrong:** Premature complexity; graph positions are a content authoring concern, not a user preference. Makes it impossible to update the canonical layout without a migration.

**Do this instead:** Canonical positions live in `content/graph/nodes.json`. Viewport state (pan/zoom) is ephemeral session state in React. Add user position persistence only if UX testing proves it's needed.

### Anti-Pattern 4: Monolithic Node Component

**What people do:** Build one giant `<NodeCard>` component that renders differently based on all the node type variations.

**Why it's wrong:** React Flow re-renders all visible nodes on any state change. A heavy component with many conditional branches magnifies re-render cost.

**Do this instead:** One small, `React.memo`-wrapped component per `nodeType` (`FoundationalNode`, `MechanicalNode`, `RaceNode`). Each reads only the fields it needs. `nodeTypes` prop maps type strings to these components.

### Anti-Pattern 5: Gating w3champions as Required for Auth

**What people do:** Make w3champions sync the login mechanism (redirect through w3champions OAuth directly).

**Why it's wrong:** w3champions doesn't expose a standard OAuth for third-party apps — only Battle.net does. Also creates a hard dependency on a community service.

**Do this instead:** Auth is via Battle.net OAuth (standard, stable). w3champions sync is a separate, optional feature using the user's BattleTag after login. If w3champions is down or rate-limited, the app still works; users just have manual progress tracking.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Battle.net OAuth | Better Auth custom provider — Authorization Code + PKCE flow | Stable Blizzard API; app must be registered at developer.battle.net |
| w3champions API | Server function wrapper + DB cache layer; TanStack Query staleTime on client | Undocumented public REST API; base URL: website-backend.w3champions.com/api/; no official rate limits — treat conservatively |
| PostgreSQL | Drizzle ORM in server functions; `drizzle-kit` for migrations | Neon serverless recommended for zero-ops startup; supports connection pooling |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Graph Engine ↔ Content Layer | Static JSON at build time (no runtime coupling) | Graph engine never imports MDX or citations; compiled JSON only |
| Graph Engine ↔ User Progress | TanStack Query on client; server function (RPC) returns flat `{ nodeId, status }[]` | No direct DB in graph components |
| Node Panel ↔ Content Layer | Per-node lazy fetch (queryKey: `['node-content', nodeId]`); staleTime: Infinity | Content is static between deploys |
| Auth ↔ Server Functions | `getSession()` called at top of every server function; throws on missing session | Better Auth session stored in httpOnly cookie |
| w3c Sync ↔ Progress | Sync runs → calls `detectMasterySignals()` → upserts `node_progress` rows | Sync result invalidates TanStack Query progress cache |

## Extensibility Seams

| Extension | How to Add | Rework Required |
|-----------|-----------|-----------------|
| New node | Add entry to `content/graph/nodes.json` + `content/nodes/[id].mdx` | None — CI validates, graph auto-includes |
| New race | Add race to Zod enum in `content/schema/node.ts` | Schema bump only; content files add new race value |
| New pathway | Add `content/pathways/[id].json` with ordered node IDs | None — pathway overlay reads all pathway files |
| New citation | Add to `content/citations/citations.json` | None |
| Community contribution | MDX/JSON files are PR-friendly; add CI schema validation as PR check | No architecture rework — only process |
| New mastery signal | Add case to `lib/mastery-detector.ts` pure function | Unit-testable in isolation; no DB schema change |
| Second race branch (e.g. Night Elf) | Add nodes with `race: 'nightelf'`, add edges referencing shared foundational nodes | Graph engine already handles race filtering |

## Sources

- TanStack Start overview and server functions: https://tanstack.com/start/latest/docs/framework/react/overview
- TanStack Start SSR architecture: https://deepwiki.com/tanstack/router/5.1-server-side-rendering-and-streaming
- TanStack Start server functions / RPC: https://deepwiki.com/tanstack/router/5.2-server-functions-and-rpc
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- React Flow layouting with Dagre: https://reactflow.dev/examples/layout/dagre
- TanStack Query SSR hydration: https://tanstack.com/query/v5/docs/react/guides/ssr
- Better Auth + TanStack Start: https://better-auth.com/docs/integrations/tanstack
- w3champions GitHub org: https://github.com/w3champions
- w3champions website-backend (open-source): https://github.com/w3champions/website-backend
- w3champions identification-service: https://github.com/w3champions/identification-service
- Battle.net OAuth: https://community.developer.battle.net/documentation/guides/using-oauth
- Drizzle ORM + TanStack Start: https://dev.to/jqueryscript/a-minimal-tanstack-start-template-with-better-auth-drizzle-orm-4mei
- Content collections with Zod: https://supastarter.dev/dev-tips/2025-08-26-content-collections

---
*Architecture research for: WC3 Learning Roadmap*
*Researched: 2026-06-28*
