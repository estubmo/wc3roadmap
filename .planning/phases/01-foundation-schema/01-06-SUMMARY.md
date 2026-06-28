---
phase: 01-foundation-schema
plan: "06"
subsystem: content-pipeline
tags: [content-collections, mdx, zod, validation, build-time, node-schema]

requires:
  - phase: 01-foundation-schema/01-02
    provides: "content-collections + MDX packages installed; vite plugin wired"
  - phase: 01-foundation-schema/01-04
    provides: "patch registry (PATCH_IDS) and src/lib/patches.ts"
  - phase: 01-foundation-schema/01-05
    provides: "NodeFrontmatterSchema in src/schemas/node.ts (parallel schema)"

provides:
  - "nodes collection defined in content-collections.ts with full Zod v4 per-document validation"
  - "build-time enforcement of How-to-Apply body section via transform throw"
  - "content/nodes/map-control.mdx — first valid seed node"
  - ".content-collections/generated/ typed module with map-control document"

affects:
  - 01-07-validate-content (imports allNodes from generated module)
  - phase-02-graph (reads allNodes for graph edges + display data)
  - phase-03-content (all future node files must pass these checks)
  - phase-09-pathway-content (content authoring uses this schema contract)

tech-stack:
  added: []
  patterns:
    - "nodes collection: defineCollection with z.object({...}) schema (not deprecated function form) + transform for How-to-Apply check + compileMDX"
    - "defineConfig({ content: [nodes] }) — content key, not deprecated collections key"
    - "Explicit content: z.string() in schema avoids content-collections implicit-content deprecation"
    - "compileMDX(context, document) in transform — context provides cache; document provides _meta + content"
    - "patchId: z.enum(PATCH_IDS) imported from src/lib/patches wires referential integrity at build time"

key-files:
  created:
    - content/nodes/map-control.mdx
  modified:
    - content-collections.ts

key-decisions:
  - "content-collections 0.15.2 retired the function-as-schema form; schema: z.object({...}) is the correct API (not schema: (z) => ({...}))"
  - "defineConfig uses content: [nodes] not collections: [nodes] (collections is deprecated in 0.15.x)"
  - "Explicit content: z.string() field in schema avoids implicit-content deprecation warning"
  - "Research Pitfall 1 (injected z) is obsolete for content-collections 0.15.x — import z directly from zod"
  - "How-to-Apply check in transform: document.content.includes('## How to Apply')"

patterns-established:
  - "Every new node in content/nodes/ is one MDX file with YAML frontmatter; must include ## How to Apply section"
  - "content-collections.ts and src/schemas/node.ts maintain identical field sets (PARALLEL-SCHEMA SYNC NOTE)"

requirements-completed: [DATA-06, DATA-03, DATA-01]

coverage:
  - id: D1
    description: "nodes collection in content-collections.ts validates all NodeFrontmatter fields at build time"
    requirement: DATA-06
    verification:
      - kind: integration
        ref: "npm run typecheck — exits 0"
        status: pass
      - kind: integration
        ref: "npm run build:content — exits 0 processing 1 collection and 1 document"
        status: pass
    human_judgment: false
  - id: D2
    description: "Transform throws build error when MDX body lacks ## How to Apply section"
    requirement: DATA-03
    verification:
      - kind: integration
        ref: "npm run build:content — seed node with section exits 0; mechanism verified by code inspection"
        status: pass
    human_judgment: false
  - id: D3
    description: "map-control.mdx seed node passes full validation and appears in generated module"
    requirement: DATA-01
    verification:
      - kind: integration
        ref: "npm run build:content — allNodes.js contains map-control document with nodeType: MECHANIC"
        status: pass
      - kind: integration
        ref: "npm run build — full Vite build exits 0 with seed node"
        status: pass
    human_judgment: false

duration: 2m
completed: "2026-06-28"
status: complete
---

# Phase 01 Plan 06: Content-Collections Nodes Pipeline + Seed Node Summary

**Zod v4 nodes collection defined in content-collections.ts with build-time schema validation and How-to-Apply enforcement; map-control.mdx seed node passes the full pipeline**

## Performance

- **Duration:** ~2m
- **Started:** 2026-06-28T19:44:28Z
- **Completed:** 2026-06-28T19:46:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `content-collections.ts`: full `defineCollection` for nodes with per-document Zod v4 schema (all NodeFrontmatter fields) and transform that throws when `## How to Apply` is absent from the MDX body
- `patchId: z.enum(PATCH_IDS)` imported from `src/lib/patches` wires patch-registry referential integrity into the build gate (DATA-04)
- `content/nodes/map-control.mdx`: valid seed node with two citations (applicationNote on each), patchId `patch-1.36.2`, How-to-Apply section; processed by `npm run build:content` in 218ms
- `.content-collections/generated/` generated with `allNodes.js` containing the compiled map-control document (MDX compiled to JSX by `compileMDX`)
- `npm run build` exits 0 with the seed node present — closes ROADMAP success criterion 1 (build-time validation gate)

## Task Commits

1. **Task 1: Define the nodes collection** - `6c45a2b` (feat)
2. **Task 2: Author seed node and confirm content generation** - `ec7dbe9` (feat)

## Files Created/Modified

- `/home/eirikmo/projects/wc3roadmap/content-collections.ts` — replaced empty stub with full nodes collection (schema + transform)
- `/home/eirikmo/projects/wc3roadmap/content/nodes/map-control.mdx` — valid seed node (new file)

## Decisions Made

- **content-collections 0.15.x retired the function-as-schema form:** Research Pitfall 1 warned about "injected z" — this was the old `schema: (z) => ({...})` API. In 0.15.2 this is retired; using it triggers a `legacySchema` error. Import `z` directly from `"zod"` and pass a Zod schema object to `schema:`.
- **`defineConfig` uses `content: [nodes]`:** The `collections` key is deprecated in 0.15.x (triggers deprecation warning but still works). Used the current `content` key.
- **Explicit `content: z.string()` in schema:** content-collections 0.15.x warns about "implicit addition of a content property to schemas is deprecated" — added `content: z.string()` explicitly as the first field.
- **How-to-Apply check:** `document.content.includes("## How to Apply")` — exact heading match. Transform throws with a clear error message including the node id.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Research Pitfall 1 (injected z / function schema) is obsolete in content-collections 0.15.x**

- **Found during:** Task 1 (inspecting installed package API)
- **Issue:** The plan specified `schema: (z) => ({...})` per the research document. content-collections 0.15.2 retires the function-as-schema form with a hard error: `"The use of a function as a schema is retired."` It also emits a deprecation for `collections` key (→ use `content`). And it warns on implicit `content` field (→ add explicitly).
- **Fix:** Used `schema: z.object({...})` with `z` imported directly from `"zod"`. Used `defineConfig({ content: [nodes] })`. Added `content: z.string()` as explicit first field in the schema. No API behavior change — the same validation runs; only the call shape changed.
- **Files modified:** `content-collections.ts`
- **Verification:** `npm run typecheck` exits 0; `npm run build:content` processes 1 collection, 1 document in 218ms.
- **Committed in:** `6c45a2b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — API mismatch between research and installed package version)
**Impact on plan:** No scope creep. The fix was strictly required — the function-as-schema form is a hard error in 0.15.2. Functionality is identical.

## Issues Encountered

None — once the API mismatch was identified via type inspection, the correct form was applied and the build passed first try.

## Known Stubs

None — `map-control.mdx` is a minimal-but-real node with substantive content; no placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The build-time validation surface was already in the plan's threat model (T-01-MDX).

## Next Phase Readiness

- Plan 01-07 (`validate-content` CI script) can now import `allNodes` from `content-collections` — the generated module is confirmed to exist after `npm run build:content`
- Adding future nodes is editing one `.mdx` file; the pipeline rejects malformed content at build time
- `src/schemas/node.ts` (runtime surface) and `content-collections.ts` (build-time surface) are field-for-field identical — any future field addition must update both

---
*Phase: 01-foundation-schema*
*Completed: 2026-06-28*
