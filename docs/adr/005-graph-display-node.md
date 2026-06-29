# ADR 005: GraphDisplayNode — Single-Field Projection onto NodeSummary

**Status:** Accepted
**Date:** 2026-06-29
**Phase:** 02-graph-engine

---

## Context

The graph node face (D-04) requires `difficulty` — the relative learning curve
of a node (`beginner | intermediate | advanced`) — so it can render a visual
difficulty marker alongside the node title and type icon.

`difficulty` lives on `NodeFrontmatterSchema`, not on `NodeSummarySchema`.
`NodeSummary` is the graph engine's designated data type (ADR 002); it carries
only the five display-essential fields: `id`, `title`, `nodeType`, `race`, and
`prerequisites`.

ADR 002 is explicit: **the graph engine must not import `NodeFrontmatter` or
any content-only field**. `difficulty` is not a content field — it is a display
attribute for the graph face — so it is eligible to cross the boundary, but
the mechanism must be deliberate and documented.

---

## Decision

Introduce a **narrow projection schema**, `GraphDisplayNode`, defined in
`src/schemas/graph.ts`:

```typescript
// src/schemas/graph.ts
import { NodeSummarySchema } from './node';

export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
```

`GraphDisplayNode` extends `NodeSummary` with **exactly one field**:
`difficulty`. This is the graph engine's typed import. Graph components type
their props to `GraphDisplayNode[]`; TypeScript enforces the ADR 002 boundary
at compile time.

The content pipeline (route loader or server function) projects
`NodeFrontmatter[]` to `GraphDisplayNode[]` before passing data to the graph
component. The graph component never receives — and never needs — `NodeFrontmatter`.

**Rule:** Adding any further field to `GraphDisplayNode` requires a new ADR.
The purpose of this rule is to keep the graph-boundary addition explicit and
deliberate so the decoupling established by ADR 002 is never silently eroded.

---

## Consequences

**Positive:**
- The graph engine can display the difficulty marker (D-04) without violating
  the ADR 002 boundary.
- TypeScript enforces the projection at the props layer — no content-surface
  import can accidentally reach the graph engine.
- The boundary remains narrow: graph.ts imports `NodeSummarySchema` from
  `./node` and `z` from `zod` — nothing else.
- Future filtering by difficulty (GRAPH-04, Phase 3) reads from the same
  `GraphDisplayNode.difficulty` field — no schema migration needed.

**Negative / trade-offs:**
- The content pipeline must project `NodeFrontmatter[]` to `GraphDisplayNode[]`
  at the route loader layer (a one-line map). This is a trivial cost.
- A field mismatch between `NodeFrontmatterSchema.difficulty` and
  `GraphDisplayNodeSchema.difficulty` would be a silent bug. Mitigated: both
  use the same `z.enum(['beginner','intermediate','advanced'])` literal;
  divergence is caught by CI schema tests.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Add `difficulty` to `NodeSummarySchema` directly | `difficulty` is a content attribute (D-07); `NodeSummary` is the minimal graph-display subset. Adding it would couple `NodeSummary` to content decisions and bloat every consumer that only needs `id/title/nodeType`. |
| Allow the graph engine to import `NodeFrontmatter` | Violates ADR 002. Graph bundle would carry full citation data and patch fields for all nodes simultaneously. |
| Pass difficulty as a separate lookup map | More complex plumbing than a projection; no type safety improvement. |
| No projection (render graph without difficulty) | Does not implement D-04. |
