# Phase 3: Content Pipeline & Node Panel — Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 19 (11 new + 8 modified)
**Analogs found:** 19 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/filter-utils.ts` | utility | transform | `src/lib/pathway-utils.ts` | exact |
| `src/lib/node-content-query.ts` | utility | request-response | `src/lib/mock-mastery.ts` | role-match |
| `src/components/graph/NodeDetailPanel.tsx` | component | event-driven | `src/components/graph/RoadmapGraph.tsx` (ClientOnly + AnimatePresence) | role-match |
| `src/components/graph/NodePanelContent.tsx` | component | request-response | `src/components/graph/MobileNodeList.tsx` (inner display) | role-match |
| `src/components/graph/CitationList.tsx` | component | transform | `src/components/graph/MasteryBadge.tsx` | role-match |
| `src/components/graph/ProWisdomCallout.tsx` | component | transform | `src/components/graph/PathwayBanner.tsx` | role-match |
| `src/components/graph/PrerequisiteChips.tsx` | component | event-driven | `src/components/ui/badge.tsx` (CVA variant) | role-match |
| `src/components/graph/FilterBar.tsx` | component | event-driven | `src/routes/index.tsx` top-bar div | role-match |
| `docs/adr/006-graph-display-node-skilltype-tags.md` | config | — | `docs/adr/005-graph-display-node.md` | exact |
| `src/lib/filter-utils.test.ts` | test | — | `src/lib/graph-layout.test.ts` | exact |
| `src/lib/node-content-query.test.ts` | test | — | `src/lib/mock-mastery.test.ts` | exact |
| `content-collections.ts` (modify) | config | transform | itself | exact |
| `src/schemas/node.ts` (modify) | model | — | itself | exact |
| `src/schemas/graph.ts` (modify) | model | — | itself + `src/schemas/node.ts` | exact |
| `src/lib/graph-store.ts` (modify) | store | event-driven | itself | exact |
| `src/routes/index.tsx` (modify) | route | request-response | itself | exact |
| `src/routes/__root.tsx` (modify) | config | — | itself | exact |
| `src/components/graph/RoadmapGraph.tsx` (modify) | component | event-driven | itself | exact |
| `src/components/graph/MobileNodeList.tsx` (modify) | component | event-driven | itself | exact |

---

## Pattern Assignments

### `src/lib/filter-utils.ts` (utility, transform)

**Analog:** `src/lib/pathway-utils.ts`

**File header pattern** (lines 1-18):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Module description — one sentence.]
 *
 * Deep module: one export ([functionName]) with a small interface hiding the
 * [algorithm] — callers receive [return type].
 *
 * Pure function: no DOM access, no React, no side effects.
 */
```

**Core pure-function pattern** (pathway-utils.ts lines 43-68):
```typescript
export function computeAncestorEdgeIds(
  nodeId: string,
  edges: Edge[]
): Set<string> {
  const ancestorEdgeIds = new Set<string>();
  // ... pure logic, no side effects, visited-set guard
  return ancestorEdgeIds;
}
```

Apply same pattern for `matchesFilter` and `isFilterActive` — pure functions, typed inputs, exported individually, tested in isolation. No React, no DOM, no Zustand imports.

---

### `src/lib/node-content-query.ts` (utility, request-response)

**Analog:** `src/lib/mock-mastery.ts`

**File header + typed accessor pattern** (mock-mastery.ts lines 1-60):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Description of what this module provides].
 * Phase X only — replaced by [real source] in Phase Y.
 */

export function getMockMastery(nodeId: string): MasteryState {
  return _MOCK_MASTERY[nodeId] ?? "untouched";  // graceful default for unknown IDs
}
```

Apply: `nodeContentQueryOptions(nodeId)` is the single export. Use `queryOptions` from `@tanstack/react-query`. `enabled: nodeId !== null` guards the disabled state.

**Import path alias pattern** (used throughout project):
```typescript
import type { NodeFrontmatter } from "#/schemas/node";
import type { GraphDisplayNode } from "#/schemas/graph";
```
Always use `#/` alias — never relative `../../`.

---

### `src/components/graph/NodeDetailPanel.tsx` (component, event-driven)

**Analog:** `src/components/graph/RoadmapGraph.tsx`

**ClientOnly + provider wrapper pattern** (RoadmapGraph.tsx lines 337-355):
```tsx
export function RoadmapGraph(props: RoadmapGraphProps) {
  return (
    <ClientOnly
      fallback={
        <div
          style={{
            height: "calc(100dvh - 56px)",
            backgroundColor: "var(--color-obsidian-950)",
          }}
          className="animate-pulse"
        />
      }
    >
      <ReactFlowProvider>
        <GraphCanvas {...props} />
      </ReactFlowProvider>
    </ClientOnly>
  );
}
```

Apply: `NodeDetailPanel` is a thin wrapper — it renders null (no ClientOnly fallback needed for a panel) or a transparent div. The inner `NodeDetailPanelInner` component holds all motion state. Structure:
```tsx
export function NodeDetailPanel() {
  return (
    <ClientOnly fallback={null}>
      <NodeDetailPanelInner />
    </ClientOnly>
  );
}
```

**Responsive CSS-only pattern** (RoadmapGraph.tsx → index.tsx lines 158-167):
```tsx
{/* Desktop — hidden below md */}
<div className="hidden md:block" style={{ height: "calc(100dvh - 56px)" }}>
  <RoadmapGraph nodes={nodes} pathway={pathway} />
</div>

{/* Mobile — hidden at md and above */}
<div className="block md:hidden">
  <MobileNodeList nodes={nodes} pathway={pathway} />
</div>
```

Apply: desktop panel gets `className="hidden md:flex ..."`, mobile sheet gets `className="block md:hidden ..."`. No JS media query. No `window.innerWidth`. This is enforced by the project CI grep check.

**Module-scope memoization pattern** (RoadmapGraph.tsx lines 63-71):
```tsx
// MANDATORY — defined at MODULE SCOPE, not inside components
const nodeTypes = {
  mechanic: GraphNode,
  conceptual: GraphNode,
} as const;
```

Apply: store-selector slices for panel state at module scope or as stable references — not inline object literals in `useGraphStore(s => ({ ...s }))`.

**useCallback for all event handlers** (RoadmapGraph.tsx lines 238-261):
```tsx
const handleNodeMouseEnter: NodeMouseHandler = useCallback(
  (_event, node) => {
    useGraphStore.getState().setHoveredNode(node.id, edges);
  },
  [edges]
);

const handleNodeClick: NodeMouseHandler = useCallback(
  (_event, _node) => {
    // Phase 3: open node detail panel
  },
  []
);
```

Apply: `onNodeClick` stub → replace with `useGraphStore.getState().setSelectedNode(node.id)`. Wrap in `useCallback([], [])` — no deps needed (getState is stable).

---

### `src/components/graph/NodePanelContent.tsx` (component, request-response)

**Analog:** `src/components/graph/MobileNodeList.tsx`

**Internal helper component pattern** (MobileNodeList.tsx lines 44-76):
```tsx
/** 1px obsidian-700 horizontal rule between sections. */
function SectionDivider() {
  return (
    <hr
      aria-hidden="true"
      style={{
        border: "none",
        borderTop: "1px solid var(--color-obsidian-700)",
        ...
      }}
    />
  );
}
```

Apply: define sub-components (loading skeleton, error state, section header) as unexported functions at the top of the file. Use `style={{ ... }}` with CSS variable references only — no hardcoded hex values.

**CSS variable token usage** (MobileNodeList.tsx):
```tsx
backgroundColor: "var(--color-obsidian-900)",
borderBottom: "1px solid var(--color-obsidian-700)",
fontFamily: "var(--font-display)",
```

All color/font references must use `var(--color-*)` or `var(--font-*)` tokens from `src/styles/app.css`. No raw hex or Tailwind color classes for brand colors.

**Accessible interactive element pattern** (MobileNodeList.tsx lines 86-113):
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => { /* handler */ }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") { /* handler */ }
  }}
  style={{ cursor: "pointer", outline: "none" }}
>
```

Apply to prerequisite chips (D-14) — same `role="button"` + `tabIndex={0}` + `onKeyDown` pattern.

---

### `src/components/graph/CitationList.tsx` (component, transform)

**Analog:** `src/components/graph/MasteryBadge.tsx` (small display component with enum-driven rendering)

**Pattern:** Small functional component, typed props, no hooks except display logic. Derive science citation indices from `citations.filter(c => c.kind === "science")` array position — no React state for numbering.

```tsx
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

import type { Citation, ScienceCitation } from "#/schemas/node";

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  const scienceCitations = citations.filter(
    (c): c is ScienceCitation => c.kind === "science"
  );
  // ...
}
```

**URL security pattern** (required per RESEARCH.md Pitfall 5):
```tsx
// ONLY render anchor when protocol is http/https
const safe = url?.startsWith("http://") || url?.startsWith("https://");
{safe ? <a href={url} target="_blank" rel="noopener noreferrer">{source}</a> : <span>{source}</span>}
```

---

### `src/components/graph/ProWisdomCallout.tsx` (component, transform)

**Analog:** `src/components/graph/PathwayBanner.tsx` (styled callout block with prominent text)

**PathwayBanner styling pattern** (PathwayBanner.tsx — card-style component with CSS variables):
```tsx
<div
  style={{
    backgroundColor: "var(--color-obsidian-800)",
    border: "1px solid var(--color-obsidian-600)",
    borderRadius: "8px",
    padding: "16px",
  }}
>
  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
    {title}
  </span>
</div>
```

Apply same card-in-obsidian pattern. Creator name uses `var(--font-display)` + 600 weight. Quote text uses `var(--font-body)` + italic. `applicationNote` uses smaller muted text (opacity 0.7).

**URL security pattern** (same as CitationList above — required everywhere citation URLs render).

---

### `src/components/graph/PrerequisiteChips.tsx` (component, event-driven)

**Analog:** `src/components/ui/badge.tsx`

**CVA variant pattern** (badge.tsx lines 1-27):
```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors",
  {
    variants: {
      state: {
        default: "bg-obsidian-700 border border-obsidian-500 hover:border-rune-400",
        // ...
      },
    },
  }
)
```

**Click handler wiring pattern** — chips call `useGraphStore.getState().setSelectedNode(prereqId)` directly (same pattern as hover: use `getState()`, not hook subscription, to avoid re-rendering the chips on unrelated store changes).

---

### `src/components/graph/FilterBar.tsx` (component, event-driven)

**Analog:** `src/routes/index.tsx` top bar div (lines 129-152)

**Top bar structure** (index.tsx lines 129-152):
```tsx
<div
  style={{
    height: "56px",
    display: "flex",
    alignItems: "center",
    paddingInline: "32px",
    backgroundColor: "var(--color-obsidian-900)",
    borderBottom: "1px solid var(--color-obsidian-600)",
  }}
>
  <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600 }}>
    WC3 Roadmap
  </span>
</div>
```

Apply: `FilterBar` renders inside this 56px div as a flex row sibling to the brand span. It uses `useGraphStore` to read `searchQuery` / `activeFilters` and dispatch `setSearchQuery` / `setFilter`. Subscribe to slices — not whole store.

**Zustand slice subscription** (critical — per RESEARCH.md Pitfall 3):
```tsx
// CORRECT — slice subscription avoids re-render on hover changes
const { searchQuery, activeFilters } = useGraphStore((s) => ({
  searchQuery: s.searchQuery,
  activeFilters: s.activeFilters,
}));
// Add shallow comparator from zustand/shallow
```

---

### `content-collections.ts` (modify — transform section)

**Analog:** itself (lines 64-76 — existing transform)

**Existing transform pattern** (content-collections.ts lines 64-75):
```typescript
transform: async (document, context) => {
  // CI enforcement check FIRST
  if (!document.content.includes("## How to Apply")) {
    throw new Error(
      `Node "${document.id}": missing required "## How to Apply" section in MDX body (D-03).` +
        ` Every node must include a "## How to Apply" heading with concrete in-game guidance.`
    );
  }
  const mdx = await compileMDX(context, document);
  return { ...document, mdx };
},
```

**D-13 extension — add dual compileMDX after the existing CI check:**
```typescript
transform: async (document, context) => {
  // CI enforcement — fires BEFORE split (CONT-02, D-13)
  if (!document.content.includes("## How to Apply")) {
    throw new Error(`Node "${document.id}": missing required "## How to Apply" section in MDX body (D-03).` +
      ` Every node must include a "## How to Apply" heading with concrete in-game guidance.`);
  }

  // D-13: split body from howToApply section
  const HOW_TO_APPLY_RE = /^## How to Apply\s*/m;
  const splitIdx = document.content.search(HOW_TO_APPLY_RE);
  const bodyRaw = document.content.slice(0, splitIdx).trim();
  const howToApplyRaw = document.content.slice(splitIdx).trim();

  // Guard: body must have prose before the section
  if (bodyRaw.length === 0) {
    throw new Error(`Node "${document.id}": content body is empty before "## How to Apply".`);
  }

  const mdx = await compileMDX(context, { ...document, content: bodyRaw });
  const mdxHowToApply = await compileMDX(context, { ...document, content: howToApplyRaw });

  return { ...document, mdx, mdxHowToApply };
},
```

**Citation schema mirror** (content-collections.ts lines 54-63 → replace with discriminated union — keep same surrounding structure, only the inner z.object changes):
```typescript
citations: z.array(
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("science"),
      source: z.string().min(1),
      url: z.string().optional(),
      applicationNote: z.string().min(1, { error: "..." }),
    }),
    z.object({
      kind: z.literal("creator"),
      source: z.string().min(1),
      url: z.string().optional(),
      applicationNote: z.string().min(1, { error: "..." }),
      quote: z.string().optional(),
    }),
  ])
),
```

---

### `src/schemas/node.ts` (modify — CitationSchema)

**Analog:** itself (lines 82-95 — existing CitationSchema)

**Existing schema pattern** (node.ts lines 82-95):
```typescript
const CitationSchema = z.object({
  source: z.string().min(1),
  url: z.string().optional(),
  applicationNote: z.string().min(1, {
    error: "Every citation must have a non-empty applicationNote (D-03)",
  }),
});
```

**Replace with — maintain same surrounding structure (private const → used in NodeFrontmatterSchema.extend):**
```typescript
const ScienceCitationSchema = z.object({
  kind: z.literal("science"),
  source: z.string().min(1),
  url: z.string().optional(),
  applicationNote: z.string().min(1, { error: "..." }),
});

const CreatorCitationSchema = z.object({
  kind: z.literal("creator"),
  source: z.string().min(1),
  url: z.string().optional(),
  applicationNote: z.string().min(1, { error: "..." }),
  quote: z.string().optional(),
});

export const CitationSchema = z.discriminatedUnion("kind", [
  ScienceCitationSchema,
  CreatorCitationSchema,
]);
export type Citation = z.infer<typeof CitationSchema>;
export type ScienceCitation = z.infer<typeof ScienceCitationSchema>;
export type CreatorCitation = z.infer<typeof CreatorCitationSchema>;
```

**Zod v4 idiom** (note.ts line 17): use `{ error: "..." }` not `{ message: "..." }`. Already consistent in existing file — maintain this.

---

### `src/schemas/graph.ts` (modify — add skillType + tags)

**Analog:** itself (lines 31-38) + node.ts `.extend()` pattern

**Existing extension pattern** (graph.ts lines 31-38):
```typescript
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});
```

**D-11 extension — add after `difficulty`:**
```typescript
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  // ADR-006: added for GRAPH-04 search/filter (Phase 3)
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
});
```

Update JSDoc comment to reference ADR-006.

---

### `src/lib/graph-store.ts` (modify — add panel + filter state)

**Analog:** itself (lines 39-78)

**Existing store shape** (graph-store.ts lines 39-78):
```typescript
export interface GraphStore {
  hoveredNodeId: string | null;
  ancestorEdgeIds: Set<string>;
  setHoveredNode: (nodeId: string | null, edges: Edge[]) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  hoveredNodeId: null,
  ancestorEdgeIds: new Set<string>(),
  setHoveredNode: (nodeId, edges) => {
    if (nodeId === null) {
      set({ hoveredNodeId: null, ancestorEdgeIds: new Set<string>() });
      return;
    }
    const ancestorEdgeIds = computeAncestorEdgeIds(nodeId, edges);
    set({ hoveredNodeId: nodeId, ancestorEdgeIds });
  },
}));
```

**Extension pattern — add after `setHoveredNode` in both the interface and create() call:**
```typescript
// In GraphStore interface:
selectedNodeId: string | null;
setSelectedNode: (id: string | null) => void;
searchQuery: string;
activeFilters: ActiveFilters;
setSearchQuery: (q: string) => void;
setFilter: (facet: keyof ActiveFilters, values: string[]) => void;
clearFilters: () => void;

// In create() implementation:
selectedNodeId: null,
setSelectedNode: (id) => set({ selectedNodeId: id }),
searchQuery: "",
activeFilters: { race: [], skillType: [], difficulty: [], mastery: [] },
setSearchQuery: (q) => set({ searchQuery: q }),
setFilter: (facet, values) =>
  set((s) => ({ activeFilters: { ...s.activeFilters, [facet]: values } })),
clearFilters: () =>
  set({ searchQuery: "", activeFilters: { race: [], skillType: [], difficulty: [], mastery: [] } }),
```

Export `ActiveFilters` interface — it is imported by `filter-utils.ts`.

---

### `src/routes/index.tsx` (modify — loader projection + FilterBar + NodeDetailPanel)

**Analog:** itself (lines 36-65, 119-171)

**Existing loader projection pattern** (index.tsx lines 43-54):
```typescript
const result = GraphDisplayNodeSchema.safeParse({
  id: n.id,
  title: n.title,
  nodeType: n.nodeType,
  race: n.race,
  prerequisites: n.prerequisites,
  difficulty: n.difficulty,
  // ADR-006: add after difficulty:
  // skillType: n.skillType,
  // tags: n.tags,
});
return result.success ? result.data : null;
```

**Add two fields** after `difficulty: n.difficulty` — explicit projection, no spreading `n` (ADR-002 boundary rule).

**ClientOnly panel mount pattern** (extend Home() JSX — after the two responsive divs):
```tsx
{/* Panel layer — client-only, above both desktop + mobile */}
<ClientOnly fallback={null}>
  <NodeDetailPanel />
</ClientOnly>
```

No new imports beyond what already exists — `ClientOnly` is already imported from `@tanstack/react-router` in `RoadmapGraph.tsx` (import it in `index.tsx` as well).

---

### `src/routes/__root.tsx` (modify — QueryClient setup)

**Analog:** itself (lines 1-43)

**Existing root pattern** (\_\_root.tsx lines 7-29):
```typescript
export const Route = createRootRoute({
  head: () => ({ meta: [...], links: [...] }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
```

**QueryClient addition pattern:**
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Module-scope singleton — not inside component (prevents re-creation on re-render)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

// Wrap children in RootDocument:
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

Note: `Scripts` stays outside `QueryClientProvider` — it renders `<script>` tags, not React components.

---

### `src/components/graph/RoadmapGraph.tsx` (modify — wire onNodeClick)

**Existing stub** (RoadmapGraph.tsx lines 256-261):
```typescript
const handleNodeClick: NodeMouseHandler = useCallback(
  (_event, _node) => {
    // Phase 3: open node detail panel
  },
  []
);
```

**Replace body with:**
```typescript
const handleNodeClick: NodeMouseHandler = useCallback(
  (_event, node) => {
    useGraphStore.getState().setSelectedNode(node.id);
  },
  []
);
```

Same `getState()` pattern used by hover handlers (lines 240, 247) — avoids subscribing the canvas to the store.

**Filter dim — add useMemo after existing `displayNodes` useMemo** (lines 147-164):
```typescript
// existing displayNodes useMemo stays; add a second pass for filter dim:
const { searchQuery, activeFilters } = useGraphStore((s) => ({
  searchQuery: s.searchQuery,
  activeFilters: s.activeFilters,
}));

const filteredDisplayNodes: Node[] = useMemo(() => {
  if (!isFilterActive(searchQuery, activeFilters)) return displayNodes;
  return displayNodes.map((n) => {
    const rawNode = rawNodes.find((r) => r.id === n.id)!;
    const mastery = getMockMastery(n.id);
    const matches = matchesFilter(rawNode, mastery, searchQuery, activeFilters);
    return matches
      ? n
      : { ...n, style: { ...n.style, opacity: 0.15, pointerEvents: "none" as const } };
  });
}, [displayNodes, searchQuery, activeFilters, rawNodes]);
```

Pass `filteredDisplayNodes` to `setNodes` (the existing `useEffect` on line 194-196 — update dep + variable name).

---

### `src/components/graph/MobileNodeList.tsx` (modify — wire onClick)

**Existing no-op** (MobileNodeList.tsx lines 89-95):
```tsx
onClick={() => {
  /* Phase 2 no-op — wired in Phase 3 */
}}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    /* Phase 2 no-op — wired in Phase 3 */
  }
}}
```

**Replace with:**
```tsx
onClick={() => {
  useGraphStore.getState().setSelectedNode(node.id);
}}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    useGraphStore.getState().setSelectedNode(node.id);
  }
}}
```

Add `import { useGraphStore } from "#/lib/graph-store";` — use `getState()` (not hook) to avoid re-rendering the list on every store change.

---

### `src/lib/filter-utils.test.ts` (test)

**Analog:** `src/lib/graph-layout.test.ts`

**Test structure pattern** (graph-layout.test.ts lines 1-40):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for [functionName] — [one-sentence description].
 */
import { describe, it, expect } from "vitest";
import { functionUnderTest } from "./module-name";
import type { TypeName } from "../schemas/schema";

// Fixtures
const nodes: GraphDisplayNode[] = [
  { id: "a", title: "A", nodeType: "MECHANIC", race: "agnostic", prerequisites: [], difficulty: "beginner", skillType: "macro", tags: [] },
  // ...
];

describe("functionUnderTest", () => {
  it("does X when Y", () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expected);
  });
});
```

---

### `src/lib/node-content-query.test.ts` (test)

**Analog:** `src/lib/mock-mastery.test.ts`

Same test file structure as above. Test: `nodeContentQueryOptions(null).enabled === false`, `nodeContentQueryOptions("map-control").queryKey` shape, `queryFn` returns node / throws for unknown ID.

---

## Shared Patterns

### SPDX File Header
**Source:** Every `.ts/.tsx` file in the project
**Apply to:** All new files
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

### Import Path Aliases
**Source:** All files (e.g., `src/lib/graph-store.ts` line 34, `src/components/graph/RoadmapGraph.tsx` line 48)
**Apply to:** All new files
```typescript
import { GraphDisplayNode } from "#/schemas/graph";     // ✓ alias
import { computeLayout } from "#/lib/graph-layout";     // ✓ alias
// Never: import { ... } from "../../schemas/graph"     // ✗ relative
```

### CSS Variable Tokens (No Hardcoded Hex)
**Source:** `src/routes/index.tsx` lines 134-151, `src/components/graph/MobileNodeList.tsx`
**Apply to:** All new components
```tsx
// ✓ Always:
backgroundColor: "var(--color-obsidian-900)"
border: "1px solid var(--color-obsidian-600)"
fontFamily: "var(--font-display)"
// ✗ Never: backgroundColor: "#1a1a2e" or className="bg-obsidian-900" for brand colors
```

### Zustand getState() for Event Handlers (No Store Subscription in Producers)
**Source:** `src/components/graph/RoadmapGraph.tsx` lines 240, 247
**Apply to:** `FilterBar.tsx` (write path), `RoadmapGraph.tsx` (onNodeClick), `MobileNodeList.tsx` (onClick), `PrerequisiteChips.tsx` (onClick)
```typescript
// Produce: always use getState() in event handlers to avoid subscribing
useGraphStore.getState().setSelectedNode(node.id);

// Consume: subscribe to slices in render components
const searchQuery = useGraphStore((s) => s.searchQuery);
```

### Obsidian/Rune-Gold Design Tokens (ADR 0001)
**Source:** `src/styles/app.css` + `docs/adr/0001-visual-design-direction.md`
**Apply to:** All new UI components (panel, callout, chips, filter bar)

Key tokens from `app.css`:
- Surface hierarchy: `obsidian-950` (page bg) → `obsidian-900` (panel bg) → `obsidian-800` (card bg)
- Border: `obsidian-700` (divider) / `obsidian-600` (panel border)
- Accent: `rune-400` (gold — interactive elements, highlighted states)
- Display font: `var(--font-display)` (Space Grotesk)
- Body font: `var(--font-body)` (Outfit)
- Mono font: `var(--font-mono)` (JetBrains Mono — citation indices)

### URL Security (Citation Links)
**Source:** RESEARCH.md §Pitfall 5, §Q4
**Apply to:** `CitationList.tsx`, `ProWisdomCallout.tsx`
```tsx
const isSafeUrl = (url?: string) =>
  url?.startsWith("http://") || url?.startsWith("https://");

// In render:
{isSafeUrl(citation.url) ? (
  <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.source}</a>
) : (
  <span>{citation.source}</span>
)}
```

### Spotlight/Dim Pattern (Reuse from Phase 2)
**Source:** `src/components/graph/RoadmapGraph.tsx` lines 147-164
**Apply to:** Filter dim computation in `GraphCanvas` (extend `displayNodes` useMemo)
```typescript
// Phase 2 pathway dim pattern — extend, do NOT replace:
const style = !exploring && !isPathwayNode
  ? { opacity: 0.2, pointerEvents: "none" as const }
  : { opacity: 1, pointerEvents: "auto" as const };
// Filter dim layered on top: opacity 0.15 (dimmer than pathway 0.2)
```

### Parallel-Schema Sync Rule
**Source:** `content-collections.ts` lines 9-13, `src/schemas/node.ts` lines 22-28
**Apply to:** `CitationSchema` discriminated union change (must land in BOTH files in the same commit)
```
// Comment that must appear in both files:
// PARALLEL-SCHEMA SYNC NOTE: mirror every schema change in src/schemas/node.ts
// AND content-collections.ts (plan 01-06). These two definitions must stay
// field-for-field identical.
```

---

## No Analog Found

All files have direct analogs in the codebase. No new-to-the-project patterns required.

---

## Metadata

**Analog search scope:** `src/`, `content-collections.ts`
**Files scanned:** 18 source files (full read), 2 test files (partial read)
**Pattern extraction date:** 2026-06-29
