# Phase 02: Graph Engine — Research

**Researched:** 2026-06-29
**Domain:** @xyflow/react v12 interactive graph canvas — layout, memoization, custom nodes/edges, guided-pathway spotlight, mobile fallback, SSR strategy
**Confidence:** MEDIUM (core APIs verified via reactflow.dev official docs; ELK/dagre sizes confirmed via npm; SSR pattern confirmed via official xyflow docs and TanStack docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Node positions auto-computed from `prerequisites[]` DAG using a layered layout engine (ELK or dagre — Claude's choice).
- **D-02:** Flow direction top-to-bottom — fundamentals at top, advanced below.
- **D-03:** Edges are muted obsidian-grey directional bezier curves at rest. On node hover/select, full prerequisite chain highlights in rune-gold, Motion-animated.
- **D-04:** Node face: title + nodeType icon + difficulty marker.
- **D-05:** Mastery uses fill+glow progression AND a small status badge (both encodings).
- **D-06:** MECHANIC and CONCEPTUAL nodes get distinct shapes (angular vs rounded).
- **D-07:** Engine supports race faction-color tints; v1 content is all `agnostic`, tints mostly dormant.
- **D-08:** First load mounts full graph but dims/blurs non-pathway nodes; camera fit-framed to pathway. "Explore full map" zooms out and un-dims.
- **D-09:** Success criterion 3 means pathway is what user sees first; non-pathway nodes are de-emphasized (not absent from DOM).
- **D-10:** Pathway is a standalone static file (`pathways/beginner-fundamentals.json`) — Zod-validated, CI referential-integrity check.
- **D-11:** Below breakpoint, drop the canvas and render a vertical scrollable list of node cards.
- **D-12:** Mobile list: Beginner Pathway nodes first (in pathway order), then "All Nodes". Tap is a placeholder no-op in Phase 2.
- **F-01 (resolved in UI-SPEC):** Three gold uses differentiated by area/perimeter/line, rune stop (500/600/400), and static/animated.

### Claude's Discretion

- **Layout engine** (D-01): ELK vs dagre — pick during research (resolved below: dagre).
- **Layout timing** (D-01): client-side `useMemo` vs build-time precompute (resolved below: client `useMemo` + `<ClientOnly>`).
- **Exact node shapes/icons** (D-04, D-06): Glyph choices and angular/rounded forms within ADR 0001 (resolved in UI-SPEC: `Sword` / `BookOpen` from lucide-react; 4px / 16px border-radius).
- **Mobile breakpoint value** (D-11): 768px (resolved in UI-SPEC: `md:` Tailwind breakpoint).
- **Pathway file location/exact shape** (D-10): directory + field names (resolved: `pathways/beginner-fundamentals.json`, shape in Code Examples below).

### Deferred Ideas (OUT OF SCOPE)

- Node detail panel + lazy content load — Phase 3
- Search / filter by race / skillType / difficulty / mastery — Phase 3
- Real mastery persistence + manual marking — Phase 5
- Real pathway content, progress bar, multiple pathways, staleness indicators — Phase 9
- Race faction-color theming — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRAPH-01 | Interactive node graph with pan/zoom/click (React Flow / @xyflow/react), non-linear exploration | @xyflow/react v12 ReactFlow component with onlyRenderVisibleElements, pan/zoom built-in |
| GRAPH-02 | Node mastery states shown visually (untouched / learning / mastered) | Per-node style prop + CSS class variants using design tokens from app.css; CVA for variant styling |
| GRAPH-05 | Desktop-first interactive graph; mobile renders node content readably | CSS `hidden md:block` / `block md:hidden` pattern — SSR-safe, no hydration mismatch |
| GRAPH-06 | Graph performs smoothly at v1 node count (memoization conventions from first prototype commit) | React.memo custom nodes, useCallback handlers, onlyRenderVisibleElements, nodesDraggable=false, nodeTypes defined outside component |
</phase_requirements>

---

## Summary

Phase 2 builds the interactive @xyflow/react canvas on top of the Phase 1 schema foundation. The three critical technical decisions are (1) layout engine, (2) SSR/hydration strategy, and (3) edge-highlight state management — all have clear answers after research.

**Layout engine: dagre wins decisively.** @dagrejs/dagre is ~39 KB, synchronous, officially recommended by the xyflow team for tree/DAG layouts, and has been in production for years. ELK is 1.4 MB, asynchronous (requires hooks and promises), and is designed for complex sub-flows and edge routing that this project will never need at v1 scale (25–50 nodes). Synchronous dagre means positions are computed in a single `useMemo` pass — deterministic and repeatable.

**SSR strategy: wrap the canvas in `<ClientOnly>`.** @xyflow/react v12 cannot measure DOM node dimensions on the server. Trying to SSR the graph canvas requires explicitly pre-computing all node widths/heights — a maintenance burden. The correct approach for an interactive canvas in TanStack Start is to wrap the ReactFlow component in TanStack Router's `<ClientOnly>` component: the graph renders post-hydration only. The mobile list (plain HTML) remains server-rendered. This eliminates hydration mismatch entirely at zero cost to UX (the canvas has no SEO value).

**Edge highlight: Zustand atom + custom edge component.** A single `hoveredNodeId: string | null` atom in a Zustand store is the lightest mechanism. The custom edge component reads this atom, computes whether the edge is in the ancestor chain via BFS, and conditionally applies `motion.path` animation. This is isolated from ReactFlow's internal state and does not cause ReactFlow to re-render its node tree when hover changes.

**Primary recommendation:** Use `@dagrejs/dagre` for layout (synchronous, 39 KB, officially recommended), wrap the canvas in `<ClientOnly>` (eliminates SSR hydration risk), and a Zustand atom for hover-driven edge highlight (lightweight, isolated re-renders).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Graph canvas render | Browser / Client | — | @xyflow/react requires DOM for measurement; canvas is client-only via `<ClientOnly>` |
| Node layout computation | Browser / Client | — | Dagre runs synchronously in `useMemo` after component mounts |
| Mobile node list | Frontend Server (SSR) | Browser | Pure HTML list — SSR-rendered safely, no DOM APIs needed |
| Pathway data loading | Frontend Server (SSR) | — | Static JSON loaded in route loader (TanStack Start `loader`); passed as props |
| Edge highlight state | Browser / Client | — | Zustand store with hoveredNodeId atom; component-local client state |
| GraphDisplayNode projection | Frontend Server (SSR) | — | `src/schemas/graph.ts` projection computed at load time |
| Pathway Zod validation | Build time (CI) | — | Zod schema + CI referential-integrity check mirrors Phase 1 pattern |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | 12.11.1 | Interactive graph canvas — nodes, edges, pan/zoom | Locked in CLAUDE.md; React-native, Tailwind v4 support, SSR in v12 |
| `@dagrejs/dagre` | 3.0.0 | Synchronous layered DAG layout — top-to-bottom | ~39 KB, synchronous, official xyflow recommendation for trees |
| `motion` (import from `motion/react`) | 12.42.0 | Edge highlight animation (spring), node entrance fade | Locked in CLAUDE.md; `motion/react` not `framer-motion` |
| `zustand` | 5.0.14 | Hover state atom for edge highlight (hoveredNodeId) | @xyflow/react uses Zustand internally; lightweight, no boilerplate |
| `lucide-react` | latest | Node type icons (Sword = MECHANIC, BookOpen = CONCEPTUAL) | shadcn/ui default; tree-shakeable SVG |
| `class-variance-authority` | 1.x | Node mastery state variants (untouched/in-progress/mastered) | Already chosen in stack; simplifies 3-state node styling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-router` `<ClientOnly>` | 1.x (bundled) | Wrap ReactFlow canvas to prevent SSR hydration mismatch | Required — graph canvas must be client-only |
| `clsx` + `tailwind-merge` | latest | Class merging on node components | shadcn/ui companion already chosen; use in custom node face |

### What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `elkjs` | 1.4 MB, async, complex — overkill for a 25–50 node DAG | `@dagrejs/dagre` |
| `reactflow` (old package) | Old name, missing v12 SSR + Tailwind v4 | `@xyflow/react` |
| `framer-motion` | Renamed package | `motion` — import from `motion/react` |
| Inline `nodeTypes` object | Causes ReactFlow to recreate all nodes on every parent render | Define `nodeTypes` const outside component |
| `d3-force` | Async force simulation, not deterministic for DAGs | `@dagrejs/dagre` |

### Installation

```bash
npm install @xyflow/react @dagrejs/dagre zustand lucide-react motion
npm install -D @types/react  # already installed
```

shadcn/ui is not yet initialized — first task of Phase 2:
```bash
npx shadcn init  # new-york style, Tailwind v4, do NOT overwrite src/styles/app.css
npx shadcn add button badge tooltip
```

**Version verification:** Confirmed via `npm view` 2026-06-29:
- `@xyflow/react` → 12.11.1
- `@dagrejs/dagre` → 3.0.0
- `zustand` → 5.0.14
- `motion` → 12.42.0

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@xyflow/react` | npm | ~2 yrs | 6.3M/wk | github.com/xyflow/xyflow | SUS (too-new version flag) | Approved — flag is for the latest release date (2026-06-22), not the package age; 6.3M/wk and official xyflow org |
| `@dagrejs/dagre` | npm | ~2 yrs | 2.95M/wk | github.com/dagrejs/dagre | OK | Approved |
| `elkjs` | npm | ~2 yrs | 2.73M/wk | github.com/kieler/elkjs | OK | NOT USED — removed from stack (see above) |
| `zustand` | npm | 5+ yrs | 42.3M/wk | github.com/pmndrs/zustand | OK | Approved |
| `motion` | npm | 3+ yrs | 13.1M/wk | github.com/motiondivision/motion | SUS (too-new version flag) | Approved — flag is for the latest release date (2026-06-25), not package age; 13M/wk, official Framer-successor |
| `lucide-react` | npm | 3+ yrs | widely used | github.com/lucide-icons/lucide | (not checked, established) | Approved — default shadcn/ui icon set |
| `@dagrejs/graphlib` | npm | ~2 yrs | 3.45M/wk | github.com/dagrejs/graphlib | OK | Approved (peer dep of dagre) |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious SUS:** `@xyflow/react` and `motion` — both flagged only because their most recent npm release was < 2 weeks ago. These are established, well-maintained packages with millions of weekly downloads. Planner does NOT need to add checkpoint:human-verify; the SUS flag is a false positive here based on release cadence.

*`@xyflow/react` and `motion` were discovered from CLAUDE.md (project-authoritative source) AND confirmed via npm registry. They are [CITED: .claude/CLAUDE.md] as the locked stack choices.*

---

## Architecture Patterns

### System Architecture Diagram

```
Static Files                   TanStack Start (SSR)              Browser (Client-Only)
──────────────                 ────────────────────              ─────────────────────
content/nodes/*.mdx            Route Loader                      <ClientOnly>
  └─ NodeFrontmatter[]    →    GraphDisplayNode[] + PathwayData   └─ <ReactFlow>
pathways/*.json                  │                                    ├─ dagre layout (useMemo)
  └─ PathwayData           →    Props                                 ├─ nodeTypes (const)
                                 ↓                                    ├─ edgeTypes (const)
                           Mobile List (SSR)                          ├─ CustomNode (React.memo)
                           <div class="block md:hidden">              ├─ CustomEdge (React.memo)
                             └─ NodeCard[]                            └─ ZustandStore
                                                                          └─ hoveredNodeId
                                                                              ↓ read by CustomEdge
                                                                              → BFS ancestor chain
                                                                              → motion.path animate
```

**Data flow:** Content pipeline → `GraphDisplayNode[]` (IDs + title + nodeType + race + prerequisites + difficulty) → route loader → passed as loader data → `<ClientOnly>` canvas + mobile list

### Recommended Project Structure

```
src/
├── routes/
│   ├── index.tsx                # Phase 2: redirect or graph route
│   ├── _graph.tsx               # New: graph route (or index.tsx)
│   └── preview/                 # New: dev-only preview routes
│       ├── pathway.tsx          # Preview 1: guided pathway default
│       ├── mastery-states.tsx   # Preview 2: three mastery states
│       ├── full-map.tsx         # Preview 3: full map reveal
│       └── mobile.tsx           # Preview 4: mobile list
├── components/
│   └── graph/                   # Deep module: exposes simple interface
│       ├── RoadmapGraph.tsx     # Top-level canvas component
│       ├── GraphNode.tsx        # React.memo custom node (MECHANIC + CONCEPTUAL)
│       ├── GraphEdge.tsx        # React.memo custom edge (animated highlight)
│       ├── MobileNodeList.tsx   # Mobile fallback list
│       └── PathwayBanner.tsx    # Pathway name + step count overlay
├── lib/
│   ├── graph-layout.ts          # Deep module: dagre layout fn (pure, testable)
│   ├── graph-store.ts           # Zustand store (hoveredNodeId + ancestor BFS)
│   ├── mock-mastery.ts          # Mocked mastery map (Phase 2 only)
│   └── pathway-utils.ts         # Ancestor chain computation (BFS)
├── schemas/
│   ├── node.ts                  # Existing: NodeSummarySchema, NodeFrontmatterSchema
│   └── graph.ts                 # New: GraphDisplayNodeSchema (+ difficulty)
pathways/
└── beginner-fundamentals.json   # New: pathway data + Zod validation
scripts/
└── validate-pathway.ts          # New: CI referential-integrity check
```

### Pattern 1: Dagre Layout Function (Pure, Testable)

**What:** Synchronous pure function converting `GraphDisplayNode[]` into React Flow `Node[]` with computed `position.x/y`.
**When to use:** Called once per node array change via `useMemo`. Deterministic.

```typescript
// Source: reactflow.dev/examples/layout/dagre
// src/lib/graph-layout.ts
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { GraphDisplayNode } from '#/schemas/graph';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

export function computeLayout(
  nodes: GraphDisplayNode[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edges: Edge[] = [];
  for (const n of nodes) {
    for (const prereqId of n.prerequisites) {
      // Edge: prereq → dependent (arrow points to dependent = "what comes next")
      g.setEdge(prereqId, n.id);
      edges.push({
        id: `${prereqId}->${n.id}`,
        source: prereqId,
        target: n.id,
        type: 'prerequisite',  // custom edge type
      });
    }
  }

  dagre.layout(g);

  const layoutedNodes: Node[] = nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: n.nodeType === 'MECHANIC' ? 'mechanic' : 'conceptual',
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { ...n },  // pass GraphDisplayNode fields through
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Pattern 2: Client-Only Canvas with useMemo Layout

**What:** Wrap the full `<ReactFlow>` in `<ClientOnly>`. Compute layout client-side in `useMemo`.
**When to use:** Required — prevents SSR hydration mismatch from DOM-dependent @xyflow/react.

```typescript
// Source: tanstack.com/router/latest/docs/api/router/clientOnlyComponent
// src/components/graph/RoadmapGraph.tsx
import { ClientOnly } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';  // REQUIRED — import in global CSS or here
import { computeLayout } from '#/lib/graph-layout';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';

// nodeTypes and edgeTypes MUST be defined outside the component
const nodeTypes = { mechanic: GraphNode, conceptual: GraphNode };
const edgeTypes = { prerequisite: GraphEdge };

function GraphCanvas({ nodes: rawNodes, pathway }: Props) {
  const { nodes, edges } = useMemo(
    () => computeLayout(rawNodes, 'TB'),
    [rawNodes]
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        onlyRenderVisibleElements
        colorMode="dark"
        minZoom={0.25}
        maxZoom={2.0}
        fitView
        fitViewOptions={{ nodes: pathway.steps.map(id => ({ id })), padding: 0.2 }}
      />
    </ReactFlowProvider>
  );
}

export function RoadmapGraph(props: Props) {
  return (
    <ClientOnly fallback={<div className="h-full bg-obsidian-950 animate-pulse" />}>
      {() => <GraphCanvas {...props} />}
    </ClientOnly>
  );
}
```

### Pattern 3: Custom Node (React.memo)

**What:** Memoized custom node component for both MECHANIC and CONCEPTUAL types.
**When to use:** All node rendering. React.memo prevents re-renders during pan/zoom.

```typescript
// Source: reactflow.dev/learn/customization/custom-nodes
// src/components/graph/GraphNode.tsx
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import type { GraphDisplayNode } from '#/schemas/graph';
import { MasteryBadge } from './MasteryBadge';

type GraphNodeData = GraphDisplayNode & { masteryState: 'untouched' | 'in-progress' | 'mastered' };

export const GraphNode = memo(function GraphNode({ data }: NodeProps) {
  const d = data as GraphNodeData;
  const isConceptual = d.nodeType === 'CONCEPTUAL';

  return (
    <div
      className={[
        'w-40 h-20 p-2 flex flex-col justify-between',
        'bg-obsidian-800 border',
        isConceptual ? 'rounded-2xl' : 'rounded-sm',
        masteryClass(d.masteryState),
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="invisible" />
      {/* Node face content */}
      <Handle type="source" position={Position.Bottom} className="invisible" />
    </div>
  );
});
```

### Pattern 4: Custom Edge with Animated Highlight

**What:** Custom edge that reads Zustand `hoveredNodeId`, computes BFS ancestor chain, applies `motion.path` animation.
**When to use:** All edges. Motion animates stroke on hover without re-rendering the node tree.

```typescript
// Source: reactflow.dev/learn/customization/custom-edges, motion.dev/docs/react-svg-animation
// src/components/graph/GraphEdge.tsx
import { memo } from 'react';
import { getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { motion } from 'motion/react';
import { useGraphStore } from '#/lib/graph-store';

export const GraphEdge = memo(function GraphEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const isHighlighted = useGraphStore((s) => s.ancestorEdgeIds.has(id));

  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition });

  return (
    <motion.path
      d={edgePath}
      fill="none"
      animate={{
        stroke: isHighlighted ? 'var(--color-rune-400)' : 'var(--color-obsidian-700)',
        strokeWidth: isHighlighted ? 3 : 1,
        opacity: isHighlighted ? 1 : 0.5,
      }}
      transition={
        isHighlighted
          ? { type: 'spring', stiffness: 300, damping: 30 }
          : { duration: 0.2 }
      }
    />
  );
});
```

### Pattern 5: Zustand Store for Edge Highlight State

**What:** Minimal Zustand atom storing hovered node ID and pre-computed ancestor edge ID set.
**When to use:** Drives edge highlight without coupling to ReactFlow's internal state.

```typescript
// src/lib/graph-store.ts
import { create } from 'zustand';

interface GraphStore {
  hoveredNodeId: string | null;
  ancestorEdgeIds: Set<string>;
  setHoveredNode: (nodeId: string | null, edges: Edge[], allEdges: Edge[]) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  hoveredNodeId: null,
  ancestorEdgeIds: new Set(),
  setHoveredNode: (nodeId, edges) => {
    if (!nodeId) {
      set({ hoveredNodeId: null, ancestorEdgeIds: new Set() });
      return;
    }
    // BFS up the ancestor chain
    const ancestorEdgeIds = computeAncestorEdgeIds(nodeId, edges);
    set({ hoveredNodeId: nodeId, ancestorEdgeIds });
  },
}));
```

### Pattern 6: GraphDisplayNode Projection Schema

**What:** Extends `NodeSummary` with `difficulty` for the graph face (D-04). Maintains ADR 002 boundary.
**When to use:** Graph engine imports `GraphDisplayNode`, not `NodeFrontmatter`.

```typescript
// src/schemas/graph.ts
import { z } from 'zod';
import { NodeSummarySchema } from './node';

export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
```

### Pattern 7: Pathway Data Schema + CI Check

**What:** Zod-validated JSON file; CI script validates every step ID resolves to a real node.
**When to use:** `pathways/beginner-fundamentals.json` loaded by the graph route.

```typescript
// src/schemas/pathway.ts
import { z } from 'zod';

export const PathwaySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  steps: z.array(z.string()).min(1),
});
export type Pathway = z.infer<typeof PathwaySchema>;
```

```json
// pathways/beginner-fundamentals.json
{
  "id": "beginner-fundamentals",
  "title": "Beginner Fundamentals",
  "subtitle": "8 foundational skills — start here",
  "steps": ["map-control", "..."]
}
```

### Pattern 8: Pathway Spotlight Activation via fitView

**What:** On mount, fit camera to pathway nodes. On "Explore full map", reveal all and refit.
**When to use:** Implements D-08 and success criterion 3.

```typescript
// Inside GraphCanvas after ReactFlowProvider
const { fitView } = useReactFlow();

// On mount: frame the pathway
useEffect(() => {
  fitView({
    nodes: pathway.steps.map((id) => ({ id })),
    padding: 0.2,
    duration: 800,
  });
}, []);  // runs once on mount

// "Explore full map" handler
const handleExplore = useCallback(() => {
  // 1. Update node styles to opacity 1 (set via setNodes)
  // 2. Re-fit to all nodes
  fitView({ duration: 800, padding: 0.15 });
}, [fitView]);
```

### Anti-Patterns to Avoid

- **Inline nodeTypes/edgeTypes object:** Causes React Flow to unmount + remount ALL nodes on every parent render. Define as module-level const.
- **Storing rich content in node.data:** Graph nodes should carry only display-essential fields (ID, title, nodeType, difficulty, race, masteryState). Full content loads lazily in Phase 3.
- **window.innerWidth JS check for mobile:** Causes hydration mismatch (server doesn't know window size). Use CSS `hidden md:block` / `block md:hidden` pattern instead.
- **Calling fitView in render:** Must be called in useEffect or event handler, never during render. In v12.5+, no setTimeout hack needed — call immediately after setNodes.
- **ELK for this use case:** 1.4 MB bundle, async promises, configuration complexity — all unnecessary for a 25–50 node DAG.
- **Animating edge stroke with pure CSS transitions:** CSS cannot animate SVG `stroke` reliably across browsers. Use `motion.path` from `motion/react` for cross-browser animated stroke.
- **Forking ReactFlow's internal Zustand store:** React Flow exposes `useStore` but modifying it is fragile. Keep hover state in a separate Zustand store.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DAG layout positions | Custom Sugiyama/layered algorithm | `@dagrejs/dagre` | Sugiyama is a 40-year research area; dagre handles rank assignment, crossing minimization, position calculation correctly |
| Edge SVG path geometry | Manual Bezier math | `getBezierPath()` from `@xyflow/react` | Handle offsets, curvature, and port positions are non-trivial; library handles all cases |
| Pan/zoom canvas | Custom pointer events + transform logic | `<ReactFlow>` component | Touch events, multi-touch zoom, minimap, accessibility — 100+ edge cases |
| Spring animation for edge stroke | CSS keyframes or manual requestAnimationFrame | `motion.path` from `motion/react` | Spring physics, interruption handling, reduced-motion support |
| Ancestor chain BFS | None (this IS the hand-roll) | Implement once in `src/lib/pathway-utils.ts` | Simple BFS, but must be tested; graph structure is static so precomputing works |
| Component state variants | Conditional className strings | `class-variance-authority` (CVA) | 3 mastery states × 2 node types = 6 variant combinations; CVA makes this type-safe |

**Key insight:** The layout algorithm and SVG geometry are the two highest-risk hand-roll areas. Both have battle-tested solutions already in the stack.

---

## Common Pitfalls

### Pitfall 1: nodeTypes Defined Inline (Performance Regression)

**What goes wrong:** Every parent component re-render causes React Flow to unmount all custom nodes and remount them — catastrophic for a 25–50 node graph, causes visible flicker.
**Why it happens:** React Flow does referential equality check on nodeTypes. An inline object `nodeTypes={{ mechanic: GraphNode }}` creates a new object reference on every render.
**How to avoid:** Define `const nodeTypes = { mechanic: GraphNode, conceptual: GraphNode }` at module scope (outside any component). Alternatively use `useMemo` inside the component with an empty deps array.
**Warning signs:** React DevTools Profiler shows ALL nodes rendering on every pan interaction.

### Pitfall 2: SSR Hydration Mismatch

**What goes wrong:** Server renders placeholder HTML, client mounts @xyflow/react canvas with dagre-computed positions → React reconciler finds HTML structure mismatch → throws hydration error in production, shows warning in dev.
**Why it happens:** @xyflow/react measures DOM node dimensions to set internal width/height. These measurements don't happen on server. Dagre layout output is client-side only.
**How to avoid:** Wrap `<ReactFlow>` in `<ClientOnly>` from `@tanstack/react-router`. The mobile list (pure HTML) can still be SSR-rendered.
**Warning signs:** `Warning: Expected server HTML to contain a matching...` in browser console.

### Pitfall 3: fitView Called Before Nodes Are Measured

**What goes wrong:** Calling `fitView()` on mount before React Flow has measured node dimensions results in incorrect viewport or no-op.
**Why it happens:** React Flow must measure DOM nodes to know their actual width/height for fitView bounds calculation.
**How to avoid:** In v12.5+, call `fitView()` immediately after `setNodes()` without setTimeout — the library queues the fitView after the measurement pass. If using the `fitView` prop on `<ReactFlow>`, React Flow handles timing automatically.
**Warning signs:** Graph renders but viewport doesn't fit the pathway nodes on load.

### Pitfall 4: Mobile Check via JS window.innerWidth

**What goes wrong:** Component renders differently on server vs client → hydration mismatch.
**Why it happens:** `window.innerWidth` is not available on the server; TanStack Start SSR renders the component without it.
**How to avoid:** Use CSS-only responsive approach — `className="hidden md:block"` on canvas, `className="block md:hidden"` on mobile list. Both are rendered by SSR; CSS hides the appropriate one.
**Warning signs:** Hydration error mentioning `window is not defined` or mismatched DOM structure.

### Pitfall 5: Zustand Selector Too Broad on Edge Component

**What goes wrong:** Every edge component re-renders whenever ANY edge's highlight status changes, defeating React.memo.
**Why it happens:** Selector `(s) => s.ancestorEdgeIds` returns the whole Set — but Sets are mutable, so the reference is stable even when membership changes, OR the selector recreates the Set causing all subscribers to re-render.
**How to avoid:** Use a per-edge selector: `(s) => s.ancestorEdgeIds.has(edgeId)` — returns a primitive boolean, only re-renders this edge when ITS highlight status changes.
**Warning signs:** Profiler shows all edge components rendering on every hover.

### Pitfall 6: @xyflow/react CSS Not Imported

**What goes wrong:** Graph renders but nodes appear as unstyled boxes, handles are invisible, minimap doesn't work.
**Why it happens:** @xyflow/react ships its own CSS (`@xyflow/react/dist/style.css`) that must be imported globally.
**How to avoid:** Add `@import '@xyflow/react/dist/style.css'` to `src/styles/app.css` before the `@import 'tailwindcss'` line. This integrates with the Tailwind v4 build.
**Warning signs:** Graph renders but looks broken — no edge arrows, handles invisible.

### Pitfall 7: Dagre Edge Direction Reversed

**What goes wrong:** Arrows point from dependent → prerequisite instead of prerequisite → dependent, making the "skill tree" read backwards.
**Why it happens:** Dagre ranks sources at the top. If you set `edge(dependent, prereq)` instead of `edge(prereq, dependent)`, ranks reverse.
**How to avoid:** Interpret `prerequisites[]` as: "node `n` depends on `prereq`" → edge goes FROM `prereq` TO `n` (arrow at `n`). Call `g.setEdge(prereqId, n.id)`.
**Warning signs:** Fundamentals appear at the bottom, advanced nodes at the top.

---

## Layout Engine Decision: Dagre

**Recommendation: `@dagrejs/dagre`** [CITED: reactflow.dev/learn/layouting/layouting]

| Criterion | Dagre | ELK |
|-----------|-------|-----|
| Bundle size | ~39 KB [CITED: reactflow.dev] | ~1.4 MB [CITED: reactflow.dev] |
| Sync/async | Synchronous — runs in useMemo | Asynchronous — requires hook with Promise |
| SSR determinism | YES — same output every call | Harder — async completion order can vary |
| Official React Flow recommendation | "highly recommend dagre" for trees | Not recommended (too complex for support) |
| Configuration complexity | 3 options (rankdir, ranksep, nodesep) | 50+ options, Java port |
| Node count v1 (25–50 nodes) | More than adequate | Over-engineered |
| Sub-flow support | Limited (known open issue) | Full support |
| Edge routing | None (bezier default) | Full edge routing |

ELK is the right tool for graph editors with 500+ nodes, sub-flows, and complex port routing. WC3 Roadmap will never need any of that in v1 (or v2).

**Layout timing:** Client-side `useMemo` inside `<ClientOnly>`. Rationale:
- Dagre is synchronous → zero async delay, no loading state
- `useMemo` with `[rawNodes]` dep → recomputes only when node array changes (content pipeline change → rebuild)
- Running inside `<ClientOnly>` means the same function runs on client after hydration — no server/client mismatch
- Build-time precompute would require storing positions in JSON alongside content and re-generating on every node addition — unnecessary maintenance cost at v1 scale

---

## Mobile Fallback: SSR-Safe Responsive Approach

**Breakpoint:** 768px — Tailwind `md:` prefix [CITED: 02-UI-SPEC.md]

**Pattern:**
```tsx
// SSR renders both; CSS hides the appropriate one — no hydration mismatch
<div>
  {/* Canvas: visible on md+ only */}
  <div className="hidden md:block" style={{ height: 'calc(100dvh - 56px)' }}>
    <RoadmapGraph nodes={nodes} pathway={pathway} />
    {/* <ClientOnly> is inside RoadmapGraph */}
  </div>

  {/* Mobile list: visible below md only */}
  <div className="block md:hidden overflow-y-auto bg-obsidian-900">
    <MobileNodeList nodes={nodes} pathway={pathway} />
  </div>
</div>
```

**Why this works without hydration mismatch:** Both divs are in the SSR-rendered HTML. The CSS `hidden` / `block` classes are Tailwind utilities that resolve to media queries — the browser applies them without React. React hydrates both divs identically on server and client. No `useEffect` needed.

---

## GraphDisplayNode Projection (ADR 002 Extension)

The UI-SPEC requires `difficulty` on the node face (D-04). `NodeSummary` does not include `difficulty` (it lives on `NodeFrontmatter`). Resolution:

```typescript
// src/schemas/graph.ts — new file, Phase 2
// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { NodeSummarySchema } from './node';

// GraphDisplayNode adds difficulty to NodeSummary for the graph face (D-04).
// This is the ONLY field the graph engine adds beyond NodeSummary.
// The graph engine must never import NodeFrontmatter (ADR 002).
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
```

The content pipeline (route loader or server function) projects `NodeFrontmatter[]` to `GraphDisplayNode[]` before passing to the graph component. The graph component's props are typed to `GraphDisplayNode[]` — TypeScript enforces the boundary.

This should be documented as an ADR (ADR 005: GraphDisplayNode projection) to record why `difficulty` is the only addition and why it doesn't violate ADR 002.

---

## Guided-Pathway Spotlight Implementation

Three states to manage:

| State | Node opacity | Camera | Button visible |
|-------|-------------|--------|---------------|
| Initial (pathway) | Pathway nodes: 1.0 / Non-pathway: 0.2 | fitView scoped to pathway nodes | "Explore full map" |
| After explore | All nodes: 1.0 | fitView to all nodes | "Back to pathway" |

**Implementation approach:**

The `pathway` prop contains `steps: string[]`. On initial render:
1. Build `pathwaySet = new Set(steps)`
2. For each node in the dagre output: `style = pathwaySet.has(id) ? {} : { opacity: 0.2, pointerEvents: 'none' }`
3. `fitView({ nodes: steps.map(id => ({ id })), padding: 0.2, duration: 800 })` in `useEffect(() => { ... }, [])`

On "Explore full map":
1. `setNodes(nodes.map(n => ({ ...n, style: {}, data: { ...n.data } })))`
2. `fitView({ duration: 800, padding: 0.15 })`

**Key v12 API:** `fitView({ nodes: [{id}...] })` filters the fit to only those node bounds. [CITED: reactflow.dev/api-reference/types/react-flow-instance]

---

## Profiler Verification Strategy (Success Criterion 1)

**Requirement:** <3 re-renders per custom node component during a pan gesture.

**Method:**
1. Run `npm run dev`
2. Open React DevTools → Profiler tab
3. Click Record, perform a pan gesture (drag the canvas 200px)
4. Stop recording
5. Select the Flame Graph view
6. Find any `GraphNode` component in the tree
7. Click each commit (pan should produce 1-2 commits for the viewport update)
8. Verify `GraphNode` shows grey bars (did not render) or at most renders once per commit
9. **Pass:** GraphNode renders ≤ 2 times total across the entire pan recording

**What causes re-renders to leak:**
- `nodeTypes` defined inline (fix: module-scope const)
- Node `data` is a new object reference on every layout computation (fix: stable references in `useMemo`)
- Edge highlight Zustand selector returns the Set object instead of a boolean (fix: `.has(id)` selector)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` package | `@xyflow/react` package | v12 (Jul 2024) | New package name; old package still gets patch releases but v12 features are in new package |
| `framer-motion` import | `motion` package, import from `motion/react` | 2024 | Same library, renamed; old `framer-motion` import still works but deprecated |
| setTimeout hack for fitView | fitView works immediately in v12.5+ | Mar 2025 | Can call fitView right after setNodes without hacks |
| ELK as "advanced" go-to | Dagre recommended for simple trees | Stable since 2023 | React Flow docs explicitly recommend dagre for tree/DAG layouts |
| React.memo manual application | React Compiler auto-memoizes (React 19.2+) | Oct 2025 | Compiler reached 1.0; however GRAPH-06 explicitly requires manual React.memo in first commit — comply with the requirement regardless of compiler |

**Deprecated/outdated:**
- `tailwindcss-animate`: Deprecated in shadcn/ui March 2025 — use CSS transitions or `motion`
- `contentlayer`: Unmaintained ~2024 — use `@content-collections/core` (already done in Phase 1)
- `@tanstack/start` old package name — use `@tanstack/react-start` (already done)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `<ClientOnly>` from `@tanstack/react-router` is the correct API for rendering a component post-hydration only in TanStack Start | SSR Strategy | If API differs (e.g. it's `import { ClientOnly } from '@tanstack/react-start'`), import path needs fixing; pattern is correct |
| A2 | Zustand v5 store API unchanged from v4 for `create()` | Pattern 5 | Minor API change possible; verify against Zustand v5 docs |
| A3 | `motion.path` can animate SVG `stroke` and `strokeWidth` via the `animate` prop in v12 | Pattern 4 | Motion SVG animation confirmed; exact prop names may vary slightly from training data |
| A4 | `dagre.layout()` with `rankdir: 'TB'` produces top-to-bottom node positions compatible with @xyflow/react coordinate system | Pattern 1 | Confirmed via official React Flow dagre example; edge case: coordinate origin may need centering (x - width/2, y - height/2) |
| A5 | `fitView({ nodes: [{id}...] })` syntax subsets nodes correctly in v12 | Pattern 8 | Confirmed via ReactFlowInstance API docs at reactflow.dev |

**If this table is empty:** All claims were verified or cited — no user confirmation needed.
*This table has 5 items — all LOW risk, implementation-resolvable.*

---

## Open Questions

1. **`@xyflow/react` CSS import location**
   - What we know: The library requires its base CSS (`@xyflow/react/dist/style.css`) to be imported globally.
   - What's unclear: Whether to import in `src/styles/app.css` (before or after `@import "tailwindcss"`) or as a separate import in the root route.
   - Recommendation: Add `@import '@xyflow/react/dist/style.css';` at the top of `src/styles/app.css` before the `@import "tailwindcss"` line. This way Tailwind v4's `@theme` overrides can take precedence.

2. **Mock node data count (8–12 pathway nodes + others)**
   - What we know: Only `content/nodes/map-control.mdx` exists; Phase 2 needs 8–12 pathway nodes + mastery state examples.
   - What's unclear: Whether to create real MDX seed nodes or a purely in-memory mock for Phase 2 previews.
   - Recommendation: Create 10–15 minimal MDX seed nodes (just required fields, placeholder text) in `content/nodes/`. This exercises the content pipeline and is closer to real conditions. `src/lib/mock-mastery.ts` provides the mocked `MasteryState` values keyed by node ID.

3. **ADR 005 scope**
   - What we know: `GraphDisplayNode` extends `NodeSummary` with `difficulty`; this should be an ADR.
   - What's unclear: Whether this belongs in the planner's tasks or is implicit.
   - Recommendation: Planner should include one task to create `docs/adr/005-graph-display-node.md` documenting why `difficulty` is added to the graph boundary and why no other `NodeFrontmatter` fields cross.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, Vite dev | ✓ | (Linux env) | — |
| npm | Package installation | ✓ | (available) | — |
| Vite 8 | Dev server, build | ✓ | 8.1.0 (in package.json) | — |
| TanStack Start | App framework | ✓ | 1.168.26 (in package.json) | — |
| `@xyflow/react` | Canvas | ✗ | not yet installed | — (required) |
| `@dagrejs/dagre` | Layout | ✗ | not yet installed | — (required) |
| `zustand` | Hover state | ✗ | not yet installed | React Context (more coupling) |
| `motion` | Edge animation | ✗ | not yet installed | CSS transitions (less control) |
| `lucide-react` | Node icons | ✗ | not yet installed | — (required for icons) |
| `jsdom` (or `happy-dom`) | Vitest DOM tests | ✗ | not in package.json | — (needed for component tests) |

**Missing dependencies with no fallback:** `@xyflow/react`, `@dagrejs/dagre`, `lucide-react` — all required. Wave 0 must install them.

**Missing dependencies with fallback:** `zustand` (React Context), `motion` (CSS transitions) — fallbacks exist but degrade developer experience. Planner should install the preferred packages.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` — currently `environment: 'node'` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

**Note:** vitest.config.ts sets `environment: 'node'`. Phase 2 adds React component rendering. Two options:
1. Keep `environment: 'node'` and test only pure functions (layout, pathway validation, BFS) — React component tests skip
2. Add `environment: 'jsdom'` globally, or use per-file `// @vitest-environment jsdom` directive for component tests

**Recommendation:** Keep global `environment: 'node'` for pure logic tests; add per-file `// @vitest-environment jsdom` to component test files. This avoids installing and configuring `@testing-library/react` as a Phase 2 dependency (component visual testing is better done via preview routes).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRAPH-01 | Pan/zoom/click interactive | manual / profiler | visual via `npm run dev` + React DevTools Profiler | — |
| GRAPH-02 | Three mastery states visually distinct | manual | visual via `/preview/mastery-states` route | ❌ Wave 0 |
| GRAPH-05 | Mobile list renders, canvas hidden | manual | visual via `/preview/mobile` route at 375px | ❌ Wave 0 |
| GRAPH-06 | <3 re-renders per node during pan | manual / profiler | React DevTools Profiler on `/preview/full-map` | — |
| Layout | `computeLayout()` produces positions for all nodes | unit | `npm test -- src/lib/graph-layout.test.ts` | ❌ Wave 0 |
| Layout | Top-to-bottom: y increases with depth | unit | `npm test -- src/lib/graph-layout.test.ts` | ❌ Wave 0 |
| Pathway | `PathwaySchema` validates correctly | unit | `npm test -- src/schemas/pathway.test.ts` | ❌ Wave 0 |
| Pathway | CI check: all step IDs exist in node collection | integration | `npm run validate` (extend existing validate script) | ❌ Wave 0 |
| BFS | `computeAncestorEdgeIds()` returns correct edge set | unit | `npm test -- src/lib/pathway-utils.test.ts` | ❌ Wave 0 |
| GraphDisplayNode | Schema validates NodeSummary + difficulty | unit | `npm test -- src/schemas/graph.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `src/lib/graph-layout.test.ts` — tests `computeLayout()` pure function
- [ ] `src/schemas/pathway.test.ts` — tests `PathwaySchema` Zod validation
- [ ] `src/schemas/graph.test.ts` — tests `GraphDisplayNodeSchema`
- [ ] `src/lib/pathway-utils.test.ts` — tests BFS ancestor chain computation
- [ ] Extend `scripts/validate-content.ts` to also validate `pathways/*.json` referential integrity
- [ ] Create 10–15 seed MDX nodes (required by tests for graph integration)

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — no auth in Phase 2 |
| V3 Session Management | No | Not applicable — no sessions |
| V4 Access Control | No | No user-data endpoints in Phase 2 |
| V5 Input Validation | Yes (build-time) | Zod validates pathway JSON + node schemas in CI |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns for Static Graph UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed pathway JSON causes runtime crash | Denial-of-Service | Zod parse at load time; invalid schema → empty state fallback, not crash |
| XSS via node title content rendered in React | Tampering | React DOM escapes all string content by default; no dangerouslySetInnerHTML |
| Prototype pollution via node data | Tampering | Zod validation strips unknown fields (`NodeSummarySchema` is strict) |

**Security posture:** Phase 2 has a minimal attack surface — no user input, no auth, no DB, no server functions beyond a static data loader. Primary control is Zod validation of static JSON at load time.

---

## Sources

### Primary (MEDIUM confidence — official docs via WebFetch)

- [reactflow.dev/learn/layouting/layouting](https://reactflow.dev/learn/layouting/layouting) — dagre vs ELK bundle sizes (~39KB vs ~1.4MB), sync/async comparison, official dagre recommendation
- [reactflow.dev/api-reference/react-flow](https://reactflow.dev/api-reference/react-flow) — ReactFlow component props: onlyRenderVisibleElements, nodesDraggable, colorMode, fitView, fitViewOptions
- [reactflow.dev/api-reference/types/react-flow-instance](https://reactflow.dev/api-reference/types/react-flow-instance) — fitView signature with `nodes` subset option, duration, fitBounds
- [reactflow.dev/api-reference/types/node](https://reactflow.dev/api-reference/types/node) — Node type: style prop for per-node opacity
- [reactflow.dev/learn/customization/custom-nodes](https://reactflow.dev/learn/customization/custom-nodes) — React.memo pattern, NodeProps, nodeTypes registration
- [reactflow.dev/learn/customization/custom-edges](https://reactflow.dev/learn/customization/custom-edges) — EdgeProps, getBezierPath, BaseEdge, edgeTypes registration
- [reactflow.dev/examples/layout/dagre](https://reactflow.dev/examples/layout/dagre) — Full dagre layout code example
- [reactflow.dev/learn/advanced-use/ssr-ssg-configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration) — SSR: requires explicit width/height, initialWidth/initialHeight
- [motion.dev/docs/react-svg-animation](https://motion.dev/docs/react-svg-animation) — motion.path, pathLength, stroke animation
- [reactflow.dev/learn/advanced-use/state-management](https://reactflow.dev/learn/advanced-use/state-management) — Zustand integration pattern
- [tanstack.com/router/latest/docs/api/router/clientOnlyComponent](https://tanstack.com/router/latest/docs/api/router/clientOnlyComponent) — ClientOnly component for SSR-safe client rendering

### Secondary (LOW confidence — web search results)

- [WebSearch] dagre vs ELK comparison, bundle size, SSR — corroborates official docs
- [WebSearch] @xyflow/react SSR hydration mismatch + TanStack Start ClientOnly pattern
- [WebSearch] Zustand for React Flow edge hover state

### Authoritative (from project files)

- `.claude/CLAUDE.md` — locked stack choices (@xyflow/react v12, motion, dagre/ELK to research)
- `docs/adr/0001-visual-design-direction.md` — design tokens, color system
- `docs/adr/002-content-graph-decoupling.md` — NodeSummary boundary rule
- `src/schemas/node.ts` — NodeSummarySchema, NodeFrontmatterSchema (existing)
- `src/styles/app.css` — canonical design tokens
- `.planning/phases/02-graph-engine/02-UI-SPEC.md` — definitive UI contract for all visual specs

---

## Metadata

**Confidence breakdown:**
- Layout engine decision: HIGH — dagre vs ELK bundle sizes from official React Flow docs + npm `dist.unpackedSize` (1.19 MB dagre vs 8 MB ELK unpacked)
- @xyflow/react v12 API: MEDIUM — from official reactflow.dev docs pages
- SSR strategy: MEDIUM — from xyflow official SSR docs + TanStack docs
- Motion/react SVG animation: MEDIUM — from motion.dev official docs
- Zustand integration: MEDIUM — from reactflow.dev state management guide
- Mobile CSS approach: HIGH — well-established Tailwind responsive pattern, no library dependency

**Research date:** 2026-06-29
**Valid until:** 2026-07-30 (stable stack; @xyflow/react releases frequently but APIs are stable in v12)
