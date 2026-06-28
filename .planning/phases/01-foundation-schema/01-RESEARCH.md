# Phase 1: Foundation & Schema - Research

**Researched:** 2026-06-28
**Domain:** Content schema (Zod v4 + content-collections), TanStack Start scaffold, Vercel deployment, CI validation, GPL-3.0 licensing
**Confidence:** MEDIUM (all primary sources are official docs/npm registry; integration patterns are web-verified but not yet executed against the exact stack)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Node Authoring Format**
- D-01: Nodes authored as one `.mdx` file per node with Zod-validated frontmatter. Structured metadata in frontmatter; learning prose + "How to apply in your next game" section in MDX body.
- D-02: Content is AI-authored (Claude Code deep-research pipeline). Schema, CI, and DX optimize for agent generation + human PR review.
- D-03: CI deterministically enforces frontmatter structure — every citation entry must carry an `applicationNote`, and "How to apply" section must be present. (Citation-field detail finalized in Phase 3; enforcement hook designed into Phase 1 schema.)

**Patch-Version Primitive**
- D-04: Patch version modeled as a curated, ordered registry — typed module listing known WC3 patches with metadata (id, order, released, objectIdMapVersion) plus exported `CURRENT_PATCH` pointer.
- D-05: All schemas store a `patchId` that must reference a registry entry; CI validates referential integrity. Registry is the single place to add a new patch.
- D-06: Staleness derives from registry — `meta_volatile` + `last_reviewed`/`patch_context` vs `CURRENT_PATCH` drives staleness indicator (Phase 9).

**Schema Taxonomy**
- D-07: First-class node categorical fields from day one: `nodeType` (MECHANIC | CONCEPTUAL — locked), `skillType` (macro | micro | mental), `difficulty` (beginner | intermediate | advanced — Claude's discretion on exact labels), `race` (agnostic | human | orc | undead | nightelf), `tags[]`.
- D-08: `skillType`, `difficulty`, `race` exist now to serve GRAPH-04 filtering and v2 race branches without a later migration.
- D-09: Graph edges are soft `prerequisites[]` declared on each node (by node id). CI validates every referenced id exists and prerequisite graph is acyclic. Graph engine (Phase 2) derives edges from nodes.

**Schema Set Breadth**
- D-10: Phase 1 defines all three schemas: node schema (fully), plus foundational `masteryThreshold` and `progressRecord` schemas. Each carries `patchId` (and relevant nodeId fields) so the patch primitive is wired across all three from the first schema commit.

**Scaffold & Deployment**
- D-11: Scaffold a minimal TanStack Start app (single placeholder route) that builds and runs.
- D-12: Live Vercel deploy from day one — wire Vercel project + CI so every push builds and deploys to a real URL.
- D-13: CI runs schema validation as a required check (build fails on malformed content — DATA-07).
- D-14: Project licensed GPL-3.0; core dependencies pinned to known-working versions with a documented upgrade policy.

**Architecture Foundations**
- D-15: Scaffold root `CONTEXT.md` capturing ubiquitous domain language and `docs/adr/` with foundational ADRs. Apply deep-module discipline — content schema, patch registry, and validation layer are deep modules with simple interfaces.

### Claude's Discretion
- Patch registry shape/location (D-04/D-05): exact field set and whether it's a plain TS module vs a content collection — Claude decides; ordered + referentially-validated + CURRENT_PATCH pointer are the only hard constraints.
- Citation frontmatter field shape (D-03): final structure finalized in Phase 3; Phase 1 only guarantees the `applicationNote`-per-citation enforcement hook exists.
- CI tooling specifics (D-13): GitHub Actions assumed; exact job layout is Claude's call.
- Foundational ADR seed set (D-15): suggested — (1) stack choice, (2) content/graph-engine decoupling, (3) patch-version primitive as registry, (4) GPL-3.0 licensing rationale. Claude may add/split as warranted.
- Difficulty enum values (D-07): exact labels Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
- GRAPH-04 filter UI — Phase 3 (fields exist now; filter UI deferred)
- v2 race-specific branch content — fields exist; actual race content deferred to v2 (RACE-01..05)
- Replay object-ID map versions per patch — objectIdMapVersion hook in registry; maps themselves are Phase 8
- Final citation field structure + howToApply rendering — Phase 3; Phase 1 reserves schema/CI enforcement hook only
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Node taxonomy distinguishes MECHANIC vs CONCEPTUAL, baked into schema from day one | Zod v4 `z.enum(["MECHANIC","CONCEPTUAL"])` as `nodeType` field; content-collections validates at build time |
| DATA-02 | Node content schema Zod-validated and decoupled from graph/UI (graph receives only display-essential data; full content loads lazily) | Two schema surfaces: `NodeSummary` (graph) vs full `NodeFrontmatter`; content-collections generates typed exports consumed lazily per D-09 |
| DATA-03 | Each node carries `patch_context`, `last_reviewed`, and `meta_volatile` flag | All three are required (non-optional) fields in the Zod schema; build fails if absent |
| DATA-04 | Patch version is a system-wide primitive across content, thresholds, replays, and progress records | Patch registry module (`src/lib/patches.ts`) exports ordered PATCHES array + CURRENT_PATCH; PatchIdSchema is a z.enum derived from registry; used in all three schemas |
| DATA-05 | Graph edges are soft prerequisites (suggested order); nodes never hard-locked | `prerequisites: z.array(z.string())` on node schema; CI validates IDs exist + graph is acyclic |
| DATA-06 | Node content stored as version-controlled MDX/JSON files, enabling updates and community PRs | content-collections pipeline: one MDX per node in `content/nodes/`, processed at build time, types generated automatically |
| DATA-07 | Content schema validated in CI so malformed nodes fail the build | content-collections fails build with `InvalidContentEntryDataError`; additional CI script validates cross-document rules (prereq resolution, acyclicity, howToApply presence) |
| OSS-01 | GPL-3.0 license with public code and content | LICENSE file + SPDX headers + package.json `license` field; wc3v (GPL-3.0-or-later) compatibility satisfied |
| OSS-02 | Data model and content pipeline extensible (add nodes, races, sources, pathways without rework) | Enum fields for race/nodeType from day one; content-collections schema easily extended; patch registry append-only |
</phase_requirements>

---

## Summary

Phase 1 is the schema-and-scaffold phase — it produces no user-facing UI but establishes every contract downstream phases consume. Three deliverables dominate the technical surface: (1) the Zod v4 content schema with its three schema definitions (node, masteryThreshold, progressRecord), wired through the content-collections pipeline for build-time validation; (2) the patch registry primitive — a typed TS module that is the authoritative source of WC3 patch IDs, referenced by all three schemas and validated in CI for referential integrity; (3) the minimal TanStack Start scaffold deployed live to Vercel from day one, with a GitHub Actions CI that fails on malformed content.

The content-collections + TanStack Start + Zod v4 integration is the most complex wiring task in Phase 1. The key pattern is: `contentCollections()` must be the first Vite plugin; the schema function receives injected `z` (not a separate import); the `transform` function is the seam for MDX compilation and per-document custom validation (including "How to Apply" section check). Cross-document validation (prerequisite ID resolution, acyclicity check, patchId referential integrity) lives in a separate TypeScript CI script, not in the content-collections transform. This separation keeps the schema function deep (per-document shape), and the CI script handles the graph-level invariants that cannot be checked per document.

The patch registry is designed as a plain TypeScript module (`src/lib/patches.ts`) — not a content collection. It is authored by developers (not AI), version-controlled, and imported directly by the content-collections configuration to generate the `PatchIdSchema`. This makes the registry the single source of truth for valid patch IDs, satisfying D-05's referential integrity requirement without a runtime lookup.

**Primary recommendation:** Wire content-collections + Zod v4 first (validate the integration locally), then design the three schemas (node, threshold, progress), then implement the CI validation script with DAG cycle detection, then scaffold and deploy. This order surfaces integration friction early and keeps schema design informed by what content-collections actually infers.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Content schema definition (Zod) | Build Tool (content-collections) | — | Schema validates at build time, not runtime; output is typed static data |
| Patch registry | Source code (TS module) | — | Curated developer-authored data; not user content; needs to be importable by schema config |
| Cross-document CI validation | CI Script (GitHub Actions) | — | Prerequisite resolution, acyclicity, and howToApply checks require the full corpus, not single-document scope |
| MDX body compilation | Build Tool (content-collections transform) | — | compileMDX runs at build time inside the transform function |
| Per-document shape validation | Build Tool (content-collections schema) | — | Field presence, enum membership, string patterns — all per-document |
| TanStack Start app scaffold | Frontend Server (SSR) | CDN / Static | Nitro serves SSR; static assets via CDN |
| Vercel deployment | CDN / Static + Frontend Server | — | Vercel handles both static assets and serverless functions via Nitro |
| GPL-3.0 licensing | Repository metadata | — | LICENSE file + SPDX headers; no runtime component |
| masteryThreshold schema | Source code (Zod) | — | Schema definition only in Phase 1; persistence is Phase 4–5 |
| progressRecord schema | Source code (Zod) | — | Schema definition only in Phase 1; persistence is Phase 4–5 |

---

## Standard Stack

### Phase 1 Core (installed in this phase)

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@tanstack/react-start` | 1.168.26 [VERIFIED: npm registry] | Full-stack React framework — SSR, server functions, routing | Pinned in CLAUDE.md; project commitment |
| `@content-collections/core` | 0.15.2 [VERIFIED: npm registry] | Build-time content pipeline — collect + validate MDX/JSON | Official TanStack Start quickstart; successor to unmaintained contentlayer |
| `@content-collections/vite` | 0.3.0 [VERIFIED: npm registry] | Vite plugin for content-collections | Required for TanStack Start v1.121.0+ (replaces old vinxi adapter) |
| `@content-collections/mdx` | 0.2.2 [VERIFIED: npm registry] | MDX compilation inside content-collections transform | Needed to compile MDX body at build time |
| `zod` | 4.4.3 [VERIFIED: npm registry] | Schema validation — content frontmatter, API responses | v4 is current; dramatically faster + smaller than v3; pinned in CLAUDE.md |
| `nitro` | 3.x [VERIFIED: npm registry] | Vite plugin adapter for Vercel deployment | Required for Vercel zero-config detection of TanStack Start |
| `typescript` | 5.x [ASSUMED] | Type safety — strict mode | Required by TanStack Start; included in scaffold |

### Supporting (Dev Tools)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/eslint-plugin-router` | latest [ASSUMED] | Router-specific ESLint rules | Wire into ESLint config at scaffold time |
| `tsx` or `ts-node` | latest [ASSUMED] | Run TypeScript CI validation scripts | Needed for `scripts/validate-content.ts` during CI |
| Prettier | latest [ASSUMED] | Code formatting | Dev tool only; standard OSS project convention |

### Phase 1 Does NOT Install (reserved for later phases)

| Package | Phase |
|---------|-------|
| `@xyflow/react` | Phase 2 |
| `@tanstack/react-query` | Phase 3+ |
| `drizzle-orm`, `drizzle-kit` | Phase 4 |
| `better-auth` | Phase 4 |
| `@neondatabase/serverless` | Phase 4 |
| `motion` | Phase 2 |
| `tailwindcss`, `shadcn/ui` | Phase 2 |

### Version Drift Warning

The following packages in `CLAUDE.md` have drifted from the current npm registry. Flag for Phase 4 planning:

| Package | CLAUDE.md Pinned | npm Current (2026-06-28) | Action |
|---------|-----------------|--------------------------|--------|
| `drizzle-orm` | 0.44.x | 0.45.2 [VERIFIED: npm registry] | Use pinned for Phase 4; review changelog before adopting 0.45.x |
| `drizzle-kit` | 0.25.x | 0.31.10 [VERIFIED: npm registry] | Significant drift; drizzle-kit minor versions sometimes break CLI syntax — verify carefully in Phase 4 |

### Installation

```bash
# Scaffold
npx @tanstack/cli create wc3roadmap

# Content pipeline
npm install @content-collections/core @content-collections/vite @content-collections/mdx

# Schema validation
npm install zod

# Vercel deployment adapter
npm install nitro

# Dev tools
npm install -D typescript @tanstack/eslint-plugin-router prettier tsx
```

---

## Package Legitimacy Audit

All packages verified against npm registry (2026-06-28). SUS verdicts are all "too-new" — caused by a recent version publish, not suspicious package identity. All are established, highly-downloaded packages from known maintainers with public source repositories.

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| `@content-collections/core` | npm | ~2yr | 94,804 | github.com/sdorra/content-collections | SUS (too-new publish) | Approved — established package, public repo, >90k DL/wk |
| `@content-collections/vite` | npm | ~2yr | 30,579 | github.com/sdorra/content-collections | OK | Approved |
| `@content-collections/mdx` | npm | ~1yr | 60,810 | no-repo signal, same monorepo [ASSUMED] | SUS (no-repository) | Approved — same github.com/sdorra/content-collections monorepo; no-repo signal is npm metadata issue not a legitimacy signal |
| `zod` | npm | 5yr+ | 210,769,125 | github.com/colinhacks/zod | OK | Approved |
| `@tanstack/react-start` | npm | 2yr+ | 17,374,614 | github.com/TanStack/router | SUS (too-new publish) | Approved — official TanStack, 17M DL/wk |
| `@tanstack/react-router` | npm | 2yr+ | 21,225,091 | github.com/TanStack/router | SUS (too-new publish) | Approved — official TanStack, 21M DL/wk |
| `nitro` | npm | 3yr+ | N/A (verified via Vercel docs) [ASSUMED] | github.com/nitrojs/nitro | — | Approved — recommended by Vercel for TanStack Start [CITED: vercel.com/docs/frameworks/full-stack/tanstack-start] |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious (SUS):** all SUS verdicts are "too-new" due to recent version releases from established packages. No human checkpoint required — these are known packages.

---

## Architecture Patterns

### System Architecture Diagram

```
Agent generates node MDX file
        ↓
content/nodes/{id}.mdx
  [frontmatter: Zod-validated fields]
  [body: prose + ## How to Apply section]
        ↓
content-collections build (Vite plugin, runs at npm run build)
        ↓ per-document validation (schema function)
  • nodeType enum membership
  • patchId ∈ PATCHES registry
  • required field presence (patch_context, last_reviewed, meta_volatile)
  • citation.applicationNote required per citation
  • tags, prerequisites are string arrays
        ↓ transform function (per document)
  • howToApply section presence check → build error if missing
  • compileMDX() → compiled JSX
        ↓
.content-collections/generated/index.ts (typed, auto-generated)
        ↓
npm run validate (CI script: scripts/validate-content.ts)
  • validatePrerequisiteExists(allNodes) — cross-document
  • validatePatchIds(allNodes)           — cross-document (belt-and-suspenders)
  • detectCycles(allNodes)               — graph acyclicity (DAG check)
        ↓
GitHub Actions "validate" job (required check)
  npm ci → tsc --noEmit → npm run validate → npm run build
        ↓
Vercel preview/prod deployment (auto on git push)
```

### Recommended Project Structure

```
wc3roadmap/
├── content/
│   └── nodes/              # One .mdx file per node (DATA-06)
│       ├── map-control.mdx
│       └── supply-management.mdx
├── src/
│   ├── lib/
│   │   └── patches.ts      # Patch registry module (D-04/D-05)
│   ├── schemas/
│   │   ├── node.ts         # NodeSchema, NodeFrontmatter type, NodeSummary type
│   │   ├── mastery.ts      # MasteryThresholdSchema
│   │   └── progress.ts     # ProgressRecordSchema
│   └── routes/
│       ├── __root.tsx      # Root layout
│       └── index.tsx       # Placeholder home page
├── scripts/
│   └── validate-content.ts # CI validation: prereq IDs, acyclicity, patch refs
├── docs/
│   └── adr/
│       ├── 001-stack-choice.md
│       ├── 002-content-graph-decoupling.md
│       ├── 003-patch-registry.md
│       └── 004-gpl3-licensing.md
├── content-collections.ts  # defineCollection config (repo root)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── CONTEXT.md              # Domain language (D-15)
├── LICENSE                 # GPL-3.0 full text
└── .github/
    └── workflows/
        └── ci.yml
```

### Pattern 1: content-collections Configuration with Zod Schema

**What:** Defines the node collection with per-document Zod validation and MDX compilation in the transform step.

**When to use:** At project root, as `content-collections.ts`. This is the single configuration file for all collections.

```typescript
// Source: content-collections.dev/docs/quickstart/tanstack-start + web research
// SPDX-License-Identifier: GPL-3.0-or-later
import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { PATCH_IDS } from "./src/lib/patches";

const nodes = defineCollection({
  name: "nodes",
  directory: "content/nodes",
  include: "**/*.mdx",
  schema: (z) => ({
    id: z.string().regex(/^[a-z0-9-]+$/, "Node id must be kebab-case"),
    title: z.string().min(1),
    nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
    skillType: z.enum(["macro", "micro", "mental"]),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    race: z.enum(["agnostic", "human", "orc", "undead", "nightelf"]),
    tags: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    patchId: z.enum(PATCH_IDS as [string, ...string[]]),
    patch_context: z.string().min(1),
    last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    meta_volatile: z.boolean(),
    citations: z.array(
      z.object({
        source: z.string().min(1),
        url: z.string().optional(),
        applicationNote: z.string().min(1, "Every citation must have an applicationNote"),
      })
    ),
  }),
  transform: async (document, context) => {
    // Enforce "How to apply" section in MDX body (D-03, CONT-02)
    if (!document.content.includes("## How to Apply")) {
      throw new Error(
        `Node "${document.id}": missing required "## How to Apply" section in MDX body`
      );
    }
    const mdx = await compileMDX(context, document);
    return { ...document, mdx };
  },
});

export default defineConfig({ collections: [nodes] });
```

**Key facts:**
- The `schema` function receives `z` injected by content-collections (not imported separately) [MEDIUM: websearch]
- Validation errors produce `InvalidContentEntryDataError` with field detail — build exits non-zero [MEDIUM: websearch]
- `transform` throws → build fails with the thrown message [MEDIUM: websearch]
- `PATCH_IDS` must be a `[string, ...string[]]` tuple cast for `z.enum()` to accept a dynamic array

### Pattern 2: Patch Registry Module (Deep Module)

**What:** Authoritative ordered list of WC3 patches. Small interface (4 exports) hiding implementation. Single place to add a new patch.

**When to use:** Import in content-collections.ts, node schema, masteryThreshold schema, progressRecord schema. Never inline patch IDs anywhere else.

```typescript
// Source: D-04/D-05 decisions + deep-module discipline from codebase-design skill
// SPDX-License-Identifier: GPL-3.0-or-later
// src/lib/patches.ts

export interface PatchEntry {
  readonly id: string;
  readonly order: number;
  readonly released: string; // ISO date
  readonly objectIdMapVersion: number; // hook for Phase 8 replay parsing
}

export const PATCHES = [
  { id: "patch-1.36.1", order: 0, released: "2022-11-16", objectIdMapVersion: 1 },
  { id: "patch-1.36.2", order: 1, released: "2024-03-15", objectIdMapVersion: 1 },
  // Add new patches here — order must be strictly ascending
] as const satisfies readonly PatchEntry[];

export const CURRENT_PATCH = PATCHES[PATCHES.length - 1] as PatchEntry;

// Tuple literal required by z.enum() — do not change type
export const PATCH_IDS = PATCHES.map((p) => p.id) as [string, ...string[]];

// Registry lookup — throws if id is unknown (fail-fast)
export function getPatch(id: string): PatchEntry {
  const patch = PATCHES.find((p) => p.id === id);
  if (!patch) throw new Error(`Unknown patch id: "${id}"`);
  return patch;
}
```

**Deep-module analysis:**
- Interface: 4 exports (`PATCHES`, `CURRENT_PATCH`, `PATCH_IDS`, `getPatch`)
- Implementation hides: type assertions, tuple construction, ordering invariant
- Callers never touch the array directly — they call `getPatch(id)` or `PATCH_IDS` for schema

### Pattern 3: Three Zod Schemas (node, masteryThreshold, progressRecord)

**What:** Standalone Zod schema files, each importing PatchIdSchema from the patch registry. TypeScript types inferred with `z.infer<>`.

```typescript
// Source: Zod v4 API docs (zod.dev/api) + D-10 decision
// SPDX-License-Identifier: GPL-3.0-or-later
// src/schemas/node.ts
import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

// NodeSummary: graph-display-only subset (DATA-02 decoupling)
export const NodeSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
  race: z.enum(["agnostic", "human", "orc", "undead", "nightelf"]),
  prerequisites: z.array(z.string()),
});
export type NodeSummary = z.infer<typeof NodeSummarySchema>;

// Full NodeFrontmatter: all validated fields
export const NodeFrontmatterSchema = NodeSummarySchema.extend({
  skillType: z.enum(["macro", "micro", "mental"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  tags: z.array(z.string()),
  patchId: z.enum(PATCH_IDS),
  patch_context: z.string().min(1),
  last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meta_volatile: z.boolean(),
  citations: z.array(
    z.object({
      source: z.string(),
      url: z.string().optional(),
      applicationNote: z.string().min(1),
    })
  ),
});
export type NodeFrontmatter = z.infer<typeof NodeFrontmatterSchema>;
```

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// src/schemas/mastery.ts — minimal but real (D-10)
import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

export const MasteryThresholdSchema = z.object({
  nodeId: z.string(),
  nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
  patchId: z.enum(PATCH_IDS),
  // Phase 7/8 will extend — do not add specifics yet
  thresholdDefinition: z.record(z.string(), z.unknown()),
});
export type MasteryThreshold = z.infer<typeof MasteryThresholdSchema>;
```

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// src/schemas/progress.ts — minimal but real (D-10)
import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

export const MasteryStateSchema = z.enum(["untouched", "learning", "mastered"]);
export type MasteryState = z.infer<typeof MasteryStateSchema>;

export const ProgressRecordSchema = z.object({
  userId: z.string(),
  nodeId: z.string(),
  patchId: z.enum(PATCH_IDS), // progress is patch-tagged (DATA-04)
  masteryState: MasteryStateSchema,
  lastUpdated: z.string().datetime(),
});
export type ProgressRecord = z.infer<typeof ProgressRecordSchema>;
```

**Zod v4 facts (new project — no migration concerns):**
- `z.enum()` replaces `z.nativeEnum()` — pass array directly [CITED: zod.dev/api]
- `.refine(fn, { error: 'msg' })` — `error` param, not `message` [CITED: zod.dev/v4]
- `.check()` replaces `.superRefine()` — use for complex multi-issue validation [CITED: zod.dev/v4]
- `.safeExtend()` when extending schemas that have refinements [CITED: zod.dev/v4]
- `z.prettifyError()` for human-friendly CI output [CITED: zod.dev/v4]

### Pattern 4: DAG Cycle Detection for Prerequisite Graph

**What:** TypeScript function that detects cycles in the prerequisite graph. Runs in the CI validation script.

**When to use:** In `scripts/validate-content.ts`, called after all nodes are loaded. Returns error strings; does not throw (CI script collects all errors and reports at once).

```typescript
// Source: standard DFS cycle-detection algorithm [ASSUMED: training knowledge]
// 3-color marking: WHITE (unvisited) / GRAY (in-stack) / BLACK (done)

interface NodeWithPrereqs {
  id: string;
  prerequisites: string[];
}

export function detectCycles(nodes: NodeWithPrereqs[]): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const color = new Map<string, "WHITE" | "GRAY" | "BLACK">();
  const errors: string[] = [];

  // Initialize all nodes as WHITE
  for (const node of nodes) color.set(node.id, "WHITE");

  function dfs(id: string, path: string[]): void {
    const current = color.get(id);
    if (current === "BLACK") return; // Already fully processed
    if (current === "GRAY") {
      // Back edge found — cycle
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(cycleStart), id].join(" → ");
      errors.push(`Cycle detected in prerequisites: ${cycle}`);
      return;
    }

    color.set(id, "GRAY");
    const node = nodeMap.get(id);
    if (node) {
      for (const prereqId of node.prerequisites) {
        dfs(prereqId, [...path, id]);
      }
    }
    color.set(id, "BLACK");
  }

  for (const node of nodes) {
    if (color.get(node.id) === "WHITE") {
      dfs(node.id, []);
    }
  }

  return errors;
}
```

### Pattern 5: Vite Configuration (order matters)

```typescript
// Source: content-collections.dev + vercel.com/docs/frameworks/full-stack/tanstack-start
// SPDX-License-Identifier: GPL-3.0-or-later
// vite.config.ts
import { contentCollections } from "@content-collections/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    contentCollections(), // MUST be first — generates content types before other plugins run
    tanstackStart(),
    nitro(),              // Required for Vercel zero-config detection
    viteReact(),
  ],
});
```

**tsconfig.json path alias** (required for content-collections generated types):
```json
{
  "compilerOptions": {
    "paths": {
      "content-collections": ["./.content-collections/generated"]
    }
  }
}
```

### Pattern 6: GitHub Actions CI Workflow

```yaml
# Source: standard GitHub Actions patterns [ASSUMED: training knowledge]
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    name: Validate Content & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci           # Uses lockfile — reproducible

      - name: Type check
        run: npx tsc --noEmit

      - name: Validate content
        run: npx tsx scripts/validate-content.ts
        # Exits non-zero on: invalid prereq IDs, cycles, missing patchIds

      - name: Build
        run: npm run build
        # content-collections fails build on malformed frontmatter
        # Exits non-zero → CI fails → PR cannot merge

  # Vercel deployment via GitHub App (recommended, no separate job needed)
  # Connect repo at vercel.com — every push auto-deploys
```

**`scripts/validate-content.ts` structure:**
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
import { allNodes } from "content-collections"; // generated type
import { detectCycles } from "./lib/detectCycles";
import { PATCH_IDS } from "../src/lib/patches";

async function main() {
  const errors: string[] = [];
  const nodeIds = new Set(allNodes.map((n) => n.id));

  // Validate prerequisite IDs resolve
  for (const node of allNodes) {
    for (const prereqId of node.prerequisites) {
      if (!nodeIds.has(prereqId)) {
        errors.push(
          `Node "${node.id}": prerequisite "${prereqId}" does not exist`
        );
      }
    }
  }

  // Validate patch IDs reference registry (belt-and-suspenders)
  const validPatchIds = new Set(PATCH_IDS);
  for (const node of allNodes) {
    if (!validPatchIds.has(node.patchId)) {
      errors.push(`Node "${node.id}": patchId "${node.patchId}" is not in the patch registry`);
    }
  }

  // Detect prerequisite cycles
  const cycleErrors = detectCycles(allNodes);
  errors.push(...cycleErrors);

  if (errors.length > 0) {
    console.error("\n=== Content Validation Errors ===");
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error(`\n${errors.length} error(s) found. Build blocked.`);
    process.exit(1);
  }

  console.log(`✓ Content validation passed (${allNodes.length} nodes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### Pattern 7: GPL-3.0 File Header Convention

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

One-line SPDX identifier is the modern standard (replaces verbose FSF boilerplate). Use `GPL-3.0-or-later` (not `-only`) to match wc3v's license.

### Anti-Patterns to Avoid

- **Importing `z` from zod inside the content-collections `schema` function:** The schema function injects `z` — using a separate import may create a version mismatch if content-collections uses a different zod instance internally. Use the injected `z` exclusively inside `schema`. Use your own imported `z` in `src/schemas/*.ts`.
- **Putting cross-document validation inside the schema function:** The schema function runs per-document. Prerequisite ID resolution and cycle detection require the full corpus — they belong in the CI script, not the transform.
- **Using `vinxi` adapter instead of `vite`:** `@content-collections/vinxi` is for TanStack Start < v1.121.0. Current version (1.168.x) requires `@content-collections/vite`.
- **Using `z.nativeEnum()`:** Deprecated in Zod v4. Use `z.enum([...])` exclusively.
- **Using `.superRefine()`:** Deprecated in Zod v4. Use `.check()` for multi-issue refinements.
- **Putting `contentCollections()` after `tanstackStart()` in plugins:** contentCollections must be first — it generates `.content-collections/generated/` types that other plugins may need.
- **Committing `.content-collections/`:** Add to `.gitignore` — it is always regenerated at build time.
- **Using `npm install` instead of `npm ci` in CI:** `npm install` can modify the lockfile; `npm ci` ensures reproducible builds from the locked state.
- **Pinning with semver ranges (`^`, `~`) in application code:** For an application (not a library), use exact versions. Semver ranges allow surprise upgrades in fresh installs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content validation at build time | Custom Vite/Rollup plugin | `@content-collections/vite` | Edge cases in MDX parsing, incremental builds, watch mode, type generation — all handled |
| MDX compilation | Custom remark/rehype pipeline | `@content-collections/mdx` `compileMDX()` | Handles imports, JSX, caching, and integrates with the collection transform cleanly |
| TypeScript Zod schema | Custom type guards, manual validation | `zod` v4 | Type inference, error formatting, refinements, composability — all built-in |
| `process.exit(1)` on build error | — | Let it throw from transform; or `process.exit(1)` in CI script | content-collections' `InvalidContentEntryDataError` already produces a non-zero exit; don't duplicate |
| File routing | Custom Express/Hono router | `@tanstack/react-router` (bundled with Start) | File-based routing, type-safe params, loader data — all built-in |
| Topological sort (acyclicity check) | Third-party `toposort` package | Inline DFS (20 lines) | The problem is simple enough; no need for a dependency |

**Key insight:** The content-collections library eliminates the most error-prone part of Phase 1 (build-time MDX type generation). The only custom code needed is the CI validation script for cross-document checks — and that is intentionally custom because it encodes WC3 domain invariants (DAG structure, citation conventions) that no library can know.

---

## Common Pitfalls

### Pitfall 1: content-collections Schema Receives Injected `z`, Not Your Project's zod

**What goes wrong:** Developer imports `z` from `"zod"` at the top of `content-collections.ts` and uses it inside the `schema` function. Works locally but creates subtle type mismatches or runtime errors if content-collections internally uses a different zod version.

**Why it happens:** The `schema` function is designed to receive `z` as a parameter from content-collections' own validation runner.

**How to avoid:** Inside the `schema: (z) => ({...})` function, use ONLY the injected `z`. Import your own `z` from `"zod"` ONLY in `src/schemas/*.ts` files, not in `content-collections.ts`.

**Warning signs:** TypeScript complains that types from `schema` don't match your own schema types.

### Pitfall 2: `z.enum()` Requires a Non-Empty Tuple — Dynamic Arrays Need a Cast

**What goes wrong:** `z.enum(PATCH_IDS)` where `PATCH_IDS` is `string[]` — TypeScript rejects it because `z.enum()` requires `[string, ...string[]]`.

**Why it happens:** Zod v4 enum requires a tuple literal at the type level. `PATCHES.map(p => p.id)` returns `string[]`.

**How to avoid:** Cast: `z.enum(PATCH_IDS as [string, ...string[]])`. This is safe because the patch registry always has at least one entry.

**Warning signs:** TypeScript error "Argument of type 'string[]' is not assignable to parameter of type '[string, ...string[]]'."

### Pitfall 3: Vercel Requires `nitro` Plugin for Zero-Config Detection

**What goes wrong:** Developer deploys TanStack Start to Vercel without the nitro Vite plugin. The deploy succeeds but SSR doesn't work correctly, or Vercel doesn't detect the framework.

**Why it happens:** TanStack Start's SSR adapter is Nitro — Vercel's detector looks for the Nitro plugin to configure serverless functions correctly.

**How to avoid:** Add `nitro` to dependencies and `nitro()` to the Vite plugins array (after `tanstackStart()`). [CITED: vercel.com/docs/frameworks/full-stack/tanstack-start]

**Warning signs:** Vercel builds but SSR routes return 404 or errors; framework not detected in Vercel dashboard.

### Pitfall 4: `npm run validate` Requires Content Already Built by content-collections

**What goes wrong:** CI script runs `validate-content.ts` before the build, but `content-collections` hasn't generated `.content-collections/generated/index.ts` yet, so `import { allNodes } from "content-collections"` fails.

**Why it happens:** content-collections generates types at build time (during `vite build` or `vite dev`). The types don't exist until the build runs.

**How to avoid:** In the CI script, trigger content generation separately, OR import and process raw MDX files directly using `@content-collections/core`'s runtime API, OR run `vite build` first and then validate the output. Best practice: run `npm run build` which generates types AND validates — the separate validate script is for supplemental cross-document checks that content-collections can't do.

**Revised CI approach:** Run the content generation step explicitly before the validate script:
```yaml
- run: npm run build:content  # new script: "tsx node_modules/@content-collections/cli/src/index.ts"
- run: npx tsx scripts/validate-content.ts
- run: npm run build
```
Or: make the validate script call the content-collections builder programmatically.

**Warning signs:** `Cannot find module 'content-collections'` error in CI; works locally because dev server generates types.

### Pitfall 5: SPDX Header Needs to Be the First Line

**What goes wrong:** The SPDX header is placed after imports or inside a comment block.

**Why it happens:** Developers add it later or after other content.

**How to avoid:** `// SPDX-License-Identifier: GPL-3.0-or-later` must be line 1 of every source file. Enforce with ESLint rule or pre-commit hook.

### Pitfall 6: Drizzle-kit Version Drift (Phase 4 Preview)

**What goes wrong:** Phase 4 installs `drizzle-kit@0.31.10` (current) against a project configured for `0.25.x`. Migration config format and CLI commands changed.

**Why it happens:** Drizzle-kit had significant CLI and config changes between 0.25 and 0.31.

**How to avoid:** Pin `drizzle-kit` to the exact version researched and tested before Phase 4 begins. Review the changelog from 0.25.x to current before pinning.

---

## Code Examples

### Zod v4 — Enum and Object Definition
```typescript
// Source: zod.dev/api [CITED: zod.dev/api]
const NodeTypeSchema = z.enum(["MECHANIC", "CONCEPTUAL"]);
type NodeType = z.infer<typeof NodeTypeSchema>; // "MECHANIC" | "CONCEPTUAL"

// Object with extend — use safeExtend if schema has refinements
const BaseSchema = z.object({ id: z.string(), patchId: z.enum(PATCH_IDS) });
const ExtendedSchema = BaseSchema.extend({ title: z.string() }); // OK (no refinements)
```

### Zod v4 — Custom Refinement (New Syntax)
```typescript
// Source: zod.dev/v4 [CITED: zod.dev/v4]
// v4: use error param (not message)
const dateString = z.string().refine(
  (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
  { error: "Must be a YYYY-MM-DD date" }
);

// v4: use .check() for complex multi-issue scenarios (replaces superRefine)
const citationSchema = z.object({
  source: z.string(),
  applicationNote: z.string(),
}).check((ctx) => {
  if (ctx.value.applicationNote.length < 10) {
    ctx.issues.push({
      code: "custom",
      message: "applicationNote must be at least 10 characters",
      path: ["applicationNote"],
    });
  }
});
```

### Zod v4 — Pretty Error Output for CI
```typescript
// Source: zod.dev/v4 [CITED: zod.dev/v4]
import { z } from "zod";

const result = NodeFrontmatterSchema.safeParse(rawData);
if (!result.success) {
  console.error(z.prettifyError(result.error));
  // Outputs human-readable multi-line error: field paths + messages
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `contentlayer` for content pipeline | `@content-collections/core` | ~2024 (contentlayer abandoned) | content-collections is the active successor; must not use contentlayer |
| `@content-collections/vinxi` adapter | `@content-collections/vite` adapter | TanStack Start v1.121.0 (late 2024) | Use vite adapter; vinxi is deprecated |
| `reactflow` package | `@xyflow/react` v12 | 2024 rename | Phase 2 concern; `reactflow` package is old name |
| `framer-motion` | `motion` (import from `motion/react`) | 2024 rename | Phase 2 concern |
| Zod v3 `.superRefine()` | Zod v4 `.check()` | 2025 (Zod v4 release) | Use `.check()` for new code; `superRefine` deprecated |
| Zod v3 `z.string().email()` | Zod v4 `z.email()` (top-level) | 2025 (Zod v4 release) | String format methods are now top-level functions |
| `@tanstack/start` package name | `@tanstack/react-start` | TanStack Start v1 (2025) | Old package name must not be used |
| Verbose FSF copyright headers | SPDX-License-Identifier one-liner | 2016+ (SPDX standard) | Modern OSS convention; editors/tools understand SPDX IDs |

**Deprecated/outdated:**
- `contentlayer`: unmaintained since ~2024 — do not use
- `@content-collections/vinxi`: deprecated, replaced by `@content-collections/vite` for TanStack Start v1.121.0+
- `z.nativeEnum()`: deprecated in Zod v4 — use `z.enum()`
- `z.superRefine()`: deprecated in Zod v4 — use `.check()`
- `@tanstack/start`: old package name — use `@tanstack/react-start`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | contentCollections() must be first in the Vite plugins array | Architecture Patterns (Pattern 5) | Build fails silently or types not generated before other plugins need them |
| A2 | `@content-collections/mdx` uses the same monorepo as `@content-collections/core` (sdorra/content-collections) despite npm showing no repository URL | Package Legitimacy Audit | Package legitimacy concern — verify repo URL on published package |
| A3 | `tsx` or `ts-node` is sufficient to run the CI validate script without a separate compile step | Architecture Patterns (Pattern 6) | CI validate step errors with transpile failure; alternative is to compile scripts first |
| A4 | DAG cycle detection can import from `content-collections` generated module in the CI script | Pattern 6 (CI script) | Module not found error if content not generated before script runs — see Pitfall 4 |
| A5 | GPL-3.0-or-later is compatible with wc3v's GPL-3.0 license | GPL licensing section | Legal incompatibility if wc3v is GPL-3.0-only and the project uses GPL-3.0-or-later — needs verification |
| A6 | `nitro` npm package is the correct package for the Vercel Nitro plugin | Architecture Patterns (Pattern 5) | Different package name; deploy may not work |
| A7 | Difficulty enum labels: beginner / intermediate / advanced | Pattern 3 (NodeFrontmatterSchema) | Labels do not match UX team expectations (Claude's discretion — see CONTEXT.md) |

---

## Open Questions

1. **content-collections build-before-validate ordering**
   - What we know: content-collections generates types at build time; CI validate script imports from generated module
   - What's unclear: Does `npm run build` trigger content-collections generation before the validate script runs, or must there be an explicit pre-step?
   - Recommendation: Add a `build:content` npm script that runs content-collections generation only; call it before the validate script in CI.

2. **wc3v GPL-3.0 compatibility: -only vs -or-later**
   - What we know: wc3v uses GPL-3.0 (without -only or -or-later suffix — ambiguous)
   - What's unclear: Whether wc3v's GPL-3.0 allows sublicensing under GPL-3.0-or-later, or if the project must use GPL-3.0-only to match
   - Recommendation: Use GPL-3.0-only for maximum compatibility until wc3v license is confirmed. This is a human decision.

3. **content-collections version `0.15.2` was published 2026-06-16 (12 days ago)**
   - What we know: Package exists, 94k DL/wk, public repo
   - What's unclear: Whether the 2026-06-16 publish is a routine patch or a breaking change
   - Recommendation: Pin at `0.15.2` exactly; read the changelog before any upgrade.

4. **Nitro package version to pin**
   - What we know: `nitro@3.x` is current (3.0.260610-beta per npm) — it's a beta
   - What's unclear: Whether the beta designation means it's stable for production or genuinely experimental
   - Recommendation: Test the build and deploy with the current version; if stable, pin the resolved version in package-lock.json.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TanStack Start, all tools | Yes | v24.10.0 | — |
| npm | Package management | Yes | 11.6.1 | — |
| git | Version control | Yes | 2.54.0 | — |
| Vercel CLI | Vercel deploy from CLI (optional) | Yes | 54.1.0 | Use Vercel GitHub App (recommended over CLI) |
| TypeScript | All TS compilation | Yes (via npm) | 5.x (installed by scaffold) | — |
| tsx | CI validate script runner | Via npm (not pre-installed) | latest | ts-node; or compile scripts first with tsc |

**Missing dependencies with no fallback:** None — all required tools are present.

**Missing dependencies with fallback:** `tsx` — not globally installed but installed via `npm install -D tsx` as a dev dependency. No blocker.

**Project state:** Greenfield — only `index.html` (design mockup, not production code) and `skills-lock.json` exist. No `package.json`, `src/`, or `LICENSE` yet.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (TanStack Start scaffold includes or is compatible with Vitest) [ASSUMED] |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `NodeFrontmatterSchema` accepts "MECHANIC" and "CONCEPTUAL", rejects other strings | unit | `npx vitest run src/schemas/node.test.ts` | No — Wave 0 |
| DATA-02 | `NodeSummarySchema` contains only graph-display fields; full schema has additional fields | unit | `npx vitest run src/schemas/node.test.ts` | No — Wave 0 |
| DATA-03 | Schema rejects nodes missing `patch_context`, `last_reviewed`, or `meta_volatile` | unit | `npx vitest run src/schemas/node.test.ts` | No — Wave 0 |
| DATA-04 | All three schemas (node, threshold, progress) have `patchId` field; invalid patchId rejected | unit | `npx vitest run src/schemas/*.test.ts` | No — Wave 0 |
| DATA-05 | Schema accepts empty `prerequisites` array; accepts valid id strings | unit | `npx vitest run src/schemas/node.test.ts` | No — Wave 0 |
| DATA-04 (registry) | Patch registry exports `CURRENT_PATCH` pointing to last entry; `getPatch()` throws on unknown id | unit | `npx vitest run src/lib/patches.test.ts` | No — Wave 0 |
| DATA-07 (cycle) | `detectCycles()` returns errors for cyclic graphs; returns empty for acyclic graphs | unit | `npx vitest run scripts/lib/detectCycles.test.ts` | No — Wave 0 |
| DATA-07 (prereq resolve) | Validate script exits 1 when a node references a non-existent prerequisite id | integration | `npx tsx scripts/validate-content.ts` (with fixture) | No — Wave 0 |
| OSS-01 | LICENSE file exists and contains "GNU GENERAL PUBLIC LICENSE" | smoke | `ls LICENSE && grep -q "GNU GENERAL PUBLIC LICENSE" LICENSE` | No — Wave 0 |
| D-12 | App builds successfully with `npm run build` | integration | `npm run build` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (unit tests, < 5 seconds)
- **Per wave merge:** `npx vitest run && npm run build` (full unit suite + build)
- **Phase gate:** Full suite green + `npm run validate` passes + live Vercel deploy confirmed before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/schemas/node.test.ts` — covers DATA-01, DATA-02, DATA-03, DATA-05
- [ ] `src/schemas/mastery.test.ts` — covers DATA-04 (threshold schema)
- [ ] `src/schemas/progress.test.ts` — covers DATA-04 (progress schema)
- [ ] `src/lib/patches.test.ts` — covers patch registry (CURRENT_PATCH, getPatch, PATCH_IDS)
- [ ] `scripts/lib/detectCycles.test.ts` — covers DATA-07 (acyclicity)
- [ ] `vitest.config.ts` — test framework config
- [ ] Framework install: `npm install -D vitest` — if scaffold doesn't include it

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No — Phase 1 has no auth | N/A (Phase 4) |
| V3 Session Management | No — Phase 1 has no sessions | N/A (Phase 4) |
| V4 Access Control | No — Phase 1 is schema + scaffold only | N/A (Phase 4) |
| V5 Input Validation | Yes — content schema validation | Zod v4 (`NodeFrontmatterSchema.safeParse()`) — never trust raw MDX frontmatter without parsing |
| V6 Cryptography | No — no crypto in Phase 1 | N/A |
| V7 Error Handling | Yes — CI errors must not leak internal paths | Use `z.prettifyError()` for user-friendly output; strip stack traces in CI logs |
| V14 Configuration | Yes — dependency pinning | Exact version pinning in package.json; `npm ci` in CI; lockfile committed |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Dependency confusion / supply chain | Tampering | Exact version pinning + `npm ci` + lockfile; verify package legitimacy before install |
| Malformed MDX frontmatter causing parse errors at runtime | Tampering | content-collections validates at BUILD time — runtime never parses raw frontmatter |
| CI secret exposure in build logs | Information Disclosure | No secrets in Phase 1; Vercel tokens stored as GitHub Actions secrets, never logged |
| GPL-3.0 license violation | — | SPDX header on all source files; LICENSE at repo root; no MIT/Apache deps in content path |

**Security note:** Phase 1 has minimal attack surface — it is a content schema + scaffold, not a deployed service with user input. The main security concern is supply-chain (dependency integrity) and license compliance. Both are addressed by the pinning strategy and SPDX headers.

---

## Project Constraints (from CLAUDE.md)

All directives are honored in this research. Key constraints affecting Phase 1 planning:

1. **TanStack ecosystem commitment** — Use `@tanstack/react-start@1.168.x`, `@tanstack/react-router` (bundled), `@tanstack/react-query@5.x`. Do not use alternatives.
2. **content-collections** (not contentlayer) — contentlayer is unmaintained; use `@content-collections/core + vite + mdx`.
3. **Zod v4** — Use `zod@4.x` for all schema definitions. Confirm peer dependency compatibility per package.
4. **Strict TypeScript** — Do not disable strict mode.
5. **Vite 6 ownership** — Do not eject or override Vite config beyond what's documented. TanStack Start owns the Vite config structure.
6. **Vercel deployment** — Default target. Use Nitro plugin for zero-config.
7. **GPL-3.0** — Required by wc3v integration. All source files carry SPDX header.
8. **No paywalls** — Project is free and open source.
9. **Architecture discipline** — Deep modules: schema, patch registry, and validation layer each present a small interface hiding substantial implementation. No shallow pass-through modules.
10. **`@tanstack/eslint-plugin-router`** — Include in ESLint config.
11. **Never commit `.env`** — No secrets in the Phase 1 commit (Vercel tokens live in GitHub Actions Secrets).

---

## Sources

### Primary (MEDIUM confidence — official docs, npm registry)
- [npm registry: @content-collections/core@0.15.2](https://www.npmjs.com/package/@content-collections/core) — version + weekly downloads verified 2026-06-28
- [npm registry: @tanstack/react-start@1.168.26](https://www.npmjs.com/package/@tanstack/react-start) — version confirmed
- [npm registry: zod@4.4.3](https://www.npmjs.com/package/zod) — v4 confirmed
- [Zod v4 release notes](https://zod.dev/v4) — z.enum(), .check(), error param, deprecations
- [Zod v4 API reference](https://zod.dev/api) — z.object(), z.string(), z.array(), .refine()
- [TanStack Start on Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start) — Nitro plugin requirement, zero-config detection confirmed
- [content-collections TanStack Start quickstart](https://www.content-collections.dev/docs/quickstart/tanstack-start) — vite adapter, content-collections.ts location, tsconfig alias
- [TanStack CLI GitHub](https://github.com/TanStack/cli) — scaffold command: `npx @tanstack/cli create my-app`
- [SPDX License Identifier convention](https://spdx.dev/learn/handling-license-info/) — GPL-3.0-or-later SPDX format

### Secondary (MEDIUM confidence — web search verified against official sources)
- [content-collections integration pattern](https://www.content-collections.dev/) — schema function form `schema: (z) => ({})`, transform, gitignore
- [npm dependency pinning guide](https://docs.renovatebot.com/dependency-pinning/) — exact pinning for applications, Renovatebot governance
- [Topological sort / cycle detection](https://www.geeksforgeeks.org/dsa/detect-cycle-in-directed-graph-using-topological-sort/) — DFS 3-color algorithm for DAG validation

### Tertiary (LOW confidence — training knowledge, marked [ASSUMED])
- DAG cycle detection TypeScript implementation — standard algorithm, not library-specific
- GitHub Actions yml structure — standard pattern
- Vitest as test framework for TanStack Start scaffold

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — versions verified against npm registry; integration pattern verified via web search of official docs; one content-collections integration detail (injected z) not confirmed via direct official doc fetch (403 error)
- Architecture: MEDIUM — patterns derived from official doc research + project decisions; exact content-collections+Zod v4 z-injection behavior is ASSUMED and flagged in assumptions log
- Pitfalls: MEDIUM — some pitfalls from observed patterns (vinxi adapter, plugin order); some from general TypeScript/npm knowledge [ASSUMED]
- DAG algorithm: LOW — standard algorithm, not verified in this specific content-collections context

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable ecosystem; content-collections 0.15.2 recent — check for breaking changes within 30 days)
