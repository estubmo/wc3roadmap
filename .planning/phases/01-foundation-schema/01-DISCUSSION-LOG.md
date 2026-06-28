# Phase 1: Foundation & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 1-Foundation & Schema
**Areas discussed:** Authoring format, Patch primitive, Schema taxonomy, Scaffold scope

---

## Authoring format

| Option | Description | Selected |
|--------|-------------|----------|
| MDX + frontmatter (1 file) | One .mdx per node; typed frontmatter metadata + MDX prose body; content-collections Zod-validates frontmatter | ✓ (Claude's call per delegation) |
| Split: JSON/YAML + MDX | Metadata sidecar + separate prose file joined by id | |
| Pure JSON | Everything incl. content as markdown strings in JSON | |

**User's choice:** "You decide, but we are gonna use you (Claude Code) to search for, review, distill resources so that you can author each section."
**Notes:** Decisive new constraint — **content is AI-authored** via a Claude-Code deep-research pipeline. Claude chose MDX + frontmatter (one file per node) as the best fit for agent generation + machine validation + PR review. Pure-JSON makes prose authoring/diffing painful; split-file doubles coordination when one agent writes both halves.

---

## Patch primitive

| Option | Description | Selected |
|--------|-------------|----------|
| Curated patch registry | Typed, ordered registry of known patches + CURRENT_PATCH; schemas reference patchId, CI validates referential integrity | ✓ |
| Structured SemVer-like value | Comparable numbers, no central registry/metadata | |
| Free-form string | Plain string, not reliably comparable, no typo protection | |

**User's choice:** Curated patch registry
**Notes:** Locked default — registry as a typed module + `CURRENT_PATCH` pointer; staleness derives from registry comparison. Exact field set left to Claude.

---

## Schema taxonomy

**Question A — categorical dimensions first-class day one:**

| Option | Description | Selected |
|--------|-------------|----------|
| skillType (macro/micro/mental) | Skill-domain enum; required by GRAPH-04 filter | ✓ |
| difficulty | Difficulty enum; GRAPH-04 filter + pathway ordering | ✓ |
| race | agnostic + 4 races; v2 extensibility hook + GRAPH-04 filter | ✓ |
| tags (free-form array) | Open-ended thematic tags on top of strict enums | ✓ |

**User's choice:** All four (plus the locked nodeType MECHANIC/CONCEPTUAL)

**Question B — edge placement:**

| Option | Description | Selected |
|--------|-------------|----------|
| On the node (prerequisites[]) | Each node declares soft prerequisites by id; CI checks existence + acyclicity | ✓ |
| Separate edges file | Central relationships file | |

**User's choice:** On the node (prerequisites[])
**Notes:** Reinforces "one file fully describes a node" — good for AI authoring + PR review.

---

## Scaffold scope

**Question A — schema set breadth:**

| Option | Description | Selected |
|--------|-------------|----------|
| All three schemas now | node + masteryThreshold + progressRecord, all patch-versioned from first commit | ✓ |
| Node schema + shared patch mixin | Node now; defer mastery/progress schemas to their phases | |

**User's choice:** All three schemas now
**Notes:** Satisfies success criterion 4 literally; later schemas minimal but real.

**Question B — deployment extent:**

| Option | Description | Selected |
|--------|-------------|----------|
| Live Vercel deploy now | Minimal app + Vercel project + CI deploy to live URL on every push | ✓ |
| Build-verified, deploy deferred | Prove builds in CI, defer live hosting to Phase 2 | |

**User's choice:** Live Vercel deploy now
**Notes:** Surfaces deploy friction early; gives a real URL for community feedback. CI runs schema validation as a required check.

---

## Claude's Discretion

- Patch registry exact field set + module-vs-collection form (ordered + referentially-validated + CURRENT_PATCH are the hard constraints).
- Citation frontmatter field shape (finalized Phase 3; Phase 1 reserves the `applicationNote`-per-citation enforcement hook).
- CI tooling specifics (GitHub Actions assumed unless research finds better).
- Foundational ADR seed set (suggested: stack choice, content/engine decoupling, patch-registry primitive, GPL-3.0 rationale).
- Difficulty enum label values.

## Deferred Ideas

- GRAPH-04 filter UI → Phase 3 (fields added now).
- v2 race-specific branch content → v2 (race enum exists now).
- Replay object-ID maps per patch → Phase 8 (registry reserves an `objectIdMapVersion` hook).
- Final citation structure + howToApply rendering → Phase 3.
