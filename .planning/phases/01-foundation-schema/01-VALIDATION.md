---
phase: 1
slug: foundation-schema
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-28
updated: 2026-06-28
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed + configured in plan 01-01, Wave 1) |
| **Config file** | `vitest.config.ts` (created in 01-01 Task 3) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build:content && npm run validate && npm run build` |
| **Estimated runtime** | ~5s unit suite; ~30-60s full (build + content generation + validate) |

Notes:
- Unit tests (schemas, patch registry, validators) are pure and fast.
- Cross-document validation (`npm run validate`) requires `npm run build:content` to run first (generated `content-collections` module dependency — RESEARCH Pitfall 4).
- No DOM tests in Phase 1 — node environment is sufficient.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose` (unit, < 5s)
- **After every plan wave:** Run `npx vitest run && npm run build` (full unit suite + build)
- **Before `/gsd-verify-work`:** Full suite green + `npm run build:content && npm run validate` passes + live Vercel deploy confirmed
- **Max feedback latency:** < 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-06 / OSS-02 | T-01-CFG | N/A | integration | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-06 / OSS-02 | T-01-SC | exact-pin deps, no semver ranges | integration | `npm run build` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | DATA-06 | — | N/A | smoke | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | DATA-04 | T-01-PATCH | unknown patchId fails fast | unit | `npx vitest run src/lib/patches.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | OSS-02 | T-01-DOC | N/A | smoke | `test -f CONTEXT.md && grep -q "MECHANIC" CONTEXT.md && grep -q "CONCEPTUAL" CONTEXT.md && grep -qi "patchId" CONTEXT.md && grep -qi "prerequisite" CONTEXT.md` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | OSS-02 | T-01-DOC | N/A | smoke | `test -f docs/adr/001-stack-choice.md && test -f docs/adr/002-content-graph-decoupling.md && test -f docs/adr/003-patch-registry-primitive.md` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | OSS-02 | — | N/A | smoke | `test -f docs/upgrade-policy.md && grep -qi "exact" docs/upgrade-policy.md && grep -qi "changelog" docs/upgrade-policy.md` | ❌ W0 | ⬜ pending |
| 1-04-CKPT | 04 | 2 | OSS-01 | T-01-LIC | human confirms SPDX variant before LICENSE commit | manual | (checkpoint:decision — see Manual-Only) | n/a | ⬜ pending |
| 1-04-01 | 04 | 2 | OSS-01 | T-01-LIC | LICENSE matches confirmed variant | smoke | `grep -q "GNU GENERAL PUBLIC LICENSE" LICENSE && grep -q "Version 3" LICENSE && test -f docs/adr/004-gpl3-licensing.md && node -e "if(!/GPL-3.0/.test(require('./package.json').license))process.exit(1)"` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | DATA-01/02/03/05 | T-01-VAL | rejects malformed node frontmatter | unit | `npx vitest run src/schemas/node.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-02 | 05 | 3 | DATA-04 | T-01-PID | rejects unknown patchId on threshold + progress | unit | `npx vitest run src/schemas/mastery.test.ts src/schemas/progress.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 3 | DATA-01/03/06 | T-01-MDX | build-time frontmatter validation | integration | `npm run typecheck` | ❌ W0 | ⬜ pending |
| 1-06-02 | 06 | 3 | DATA-06 | T-01-MDX | valid seed node passes pipeline | integration | `npm run build:content` | ❌ W0 | ⬜ pending |
| 1-07-01 | 07 | 4 | DATA-05/07 | T-01-DAG | cycles + unresolved prereqs + bad patchId detected | unit | `npx vitest run scripts/lib/detectCycles.test.ts scripts/lib/validators.test.ts` | ❌ W0 | ⬜ pending |
| 1-07-02 | 07 | 4 | DATA-07 | T-01-DAG | validate exits non-zero on any cross-doc error | integration | `npm run build:content && npm run validate` | ❌ W0 | ⬜ pending |
| 1-07-03 | 07 | 4 | DATA-07 | T-01-CI | npm ci + build:content before validate | smoke | `test -f .github/workflows/ci.yml && grep -q "npm ci" .github/workflows/ci.yml && grep -q "build:content" .github/workflows/ci.yml && grep -q "validate" .github/workflows/ci.yml` | ❌ W0 | ⬜ pending |
| 1-08-01 | 08 | 5 | OSS-01 | T-01-DEPLOY | no secrets committed; nitro build output | integration | `npm run build` | ❌ W0 | ⬜ pending |
| 1-08-02 | 08 | 5 | OSS-01 | T-01-SURFACE | live URL serves 200 | smoke + manual | `curl -sI "${LIVE_URL}" \| grep -q "HTTP.*200"` (+ human-check) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*File Exists: ❌ W0 = test/infra created during execution (greenfield — no files exist pre-Wave-1).*

---

## Wave 0 Requirements

Greenfield repo — no test infrastructure exists yet. Wave 1 (plan 01-01) establishes it; each subsequent plan writes its own tests test-first (RED→GREEN) within its tasks.

- [ ] `npm install -D vitest` + `vitest.config.ts` — plan 01-01 Task 3 (framework install)
- [ ] `src/smoke.test.ts` — plan 01-01 Task 3 (proves harness wired)
- [ ] `src/lib/patches.test.ts` — plan 01-02 (registry: CURRENT_PATCH, getPatch, PATCH_IDS)
- [ ] `src/schemas/node.test.ts` — plan 01-05 (DATA-01/02/03/05)
- [ ] `src/schemas/mastery.test.ts`, `src/schemas/progress.test.ts` — plan 01-05 (DATA-04)
- [ ] `scripts/lib/detectCycles.test.ts`, `scripts/lib/validators.test.ts` — plan 01-07 (DATA-05/07)

No separate Wave 0 plan is needed: the framework install is the first task of Wave 1, and every code-producing task is `tdd="true"` (tests authored before implementation).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Vercel deployment renders the placeholder app | OSS-01 (D-12) | Visual render confirmation across SSR + CDN cannot be fully asserted by a status code alone; the URL is only known after the human-completed Vercel GitHub App connection. Paired with an automated 200-probe (`curl -sI "${LIVE_URL}"`) so the task also satisfies Nyquist 8a. | 1) Complete the Vercel project connection (01-08 user_setup). 2) Open the production URL. 3) Confirm the home page renders (no 404 / SSR error). 4) Confirm the URL is recorded in README.md. |
| GPL-3.0 SPDX variant decision (only vs or-later) | OSS-01 | Legal/licensing judgement call; must be a human decision before the binding LICENSE is committed (RESEARCH Open Question 2). | 01-04 checkpoint:decision — select `or-later` (default) or `only`; the choice flows to LICENSE, package.json, and SPDX headers. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (all `vitest run`, never `vitest` watch)
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-28
