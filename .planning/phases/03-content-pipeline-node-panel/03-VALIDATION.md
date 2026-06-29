---
phase: 3
slug: content-pipeline-node-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `03-RESEARCH.md` §"Validation Architecture". Task IDs are filled in by the planner / refined during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (project root) — env is `node`; React component tests need `jsdom` (per-file `// @vitest-environment jsdom` or config option, added in Wave 0) |
| **Quick run command** | `npx vitest run src/lib/filter-utils.test.ts src/schemas/node.test.ts src/lib/node-content-query.test.ts` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds (unit) |

---

## Sampling Rate

- **After every task commit:** Run quick command (`npx vitest run src/lib/filter-utils.test.ts src/schemas/node.test.ts src/lib/node-content-query.test.ts`)
- **After every plan wave:** Run full suite (`npx vitest run && npx tsc --noEmit`)
- **Before `/gsd-verify-work`:** Full suite green + manual smoke (panel opens with real lazy-loaded content; filter dims non-matching nodes)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

> Requirement-level map from research. Plan/Wave/Task-ID columns are populated by the planner; every plan task that satisfies a requirement below must carry the matching automated command.

| Requirement | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| CONT-01 | `CitationSchema` validates `kind: "science"` discriminant; URL protocol allowlist (`http(s)://` only) | T-3-01 | Reject `javascript:`/`data:` citation URLs before render | unit | `npx vitest run src/schemas/node.test.ts` | ❌ W0 | ⬜ pending |
| CONT-02 | content-collections transform throws when `## How to Apply` absent (CI enforcement preserved through the section split) | — | N/A | unit (transform) | `npm run validate` / `npx vitest run` | ✅ (validate-content.ts) | ⬜ pending |
| CONT-03 | `kind: "creator"` discriminant produces creator-callout type; renders as distinct attributed callout (not footnote) | — | N/A | unit | `npx vitest run src/schemas/node.test.ts` | ❌ W0 | ⬜ pending |
| GRAPH-03 | `nodeContentQueryOptions` returns the correct full node by ID; lazy (enabled only when an id is selected) | — | N/A | unit | `npx vitest run src/lib/node-content-query.test.ts` | ❌ W0 | ⬜ pending |
| GRAPH-04 | `matchesFilter` — AND across facets, OR within a facet; mastery reads mock-mastery | — | N/A | unit | `npx vitest run src/lib/filter-utils.test.ts` | ❌ W0 | ⬜ pending |
| GRAPH-04 | `isFilterActive` true/false edge cases (empty query + no facets = inactive) | — | N/A | unit | `npx vitest run src/lib/filter-utils.test.ts` | ❌ W0 | ⬜ pending |
| ADR-006 | `GraphDisplayNodeSchema` includes `skillType` + `tags`; projection in loader stays minimal (no full `NodeFrontmatter` leak) | — | N/A | compile check | `npx tsc --noEmit` | ❌ (schema change) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/schemas/node.test.ts` — extend with `CitationSchema` `kind` discriminator tests: new `kind` field accepted, invalid `kind` rejected, `quote` optional on `creator`, science vs creator shape
- [ ] `src/lib/filter-utils.test.ts` — new file: `matchesFilter` (all facet combinations, AND/OR semantics), `isFilterActive` edge cases
- [ ] `src/lib/node-content-query.test.ts` — new file: `queryOptions` enabled/disabled, found/not-found
- [ ] `vitest.config.ts` — add `jsdom` capability for any React component tests (config option or per-file directive)
- [ ] `src/routes/__root.tsx` — `QueryClientProvider` infrastructure (Wave 0 setup task, not a test file)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop right-side drawer slides in, graph stays interactive + dimmed, clicking another node live-swaps content (D-01/D-02) | GRAPH-03 | Visual/interaction; motion + layout not unit-testable | Open app on desktop width; click a node → drawer opens from right, graph dims but remains clickable; click a 2nd node → panel content swaps without close/reopen; Esc / click-away / close all dismiss |
| Mobile bottom sheet (~80% height) opens on tap, swipe-down dismisses (D-03) | GRAPH-03 | Touch gesture + breakpoint | Open at mobile width; tap a card → bottom sheet rises; swipe down → dismisses |
| How-to-Apply pinned at top of panel, theory below (D-12) | CONT-02 | Render-order visual check | Open any node panel → "How to apply in your next game" block is first/highlighted; conceptual content below |
| Citations render: numbered `[n]` science refs in a References list + distinct named pro-wisdom callout, each showing `applicationNote` (D-04/05/06) | CONT-01/03 | Visual trust surface | Open a node with both citation kinds → science refs numbered in References list, creator wisdom in separate named callout, applicationNote visible on each |
| Prerequisite chips swap the panel to that node (D-14) | GRAPH-03 | Interaction | Click a prerequisite chip → panel swaps to that prerequisite node |
| Filter/search dims non-matching nodes in real time, no reflow/unmount (D-08) | GRAPH-04 | Visual + perf | Type in search / toggle a facet → non-matching nodes dim in place, no layout shift or page reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (filter-utils, node-content-query, node schema citation tests, jsdom, QueryClientProvider)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
