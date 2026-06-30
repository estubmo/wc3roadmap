---
phase: 05-progress-tracking
plan: "01"
subsystem: ui
tags: [sonner, shadcn, toggle-group, toaster, radix-ui]

requires:
  - phase: 04-auth-database
    provides: "QueryClientProvider wrapping structure in __root.tsx that Toaster mounts inside"

provides:
  - "sonner@2.0.7 installed as npm dependency"
  - "src/components/ui/toggle-group.tsx — exports ToggleGroup, ToggleGroupItem (radix-ui primitive, new-york style)"
  - "src/components/ui/toggle.tsx — exports Toggle, toggleVariants (shadcn new-york base for toggle-group)"
  - "src/components/ui/sonner.tsx — exports Toaster (static dark theme, no next-themes dep)"
  - "Single <Toaster position=bottom-right theme=dark /> mounted in src/routes/__root.tsx inside QueryClientProvider"

affects:
  - 05-06
  - 05-07

tech-stack:
  added:
    - "sonner@2.0.7 (toast notifications)"
  patterns:
    - "shadcn new-york shadcn components carry GPL-3.0-or-later SPDX header on line 1 + no 'use client' directive"
    - "Project is dark-mode only — Toaster hardcodes theme=dark, no next-themes needed"

key-files:
  created:
    - src/components/ui/sonner.tsx
    - src/components/ui/toggle-group.tsx
    - src/components/ui/toggle.tsx
  modified:
    - package.json
    - package-lock.json
    - src/routes/__root.tsx

key-decisions:
  - "Removed next-themes import from shadcn sonner.tsx: project is dark-mode only (obsidian design system), so Toaster hardcodes theme=dark — no extra dependency needed"
  - "Removed 'use client' from toggle.tsx: matches project convention (all other shadcn components omit this directive)"

patterns-established:
  - "Toaster mounts inside QueryClientProvider in __root.tsx so toast() calls from mutation hooks reach the DOM"

requirements-completed: [PROG-04]

coverage:
  - id: D1
    description: "sonner installed and package.json contains sonner dependency"
    requirement: PROG-04
    verification:
      - kind: other
        ref: "node -e \"require('./package.json').dependencies.sonner || process.exit(1)\""
        status: pass
    human_judgment: false
  - id: D2
    description: "toggle-group.tsx exports ToggleGroup and ToggleGroupItem with SPDX header"
    requirement: PROG-04
    verification:
      - kind: other
        ref: "grep -c 'export { ToggleGroup, ToggleGroupItem }' src/components/ui/toggle-group.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "sonner.tsx exports Toaster with SPDX header"
    requirement: PROG-04
    verification:
      - kind: other
        ref: "grep 'export { Toaster }' src/components/ui/sonner.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Single <Toaster /> mounted inside QueryClientProvider in __root.tsx"
    requirement: PROG-04
    verification:
      - kind: other
        ref: "grep -c '<Toaster' src/routes/__root.tsx returns 1; npx tsc --noEmit exits 0; 236 tests pass"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-06-30
status: complete
---

# Phase 05 Plan 01: UI Toolchain Bootstrap Summary

**sonner@2.0.7 installed + shadcn toggle-group and Toaster components wired to app root (dark-mode static, no next-themes)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-30T07:20:54Z
- **Completed:** 2026-06-30T07:23:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `sonner@2.0.7` added to npm dependencies (44M weekly downloads, research-Approved)
- shadcn new-york `toggle-group.tsx` + `toggle.tsx` copied under `src/components/ui/`; exports `ToggleGroup`, `ToggleGroupItem`, `toggleVariants`
- shadcn new-york `sonner.tsx` copied, simplified to static `theme="dark"` (project is dark-mode only — no next-themes install), exports `Toaster`
- SPDX `GPL-3.0-or-later` header added to all three new ui files; `"use client"` removed from `toggle.tsx` to match existing shadcn convention
- Single `<Toaster position="bottom-right" theme="dark" />` mounted inside `QueryClientProvider` in `src/routes/__root.tsx`; `<Scripts />` stays outside provider
- TypeScript clean (`tsc --noEmit` exits 0); 236 tests all pass

## Task Commits

1. **Task 1: Install sonner + add shadcn toggle-group and sonner components** - `a8f972e` (feat)
2. **Task 2: Mount Toaster at app root** - `f5983f2` (feat)

## Files Created/Modified

- `src/components/ui/toggle-group.tsx` — new; shadcn ToggleGroup + ToggleGroupItem (new-york, radix-ui primitive)
- `src/components/ui/toggle.tsx` — new; shadcn Toggle + toggleVariants base component
- `src/components/ui/sonner.tsx` — new; shadcn Toaster wrapper, static dark theme, lucide icons
- `src/routes/__root.tsx` — Toaster imported and mounted after children div, inside QueryClientProvider
- `package.json` — sonner@^2.0.7 added to dependencies
- `package-lock.json` — updated lockfile

## Decisions Made

- **Static dark theme on Toaster:** shadcn's generated sonner.tsx imports `useTheme` from `next-themes` which is not installed in this project. Since the app is dark-mode only (Direction 0 "Modern" — obsidian design system), `theme="dark"` is hardcoded and `next-themes` is omitted. Avoids an unnecessary dependency.
- **No `"use client"` directive:** Removed from `toggle.tsx` to match the convention established by all existing shadcn components in this project (button, dialog, dropdown-menu, tooltip — none use `"use client"`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed next-themes dependency from shadcn-generated sonner.tsx**
- **Found during:** Task 1 (review of generated sonner.tsx)
- **Issue:** shadcn CLI generates `sonner.tsx` with `import { useTheme } from "next-themes"` — `next-themes` is not in the project and would cause a TypeScript error and runtime failure
- **Fix:** Replaced `useTheme` call with static `theme="dark"` prop; removed `next-themes` import; added explicit `import * as React from "react"` for `React.CSSProperties`
- **Files modified:** `src/components/ui/sonner.tsx`
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `a8f972e` (Task 1 commit)

**2. [Rule 1 - Bug] Removed "use client" from toggle.tsx**
- **Found during:** Task 1 (review of generated toggle.tsx)
- **Issue:** shadcn CLI generates `toggle.tsx` with `"use client"` directive; no other component in the project uses this directive — inconsistent, and unnecessary in this TanStack Start setup
- **Fix:** Removed `"use client"` line; replaced with SPDX header
- **Files modified:** `src/components/ui/toggle.tsx`
- **Verification:** TypeScript clean; `236 tests pass`
- **Committed in:** `a8f972e` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — generated code incompatible with project conventions)
**Impact on plan:** Both fixes necessary for compilation and convention correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `<Toaster />` mounted and ready; downstream plans (05-06 `useProgressMutation`, 05-07 `ProgressProvider`) can call `toast(...)` from sonner immediately
- `ToggleGroup` / `ToggleGroupItem` available for `MasteryControls` component (05-06)
- All 236 existing tests remain green; no behavioral regressions

---
*Phase: 05-progress-tracking*
*Completed: 2026-06-30*

## Self-Check: PASSED

- [x] `src/components/ui/toggle-group.tsx` — FOUND
- [x] `src/components/ui/sonner.tsx` — FOUND
- [x] `src/components/ui/toggle.tsx` — FOUND
- [x] `src/routes/__root.tsx` — modified, FOUND
- [x] Commit a8f972e — FOUND (`git log --oneline | grep a8f972e`)
- [x] Commit f5983f2 — FOUND (`git log --oneline | grep f5983f2`)
