# Phase 9: Guided Pathways & Launch - Research

**Researched:** 2026-07-03
**Domain:** Extending an existing React Flow / TanStack Start graph app with a mastery-tied pathway progress UI, a content publishability gate + CI check, patch-staleness UI, and minimal launch polish (404/about/OG). No new runtime dependencies.
**Confidence:** HIGH (nearly everything is grounded in direct inspection of this repo's existing code, schemas, and CI scripts; the only externally-sourced claims — TanStack Router 404 handling and Radix Tooltip touch behavior — are CITED from official/community sources, not ASSUMED)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pathway progress bar (PATH-04)**
- **D-01:** Completion shows as a **slim rune-gold fill bar + "N of 8 mastered"** text, in the existing `PathwayBanner` (which currently shows a static "N of total nodes" count — replace/extend that slot).
- **D-02:** **Mastered-only counts** toward the tally. `in-progress` nodes keep their own gold ring on the canvas (Phase 2 D-05) but do **not** fill the bar. The bar means "skills genuinely mastered."
- **D-03:** **Skill-framed, no fanfare** — no confetti, streaks, XP, or "100%!" celebration (PROG-05). At 8/8 the pathway shows a quiet **"Fundamentals complete"** state, framed as a map of what you know.

**First-time landing UX (PATH-01/03)**
- **D-04:** Add **step numbers (1–8)** to the pathway nodes matching the pathway JSON `steps[]` order (already in the loader), so "ordered" (criterion 1) is unambiguous, **plus a subtle highlight on the current "next" node** = the first non-mastered step in order. The pathway reads as a "do this next" guide, not just a highlighted set.
- **D-05:** On **first visit** show a **dismissible intro overlay** ("Start here — 8 fundamentals, click any node to learn") over the pathway, gated by a **localStorage flag** so it appears once. Returning visitors land straight on the spotlighted pathway with the progress bar (0/8 for a brand-new visitor).

**Staleness indicator (criterion 5 — trigger LOCKED)**
- **D-06:** Trigger is locked by schema: **`meta_volatile === true && CURRENT_PATCH.id !== node.patchId`** (see `src/schemas/node.ts`, `src/lib/patches.ts`). Only presentation was open.
- **D-07:** In the **detail panel**, show a **subtle "Unreviewed for {patch}" badge/pill near the node title**, carrying a **tooltip** with the full explanation ("Last reviewed for patch X — current patch is Y; this content may be out of date"). The tooltip is required so the terse badge stays legible to novices. Replaces the deferred hook already marked in `NodePanelContent.tsx`.
- **D-08:** Also show a **small staleness marker on the graph node** itself, so users can spot stale nodes without opening each panel.
- **D-09:** To feed D-08, add a **`stale: boolean` to `GraphDisplayNode`** (computed in the index-route loader projection from `patchId` + `meta_volatile` + `CURRENT_PATCH`). This is a **deliberate, accepted widening of the ADR-002 graph/content boundary** — normally staleness would live only in the lazy content query, but the on-canvas marker justifies the extra boundary field. Planner: document this in an ADR / extend ADR-005/006 projection rationale.

**Content gate + citation audit (CONT-04/05)**
- **D-10:** Reach 25 via **~8 new race-agnostic fundamentals topics** (breadth) **AND an upgrade re-review pass of the existing 17** so all 25 clear one launch bar (real peer-reviewed citations + concrete "next game" drill + attributed WC3 wisdom).
- **D-11:** The **writing** of those nodes is the **parallel content workstream** (per ROADMAP), not Phase 9 code tasks. Phase 9 delivers the **mechanism** and **enforces the gate**; the gate **blocks launch** until ≥25 launch_ready nodes exist.
- **D-12:** Add a **`launch_ready` boolean to the node schema** (default draft/false or explicit — planner decides default + migration of the existing 17). **Non-`launch_ready` nodes are excluded from the launched graph.** A **CI check asserts ≥25 launch_ready nodes before deploy**. The citation audit is a per-node human pass that flips the flag.
- **D-13:** Keep an **auditable trail** — a recorded per-node audit checklist/verdict + rationale (fits the "trustworthy / no decorative science" core value), alongside the enforced flag.

**Launch polish**
- **D-16:** Include a **small launch-readiness slice**: page **metadata / OG tags** for shareable links, a **404/error page**, and a **basic about/privacy page**. **Accepted by the user though it exceeds the 6 mapped requirements (PATH-01..04, CONT-04/05)** — planner should note this as a phase addition; may warrant a one-line REQUIREMENTS/ROADMAP annotation. Keep it minimal; not a full marketing site.

### Claude's Discretion
- **D-14:** Exact visual detail of the progress bar (height, animation of the fill), the step-number glyph style, and the "next node" cue treatment — within ADR-0001 (obsidian + single rune-gold accent). Watch F-01 from Phase 2: rune-gold already carries three jobs (mastered glow, in-progress ring, edge highlight) — the progress bar + next-node cue must not muddy that hierarchy.
- **D-15:** `launch_ready` schema default value + how the existing 17 nodes get the field (migration vs default) — planner's call, consistent with the parallel-schema-sync convention (`node.ts` + `content-collections.ts` mirror) and CI validation established in Phases 1/3/6/7/8.
- Whether staleness computation for the panel reuses the lazy content query while the canvas marker uses the new `stale` projection field, or both derive from one helper — planner's call, but keep a single source-of-truth staleness predicate.

### Deferred Ideas (OUT OF SCOPE)
- **Additional guided pathways** beyond Beginner Fundamentals (e.g. per-race macro tracks) — COMM-03 / RACE-05, v2.
- **Celebratory completion moment** (confetti/toast at 8/8) — explicitly rejected for v1 (PROG-05); revisit only if it can be done without becoming a score.
- **On-canvas staleness for ALL nodes as a filter facet** (filter to "stale nodes") — possible future; Phase 9 only shows the marker, not a filter.
- **Full marketing/landing site** — D-16 keeps launch polish minimal (meta/OG + 404 + about/privacy); a richer marketing surface is a later, separate effort.
- **Race-specific branch content + theming** — RACE-01..05, v2.

None — discussion stayed within phase scope (launch-polish D-16 was an explicit, accepted user addition, captured as a decision rather than deferred).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PATH-01 | Guided Pathways overlay highlights an ordered subset of nodes on the graph | Pathway infrastructure (spotlight/dim, `pathway.steps` order) already exists from Phase 2; this phase adds step-number badges (Pattern 1, `computePathwayProgress`) making the order explicit — see Architecture Patterns Pattern 1, Code Examples |
| PATH-02 | At least one "Beginner Fundamentals" pathway ships at launch | Pathway data file already authored (`pathways/beginner-fundamentals.json`, 8 steps) from Phase 2 — Phase 9's job is the content gate (CONT-04) that must include all 8 steps as `launch_ready` (see Pitfall 5, Pattern 3) |
| PATH-03 | Default landing view is a guided pathway, not the full graph | Already the default behavior from Phase 2 (`RoadmapGraph` spotlight mode, `initialExploring` defaults false); Phase 9 adds the first-visit intro overlay reinforcing this (Pitfall 3, Anti-Patterns) |
| PATH-04 | Pathway shows completion progress as the user masters its nodes | Core new mechanism this phase — `computePathwayProgress` pure function over the existing `masteryMap` (Pattern 1); wired into `PathwayBanner` (Pitfall 6 covers removing the now-dead `totalNodes` prop) |
| CONT-04 | Race-agnostic fundamentals core authored to ~25-node minimum publishable gate | `launch_ready` schema field + `validateLaunchGate` CI validator (Pattern 3); current corpus is 17 nodes [VERIFIED: `content/nodes/` listing], confirming the "~8 more" gap from CONTEXT.md D-10; the actual node authoring is the parallel content workstream (D-11), not a Phase 9 code task |
| CONT-05 | Citations are real and correctly applied (review pass guards against pseudo-intellectual/misapplied science) | Modeled as a human audit process gated by the `launch_ready` flag + an `auditNote`/verdict field (see Open Questions #1, Assumptions A2) — not an automatable check; Phase 9 delivers the enforcement mechanism (the flag + CI count gate), not the audit itself |

</phase_requirements>

## Summary

Phase 9 is almost entirely an **extension exercise**, not new-technology research. Every piece of required infrastructure already exists and is explicitly reserved for this phase: `PathwaySchema` (`src/schemas/pathway.ts`) says "Phase 9 extends this schema"; `NodePanelContent.tsx` has a documented deferred staleness hook; `PathwayBanner.tsx` has the exact slot to replace; `validate-pathway.ts` is the CI-validator pattern to clone for the launch-gate check; and the content/graph projection boundary (ADR 002/005/006) already has a documented process for widening it (which D-09 explicitly invokes).

The real risk in this phase is **silent breakage at the seams between systems that were each built independently and correctly**: the staleness copy references a `CURRENT_PATCH.label` field that does not exist on `PatchEntry`; Radix `Tooltip` requires a `TooltipProvider` that is not mounted anywhere in the app yet (first use of Tooltip in the whole codebase); the intro-overlay's `localStorage` read is an SSR-hydration hazard if done naively; and the pathway's 8 step nodes could silently disappear from the launched graph if the `launch_ready` CI gate isn't cross-checked against pathway membership. None of these are exotic — each has a concrete, in-repo precedent to follow.

**Primary recommendation:** Do not introduce any new npm package this phase. Extend existing schemas/components in place, reuse the `validate-pathway.ts` → `validate-content.ts` CI-validator wiring pattern for the `launch_ready` gate, reuse the `typeof window === "undefined"` SSR-guard convention from `local-progress.ts` for the intro overlay, and add one net-new pure-function module (`src/lib/pathway-progress.ts`, staleness predicate) following the existing deep-module + colocated-Vitest-test convention.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pathway completion progress bar | Browser / Client (React component) | — | Pure derivation from existing `graph-store.ts` `masteryMap`; no new data source, no server round-trip |
| Pathway step numbers + "Next" cue | Browser / Client | — | Derived client-side from `pathway.steps` order + `masteryMap`; matches how `masteryState`/`sourceMap` are already merged into React Flow node `data` in `RoadmapGraph`'s `displayNodes` memo |
| First-visit intro overlay | Browser / Client | — | `localStorage`-gated, client-only by definition; must not run during SSR (see Pitfalls) |
| Staleness indicator (panel + graph marker) | Browser / Client (panel) + Build/Loader (graph marker projection) | — | Panel: derived directly from the already-fetched `NodeFrontmatter` (via `nodeContentQueryOptions`). Graph marker: computed in the **route loader** (build/request time) into the `GraphDisplayNode.stale` field, per D-09's deliberate ADR-002 boundary widening |
| `launch_ready` schema flag | Content Data Model (Zod schema + content-collections mirror) | CI / Build | Same "parallel-schema-sync" pattern as every other node field (citations, quiz, autoDetect, replayCriteria) |
| Launch content gate (≥25 nodes) | CI / Build | — | A pure validator function wired into `scripts/validate-content.ts`, mirroring `validatePathwayStepIds` — fails `npm run validate`, which fails CI, which blocks deploy |
| Citation-review audit trail | Content Data Model (frontmatter field) + Human process | — | Not a runtime UI feature (confirmed out-of-visual-scope in UI-SPEC) — a recorded verdict/rationale field on each node's frontmatter, checked manually, enforced only via the `launch_ready` flag it flips |
| 404 / About / OG meta | Frontend Server (SSR route + `head()`) | Browser / Client | TanStack Router's `notFoundComponent`/`head()` render server-side on first load, hydrate client-side; no new data layer needed |

## Standard Stack

### Core (already installed — no version changes needed this phase)

| Library | Version (installed) | Purpose | Why Standard (for this phase) |
|---------|------|---------|--------------|
| `@tanstack/react-router` | 1.170.16 [VERIFIED: package.json] | `notFoundComponent`, per-route `head()` for OG tags | Already the app's router; TanStack's own docs recommend attaching `notFoundComponent` to the root route for global 404s [CITED: tanstack.com/router docs] |
| `@xyflow/react` | 12.11.1 [VERIFIED: package.json] | Graph canvas — step badges / "Next" cue / staleness marker render as node-face overlays inside the existing `GraphNode` component | No new API surface needed; overlays are plain absolutely-positioned children, same technique already used for the faction-tint bar |
| `motion` (`motion/react`) | 12.42.0 [VERIFIED: package.json] | Progress-bar fill transition, "Next" cue entrance, "Fundamentals complete" crossfade | Already the app's only animation library (never `framer-motion` — see CLAUDE.md) |
| `zustand` | 5.0.14 [VERIFIED: package.json] | No new store slices strictly required — progress bar/step-number/next-cue all derive from the existing `masteryMap` slice | Reuse, don't add a new store |
| `zod` | 4.4.3 [VERIFIED: package.json] | `launch_ready: z.boolean()` addition to `NodeFrontmatterSchema` + content-collections mirror | Same parallel-schema-sync convention as every prior phase |
| `radix-ui` (`Tooltip`, `Dialog`) via shadcn | installed, `dialog.tsx` + `tooltip.tsx` present in `src/components/ui/` | Intro overlay (`Dialog`), staleness tooltip (`Tooltip`) | Already-vendored shadcn primitives; **`Tooltip` has zero existing call sites in this codebase** — this is its first real use (see Pitfalls) |

### Supporting — none new

No new supporting libraries. `lucide-react` (already a dependency, `1.22.0` [VERIFIED: package.json]) supplies the two new icons this phase needs (`Clock`, `ChevronDown`) — both already exist in the icon set, no version bump required.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `PathwaySchema` in place for progress/content fields | A new separate `PathwayProgress` type/store | Rejected — `pathway.ts`'s own doc comment reserves this exact extension; a parallel type would fragment the "pathway" domain concept CONTEXT.md already defines |
| A pure `src/lib/pathway-progress.ts` helper for masteredCount/nextStepId | Inlining the count logic directly in `PathwayBanner`/`RoadmapGraph` | Rejected — every other cross-cutting predicate in this codebase (mastery ordinal, filter matching, cycle detection) is a colocated pure function with a Vitest test; inlining would break that convention and make the "next step" rule (`D-04`) untestable in isolation |
| Radix `Tooltip` (hover + focus) for the staleness pill | A custom `Popover`-based "toggletip" that opens on click/tap AND hover | Multiple independent GitHub issues (Radix UI, shadcn/ui) confirm plain `Tooltip` does not open on touch/tap by default [CITED: github.com/radix-ui/primitives issues #2589, #1573, #2278; github.com/shadcn-ui/ui issue #3000] — recommend a controlled `open`/`onOpenChange` pattern (see Code Examples) layered on top of the existing `Tooltip` primitive rather than a whole new component |

**Installation:** none — zero new packages this phase.

**Version verification:** All versions above were read directly from this repo's `package.json` [VERIFIED: package.json] — no registry lookups were needed since nothing new is being installed.

## Package Legitimacy Audit

**Not applicable — this phase installs no new external packages.** Every component/library used (shadcn `Dialog`/`Tooltip`/`Button`, `lucide-react` icons, `motion/react`) is already installed and in active use elsewhere in the codebase. The UI-SPEC's own Registry Safety section confirms: "No new shadcn components installed in Phase 9. No third-party registries declared."

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | No new packages — audit not triggered |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────────┐
                     │  Build time (content-collections + CI)       │
                     │                                               │
  content/nodes/*.mdx│  ①  z.object({...launch_ready}) schema check  │
  (+ launch_ready:    ├──────────────►  content-collections build   │
   bool per node)     │                        │                     │
                     │                          ▼                     │
                     │              allNodes (generated module)      │
                     │                          │                     │
                     │            ②  validate-content.ts             │
                     │            ├─ validatePrerequisiteIds         │
                     │            ├─ validatePatchIds                │
                     │            ├─ detectCycles                    │
                     │            ├─ validatePathwayStepIds          │
                     │            └─ validateLaunchGate (NEW)         │
                     │               ├─ count(launch_ready) >= 25?   │
                     │               └─ every pathway step is        │
                     │                  launch_ready? (NEW cross-check)│
                     └───────────────────────┬───────────────────────┘
                                             │ CI fails build if either check fails
                                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Request time (route loader, src/routes/index.tsx)                    │
│                                                                         │
│   allNodes ──► filter(launch_ready===true) ──► project to             │
│                GraphDisplayNode[] (+ NEW `stale` field, D-09)          │
│                        │                                                │
│                        │            pathways/beginner-fundamentals.json│
│                        │                        │                      │
│                        ▼                        ▼                      │
│              RoadmapGraph(nodes, pathway) ◄──────┘                     │
└───────────────────────┬─────────────────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Client render (RoadmapGraph)                                          │
│                                                                         │
│   masteryMap (graph-store, Phase 5) ──► displayNodes useMemo           │
│        │                                    │                          │
│        │  computePathwayProgress(steps,     │  merge into node.data:   │
│        │  masteryMap) → {masteredCount,      │  stepIndex, isNextStep  │
│        │  nextStepId}                        │  (transient — NOT a     │
│        ▼                                     │  schema field)          │
│   PathwayBanner (progress bar, D-01/02/03)   ▼                          │
│                                          GraphNode (step badge,         │
│                                          "Next" cue, stale marker)     │
│                                                                         │
│   click node ──► setSelectedNode ──► NodeDetailPanel ──►               │
│   NodePanelContent ──► nodeContentQueryOptions(nodeId) ──►             │
│   full NodeFrontmatter (meta_volatile, patchId already present) ──►    │
│   isStale(meta_volatile, patchId, CURRENT_PATCH.id) → staleness pill   │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐        ┌───────────────────────────────┐
│ First visit (client-only)   │        │ 404 / About / OG (SSR + client)│
│ localStorage flag check     │        │ __root.tsx notFoundComponent   │
│ (useEffect, not render)     │        │ + per-route head() meta arrays │
│ ──► Dialog intro overlay    │        │ ──► HeadContent + Scripts       │
└─────────────────────────────┘        └───────────────────────────────┘
```

### Recommended Project Structure

No new top-level folders. New/changed files land in existing locations:

```
src/
├── schemas/
│   ├── node.ts              # + launch_ready field (NodeFrontmatterSchema)
│   └── graph.ts             # + stale field (GraphDisplayNodeSchema, D-09 — new ADR required)
├── lib/
│   ├── pathway-progress.ts  # NEW — pure computePathwayProgress(steps, masteryMap)
│   ├── pathway-progress.test.ts
│   ├── staleness.ts         # NEW — pure isStale(metaVolatile, patchId, currentPatchId)
│   ├── staleness.test.ts
│   └── local-progress.ts    # reference convention for the intro-overlay localStorage flag
├── components/
│   ├── graph/
│   │   ├── PathwayBanner.tsx      # extend: progress bar replaces static count line
│   │   ├── GraphNode.tsx          # extend: step badge, "Next" cue, stale marker
│   │   ├── NodePanelContent.tsx   # extend: staleness strip (D-07, replaces deferred hook)
│   │   └── PathwayIntroOverlay.tsx # NEW — shadcn Dialog, client-only localStorage gate
│   └── SiteHeader.tsx / __root.tsx # + <TooltipProvider> ancestor (currently absent app-wide)
├── routes/
│   ├── index.tsx             # loader: filter launch_ready + compute `stale` projection
│   ├── about.tsx              # NEW
│   └── __root.tsx             # + notFoundComponent, + OG head() tags
content-collections.ts          # + launch_ready mirror field
scripts/
├── validate-launch-gate.ts     # NEW — pure fn, mirrors validate-pathway.ts
└── validate-content.ts         # + 5th validator wired in, + pathway/launch_ready cross-check
docs/adr/
└── 013-graph-projection-staleness-widening.md  # NEW — documents D-09's deliberate boundary widening
```

### Pattern 1: Pure derivation function + colocated Vitest test (existing convention, apply to pathway progress)

**What:** Every cross-cutting computation in this codebase (`validatePrerequisiteIds`, `detectCycles`, `computeAncestorEdgeIds`, `detectMasterySignals`, `gradeQuiz`) is a small pure function taking plain data in, returning plain data out — no framework imports, no side effects, unit-tested directly.
**When to use:** For "masteredCount + nextStepId" and for the staleness predicate — both are pure functions of already-available data (`masteryMap`, `pathway.steps`, `meta_volatile`/`patchId`/`CURRENT_PATCH.id`).
**Example:**
```typescript
// src/lib/pathway-progress.ts — mirrors validatePathwayStepIds' shape/testability
import type { MasteryState } from "#/schemas/progress";

export interface PathwayProgress {
  masteredCount: number;
  total: number;
  /** First non-mastered step in order, or null when every step is mastered. */
  nextStepId: string | null;
}

export function computePathwayProgress(
  steps: readonly string[],
  masteryMap: Record<string, MasteryState>
): PathwayProgress {
  let masteredCount = 0;
  let nextStepId: string | null = null;

  for (const id of steps) {
    const state = masteryMap[id] ?? "untouched";
    if (state === "mastered") {
      masteredCount += 1;
    } else if (nextStepId === null) {
      nextStepId = id;
    }
  }

  return { masteredCount, total: steps.length, nextStepId };
}
```
This function is called once in `RoadmapGraph`'s existing `displayNodes` useMemo (same place `masteryState` is already merged into node data) to derive `stepIndex`/`isNextStep` per node, and once in the component that renders `PathwayBanner` to get `masteredCount`/`total`.

### Pattern 2: Loader-time projection for graph-boundary fields (existing ADR-002/005/006 convention)

**What:** Any field the graph canvas needs that lives on `NodeFrontmatter` but not `NodeSummary` crosses the boundary only via an explicit, ADR-documented field on `GraphDisplayNodeSchema`, added by name in the loader's `.safeParse({...})` call — never via spreading the full frontmatter object.
**When to use:** For the `stale` boolean (D-09) — exactly the same mechanism `difficulty` (ADR 005) and `skillType`/`tags` (ADR 006) already used.
**Example:**
```typescript
// src/schemas/graph.ts — extend GraphDisplayNodeSchema (new ADR 013 required per the ADR-005/006 rule)
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
  /** D-09: computed staleness for the on-canvas marker. Deliberate ADR-002
   *  boundary widening — see ADR 013. */
  stale: z.boolean(),
});

// src/routes/index.tsx loader — one more explicit field, not a spread
const nodes: GraphDisplayNode[] = allNodes
  .filter((n) => n.launch_ready === true) // CONT-04/D-12: exclude non-launch_ready
  .map((n) => {
    const result = GraphDisplayNodeSchema.safeParse({
      id: n.id, title: n.title, nodeType: n.nodeType, race: n.race,
      prerequisites: n.prerequisites, difficulty: n.difficulty,
      skillType: n.skillType, tags: n.tags,
      stale: isStale(n.meta_volatile, n.patchId, CURRENT_PATCH.id), // D-06 trigger, D-09 projection
    });
    return result.success ? result.data : null;
  })
  .filter((n): n is GraphDisplayNode => n !== null);
```

### Pattern 3: CI validator wiring (existing convention — clone for the launch gate)

**What:** `scripts/validate-pathway.ts` exports one pure function; `scripts/validate-content.ts` imports it, calls it with plain data, and pushes its returned error strings onto a shared `errors[]` array. No new npm script, no CI workflow edit.
**When to use:** For `validateLaunchGate` (≥25 `launch_ready` nodes) **and** a new cross-check that every `beginner-fundamentals` pathway step is itself `launch_ready` (see Pitfall 5 — this second check is not explicitly named in CONTEXT.md/UI-SPEC but is a direct logical consequence of combining D-12's exclusion rule with the existing pathway).
**Example:**
```typescript
// scripts/validate-launch-gate.ts
export function validateLaunchGate(
  nodes: ReadonlyArray<{ id: string; launch_ready: boolean }>,
  minCount = 25
): string[] {
  const readyCount = nodes.filter((n) => n.launch_ready).length;
  if (readyCount < minCount) {
    return [`Launch gate: only ${readyCount} launch_ready nodes found; need >= ${minCount} (CONT-04)`];
  }
  return [];
}

export function validatePathwayStepsAreLaunchReady(
  pathway: { readonly id: string; readonly steps: readonly string[] },
  nodes: ReadonlyArray<{ id: string; launch_ready: boolean }>
): string[] {
  const readyIds = new Set(nodes.filter((n) => n.launch_ready).map((n) => n.id));
  return pathway.steps
    .filter((stepId) => !readyIds.has(stepId))
    .map((stepId) => `Pathway "${pathway.id}": step "${stepId}" is not launch_ready — cannot ship the pathway with a missing step`);
}
```
Wire both into `validate-content.ts`'s `main()` alongside the existing four validators (5th and 6th checks, same `errors.push(...)` pattern).

### Pattern 4: TanStack Router 404 + OG meta (external, CITED)

**What:** Root-level `notFoundComponent` for the global 404; per-route `head()` returning a `meta` array (with `property: "og:..."` entries, distinct from `name: "..."` entries) for OG/Twitter tags.
**When to use:** D-16 launch polish.
**Example:**
```typescript
// src/routes/__root.tsx — add notFoundComponent to the existing createRootRoute config
export const Route = createRootRoute({
  head: () => ({ /* existing meta/links unchanged, or extended with default OG tags */ }),
  notFoundComponent: NotFoundPage, // CITED: tanstack.com/router "Not Found Errors" guide
  shellComponent: RootDocument,
});

// src/routes/about.tsx — per-route OG override, same head() shape already used at root
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — WC3 Learning Roadmap" },
      { property: "og:title", content: "About — WC3 Learning Roadmap" }, // CITED
      { property: "og:description", content: "..." },
    ],
  }),
  component: AboutPage,
});
```
Source: TanStack Router "Not Found Errors" guide and "Document Head Management" guide [CITED: tanstack.com/router docs — fetched via web search summary, direct page fetch returned HTTP 403].

### Anti-Patterns to Avoid

- **Spreading full `NodeFrontmatter` into the graph loader projection to get `meta_volatile`/`patchId` for the `stale` field:** violates ADR 002/005/006 — compute `stale` as a single boolean in the loader and project only that boolean, exactly as `difficulty` was added, not the source fields.
- **Adding `stepIndex`/`isNextStep` to `GraphDisplayNodeSchema`:** these are pathway-derived, not content-derived — they must be computed client-side in `RoadmapGraph`'s `displayNodes` memo (same place `masteryState` is merged in) and passed via React Flow node `data`, never added to the Zod schema. Only `stale` needs the schema/ADR treatment because D-09 explicitly requires it to survive as typed data outside the pathway calculation.
- **Reading `localStorage` synchronously in a component's render body or `useState` initializer for the intro overlay:** causes an SSR/client hydration mismatch (TanStack Start renders once on the server where `window` is undefined). Follow the `local-progress.ts` `typeof window === "undefined"` guard, and perform the check inside `useEffect` (or wrap the overlay in `<ClientOnly>`, the existing pattern used for `RoadmapGraph` and `NodeDetailPanel`).
- **Using `radix-ui` `Tooltip`'s default hover/focus-only behavior for the staleness pill without a controlled `open` state:** fails the UI-SPEC's own accessibility requirement ("required for touch/mobile where hover doesn't exist") — Radix Tooltip has no built-in tap support (see Pitfalls).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pathway completion counting | A new Zustand store slice or a React Context for "pathway progress" | A pure function (`computePathwayProgress`) reading the *existing* `masteryMap` slice | `masteryMap` is already the single source of truth (Phase 5); a second store would risk drift and duplicate the exact Pitfall 2/3 re-render bugs Phase 5's own RESEARCH already solved |
| Content-corpus-wide CI checks (launch gate, pathway/launch_ready cross-check) | A new validation framework or npm script | The existing `validate-content.ts` orchestrator + one more pure validator function | Four validators already share this exact wiring; a 5th/6th costs one import + one `errors.push()` line, no CI workflow YAML change |
| 404 page routing | A manual catch-all route matching `*` with custom logic | TanStack Router's built-in `notFoundComponent` / `defaultNotFoundComponent` mechanism | It's a first-class router feature, already imported (`createRootRoute`) in this app; a hand-rolled catch-all route reinvents `notFoundMode` semantics TanStack Router already implements |
| Touch-friendly tooltip | A custom hover-detection/touch-detection library | A controlled `<Tooltip open={open} onOpenChange={setOpen}>` wired to `onClick`/focus on the trigger, layered on the existing shadcn `Tooltip` | Radix already exposes controlled open state; the only gap is *triggering* it on tap, which is a one-line `onClick` handler, not a new dependency |

**Key insight:** Every "new" mechanism this phase needs (progress derivation, CI gate, 404 handling, tooltip touch support) has an existing, in-repo or in-framework primitive one layer beneath it. The work is composition, not invention — the risk is in the composition seams (see Pitfalls), not in missing capability.

## Common Pitfalls

### Pitfall 1: `TooltipProvider` is not mounted anywhere in the app yet
**What goes wrong:** The staleness pill's `Tooltip`/`TooltipTrigger`/`TooltipContent` render but never show content, or Radix throws a missing-context error, because no ancestor `<TooltipProvider>` wraps the tree.
**Why it happens:** `grep -r "Tooltip" src --include=*.tsx` (excluding `ui/tooltip.tsx` itself) returns **zero results** [VERIFIED: grep against this repo] — Phase 9 is the first feature to actually use the shadcn `Tooltip` primitive that was installed in Phase 2's tooling bootstrap but never consumed.
**How to avoid:** Add `<TooltipProvider>` once, high in the tree (e.g. wrapping `{children}` in `__root.tsx`, or locally around `NodePanelContent`'s staleness strip if a global provider is undesired) before wiring the tooltip.
**Warning signs:** Tooltip content never appears on hover in manual testing; a Radix "must be used within a Provider" runtime error.

### Pitfall 2: Radix `Tooltip` does not open on touch/tap by default
**What goes wrong:** The UI-SPEC explicitly requires the staleness strip to "also support tap-to-toggle if the planner determines Radix Tooltip doesn't cover touch by default" — it doesn't.
**Why it happens:** Radix's `Tooltip` is a WAI-ARIA hover/focus-triggered pattern; multiple long-standing GitHub issues confirm it does not open on tap on iOS/touch devices out of the box [CITED: github.com/radix-ui/primitives issues #2589, #1573, #2278; github.com/shadcn-ui/ui issue #3000].
**How to avoid:** Use a controlled `Tooltip open={open} onOpenChange={setOpen}` and additionally toggle `open` from an `onClick` handler on the trigger element (the strip itself, already keyboard-focusable per the UI-SPEC's `tabIndex={0}` requirement) — this satisfies both hover (desktop) and tap (touch) without a new dependency.
**Warning signs:** Manual mobile-viewport testing shows the staleness pill is visible but its tooltip never opens on tap.

### Pitfall 3: SSR hydration mismatch on the first-visit intro overlay
**What goes wrong:** If the `Dialog`'s open state is derived synchronously from `localStorage.getItem(...)` during the component's initial render (e.g. `useState(() => localStorage.getItem(...) !== "true")`), the server render (where `window`/`localStorage` don't exist) produces a different result than the client's first paint, causing a hydration warning or a flash of the dialog.
**Why it happens:** TanStack Start SSRs the shell; `localStorage` is a browser-only API. This exact class of bug is why `local-progress.ts` guards every function with `typeof window === "undefined"` and why `RoadmapGraph`/`NodeDetailPanel` are wrapped in `<ClientOnly>` rather than reading browser state directly in a server-rendered component.
**How to avoid:** Either (a) default the dialog closed, and flip it open inside a `useEffect` that runs the `localStorage` check post-mount, or (b) mount the whole overlay inside `<ClientOnly fallback={null}>` (the existing pattern). Prefer (a) for a dialog since it avoids an extra `ClientOnly` boundary and the flash is imperceptible (dialog opening ~one frame after mount is standard UX for "first-visit" modals).
**Warning signs:** React hydration-mismatch console warnings on first load; the dialog flickers open/closed on refresh.

### Pitfall 4: `CURRENT_PATCH.label` does not exist
**What goes wrong:** The UI-SPEC's copywriting contract references `{CURRENT_PATCH.label or .id}` and the panel/tooltip copy uses `{CURRENT_PATCH.id}` directly — but `PatchEntry` (`src/lib/patches.ts`) only has `id`, `order`, `released`, and `objectIdMapVersion` fields [VERIFIED: src/lib/patches.ts read directly]. There is no `label`.
**Why it happens:** The UI-SPEC was authored assuming a friendlier display string might exist; it doesn't yet.
**How to avoid:** Either (a) use `CURRENT_PATCH.id` directly in copy (e.g. "Unreviewed for patch-1.36.2" — functional but slightly clunky with the `patch-` prefix), or (b) add an optional `label?: string` field to `PatchEntry` in `patches.ts` (e.g. `"1.36.2"`) as a small, additive, non-breaking schema change and use it in copy. Recommend (b) — it's a one-line addition to an already-deep module and produces cleaner user-facing copy ("Unreviewed for 1.36.2" vs "Unreviewed for patch-1.36.2").
**Warning signs:** TypeScript compile error the moment someone writes `CURRENT_PATCH.label` against the current `PatchEntry` interface.

### Pitfall 5: A pathway step could silently disappear from the launched graph
**What goes wrong:** D-12 says "non-`launch_ready` nodes are excluded from the launched graph." If one of the 8 `beginner-fundamentals` pathway steps has not cleared its citation audit (`launch_ready: false`) by launch time, the loader filters it out of `nodes`, but `pathways/beginner-fundamentals.json` still lists it in `steps[]` — `RoadmapGraph`'s `fitView({ nodes: pathway.steps.map(id => ({id})) })` and the pathway spotlight dimming logic reference a node ID that no longer exists in `rawNodes`, and the progress bar's denominator (`pathway.steps.length`) would count a step the user can never see or master.
**Why it happens:** The `launch_ready` gate (CONT-04) and the pathway (`PATH-02`, already-authored 8 steps) are two independent mechanisms with no existing cross-check — `validate-pathway.ts` only checks that step IDs resolve to *some* node, not that they resolve to a *launch-ready* node.
**How to avoid:** Add the `validatePathwayStepsAreLaunchReady` cross-check shown in Code Examples/Pattern 3, wired into `validate-content.ts` alongside the launch-gate count check. This makes "the pathway itself is launch-blocked until all 8 of its steps are launch_ready" an explicit, CI-enforced invariant rather than an implicit hope.
**Warning signs:** In manual testing, the pathway banner shows "N of 8" but fewer than 8 nodes are actually visible/fittable on the canvas.

### Pitfall 6: `PathwayBanner`'s existing `totalNodes` prop becomes dead code
**What goes wrong:** `PathwayBannerProps.totalNodes` (today: `rawNodes.length`, the full graph's node count) powers the third line ("{N} of {total} nodes") that D-01 explicitly replaces with the mastered-progress bar. If the planner adds the new bar without removing the old prop/line, `RoadmapGraph` keeps computing and passing `totalNodes={rawNodes.length}` for a prop nothing renders anymore.
**How to avoid:** Remove `totalNodes` from `PathwayBannerProps` and its call site in `RoadmapGraph`, replacing it with `masteredCount`/`total` (from `computePathwayProgress`), rather than adding the new bar as a fourth line alongside three old ones.
**Warning signs:** Dead prop flagged by a linter/unused-var check, or two different "N of M" numbers competing for attention in the same banner (violates the UI-SPEC's "single strongest visual pull" framing).

### Pitfall 7: `vitest.config.ts` still has no `#/` path-alias resolver
**What goes wrong:** New pure modules under `src/lib/` (e.g. `pathway-progress.ts`, `staleness.ts`) that import project types via the `#/` alias (`#/schemas/progress`, `#/lib/patches`) will resolve fine in the Vite app build but may fail or behave inconsistently in Vitest, because `vitest.config.ts` [VERIFIED: read directly, still only `viteReact()` plugin + `environment: "node"`, no `resolve.alias` or `vite-tsconfig-paths`] has no alias resolution configured — this exact gap was already called out in a prior-phase decision log ("graph-layout.ts uses relative `../schemas/graph` import — vitest config lacks alias resolver for `#/` prefix").
**How to avoid:** Either use relative imports (`../schemas/progress`) in new `src/lib/*.ts` pure modules to match the established workaround, or fix the root cause by adding a Vitest alias resolver once (out of scope unless the planner wants to also close this longstanding gap).
**Warning signs:** `vitest run` throws "Cannot find module '#/...'" for a new test file even though `tsc --noEmit` passes.

## Code Examples

### Staleness predicate (single source of truth, reused by loader projection AND panel)
```typescript
// src/lib/staleness.ts
/**
 * D-06 (locked trigger): a node is stale when it's meta_volatile AND its
 * patchId no longer matches the current patch. Single predicate — both the
 * GraphDisplayNode.stale projection (loader) and the panel's inline check
 * (NodePanelContent, reading the already-fetched NodeFrontmatter) call this
 * same function so there is exactly one staleness rule in the codebase.
 */
export function isStale(
  metaVolatile: boolean,
  patchId: string,
  currentPatchId: string
): boolean {
  return metaVolatile && patchId !== currentPatchId;
}
```

### Panel staleness strip (D-07 — replaces the deferred hook in NodePanelContent.tsx)
```tsx
// Inside NodePanelContent, once `node` (NodeFrontmatterWithMDX) has resolved:
import { isStale } from "#/lib/staleness";
import { CURRENT_PATCH } from "#/lib/patches";
import { Clock } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "#/components/ui/tooltip";

{node && isStale(node.meta_volatile, node.patchId, CURRENT_PATCH.id) && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div tabIndex={0} style={{ /* UI-SPEC strip styles */ }}>
        <Clock size={12} aria-hidden="true" />
        <span>{`Unreviewed for ${CURRENT_PATCH.id}`}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      {`Last reviewed for patch ${node.patchId} — current patch is ${CURRENT_PATCH.id}. This content may be out of date.`}
    </TooltipContent>
  </Tooltip>
)}
```
No new query — `node` here already carries `meta_volatile` and `patchId` because `nodeContentQueryOptions` returns the full `NodeFrontmatter` (confirmed by reading `src/lib/node-content-query.ts`), so the panel needs zero new data-fetching.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `PathwayBanner` shows a static "{steps} of {totalNodes} nodes" count (Phase 2) | Mastery-tied "{N} of {total} mastered" progress bar (Phase 9, D-01/D-02) | This phase | The banner's meaning shifts from "how big is this pathway relative to the whole graph" to "how much of the pathway have I actually mastered" — a semantic change, not just a visual one |
| `NodePanelContent` explicitly omits `meta_volatile`/`last_reviewed`/`patch_context` (D-15, Phase 3) | Staleness strip surfaces a derived boolean from those same fields (Phase 9, D-06/D-07) | This phase | Confirms the Phase 3 author's own deferred-hook comment was accurate — no new query needed, only new rendering |
| Route loader projects exactly `NodeSummary + difficulty + skillType + tags` to the graph boundary (ADR 002/005/006) | + `stale: boolean` (D-09) | This phase | First deliberate, ADR-documented widening of the boundary since ADR 006 — sets precedent that the boundary is not frozen, only gated by explicit ADRs |

**Deprecated/outdated:** None — this phase does not remove or replace any prior-phase mechanism except the `PathwayBanner` static count line (superseded, not deprecated-and-kept).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recommendation to add `label?: string` to `PatchEntry` (rather than using `CURRENT_PATCH.id` raw in copy) | Common Pitfalls #4 | Low — either choice is a small, reversible copy/schema decision; flagged here so the planner makes it consciously rather than hitting a compile error mid-task |
| A2 | Recommendation to model the citation-audit trail (D-13) as inline frontmatter fields (e.g. `auditNote: string`) rather than a separate audit-log file/directory | Architectural Responsibility Map, "Citation-review audit trail" row | Medium — if the content workstream prefers a spreadsheet/external tracker instead, the schema-field approach would need to be walked back; this is genuinely undecided in CONTEXT.md (D-13 only says "keep an auditable trail", not its storage shape) |
| A3 | Recommendation that the loader unconditionally filters `launch_ready === false` nodes in *all* environments (including local dev), rather than only in production builds | Pattern 2 / Pitfall 5 | Low-medium — if content authors find it disruptive to lose visibility of in-progress nodes during local dev, the planner may want an env-gated override; D-12's wording ("non-launch_ready nodes are excluded from the launched graph") supports the unconditional reading but doesn't explicitly rule out a dev-only carve-out |
| A4 | TanStack Router `notFoundComponent`/`head()` OG-tag findings, sourced via WebSearch summaries of tanstack.com (direct page fetch returned HTTP 403) | Architecture Patterns, Pattern 4 | Low — cross-checked across two independent searches and consistent with the `head()` pattern already working in this repo's own `__root.tsx`; worth a quick confirmation read of the live docs page during planning if time allows |

## Open Questions

1. **Where does the citation-audit verdict/rationale live?**
   - What we know: D-13 requires "an auditable trail — a recorded per-node audit checklist/verdict + rationale"; the UI-SPEC confirms this has no runtime UI ("not an in-app UI surface in v1").
   - What's unclear: Whether this is a frontmatter field (`auditNote`), a sibling file per node, or a single tracking doc/spreadsheet outside the content pipeline.
   - Recommendation: Default to a frontmatter field (`auditNote: z.string()`, required only when `launch_ready: true`) to preserve the "one .mdx file fully describes one node" invariant (CONTEXT.md Foundational Principle) — confirm with the user/content-workstream owner during plan review since this is genuinely open (see A2).

2. **Should the `launch_ready` filter be environment-gated?**
   - What we know: D-12 locks the *effect* ("non-launch_ready nodes are excluded from the launched graph") and CI blocks deploy on the count gate.
   - What's unclear: Whether "the launched graph" means "the graph in every environment including local dev" or "the graph in the deployed/production build only."
   - Recommendation: Implement unconditional filtering first (simplest, matches the literal wording, zero new env-branching logic) and only add a dev override if content authors report friction during the parallel content workstream (see A3).

3. **Default value + migration path for `launch_ready` on the 17 existing nodes (D-15, explicitly left to planner).**
   - What we know: D-15 explicitly defers this to the planner; the parallel-schema-sync convention (schema + content-collections mirror) is well-established from every prior phase.
   - What's unclear: Whether all 17 existing nodes default to `false` (forcing an explicit re-audit pass per D-10's "upgrade re-review of the existing 17") or `true` (assumed passing until audited).
   - Recommendation: Default `false` with no schema-level default (i.e., require every MDX file to explicitly declare `launch_ready`, failing CI otherwise) — this is the strongest form of "no decorative science slips through," consistent with the core value, and forces the D-10 upgrade-review pass to be visible in the diff of each of the 17 files rather than silent.

## Environment Availability

Skipped — this phase has no new external tool/service/runtime dependencies. All required tooling (Node/npm, Vitest, content-collections, the existing GitHub Actions CI runner) is already installed and verified working by all 8 prior phases' CI runs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` (node environment default; `# vitest-environment jsdom` per-file directive for DOM tests; no `#/` alias resolver — see Pitfall 7) |
| Quick run command | `npx vitest run src/lib/pathway-progress.test.ts src/lib/staleness.test.ts` |
| Full suite command | `npm run test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATH-04 | `computePathwayProgress` counts only `mastered` steps, ignores `in-progress`, finds correct `nextStepId`, returns `null` when all mastered | unit | `npx vitest run src/lib/pathway-progress.test.ts` | ❌ Wave 0 |
| PATH-01/PATH-04 | Staleness predicate is true iff `meta_volatile && patchId !== currentPatchId` (all 4 truth-table combinations) | unit | `npx vitest run src/lib/staleness.test.ts` | ❌ Wave 0 |
| CONT-04 | `validateLaunchGate` fails below 25 `launch_ready` nodes, passes at/above | unit | `npx vitest run scripts/validate-launch-gate.test.ts` | ❌ Wave 0 |
| CONT-04 (cross-check) | `validatePathwayStepsAreLaunchReady` reports every non-launch_ready pathway step | unit | `npx vitest run scripts/validate-launch-gate.test.ts` | ❌ Wave 0 |
| PATH-01/PATH-02/PATH-03 | First-time visitor sees the 8-step pathway spotlighted with step numbers + "Next" cue, not the raw graph | manual (component/visual) | human-verify checkpoint (`human_verify_mode: end-of-phase` per config.json) | manual-only — matches the precedent set by every prior UI-hint phase (2, 3, 4, 5, 6, 7, 8) |
| CONT-05 | Citation audit correctly withholds a failing node from launch | manual (process, not code) | N/A — human review process, enforced structurally only via the `launch_ready` flag + CI count gate | manual-only — this is a human judgment call by design (CONT-05 is about content quality, not a computable property) |

### Sampling Rate
- **Per task commit:** run the specific new/changed pure-function test file(s)
- **Per wave merge:** `npm run test` (full Vitest suite) + `npm run validate` (content CI checks including the new launch gate)
- **Phase gate:** Full suite green + `npm run validate` passing (with ≥25 `launch_ready` nodes, supplied by the parallel content workstream per D-11) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/pathway-progress.ts` + `src/lib/pathway-progress.test.ts` — covers PATH-04
- [ ] `src/lib/staleness.ts` + `src/lib/staleness.test.ts` — covers the D-06 trigger predicate
- [ ] `scripts/validate-launch-gate.ts` + `scripts/validate-launch-gate.test.ts` — covers CONT-04 + the pathway/launch_ready cross-check
- [ ] No new test framework/config install needed — Vitest is already fully wired for colocated `*.test.ts` pure-function tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 9 adds no new auth surface |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | `launch_ready` filtering happens in the loader against static, build-time content — no per-user authorization decision involved |
| V5 Input Validation | Marginal | The intro-overlay `localStorage` flag is read via a `try/catch`-guarded check (same convention as `local-progress.ts`'s `getLocalProgress()`), never trusted for anything beyond "show/hide a dismissible dialog" — a tampered value has zero security impact, only a minor UX one (overlay re-shows or never shows) |
| V6 Cryptography | No | No new cryptographic surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed `localStorage` value for the intro-overlay flag causing a crash | Denial of Service (client-only, low severity) | Wrap the `localStorage.getItem` read in the same `try { ... } catch { return defaultValue }` pattern already used by every function in `local-progress.ts` — never let a malformed/tampered value throw |
| A node marked `launch_ready: true` without ever completing citation audit (silent quality regression, not a security bug but a core-value violation) | Repudiation-adjacent (no audit trail) | The `auditNote`/verdict field (D-13) plus the CI count gate is the only enforcement point — this is a **process** control, not a code control; flag prominently for the content-workstream owner, not just the code reviewer |

No new attacker-reachable surface is introduced by this phase (no new server functions, no new form inputs, no new externally-fetched data). The main "security-shaped" risk is a content-integrity one (shipping a node that failed citation review), which is process-enforced via the schema flag + CI gate, not a traditional ASVS control.

## Sources

### Primary (HIGH confidence — direct repo inspection)
- `src/schemas/node.ts`, `src/schemas/graph.ts`, `src/schemas/pathway.ts` — current schema shapes, parallel-schema-sync convention
- `src/lib/patches.ts`, `src/lib/graph-store.ts`, `src/lib/local-progress.ts`, `src/lib/node-content-query.ts` — existing conventions this phase must extend
- `src/components/graph/PathwayBanner.tsx`, `RoadmapGraph.tsx`, `GraphNode.tsx`, `MasteryBadge.tsx`, `NodePanelContent.tsx` — exact extension points
- `scripts/validate-pathway.ts`, `scripts/validate-content.ts`, `scripts/lib/validators.ts` — CI validator pattern to clone
- `docs/adr/002-content-graph-decoupling.md`, `docs/adr/005-graph-display-node.md` — the boundary-widening rule D-09 invokes
- `.github/workflows/ci.yml`, `package.json`, `vitest.config.ts` — build/test tooling, confirmed no `#/` alias resolver
- `CONTEXT.md`, `.planning/phases/09-guided-pathways-launch/09-CONTEXT.md`, `09-UI-SPEC.md` — locked decisions and design contract
- `content/nodes/*.mdx` directory listing (17 files) — confirms the "17 → 25" gap matches D-10

### Secondary (MEDIUM confidence — WebSearch, cross-checked against official domains)
- TanStack Router "Not Found Errors" guide (tanstack.com/router) — `notFoundComponent`/`defaultNotFoundComponent`/`notFoundMode` [CITED]
- TanStack Router "Document Head Management" guide (tanstack.com/router) — `head()` meta array with `property:` keys for OG tags [CITED]
- Radix UI Primitives GitHub issues #2589, #1573, #2278 and shadcn/ui issue #3000 — Tooltip touch/tap limitation, cross-checked across 4 independent reports [CITED]

### Tertiary (LOW confidence)
- None — every finding above was either verified directly against this repo or cross-checked against an official/community source and marked CITED, not left as unverified ASSUMED training knowledge.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all versions read directly from `package.json`
- Architecture: HIGH — every extension point (schemas, components, CI scripts) was read directly, not inferred
- Pitfalls: HIGH — 5 of 7 pitfalls are verified directly against this repo's source (grep for Tooltip usage, reading `PatchEntry`, reading `vitest.config.ts`); 2 are cross-checked external findings (Radix touch behavior, TanStack Router docs)

**Research date:** 2026-07-03
**Valid until:** 2026-08-02 (30 days — stable, no external API surface, low churn risk; re-verify sooner only if `@tanstack/react-router` or `radix-ui` receive a major version bump before planning executes)
