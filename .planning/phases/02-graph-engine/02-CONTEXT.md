# Phase 2: Graph Engine - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the interactive node-graph canvas with `@xyflow/react` v12: render seed nodes from static JSON, derive edges from `prerequisites[]`, visualize three mocked mastery states, and ship a guided-pathway default view. Desktop is fully interactive (pan/zoom/click); mobile degrades to a readable simplified form. Memoization conventions (`React.memo`, `useCallback`, `onlyRenderVisibleElements`) are present from the first prototype commit. No auth, no DB, no real persistence, no detail panel.

**In scope:** React Flow canvas; auto-layout from the prerequisite DAG; custom node component (face content + mastery/type/race visual encoding); muted edges with interactive rune-gold prerequisite-chain highlight; guided-pathway spotlight + camera framing + "Explore full map" action; standalone Zod-validated pathway data file; mobile list fallback; the memoization conventions.

**Out of scope (own phases):** node detail panel + lazy content loading (Phase 3); search/filter (GRAPH-04, Phase 3); auth/DB (Phase 4); real mastery persistence + per-node marking (Phase 5); quizzes (Phase 6); w3champions/replay signals (Phases 7–8); real pathway content, pathway progress bar, multiple pathways, staleness UI (Phase 9); race-specific branch content + per-race theming (v2). Mastery data is **mocked** this phase — the graph is the visual source of truth only.

</domain>

<decisions>
## Implementation Decisions

### Node Positioning / Layout
- **D-01:** Node positions are **auto-computed from the `prerequisites[]` DAG** using a layered layout engine (ELK or dagre — engine choice is Claude's during research). Adding a node re-layouts automatically — directly serves the extensibility constraint. No hand-authored coordinates in v1.
- **D-02:** Flow direction is **top-to-bottom** — fundamentals at the top, advanced nodes below. Reads as a skill/tech tree; vertical scroll is mobile-friendly.
- **D-03:** Edges are **muted obsidian-grey directional bezier curves at rest** (arrow points to the dependent node). On hover/select of a node, its **full prerequisite chain highlights in rune-gold**, Motion-animated. Surfaces the learning path on interaction.

### Node Face & State Encoding
- **D-04:** Each node's face shows **title + nodeType icon + difficulty marker** (beginner/intermediate/advanced). The full detail panel is Phase 3 — the node face is intentionally lightweight.
- **D-05:** Mastery (untouched / in-progress / mastered) uses **fill+glow progression** (ambient, at-a-glance — dim obsidian → gold ring → full gold glow) **plus a small status badge** (precise, accessibility-friendly). Both encodings, not one.
- **D-06:** **MECHANIC and CONCEPTUAL nodes get distinct shapes** (e.g. angular vs rounded) — readable when zoomed out where icons blur, and visually foreshadows the later quiz (CONCEPTUAL) vs replay/w3champions-signal (MECHANIC) split.
- **D-07:** The engine **supports race faction-color tints** per ADR 0001 (faction colors are semantic graph encoding only), but v1 content is all `race: agnostic`, so tints are mostly dormant this phase. Build the hook; don't force colors onto agnostic nodes.

### Guided-Pathway View Model
- **D-08:** First load **mounts the full graph but dims/blurs non-pathway nodes**, and the **camera is fit-framed to the pathway** so the user effectively sees only the 8–12 pathway nodes. **"Explore full map"** zooms out and un-dims. All nodes being mounted satisfies the memoization conventions (success criterion 5); the user-facing experience is a focused pathway.
- **D-09:** This reconciles ROADMAP success criterion 3 ("not the full graph … full graph accessible via Explore full map only") **by intent** — the pathway is what the user sees; the full graph is revealed only via the explicit action / zoom-out. **Verifier note:** criterion 3 should be read as "first-load camera frames the pathway and non-pathway nodes are heavily de-emphasized; full graph is revealed only via Explore full map," not as "non-pathway nodes are absent from the DOM." Planner may propose a one-line ROADMAP reword to match.
- **D-10:** The pathway is defined in a **standalone static data file** (e.g. `pathways/beginner-fundamentals.json`) carrying id/title + an **ordered list of node-ID steps**. It is **Zod-validated** with a **CI referential-integrity check** (every step id must resolve to a real node) — consistent with the Phase-1 schema discipline. Phase 9 extends this same structure with real content + progress.

### Mobile Simplified Form
- **D-11:** Below a breakpoint, **drop the canvas** and render a **vertical scrollable list of node cards** (title, type icon, difficulty, mastery badge). The graph is a **desktop-first** experience; the list is the mobile "simplified readable form" (success criterion 4).
- **D-12:** Mobile list order: **Beginner Pathway nodes first** (in pathway order), then an **"All Nodes"** section. Tapping a card is a **placeholder no-op in Phase 2** (wired to the detail panel in Phase 3).

### Open Execution Flag (for planner / UI spec — not a user decision)
- **F-01:** Rune-gold now carries **three jobs**: mastered-node glow (D-05), in-progress ring (D-05), and edge-chain highlight (D-03). The UI spec/planner must define a clear **visual hierarchy / differentiation** (intensity, motion, shape) so these three gold uses don't muddy each other on the obsidian canvas.

### Claude's Discretion
- **Layout engine** (D-01): ELK vs dagre — pick during research on bundle size, layered-layout quality, and TanStack Start SSR compatibility.
- **Layout timing** (D-01): client-side `useMemo` vs build-time precompute — Claude's call. Lean client-side at v1 node count (~25–50), but it **must be deterministic** so SSR markup and client hydration agree.
- **Exact node shapes/icons** (D-04, D-06): specific glyphs and angular/rounded forms are Claude's within ADR 0001.
- **Mobile breakpoint value** (D-11): Claude's discretion.
- **Pathway file location/exact shape** (D-10): directory + field names Claude's, within "ordered node-ID steps + Zod-validated + CI integrity check."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 2: Graph Engine" — goal + 5 success criteria (the acceptance bar). Note D-09 re: criterion 3 interpretation.
- `.planning/REQUIREMENTS.md` — GRAPH-01 (pan/zoom/click), GRAPH-02 (visual mastery states), GRAPH-05 (desktop-first; mobile readable), GRAPH-06 (memoization conventions). GRAPH-03/04 are Phase 3, not this phase.
- `.planning/PROJECT.md` — product definition, constraints (extensibility, design bar), out-of-scope.

### Design system (authoritative — this is a UI phase)
- `docs/adr/0001-visual-design-direction.md` — LOCKED design system: obsidian surfaces, single rune-gold accent, faction colors as semantic graph encoding only, Space Grotesk / Outfit / JetBrains Mono. Token table + `[data-theme]` future hook.
- `src/styles/app.css` — canonical design tokens (`--color-obsidian-*`, `--color-rune-*`, `--color-faction-*`, fonts). Must be imported by the graph route.

### Data contract & architecture
- `src/schemas/node.ts` — **`NodeSummarySchema` / `NodeSummary`** is the graph engine's data contract (id, title, nodeType, race, prerequisites). The graph imports ONLY this — never `NodeFrontmatter` or content fields (ADR 002). `difficulty` lives on `NodeFrontmatterSchema`, so surfacing difficulty on the node face (D-04) requires deciding what subset the graph receives — flag for planner (may need a small graph-display projection that includes `difficulty`).
- `docs/adr/002-content-graph-decoupling.md` — content/graph decoupling rule the engine must honor.
- `content/nodes/map-control.mdx` — the seed node; the only real node available for the prototype. Plan for mocked/additional nodes to exercise pathway (8–12) + mastery states.
- `.claude/CLAUDE.md` — pinned stack + versions; "Graph Library Decision: @xyflow/react" performance guidance (`nodesDraggable={false}`, `React.memo`, `onlyRenderVisibleElements`, IDs-only node data); "What NOT to Use" (`reactflow` old pkg, `framer-motion` → `motion/react`).
- `.agents/skills/codebase-design/SKILL.md` — deep-module discipline; apply to the layout module, custom-node module, and pathway-data module.

### Forward refs (created/extended this phase)
- `CONTEXT.md` (repo root) — domain language; extend with any new graph/pathway terms.
- `pathways/` (new) — standalone pathway data file + its Zod schema (D-10).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas/node.ts` — `NodeSummary` type is the ready-made graph data contract; `NodeFrontmatter` carries `difficulty`/`skillType`/`tags` for the node face (D-04). Reuse `PATCH_IDS` only if needed.
- `src/styles/app.css` — full design-token set already authored (ADR 0001); graph styling consumes these CSS variables directly. Currently unreferenced — this phase wires it into `__root.tsx` (per ADR 0001 consequences) if not already done.
- `src/lib/patches.ts` — patch registry (not central to Phase 2, but available).
- `content/nodes/map-control.mdx` — one real seed node; the rest must be mocked to reach the 8–12 pathway count + exercise three mastery states.

### Established Patterns
- TanStack Start file-based routing (`src/routes/`), Vitest tests colocated (`*.test.ts`), SPDX header on every hand-authored `.ts/.tsx`.
- Zod-validated static data + CI referential-integrity checks (node prerequisites are validated for existence + acyclicity) — the pathway file (D-10) follows this exact pattern.
- Deep-module discipline (ADR-driven): layout, custom-node, and pathway modules should expose simple interfaces over substantial implementation.

### Integration Points
- Graph route consumes `NodeSummary[]` (+ difficulty projection) from static content; mastery state is injected as **mocked** data this phase, replaced by real persistence in Phase 5.
- `app.css` design tokens → graph + node components.
- New `pathways/*.json` + schema → graph spotlight/camera logic.
- Tap/click handlers are stubbed now; Phase 3 attaches the detail panel.

</code_context>

<specifics>
## Specific Ideas

- "Lighting up the map as you learn" — mastery progression is expressed as nodes gaining rune-gold fill + glow from dim obsidian, so a player's mapped knowledge literally brightens the canvas.
- Distinct MECHANIC/CONCEPTUAL shapes are deliberately chosen to foreshadow the later interaction split (quizzes on CONCEPTUAL, replay/ladder signals on MECHANIC) — visual language that pays off across phases.
- Interactive prerequisite-chain highlight (hover a node → its dependency path glows gold) is the primary "show me the learning path" affordance in lieu of the not-yet-built detail panel.

</specifics>

<deferred>
## Deferred Ideas

- **Node detail panel + lazy content load** — Phase 3 (GRAPH-03). Tap/click is stubbed this phase.
- **Search / filter by race / skillType / difficulty / mastery** — Phase 3 (GRAPH-04). The node face exposes difficulty now; the filter consumes it later.
- **Real mastery persistence + manual marking** — Phase 5. Mastery is mocked here.
- **Real pathway content, pathway completion progress bar, additional pathways, staleness indicators** — Phase 9. Phase 2 builds the pathway data structure + spotlight engine only.
- **Race faction-color theming / per-race `[data-theme]` skins** — v2. Engine supports faction tints now; v1 content is all `agnostic`.
- **Possible one-line ROADMAP reword of success criterion 3** to match the spotlight+fit-viewport model (D-09) — planner's call.

None of the above is scope creep into Phase 2 — they are forward hooks this phase's structure deliberately reserves.

</deferred>

---

*Phase: 2-Graph Engine*
*Context gathered: 2026-06-29*
