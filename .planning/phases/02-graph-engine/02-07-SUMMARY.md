---
phase: 02-graph-engine
plan: "07"
subsystem: graph-chrome
tags: [mobile, ssr, pathway-banner, accessibility]
dependency_graph:
  requires: ["02-02", "02-03", "02-06"]
  provides: [MobileNodeList, PathwayBanner]
  affects: ["02-10"]
tech_stack:
  added: []
  patterns: [ssr-safe-components, css-variable-tokens, no-op-tap-targets]
key_files:
  created:
    - src/components/graph/MobileNodeList.tsx
    - src/components/graph/PathwayBanner.tsx
  modified: []
decisions:
  - "MobileNodeList uses Map lookup for O(1) node retrieval by ID before partitioning into pathway/all-nodes sections"
  - "SectionDivider uses <hr> for semantic HTML; SectionLabel uses opacity:0.55 for muted text since no dedicated muted-text CSS variable exists in the design system"
  - "PathwayBanner uses inline style for rune-500 border to avoid shadcn outline variant default (which uses dark:border-input)"
  - "Button size='lg' (h-10 = 40px) matches UI-SPEC CTA height spec exactly"
metrics:
  duration: 1m
  completed: "2026-06-29"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
status: complete
---

# Phase 02 Plan 07: MobileNodeList and PathwayBanner Summary

SSR-safe mobile node card list and pathway identity banner — both pure HTML/React, no graph library, no JS viewport checks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MobileNodeList (SSR-safe node card list) | bd12521 | src/components/graph/MobileNodeList.tsx |
| 2 | PathwayBanner overlay | bd12521 | src/components/graph/PathwayBanner.tsx |

## What Was Built

### MobileNodeList (`src/components/graph/MobileNodeList.tsx`)

Props: `{ nodes: GraphDisplayNode[]; pathway: Pathway }`

- Obsidian-900 background, 100% height, scroll-y overflow
- Sticky header: `pathway.title` in Space Grotesk 22px/600, 24px padding, obsidian-700 bottom border
- "Your Pathway" section: `pathway.steps` mapped in order via a `Map<id, node>` lookup; unknown IDs skipped gracefully
- "All Nodes" section: remaining nodes filtered by Set of pathway step IDs
- Sections separated by 1px obsidian-700 `<hr>` divider
- Each card: `minHeight: 72px`, flex row, 16px horizontal padding; left = 20px lucide icon (Sword/BookOpen with aria-label) + 15px/600 title (1-line truncate); right = `<MasteryBadge state={getMockMastery(node.id)} />`
- Full card row is the tap target (`role="button"`, `tabIndex={0}`); `onClick` is explicit no-op (Phase 3 wires the detail panel)
- No `@xyflow/react` import. No `window.*` access. Purely server-renderable.

### PathwayBanner (`src/components/graph/PathwayBanner.tsx`)

Props: `{ pathway: Pathway; totalNodes: number; exploring: boolean; onToggleExplore: () => void }`

- Obsidian-900 background, obsidian-600 bottom border, flex row with space-between layout
- Left: pathway title (Space Grotesk 22px/600), subtitle (13px, opacity 0.7), step-count label "{pathway.steps.length} of {totalNodes} nodes" (13px, opacity 0.5)
- Right: shadcn `Button` variant="outline" size="lg" (40px height per UI-SPEC), inline style `borderColor: var(--color-rune-500)` and `color: var(--color-rune-500)` (accent reserved item 7)
- Label toggles: `exploring=false` → "Explore full map"; `exploring=true` → "Back to pathway"
- `onToggleExplore` wired by the canvas/route layer (plan 10)
- No `@xyflow/react` import. No hardcoded hex.

## Verification Results

- `npm run typecheck` — PASS (0 errors)
- No `@xyflow/react` import in either file — PASS
- No JS viewport check (`window.*`) in either file — PASS
- MobileNodeList has "Your Pathway" and "All Nodes" sections — PASS
- PathwayBanner CTA label toggles by `exploring` prop — PASS
- `pathway.steps.length` and `totalNodes` both used in step-count — PASS
- No hardcoded hex in PathwayBanner — PASS

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: XSS-mitigated | MobileNodeList.tsx | Node titles rendered as React children — no dangerouslySetInnerHTML; React escapes automatically (T-02-10) |
| threat_flag: hydration-safe | MobileNodeList.tsx | No window.innerWidth or JS viewport check; purely server-renderable HTML avoids hydration mismatch (T-02-11) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `onClick={() => {}}` in `MobileNodeCard` — deliberate Phase 2 no-op; Phase 3 wires the detail panel. All cards are tap-target-ready (72px) waiting for navigation logic.
- `onToggleExplore` in `PathwayBanner` — prop accepted, wiring deferred to plan 10 (canvas/route layer).

## Self-Check: PASSED

- [x] `src/components/graph/MobileNodeList.tsx` exists
- [x] `src/components/graph/PathwayBanner.tsx` exists
- [x] Commit bd12521 present in git log
