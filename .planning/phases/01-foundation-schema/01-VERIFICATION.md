---
phase: 01-foundation-schema
verified: 2026-06-28T21:11:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open https://wc3roadmap.vercel.app in a browser and confirm the placeholder home page renders (no 404, no SSR error)"
    expected: "Placeholder page loads with visible content; no error page"
    why_human: "curl returns HTTP/2 200 and text/html — automated check passes — but visual rendering and SSR correctness require a browser"
    result: passed
    confirmed_via: "gstack /browse headless Chromium — loaded HTTP 200, rendered 'WC3 Learning Roadmap / A free, open-source interactive node graph of Warcraft III learning concepts. Science-backed, community-driven. / Coming soon.', zero console errors, clean hydration; screenshot captured"
    confirmed_at: 2026-06-28T21:11:00Z
---

# Phase 1: Foundation & Schema — Verification Report

**Phase Goal:** Typed, Zod-validated content schema with MECHANIC/CONCEPTUAL node taxonomy and patch-version primitive is established as the single source of truth; CI rejects malformed content; project licensed GPL-3.0 with pinned TanStack Start dependencies; architecture foundations (CONTEXT.md domain language + docs/adr/) scaffolded.

**Verified:** 2026-06-28T21:11:00Z
**Status:** passed — all 6 must-haves verified; the single human-verification item (live page render) confirmed via gstack /browse (HTTP 200, content rendered, zero console errors, screenshot captured)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A developer can add a node as a JSON/MDX file; CI validates it and fails the build with a clear error if fields are missing or malformed | VERIFIED | `npm run build:content` exits 0 on valid seed; transform throws on missing "## How to Apply"; `validatePrerequisiteIds`, `validatePatchIds`, `detectCycles` all exit non-zero on bad input (91 tests pass) |
| 2 | MECHANIC and CONCEPTUAL are distinct first-class enum values in the node schema | VERIFIED | `NodeSummarySchema` and `NodeFrontmatterSchema` both define `nodeType: z.enum(["MECHANIC", "CONCEPTUAL"])`; test confirms "mechanical" is rejected |
| 3 | `patch_context`, `last_reviewed`, and `meta_volatile` are required (not optional) — a node missing any fails CI | VERIFIED | All three fields defined as non-optional in `NodeFrontmatterSchema` and `content-collections.ts`; rejection tested; `npm run build:content` + `npm run validate` pass on the valid seed node |
| 4 | The patch-version field appears on node, mastery threshold, and progress schema from the first schema commit | VERIFIED | `src/schemas/node.ts`, `src/schemas/mastery.ts`, and `src/schemas/progress.ts` all import `PATCH_IDS` from `src/lib/patches` and define `patchId: z.enum(PATCH_IDS)` |
| 5 | The project builds, deploys, carries a GPL-3.0 license; TanStack Start and core deps pinned to known-working versions with documented upgrade policy | VERIFIED | `npm run build` exits 0; `https://wc3roadmap.vercel.app` returns HTTP/2 200; `LICENSE` contains "GNU GENERAL PUBLIC LICENSE / Version 3"; `package.json "license": "GPL-3.0-or-later"`; TanStack/content-collections/zod/nitro/react all exact-pinned; `docs/upgrade-policy.md` exists (see deviation note below) |
| 6 | `CONTEXT.md` captures the ubiquitous domain language; `docs/adr/` holds at least the foundational ADRs | VERIFIED | `CONTEXT.md` at repo root defines node, nodeType, skillType, mastery state, pathway, signal, patch, patchId, threshold, citation, applicationNote, prerequisite, meta_volatile, last_reviewed, patch_context; `docs/adr/` contains 001-stack-choice.md, 002-content-graph-decoupling.md, 003-patch-registry-primitive.md, 004-gpl3-licensing.md |

**Score: 6/6 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/schemas/node.ts` | NodeSummarySchema + NodeFrontmatterSchema with MECHANIC/CONCEPTUAL enum, required patch fields | VERIFIED | Exists, substantive, wired via import in content-collections.ts and tests |
| `src/schemas/mastery.ts` | MasteryThresholdSchema with patchId | VERIFIED | Exports MasteryThresholdSchema, MasteryThreshold; patchId: z.enum(PATCH_IDS) |
| `src/schemas/progress.ts` | ProgressRecordSchema + MasteryStateSchema with patchId | VERIFIED | Exports all four symbols; patchId: z.enum(PATCH_IDS); masteryState: z.enum(["untouched","learning","mastered"]) |
| `src/lib/patches.ts` | PatchEntry, PATCHES, CURRENT_PATCH, PATCH_IDS, getPatch | VERIFIED | All five symbols exported; getPatch throws on unknown id (tested); PATCH_IDS typed [string, ...string[]] |
| `scripts/lib/detectCycles.ts` | DFS 3-color cycle detection | VERIFIED | Exists, substantive, tested in detectCycles.test.ts |
| `scripts/lib/validators.ts` | validatePrerequisiteIds + validatePatchIds | VERIFIED | Exists, substantive, tested in validators.test.ts |
| `scripts/validate-content.ts` | Orchestrator that exits non-zero on any error | VERIFIED | Imports allNodes, PATCH_IDS, runs all three validators; exits 1 on errors, 0 on pass |
| `.github/workflows/ci.yml` | Validate job with npm ci and correct build ordering | VERIFIED | Job runs on push + PR; uses `npm ci`; build:content runs before validate (line 47 before line 56) |
| `content-collections.ts` | Nodes collection: per-doc Zod schema + transform | VERIFIED | Defines nodes collection; schema validates all required fields; transform throws on missing "## How to Apply" |
| `content/nodes/map-control.mdx` | Valid seed node | VERIFIED | Valid frontmatter with all required fields; includes "## How to Apply" section; `build:content` generates 1 document |
| `CONTEXT.md` | Domain glossary | VERIFIED | All required terms present: node, nodeType, mastery state, pathway, signal, patch, patchId, threshold, citation, prerequisite, meta_volatile, last_reviewed, patch_context |
| `docs/adr/001-stack-choice.md` | Stack choice ADR | VERIFIED | Exists with Context/Decision/Consequences/Status |
| `docs/adr/002-content-graph-decoupling.md` | Content/graph decoupling ADR | VERIFIED | Exists; explicitly states graph receives only display-essential data |
| `docs/adr/003-patch-registry-primitive.md` | Patch registry ADR | VERIFIED | Exists; references src/lib/patches.ts |
| `docs/adr/004-gpl3-licensing.md` | GPL-3.0 licensing ADR with variant decision | VERIFIED | Exists; records human decision (GPL-3.0-or-later), rationale, wc3v compatibility |
| `docs/upgrade-policy.md` | Dependency upgrade policy | VERIFIED | Documents exact-pin rule, upgrade process, forward watch-list for drizzle/nitro/content-collections |
| `docs/spdx-header-convention.md` | SPDX header convention document | VERIFIED | Documents GPL-3.0-or-later header on line 1 for all src/**/*.ts, scripts/**/*.ts, config files |
| `LICENSE` | Full GPL-3.0 text | VERIFIED | Contains "GNU GENERAL PUBLIC LICENSE" and "Version 3" (FSF canonical text) |
| `README.md` | Live URL + project description + dev commands | VERIFIED | Contains "Live: https://wc3roadmap.vercel.app", GPL-3.0 note, and npm ci/dev/build/validate commands |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/schemas/node.ts` | `src/lib/patches.ts` | `import { PATCH_IDS }` | WIRED | Line 31 of node.ts |
| `src/schemas/mastery.ts` | `src/lib/patches.ts` | `import { PATCH_IDS }` | WIRED | Line 21 of mastery.ts |
| `src/schemas/progress.ts` | `src/lib/patches.ts` | `import { PATCH_IDS }` | WIRED | Line 21 of progress.ts |
| `content-collections.ts` | `src/lib/patches.ts` | `import { PATCH_IDS }` | WIRED | Line 17 of content-collections.ts; patchId: z.enum(PATCH_IDS) |
| `scripts/validate-content.ts` | `content-collections` generated module | `import { allNodes }` | WIRED | Requires build:content first; CI enforces ordering |
| `scripts/validate-content.ts` | `src/lib/patches.ts` | `import { PATCH_IDS }` | WIRED | Line 25 |
| `vite.config.ts` | `@content-collections/vite` | `contentCollections()` as first plugin | WIRED | Plugin array: contentCollections() → tailwindcss() → tanstackStart() → nitro() → viteReact() |
| `ci.yml` | build:content → validate ordering | Steps execute sequentially | WIRED | Generate content step (line 47) precedes validate step (line 56) |

**Deviation noted (plan 01-06 key_link):** `content-collections.ts` uses `import { z } from "zod"` directly rather than the "injected z" pattern (`schema: (z) => z.object({...})`) specified in the plan. Both approaches resolve to the same zod 4.4.3 installation — no version mismatch exists. The build, typecheck, content generation, and validate all pass. The executor updated the PARALLEL-SCHEMA SYNC NOTE to read "project Zod import" rather than "injected z," acknowledging the deliberate deviation. Functionally equivalent; not a blocker.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All schema/validator tests pass | `npm test` | 7 test files, 91 tests passed (1.31s) | PASS |
| Content build succeeds on valid seed | `npm run build:content` | 1 collection, 1 document built in 85ms | PASS |
| Validate passes on valid corpus | `npm run validate` | "Content validation passed (1 node(s) checked)" | PASS |
| Full production build succeeds | `npm run build` | nitro output emitted, exit 0 | PASS |
| TypeScript strict check passes | `npm run typecheck` | `tsc --noEmit` exits 0, no errors | PASS |
| Live URL serves a response | `curl -sI https://wc3roadmap.vercel.app` | HTTP/2 200, content-type: text/html | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DATA-01 | 01-05 | Node taxonomy distinguishes MECHANIC vs CONCEPTUAL | SATISFIED | `nodeType: z.enum(["MECHANIC","CONCEPTUAL"])` in both NodeSummarySchema and NodeFrontmatterSchema |
| DATA-02 | 01-05 | Node content schema decoupled from graph/UI engine | SATISFIED | NodeSummarySchema (graph-display subset) + NodeFrontmatterSchema (full content); ADR 002 documents the contract |
| DATA-03 | 01-05, 01-06 | Each node carries patch_context, last_reviewed, meta_volatile | SATISFIED | All three fields required in NodeFrontmatterSchema and content-collections.ts schema |
| DATA-04 | 01-02, 01-05 | Patch version is a system-wide primitive on content, mastery, and progress | SATISFIED | patchId: z.enum(PATCH_IDS) on all three schemas; PATCH_IDS sourced from src/lib/patches.ts |
| DATA-05 | 01-07 | Graph edges are soft prerequisites; nodes never hard-locked | SATISFIED | `prerequisites: z.array(z.string())` — accepts empty array; CI validates ids exist but never blocks access |
| DATA-06 | 01-01, 01-06 | Node content stored as version-controlled MDX files | SATISFIED | content/nodes/*.mdx pattern; content-collections pipeline processes them at build time |
| DATA-07 | 01-07 | Content schema validated in CI | SATISFIED | .github/workflows/ci.yml runs build:content → typecheck → validate → build; exit non-zero on any error |
| OSS-01 | 01-04, 01-08 | Project released under GPL-3.0 with public code | SATISFIED | LICENSE (full GPL-3.0 text); package.json license: GPL-3.0-or-later; live deploy at wc3roadmap.vercel.app |
| OSS-02 | 01-01, 01-03, 01-05 | Data model and content pipeline extensible | SATISFIED | Add a node: create one .mdx file; add a patch: append to PATCHES array; ADR discipline in place |

**All 9 requirements for Phase 1 satisfied.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` | 25–26, 37–38 | `^` ranges on @fontsource-variable/* (×3) and @tailwindcss/vite, tailwindcss (×2) | WARNING | Violates the documented upgrade policy ("All dependencies are pinned to exact versions"). These packages were added by a concurrent design workstream (commit bef4898), not by Phase 1 plans. The TanStack Start core stack remains fully exact-pinned. The upgrade-policy.md rule ("All dependencies") creates an internal inconsistency. No functional impact on Phase 1 goal; design deps do not affect schema, CI, or license artifacts. |

No `TBD`, `FIXME`, or `XXX` markers found in any source file. No unreferenced debt markers.

**Suggestion for the ^ range deviation:** To document this as an accepted exception, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "Every core dependency in package.json is pinned to an exact version (no ^ or ~ ranges)"
    reason: "Tailwind v4 and @fontsource packages added by concurrent design workstream (bef4898) with caret ranges; Phase-1 core stack (TanStack/content-collections/zod/nitro/react) remains exact-pinned; design deps do not affect schema, CI, or license artifacts"
    accepted_by: "eirik"
    accepted_at: "2026-06-28T21:11:00Z"
```

---

## Human Verification Required

### 1. Vercel page visual rendering

**Test:** Open https://wc3roadmap.vercel.app in a browser.
**Expected:** Placeholder home page renders with visible content; no 404, no SSR error page, no blank screen.
**Why human:** `curl -sI` confirms HTTP/2 200 with `content-type: text/html` — the automated check from plan 01-08 passes. Visual rendering and SSR correctness require a browser (React hydration issues, SSR errors, blank body, or route mismatches would not be caught by a curl header check).

---

## Gaps Summary

No blocking gaps. All 6 ROADMAP success criteria are verified against the codebase. The two deviations noted (design workstream ^ ranges and injected z vs. direct import) are plan-level divergences with no functional impact on the phase goal. Phase is ready to proceed once the visual Vercel rendering check is completed by a human.

---

_Verified: 2026-06-28T21:11:00Z_
_Verifier: Claude (gsd-verifier)_
