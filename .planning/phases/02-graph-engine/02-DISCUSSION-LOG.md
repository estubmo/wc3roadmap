# Phase 2: Graph Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 2-Graph Engine
**Areas discussed:** Node positioning/layout, Node face & state encoding, Guided-pathway view model, Mobile simplified form

---

## Node Positioning / Layout

### Position strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-layout from prerequisites (ELK/dagre) | Compute positions from the prereq DAG; adding a node re-layouts for free | ✓ |
| Hand-authored coordinates | Explicit x/y per node; full control, manual upkeep | |
| Auto-layout + curated overrides | Auto default with optional per-node override | |

**User's choice:** Auto-layout from prerequisites (ELK/dagre)

### Flow direction
| Option | Description | Selected |
|--------|-------------|----------|
| Top-to-bottom | Fundamentals top, advanced below; skill-tree feel | ✓ |
| Left-to-right | Timeline/roadmap feel | |
| You decide | — | |

**User's choice:** Top-to-bottom

### Layout timing
| Option | Description | Selected |
|--------|-------------|----------|
| Client-side on load (useMemo) | Memoized browser layout, no build wiring | |
| Build-time precompute | Bake x/y into a generated file | |
| You decide | — | ✓ |

**User's choice:** You decide (Claude's discretion — lean client-side, must be SSR-deterministic)

### Edges
| Option | Description | Selected |
|--------|-------------|----------|
| Subtle static curves | Muted grey directional bezier, quiet | |
| Curves that light up on interaction | Muted at rest; hover/select highlights prereq chain in rune-gold | ✓ |
| You decide | — | |

**User's choice:** Curves that light up on interaction
**Notes:** User initially mis-selected "Subtle static curves," then corrected to the highlight-on-interaction option.

---

## Node Face & State Encoding

### Node face content
| Option | Description | Selected |
|--------|-------------|----------|
| Title + type icon | Title + MECHANIC/CONCEPTUAL icon | |
| Title + type icon + difficulty | Adds beginner/intermediate/advanced marker | ✓ |
| Title only | Minimal; mastery carries all weight | |

**User's choice:** Title + type icon + difficulty

### Mastery state encoding
| Option | Description | Selected |
|--------|-------------|----------|
| Fill + glow progression | Dim → gold ring → gold glow | |
| Explicit status badge | Empty / half / gold-check badge | |
| Both: fill progression + small badge | Ambient fill + precise badge | ✓ |

**User's choice:** Both — fill progression + small badge
**Notes:** Flagged that rune-gold now does triple duty (mastered glow, in-progress ring, edge highlight); UI spec must define a hierarchy.

### MECHANIC vs CONCEPTUAL distinction
| Option | Description | Selected |
|--------|-------------|----------|
| Icon only | Same shape, different icon | |
| Distinct shape per type | Angular (mechanic) vs rounded (conceptual); readable zoomed out | ✓ |
| You decide | — | |

**User's choice:** Distinct shape per type

---

## Guided-Pathway View Model

### First-load rendering
| Option | Description | Selected |
|--------|-------------|----------|
| Subset only, then expand | Render only pathway nodes; Explore full map reveals rest | |
| Full graph, pathway spotlighted | Full graph + dim others; Explore full map un-dims | (initial) |
| You decide | — | |

**User's choice:** Full graph, pathway spotlighted — then refined (see reconcile)

### Reconcile vs success criterion 3
| Option | Description | Selected |
|--------|-------------|----------|
| Spotlight, but dim hard | Full graph rendered, non-pathway heavily de-emphasized; reword criterion | |
| Switch to subset-only | Literal criterion; only pathway nodes render | |
| Spotlight + fit viewport | All nodes mounted (dimmed), camera framed to pathway; Explore full map zooms out | ✓ |

**User's choice:** Spotlight + fit viewport
**Notes:** Resolves tension with ROADMAP criterion 3 by intent; verifier note added to CONTEXT.md; planner may propose a one-line ROADMAP reword.

### Pathway data definition
| Option | Description | Selected |
|--------|-------------|----------|
| Standalone pathway file | Ordered node-ID steps in pathways/*.json; Phase 9 extends | ✓ |
| Flag on the node schema | `pathways[]` field on nodes; touches locked Phase-1 schema | |
| Hardcoded in the engine | Throwaway array in code | |

**User's choice:** Standalone pathway file
**Notes:** Will be Zod-validated with CI referential-integrity check, consistent with Phase-1 discipline.

---

## Mobile Simplified Form

### Mobile rendering
| Option | Description | Selected |
|--------|-------------|----------|
| Read-only pan/zoom graph | Same graph, touch-limited | |
| Linear list / pathway view | Drop canvas; vertical card list | ✓ |
| Graph + list toggle | Both, list default | |

**User's choice:** Linear list / pathway view

### Mobile list scope/order
| Option | Description | Selected |
|--------|-------------|----------|
| Pathway first, then all nodes | Pathway nodes lead, then All Nodes section | ✓ |
| Pathway only | Just the pathway, no full list on mobile | |
| You decide | — | |

**User's choice:** Pathway first, then all nodes
**Notes:** Tap is a placeholder no-op in Phase 2; wired to detail panel in Phase 3.

---

## Claude's Discretion

- Layout timing (client useMemo vs build-time precompute) — lean client-side, must be SSR-deterministic.
- Layout engine choice (ELK vs dagre).
- Exact node shapes/icons within ADR 0001.
- Mobile breakpoint value.
- Pathway file location + exact field shape.

## Deferred Ideas

- Node detail panel + lazy content load (Phase 3, GRAPH-03).
- Search/filter by race/skillType/difficulty/mastery (Phase 3, GRAPH-04).
- Real mastery persistence + manual marking (Phase 5).
- Real pathway content, completion progress bar, multiple pathways, staleness UI (Phase 9).
- Race faction-color theming / per-race skins (v2).
- Possible one-line ROADMAP reword of success criterion 3.
