# Phase 3: Content Pipeline & Node Panel - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the already-validated MDX content (Phase 1 schema + content-collections pipeline) to the running graph (Phase 2): clicking a node opens a **lazy-loading detail panel** that renders the node's full learning content, inline scientific citations, a visibly-attributed WC3-creator "pro wisdom" callout, and a pinned "How to apply in your next game" section. Add **search + filter** over the graph (GRAPH-04). The MDX authoring pipeline and citation template are finalized this phase so updating a node requires only editing its `.mdx` file.

**In scope:** node detail panel (right side drawer on desktop, bottom sheet on mobile) lazy-loading `NodeFrontmatter` content per node; MDX body rendering; citation template + rendering (numbered science refs + distinct creator-wisdom callout, each showing its `applicationNote`); CI enforcement of the citation/howToApply structure (finalize the Phase 1 enforcement hook); pinned How-to-Apply section; in-panel prerequisite navigation; graph search (title + tags) + facet filters (race, skillType, difficulty, mastery) with dim-non-matching behavior; wiring the Phase 2 stubbed click/tap handlers.

**Out of scope (own phases):** auth / DB (Phase 4); real mastery persistence + manual marking (Phase 5 — mastery filter reads Phase 2 mocked data this phase); quizzes (Phase 6); w3champions / replay signals (Phases 7–8); full **staleness UI** for meta-volatile nodes (Phase 9); real launch content authoring to the ~25-node gate + citation review audit (Phase 9, CONT-04/05); race-specific branch content + per-race theming (v2); full-text body search (deferred — search is title+tags only this phase).

</domain>

<decisions>
## Implementation Decisions

### Panel Presentation
- **D-01:** Detail panel is a **right-side drawer** on desktop — it slides in from the right while the graph stays visible and **dimmed** on the left, preserving the node-in-context feel and reusing the obsidian/rune-gold system. The clicked node stays spotlighted.
- **D-02:** The graph **stays interactive while the panel is open** — clicking another node **swaps the panel content live** (the panel is a persistent inspector, not a one-shot modal). Dismiss via Esc / click-away / close control.
- **D-03:** On mobile (the existing `MobileNodeList`), tapping a card opens a **partial bottom sheet** (~80% height, swipe-down to dismiss) rendering the same content.

### Citations & Attribution (core trust surface — CONT-01/03/05)
- **D-04:** Inline **scientific citations** render as **numbered superscript `[n]` markers** in the prose that link to a numbered **"References" list** at the bottom of the panel. Familiar academic pattern; keeps prose clean.
- **D-05:** **WC3 player/creator wisdom is NOT buried** (CONT-03). It renders as a **distinct "pro wisdom" callout block** (quote-card style with the creator's name prominent), visually separate from the numbered science refs.
- **D-06:** Each citation's **`applicationNote` is shown alongside its source** (in both the references list and the creator callout) — every citation visibly earns its place, which guards against decorative / misapplied science (CONT-05).
- **D-07 (schema flag → planner):** To render science refs vs. a creator-wisdom callout distinctly, the **`CitationSchema` needs a discriminator** (e.g. `kind: "science" | "creator"`). This is the citation-template finalization Phase 1 reserved (D-03). Mirror the change in `src/schemas/node.ts` **and** `content-collections.ts` (parallel-schema sync note) and update existing seed MDX citations.

### Search & Filter UX (GRAPH-04)
- **D-08:** Non-matching nodes **dim but stay mounted** (do not unmount/reflow) — consistent with the Phase 2 pathway spotlight (D-08 there) and the memoization conventions (GRAPH-06). The graph keeps its shape.
- **D-09:** Search input + filter controls live in the **top app bar** (the existing 56px control bar in `src/routes/index.tsx`) — always visible and discoverable.
- **D-10:** Free-text **search matches `title` + `tags[]`** only this phase (not body). Facet filters: **race, skillType, difficulty, mastery**. Default combination logic: **AND across facets, OR within a facet** (Claude's discretion to refine).
- **D-11 (projection flag → planner):** `skillType` filter and `tags` search require fields the graph layer does not currently receive — `GraphDisplayNode` carries only `id/title/nodeType/race/prerequisites/difficulty`. Extending the projection with `skillType` (+ `tags`) **requires a new ADR** per the ADR-002/005 boundary rule. Keep the projection explicit; do not leak full `NodeFrontmatter` to the graph.

### Panel Content Structure
- **D-12:** **"How to apply in your next game" is pinned at the top** of the panel (prominent highlighted block), with the conceptual explanation / why-it-matters below — practical foreground, theory background (CONT-02).
- **D-13 (pipeline flag → planner):** Pinning How-to-Apply on top means the content pipeline must **split the `## How to Apply` section out of the compiled MDX body** (or otherwise reorder render) — today it is one compiled blob with the section at the end. Resolve in the content-collections transform / a panel render strategy; keep CI's "howToApply section required" enforcement (success criterion 3).
- **D-14:** The panel shows this node's **prerequisites as clickable chips**; clicking a chip **swaps the panel to that node** (pairs with the live-inspector drawer, D-02) — the in-panel learning-path affordance.
- **D-15:** **No staleness indicator in the panel this phase** — staleness UI is explicitly Phase 9. The `meta_volatile` / `last_reviewed` / `patch_context` fields lazy-load with the node but are not surfaced yet.

### Claude's Discretion
- Drawer/sheet width, animation (Motion — `motion/react`), and exact dismiss affordances within ADR 0001.
- Reference-numbering scheme, callout card styling, chip styling — within the obsidian/rune-gold system.
- Facet-combination refinements beyond the AND/OR default (D-10).
- Exact mechanism for D-13 (transform-time split vs. render-time section extraction) — pick during research, keep the content/graph decoupling (ADR 002) intact and CI enforcement working.
- Lazy-load mechanism for panel content (per-node dynamic import vs. TanStack Query server fn vs. direct content-collections access) — choose per ADR 002 + the pinned stack; nodes hold IDs only on the graph layer.
- Mobile breakpoint reuse from Phase 2 (`md`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 3: Content Pipeline & Node Panel" — goal + 5 success criteria (the acceptance bar).
- `.planning/REQUIREMENTS.md` — CONT-01 (visible inline citations to real sources), CONT-02 (required concrete "How to apply" section), CONT-03 (recognized WC3 creator wisdom, visibly attributed), GRAPH-03 (click → lazy-loaded detail panel), GRAPH-04 (search/filter by race, skillType, difficulty, mastery). CONT-04/05 are Phase 9.
- `.planning/PROJECT.md` — product definition; "Core Value" (the learning content must stand on its own — this phase is where content first reaches users).

### Design system (authoritative — this is a UI phase)
- `docs/adr/0001-visual-design-direction.md` — LOCKED design system: obsidian surfaces, single rune-gold accent, Space Grotesk / Outfit / JetBrains Mono. The panel, callouts, refs, and filter controls all consume these tokens.
- `src/styles/app.css` — canonical design tokens; already wired into the graph route.

### Data contract & architecture (the decoupling boundary this phase first crosses)
- `docs/adr/002-content-graph-decoupling.md` — content/graph decoupling rule. The panel is the **first consumer of content fields**; the graph layer must still receive only its projection.
- `docs/adr/005-graph-display-node.md` — `GraphDisplayNode` projection rule; **any new field (skillType/tags for D-11) requires a new ADR.**
- `src/schemas/node.ts` — `NodeFrontmatterSchema` (full content incl. `citations`, `patch_context`, `last_reviewed`, `meta_volatile`) is the panel's data contract; `CitationSchema` is what D-07 extends. **Parallel-schema sync note: mirror every schema change into `content-collections.ts`.**
- `src/schemas/graph.ts` — `GraphDisplayNodeSchema`; the projection D-11 must extend (with an ADR).
- `content-collections.ts` — the MDX pipeline + transform that enforces the `## How to Apply` section and compiles MDX (`document.mdx`); where D-13's section-split likely lands. Keep the parallel schema in sync with `node.ts`.
- `.claude/CLAUDE.md` — pinned stack + versions; "What NOT to Use" (`framer-motion` → `motion/react`; `react-markdown` only as MDX fallback); @xyflow/react performance guidance (IDs-only node data — content loads on click).
- `.agents/skills/codebase-design/SKILL.md` — deep-module discipline; apply to the panel module, the citation/content-render module, and the filter module (simple interfaces over substantial implementation).

### Phase 2 integration points (wire the stubs)
- `src/routes/index.tsx` — loader + responsive switch + the 56px top bar (D-09 filter controls land here).
- `src/components/graph/RoadmapGraph.tsx` — desktop canvas; node click currently stubbed → opens the drawer (D-01/D-02).
- `src/components/graph/MobileNodeList.tsx` — mobile list; tap currently no-op → opens the bottom sheet (D-03).
- `src/lib/graph-store.ts` — Zustand hover/highlight store; the selected-node / panel-open + filter state likely extend this (or a sibling store), keeping React-Flow-internal coupling out.
- `src/lib/mock-mastery.ts` — the mocked mastery map the **mastery filter facet** reads until Phase 5.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NodeFrontmatter` / `NodeFrontmatterSchema` (`src/schemas/node.ts`) — full content shape the panel renders; `CitationSchema` is the citation template to finalize (D-07).
- `content-collections.ts` — already compiles MDX to `document.mdx` and CI-enforces the `## How to Apply` section; 13 seed nodes authored in `content/nodes/*.mdx` (real content to render this phase).
- `src/components/ui/` — shadcn `button`, `badge`, `tooltip` already installed; a shadcn drawer/sheet/dialog primitive can be added for the panel.
- `src/lib/graph-store.ts` — established Zustand pattern (decoupled from React Flow internals) to extend for selected-node + filter state.
- `src/styles/app.css` design tokens; Phase 2 spotlight/dim behavior to mirror for filter dimming (D-08).

### Established Patterns
- TanStack Start file-based routing; Vitest tests colocated (`*.test.ts`); SPDX header on every hand-authored `.ts/.tsx`.
- ADR-002/005 projection boundary enforced at the type level (graph imports only `GraphDisplayNode`); CI referential-integrity + schema checks; parallel-schema sync between `node.ts` and `content-collections.ts`.
- CSS-only responsive switch (`hidden md:block` / `block md:hidden`) — no `window.innerWidth`; the panel must follow the same SSR-safe pattern.
- Motion via `motion/react`; class merging via `cn` (`src/lib/utils.ts`); CVA for state variants.

### Integration Points
- Graph/list click handlers (stubbed in Phase 2) → open panel (D-01/D-03) and set selected node in the store.
- Panel → lazy-loads `NodeFrontmatter` content per node (ADR 002; nodes hold IDs only).
- Top app bar (`index.tsx`) → filter/search state → graph dim/highlight (D-08/D-09/D-10).
- D-11 projection extension → `GraphDisplayNodeSchema` (+ new ADR) → loader projection in `index.tsx`.

</code_context>

<specifics>
## Specific Ideas

- The detail panel is a **live inspector**, not a modal — click around the graph and the panel keeps re-filling. This makes the graph + panel one continuous exploration surface (D-01/D-02/D-14).
- **"Pro wisdom" gets its own visual voice** — naming Grubby/etc. in a distinct callout (not a footnote) is a deliberate trust + community-credibility signal central to the project's core value (D-05).
- **Every citation shows its `applicationNote`** so the user can see *why* each source is here — the anti-"decorative science" stance made visible in the UI (D-06, CONT-05).
- **Practical-first panel:** the in-game drill is the first thing you see; theory supports it underneath (D-12, CONT-02).

</specifics>

<deferred>
## Deferred Ideas

- **Full staleness UI** (meta_volatile / patch-mismatch warning in the panel) — Phase 9. Fields lazy-load now but are not surfaced (D-15).
- **Full-text body search** — deferred; Phase 3 search is title + tags only (D-10). Revisit if discoverability needs it.
- **Real mastery-based filtering on persisted data** — Phase 5. The mastery facet reads Phase 2 mocked mastery this phase (D-10).
- **Launch content gate (~25 authored nodes) + citation review audit** — Phase 9 (CONT-04/05). This phase builds the rendering + template, not the final content corpus.
- **Race-specific content / per-race theming** — v2.

None of the above are scope creep into Phase 3 — they are forward hooks this phase's structure deliberately reserves.

</deferred>

---

*Phase: 3-Content Pipeline & Node Panel*
*Context gathered: 2026-06-29*
