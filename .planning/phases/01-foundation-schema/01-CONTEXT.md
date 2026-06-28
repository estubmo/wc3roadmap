# Phase 1: Foundation & Schema - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the typed, Zod-validated content schema as the single source of truth for the project: MECHANIC/CONCEPTUAL node taxonomy, a system-wide patch-version primitive, and foundational mastery-threshold + progress-record schemas. Wire CI to reject malformed content. License the project GPL-3.0 with pinned TanStack Start dependencies and a documented upgrade policy. Scaffold a minimal, deployable TanStack Start app and the architecture foundations (`CONTEXT.md` domain language + `docs/adr/`).

**In scope:** content/data schema (Zod), patch registry primitive, three patch-versioned schemas (node, masteryThreshold, progressRecord), CI validation, GPL-3.0 license, dependency pinning + upgrade policy, minimal deployable app + live Vercel deploy, `CONTEXT.md` (domain language) + foundational ADRs.

**Out of scope (own phases):** the React Flow graph engine (Phase 2), the MDX content-authoring/rendering pipeline + node detail panel (Phase 3), auth/database (Phase 4), progress persistence features (Phase 5+), quizzes, w3champions sync, replay parsing. Phase 1 defines the *schemas* these depend on but builds none of their features.

</domain>

<decisions>
## Implementation Decisions

### Node Authoring Format
- **D-01:** Nodes are authored as **one `.mdx` file per node** with Zod-validated frontmatter. Structured metadata lives in frontmatter; learning prose + the required "How to apply in your next game" section live in the MDX body.
- **D-02:** **Content is AI-authored.** The authoring workflow is a Claude-Code deep-research pipeline — Claude searches for, reviews, and distills sources (peer-reviewed science + recognized WC3 creators) into each node's sections. The schema, CI, and DX must optimize for *agent generation + human PR review*, not hand-authoring. (This shapes downstream Phase 3 planning.)
- **D-03:** CI deterministically enforces frontmatter structure — every citation entry must carry an `applicationNote`, and the "How to apply" section must be present. (Citation-field detail is finalized in Phase 3, but the enforcement hook is designed into the Phase 1 schema.)

### Patch-Version Primitive
- **D-04:** Patch version is modeled as a **curated, ordered registry** — a typed module listing known WC3 patches with metadata (e.g. `{ id, order, released, objectIdMapVersion }`) plus an exported `CURRENT_PATCH` pointer.
- **D-05:** All schemas store a `patchId` that **must reference an entry in the registry**; CI validates referential integrity. The registry is the single place to add a new patch.
- **D-06:** Staleness derives from the registry — `meta_volatile` + `last_reviewed`/`patch_context` compared against `CURRENT_PATCH` drives the staleness indicator surfaced later (Phase 9).

### Schema Taxonomy
- **D-07:** First-class node categorical fields from day one: `nodeType` (MECHANIC | CONCEPTUAL — locked), `skillType` (macro | micro | mental), `difficulty` (e.g. beginner | intermediate | advanced), `race` (agnostic | human | orc | undead | nightelf; v1 content defaults to `agnostic`), and free-form `tags[]`.
- **D-08:** `skillType`, `difficulty`, `race` exist now to serve GRAPH-04 filtering (Phase 3) and v2 race branches (OSS-02) without a later schema migration. `tags[]` is the loose thematic layer on top of the strict enums.
- **D-09:** Graph edges are **soft `prerequisites[]` declared on each node** (by node id), never hard-locking (DATA-05). CI validates that every referenced id exists and that the prerequisite graph is **acyclic**. The graph engine (Phase 2) derives edges by reading nodes.

### Schema Set Breadth
- **D-10:** Phase 1 defines **all three schemas now**: the node schema (fully), plus foundational `masteryThreshold` and `progressRecord` schemas. Each carries `patchId` (and `nodeType`/`nodeId` as relevant) so the patch primitive is genuinely wired across all three from the first schema commit (satisfies success criterion 4). The mastery/progress schemas may be minimal but must be real, not stubs.

### Scaffold & Deployment
- **D-11:** Scaffold a **minimal TanStack Start app** (single placeholder route) that builds and runs.
- **D-12:** **Live Vercel deploy from day one** — wire the Vercel project + CI so every push builds and deploys to a real URL; surfaces deploy-target friction now rather than in Phase 2 and gives an early URL for community feedback.
- **D-13:** CI runs **schema validation as a required check** (build fails on malformed content — DATA-07).
- **D-14:** Project licensed **GPL-3.0**; core dependencies **pinned** to known-working versions with a documented upgrade policy.

### Architecture Foundations
- **D-15:** Scaffold root **`CONTEXT.md`** capturing the ubiquitous domain language (node, nodeType, mastery state, pathway, signal, patch, threshold, citation, prerequisite) and **`docs/adr/`** with the foundational ADRs (see Claude's Discretion for the seed set). Apply deep-module discipline — the content schema, patch registry, and validation layer are deep modules with simple interfaces.

### Claude's Discretion
- **Patch registry shape/location** (D-04/D-05): exact field set and whether it's a plain TS module vs a content collection — Claude decides; ordered + referentially-validated + a `CURRENT_PATCH` pointer are the only hard constraints.
- **Citation frontmatter field shape** (D-03): final structure finalized in Phase 3; Phase 1 only guarantees the `applicationNote`-per-citation enforcement hook exists.
- **CI tooling specifics** (D-13): GitHub Actions assumed (per global GitHub-CLI/estubmo convention) unless research surfaces a better fit; exact job layout is Claude's call.
- **Foundational ADR seed set** (D-15): suggested — (1) stack choice (TanStack Start + Drizzle/Neon + content-collections), (2) content/graph-engine decoupling, (3) patch-version primitive as a registry, (4) GPL-3.0 licensing rationale. Claude may add/split as warranted.
- **Difficulty enum values** (D-07): exact labels Claude's discretion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — product definition, Key Decisions table, constraints, out-of-scope.
- `.planning/REQUIREMENTS.md` — DATA-01..07 + OSS-01/02 are the Phase 1 requirements; §"Content Data Model", §"Project / Open Source".
- `.planning/ROADMAP.md` §"Phase 1: Foundation & Schema" — goal + 6 success criteria (the acceptance bar).

### Stack / architecture (authoritative for this project)
- `.claude/CLAUDE.md` — pinned tech stack + versions, "What NOT to Use", version-compatibility matrix, deploy-target table, confidence flags. Treat the version table as the dependency-pinning source.
- `.agents/skills/codebase-design/SKILL.md` — deep-module vocabulary; apply to schema/registry/validation modules.
- `.agents/skills/improve-codebase-architecture/SKILL.md` — deepening discipline referenced by the cross-cutting architecture constraint.

### To be created in this phase (forward refs)
- `CONTEXT.md` (repo root) — domain language; created in Phase 1, extended every later phase.
- `docs/adr/` — foundational ADRs created in Phase 1.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield. No `package.json`, `src/`, `LICENSE`, or `docs/adr/` exist yet. Repo currently holds only `.planning/`, `.claude/`, `.agents/`, a `.gstack/` dir, a root `index.html` (a design mockup — not production code), and `skills-lock.json`.

### Established Patterns
- None in code. The authoritative patterns are documentary: the stack/version matrix in `.claude/CLAUDE.md` and the deep-module discipline in `.agents/skills/codebase-design/`.

### Integration Points
- This phase *creates* the integration surface everything else builds on: the Zod content schemas (consumed by Phase 2 graph, Phase 3 content pipeline), the patch registry (consumed by Phases 5–9), and the deploy/CI pipeline.

</code_context>

<specifics>
## Specific Ideas

- The single most load-bearing constraint surfaced this discussion: **content is generated by Claude Code via a deep-research authoring pipeline**, not hand-written. Every Phase 1 format/CI decision optimizes for agent-generated, machine-validated, PR-reviewable node files.
- One `.mdx` file = one complete node (frontmatter metadata + prose body + howToApply) — the "one file fully describes a node" principle also drove putting `prerequisites[]` on the node rather than in a separate edges file.

</specifics>

<deferred>
## Deferred Ideas

- **GRAPH-04 filter UI** (filter by race/skillType/difficulty/mastery) — Phase 3. Phase 1 only adds the fields the filter will consume.
- **v2 race-specific branch content** — fields (`race` enum) exist now; actual race content deferred to v2 (RACE-01..05).
- **Replay object-ID map versions per patch** — the registry includes an `objectIdMapVersion` hook, but the maps themselves are Phase 8 (REPLAY-08).
- **Final citation field structure + `howToApply` rendering** — Phase 3; Phase 1 reserves the schema/CI enforcement hook only.

None of the above are scope creep into Phase 1 — they are forward hooks the schema deliberately reserves.

</deferred>

---

*Phase: 1-Foundation & Schema*
*Context gathered: 2026-06-28*
