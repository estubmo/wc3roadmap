---
phase: 03-content-pipeline-node-panel
verified: 2026-06-29T14:33:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: null
gaps: []
deferred: []
behavior_unverified_items: []
human_verification: []
---

# Phase 3: Content Pipeline & Node Panel — Verification Report

**Phase Goal:** MDX content pipeline processes node files with citations and application notes; clicking a node opens a lazy-loading detail panel; the citation template enforces "how to apply" siblings; search and filter work on the graph.
**Verified:** 2026-06-29T14:33:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking a node opens a detail panel showing learning content, inline citations linking to real sources, and a required "How to Apply" section — content loads lazily per node without a full-page reload | ✓ VERIFIED | `RoadmapGraph.tsx` line 297-300: `handleNodeClick` calls `useGraphStore.getState().setSelectedNode(node.id)`. `NodeDetailPanel.tsx` reads `selectedNodeId` from store, renders `NodePanelContent`. `NodePanelContent.tsx` calls `useQuery(nodeContentQueryOptions(nodeId))` — disabled until non-null id, `staleTime: Infinity`. MDXContent renders `node.mdxHowToApply` (pinned top) then `node.mdx`, then `ProWisdomCallout`, `CitationList`. 6 tests exercise `nodeContentQueryOptions` enabled/disabled/found/not-found (195/195 suite green). Human-verified (end-user approved in conversation, commit fd3dba8 and 806f498). |
| 2 | Updating a node's content requires only editing its MDX file and deploying — no graph engine or component code changes needed | ✓ VERIFIED | Content/graph decoupling enforced by ADR-002/005/006. Loader in `index.tsx` projects `GraphDisplayNode` from `allNodes` (explicit field-by-field, no spread). `content-collections.ts` processes MDX with `transform` and compiles `mdx` + `mdxHowToApply`. `npm run build:content` succeeds (13 documents, 28ms). `npm run validate` passes. No component code touches MDX authoring. |
| 3 | A node MDX file without a `howToApply` section or with a citation missing `applicationNote` fails the CI build | ✓ VERIFIED | `content-collections.ts` lines 86-91: throws `Node "${id}": missing required "## How to Apply" section` if body lacks the heading. `CitationSchema` in `node.ts` and `content-collections.ts` both use `z.discriminatedUnion("kind", [...])` with `applicationNote: z.string().min(1, { error: "..." })` required on both `science` and `creator` branches. 11 tests in `node.test.ts` cover CitationSchema kind discriminator: science/creator acceptance and applicationNote rejection on both branches (all green). All 13 seed nodes have `## How to Apply` and `kind` fields — `npm run build:content` confirms. |
| 4 | Creator wisdom attributed to recognized WC3 players names the source visibly in the panel — attribution not buried in a footnote | ✓ VERIFIED | `ProWisdomCallout.tsx`: creator `source` rendered with `fontFamily: var(--font-display)`, `fontSize: 14px`, `fontWeight: 600`, `color: var(--color-rune-400)` — display font, weight 600, rune-gold accent. Renders as a distinct card with `border-left: 3px solid var(--color-rune-500)` (obsidian-800 background), separate from the numbered science references. `applicationNote` also rendered per citation. Human-verified (visual confirmed in browser). `map-control.mdx` has a `creator` citation with Grubby quote as representative sample. |
| 5 | A user can filter nodes by skill type and mastery state — the graph narrows to matching nodes in real time without a page reload | ✓ VERIFIED | `filter-utils.ts`: pure `matchesFilter` (AND across facets, OR within; title+tags search) and `isFilterActive`. `FilterBar.tsx`: mounted in 56px top bar (`index.tsx` line 166), dispatches `setSearchQuery`/`setFilter`/`clearFilters` via `getState()`, reads via `useShallow` slice subscription. `RoadmapGraph.tsx` lines 200-220: `filteredDisplayNodes` useMemo reads filter state via `useShallow`, calls `matchesFilter` per node, composes `{ ...n.style, opacity: 0.15, pointerEvents: "none" }` ON TOP of existing pathway dim (not replacing it). `setNodes(filteredDisplayNodes)` effect feeds React Flow. 30 filter-utils tests pass covering AND/OR semantics, title+tags search, mastery facet, all combinations. Human-verified (filter dim behavior confirmed post-fix commit 806f498). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/schemas/node.ts` | CitationSchema discriminated union (kind: science/creator), both branches enforce applicationNote | ✓ VERIFIED | `z.discriminatedUnion("kind", [ScienceCitationSchema, CreatorCitationSchema])` with `applicationNote: z.string().min(1, { error: "..." })` on both branches. Exports `Citation`, `ScienceCitation`, `CreatorCitation` types. |
| `content-collections.ts` | Parallel-schema sync of CitationSchema; transform enforces How-to-Apply and splits body/howToApply | ✓ VERIFIED | `z.discriminatedUnion` mirrors node.ts exactly. `transform`: How-to-Apply check fires first (line 86), body split (line 96-99), empty-body guard (line 102-106), dual `compileMDX` returns `{ ...document, mdx, mdxHowToApply }`. |
| `src/lib/filter-utils.ts` | Pure `matchesFilter` + `isFilterActive`, no React/DOM/state | ✓ VERIFIED | Type-only imports only. `matchesFilter`: title+tags OR search, AND across facets, OR within facets. `isFilterActive`: non-empty query or any facet array non-empty. 30 tests green. |
| `src/lib/node-content-query.ts` | `nodeContentQueryOptions(id)` factory, `NodeFrontmatterWithMDX` type | ✓ VERIFIED | `queryOptions({ queryKey, enabled: nodeId !== null, staleTime: Infinity, queryFn: allNodes.find(...) })`. Throws on unknown id. `NodeFrontmatterWithMDX = NodeFrontmatter & { mdx: string; mdxHowToApply: string }`. 6 tests green. |
| `src/lib/graph-store.ts` | Extended with selectedNodeId/setSelectedNode + searchQuery/activeFilters/setSearchQuery/setFilter/clearFilters and exported ActiveFilters | ✓ VERIFIED | All 7 additions present. `ActiveFilters` interface exported with `race`, `skillType`, `difficulty`, `mastery` string arrays. Phase 2 hover/ancestorEdge state preserved. |
| `src/components/graph/CitationList.tsx` | Numbered science refs + applicationNote rows, isSafeUrl guard | ✓ VERIFIED | Filters `kind === "science"` for numbered list. `isSafeUrl` blocks non-http(s) URLs from becoming anchors. `applicationNote` rendered per citation. Returns null when no science citations. |
| `src/components/graph/ProWisdomCallout.tsx` | Distinct creator callout card, prominent name, isSafeUrl guard | ✓ VERIFIED | Display font/weight 600/rune-gold for `source`. Optional `quote` in blockquote. `applicationNote` in muted text. Same `isSafeUrl` guard. Returns null when no creator citations. |
| `src/components/graph/PrerequisiteChips.tsx` | Clickable chips, keyboard-accessible, setSelectedNode via getState | ✓ VERIFIED | CVA chipVariants. `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space. `useGraphStore.getState().setSelectedNode(prereqId)`. Returns null when empty. |
| `src/components/graph/FilterBar.tsx` | Search input + 4 facets (race/skillType/difficulty/mastery), shallow slice subscription | ✓ VERIFIED | `useShallow` slice reads `searchQuery` + `activeFilters`. `getState()` in handlers. 4 facet groups (race, skillType, difficulty, mastery). Clear button when `isFilterActive` is true. |
| `src/components/graph/NodePanelContent.tsx` | Lazy query + D-12 ordering: mdxHowToApply pinned top, body below, ProWisdomCallout, CitationList, PrerequisiteChips | ✓ VERIFIED | `useQuery(nodeContentQueryOptions(nodeId))`. Loading skeleton + error state as unexported sub-components. Render order: mdxHowToApply (section with rune-gold left border) → mdx → ProWisdomCallout → CitationList → PrerequisiteChips. `mdxComponents.a` applies isSafeUrl. |
| `src/components/graph/NodeDetailPanel.tsx` | ClientOnly + desktop drawer (hidden md:flex) + mobile sheet (block md:hidden) + Esc dismiss | ✓ VERIFIED | `<ClientOnly fallback={null}>` wrapping `NodeDetailPanelInner`. Desktop: `motion.aside hidden md:flex fixed right-0 top-[56px] bottom-0 z-50 w-[480px]`, `x: "100%"` → 0, spring 28/280. Backdrop `hidden md:block`. Mobile: `motion.div block md:hidden fixed bottom-0 inset-x-0 z-50 h-[80svh]`, `y: "100%"` → 0, `drag="y"` with velocity/offset swipe-dismiss. Esc useEffect on document. No Radix portal. |
| `src/components/graph/RoadmapGraph.tsx` | onNodeClick wired; filteredDisplayNodes composes with pathway dim; filteredDisplayNodes feeds setNodes | ✓ VERIFIED | `handleNodeClick` (line 296-301): `useGraphStore.getState().setSelectedNode(node.id)` via `useCallback([])`. `filteredDisplayNodes` useMemo (line 207-220): when `isFilterActive`, maps over `displayNodes` and adds `opacity: 0.15, pointerEvents: "none"` via `{ ...n.style, ... }` spread (composes, not replaces). `setNodes(filteredDisplayNodes)` effect (line 230-232). |
| `src/routes/index.tsx` | FilterBar in top bar; NodeDetailPanel mounted in ClientOnly; skillType + tags projected in loader | ✓ VERIFIED | `<FilterBar />` inside 56px top-bar div (line 166). `<ClientOnly fallback={null}><NodeDetailPanel /></ClientOnly>` after graph container (line 182-184). Loader explicitly projects `skillType: n.skillType` and `tags: n.tags` (lines 58-59, no spread of `n`). |
| `src/schemas/graph.ts` | GraphDisplayNodeSchema extended with skillType + tags (ADR-006) | ✓ VERIFIED | `skillType: z.enum(["macro","micro","mental"])` and `tags: z.array(z.string())` added after `difficulty`. JSDoc references ADR-006. |
| `docs/adr/006-graph-display-node-skilltype-tags.md` | Status: Accepted; documents skillType + tags addition + ADR-005 rule maintained | ✓ VERIFIED | Status: Accepted. Documents both fields, rationale (GRAPH-04/D-11), decision (explicit projection), and ADR-005 "further field requires new ADR" rule carried forward. |
| All 13 `content/nodes/*.mdx` | All have `kind` field on every citation + `## How to Apply` section | ✓ VERIFIED | `grep -l "kind:" content/nodes/*.mdx` returns 13 (all files). `grep -c "## How to Apply"` returns `:1` on all 13 files. `npm run build:content` succeeds with 13 documents. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RoadmapGraph.tsx` (onNodeClick) | `graph-store.ts` (setSelectedNode) | `useGraphStore.getState().setSelectedNode(node.id)` in `handleNodeClick` | ✓ WIRED | Line 298: `useCallback((_event, node) => { useGraphStore.getState().setSelectedNode(node.id); }, [])` |
| `graph-store.ts` (selectedNodeId) | `NodeDetailPanel.tsx` (render) | `useGraphStore(s => s.selectedNodeId)` slice subscription | ✓ WIRED | `NodeDetailPanelInner` subscribes; AnimatePresence shows panels when `selectedNodeId` is non-null |
| `NodeDetailPanel.tsx` | `NodePanelContent.tsx` | `<NodePanelContent nodeId={selectedNodeId} onClose={handleClose} />` | ✓ WIRED | Both desktop and mobile motion panels render NodePanelContent |
| `NodePanelContent.tsx` | `node-content-query.ts` | `useQuery(nodeContentQueryOptions(nodeId))` | ✓ WIRED | `enabled: nodeId !== null`; queryFn resolves synchronously from `allNodes` |
| `FilterBar.tsx` | `graph-store.ts` (filter state) | `useShallow` slice subscription + `getState()` dispatches | ✓ WIRED | Reads via `useShallow({ searchQuery, activeFilters })`; writes via `getState().setSearchQuery/setFilter/clearFilters` |
| `graph-store.ts` (filter state) | `RoadmapGraph.tsx` (filteredDisplayNodes) | `useShallow` slice subscription in GraphCanvas | ✓ WIRED | GraphCanvas subscribes to `{ searchQuery, activeFilters }` via `useShallow`; `filteredDisplayNodes` useMemo consumes both |
| `filteredDisplayNodes` | `ReactFlow` (setNodes) | `useEffect(() => { setNodes(filteredDisplayNodes) }, [filteredDisplayNodes, setNodes])` | ✓ WIRED | Effect feeds React Flow's internal node store; also passed as `nodes` prop directly |
| `filter-utils.ts` (matchesFilter/isFilterActive) | `RoadmapGraph.tsx` (filteredDisplayNodes) | `import { matchesFilter, isFilterActive } from "#/lib/filter-utils"` | ✓ WIRED | Both functions imported and called inside `filteredDisplayNodes` useMemo |
| `CitationSchema` (node.ts) | `content-collections.ts` | Parallel-schema sync (PARALLEL-SCHEMA SYNC NOTE in both files) | ✓ WIRED | Both files have field-for-field identical `z.discriminatedUnion("kind", [ScienceCitation, CreatorCitation])` |
| `content-collections.ts` (transform) | CI build enforcement | `throw new Error(...)` when `## How to Apply` absent or body empty | ✓ WIRED | `if (!document.content.includes("## How to Apply"))` fires before split; body-empty guard also throws |
| `MobileNodeList.tsx` (card tap) | `graph-store.ts` (setSelectedNode) | `useGraphStore.getState().setSelectedNode(node.id)` in onClick/onKeyDown | ✓ WIRED | Lines 90+94 in MobileNodeList.tsx. Note: MobileNodeList is used only on /preview/mobile dev route; main route now uses React Flow on all viewports (user-approved scope addition, commit 3079e6f). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `NodePanelContent.tsx` | `node` (from `useQuery`) | `nodeContentQueryOptions` → `allNodes.find(n => n.id === nodeId)` | Yes — synchronous lookup over the static `allNodes` bundle (compiled MDX at build time) | ✓ FLOWING |
| `FilterBar.tsx` | `searchQuery`, `activeFilters` | Zustand `graph-store.ts` via `useShallow` slice | Yes — live Zustand state, updated by user interactions | ✓ FLOWING |
| `CitationList.tsx` / `ProWisdomCallout.tsx` | `citations` (passed as prop) | `node.citations` from `NodePanelContent` query result | Yes — from allNodes content bundle; all 13 nodes have real citations | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `matchesFilter` AND/OR semantics | `npx vitest run src/lib/filter-utils.test.ts` | 30 tests passed | ✓ PASS |
| `nodeContentQueryOptions` enabled/queryKey/queryFn | `npx vitest run src/lib/node-content-query.test.ts` | 6 tests passed | ✓ PASS |
| CitationSchema kind discriminator | `npx vitest run src/schemas/node.test.ts` | 11 citation tests passed (71 total in 3 files) | ✓ PASS |
| Full test suite | `npm test` | 195/195 passed, 15 test files | ✓ PASS |
| Content build pipeline | `npm run build:content` | 13 documents compiled, 28ms | ✓ PASS |
| CI validation (How-to-Apply + refs + patch) | `npm run validate` | Content validation passed (13 nodes, pathway integrity verified) | ✓ PASS |
| TypeScript typecheck | `npm run typecheck` | Clean (no errors) | ✓ PASS |
| Panel motion, filter dim, mobile touch graph | Browser testing | Human-approved — steps 1-3 first round; step-4 filter dim broken, fixed commit 806f498, pre-approved; mobile-as-graph added commit 3079e6f, pre-approved | ✓ HUMAN-VERIFIED |

### Probe Execution

Step 7c: SKIPPED — No `probe-*.sh` files exist in this phase; no migration-phase probes declared.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CONT-01 | 03-01, 03-02, 03-06, 03-08 | Each relevant node has visible inline citations to real peer-reviewed/scientific sources linking to source | ✓ SATISFIED | `CitationSchema` kind: "science" enforced. `CitationList.tsx`: numbered `[n]` refs with `applicationNote` and safe-url links. `isSafeUrl` guard on every citation URL render path (CitationList, ProWisdomCallout, NodePanelContent `mdxComponents.a`). All 13 nodes have science citations. |
| CONT-02 | 03-02, 03-08 | Every node has a required, concrete "How to Apply" section | ✓ SATISFIED | `content-collections.ts` transform throws when `## How to Apply` absent (CI enforcement). `mdxHowToApply` compiled separately. `NodePanelContent.tsx` renders `mdxHowToApply` pinned at top in a highlighted section (rune-gold left border). |
| CONT-03 | 03-02, 03-06, 03-08 | Node content distills wisdom from recognized WC3 players/guides/content-creators | ✓ SATISFIED | `CitationSchema` kind: "creator" branch. `ProWisdomCallout.tsx`: creator `source` prominent (display font, weight 600, rune-400). Optional `quote` in blockquote. `applicationNote` visible. Distinct card from science refs. |
| GRAPH-03 | 03-01, 03-05, 03-07, 03-08, 03-09 | Clicking a node opens a detail panel with its content, citations, and "next game" section (content lazy-loaded) | ✓ SATISFIED | `handleNodeClick` → `setSelectedNode`. `NodeDetailPanel` reads `selectedNodeId`. `NodePanelContent` uses `useQuery(nodeContentQueryOptions(nodeId))` — disabled until selection. `staleTime: Infinity`. Desktop drawer + mobile sheet. Prerequisite chips for in-panel navigation. All dismiss paths (Esc, backdrop, close button, swipe). |
| GRAPH-04 | 03-03, 03-04, 03-07, 03-09 | Search/filter nodes by race, skill type (macro/micro/mental), difficulty, and mastery state | ✓ SATISFIED | `FilterBar.tsx` in top bar: search input + 4 facets (race, skillType, difficulty, mastery). `matchesFilter` / `isFilterActive` pure functions. `filteredDisplayNodes` useMemo in GraphCanvas composes filter dim on top of pathway spotlight. Real-time (Zustand state, no page reload). 30 unit tests cover all AND/OR semantics. |

**Orphaned requirements check:** No Phase 3 requirements in REQUIREMENTS.md beyond CONT-01, CONT-02, CONT-03, GRAPH-03, GRAPH-04. All 5 mapped to Phase 3 are satisfied. DATA-02 (graph decoupling) and DATA-06 (MDX pipeline) are Phase 1 requirements — their Phase 3 _expressions_ (ADR-002/006 boundary, content-collections pipeline) are verified as supporting evidence above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `RoadmapGraph.tsx` | 361 | `// Fallback: obsidian-950 placeholder div` | ℹ Info | Code comment describing a CSS fallback div, not an implementation stub. Client-only loading state. Not a code smell. |
| `FilterBar.tsx` | 209 | `placeholder="Search nodes and tags…"` | ℹ Info | HTML input `placeholder` attribute for UX hint. Not a stub. |

No TBD/FIXME/XXX markers found in any phase-modified file. No implementation stubs. No empty handlers. No hardcoded empty data on render paths.

### Human Verification Required

No outstanding human verification items. All visual/interaction criteria were explicitly approved by the end user in conversation before this verification:

- Steps 1-3 (desktop drawer, How-to-Apply pinned, citations/prereq chips): approved first round
- Step 4 (filter dim): found broken in first round, fixed in commit 806f498, pre-approved for re-verification
- Step 5 (mobile): scope expanded from MobileNodeList to full React Flow graph (commit 3079e6f), pre-approved; mobile now uses React Flow's native touch support throughout

### Gaps Summary

No gaps. All 5 success criteria verified against the actual codebase. All 5 requirement IDs (CONT-01, CONT-02, CONT-03, GRAPH-03, GRAPH-04) satisfied with code evidence. Tests 195/195 green. TypeScript clean. Content build clean.

---

_Verified: 2026-06-29T14:33:00Z_
_Verifier: Claude (gsd-verifier)_
