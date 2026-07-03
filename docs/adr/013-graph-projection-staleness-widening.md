# ADR 013: GraphDisplayNode — Staleness Projection Boundary Widening

**Status:** Accepted
**Date:** 2026-07-03
**Phase:** 09-guided-pathways-launch

---

## Context

D-08 requires an **on-canvas staleness marker**: a player should be able to spot
a stale node directly on the graph face — without opening each node's detail
panel — so they know at a glance which guidance was calibrated for a patch that
has since moved on.

Staleness is **content-derived**. The single staleness rule
(`src/lib/staleness.ts`, `isStale`) is
`metaVolatile && patchId !== currentPatchId` (D-06). Both inputs —
`meta_volatile` and `patchId` — live on `NodeFrontmatter`, the content surface.
They are precisely the kind of content-only field that ADR 002 forbids the
graph engine from importing: the graph engine depends only on the narrow
`GraphDisplayNode` projection and must never reach behind the content schema's
interface.

Rendering the marker naively would mean pulling `meta_volatile` and `patchId`
onto the graph layer — a direct violation of ADR 002. The
ADR 005 / ADR 006 rule is also explicit: **any field addition to
`GraphDisplayNode` requires its own ADR** so the boundary widening stays
deliberate and documented. This ADR records that decision for the staleness
field.

---

## Decision

Add **exactly one derived boolean**, `stale`, to `GraphDisplayNodeSchema`
(`src/schemas/graph.ts`):

```typescript
// src/schemas/graph.ts
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
  stale: z.boolean(),
});
```

`stale` is **computed in the index.tsx loader (09-10)** via the single `isStale`
predicate — `isStale(meta_volatile, patchId, CURRENT_PATCH.id)` — during the
explicit field-by-field projection from `NodeFrontmatter[]` to
`GraphDisplayNode[]`. The source content fields (`meta_volatile`, `patchId`)
**never cross the boundary**; only the already-derived boolean does. The graph
face (`GraphNode`, 09-11) reads `node.stale` to render the marker and never
touches content fields.

This keeps the ADR 002 decoupling intact in spirit: the graph engine still has
no dependency on the content schema's shape. What crosses the seam is a single
computed display attribute — not raw content — exactly as `difficulty` (ADR 005)
and `skillType` / `tags` (ADR 006) do.

**Rule (reaffirmed):** Any further field addition to `GraphDisplayNode` still
requires its own ADR. This is the first widening since ADR 006; the boundary is
not frozen, only ADR-gated.

---

## Consequences

**Positive:**
- The on-canvas staleness marker (D-08) renders from a typed boolean off the
  node projection — no content query, no content-field import on the graph
  layer.
- The staleness rule stays in exactly one place (`isStale`, D-06); the loader is
  the sole caller for the graph projection, the node panel the other caller.
- TypeScript enforces the projection at the props layer — the graph engine still
  cannot accidentally import `NodeFrontmatter`.

**Negative / trade-offs:**
- The projection boundary widens by one field. Accepted deliberately and
  ADR-gated (this ADR) so the ADR 002 decoupling is never silently eroded.
- The loader must compute `stale` during projection (one `isStale` call per
  node). Trivial cost; the alternative — leaking `meta_volatile` / `patchId`
  onto the graph — is strictly worse for coupling.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Pull `meta_volatile` + `patchId` onto `GraphDisplayNode` and compute staleness in the graph component | Directly violates ADR 002 — raw content fields cross the boundary and the graph engine gains a content dependency. |
| Load node content in the graph node to compute staleness on click | Defeats D-08 (marker must be visible on the canvas without opening each panel) and reintroduces per-node content coupling. |
| Pass a separate `staleMap: Record<id, boolean>` alongside the nodes | More plumbing than a projection field, no type-safety gain, and splits the node's display data across two structures. |
| Freeze the projection and render no on-canvas marker | Does not implement D-08. |
