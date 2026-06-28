---
phase: 01-foundation-schema
plan: "01"
subsystem: scaffold
tags: [scaffold, tanstack-start, content-collections, vitest, build-pipeline]
depends_on:
  requires: []
  provides: [build-pipeline, test-harness, vite-config, content-collections-stub]
  affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08]
tech_stack:
  added:
    - "@tanstack/react-start@1.168.26"
    - "@tanstack/react-router@1.170.16"
    - "@content-collections/core@0.15.2"
    - "@content-collections/vite@0.3.0"
    - "@content-collections/mdx@0.2.2"
    - "@content-collections/cli@0.1.9"
    - "zod@4.4.3"
    - "nitro@3.0.260610-beta"
    - "react@19.2.7"
    - "react-dom@19.2.7"
    - "vite@8.1.0"
    - "typescript@6.0.3"
    - "vitest@4.1.9"
    - "tsx@4.22.4"
    - "prettier@3.9.1"
  patterns:
    - "contentCollections() must be first Vite plugin (type generation ordering)"
    - "Default import for @content-collections/vite (not named export)"
    - "defineConfig uses `content` property (not deprecated `collections`)"
    - "nitro() plugin required for Vercel zero-config detection"
    - "All deps exact-pinned (no ^ or ~) for reproducible installs"
key_files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - tsr.config.json
    - vite.config.ts
    - content-collections.ts
    - vitest.config.ts
    - src/router.tsx
    - src/routes/__root.tsx
    - src/routes/index.tsx
    - src/routeTree.gen.ts
    - src/smoke.test.ts
    - .gitignore
  modified: []
decisions:
  - "TypeScript 6.0.3 (not 5.x) — CLI scaffold targets TS6; @content-collections/core is compatible (peer dep: ^5 || ^6 || ^7)"
  - "Vite 8.1.0 (not 6.x) — current TanStack CLI scaffold; @content-collections/vite peer dep includes ^8"
  - "@content-collections/cli@0.1.9 installed for standalone build:content script (content-collections build)"
  - "nitro@3.0.260610-beta — stable latest on npm registry (npm dist-tag latest)"
  - "GPL-3.0-or-later as initial license value (plan 01-04 checkpoint confirms final variant)"
  - "Manual file creation over CLI scaffold — CLI installs Tailwind (excluded from Phase 1)"
metrics:
  duration: "16 minutes"
  completed: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 13
  files_modified: 1
status: complete
---

# Phase 01 Plan 01: Scaffold TanStack Start App Summary

TanStack Start scaffold with content-collections + nitro + Vitest wired; every core dependency exact-pinned; build, typecheck, and test all pass on a clean install.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Scaffold TanStack Start app with placeholder route | ec694b3 | package.json, tsconfig.json, tsr.config.json, src/router.tsx, src/routes/__root.tsx, src/routes/index.tsx, src/routeTree.gen.ts, .gitignore |
| 2 | Wire content-collections + nitro into Vite, pin all dependencies | 08e66c0 | vite.config.ts, tsconfig.json (path alias), content-collections.ts, package.json (deps + scripts), package-lock.json |
| 3 | Configure Vitest and add smoke test | f4fd9c7 | vitest.config.ts, src/smoke.test.ts |

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` exits 0 | PASS |
| `npm run typecheck` exits 0 | PASS |
| `npx vitest run` passes >= 1 test | PASS (1 test) |
| No semver ranges in package.json | PASS |
| `contentCollections()` is first Vite plugin | PASS |
| `.content-collections/` in .gitignore | PASS |
| `.env` in .gitignore | PASS |
| No Phase 2-4 packages in dependencies | PASS |
| `nitro` in package.json dependencies | PASS |
| tsconfig has content-collections path alias | PASS |
| scripts: build, build:content, typecheck, test | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @content-collections/vite uses default export, not named export**
- **Found during:** Task 2 — `npm run build` failed with "does not provide an export named 'contentCollections'"
- **Issue:** RESEARCH.md Pattern 5 shows `import { contentCollections } from "@content-collections/vite"` but v0.3.0 exports `contentCollectionsPlugin` as the default export
- **Fix:** Changed to `import contentCollections from "@content-collections/vite"` (default import)
- **Files modified:** vite.config.ts
- **Commit:** 08e66c0

**2. [Rule 1 - Bug] defineConfig `collections` property is deprecated**
- **Found during:** Task 2 — first build emitted `[CC DEPRECATED]: The configuration property "collections" is deprecated. Please use "content" instead.`
- **Issue:** RESEARCH.md Pattern 1 shows `defineConfig({ collections: [nodes] })` but current @content-collections/core@0.15.2 uses `content`
- **Fix:** Changed to `defineConfig({ content: [] })` in content-collections.ts
- **Files modified:** content-collections.ts
- **Commit:** 08e66c0

**3. [Rule 2 - Deviation] Manual scaffold instead of CLI**
- **Reason:** `npx @tanstack/cli create` always installs Tailwind CSS, which the plan explicitly prohibits in Phase 1. Manual creation gave full control over included packages.
- **Impact:** None — all acceptance criteria met identically.

**4. [Deviation] TypeScript 6.0.3 and Vite 8.1.0 (not 5.x / 6.x from CLAUDE.md)**
- **Reason:** CLAUDE.md version table entries were `[ASSUMED]` for TypeScript and Vite. The TanStack CLI scaffold and npm registry both use TypeScript 6 and Vite 8 as of June 2026. @content-collections/core peer dep explicitly lists `^6.0.0` for TypeScript.
- **Impact:** All packages are compatible; build passes. CLAUDE.md Technology Stack table should be updated in a follow-up.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `content: []` | content-collections.ts | Empty collections — nodes collection added in plan 01-06 once Zod schema and patch registry are in place |
| Static placeholder page | src/routes/index.tsx | No data fetching or UI — Phase 2 adds the React Flow graph |

## Self-Check

Verified after SUMMARY.md creation:

## Self-Check: PASSED

All 13 created files confirmed present on disk. All 3 commit hashes (ec694b3, 08e66c0, f4fd9c7) confirmed in git log.
