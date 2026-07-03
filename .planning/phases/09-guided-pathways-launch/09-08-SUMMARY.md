---
phase: 09-guided-pathways-launch
plan: 08
subsystem: content-validation
tags: [ci-gate, launch-readiness, validators, tdd]
requires:
  - "launch_ready + auditNote schema fields (09-03)"
  - "pathways/beginner-fundamentals.json (Phase 2)"
  - "validate-content.ts orchestrator + validate-pathway.ts pattern"
provides:
  - "validateLaunchGate / validatePathwayStepsAreLaunchReady / validateAuditTrail pure validators"
  - "LAUNCH_GATE-gated deploy invariant in validate-content.ts"
  - "validate:launch npm script (release/deploy gate)"
affects:
  - "release/deploy pipeline (must run validate:launch before shipping)"
tech-stack:
  added: []
  patterns:
    - "clone validate-pathway pure-fn pattern for launch gate"
    - "env-flag-gated validators (LAUNCH_GATE) keep per-PR CI green"
key-files:
  created:
    - scripts/validate-launch-gate.ts
    - scripts/validate-launch-gate.test.ts
  modified:
    - scripts/validate-content.ts
    - package.json
decisions:
  - "Launch-gate checks enforced only under LAUNCH_GATE=1, not in always-on validate — keeps codebase mergeable while content workstream flips nodes to launch_ready"
  - "Used inline LAUNCH_GATE=1 env syntax (not cross-env) per plan; no new package added"
metrics:
  duration_min: 2
  completed: 2026-07-03
  tasks: 3
  files: 4
requirements: [CONT-04, PATH-02]
status: complete
---

# Phase 9 Plan 08: Launch-Readiness CI Gate Summary

Three tested pure validators (`validateLaunchGate`, `validatePathwayStepsAreLaunchReady`, `validateAuditTrail`) enforce >=25 launch_ready nodes, all 8 beginner-fundamentals pathway steps launch_ready, and audit-trail completeness — wired into `validate-content.ts` behind a `LAUNCH_GATE` env flag so the deploy is blocked until content lands without turning in-progress PRs red.

## What Was Built

- **`scripts/validate-launch-gate.ts`** — deep module of three framework-free pure functions (plain-data-in, `string[]`-out, no content-collections/fs imports):
  - `validateLaunchGate(nodes, minCount=25)` — one error when the launch_ready count is below `minCount` (CONT-04).
  - `validatePathwayStepsAreLaunchReady(pathway, nodes)` — one error per pathway step not in the launch_ready node-id set (PATH-02 / RESEARCH Pitfall 5 cross-check).
  - `validateAuditTrail(nodes)` — one error per launch_ready node with a missing/empty-after-trim `auditNote`; launch_ready:false nodes ignored (CONT-05 / D-13).
- **`scripts/validate-launch-gate.test.ts`** — 12 Vitest cases covering all three validators, including the exact-25 boundary, custom `minCount`, launch_ready:false-ignored, whitespace-only auditNote, and absent-node cases.
- **`scripts/validate-content.ts`** — validators 5/6/7 added, guarded by `process.env.LAUNCH_GATE`; header doc-comment documents the gating. Pathway-step check runs only inside the existing `pathwayResult.success` branch.
- **`package.json`** — `validate:launch` script (`build:content && LAUNCH_GATE=1 tsx scripts/validate-content.ts`); existing `validate` unchanged.

## How It Was Verified

- `npx vitest run scripts/validate-launch-gate.test.ts` — 12 passed (GREEN after RED).
- `npm run validate` — green, exit 0, launch gate NOT enforced (17 nodes checked, pathway integrity verified).
- `npm run validate:launch` against the current all-false corpus — surfaces 9 launch-blocking errors (0 launch_ready < 25, plus all 8 pathway steps not launch_ready), proving the gate is live under the flag.
- `npm run typecheck` — clean.

## TDD Cycle

- RED: `test(09-08)` commit `a39b07a` — test file present, vitest RED (module missing).
- GREEN: `feat(09-08)` commit `2851811` — implementation, 12/12 passing.
- No refactor needed.

## Deviations from Plan

**1. [Rule 3 - Blocking] validate:launch env syntax**
- **Found during:** Task 3
- **Issue:** Initially wrote the script with `cross-env`, then found `cross-env` is not a project dependency (would require a package install, excluded from auto-fix).
- **Fix:** Reverted to the plan's exact inline `LAUNCH_GATE=1 tsx scripts/validate-content.ts` syntax (POSIX shell). No new package added.
- **Files modified:** package.json
- **Commit:** 9f5903c

Otherwise the plan executed as written.

## Threat Model

T-09-08 (Repudiation — launch without audit trail) is mitigated: `validateAuditTrail` blocks launch when a launch_ready node lacks its recorded verdict; `validateLaunchGate` + `validatePathwayStepsAreLaunchReady` block an under-populated or broken-pathway launch. Enforced at the deploy gate (`validate:launch`). No new packages.

## Notes for Downstream

- The deploy/release pipeline MUST invoke `npm run validate:launch` (not just `validate`) as the launch gate; per-PR CI intentionally does not.
- Validators are structurally typed (`{ id, launch_ready, auditNote? }`) — safe to reuse against any node projection carrying those fields.

## Self-Check: PASSED
