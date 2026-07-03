# Phase 9: Guided Pathways & Launch - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the **Beginner Fundamentals guided pathway as the default landing view** with **mastery-tied completion progress**, meet the **~25-node content gate** (17 authored today → ~8 more), run a **citation-review audit** that withholds failing nodes from launch, surface **staleness indicators** on meta-volatile nodes whose patch has moved, and add a small **launch-readiness polish** slice. This is the final phase — it makes the app publicly announceable.

**In scope:**
- Mastery-tied pathway **completion progress bar** in the existing `PathwayBanner` (PATH-04).
- **Numbered pathway steps + "next node" cue** + **first-visit intro overlay** so a novice lands on an explicitly ordered pathway, not the raw graph (PATH-01/02/03).
- **Staleness indicator** in the node detail panel + a small marker on the graph node; new `stale` boolean on the graph-display projection (criterion 5).
- **`launch_ready` schema flag** + **CI gate (≥25 launch_ready nodes)** that blocks the launched build; non-ready nodes excluded from the launched graph (CONT-04).
- **Citation-review audit** mechanism + auditable per-node verdict; audit failures flip `launch_ready = false` (CONT-05).
- **Launch polish:** page metadata / OG tags for sharing, a 404/error page, a basic about/privacy page. *(Accepted by user; beyond the 6 mapped requirements — see D-16.)*

**Out of scope (other phases / v2):**
- Additional pathways beyond Beginner Fundamentals (COMM-03, v2).
- Race-specific content / pathways / theming (RACE-\*, v2).
- The actual **writing** of the ~8 new nodes + the upgrade re-review of the existing 17 — done via the **parallel content workstream**, not Phase 9 code tasks (D-11). Phase 9 owns the *mechanism* and the *gate*, and launch is blocked until content lands.
- Gamification of any kind (PROG-05 — the progress bar must not drift into XP/streaks/celebration).

</domain>

<decisions>
## Implementation Decisions

### Pathway progress bar (PATH-04)
- **D-01:** Completion shows as a **slim rune-gold fill bar + "N of 8 mastered"** text, in the existing `PathwayBanner` (which currently shows a static "N of total nodes" count — replace/extend that slot).
- **D-02:** **Mastered-only counts** toward the tally. `in-progress` nodes keep their own gold ring on the canvas (Phase 2 D-05) but do **not** fill the bar. The bar means "skills genuinely mastered."
- **D-03:** **Skill-framed, no fanfare** — no confetti, streaks, XP, or "100%!" celebration (PROG-05). At 8/8 the pathway shows a quiet **"Fundamentals complete"** state, framed as a map of what you know.

### First-time landing UX (PATH-01/03)
- **D-04:** Add **step numbers (1–8)** to the pathway nodes matching the pathway JSON `steps[]` order (already in the loader), so "ordered" (criterion 1) is unambiguous, **plus a subtle highlight on the current "next" node** = the first non-mastered step in order. The pathway reads as a "do this next" guide, not just a highlighted set.
- **D-05:** On **first visit** show a **dismissible intro overlay** ("Start here — 8 fundamentals, click any node to learn") over the pathway, gated by a **localStorage flag** so it appears once. Returning visitors land straight on the spotlighted pathway with the progress bar (0/8 for a brand-new visitor).

### Staleness indicator (criterion 5 — trigger LOCKED)
- **D-06:** Trigger is locked by schema: **`meta_volatile === true && CURRENT_PATCH.id !== node.patchId`** (see `src/schemas/node.ts`, `src/lib/patches.ts`). Only presentation was open.
- **D-07:** In the **detail panel**, show a **subtle "Unreviewed for {patch}" badge/pill near the node title**, carrying a **tooltip** with the full explanation ("Last reviewed for patch X — current patch is Y; this content may be out of date"). The tooltip is required so the terse badge stays legible to novices. Replaces the deferred hook already marked in `NodePanelContent.tsx`.
- **D-08:** Also show a **small staleness marker on the graph node** itself, so users can spot stale nodes without opening each panel.
- **D-09:** To feed D-08, add a **`stale: boolean` to `GraphDisplayNode`** (computed in the index-route loader projection from `patchId` + `meta_volatile` + `CURRENT_PATCH`). This is a **deliberate, accepted widening of the ADR-002 graph/content boundary** — normally staleness would live only in the lazy content query, but the on-canvas marker justifies the extra boundary field. Planner: document this in an ADR / extend ADR-005/006 projection rationale.

### Content gate + citation audit (CONT-04/05)
- **D-10:** Reach 25 via **~8 new race-agnostic fundamentals topics** (breadth) **AND an upgrade re-review pass of the existing 17** so all 25 clear one launch bar (real peer-reviewed citations + concrete "next game" drill + attributed WC3 wisdom).
- **D-11:** The **writing** of those nodes is the **parallel content workstream** (per ROADMAP), not Phase 9 code tasks. Phase 9 delivers the **mechanism** and **enforces the gate**; the gate **blocks launch** until ≥25 launch_ready nodes exist.
- **D-12:** Add a **`launch_ready` boolean to the node schema** (default draft/false or explicit — planner decides default + migration of the existing 17). **Non-`launch_ready` nodes are excluded from the launched graph.** A **CI check asserts ≥25 launch_ready nodes before deploy**. The citation audit is a per-node human pass that flips the flag.
- **D-13:** Keep an **auditable trail** — a recorded per-node audit checklist/verdict + rationale (fits the "trustworthy / no decorative science" core value), alongside the enforced flag.

### Launch polish
- **D-16:** Include a **small launch-readiness slice**: page **metadata / OG tags** for shareable links, a **404/error page**, and a **basic about/privacy page**. **Accepted by the user though it exceeds the 6 mapped requirements (PATH-01..04, CONT-04/05)** — planner should note this as a phase addition; may warrant a one-line REQUIREMENTS/ROADMAP annotation. Keep it minimal; not a full marketing site.

### Claude's Discretion
- **D-14:** Exact visual detail of the progress bar (height, animation of the fill), the step-number glyph style, and the "next node" cue treatment — within ADR-0001 (obsidian + single rune-gold accent). Watch F-01 from Phase 2: rune-gold already carries three jobs (mastered glow, in-progress ring, edge highlight) — the progress bar + next-node cue must not muddy that hierarchy.
- **D-15:** `launch_ready` schema default value + how the existing 17 nodes get the field (migration vs default) — planner's call, consistent with the parallel-schema-sync convention (`node.ts` + `content-collections.ts` mirror) and CI validation established in Phases 1/3/6/7/8.
- Whether staleness computation for the panel reuses the lazy content query while the canvas marker uses the new `stale` projection field, or both derive from one helper — planner's call, but keep a single source-of-truth staleness predicate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 9: Guided Pathways & Launch" — goal + 5 success criteria (the acceptance bar).
- `.planning/REQUIREMENTS.md` — PATH-01 (overlay highlights ordered subset), PATH-02 (Beginner Fundamentals ships), PATH-03 (default landing = pathway, not full graph), PATH-04 (completion progress), CONT-04 (~25-node gate), CONT-05 (citations real + correctly applied). Also PROG-05 (no gamification) — binding constraint on the progress bar.
- `.planning/PROJECT.md` — product definition, core value ("content actually makes people better… trustworthy"), extensibility + design-bar constraints.

### Design system (authoritative — this is a UI phase)
- `docs/adr/0001-visual-design-direction.md` — LOCKED: obsidian surfaces, single rune-gold accent, faction colors as semantic encoding only, Space Grotesk / Outfit / JetBrains Mono.
- `src/styles/app.css` — canonical design tokens (`--color-obsidian-*`, `--color-rune-*`, fonts).
- Phase-2 memory memory: `[[design-direction]]` — Direction 0 "Modern" (obsidian + gold + grotesk) chosen.

### Pathway infrastructure (extend this phase — built in Phase 2)
- `.planning/phases/02-graph-engine/02-CONTEXT.md` — D-08/D-09 (spotlight + fit-view, criterion-3 interpretation), D-10 (standalone Zod pathway file), F-01 (rune-gold three-jobs hierarchy warning).
- `pathways/beginner-fundamentals.json` — the 8-step pathway data (steps order drives numbering D-04).
- `src/schemas/pathway.ts` — `PathwaySchema`; comment already says "Phase 9 extends this schema with progress tracking and content fields."
- `scripts/validate-pathway.ts` — CI referential-integrity check pattern to mirror for the launch_ready CI gate.
- `src/components/graph/PathwayBanner.tsx` — the progress-bar home (currently a static count).
- `src/components/graph/RoadmapGraph.tsx` — renders `PathwayBanner`, owns spotlight + explore toggle state.
- `src/routes/index.tsx` — the landing route + loader projection (where D-09 `stale` computation + D-05 intro overlay wire in).

### Data contract & staleness
- `src/schemas/node.ts` — `meta_volatile`, `last_reviewed`, `patch_context`, `patchId` (staleness inputs, D-06); `NodeSummarySchema`/`NodeFrontmatterSchema` (add `launch_ready` here, D-12); parallel-schema-sync rule with `content-collections.ts`.
- `src/schemas/graph.ts` — `GraphDisplayNodeSchema` (add `stale` boolean, D-09).
- `src/lib/patches.ts` — `CURRENT_PATCH` (staleness comparison).
- `src/components/graph/NodePanelContent.tsx` — has the deferred staleness hook (lines ~24/36/227); D-07 lands here.
- `docs/adr/002-content-graph-decoupling.md` + ADR-005/006 (graph projection boundary) — D-09 knowingly widens this; document the rationale.

### Progress data (Phase 5 — feeds the bar)
- `src/lib/graph-store.ts` — `masteryMap: Record<string, MasteryState>` (the completion source, D-01/D-02).
- `src/components/graph/ProgressProvider.tsx` — hydrates masteryMap; wraps the graph in `index.tsx`.
- `.planning/phases/05-progress-tracking/05-CONTEXT.md` — mastery-source + no-gamification decisions (ADR 009).

### Architecture discipline
- `CONTEXT.md` (repo root) — domain language; extend with pathway-progress / staleness / launch_ready terms.
- `.agents/skills/codebase-design/SKILL.md` — deep-module discipline for the progress + staleness modules.
- `.claude/CLAUDE.md` — pinned stack, `motion/react` (not framer-motion), React Flow perf guidance.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PathwayBanner.tsx` — already renders pathway title/subtitle + a "N of total nodes" count; the progress bar (D-01) extends this exact slot. Stateless/props-driven — pass a `masteredCount`.
- `graph-store.ts` `masteryMap` — live mastery per node; count `mastered` entries among `pathway.steps` for the bar (D-02) and to find the "next" node (D-04).
- `pathways/beginner-fundamentals.json` + `PathwaySchema` — ordered steps drive numbering (D-04); schema comment explicitly reserves Phase-9 extension.
- `scripts/validate-pathway.ts` — the CI referential-integrity pattern to clone for the `launch_ready ≥25` gate (D-12).
- `NodePanelContent.tsx` — deferred staleness hook already flagged in-file; D-07 replaces the placeholder.
- Parallel-schema-sync convention (`node.ts` ↔ `content-collections.ts`) established across Phases 1/3/6/7/8 — `launch_ready` follows it.

### Established Patterns
- Zod-validated static data + CI referential-integrity checks (nodes, pathway) — the launch_ready gate is another CI validator in `validate-content.ts` (no new npm script needed, per Phase-2 precedent).
- Loader field-by-field projection to `GraphDisplayNode` (ADR-002 rule) — `stale` is added as one more explicit projected field (D-09), NOT a spread of frontmatter.
- SPDX header on every hand-authored `.ts/.tsx`; Vitest colocated tests.
- `motion/react` for animations (progress-bar fill, next-node cue) — never `framer-motion`.

### Integration Points
- `index.tsx` loader → compute `stale` per node (D-09) + pass pathway; component mounts intro overlay (D-05) inside `ProgressProvider`.
- `RoadmapGraph` → `PathwayBanner` gets mastered-count for the bar (D-01); graph nodes get step number (D-04) + stale marker (D-08).
- `NodeDetailPanel`/`NodePanelContent` → staleness badge + tooltip (D-07).
- `node.ts` schema + `content-collections.ts` → `launch_ready`; `validate-content.ts` → CI gate; launched graph filters non-ready nodes.
- New launch-polish routes/head config for meta/OG + 404 + about/privacy (D-16).

</code_context>

<specifics>
## Specific Ideas

- "The map brightens as you learn" (Phase 2 specific) carries into the progress bar — completion is the graph lighting up, mirrored in a quiet banner bar; deliberately NOT a score.
- Staleness copy should calibrate *trust*, not alarm: honest "unreviewed for patch X" tone, consistent with the "trustworthy, no decorative science" core value.
- The citation audit is as much a product value as a task — an auditable per-node verdict (D-13) is the artifact that makes "no pseudo-intellectual science" (CONT-05) verifiable.

</specifics>

<deferred>
## Deferred Ideas

- **Additional guided pathways** beyond Beginner Fundamentals (e.g. per-race macro tracks) — COMM-03 / RACE-05, v2.
- **Celebratory completion moment** (confetti/toast at 8/8) — explicitly rejected for v1 (PROG-05); revisit only if it can be done without becoming a score.
- **On-canvas staleness for ALL nodes as a filter facet** (filter to "stale nodes") — possible future; Phase 9 only shows the marker, not a filter.
- **Full marketing/landing site** — D-16 keeps launch polish minimal (meta/OG + 404 + about/privacy); a richer marketing surface is a later, separate effort.
- **Race-specific branch content + theming** — RACE-01..05, v2.

None — discussion stayed within phase scope (launch-polish D-16 was an explicit, accepted user addition, captured as a decision rather than deferred).

</deferred>

---

*Phase: 9-Guided Pathways & Launch*
*Context gathered: 2026-07-03*
