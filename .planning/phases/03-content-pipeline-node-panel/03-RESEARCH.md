# Phase 3: Content Pipeline & Node Panel — Research

**Researched:** 2026-06-29
**Domain:** MDX content pipeline, detail panel (drawer/sheet), citation schema, search/filter on @xyflow/react graph
**Confidence:** MEDIUM (codebase-grounded; library APIs confirmed via web search and existing project code; no Context7 available this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Detail panel is a right-side drawer on desktop — slides in from the right, graph stays visible + dimmed, clicked node spotlighted.
- **D-02:** Graph stays interactive while panel is open; clicking another node swaps panel content live (persistent inspector, not one-shot modal). Esc / click-away / close control to dismiss.
- **D-03:** Mobile — tapping a card opens a partial bottom sheet (~80% height, swipe-down to dismiss).
- **D-04:** Inline citations render as numbered superscript `[n]` markers linking to a numbered "References" list at panel bottom.
- **D-05:** WC3 creator wisdom renders as a distinct "pro wisdom" callout block (quote-card style, creator name prominent) — NOT buried in footnotes.
- **D-06:** Each citation's `applicationNote` shown alongside its source in both the references list and the creator callout.
- **D-07:** `CitationSchema` needs a discriminator (`kind: "science" | "creator"`) — mirror in `src/schemas/node.ts` AND `content-collections.ts`. Update existing 13 seed MDX files.
- **D-08:** Non-matching filter nodes dim but stay mounted (no unmount/reflow) — same pattern as Phase 2 pathway spotlight.
- **D-09:** Search input + filter controls live in the 56px top app bar (`src/routes/index.tsx`).
- **D-10:** Free-text search matches `title + tags[]` only. Facets: race, skillType, difficulty, mastery. AND across facets, OR within a facet.
- **D-11:** `skillType` + `tags` extension of `GraphDisplayNode` requires a new ADR per ADR-005 rule. Keep projection explicit; no full `NodeFrontmatter` on the graph layer.
- **D-12:** "How to apply in your next game" pinned at panel top — practical foreground, theory background.
- **D-13:** Content pipeline must split the `## How to Apply` section out of the compiled MDX body (or reorder render) — keep CI enforcement working.
- **D-14:** Prerequisite nodes shown as clickable chips that swap panel to that node.
- **D-15:** No staleness indicator in panel this phase — fields lazy-load but are not surfaced.

### Claude's Discretion

- Drawer/sheet width, animation (Motion — `motion/react`), and exact dismiss affordances within ADR 0001.
- Reference-numbering scheme, callout card styling, chip styling — within obsidian/rune-gold system.
- Facet-combination refinements beyond AND/OR default.
- Exact mechanism for D-13 (transform-time split vs. render-time extraction) — keep ADR-002 intact and CI enforcement working.
- Lazy-load mechanism for panel content (per-node dynamic import vs. TanStack Query vs. direct content-collections access).
- Mobile breakpoint reuse from Phase 2 (`md`).

### Deferred Ideas (OUT OF SCOPE)

- Full staleness UI (meta_volatile / patch-mismatch warning) — Phase 9.
- Full-text body search — deferred; Phase 3 search is title + tags only.
- Real mastery-based filtering on persisted data — Phase 5 (mastery facet reads mocked data this phase).
- Launch content gate (~25 authored nodes) + citation review audit — Phase 9.
- Race-specific content / per-race theming — v2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Each relevant node has visible inline citations to real peer-reviewed sources linking to the source | §Q4 MDX rendering with custom citation components; §Q3 CitationSchema kind discriminator drives distinct rendering |
| CONT-02 | Every node has a required, concrete "How to Apply this in your next game" section | §Q1 transform-time HowToApply split; CI enforcement stays in place |
| CONT-03 | Node content distills wisdom from recognized WC3 creators, named visibly | §Q3 `kind: "creator"` citation discriminator; §Q4 pro-wisdom callout component |
| GRAPH-03 | Clicking a node opens a detail panel with content, citations, and "next game" section (lazy-loaded) | §Q2 lazy-load mechanism via TanStack Query; §Q5 panel primitive |
| GRAPH-04 | Search/filter by race, skill type, difficulty, and mastery state | §Q6 projection ADR; §Q7 filter state + dim computation |
</phase_requirements>

---

## Summary

Phase 3 connects the compiled MDX content (Phase 1 schema + content-collections pipeline) to the running graph (Phase 2) via a lazy-loading node detail panel and a search/filter layer. All seven open implementation questions from CONTEXT.md resolve cleanly against the existing codebase.

The highest-leverage decision is **D-13 (HowToApply split)**: a transform-time section split in `content-collections.ts` produces two separately compiled MDX strings (`mdx` for the body, `mdxHowToApply` for the pinned section) — no render-time parsing, no remark hacks, CI enforcement preserved. The second key decision is the **panel primitive**: a `motion.div`-based fixed panel (not a Radix portal) rendered inside the existing `<ClientOnly>` wrapper, using CSS `hidden md:block` / `block md:hidden` for responsive behavior — the same SSR-safe pattern Phase 2 already established. This avoids all portal/SSR complexity.

The new packages are: `@tanstack/react-query` 5.x (establishes the data layer for Phases 7–8; wraps the synchronous allNodes lookup for caching + loading states) and `@radix-ui/react-dialog` / shadcn `sheet` (if a portal-based approach is preferred over the motion.div approach — research recommends motion.div for SSR safety). No vaul required if motion.div is used for the mobile bottom sheet.

**Primary recommendation:** Transform-time section split for D-13; `motion.div` fixed panels inside `<ClientOnly>` for D-01/D-03; `useQuery` over `allNodes` for D-02 lazy load; `z.discriminatedUnion("kind", [...])` for D-07; extend `graph-store.ts` for all filter/panel state; new ADR-006 for D-11 projection extension.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| MDX section split (D-13) | Build pipeline (`content-collections.ts`) | — | compileMDX runs at build time; splitting before compilation is cheaper and type-safe |
| Node detail panel (D-01/D-03) | Browser / Client | Frontend Server (SSR — renders null) | Panel requires click interaction and motion animations; must be client-only |
| Citation schema (D-07) | Content schema (`src/schemas/node.ts`) | Build pipeline (mirror in `content-collections.ts`) | Schema is the source of truth; pipeline mirrors it |
| Panel content load (D-02) | Browser / Client via TanStack Query | — | Static content; synchronous queryFn over in-memory `allNodes` |
| Search + filter state (D-10) | Browser / Client (Zustand) | — | UI-only derived state; no server needed for static content |
| Graph dim computation (D-08) | Browser / Client (useMemo in GraphCanvas) | — | Derived from filter state + graph nodes; pure computation |
| Projection extension (D-11) | API / Backend (route loader in index.tsx) | — | Loader projects `NodeFrontmatter[]` → `GraphDisplayNode[]` |
| Citation rendering (D-04/D-05) | Browser / Client (MDXContent + custom components) | — | MDX renders React components; citation [n] markers are custom MDX components |

---

## Standard Stack

### Core (all already installed in package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@content-collections/core` | 0.15.2 | Node collection + Zod validation + transform | Already integrated; `content-collections.ts` is the pipeline |
| `@content-collections/mdx` | 0.2.2 | `compileMDX` in transform; `MDXContent` for rendering | Paired package; already installed |
| `motion` | 12.42.0 | Panel slide-in/out, backdrop dim, swipe-to-dismiss | Already in deps; `AnimatePresence` drives enter/exit |
| `zustand` | 5.0.14 | Panel + filter state in `graph-store.ts` | Already established store pattern |
| `@xyflow/react` | 12.11.1 | `setNodes` for filter dim updates | Already integrated; Phase 2 spotlight pattern reused |
| `zod` | 4.4.3 | `z.discriminatedUnion` for CitationSchema | Already in project; v4.x syntax required |

### New in Phase 3

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@tanstack/react-query` | 5.x | `useQuery` for panel content with caching + loading states | Committed stack (CLAUDE.md); establishes pattern for Phase 7 w3champions API; avoids manual useState/useEffect imperative fetching |

**Installation:**
```bash
npm install @tanstack/react-query
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useQuery` + sync queryFn | Plain `useMemo(() => allNodes.find(...))` | Simpler for static data but skips the TanStack Query setup that Phase 7 requires; defers a non-trivial integration step |
| `motion.div` fixed panel | shadcn `Sheet` (Radix portal) | Sheet is portal-based — CSS `hidden md:block` on parent does not hide portal content. Radix Sheet works if panel is always client-side (it is, inside ClientOnly), but requires separate `open` state wired to breakpoint detection which violates the CSS-only constraint |
| `motion.div` mobile bottom sheet | vaul / shadcn Drawer | vaul is OK by registry metrics (36M downloads) but GitHub repo description noted as unmaintained; Motion drag achieves the same UX without adding a dependency |

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@tanstack/react-query` | npm | ~5 yrs (latest publish: 2026-06-27) | 58.5M/wk | github.com/TanStack/query | SUS (too-new flag on latest publish) | Approved — false positive. 58M weekly downloads; part of TanStack ecosystem with 5+ years of history. The "too-new" signal is triggered by a patch release two days ago, not the package age. |
| `vaul` | npm | ~1.5 yrs | 36.9M/wk | github.com/emilkowalski/vaul | OK | Not recommended — prefer `motion` drag for mobile bottom sheet to avoid the unmaintained upstream risk (GitHub repo description confirms no active maintenance). |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `@tanstack/react-query` — flagged only due to recent patch release date (false positive). 58M weekly downloads + official TanStack monorepo confirms legitimacy. Planner: no checkpoint needed.

---

## Architecture Patterns

### System Architecture Diagram

```
MDX files (content/nodes/*.mdx)
        │
        ▼  build time
content-collections.ts (transform)
  ├── CI: "## How to Apply" check → throw if missing
  ├── split content.raw on "## How to Apply" heading
  ├── compileMDX(body)         → document.mdx
  └── compileMDX(howToApply)   → document.mdxHowToApply
        │
        ▼  allNodes (generated module, in-memory bundle)
Route loader (index.tsx)
  ├── project NodeFrontmatter[] → GraphDisplayNode[]
  │     (id, title, nodeType, race, prerequisites,
  │      difficulty, skillType, tags  ← new in Phase 3)
  └── return { nodes, pathway }
        │
    ┌───┴─────────────────┐
    ▼                     ▼
GraphCanvas (ClientOnly)   MobileNodeList (SSR-safe)
  ├── onNodeClick →          onCardTap →
  │   setSelectedNode(id)    setSelectedNode(id)
  │                          │
  └──────────┬───────────────┘
             ▼
       graph-store (Zustand)
         selectedNodeId
         searchQuery
         activeFilters { race, skillType, difficulty, mastery }
             │
      ┌──────┴──────────────┐
      ▼                     ▼
NodeDetailPanel        filterMatchNodes()
(motion.div fixed)     → dim non-matching via setNodes()
  ├── useQuery(nodeContentQueryOptions(selectedId))
  │   queryFn: allNodes.find(n => n.id === id) [sync]
  │   staleTime: Infinity
  ├── MDXContent code={node.mdxHowToApply}  ← pinned top
  ├── MDXContent code={node.mdx}            ← body
  ├── CitationList (science → [n] numbered refs)
  ├── ProWisdomCallout (creator → quote card)
  └── PrerequisiteChips (click → setSelectedNode)
```

### Recommended Project Structure

```
src/
├── components/
│   ├── graph/
│   │   ├── RoadmapGraph.tsx       # wire onNodeClick → setSelectedNode
│   │   ├── NodeDetailPanel.tsx    # NEW: fixed motion.div panel (desktop + mobile)
│   │   ├── NodePanelContent.tsx   # NEW: inner content (MDXContent, citations, chips)
│   │   ├── CitationList.tsx       # NEW: numbered refs + applicationNote rows
│   │   ├── ProWisdomCallout.tsx   # NEW: creator quote card
│   │   ├── PrerequisiteChips.tsx  # NEW: clickable prereq chips
│   │   └── FilterBar.tsx          # NEW: search input + facet controls (top bar)
│   └── ui/
│       └── sheet.tsx              # optional — only if shadcn Sheet used
├── lib/
│   ├── graph-store.ts             # extend: selectedNodeId + filter state
│   ├── filter-utils.ts            # NEW: matchesFilter pure function + types
│   └── node-content-query.ts     # NEW: nodeContentQueryOptions(id)
├── schemas/
│   ├── node.ts                    # update CitationSchema (kind discriminator)
│   └── graph.ts                   # extend GraphDisplayNodeSchema (skillType, tags)
└── routes/
    └── index.tsx                  # extend loader projection; add FilterBar in top bar
content-collections.ts             # update transform: split + dual compileMDX
docs/adr/
    └── 006-graph-display-node-skilltype-tags.md  # NEW ADR for D-11
```

---

## Decision Answers

### Q1 — D-13: HowToApply Section Split

**Recommendation: Transform-time split — compile two separate MDX strings.**

**Rationale:** `compileMDX` is called inside the async `transform` function and can be called multiple times. Returning multiple fields from `transform` is fully supported — content-collections infers the final document type from the transform return type. Render-time section extraction (parsing compiled JS) is not viable; remark plugins that output to multiple outputs are non-standard.

**How it works:**
1. The existing CI check (`if (!document.content.includes("## How to Apply"))`) fires BEFORE the split — enforcement preserved.
2. Split the raw string on the `## How to Apply` heading.
3. Call `compileMDX` twice, return both compiled strings.
4. `allNodes` items gain a `mdxHowToApply` field alongside `mdx`.
5. Panel renders `mdxHowToApply` pinned at top, `mdx` below.

**Concrete transform shape (content-collections.ts):**

```typescript
transform: async (document, context) => {
  // CI enforcement — must precede split (D-13, CONT-02 success criterion 3)
  if (!document.content.includes("## How to Apply")) {
    throw new Error(
      `Node "${document.id}": missing required "## How to Apply" section (D-03).`
    );
  }

  // Split on the heading — keep heading in the howToApply chunk for MDX rendering
  const HOW_TO_APPLY_RE = /^## How to Apply\s*/m;
  const splitIdx = document.content.search(HOW_TO_APPLY_RE);
  const bodyRaw = document.content.slice(0, splitIdx).trim();
  const howToApplyRaw = document.content.slice(splitIdx).trim();

  // Compile both sections separately [CITED: content-collections.dev/docs/content/mdx]
  const mdx = await compileMDX(context, { ...document, content: bodyRaw });
  const mdxHowToApply = await compileMDX(context, {
    ...document,
    content: howToApplyRaw,
  });

  return { ...document, mdx, mdxHowToApply };
},
```

**Parallel-schema sync:** `mdx` and `mdxHowToApply` are transform-output fields, NOT frontmatter fields — they do NOT need to be added to `NodeFrontmatterSchema` in `src/schemas/node.ts`. The sync note applies only to frontmatter schema fields.

**Edge case:** If `bodyRaw` is empty (node content is only the howToApply section), `compileMDX` still succeeds with an empty string — MDXContent renders nothing. Not a CI failure; acceptable.

---

### Q2 — Lazy-Load Mechanism for Panel Content

**Recommendation: TanStack Query `useQuery` with synchronous queryFn over `allNodes`.**

**Rationale:**
- `allNodes` from content-collections is a static in-memory module — no network fetch needed.
- `useQuery` provides loading/error states, per-nodeId caching (no double-lookup on re-open), and follows the committed TanStack stack (CLAUDE.md).
- Satisfies ADR-002 ("via TanStack Query") and establishes the QueryClient infrastructure for Phase 7.
- `staleTime: Infinity` — static content never stales between deploys.
- Contrast with server function: adds unnecessary HTTP round-trip for synchronous in-memory data; creates network dependency for a content-only operation.
- Contrast with plain `useMemo`: does not cache across panel open/close cycles; no loading state for future dynamic content.

**QueryClient setup (Wave 0 task — add to `src/routes/__root.tsx`):**

```typescript
// src/routes/__root.tsx — add QueryClient + QueryClientProvider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // default 5 min; node-content uses Infinity
    },
  },
});

// In the root component, wrap children with:
// <QueryClientProvider client={queryClient}>
//   {children}
// </QueryClientProvider>
```

**Query options module (src/lib/node-content-query.ts):**

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { queryOptions } from "@tanstack/react-query";
import { allNodes } from "content-collections";
import type { NodeFrontmatter } from "#/schemas/node";

export const nodeContentQueryOptions = (nodeId: string | null) =>
  queryOptions({
    queryKey: ["node-content", nodeId],
    queryFn: (): NodeFrontmatter => {
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      // allNodes items include mdx + mdxHowToApply from transform
      return node as unknown as NodeFrontmatter;
    },
    staleTime: Infinity, // static build-time content
    enabled: nodeId !== null,
  });
```

**Panel content component:**

```typescript
const { data: nodeContent, isLoading } = useQuery(
  nodeContentQueryOptions(selectedId)
);
```

**Note on type cast:** `allNodes` items carry `mdx` and `mdxHowToApply` beyond the `NodeFrontmatter` type — a narrow `NodeFrontmatterWithMDX` type is needed or a satisfies assertion. This is a Wave 0 task.

---

### Q3 — D-07: CitationSchema Discriminated Union

**Recommendation: `z.discriminatedUnion` with `kind` literal discriminator; keep shared fields on both branches.**

**Zod v4 syntax** [CITED: zod.dev/api]:

```typescript
// src/schemas/node.ts — replace existing CitationSchema

const ScienceCitationSchema = z.object({
  kind: z.literal("science"),
  /** Paper title, book, journal. */
  source: z.string().min(1),
  url: z.string().optional(),
  applicationNote: z.string().min(1, {
    error: "Every citation must have a non-empty applicationNote (D-03)",
  }),
});

const CreatorCitationSchema = z.object({
  kind: z.literal("creator"),
  /** Creator name (e.g. "Grubby", "TempO"). */
  source: z.string().min(1),
  url: z.string().optional(),
  applicationNote: z.string().min(1, {
    error: "Every citation must have a non-empty applicationNote (D-03)",
  }),
  /** Optional direct quote for the pro-wisdom callout (D-05). */
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

**Mirror in `content-collections.ts`** (parallel-schema sync rule):

```typescript
citations: z.array(
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("science"),
      source: z.string().min(1),
      url: z.string().optional(),
      applicationNote: z.string().min(1, {
        error: "Every citation must have a non-empty applicationNote (D-03)",
      }),
    }),
    z.object({
      kind: z.literal("creator"),
      source: z.string().min(1),
      url: z.string().optional(),
      applicationNote: z.string().min(1, {
        error: "Every citation must have a non-empty applicationNote (D-03)",
      }),
      quote: z.string().optional(),
    }),
  ])
),
```

**Seed MDX migration — 13 files.** Each citation YAML block needs `kind: science` or `kind: creator` added. Pattern:
- Authors with paper/study names → `kind: science`
- Named WC3 players/channels → `kind: creator`

Example from `map-control.mdx`:
```yaml
citations:
  - kind: science
    source: "Mikkelsen et al. (2009) — Deliberate Practice and Performance in Games of Skill"
    applicationNote: ...
  - kind: creator
    source: "Grubby (YouTube)"
    url: "https://www.youtube.com/c/Grubby"
    applicationNote: ...
    quote: "Map control — specifically denying opponent creeping routes — is the single largest skill gap between intermediate and high-level players."
```

**Rendering flow:**
- `kind === "science"` → assign sequential index → `[n]` superscript inline + numbered reference row at panel bottom
- `kind === "creator"` → `ProWisdomCallout` card (quote + applicationNote + source name + URL)

---

### Q4 — MDX Rendering in TanStack Start

**Recommendation: `MDXContent` from `@content-collections/mdx/react` with custom components for citation markers and callouts.**

**Pattern** [CITED: content-collections.dev — websearch-confirmed]:

```typescript
import { MDXContent } from "@content-collections/mdx/react";

// Custom components passed to MDXContent
const mdxComponents = {
  // Map MDX citation shortcodes to inline superscript components
  // Author MDX as: <Ref id="1" /> or rely on remark plugin for [1] → <sup>
  sup: ({ children }) => (
    <sup className="text-rune-400 font-mono text-xs ml-0.5">{children}</sup>
  ),
  // Custom blockquote for callout-style rendering within body
  blockquote: (props) => <CalloutBlock {...props} />,
  // Anchor links with security check
  a: ({ href, children }) => {
    const safe = href?.startsWith("http") || href?.startsWith("https");
    return safe ? (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ) : null;
  },
};

// Usage in panel component
<MDXContent code={nodeContent.mdxHowToApply} components={mdxComponents} />
<MDXContent code={nodeContent.mdx} components={mdxComponents} />
```

**SSR safety:** `MDXContent` evaluates the compiled JS string using a `Function` constructor — this is client-side execution. Wrap the panel in `<ClientOnly>` (already done for `RoadmapGraph` — the panel renders inside the same `<ClientOnly>` boundary).

**Inline citation `[n]` approach:** In the MDX body text, authors write prose naturally (no special markers). The citations array drives the numbered references. The science citations are listed at the panel bottom with their index number — the inline `[n]` superscript appears inside the body via a remark plugin that transforms sequences like `[^1]` or a custom MDX component. **Simplest approach for Phase 3:** render citations as a list at the panel bottom; omit inline body superscripts for now. Full superscript-in-prose is a Phase 3.1 refinement. Include as a `## Open Questions` item.

**`a` element security:** Citation `url` fields are rendered as links — validate protocol (http/https only) before rendering as `<a href>`. Never render `javascript:` URLs. See Security Domain section.

---

### Q5 — SSR-Safe Drawer/Sheet for Panel

**Recommendation: Two `motion.div` fixed panels inside `<ClientOnly>` wrapper; CSS `hidden md:block` / `block md:hidden` for responsive switching. No Radix portal.**

**Why not shadcn Sheet (Radix portal):**
- Radix Dialog renders into `document.body` via `ReactDOM.createPortal`
- CSS `hidden md:block` on the parent does NOT hide portal content (portals escape the CSS cascade)
- To use two Sheet instances (one per breakpoint) with CSS control, both would render into body — the hidden one would still be mounted and its keyboard trap active
- The workaround (JS media query hook) violates the project's CSS-only responsive constraint

**Why `motion.div` fixed panels work:**
- Positioned `div`s render in the normal DOM tree inside `<ClientOnly>`
- CSS `hidden md:block` on a `position: fixed` div still controls `display` — the element is hidden in the paint layer when the class applies
- `AnimatePresence` handles enter/exit; no portal behavior
- Already established: Phase 2 uses this pattern for `ClientOnly` + CSS class control

**Desktop panel (right side):**

```tsx
// Inside RoadmapGraph > GraphCanvas (already inside ClientOnly)
<AnimatePresence>
  {selectedId && (
    <motion.aside
      key="node-panel-desktop"
      className="hidden md:flex fixed right-0 top-[56px] bottom-0 z-50 w-[480px] flex-col bg-obsidian-900 border-l border-obsidian-600 overflow-hidden"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
    >
      <NodePanelContent nodeId={selectedId} onClose={() => setSelectedNode(null)} />
    </motion.aside>
  )}
</AnimatePresence>

{/* Backdrop dim — graph dimmed when panel open (D-01) */}
<AnimatePresence>
  {selectedId && (
    <motion.div
      key="panel-backdrop"
      className="hidden md:block fixed inset-0 top-[56px] bg-obsidian-950/60 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSelectedNode(null)}
      style={{ pointerEvents: "all" }}
    />
  )}
</AnimatePresence>
```

**Mobile bottom sheet (~80% height):**

```tsx
// Inside MobileNodeList (SSR-safe — no ClientOnly wrapping here)
// However, motion.div requires client — wrap in dynamic import or ClientOnly
<AnimatePresence>
  {selectedId && (
    <motion.div
      key="node-panel-mobile"
      className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-obsidian-900 border-t border-obsidian-600 rounded-t-xl overflow-hidden"
      style={{ height: "80svh" }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0 }}
      onDragEnd={(_e, info) => {
        if (info.velocity.y > 300 || info.offset.y > 120) {
          setSelectedNode(null);
        }
      }}
    >
      <NodePanelContent nodeId={selectedId} onClose={() => setSelectedNode(null)} />
    </motion.div>
  )}
</AnimatePresence>
```

**Motion drag for swipe-to-dismiss:** `drag="y"` with `dragConstraints={{ top: 0 }}` (can't drag up beyond natural position), `onDragEnd` checks velocity (`> 300px/s`) or offset (`> 120px`) to trigger close. This replaces vaul entirely.

**Width and animation tokens** (ADR 0001 constraints):
- Panel background: `var(--color-obsidian-900)`
- Border: `var(--color-obsidian-600)`
- Desktop width: 480px (Claude's discretion per D-01)
- Spring damping: 28, stiffness: 280 — matches Motion's "natural" feel
- Dismiss: Esc key via `useEffect` on `keydown`; click-away via backdrop click; close button

**MobileNodeList client concern:** The mobile sheet is `AnimatePresence`-based and needs the DOM. Since `MobileNodeList` is SSR-rendered (no ClientOnly wrapper), the mobile sheet needs its own `<ClientOnly>` boundary. Wrap the `AnimatePresence` mobile sheet in a lazy-imported client component. Alternatively: move all panel logic into the Home component and pass it down — both platforms' panels live in Home which can have a single `<ClientOnly>` wrapper for the panel layer.

**Recommended architecture:** Home component owns panel state (from Zustand). The panels are mounted adjacent to the responsive containers, inside a single `<ClientOnly>` at the Home level:

```tsx
function Home() {
  const { nodes, pathway } = Route.useLoaderData();
  return (
    <main>
      <TopBar /> {/* includes FilterBar */}
      {/* Desktop */}
      <div className="hidden md:block" style={{ height: "calc(100dvh - 56px)" }}>
        <RoadmapGraph nodes={nodes} pathway={pathway} />
      </div>
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileNodeList nodes={nodes} pathway={pathway} />
      </div>
      {/* Panel layer — client-only, above both */}
      <ClientOnly>
        <NodeDetailPanel /> {/* reads selectedId from store; renders desktop + mobile variants */}
      </ClientOnly>
    </main>
  );
}
```

---

### Q6 — D-11: Projection Extension + ADR

**ADR-006 required.** Per ADR-005 rule: "Adding any further field to `GraphDisplayNode` requires a new ADR."

**Schema change (src/schemas/graph.ts):**

```typescript
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  // ADR-006: added for GRAPH-04 search/filter (Phase 3)
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
});
```

**ADR-006 summary to include in `docs/adr/006-graph-display-node-skilltype-tags.md`:**
- **Status:** Accepted
- **Fields added:** `skillType: z.enum(["macro","micro","mental"])`, `tags: z.array(z.string())`
- **Rationale:** GRAPH-04 requires filtering by skillType and search by tags. Both fields are display-classification attributes (not content body fields), equivalent in nature to `difficulty` (ADR-005 precedent). The projection remains explicit and narrow.
- **Rule maintained:** Any further addition still requires a new ADR.

**Loader update (src/routes/index.tsx):**

```typescript
const result = GraphDisplayNodeSchema.safeParse({
  id: n.id,
  title: n.title,
  nodeType: n.nodeType,
  race: n.race,
  prerequisites: n.prerequisites,
  difficulty: n.difficulty,
  skillType: n.skillType,   // new — ADR-006
  tags: n.tags,              // new — ADR-006
});
```

**No migration needed** — `skillType` and `tags` are already in `NodeFrontmatterSchema` (defined in Phase 1) and all 13 seed MDX files include them. The projection change is additive.

---

### Q7 — Search + Filter on the Graph (GRAPH-04)

**Recommendation: Extend `graph-store.ts` with all panel + filter state. Pure `matchesFilter` function in `src/lib/filter-utils.ts`. `useMemo` in `GraphCanvas` drives dim computation.**

**graph-store.ts extension:**

```typescript
export interface GraphStore {
  // --- existing Phase 2 state ---
  hoveredNodeId: string | null;
  ancestorEdgeIds: Set<string>;
  setHoveredNode: (nodeId: string | null, edges: Edge[]) => void;

  // --- new Phase 3: panel state ---
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // --- new Phase 3: filter state ---
  searchQuery: string;
  activeFilters: ActiveFilters;
  setSearchQuery: (q: string) => void;
  setFilter: (facet: keyof ActiveFilters, values: string[]) => void;
  clearFilters: () => void;
}

export interface ActiveFilters {
  race: string[];
  skillType: string[];
  difficulty: string[];
  mastery: string[];
}
```

**Pure filter function (src/lib/filter-utils.ts):**

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import type { GraphDisplayNode } from "#/schemas/graph";
import type { MasteryState } from "#/lib/mock-mastery";
import type { ActiveFilters } from "#/lib/graph-store";

export function matchesFilter(
  node: GraphDisplayNode,
  mastery: MasteryState,
  searchQuery: string,
  filters: ActiveFilters
): boolean {
  // Free-text: OR over title + tags (D-10)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const matchesTitle = node.title.toLowerCase().includes(q);
    const matchesTags = node.tags.some((t) => t.toLowerCase().includes(q));
    if (!matchesTitle && !matchesTags) return false;
  }
  // Facets: AND across, OR within (D-10)
  if (filters.race.length > 0 && !filters.race.includes(node.race)) return false;
  if (filters.skillType.length > 0 && !filters.skillType.includes(node.skillType)) return false;
  if (filters.difficulty.length > 0 && !filters.difficulty.includes(node.difficulty)) return false;
  if (filters.mastery.length > 0 && !filters.mastery.includes(mastery)) return false;
  return true;
}

/** True when no search or filters are active — avoids unnecessary dim computation. */
export function isFilterActive(searchQuery: string, filters: ActiveFilters): boolean {
  return (
    searchQuery.trim().length > 0 ||
    Object.values(filters).some((v) => v.length > 0)
  );
}
```

**Dim computation in GraphCanvas (mirrors Phase 2 spotlight pattern — D-08):**

```typescript
// In GraphCanvas, after existing displayNodes useMemo:
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

**Key: subscribe to store slice (not whole store) to avoid re-renders on hover changes.**

**FilterBar in top bar (src/routes/index.tsx):**
- Search `<input>` with `onChange → setSearchQuery` (controlled, debounced optional)
- Facet buttons for race/skillType/difficulty/mastery — toggle values in `activeFilters[facet]`
- "Clear filters" button when `isFilterActive`
- All live in the 56px top bar (D-09)

**Mastery filter reads `MOCK_MASTERY` in Phase 3** — same source as `getMockMastery`. Real persistence added in Phase 5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MDX compilation | Custom MDX parser/renderer | `compileMDX` + `MDXContent` from `@content-collections/mdx` | compileMDX handles remark/rehype chain, code splitting, SSR-compatible output |
| Animated enter/exit | CSS keyframes + JS class toggle | `AnimatePresence` + `motion.div` from `motion/react` | Handles interrupted animations, unmount timing, spring physics |
| Panel state machine | Custom open/close/loading state | `useQuery` (loading/error/data) + Zustand (selectedId) | Query state covers loading, error, refetch; Zustand covers cross-component open/close |
| Citation `[n]` numbering | Manual index tracking in render | Derive indices from `citations.filter(c => c.kind === 'science')` array position | Array `.findIndex` is sufficient; React state for numbering is over-engineered |
| Search | Fuzzy search library | `String.toLowerCase().includes()` | Title + tags search is exact substring — no fuzzy needed at this node count |
| Filter dim | Unmount filtered nodes | Style update (`opacity: 0.15, pointerEvents: none`) | D-08 explicitly requires mounted-but-dimmed; unmounting breaks the shape |
| Swipe-to-dismiss | vaul / gesture library | `motion.div` with `drag="y"` + `onDragEnd` | Motion is already in project; 10 lines replaces a dependency |

---

## Common Pitfalls

### Pitfall 1: Portal CSS visibility mismatch
**What goes wrong:** Using shadcn `Sheet` (Radix portal) and wrapping it in `hidden md:block` — the portal escapes to `document.body` and remains visible.
**Why it happens:** CSS cascade doesn't follow portal content to its new DOM location.
**How to avoid:** Use `motion.div` with `position: fixed` inside `<ClientOnly>` — no portal, CSS classes work normally.
**Warning signs:** Sheet is visible on mobile when it shouldn't be, or vice versa.

### Pitfall 2: compileMDX called on empty string
**What goes wrong:** If `bodyRaw` after split is empty (content starts directly with `## How to Apply`), `compileMDX` still succeeds but `MDXContent` renders nothing — confusing for authors.
**How to avoid:** Add a check: if `bodyRaw.trim().length === 0`, throw an error ("Node content must have prose before ## How to Apply").
**Warning signs:** Panel shows only the howToApply section, no explanatory text.

### Pitfall 3: Zustand store over-subscription in GraphCanvas
**What goes wrong:** `GraphCanvas` subscribes to `useGraphStore()` (whole store) — any `hoveredNodeId` change triggers re-render of the whole canvas component.
**How to avoid:** Subscribe to slices: `useGraphStore(s => ({ searchQuery: s.searchQuery, activeFilters: s.activeFilters }))`. Use `shallow` comparator from `zustand/shallow`.
**Warning signs:** Profiler shows canvas re-rendering on every mouse hover.

### Pitfall 4: MDXContent evaluated client-side only
**What goes wrong:** `MDXContent` uses `Function` constructor internally — server renders throw if executed in SSR context.
**How to avoid:** The panel is inside `<ClientOnly>` — `MDXContent` only evaluates on the client. Never render `NodePanelContent` outside a `<ClientOnly>` boundary.
**Warning signs:** `EvalError` or `Function constructor` errors in server logs.

### Pitfall 5: citation `url` field rendered unsanitized
**What goes wrong:** A `url` value like `javascript:alert(1)` rendered as `<a href>` executes JS.
**How to avoid:** In the `a` custom MDX component AND the citation list renderer, validate: only render links where `url.startsWith("http://") || url.startsWith("https://")`. Default to rendering source text without a link otherwise.
**Warning signs:** Linter or code review catching `href={url}` without sanitization.

### Pitfall 6: `setNodes` drives infinite re-render loop
**What goes wrong:** `useEffect(() => { setNodes(filteredDisplayNodes) }, [filteredDisplayNodes, setNodes])` — if `setNodes` is not stable or `filteredDisplayNodes` changes every render, triggers a loop.
**How to avoid:** Ensure `filteredDisplayNodes` is a `useMemo` (stable reference when inputs are unchanged). The Phase 2 code already has this pattern — extend it, don't replace it.
**Warning signs:** React DevTools shows infinite render count; browser tab freezes.

### Pitfall 7: Parallel CitationSchema sync divergence
**What goes wrong:** Adding `kind` discriminator to `src/schemas/node.ts` but forgetting to update `content-collections.ts` — the build-time validation uses the old schema and accepts citations without `kind`, but runtime fails.
**How to avoid:** The "PARALLEL-SCHEMA SYNC NOTE" in both files is the reminder. Treat these as a single unit — one task, both files changed in the same commit.
**Warning signs:** `z.discriminatedUnion` parse error in runtime despite build succeeding.

---

## Runtime State Inventory

Phase 3 is a feature addition phase, not a rename/refactor. No runtime state inventory required.

Clarification: the `MOCK_MASTERY` map in `mock-mastery.ts` is the mastery source for the Phase 3 filter facet. The mastery facet reads this static in-memory map — no migration needed. Phase 5 replaces this source.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` (project root) |
| Current environment | `node` — **needs extension to `jsdom` for React component tests** |
| Quick run command | `npx vitest run src/lib/filter-utils.test.ts src/schemas/node.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | `CitationSchema` validates `kind: "science"` and `kind: "creator"` | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| CONT-02 | Transform throws when `## How to Apply` absent | unit (transform mock) | `npx vitest run` | ❌ Wave 0 |
| CONT-03 | `kind: "creator"` discriminator produces `CreatorCitation` type | unit | `npx vitest run src/schemas/node.test.ts` | ❌ Wave 0 |
| GRAPH-03 | `nodeContentQueryOptions` returns correct node by ID | unit | `npx vitest run src/lib/node-content-query.test.ts` | ❌ Wave 0 |
| GRAPH-04 | `matchesFilter` — AND across facets, OR within | unit | `npx vitest run src/lib/filter-utils.test.ts` | ❌ Wave 0 |
| GRAPH-04 | `isFilterActive` returns true/false correctly | unit | `npx vitest run src/lib/filter-utils.test.ts` | ❌ Wave 0 |
| ADR-006 | `GraphDisplayNodeSchema` includes skillType + tags | compile check | `npx tsc --noEmit` | ❌ (schema change) |
| CONT-02 | `## How to Apply` present in all 13 seed nodes | content validation | `npm run validate` | ✅ (validate-content.ts already checks) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/filter-utils.test.ts src/schemas/node.test.ts src/lib/node-content-query.test.ts`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green (`npx vitest run`) + smoke test panel opens with real content before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/schemas/node.test.ts` — extend with CitationSchema `kind` discriminator tests (new kind field, invalid kind rejected, `quote` optional on creator)
- [ ] `src/lib/filter-utils.test.ts` — new file: `matchesFilter` (all facet combinations), `isFilterActive` edge cases
- [ ] `src/lib/node-content-query.test.ts` — new file: queryOptions enabled/disabled, found/not-found
- [ ] `vitest.config.ts` — add `environment: "jsdom"` option if React component tests are added (or use `// @vitest-environment jsdom` per-file)
- [ ] `src/routes/__root.tsx` — `QueryClientProvider` setup (not a test file, but a Wave 0 infrastructure task)

---

## Security Domain

Security enforcement is enabled (`security_enforcement: true`, ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in scope (Phase 4) |
| V3 Session Management | no | Not in scope (Phase 4) |
| V4 Access Control | no | Not in scope (Phase 4) |
| V5 Input Validation | YES | Search input: client-side string matching, no server processing. Citation URLs: protocol allowlist (`http://`, `https://` only). |
| V6 Cryptography | no | No secrets in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious citation URL (`javascript:` / `data:`) | Tampering / XSS | URL protocol allowlist before rendering as `<a>`. See Pitfall 5 and Q4 custom `a` component. |
| MDX content injection | Tampering | Content is repo-controlled (authors = trusted); not user-supplied. Low risk. Document that `MDXContent` executes compiled JS — never pass user-generated MDX to `compileMDX`. |
| Search input rendered unsanitized | XSS | Search query is used in `.includes()` comparison only — never rendered as HTML. Safe by construction. |
| Citation `source` rendered as-is | XSS | `source` is a string rendered as text content (not `dangerouslySetInnerHTML`). React's JSX auto-escapes text. Safe. |

**High-risk items blocking phase:** None. No auth-gated server functions; no user-controlled content rendering; no DB writes. This is a read-only content rendering phase.

---

## Files to Create / Modify

### New files
| File | Purpose |
|------|---------|
| `src/lib/filter-utils.ts` | `matchesFilter`, `isFilterActive`, `ActiveFilters` type |
| `src/lib/node-content-query.ts` | `nodeContentQueryOptions(id)` |
| `src/components/graph/NodeDetailPanel.tsx` | Fixed `motion.div` panel — desktop + mobile variants, `AnimatePresence`, `NodePanelContent` |
| `src/components/graph/NodePanelContent.tsx` | Inner panel: query, loading state, `MDXContent` howToApply + body, citation list, prereq chips |
| `src/components/graph/CitationList.tsx` | Numbered science refs + applicationNote; pro-wisdom callout |
| `src/components/graph/ProWisdomCallout.tsx` | Creator citation callout card (quote + applicationNote + source) |
| `src/components/graph/PrerequisiteChips.tsx` | Clickable chip row → `setSelectedNode` |
| `src/components/graph/FilterBar.tsx` | Top-bar search input + facet toggle buttons |
| `docs/adr/006-graph-display-node-skilltype-tags.md` | ADR for D-11 projection extension |
| `src/lib/filter-utils.test.ts` | Unit tests for matchesFilter + isFilterActive |
| `src/lib/node-content-query.test.ts` | Unit tests for queryOptions |

### Modified files
| File | Change |
|------|--------|
| `content-collections.ts` | Transform-time split (D-13): dual `compileMDX`; mirror CitationSchema discriminator |
| `src/schemas/node.ts` | `CitationSchema` → `z.discriminatedUnion`; export `ScienceCitation`, `CreatorCitation`, `Citation` |
| `src/schemas/graph.ts` | `GraphDisplayNodeSchema.extend({ skillType, tags })` |
| `src/lib/graph-store.ts` | Add `selectedNodeId`, `setSelectedNode`, `searchQuery`, `activeFilters`, `setSearchQuery`, `setFilter`, `clearFilters` |
| `src/routes/index.tsx` | Extend loader projection (skillType, tags); add `FilterBar` to top bar; add `NodeDetailPanel` in ClientOnly |
| `src/routes/__root.tsx` | Add `QueryClient` + `QueryClientProvider` setup |
| `src/components/graph/RoadmapGraph.tsx` | Wire `onNodeClick` → `setSelectedNode(node.id)` (replace Phase 2 no-op stub) |
| `src/components/graph/MobileNodeList.tsx` | Wire `onClick`/`onKeyDown` → `setSelectedNode(node.id)` |
| `content/nodes/*.mdx` (all 13) | Add `kind: science` or `kind: creator` to each citation YAML block |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | content-collections build | ✓ | (project running) | — |
| Vitest | unit tests | ✓ | 4.1.9 | — |
| TypeScript | type checking | ✓ | 6.0.3 | — |
| `@tanstack/react-query` | panel content query | ✗ (not installed) | — | Plain `useMemo` over `allNodes` (degrades caching) |
| content-collections CLI | MDX build | ✓ | 0.1.9 | — |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** `@tanstack/react-query` — fallback is `useMemo(() => allNodes.find(...))` but this defers the TanStack Query integration and loses caching. Recommend installing in Phase 3.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `framer-motion` import | `import { motion, AnimatePresence } from "motion/react"` | Renamed; old package still exists but creates a duplicate dependency |
| `reactflow` npm package | `@xyflow/react` v12 | Old package name; v12 adds SSR, dark mode, Tailwind v4 |
| Contentlayer | `@content-collections/core` | Contentlayer abandoned ~2024; content-collections is the successor |
| Radix primitives per package (`@radix-ui/react-dialog`) | `radix-ui` unified package v1.6.0 | Monolithic package; project already uses it |
| `tailwindcss-animate` | CSS transitions or Motion | Deprecated in shadcn/ui as of March 2025 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `compileMDX` accepts `{ ...document, content: substring }` as second argument (passing a partial document is valid) | Q1 Transform code shape | Transform would fail if the second argument requires the full original document shape; mitigation: test in Wave 0 |
| A2 | `MDXContent` uses `Function` constructor internally (client-only) | Q4 SSR safety | If MDXContent IS SSR-safe, the ClientOnly wrapping is unnecessary overhead but not harmful |
| A3 | `radix-ui` v1.6.0 unified package includes the Dialog primitive (required by shadcn Sheet) | Q5 alternatives considered | If Dialog is not in `radix-ui`, `npx shadcn add sheet` will add `@radix-ui/react-dialog` automatically |
| A4 | `@tanstack/react-query` v5.x is compatible with `@tanstack/react-start` v1.168.x | Q2 QueryClient setup | Incompatibility would require using TanStack Start's built-in loader data instead; unlikely given same monorepo |
| A5 | vaul is no longer actively maintained (based on GitHub repo description in search result) | Q5 panel recommendation | If vaul is maintained, shadcn Drawer remains a valid option; would need portal-open-state workaround for CSS breakpoints |

---

## Open Questions

1. **Inline `[n]` superscripts in prose body**
   - What we know: science citations are listed at the panel bottom with index numbers
   - What's unclear: should inline `[^1]`-style markers in MDX prose be transformed to `<sup>` via a remark plugin, or should authors not use inline markers at all?
   - Recommendation: defer inline superscripts to a refinement; Phase 3 renders citation list at panel bottom only. Authors write prose naturally; the citation list at the bottom earns each source's place via `applicationNote`. Plan a task to decide and implement if the UX team wants inline refs.

2. **MDX remark/rehype plugin chain**
   - What we know: `compileMDX` accepts plugin options
   - What's unclear: do the seed MDX files use any remark syntax (footnotes, directives) that requires plugins?
   - Recommendation: inspect existing MDX files — they appear to use standard GFM Markdown. No plugins needed for Phase 3.

3. **`__root.tsx` QueryClient + hydration**
   - What we know: TanStack Start requires `dehydrate/hydrate` for TanStack Query SSR integration
   - What's unclear: does Phase 3 need full dehydration (for SSR-prefetched data) or just a client-side QueryClient?
   - Recommendation: client-only QueryClient for Phase 3 (no dehydration needed — content-collections data is in the bundle, not fetched from the server). Full dehydration deferred to Phase 7 (w3champions API calls that need SSR prefetching).

---

## Sources

### Primary (MEDIUM confidence — web search + codebase grounding)
- Existing project codebase — `content-collections.ts`, `src/schemas/node.ts`, `src/schemas/graph.ts`, `src/lib/graph-store.ts`, `src/routes/index.tsx`, `src/components/graph/RoadmapGraph.tsx`, `src/components/graph/MobileNodeList.tsx`, `src/lib/mock-mastery.ts` — authoritative source for integration points
- ADR-002 and ADR-005 — locked architectural boundaries that constrain all decisions

### Secondary (MEDIUM confidence — web search)
- [zod.dev/api — z.discriminatedUnion](https://zod.dev/api) — Zod v4 syntax confirmed
- [shadcn/ui Sheet docs](https://ui.shadcn.com/docs/components/sheet) — `side` prop, Radix Dialog base
- [TanStack Query with createServerFn](https://www.brenelz.com/posts/using-server-functions-and-tanstack-query/) — `useServerFn` + `queryOptions` pattern
- [content-collections MDX docs](https://www.content-collections.dev/docs/content/mdx) — compileMDX + MDXContent rendering pattern (403 on direct fetch, confirmed via web search results)
- [motion.dev AnimatePresence](https://motion.dev/docs/react-animate-presence) — modes, drag integration

### Tertiary (LOW confidence — training knowledge, marked [ASSUMED])
- compileMDX second-argument partial document shape (A1)
- MDXContent SSR safety (A2)
- vaul maintenance status (A5)

---

## Metadata

**Confidence breakdown:**
- Transform-time section split: MEDIUM — pattern consistent with content-collections API design; `compileMDX` flexibility confirmed by search; exact argument shape is [ASSUMED]
- Panel primitive (motion.div): HIGH — directly derived from existing Phase 2 ClientOnly pattern; no new library needed
- CitationSchema discriminated union: HIGH — Zod v4 z.discriminatedUnion confirmed from official docs
- TanStack Query lazy load: MEDIUM — pattern confirmed from official TanStack docs and community articles
- Filter + store extension: HIGH — pure extension of established Phase 2 Zustand pattern; matchesFilter is pure logic
- ADR-006 projection extension: HIGH — direct application of ADR-005 precedent to new fields

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days — stack is stable; content-collections and motion APIs are stable)
