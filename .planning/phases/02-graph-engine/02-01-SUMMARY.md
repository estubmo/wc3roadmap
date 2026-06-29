---
phase: 02-graph-engine
plan: 01
subsystem: tooling
status: complete
tags: [graph, shadcn, xyflow, setup, deps]
dependency_graph:
  requires: []
  provides: [graph-deps, shadcn-primitives, xyflow-css]
  affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10]
tech_stack:
  added:
    - "@xyflow/react@12.11.1"
    - "@dagrejs/dagre@3.0.0"
    - "zustand@5.0.14"
    - "motion@12.42.0"
    - "lucide-react@1.22.0"
    - "radix-ui@^1.6.0"
    - "class-variance-authority@^0.7.1"
    - "clsx@^2.1.1"
    - "tailwind-merge@^3.6.0"
  patterns:
    - shadcn/ui new-york style, Tailwind v4 mode
    - "#/ path alias for component imports"
    - "@xyflow/react CSS imported before tailwindcss for theme override precedence"
key_files:
  created:
    - components.json
    - src/components/ui/button.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/tooltip.tsx
    - src/lib/utils.ts
  modified:
    - package.json
    - package-lock.json
    - src/styles/app.css
decisions:
  - "Exact-version pinning (no caret) on @xyflow/react, @dagrejs/dagre, zustand, motion — matches Phase 1 convention"
  - "components.json authored manually to prevent shadcn init from overwriting canonical app.css (ADR 0001)"
  - "src/lib/utils.ts created with cn() helper (clsx + tailwind-merge) — required by generated shadcn components"
metrics:
  duration: "5m"
  completed: "2026-06-29"
  task_count: 3
  file_count: 8
---

# Phase 02 Plan 01: Graph Stack Installation Summary

Graph stack installed at pinned exact versions, shadcn/ui initialized (new-york/Tailwind v4) with three UI primitives, and @xyflow/react base CSS wired into global stylesheet ahead of Tailwind.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install pinned graph dependencies | 44d7d72 | package.json, package-lock.json |
| 2 | Initialize shadcn/ui + add button, badge, tooltip | df3bfc9 | components.json, button.tsx, badge.tsx, tooltip.tsx, utils.ts, package.json, package-lock.json |
| 3 | Import @xyflow/react base CSS into global stylesheet | 76b49e5 | src/styles/app.css |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing src/lib/utils.ts needed by generated shadcn components**
- Found during: Task 2
- Issue: `npx shadcn add` generated button.tsx importing `cn` from `#/lib/utils` but the file didn't exist; clsx and tailwind-merge also not installed
- Fix: Installed clsx@2.1.1 and tailwind-merge@3.6.0; created src/lib/utils.ts with cn() helper; added SPDX header
- Files modified: src/lib/utils.ts, package.json, package-lock.json
- Commit: df3bfc9

**2. [Rule 1 - Bug] npm added caret prefixes on pinned packages**
- Found during: Task 1 post-install check
- Issue: npm install added `^` prefix to @xyflow/react, @dagrejs/dagre, zustand, motion, lucide-react; plan requires exact versions matching Phase 1 convention
- Fix: Manually removed carets from all five pinned packages in package.json
- Files modified: package.json
- Commit: 44d7d72

**3. [Rule 3 - Blocking] shadcn init required interactive TTY**
- Found during: Task 2
- Issue: `npx shadcn init` is interactive; running non-interactively risked overwriting src/styles/app.css (prohibited by plan + ADR 0001)
- Fix: Authored components.json manually with correct configuration (new-york, Tailwind v4, css=src/styles/app.css, aliases=#/), then ran `npx shadcn add button badge tooltip --overwrite`
- Outcome: app.css preserved byte-for-byte; all three components created correctly

### Additional Dependencies

shadcn `add` command also installed `radix-ui@^1.6.0` (Radix UI primitives, used internally by shadcn components). This is a shadcn runtime requirement and not a banned package.

## Known Stubs

None — this plan installs tooling only, no UI rendering logic.

## Threat Flags

None — no new network endpoints, auth paths, or user-facing trust boundaries introduced.

## Self-Check: PASSED

Files present:
- [x] components.json — FOUND
- [x] src/components/ui/button.tsx — FOUND
- [x] src/components/ui/badge.tsx — FOUND
- [x] src/components/ui/tooltip.tsx — FOUND
- [x] src/lib/utils.ts — FOUND
- [x] src/styles/app.css — xyflow import before tailwindcss, @theme block unchanged

Commits present:
- [x] 44d7d72 — chore(02-01): install pinned graph deps at exact versions
- [x] df3bfc9 — feat(02-01): initialize shadcn/ui new-york and add button, badge, tooltip
- [x] 76b49e5 — chore(02-01): import @xyflow/react base CSS before tailwindcss
