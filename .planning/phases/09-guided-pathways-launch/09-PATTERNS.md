# Phase 9: Guided Pathways & Launch - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 16 (new + modified)
**Analogs found:** 16 / 16 (all files have an exact or role-match analog in-repo; zero net-new libraries)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/pathway-progress.ts` (NEW) | utility (pure fn) | transform | `scripts/validate-pathway.ts` (`validatePathwayStepIds`) | exact — same "pure fn, plain-data-in/out, colocated test" convention |
| `src/lib/pathway-progress.test.ts` (NEW) | test | transform | any colocated `*.test.ts` next to a `src/lib/*.ts` pure fn | role-match |
| `src/lib/staleness.ts` (NEW) | utility (pure fn) | transform | `src/lib/patches.ts` (`getPatch`) + same pure-fn convention as above | exact |
| `src/lib/staleness.test.ts` (NEW) | test | transform | colocated test convention | role-match |
| `src/schemas/node.ts` (MODIFIED — add `launch_ready`) | model (Zod schema) | CRUD (schema/validation) | itself — extend existing `NodeFrontmatterSchema` fields (`meta_volatile`, `patchId` as precedent) | exact |
| `content-collections.ts` (MODIFIED — mirror `launch_ready`) | config/model (schema mirror) | CRUD | itself — `meta_volatile: z.boolean()` mirror pattern (line 53) | exact |
| `src/schemas/graph.ts` (MODIFIED — add `stale: boolean`) | model (Zod schema, projection) | transform (boundary projection) | itself — `difficulty`/`skillType`/`tags` fields already added under ADR 005/006 | exact |
| `src/routes/index.tsx` (MODIFIED — loader: filter `launch_ready`, compute `stale`, mount intro overlay) | route (loader + component) | request-response (SSR loader) | itself — existing field-by-field `GraphDisplayNodeSchema.safeParse({...})` projection block | exact |
| `src/components/graph/PathwayBanner.tsx` (MODIFIED — replace static count with progress bar) | component (presentational, props-driven) | transform | itself — the exact `{pathway.steps.length} of {totalNodes} nodes` line being replaced | exact |
| `src/components/graph/GraphNode.tsx` (MODIFIED — step badge, "Next" cue, stale marker) | component (React Flow custom node) | transform | itself — existing absolutely-positioned overlay technique (faction-tint bar, difficulty dots, mastery badge) | exact |
| `src/components/graph/NodePanelContent.tsx` (MODIFIED — staleness strip, replaces deferred hook) | component (panel content) | request-response (TanStack Query) | itself — the file's own documented D-15 deferred-hook comment (lines 35-36, 226-227) | exact |
| `src/components/graph/PathwayIntroOverlay.tsx` (NEW) | component (Dialog) | event-driven (client-only, localStorage-gated) | `src/components/auth/RegionSelector.tsx` (existing shadcn `Dialog` consumer) + `src/lib/local-progress.ts` (SSR-guard convention) | role-match (Dialog usage) + exact (SSR-guard pattern) |
| `src/routes/__root.tsx` (MODIFIED — `notFoundComponent`, OG `head()` tags) | route (root config) | request-response (SSR head/meta) | itself — existing `head()` meta array shape | exact |
| `src/routes/about.tsx` (NEW) | route (static page) | request-response | `src/routes/index.tsx` `EmptyState()` (typography/layout conventions: obsidian bg, pathway-heading role, body-prose) | role-match |
| `scripts/validate-launch-gate.ts` (NEW) | utility (CI validator, pure fn) | batch (CI check) | `scripts/validate-pathway.ts` (`validatePathwayStepIds`) | exact — near-identical shape |
| `scripts/validate-content.ts` (MODIFIED — wire in 5th/6th validators) | utility (CI orchestrator) | batch | itself — existing `errors.push(...)` wiring for the 4 current validators | exact |
| `docs/adr/013-graph-projection-staleness-widening.md` (NEW) | config (ADR doc) | — | `docs/adr/005-graph-display-node.md` | exact — same ADR shape/structure to clone |

## Pattern Assignments

### `src/lib/pathway-progress.ts` (utility, transform)

**Analog:** `scripts/validate-pathway.ts`

**Deep-module doc-comment pattern** (lines 1-16):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway referential-integrity validator.
 *
 * Deep module: a single pure function with no side-effects and no dependency
 * on content-collections or the file system. Accepts plain inputs so it is
 * fully unit-testable. Returns a flat string[] of error messages — one per
 * unresolved step ID — so the orchestrator (validate-content.ts) can
 * aggregate them with other validation results.
 */
```
Copy this doc-comment shape (SPDX header, "deep module" framing, explicit input/output contract) for `computePathwayProgress`.

**Core pure-fn pattern** (lines 26-41 — same shape to follow):
```typescript
export function validatePathwayStepIds(
  pathway: { readonly id: string; readonly steps: readonly string[] },
  nodeIds: ReadonlySet<string>
): string[] {
  const errors: string[] = [];
  for (const stepId of pathway.steps) {
    if (!nodeIds.has(stepId)) {
      errors.push(`Pathway "${pathway.id}": step "${stepId}" does not reference an existing node`);
    }
  }
  return errors;
}
```
`computePathwayProgress(steps, masteryMap)` should follow the exact same shape: plain readonly inputs, no framework imports, single return value — per RESEARCH.md's own worked example (already fully specified in 09-RESEARCH.md Pattern 1, lines 232-260 — reuse it verbatim as the implementation, this is not new invention).

**MasteryState import convention:**
```typescript
import type { MasteryState } from "#/schemas/progress";
```
(matches `src/lib/graph-store.ts` line 44 import style — path-alias `#/`, `type` import).

---

### `src/lib/staleness.ts` (utility, transform)

**Analog:** `src/lib/patches.ts` (module doc-comment + fail-fast convention) + the pure-fn shape above.

**Imports/usage precedent** (`src/lib/patches.ts` lines 40-41):
```typescript
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];
```
`PatchEntry` has only `id`, `order`, `released`, `objectIdMapVersion` — **no `label` field** [verified by direct read]. The UI-SPEC copy references `{CURRENT_PATCH.label or .id}` — use `.id` directly (e.g. `patch-1.36.2`) unless the planner decides to add `label?: string` to `PatchEntry` (RESEARCH.md Pitfall 4, A1 — flagged, not decided).

**Predicate shape (D-06 locked trigger — copy directly from RESEARCH.md Code Examples):**
```typescript
export function isStale(
  metaVolatile: boolean,
  patchId: string,
  currentPatchId: string
): boolean {
  return metaVolatile && patchId !== currentPatchId;
}
```
Single source of truth — both the loader projection (`index.tsx`) and the panel (`NodePanelContent.tsx`) call this same function; do not duplicate the boolean expression.

---

### `src/schemas/node.ts` (model, CRUD) — add `launch_ready`

**Analog:** itself, `meta_volatile` field (lines 389-395):
```typescript
/**
 * True if this node's content is likely to become stale when the WC3 patch
 * changes (D-06, DATA-03). Required — CI fails if absent.
 * Volatile nodes trigger a staleness indicator in Phase 9 when
 * CURRENT_PATCH.id !== patchId.
 */
meta_volatile: z.boolean(),
```
Add `launch_ready: z.boolean()` inside `NodeFrontmatterSchema` (line ~351 onward) with the same doc-comment density (cite D-12/D-15/CONT-04 in the comment). Per D-15/RESEARCH Open Question 3: no schema-level `.default()` — require every `.mdx` file to explicitly declare the field so CI fails loudly on omission (matches `patch_context`'s `.min(1)` "required, no default" precedent at lines 379-381).

**Parallel-schema-sync convention (binding, repo-wide rule):**
```typescript
// content-collections.ts, line 53:
meta_volatile: z.boolean(),
// and the doc comment above it (lines 29, 84, 111, 127):
// "mirror NodeFrontmatterSchema in src/schemas/node.ts ... Keep field-for-field identical."
```
`launch_ready` MUST be added to both `src/schemas/node.ts` and `content-collections.ts` in the same commit, with matching comment cross-references, per this established convention (already used for `quiz`, `autoDetect`, `replayCriteria`).

---

### `src/schemas/graph.ts` (model, transform/boundary projection) — add `stale`

**Analog:** itself — `difficulty`/`skillType`/`tags` (ADR 005/006 precedent), lines 42-60:
```typescript
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  skillType: z.enum(["macro", "micro", "mental"]),
  tags: z.array(z.string()),
});
```
Add `stale: z.boolean()` with a doc comment citing D-09 and the new ADR 013, exactly mirroring the file's own header comment convention (lines 11-18, "Current projection fields — each addition required a dedicated ADR"). Update that header list to include `stale — ADR 013`.

**ADR precedent to clone verbatim for ADR 013:** `docs/adr/005-graph-display-node.md` — same Context/Decision/Consequences shape; Context section explains why the field is content-derived but display-necessary, Decision shows the exact schema diff, mirroring:
```markdown
# ADR 005: GraphDisplayNode — Single-Field Projection onto NodeSummary
**Status:** Accepted
## Context
[why the field needs to cross the boundary]
## Decision
[the exact z.extend() diff]
```

---

### `src/routes/index.tsx` (route, request-response loader) — filter `launch_ready`, compute `stale`, mount intro overlay

**Analog:** itself — the existing projection block, lines 50-64:
```typescript
const nodes: GraphDisplayNode[] = allNodes
  .map((n) => {
    const result = GraphDisplayNodeSchema.safeParse({
      id: n.id, title: n.title, nodeType: n.nodeType, race: n.race,
      prerequisites: n.prerequisites, difficulty: n.difficulty,
      skillType: n.skillType, tags: n.tags,
    });
    return result.success ? result.data : null;
  })
  .filter((n): n is GraphDisplayNode => n !== null);
```
Add `.filter((n) => n.launch_ready === true)` **before** `.map(...)` (per RESEARCH.md Pattern 2, D-12/CONT-04), and add `stale: isStale(n.meta_volatile, n.patchId, CURRENT_PATCH.id)` as one more explicit named field inside the `safeParse({...})` object — never spread `n` (ADR 002 rule, reinforced by the file's own header comment lines 8-11).

**ClientOnly / mount pattern for the intro overlay** (line 184-186, existing precedent for client-only mounts):
```typescript
<ClientOnly fallback={null}>
  <NodeDetailPanel />
</ClientOnly>
```
`PathwayIntroOverlay` should follow the Pitfall-3-recommended approach instead (default-closed dialog + `useEffect` localStorage check, per RESEARCH.md) rather than a `ClientOnly` wrapper — but if the planner prefers consistency with this exact existing convention, wrapping in `<ClientOnly fallback={null}>` is the fallback option, same import (`@tanstack/react-router`, already imported at line 26).

---

### `src/components/graph/PathwayBanner.tsx` (component, transform) — progress bar

**Analog:** itself — full file already read; replace the third `<p>` block (lines 110-120):
```tsx
<p style={{ fontSize: "13px", fontWeight: 400, lineHeight: 1.4, margin: 0, opacity: 0.5 }}>
  {pathway.steps.length} of {totalNodes} nodes
</p>
```
with the progress bar (track/fill via `motion/react`, label below) per UI-SPEC §Pathway Completion Progress Bar. **Remove the `totalNodes` prop entirely** from `PathwayBannerProps` (line 33) and its call site in `RoadmapGraph.tsx` — replace with `masteredCount`/`total` from `computePathwayProgress` (RESEARCH.md Pitfall 6 — do not add a 4th line alongside the 3 existing ones).

Existing style conventions to copy verbatim: no hardcoded hex (`var(--color-obsidian-*)`, `var(--color-rune-*)` only, per the file's own header comment line 18), inline `style={{}}` objects (not Tailwind classes) — consistent with every style block in this file.

---

### `src/components/graph/GraphNode.tsx` (component, transform) — step badge + Next cue + stale marker

**Analog:** itself — the existing faction-accent overlay technique, lines ~228-238:
```tsx
{factionTint && (
  <span
    role="img"
    aria-label={`${race} faction`}
    style={{
      position: "absolute",
      insetBlock: 0,
      insetInlineStart: 0,
      width: "3px",
      backgroundColor: factionTint,
    }}
  />
)}
```
And the difficulty-dots aria pattern (lines 131-137, 200-201, 330):
```tsx
const DIFFICULTY_ARIA: Record<GraphDisplayNode["difficulty"], string> = {
  beginner: "Beginner difficulty", ...
};
...
aria-label={difficultyAriaLabel}
```
Clone this exact "absolute-positioned `<span>` overlay + `role="img"` + `aria-label` lookup table" pattern for:
- Step-number badge (top-left corner, `top: -8px; left: -8px`, per UI-SPEC)
- "Next" cue pill (`top: -28px`, centered, entrance-only `motion/react` per UI-SPEC Animation Contract)
- Stale marker (`bottom: 4px; right: 4px`, `Clock` icon, `role="img"`, per UI-SPEC — same slot pattern as the existing difficulty-dots row)

`stepIndex`/`isNextStep` are **transient node `data` fields computed client-side in `RoadmapGraph`'s `displayNodes` memo** — never added to `GraphDisplayNodeSchema` (RESEARCH.md Anti-Patterns — only `stale` gets schema/ADR treatment).

---

### `src/components/graph/NodePanelContent.tsx` (component, request-response) — staleness strip

**Analog:** itself — the file's own documented deferred hook (lines 35-36, 226-227):
```typescript
/**
 * Does NOT surface meta_volatile / last_reviewed / patch_context (D-15;
 * staleness UI is deferred to Phase 9).
 */
...
/**
 * D-15: meta_volatile / last_reviewed / patch_context are intentionally absent
 * — staleness UI is deferred to Phase 9.
 */
```
Both comments must be updated/removed once the staleness strip is added — they are the explicit placeholder this phase fills.

**Data already available — no new query** (confirmed: `useQuery(nodeContentQueryOptions(nodeId))` at line 238 returns the full `NodeFrontmatter`, which already includes `meta_volatile`/`patchId` per `src/schemas/node.ts`). Insert the strip directly after the query resolves, following the existing `useShallow` store-read convention (lines 240-248) for any additional store reads needed.

**Tooltip wiring** — first use of `Tooltip` in the codebase (`grep` returned zero non-definition hits) — **must mount a `<TooltipProvider>` ancestor** (RESEARCH.md Pitfall 1); add it once, high in the tree (`__root.tsx`, wrapping `{children}` alongside the existing `QueryClientProvider`/`SiteHeader` structure at lines 65-75) — do not add a second provider inside `NodePanelContent` itself.

---

### `src/components/graph/PathwayIntroOverlay.tsx` (NEW component, Dialog)

**Analog:** `src/components/auth/RegionSelector.tsx` (existing `Dialog` consumer — read for the exact import/usage shape of `Dialog`/`DialogTitle`/`DialogDescription` from `src/components/ui/dialog.tsx`) + `src/lib/local-progress.ts` for the SSR-guard convention (lines 1-33):
```typescript
/**
 * Client-only — NEVER import this module from server functions or route loaders.
 * Every exported function guards `typeof window === "undefined"` before touching
 * localStorage, so SSR bundles can safely import the type signatures.
 */
...
const PROGRESS_KEY = "wc3rm:progress";
const MERGED_FLAG = "wc3rm:merged";
```
**Key naming convention correction:** this repo's actual localStorage key prefix is **`wc3rm:`** (e.g. `wc3rm:progress`, `wc3rm:merged`), **not** `wc3roadmap:` as the UI-SPEC assumes (line 228-230 of 09-UI-SPEC.md says `wc3roadmap:pathway-intro-seen`). Follow the verified in-repo convention: use `wc3rm:pathway-intro-seen` for consistency with the one existing localStorage-key precedent, and flag this correction to the planner.

Guard shape to copy (lines 46, 65, 78, 93, 104 — every function in `local-progress.ts`):
```typescript
if (typeof window === "undefined") return false; // or return {} / return;
```
Per RESEARCH.md Pitfall 3, default the `Dialog`'s `open` state to `false` and flip it inside a `useEffect` post-mount localStorage check — do not read `localStorage` in `useState(() => ...)` initializer.

---

### `src/routes/__root.tsx` (route, SSR head/meta) — `notFoundComponent` + OG tags

**Analog:** itself — existing `head()` shape, lines 28-48:
```typescript
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WC3 Learning Roadmap" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});
```
Extend the `meta` array with `og:title`/`og:description`/`og:type`/`og:image`/`twitter:card` entries (`property:` key, not `name:`, per RESEARCH.md Pattern 4) and add `notFoundComponent: NotFoundPage` as a sibling config key to `head`/`shellComponent`. `TooltipProvider` should wrap `{children}` inside `RootDocument` (lines 52-80), nested alongside/inside the existing `QueryClientProvider` wrap.

---

### `src/routes/about.tsx` (NEW route, static page)

**Analog:** `src/routes/index.tsx` `EmptyState()` component (lines 82-123) for layout/typography conventions:
```tsx
function EmptyState() {
  return (
    <main style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100dvh", gap: "12px",
      backgroundColor: "var(--color-obsidian-950)", padding: "32px", textAlign: "center",
    }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
        No pathway loaded
      </h1>
      <p style={{ fontSize: "13px", fontWeight: 400, lineHeight: 1.4, opacity: 0.7, margin: 0, maxWidth: "480px" }}>
        ...
      </p>
    </main>
  );
}
```
Same `createFileRoute` + inline-style + CSS-variable convention as `index.tsx`. Add `head()` for the about-page OG override (Pattern 4 above). Also serves as the layout analog for the 404 page (same centered-column shape, per UI-SPEC).

---

### `scripts/validate-launch-gate.ts` (NEW, CI validator)

**Analog:** `scripts/validate-pathway.ts` (full file already read, 42 lines) — clone the doc-comment shape (lines 1-16) and function shape (lines 26-41) verbatim; RESEARCH.md's own worked implementation (Pattern 3, lines 300-321) is the ready-to-use code:
```typescript
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

---

### `scripts/validate-content.ts` (MODIFIED, CI orchestrator)

**Analog:** itself — the existing 4-validator wiring, lines 35-62 (full file already read). Add validator #5 (`validateLaunchGate`) and #6 (`validatePathwayStepsAreLaunchReady`) as two more `errors.push(...)` calls, same shape as the existing pathway check (lines 50-62):
```typescript
const launchGateErrors = validateLaunchGate(allNodes);
errors.push(...launchGateErrors);

const pathwayGateErrors = validatePathwayStepsAreLaunchReady(pathwayResult.data, allNodes);
errors.push(...pathwayGateErrors);
```
No new npm script, no CI workflow YAML edit — matches the file's own header comment convention (update the numbered-list doc comment at the top, lines 8-13, to include validators 5 and 6).

---

### `docs/adr/013-graph-projection-staleness-widening.md` (NEW ADR)

**Analog:** `docs/adr/005-graph-display-node.md` — clone Status/Date/Phase header block, Context/Decision/Consequences section shape verbatim (file confirmed to exist and follow this exact structure).

## Shared Patterns

### SPDX header + doc-comment density (applies to every new/modified `.ts`/`.tsx` file)
**Source:** every existing file in this repo (`src/lib/patches.ts` lines 1-2, `src/schemas/graph.ts` lines 1-2, etc.)
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```
Every hand-authored file opens with this exact two-line header, followed by a `/** ... */` module doc-comment explaining purpose, referencing the relevant decision IDs (D-XX) and requirement IDs (PATH-XX/CONT-XX).

### Parallel-schema-sync (applies to `launch_ready`)
**Source:** `content-collections.ts` (lines 11-13, 84, 111, 127) ↔ `src/schemas/node.ts`
```typescript
// content-collections.ts:
// 1. In content-collections.ts             — content pipeline validation surface.
// 2. In src/schemas/node.ts                 — same Zod, runtime/test surface.
// ...must be mirrored in src/schemas/node.ts (and vice versa).
```
Any new field on `NodeFrontmatterSchema` must appear field-for-field identical in both files in the same commit.

### `#/` path alias (applies to all new `src/lib/*.ts`, `src/schemas/*.ts` imports)
**Source:** `src/lib/graph-store.ts` line 44, `src/routes/index.tsx` lines 28-35
```typescript
import type { MasteryState } from "#/schemas/progress";
import { GraphDisplayNodeSchema } from "#/schemas/graph";
```
**Caveat (RESEARCH.md Pitfall 7, verified):** `vitest.config.ts` has no `#/` alias resolver configured. New colocated test files (`pathway-progress.test.ts`, `staleness.test.ts`) should use **relative imports** (`../schemas/progress`) to match the existing workaround, not the `#/` alias, or Vitest will fail to resolve the module.

### SSR-guard for client-only browser APIs
**Source:** `src/lib/local-progress.ts` (every exported function, e.g. lines 46, 65, 78, 93, 104)
```typescript
if (typeof window === "undefined") return false; // or {} / undefined, matching the fn's return type
```
Apply to `PathwayIntroOverlay`'s localStorage read — inside a `useEffect`, not a render-body/`useState`-initializer read (Pitfall 3).

### CSS-variable-only styling, no hardcoded hex
**Source:** `PathwayBanner.tsx` line 18 comment ("No hardcoded hex — all colors via CSS variables"), consistently applied across `GraphNode.tsx`, `NodePanelContent.tsx`
```tsx
style={{ backgroundColor: "var(--color-obsidian-900)", borderBottom: "1px solid var(--color-obsidian-600)" }}
```
Applies to every new inline style in `PathwayBanner.tsx`, `GraphNode.tsx`, `PathwayIntroOverlay.tsx`, `about.tsx`, `NotFoundPage`.

### `role="img"` + `aria-label` lookup-table pattern for decorative-but-meaningful markers
**Source:** `GraphNode.tsx` lines 131-137 (`DIFFICULTY_ARIA`), 228-238 (faction tint `aria-label`)
```typescript
const DIFFICULTY_ARIA: Record<GraphDisplayNode["difficulty"], string> = {
  beginner: "Beginner difficulty",
  intermediate: "Intermediate difficulty",
  advanced: "Advanced difficulty",
};
```
Apply the same table-lookup + `role="img"` + `aria-label` shape to the stale marker and step-number badge accessibility labels.

## No Analog Found

None. Every planned file has at least a role-match analog in-repo; this phase is a pure extension exercise per RESEARCH.md's own framing ("almost entirely an extension exercise, not new-technology research").

## Metadata

**Analog search scope:** `src/schemas/`, `src/lib/`, `src/components/graph/`, `src/components/auth/`, `src/routes/`, `scripts/`, `docs/adr/`, `content-collections.ts`
**Files read directly:** `PathwayBanner.tsx`, `pathway.ts`, `patches.ts`, `validate-pathway.ts`, `graph.ts`, `validate-content.ts`, `index.tsx`, `__root.tsx`, `NodePanelContent.tsx` (partial), `local-progress.ts` (partial), `node.ts` (partial), `GraphNode.tsx` (partial), `graph-store.ts` (grep), `content-collections.ts` (grep), `docs/adr/005-graph-display-node.md` (partial)
**Pattern extraction date:** 2026-07-03
