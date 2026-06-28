# ADR 002: Content / Graph Engine Decoupling

**Status:** Accepted
**Date:** 2026-06-28
**Phase:** 01-foundation-schema

---

## Context

The WC3 Roadmap has two consuming surfaces for node data:

1. **The graph engine** (Phase 2) — renders the interactive node graph. Needs
   only the data required to display each node: id, title, nodeType, race,
   prerequisites, and mastery state. Must stay fast as the graph can have
   50–200 nodes loaded simultaneously.

2. **The node detail panel** (Phase 3) — renders the full MDX content of a
   single selected node: all frontmatter fields, citations with
   `applicationNote`, the compiled MDX body, and the "## How to Apply"
   section.

If the graph engine receives the full node content for all nodes at once, it
pays a heavy parsing and bundle cost for content that is only needed when a
player clicks a node. More critically, it **couples** the graph engine to the
content schema — any content field addition or change becomes a potential
graph regression.

DATA-02 requires: "Node content schema Zod-validated and **decoupled from
graph/UI** (graph receives only display-essential data; full content loads
lazily)."

---

## Decision

**The content schema is a deep module. The graph engine never reaches behind
its interface.**

Two distinct schema surfaces are defined in `src/schemas/node.ts`:

### NodeSummary — graph display layer

```typescript
// display-essential fields only
export const NodeSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
  race: z.enum(["agnostic", "human", "orc", "undead", "nightelf"]),
  prerequisites: z.array(z.string()),
});
export type NodeSummary = z.infer<typeof NodeSummarySchema>;
```

`NodeSummary` is the **only** type the graph engine and graph-engine tests
import. It is the seam between the graph engine and the content system.

### NodeFrontmatter — full validated schema

`NodeFrontmatterSchema` extends `NodeSummarySchema` with all remaining fields:
`skillType`, `difficulty`, `tags`, `patchId`, `patch_context`, `last_reviewed`,
`meta_volatile`, and `citations`. The content pipeline and node detail panel
use `NodeFrontmatter`.

### Lazy loading

When a player clicks a node in the graph, the node detail panel loads the full
`NodeFrontmatter` + compiled MDX body on demand via TanStack Query (Phase 3).
The graph engine never holds full content in memory.

### Interface contract

The graph engine depends on `NodeSummary[]` — a flat array of plain objects.
The graph engine is **not** allowed to:

- Import from `src/schemas/node.ts` beyond `NodeSummary` / `NodeSummarySchema`.
- Call the content-collections generated API directly.
- Access `citations`, `patch_context`, `meta_volatile`, or `mdx` at render
  time.

Violations of this boundary are caught at the TypeScript type level — the
graph component's props are typed to `NodeSummary[]`, not `NodeFrontmatter[]`.

---

## Consequences

**Positive:**
- Graph renders from a lightweight payload; initial page load is fast regardless
  of how much content is in each node.
- Content schema can add, rename, or restructure fields without touching the
  graph engine.
- Graph engine is fully testable in isolation: any `NodeSummary[]` fixture is
  sufficient — no MDX, no patch registry, no citations needed.
- Decoupled surfaces enable independent caching strategies: graph data is
  relatively static (revalidates on publish); node content can have a longer
  `staleTime` since it only loads on click.

**Negative / trade-offs:**
- Two schema types to maintain in sync (NodeSummary must be a strict subset of
  NodeFrontmatter). Enforced by `NodeFrontmatterSchema.extend(...)` rather than
  duplication — schema divergence is a compile error.
- Node detail panel requires a secondary fetch per click (mitigated by
  TanStack Query prefetching when a node is hovered).

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Pass full `NodeFrontmatter[]` to the graph | Graph bundle carries full MDX + citations for all nodes; couples graph to content schema |
| Separate content and metadata into different MDX collections | Splits the "one file = one node" authoring invariant; harder for Claude-generated content pipeline |
| GraphQL selection sets to project fields at query time | Over-engineered; static content pipeline doesn't need runtime field selection |
