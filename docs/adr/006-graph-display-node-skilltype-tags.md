# ADR 006: GraphDisplayNode — skillType and Tags Projection Extension

**Status:** Accepted
**Date:** 2026-06-29
**Phase:** 03-content-pipeline-node-panel

---

## Context

ADR 005 introduced `GraphDisplayNode` as a narrow projection schema that extends
`NodeSummarySchema` with exactly one additional field — `difficulty`. The ADR 005
decision included a standing rule:

> **Rule:** Adding any further field to `GraphDisplayNode` requires a new ADR.
> The purpose of this rule is to keep the graph-boundary addition explicit and
> deliberate so the decoupling established by ADR 002 is never silently eroded.

Phase 3 introduces GRAPH-04: search and filter on the graph layer. Two capabilities
require additional data on the `GraphDisplayNode`:

1. **Skill-type filtering** — the user can filter graph nodes by `skillType`
   (`macro | micro | mental`), as specified in D-10 and D-11.
2. **Tag search** — free-text search matches `title + tags[]` (D-10). The `tags`
   field is needed on the graph layer so the filter computation does not need to
   cross back into `NodeFrontmatter`.

Both `skillType` and `tags` already exist on `NodeFrontmatterSchema` (defined in
Phase 1, DATA-07). They are present in all 13 seed MDX files. No schema migration
or content update is needed — this ADR only records the decision to surface these
two fields across the content/graph boundary.

`skillType` and `tags` are display-classification attributes, not content-body
fields (they are not `citations`, `patch_context`, or MDX body content). They are
equivalent in nature to `difficulty` from ADR 005 — metadata that informs how the
graph UI presents and filters nodes, without exposing the detailed learning content
to the graph layer.

---

## Decision

Extend `GraphDisplayNodeSchema` in `src/schemas/graph.ts` by adding `skillType`
and `tags` after `difficulty`:

```typescript
// src/schemas/graph.ts
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  // ADR-006: added for GRAPH-04 search/filter (Phase 3, D-11)
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
});
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
```

The route loader (`src/routes/index.tsx`) projects these fields explicitly by name:

```typescript
const result = GraphDisplayNodeSchema.safeParse({
  id: n.id,
  title: n.title,
  nodeType: n.nodeType,
  race: n.race,
  prerequisites: n.prerequisites,
  difficulty: n.difficulty,
  skillType: n.skillType,  // ADR-006
  tags: n.tags,            // ADR-006
});
```

**No spreading of `n` is permitted.** The explicit field-by-field projection
preserves the ADR 002 content/graph decoupling — only display-essential fields
cross the boundary. `GraphDisplayNodeSchema.safeParse` strips any extra fields,
providing a second layer of enforcement.

**Rule maintained:** Any further addition to `GraphDisplayNode` beyond the fields
currently listed (`id`, `title`, `nodeType`, `race`, `prerequisites`, `difficulty`,
`skillType`, `tags`) requires a new ADR. This rule is carried forward unchanged
from ADR 005.

---

## Consequences

**Positive:**
- GRAPH-04 filter and search can operate entirely on `GraphDisplayNode[]` without
  importing or accessing `NodeFrontmatter`.
- TypeScript enforces the projection at the props layer — components typed to
  `GraphDisplayNode` cannot access content-only fields.
- The `skillType` enum (`macro | micro | mental`) matches `NodeFrontmatterSchema`
  exactly — no value-set divergence risk.
- `tags: z.array(z.string())` accepts an empty array — no seed-content change
  required for nodes with no tags.
- The filter computation (`filter-utils.ts`, Plan 03-09) remains a pure function
  over `GraphDisplayNode[]` — no content-layer import needed.

**Negative / trade-offs:**
- The projection now has three additions beyond `NodeSummary`. As the list grows,
  the "requires a new ADR" friction increases proportionally. This is intentional
  — it keeps additions deliberate and visible.
- A value-set divergence between `NodeFrontmatterSchema.skillType` and
  `GraphDisplayNodeSchema.skillType` would be a silent bug. Mitigated: both use
  `z.enum(["macro","micro","mental"])` inline; divergence caught by CI schema
  tests (if enum values change, both must be updated).

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Add `skillType` + `tags` to `NodeSummarySchema` directly | `NodeSummary` is the minimal graph-display subset; adding filter attributes would couple every consumer of `NodeSummary` to display-layer decisions. |
| Allow the filter layer to import `NodeFrontmatter` alongside `GraphDisplayNode` | Violates ADR 002. The graph engine bundle would carry full citation data, MDX content, and patch fields for all 13+ nodes simultaneously. |
| Compute filter values server-side and return them as a separate lookup map | More complex plumbing, no type-safety improvement over an explicit projection field. |
| Allow `...n` spread in the loader projection | Would pass all `NodeFrontmatter` fields to `safeParse` — the schema strips them, but the intent is lost and a future schema loosening could cause a silent leak. Explicit projection is required per ADR 002. |

---

## Related Decisions

- **D-11** — `skillType` + `tags` extension requires ADR per ADR-005 rule
- **D-10** — Free-text search matches `title + tags[]`; facets include `race`, `skillType`, `difficulty`, `mastery`
- **ADR 002** — Content/graph decoupling; explicit projection boundary
- **ADR 005** — `GraphDisplayNode` single-field projection precedent; "further field requires new ADR" rule origin
- **GRAPH-04** — Search/filter requirement driving this extension
