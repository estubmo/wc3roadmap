# Phase 2: Graph Engine - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 23 new/modified files
**Analogs found:** 23 / 23 (all have a project analog; graph-specific libraries have no prior project usage — RESEARCH.md patterns apply there)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/schemas/graph.ts` | schema | transform | `src/schemas/mastery.ts` | exact |
| `src/schemas/pathway.ts` | schema | transform | `src/schemas/mastery.ts` | exact |
| `src/lib/graph-layout.ts` | utility | transform | `scripts/lib/validators.ts` | role-match |
| `src/lib/graph-store.ts` | utility | event-driven | `src/lib/patches.ts` | role-match |
| `src/lib/mock-mastery.ts` | utility | transform | `src/lib/patches.ts` | role-match |
| `src/lib/pathway-utils.ts` | utility | transform | `scripts/lib/validators.ts` | exact |
| `src/components/graph/RoadmapGraph.tsx` | component | request-response | `src/routes/index.tsx` | role-match |
| `src/components/graph/GraphNode.tsx` | component | event-driven | `src/routes/index.tsx` | role-match |
| `src/components/graph/GraphEdge.tsx` | component | event-driven | `src/routes/index.tsx` | role-match |
| `src/components/graph/MobileNodeList.tsx` | component | request-response | `src/routes/index.tsx` | role-match |
| `src/components/graph/PathwayBanner.tsx` | component | request-response | `src/routes/index.tsx` | role-match |
| `src/routes/index.tsx` (modify) | route | request-response | `src/routes/index.tsx` | exact |
| `src/routes/preview/pathway.tsx` | route | request-response | `src/routes/index.tsx` | exact |
| `src/routes/preview/mastery-states.tsx` | route | request-response | `src/routes/index.tsx` | exact |
| `src/routes/preview/full-map.tsx` | route | request-response | `src/routes/index.tsx` | exact |
| `src/routes/preview/mobile.tsx` | route | request-response | `src/routes/index.tsx` | exact |
| `pathways/beginner-fundamentals.json` | config | transform | `scripts/validate-content.ts` (data it consumes) | partial |
| `scripts/validate-pathway.ts` | utility | transform | `scripts/validate-content.ts` | exact |
| `src/lib/graph-layout.test.ts` | test | transform | `src/lib/patches.test.ts` | exact |
| `src/schemas/graph.test.ts` | test | transform | `src/schemas/node.test.ts` | exact |
| `src/schemas/pathway.test.ts` | test | transform | `src/schemas/node.test.ts` | exact |
| `src/lib/pathway-utils.test.ts` | test | transform | `src/lib/patches.test.ts` | exact |
| `src/styles/app.css` (modify) | config | — | `src/styles/app.css` | exact |

---

## Pattern Assignments

### `src/schemas/graph.ts` (schema, transform)

**Analog:** `src/schemas/mastery.ts`

**Imports pattern** (mastery.ts lines 1–22):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Module doc — 3-5 lines: what this schema is, which ADR/DATA requirement it
 * satisfies, what Phase adds it, what is intentionally deferred.]
 */

import { z } from "zod";
import { NodeSummarySchema } from "./node";
```

**Core schema pattern** (mastery.ts lines 35–60):
```typescript
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
```
Pattern: `.extend()` to compose a strict superset; `z.infer<>` for the TS type immediately after.

**No error handling** — schemas are pure Zod declarations; validation errors surface at the caller's `.safeParse()` call.

---

### `src/schemas/pathway.ts` (schema, transform)

**Analog:** `src/schemas/mastery.ts`

**Full pattern** (mastery.ts lines 1–60, adapted):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway schema — static pathway data file structure (D-10).
 * ...
 */

import { z } from "zod";

export const PathwaySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  steps: z.array(z.string()).min(1),
});
export type Pathway = z.infer<typeof PathwaySchema>;
```
Note: `.min(1)` on strings (never raw `z.string()`), same convention as `src/schemas/node.ts` CitationSchema.

---

### `src/lib/graph-layout.ts` (utility, transform)

**Analog:** `scripts/lib/validators.ts`

**File header + deep-module doc** (validators.ts lines 1–12):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Short module purpose].
 *
 * Deep module: [one sentence on the interface/implementation ratio].
 * [What the function accepts, what it returns, no side-effects].
 */
```

**Pure function signature pattern** (validators.ts lines 33–48):
```typescript
export function computeLayout(
  nodes: GraphDisplayNode[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  // implementation
  return { nodes: layoutedNodes, edges };
}
```
Pattern: pure functions, typed parameters with defaults, return typed value, no side-effects. Same as `validatePrerequisiteIds(nodes, ...)` → errors[].

---

### `src/lib/pathway-utils.ts` (utility, transform)

**Analog:** `scripts/lib/validators.ts`

Same pure-function pattern as graph-layout. BFS ancestor chain:
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Ancestor edge BFS for edge highlight state (D-03).
 * Pure function — no side effects, testable in isolation.
 */

export function computeAncestorEdgeIds(
  nodeId: string,
  edges: Edge[]
): Set<string> {
  // BFS implementation
}
```

**Minimal interface pattern** (validators.ts lines 14–25): define a local interface with only the fields the function needs — don't import the full schema type:
```typescript
interface NodeWithPrereqs {
  readonly id: string;
  readonly prerequisites: readonly string[];
}
```

---

### `src/lib/graph-store.ts` (utility, event-driven)

**Analog:** `src/lib/patches.ts`

**File header** (patches.ts lines 1–9):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * [Module doc].
 */
```

**Module-level const + exported functions pattern** (patches.ts lines 32–60):
```typescript
// Private implementation
const _PATCHES = [...] as const satisfies readonly PatchEntry[];

// Public read-only view
export const PATCHES: readonly PatchEntry[] = _PATCHES;

// Exported accessor
export function getPatch(id: string): PatchEntry {
  const patch = _PATCHES.find((p) => p.id === id);
  if (!patch) throw new Error(`Unknown patch id: "${id}"`);
  return patch;
}
```
Adapt: private Zustand store + exported `useGraphStore` hook. The "private impl / public surface" split is the pattern to copy.

---

### `src/lib/mock-mastery.ts` (utility, transform)

**Analog:** `src/lib/patches.ts`

Same pattern as patches.ts — a typed const registry with a typed accessor. The mastery map is a `Record<string, MasteryState>` keyed by node ID. Mark with `// Phase 2 only — replaced by real persistence in Phase 5` in JSDoc.

---

### `src/components/graph/RoadmapGraph.tsx` (component, request-response)

**Analog:** `src/routes/index.tsx`

**File header** (index.tsx lines 1–2):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

**Typed props + named component function** (index.tsx lines 5–7):
```typescript
// No default exports. Named function components only.
function Home() { ... }
```
Adapt: `export function RoadmapGraph({ nodes, pathway }: RoadmapGraphProps) { ... }` — named export, typed props interface declared above.

**No existing React component analog for @xyflow/react** — use RESEARCH.md Pattern 2 (`ClientOnly` + `useMemo` + `ReactFlowProvider`) as the implementation template.

---

### `src/components/graph/GraphNode.tsx` (component, event-driven)

**Analog:** `src/routes/index.tsx` (for SPDX header + named export convention only)

**No existing memoized component analog** — use RESEARCH.md Pattern 3 (`React.memo`, `NodeProps`, `Handle`) as the implementation template. Key constraint from RESEARCH.md:
- `export const GraphNode = memo(function GraphNode(...) {...})` — named inner function for React DevTools
- CVA for mastery state variants (untouched / in-progress / mastered × MECHANIC / CONCEPTUAL)

---

### `src/components/graph/GraphEdge.tsx` (component, event-driven)

**Analog:** `src/routes/index.tsx` (SPDX + named export only)

**No existing animated SVG component analog** — use RESEARCH.md Pattern 4 (`motion.path`, `getBezierPath`, per-edge Zustand selector `s.ancestorEdgeIds.has(id)`).

---

### `src/components/graph/MobileNodeList.tsx` (component, request-response)

**Analog:** `src/routes/index.tsx`

Pure HTML list component — no @xyflow/react. Copy SPDX header + named export convention. Use `className="block md:hidden"` wrapper (RESEARCH.md mobile pattern). Props: `{ nodes: GraphDisplayNode[], pathway: Pathway }`.

---

### `src/components/graph/PathwayBanner.tsx` (component, request-response)

**Analog:** `src/routes/index.tsx`

Overlay component. SPDX + named export. Renders pathway title/subtitle + step count + "Explore full map" button. No @xyflow/react dependency.

---

### `src/routes/index.tsx` (modify — route, request-response)

**Analog:** `src/routes/index.tsx` (current file)

**Current route pattern** (index.tsx lines 1–18):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (...);
}
```
Extend by adding a `loader` to `createFileRoute("/")({ loader, component })`. The loader projects `allNodes` (content-collections) to `GraphDisplayNode[]` and loads `pathways/beginner-fundamentals.json`.

---

### `src/routes/preview/pathway.tsx`, `mastery-states.tsx`, `full-map.tsx`, `mobile.tsx` (routes)

**Analog:** `src/routes/index.tsx`

Identical shell pattern:
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/pathway")({ component: PreviewPathway });

function PreviewPathway() { ... }
```
Each preview route imports mocked data and renders the relevant component in isolation. No `loader` needed — use `mock-mastery.ts` directly.

---

### `scripts/validate-pathway.ts` (utility, transform)

**Analog:** `scripts/validate-content.ts`

**Full orchestrator pattern** (validate-content.ts lines 1–56):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Purpose doc].
 *
 * IMPORTANT BUILD ORDERING: ...
 * Exits non-zero with a clear error list on any validation failure.
 */

import { allNodes } from "content-collections";
import { PathwaySchema } from "../src/schemas/pathway";
import { readFileSync } from "node:fs";

function main(): void {
  const errors: string[] = [];
  // validators push into errors[]
  if (errors.length > 0) {
    console.error("\n=== Pathway Validation Errors ===");
    for (const error of errors) { console.error(`  x ${error}`); }
    process.exit(1);
  }
  console.log(`Pathway validation passed.`);
}

main();
```
Option: extend `validate-content.ts` with a fourth validator call instead of a new file — planner decides.

---

### Test files: `*.test.ts` (tests)

**Analog:** `src/schemas/node.test.ts` (schema tests) and `src/lib/patches.test.ts` (utility tests)

**Schema test pattern** (node.test.ts lines 1–13):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for [SchemaName] ([requirement ref]).
 */
import { describe, it, expect } from "vitest";
import { GraphDisplayNodeSchema } from "./graph";
```

**Fixture pattern** (node.test.ts lines 19–46):
```typescript
/** Minimal valid [TypeName] — [one-line description]. */
const validFoo = {
  field: "value",
  ...
};
```

**Test structure** (node.test.ts lines 52–113): `describe` blocks grouped by acceptance / rejection / edge cases. Use `it("accepts ...")` / `it("rejects ...")` naming. Each `it` has one `expect`.

**Pure function test pattern** (patches.test.ts — colocated, same SPDX header + vitest imports). For `computeLayout` and `computeAncestorEdgeIds`: pass plain arrays, assert on output shape — no mocks, no DOM.

---

### `pathways/beginner-fundamentals.json` (config data)

**No direct analog** (first JSON data file in the project). Shape from RESEARCH.md Pattern 7:
```json
{
  "id": "beginner-fundamentals",
  "title": "Beginner Fundamentals",
  "subtitle": "8 foundational skills — start here",
  "steps": ["map-control", "..."]
}
```
Validated by `PathwaySchema` at load time and by `validate-pathway.ts` in CI.

---

### `src/styles/app.css` (modify — config)

**Analog:** `src/styles/app.css` (existing file)

Add at top of file (before `@import "tailwindcss"`):
```css
@import '@xyflow/react/dist/style.css';
```
This is the only required modification. The existing token declarations (`--color-obsidian-*`, `--color-rune-*`, fonts) are consumed unchanged by graph components via CSS variable references.

---

## Shared Patterns

### SPDX Header (all hand-authored `.ts` / `.tsx`)
**Source:** Every file in the project  
**Apply to:** All new `.ts` and `.tsx` files
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

### Named exports only — no default exports
**Source:** `src/routes/index.tsx` line 5, `src/schemas/node.ts` lines 70 / 164  
**Apply to:** All components, schemas, utilities

### Module-level JSDoc block
**Source:** `src/schemas/node.ts` lines 4–28, `scripts/lib/validators.ts` lines 4–12  
**Apply to:** All new `.ts` / `.tsx` files — minimum 3-line purpose statement + relevant ADR/DATA refs

### Zod v4 idioms
**Source:** `src/schemas/node.ts` lines 30–96  
**Apply to:** `src/schemas/graph.ts`, `src/schemas/pathway.ts`
```typescript
// z.enum([...])       — never z.nativeEnum()
// { error: "..." }    — never { message: "..." }
// .min(1)             — on all string fields that must be non-empty
// .extend()           — to compose schema supersets
// z.infer<typeof X>   — immediately after schema declaration
```

### Pure validator pattern (return string[] errors, no side-effects)
**Source:** `scripts/lib/validators.ts` lines 33–78  
**Apply to:** `scripts/validate-pathway.ts`, `src/lib/pathway-utils.ts`

### Colocated test files
**Source:** `src/schemas/node.test.ts`, `src/lib/patches.test.ts`, `scripts/lib/validators.test.ts`  
**Apply to:** All new `.ts` utility and schema files — test file lives next to the module file, same directory

### Design token consumption via CSS variables
**Source:** `src/styles/app.css` (token declarations); `docs/adr/0001-visual-design-direction.md`  
**Apply to:** All component style props and `className` values
```typescript
// Use CSS variable refs, never hardcoded hex values:
stroke: 'var(--color-rune-400)'      // edge highlight
stroke: 'var(--color-obsidian-700)'  // edge at rest
// bg-obsidian-800, border-rune-500, etc. via Tailwind v4 theme
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `pathways/beginner-fundamentals.json` | config | — | First JSON data file; no prior project JSON data files |
| `src/components/graph/GraphNode.tsx` | component | event-driven | No memoized @xyflow/react custom node components exist yet |
| `src/components/graph/GraphEdge.tsx` | component | event-driven | No Motion-animated SVG components exist yet |
| `src/lib/graph-store.ts` | utility | event-driven | No Zustand stores exist yet |

For these four files, RESEARCH.md Patterns 3, 4, 5 are the authoritative templates (they are derived from official @xyflow/react and motion.dev documentation, not invented).

---

## Metadata

**Analog search scope:** `src/`, `scripts/`  
**Files scanned:** 14 (all existing source files)  
**Pattern extraction date:** 2026-06-29
