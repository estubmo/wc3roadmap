# Phase 9: Guided Pathways & Launch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 9-Guided Pathways & Launch
**Areas discussed:** Pathway progress bar, First-time landing UX, Staleness indicator, Content gate + citation audit, Launch scope

---

## Pathway progress bar (PATH-04)

### Progress form
| Option | Description | Selected |
|--------|-------------|----------|
| Bar + count | Slim rune-gold fill bar + "3 of 8 mastered" in PathwayBanner | ✓ |
| Lit-up steps | Nodes glowing gold are the indicator; add only a "3/8" label | |
| Fraction only | Text "3 / 8 mastered", no bar | |

### What counts as complete
| Option | Description | Selected |
|--------|-------------|----------|
| Mastered only | A step counts only at `mastered`; cleanest semantics | ✓ |
| Partial credit | in-progress = half, mastered = full; smoother but muddier | |

### Non-gamified line (PROG-05)
| Option | Description | Selected |
|--------|-------------|----------|
| Skill-framed, no fanfare | No confetti/streak/XP; quiet "Fundamentals complete" at 8/8 | ✓ |
| Add a completion moment | Celebratory animation at 8/8 — risks gamification | |

**User's choice:** Bar + count / Mastered only / Skill-framed, no fanfare
**Notes:** Bar lives in the existing PathwayBanner slot (currently a static count). PROG-05 clarified for the user mid-discussion — no XP/streaks/leaderboards.

---

## First-time landing UX (PATH-01/03)

### Ordering explicitness
| Option | Description | Selected |
|--------|-------------|----------|
| Numbered steps | Step numbers 1–8 on pathway nodes from pathway JSON order | |
| Layout implies order | Keep spotlight, no numbers; DAG top→bottom implies order | |
| Numbers + next-node cue | Numbered steps PLUS highlight on first non-mastered step | ✓ |

### First-visit experience
| Option | Description | Selected |
|--------|-------------|----------|
| Straight into pathway | Land on spotlighted pathway, no modal | |
| Brief intro overlay | Dismissible welcome card, once per visitor (localStorage) | ✓ |

**User's choice:** Numbers + next-node cue / Brief intro overlay
**Notes:** Pathway becomes a "do this next" guide, with a one-time orientation for novices.

---

## Staleness indicator (criterion 5)

### Panel form
| Option | Description | Selected |
|--------|-------------|----------|
| Inline warning banner | Muted-amber banner near panel top with full sentence | |
| Subtle badge | Compact "Unreviewed for {patch}" pill near title | ✓ |
| Banner + tooltip | Badge with hover/tap tooltip carrying full explanation | |

### Graph node surfacing
| Option | Description | Selected |
|--------|-------------|----------|
| Panel only | Staleness only in detail panel; cleanest canvas | |
| Small marker on node | Tiny staleness marker on stale nodes on the canvas too | ✓ |

### Data seam (ADR-002)
| Option | Description | Selected |
|--------|-------------|----------|
| In the panel's content query | Compute where full content already loads; keeps decoupling | |
| Add to graph projection | Push `stale` boolean into GraphDisplayNode | ✓ |
| You decide | Let planner pick | |

**User's choice:** Subtle badge / Small marker on node / Add to graph projection
**Notes:** Trigger locked by schema. Badge is terse → CONTEXT adds a required tooltip so it stays legible. Choosing the on-canvas marker forced the accepted ADR-002 boundary widening (`stale` on GraphDisplayNode).

---

## Content gate + citation audit (CONT-04/05)

### Gap nodes
| Option | Description | Selected |
|--------|-------------|----------|
| New fundamentals breadth | ~8 new topics; existing 17 stand as-is | |
| Breadth + upgrade pass | ~8 new topics AND re-review existing 17 to one bar | ✓ |
| You decide topics | Researcher proposes the ~8 topics for sign-off | |

### Authoring flow
| Option | Description | Selected |
|--------|-------------|----------|
| Authored in Phase 9 plans | ~8 nodes drafted as Phase 9 tasks | |
| Parallel content workstream | Phase 9 builds code + gate; content is parallel; gate blocks launch | ✓ |

### Audit + gate mechanism
| Option | Description | Selected |
|--------|-------------|----------|
| launch_ready flag + CI count | Schema boolean; non-ready excluded; CI asserts ≥25 | ✓ |
| Audit checklist doc | Markdown checklist, honor-system, no code gate | |
| Flag + checklist both | Enforced flag PLUS recorded audit verdict trail | |

**User's choice:** Breadth + upgrade pass / Parallel content workstream / launch_ready flag + CI count
**Notes:** CONTEXT folds in the auditable-trail idea (D-13) as a complement to the enforced flag, matching the "trustworthy/no decorative science" core value.

---

## Launch scope

| Option | Description | Selected |
|--------|-------------|----------|
| Gates then announce | No extra launch infra; keep to 6 requirements | |
| Add launch polish | Meta/OG tags, 404/error page, about/privacy page | ✓ |
| Note polish for backlog | Defer polish items to a follow-up | |

**User's choice:** Add launch polish
**Notes:** Accepted addition beyond the 6 mapped requirements (D-16). Kept minimal — not a full marketing site. Planner flagged to note the scope addition.

---

## Claude's Discretion

- Exact progress-bar visual detail / step-number glyph / next-node cue treatment (within ADR-0001; mind Phase-2 F-01 rune-gold hierarchy).
- `launch_ready` schema default + migration of the existing 17 nodes.
- Whether panel staleness and canvas-marker staleness derive from one shared predicate (recommended) or two seams.

## Deferred Ideas

- Additional guided pathways (COMM-03 / RACE-05, v2).
- Celebratory completion moment (rejected v1 per PROG-05).
- Staleness as a filter facet (marker only this phase).
- Full marketing/landing site (launch polish kept minimal).
- Race-specific branch content + theming (v2).
