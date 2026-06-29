---
phase: "03"
plan: "08"
subsystem: ui / node-detail-panel
tags: [tanstack-query, motion, client-only, mdx-content, drawer, bottom-sheet, d-12, d-01, d-02, d-03, d-14, graph-03, cont-01, cont-02, cont-03]

requires:
  - phase: "03-05"
    provides: "nodeContentQueryOptions factory + NodeFrontmatterWithMDX type"
  - phase: "03-06"
    provides: "CitationList + ProWisdomCallout components"
  - phase: "03-07"
    provides: "PrerequisiteChips component"

provides:
  - "NodePanelContent — query + loading/error + D-12 pinned How-to-Apply + body + ProWisdomCallout + CitationList + PrerequisiteChips"
  - "NodeDetailPanel — single ClientOnly; desktop right-drawer + mobile bottom-sheet motion.div; Esc/click-away/close dismiss; live content swap"

affects:
  - "03-09 (index.tsx integration — mounts NodeDetailPanel in Home component)"
  - "03-10 (RoadmapGraph.tsx — onNodeClick stub wired to setSelectedNode in plan 03-10)"

tech-stack:
  added: []
  patterns:
    - "NodePanelContent: useQuery(nodeContentQueryOptions(nodeId)) — lazy content per selected node"
    - "D-12 practical-first: mdxHowToApply (rune-gold card at top) before mdx body"
    - "mdxComponents.a: isSafeUrl() http(s)-only allowlist — same T-3-01 guard as CitationList/ProWisdomCallout"
    - "module-scope _ALL_NODE_TITLES lookup from allNodes for PrerequisiteChips nodeTitles"
    - "NodeDetailPanel: ClientOnly(fallback=null) wrapping NodeDetailPanelInner"
    - "Two AnimatePresence groups: desktop drawer (x spring) + mobile sheet (y spring + drag)"
    - "Esc key useEffect on document; backdrop onClick; swipe-to-dismiss onDragEnd velocity/offset"
    - "CSS-only responsive split: hidden md:flex (desktop aside) / block md:hidden (mobile div)"

key-files:
  created:
    - src/components/graph/NodePanelContent.tsx
    - src/components/graph/NodeDetailPanel.tsx
  modified: []

key-decisions:
  - "D-12 How-to-Apply block styled as obsidian-800 card with rune-400 left accent — visually distinct from prose body"
  - "mdxComponents defined at module scope (stable reference — no re-creation on render)"
  - "isSafeUrl() duplicated in NodePanelContent (same pattern as CitationList/ProWisdomCallout) — security contract visible at render site without import hop"
  - "_ALL_NODE_TITLES Map built once at module scope from allNodes — no per-render cost for PrerequisiteChips labels"
  - "Desktop backdrop uses color-mix(in oklab, var(--color-obsidian-950) 60%, transparent) — CSS-variable-based opacity without Tailwind /60 modifier uncertainty"
  - "selectedNodeId as key on motion panels (node-panel-desktop-{id}, node-panel-mobile-{id}) — swaps content on node change without close/reopen (D-02)"
  - "Motion spring: damping 28 / stiffness 280 for both desktop slide and mobile slide; swipe threshold: velocity.y > 300 || offset.y > 120"

requirements-completed: [GRAPH-03, CONT-01, CONT-02, CONT-03]

coverage:
  - id: D1
    description: "NodePanelContent renders mdxHowToApply pinned at top (D-12 practical-first), then mdx body, then ProWisdomCallout, then CitationList, then PrerequisiteChips"
    requirement: GRAPH-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit — clean; component structure verified by code review"
        status: pass
    human_judgment: true
    rationale: "Panel rendering order requires visual inspection with a selected node"
  - id: D2
    description: "NodePanelContent loading skeleton and error state render as distinct sub-components (PanelLoadingSkeleton, PanelErrorState)"
    requirement: GRAPH-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit — clean; both sub-components exist in NodePanelContent.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "MDXContent receives mdxComponents with a http(s)-only allowlist on a (T-3-01 mitigation)"
    requirement: CONT-01
    verification:
      - kind: other
        ref: "Code review: isSafeUrl() in NodePanelContent.tsx; javascript:/data: URLs render as <span>, not <a>"
        status: pass
    human_judgment: false
  - id: D4
    description: "NodeDetailPanel desktop variant is hidden md:flex fixed right drawer with hidden md:block backdrop; mobile is block md:hidden 80svh bottom sheet with drag=y"
    requirement: GRAPH-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit — clean; className attributes verified in NodeDetailPanel.tsx"
        status: pass
    human_judgment: true
    rationale: "Responsive layout and animation require browser rendering to verify"
  - id: D5
    description: "Esc key, backdrop click, and close button all call setSelectedNode(null)"
    requirement: GRAPH-03
    verification:
      - kind: other
        ref: "Code review: useEffect keydown + backdrop onClick + onClose prop all call handleClose()"
        status: pass
    human_judgment: false
  - id: D6
    description: "motion/AnimatePresence imported from motion/react; no Radix portal; CSS-only responsive split"
    requirement: GRAPH-03
    verification:
      - kind: other
        ref: "Import statements in NodeDetailPanel.tsx confirmed: from 'motion/react'; no portal import"
        status: pass
    human_judgment: false

duration: 6min
completed: "2026-06-29"
status: complete
---

# Phase 03 Plan 08: NodePanelContent + NodeDetailPanel Summary

**ClientOnly node detail panel assembly: D-12 pinned How-to-Apply + body + citations + chips in NodePanelContent; desktop right-drawer + mobile bottom-sheet with three dismiss paths in NodeDetailPanel**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-29T11:53:14Z
- **Completed:** 2026-06-29T12:00:00Z
- **Tasks:** 2
- **Files modified:** 2 (created)

## Accomplishments

- `NodePanelContent.tsx`: calls `useQuery(nodeContentQueryOptions(nodeId))`; renders `PanelLoadingSkeleton` while loading and `PanelErrorState` on error; on success renders in D-12 order: (1) `mdxHowToApply` in an obsidian-800 / rune-400-bordered card pinned at top, (2) `mdx` prose body, (3) `ProWisdomCallout`, (4) `CitationList`, (5) `PrerequisiteChips`; panel header shows node title + X close button; http(s)-only URL allowlist on `a` in `mdxComponents` (T-3-01); module-scope `_ALL_NODE_TITLES` map for chip labels; D-15 compliance (no `meta_volatile`/`last_reviewed`/`patch_context` surfaced)
- `NodeDetailPanel.tsx`: thin `<ClientOnly fallback={null}>` wrapping `NodeDetailPanelInner`; inner reads `selectedNodeId` from Zustand slice; desktop `motion.aside` (`hidden md:flex fixed right-0 top-[56px] bottom-0 z-50 w-[480px]`) slides x: 100%→0 (spring 28/280); `hidden md:block` backdrop dims graph and provides click-away dismiss; mobile `motion.div` (`block md:hidden fixed bottom-0 h-80svh`) slides y: 100%→0 (same spring); `drag="y"` swipe-to-dismiss when velocity.y > 300 or offset.y > 120; `useEffect` Esc key listener; `selectedNodeId` as motion key drives live content swap (D-02)

## Task Commits

1. **Task 1: NodePanelContent** — `33b9746` (feat)
2. **Task 2: NodeDetailPanel** — `17bdd07` (feat)

## Files Created/Modified

- `src/components/graph/NodePanelContent.tsx` — D-12 content panel: query + loading/error + How-to-Apply + body + ProWisdomCallout + CitationList + PrerequisiteChips + close button; http(s)-only MDX anchor allowlist
- `src/components/graph/NodeDetailPanel.tsx` — ClientOnly wrapper; desktop drawer + backdrop; mobile bottom sheet with swipe-to-dismiss; Esc/click-away/close dismiss paths

## Decisions Made

- **D-12 card styling:** How-to-Apply block is obsidian-800 with rune-400 left accent border — visually distinct from body prose, communicates primacy.
- **`_ALL_NODE_TITLES` at module scope:** Map is built once from `allNodes` (static bundle) — zero per-render cost. PrerequisiteChips gets O(1) label lookup.
- **`mdxComponents` at module scope:** stable reference avoids re-creating the object on every render cycle.
- **`isSafeUrl()` duplicated:** Same 2-line function in NodePanelContent, CitationList, and ProWisdomCallout — security contract is visible at every render site without an import hop. Intentional per project pattern.
- **`color-mix` for backdrop:** `color-mix(in oklab, var(--color-obsidian-950) 60%, transparent)` used for the backdrop overlay — CSS-variable-based without relying on Tailwind's `/60` opacity modifier (which may or may not work with custom theme values in Tailwind v4).
- **`selectedNodeId` as motion key:** Changing the selected node re-mounts the motion panel with a new animation cycle, ensuring content swap is visually clear (D-02).
- **Swipe threshold:** `velocity.y > 300 || info.offset.y > 120` matches the values from 03-RESEARCH.md §Q5 — fast flick or slow deliberate pull both dismiss.

## Deviations from Plan

None — plan executed exactly as written. Both components satisfy all acceptance criteria:
- D-12 ordering confirmed in NodePanelContent (How-to-Apply card pinned top)
- Loading and error states as distinct sub-components
- http(s)-only allowlist on all MDX anchor render paths
- D-15: no staleness fields surfaced
- Desktop: `hidden md:flex` fixed right drawer with `hidden md:block` backdrop
- Mobile: `block md:hidden` fixed bottom sheet with `drag="y"` swipe-to-dismiss
- Esc key + backdrop click + close button all dismiss
- `motion`/`AnimatePresence` from `motion/react`; no Radix portal
- `npx tsc --noEmit` clean for both files
- 195 tests passing (no regressions)

## Known Stubs

None. Both components are fully implemented. `NodeDetailPanel` is ready for integration into the route's `Home` component in plan 03-09.

## Threat Flags

None. T-3-01 (MDX body link XSS via `javascript:`/`data:` href) is now mitigated in `NodePanelContent` via `mdxComponents.a` with `isSafeUrl()` — same guard rule established in CitationList and ProWisdomCallout.

T-3-08 (MDXContent client eval) is accepted per plan threat register — MDX is repo-controlled, compiled at build time, and renders inside `<ClientOnly>` so the `Function` constructor never runs in SSR.

## Self-Check: PASSED

- src/components/graph/NodePanelContent.tsx: FOUND
- src/components/graph/NodeDetailPanel.tsx: FOUND
- 03-08-SUMMARY.md: FOUND (this file)
- Commit 33b9746 (Task 1 NodePanelContent): FOUND
- Commit 17bdd07 (Task 2 NodeDetailPanel): FOUND
- 195 tests passing: CONFIRMED
- npx tsc --noEmit: CLEAN

---
*Phase: 03-content-pipeline-node-panel*
*Completed: 2026-06-29*
