---
phase: 01-foundation-schema
plan: "07"
subsystem: infra
tags: [ci, github-actions, validation, dag, content-collections, vitest]

requires:
  - phase: 01-06
    provides: content-collections nodes pipeline + generated allNodes export
  - phase: 01-02
    provides: patch registry (PATCH_IDS) used by validatePatchIds

provides:
  - detectCycles — DFS 3-color DAG cycle detector (scripts/lib/detectCycles.ts)
  - validatePrerequisiteIds — cross-document prereq resolution check (scripts/lib/validators.ts)
  - validatePatchIds — patchId referential integrity check (scripts/lib/validators.ts)
  - scripts/validate-content.ts — orchestrator that aggregates all errors and exits non-zero
  - .github/workflows/ci.yml — CI job that runs on every PR with correct build ordering
  - npm validate script (already in package.json from plan 01-07 setup)

affects: [02-graph-engine, all future content phases, PR merge gates]

tech-stack:
  added: []
  patterns:
    - "Deep module validators: pure functions returning string[], no side-effects, unit-testable with plain arrays"
    - "DFS 3-color (WHITE/GRAY/BLACK) cycle detection — skips edges to unknown nodes"
    - "CI build ordering: npm ci -> build:content -> typecheck -> validate -> build (Pitfall 4 guard)"
    - "TDD: RED commit (test files), GREEN commit (implementation files), 18 tests all green"

key-files:
  created:
    - scripts/lib/detectCycles.ts
    - scripts/lib/detectCycles.test.ts
    - scripts/lib/validators.ts
    - scripts/lib/validators.test.ts
    - scripts/validate-content.ts
    - .github/workflows/ci.yml
  modified: []

key-decisions:
  - "validators.ts takes validIds as a parameter (not importing PATCH_IDS internally) to keep validators pure and independently testable with any registry"
  - "detectCycles skips edges to nodes not in the set — missing-ref errors are the job of validatePrerequisiteIds, not the cycle detector"
  - "CI uses npm ci (not npm install) for lockfile-reproducible installs (T-01-CI, ASVS V14)"
  - "No secrets in ci.yml — Vercel handled by GitHub App (plan 01-08); CI is a pure validate/build job"

patterns-established:
  - "scripts/lib/ — pure utility modules for CI scripts, no content-collections dependency, independently testable"
  - "Validator return convention: string[] of human-readable errors, never throws"

requirements-completed: [DATA-07, DATA-05]

coverage:
  - id: D1
    description: "detectCycles returns [] for acyclic graphs and error strings naming cycle paths for cyclic graphs"
    requirement: DATA-05
    verification:
      - kind: unit
        ref: "scripts/lib/detectCycles.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "validatePrerequisiteIds returns errors for unresolved prereq IDs, [] when all resolve"
    requirement: DATA-05
    verification:
      - kind: unit
        ref: "scripts/lib/validators.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "validatePatchIds returns errors for unknown patchIds, [] when all valid"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "scripts/lib/validators.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run validate exits 0 on the valid seed corpus (map-control.mdx with valid prereqs and patchId)"
    requirement: DATA-07
    verification:
      - kind: integration
        ref: "npm run build:content && npm run validate (exit 0 confirmed)"
        status: pass
    human_judgment: false
  - id: D5
    description: ".github/workflows/ci.yml runs on pull_request with npm ci and build:content before validate"
    verification:
      - kind: other
        ref: "grep checks: npm ci, build:content, validate, pull_request all present; no secrets; build:content line < validate line"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-06-28
status: complete
---

# Phase 01 Plan 07: Cross-Document CI Validation Summary

**DFS cycle detector + prereq/patchId validators as pure deep modules, wired into a GitHub Actions CI job that blocks malformed content before merge (DATA-05/DATA-07, D-13)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-28T19:51:31Z
- **Completed:** 2026-06-28T19:56:41Z
- **Tasks:** 3 (Task 1 TDD: 2 commits; Task 2: 1 commit; Task 3: 1 commit)
- **Files created:** 6

## Accomplishments

- `scripts/lib/detectCycles.ts` — DFS 3-color algorithm (WHITE/GRAY/BLACK); returns error strings naming the cycle path; skips edges to nodes not in the set
- `scripts/lib/validators.ts` — `validatePrerequisiteIds` (cross-doc prereq ID resolution) and `validatePatchIds` (patchId registry membership); pure functions, no imports of content-collections
- 18 unit tests covering acyclic chains, diamond graphs, two-node cycles, self-reference, three-node cycles, multiple unresolved prereqs, and invalid patchIds — all green
- `scripts/validate-content.ts` — orchestrator that imports `allNodes` from the generated content-collections module and `PATCH_IDS` from the registry, runs all three validators, prints a clear error list, and exits non-zero on any failure
- `.github/workflows/ci.yml` — CI job triggered on push/PR using `npm ci`; step order: `build:content` -> `typecheck` -> `validate` -> `build` (correct Pitfall 4 ordering enforced in YAML comments)
- `npm run validate` confirmed to exit 0 on the current valid corpus (map-control.mdx)

## Task Commits

1. **Task 1 (TDD RED): detectCycles + validators tests** — `60ce4c0` (test)
2. **Task 1 (TDD GREEN): detectCycles + validators implementation** — `2661bac` (feat)
3. **Task 2: validate-content.ts orchestrator** — `ee9a794` (feat)
4. **Task 3: GitHub Actions CI workflow** — `300feed` (feat)

## Files Created/Modified

- `/home/eirikmo/projects/wc3roadmap/scripts/lib/detectCycles.ts` — DFS 3-color cycle detection; exports `detectCycles(nodes): string[]`
- `/home/eirikmo/projects/wc3roadmap/scripts/lib/detectCycles.test.ts` — 7 test cases (acyclic, diamond, 2-node cycle, self-ref, 3-node cycle, empty, missing-ref no-throw)
- `/home/eirikmo/projects/wc3roadmap/scripts/lib/validators.ts` — exports `validatePrerequisiteIds` and `validatePatchIds`; both pure, no side-effects
- `/home/eirikmo/projects/wc3roadmap/scripts/lib/validators.test.ts` — 11 test cases covering resolve success, missing refs, multiple errors, invalid patchIds, empty corpus
- `/home/eirikmo/projects/wc3roadmap/scripts/validate-content.ts` — CI orchestrator; imports content-collections + patches; aggregates errors; process.exit(1) on failure
- `/home/eirikmo/projects/wc3roadmap/.github/workflows/ci.yml` — GitHub Actions job; ubuntu-latest; node 20; npm cache; mandatory step ordering

## Decisions Made

- `validatePatchIds` accepts `validIds` as a parameter instead of importing PATCH_IDS internally — keeps the function pure and decoupled from the src tree, so tests can pass any registry without filesystem imports
- `detectCycles` skips edges to unknown node IDs (does not treat them as cycles) — missing refs are the domain of `validatePrerequisiteIds`; separation of concerns prevents double-counting errors
- No `validate` script added to `package.json` — it was already present from the plan 01-07 setup (`"validate": "tsx scripts/validate-content.ts"`)

## Deviations from Plan

None — plan executed exactly as written. `package.json` already had the `validate` script so no modification was needed.

## Issues Encountered

None.

## User Setup Required

None — CI runs automatically via GitHub Actions on any push to main or pull_request. No external service secrets are required in the workflow file. Vercel deploy secrets are handled separately (plan 01-08).

## Next Phase Readiness

- CI gate is live: any PR that introduces a cycle, unresolved prereq, or unregistered patchId will fail the `validate` job
- The `scripts/lib/` pattern is established for future CI utilities (e.g., citation count enforcement when Phase 3 adds that check)
- plan 01-08 can now safely wire Vercel deployment (it does not conflict with this CI job — they are separate jobs/services)

## TDD Gate Compliance

- RED commit: `60ce4c0` — test files written first, confirmed failing (module not found)
- GREEN commit: `2661bac` — implementations added, all 18 tests passing
- REFACTOR: not needed (implementations are clean from the first pass)

---

*Phase: 01-foundation-schema*
*Completed: 2026-06-28*
