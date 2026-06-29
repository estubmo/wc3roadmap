---
phase: "03"
plan: "02"
subsystem: content-pipeline / citation-schema
tags: [citation-schema, discriminated-union, mdx-transform, d-07, d-13, cont-01, cont-02, cont-03, tdd-green]
requires: [03-01]
provides: [citation-kind-discriminator, mdx-how-to-apply-split, migrated-seed-nodes]
affects:
  - src/schemas/node.ts
  - content-collections.ts
  - src/schemas/node.test.ts
  - content/nodes/army-positioning.mdx
  - content/nodes/base-defense.mdx
  - content/nodes/creep-routing.mdx
  - content/nodes/expansion-timing.mdx
  - content/nodes/harassment.mdx
  - content/nodes/hero-leveling.mdx
  - content/nodes/hotkey-discipline.mdx
  - content/nodes/map-control.mdx
  - content/nodes/micro-focus-fire.mdx
  - content/nodes/resource-banking.mdx
  - content/nodes/scouting.mdx
  - content/nodes/supply-management.mdx
  - content/nodes/tech-timing.mdx
tech_stack:
  added: []
  patterns:
    - "z.discriminatedUnion('kind', [ScienceCitationSchema, CreatorCitationSchema]) — same shape in both node.ts and content-collections.ts (parallel-schema sync)"
    - "D-13 transform-time split: HOW_TO_APPLY_RE regex, bodyRaw/howToApplyRaw chunks, dual compileMDX → { mdx, mdxHowToApply }"
    - "Assumption A1 validated: compileMDX accepts { ...document, content: substring } without cloning"
key_files:
  modified:
    - src/schemas/node.ts — CitationSchema replaced with z.discriminatedUnion; ScienceCitationSchema/CreatorCitationSchema private; exports Citation/ScienceCitation/CreatorCitation types
    - content-collections.ts — citations array mirrors discriminated union; transform extended with D-13 split + dual compileMDX
    - src/schemas/node.test.ts — validFrontmatter fixture and applicationNote-rejection tests carry kind; 11 RED CitationSchema tests from 03-01 now GREEN
    - content/nodes/*.mdx (all 13) — kind field added; 8 creator citations carry quote field
decisions:
  - "ScienceCitationSchema and CreatorCitationSchema private consts; CitationSchema exported as the discriminated union — callers import CitationSchema, not the branch schemas directly (per pattern from node.ts line 82 context)"
  - "Assumption A1 validated: compileMDX({ ...document, content: bodyRaw }) accepted without needing a cloned object — no fallback needed"
  - "quote field added for 8/10 creator citations that contain clearly attributable direct statements; 2 creator citations (Insomnia, Grubby/harassment) describe observations rather than direct quotes and omit quote"
  - "PARALLEL-SCHEMA SYNC NOTE preserved in both files; discriminated union is field-for-field identical across node.ts and content-collections.ts"
metrics:
  duration: "8m"
  completed: "2026-06-29"
  tasks_completed: 3
  files_changed: 16
status: complete
---

# Phase 03 Plan 02: CitationSchema Discriminated Union + D-13 Transform Split Summary

**One-liner:** Replaced flat CitationSchema with a kind-discriminated union (science/creator) in both schema files simultaneously, split the compiled MDX body from the How-to-Apply section via a dual-compileMDX transform, and migrated all 13 seed nodes.

---

## What Was Built

### Task 1 — CitationSchema discriminated union (parallel-schema sync)

**`src/schemas/node.ts`:**
- `ScienceCitationSchema` (private): `kind: z.literal("science")`, `source`, `url?`, `applicationNote` (D-03 error message preserved).
- `CreatorCitationSchema` (private): same fields plus optional `quote` (D-05).
- `CitationSchema` exported as `z.discriminatedUnion("kind", [ScienceCitationSchema, CreatorCitationSchema])`.
- Exported types: `Citation`, `ScienceCitation`, `CreatorCitation` via `z.infer`.
- SPDX header and PARALLEL-SCHEMA SYNC NOTE preserved.

**`content-collections.ts`:**
- `citations: z.array(z.discriminatedUnion("kind", [...]))` — field-for-field identical to node.ts (parallel-schema sync, same commit).
- PARALLEL-SCHEMA SYNC NOTE extended to reference plan 03-02.

**`src/schemas/node.test.ts`:**
- `validFrontmatter.citations[0]` fixture updated to carry `kind: "science" as const`.
- "accepts citations without a url" test updated to carry `kind: "science"`.
- Three citation applicationNote tests (reject missing, reject empty, accept non-empty) updated to carry `kind: "science"` so they fail for the correct reason.
- All 11 RED CitationSchema tests from plan 03-01 now GREEN (43/43 node schema tests pass).

### Task 2 — D-13 transform-time split (dual compileMDX)

**`content-collections.ts` transform:**
- CI check (`## How to Apply` presence) preserved FIRST — CONT-02 enforcement fires before any split.
- `HOW_TO_APPLY_RE = /^## How to Apply\s*/m` regex used for reliable heading match.
- `bodyRaw = content.slice(0, splitIdx).trim()` / `howToApplyRaw = content.slice(splitIdx).trim()`.
- Pitfall-2 guard: throws `content body is empty before "## How to Apply"` if `bodyRaw.length === 0`.
- `compileMDX(context, { ...document, content: bodyRaw })` and `compileMDX(context, { ...document, content: howToApplyRaw })` — Assumption A1 validated (partial document accepted).
- Transform returns `{ ...document, mdx, mdxHowToApply }`.
- Generated `allNodes.js` confirms 13/13 nodes carry `mdxHowToApply`.

### Task 3 — Migrate all 13 seed MDX citation blocks

All 13 `content/nodes/*.mdx` files updated:

| File | Science citations | Creator citations | Quotes added |
|------|------------------|------------------|--------------|
| army-positioning.mdx | Schmidt & Lee (2011) | ToD | yes |
| base-defense.mdx | Ericsson et al. (1993) | Insomnia | no |
| creep-routing.mdx | Schmidt & Lee (2011) | Grubby | no |
| expansion-timing.mdx | Newell & Simon (1972) | Happy | yes |
| harassment.mdx | Schmidt & Lee (2011) | Grubby | no |
| hero-leveling.mdx | Ericsson et al. (1993) | — | — |
| hotkey-discipline.mdx | Fitts & Posner (1967) | — | — |
| map-control.mdx | Mikkelsen et al. (2009) | Grubby | yes |
| micro-focus-fire.mdx | Ericsson et al. (1993) | Grubby | yes |
| resource-banking.mdx | Camerer & Weber (1999) | Grubby | yes |
| scouting.mdx | Ericsson et al. (1993) | Happy | yes |
| supply-management.mdx | — | Grubby | yes |
| tech-timing.mdx | Newell & Simon (1972) | Moon | yes |

---

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/schemas/node.test.ts` — 43/43 tests | PASS |
| `npx tsc --noEmit` — no errors in node.ts or content-collections.ts | PASS (2 pre-existing RED scaffold errors in filter-utils.test.ts / node-content-query.test.ts are plan 03-01 expected RED) |
| `npm run build:content` — 13/13 nodes compiled | PASS |
| `npm run validate` — How-to-Apply + referential integrity + patch checks | PASS |
| 13/13 allNodes entries carry `mdxHowToApply` | PASS |

---

## Deviations from Plan

### Auto-fixed: test fixture updates beyond what plan explicitly named

The plan said to update "pre-discriminator citation fixtures/tests." Three additional test fixtures (the applicationNote-rejection tests, lines 316–350) also needed `kind: "science"` to fail for the correct reason rather than at the discriminator level. Added `kind` to all three — tests remain RED for the right reason (applicationNote). Tracked as Rule 1 precision fix.

---

## Known Stubs

None. No production stubs introduced. The `mdxHowToApply` field is now compiled into `allNodes` — panel rendering components will consume it in plans 03-06 through 03-09.

---

## Threat Flags

None. Only build-time content pipeline changes and trusted-author MDX files. No new network endpoints, auth paths, or user-supplied content paths introduced. T-3-03 (empty-body DoS) is now mitigated per threat register — bodyRaw guard is in place.

---

## Self-Check: PASSED

Files verified present:
- `src/schemas/node.ts` — FOUND (contains 'discriminatedUnion')
- `content-collections.ts` — FOUND (contains 'mdxHowToApply')
- `src/schemas/node.test.ts` — FOUND (contains 'kind: "science" as const')
- `content/nodes/map-control.mdx` — FOUND (contains 'kind: science')
- `content/nodes/supply-management.mdx` — FOUND (contains 'kind: creator')

Commits verified:
- `98ad415` — feat(03-02): CitationSchema discriminated union — parallel-schema sync
- `3dde358` — feat(03-02): D-13 dual compileMDX — split body + How-to-Apply in transform
- `3b69b84` — feat(03-02): migrate all 13 seed nodes — add kind to citation blocks
