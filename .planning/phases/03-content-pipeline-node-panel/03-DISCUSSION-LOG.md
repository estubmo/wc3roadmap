# Phase 3: Content Pipeline & Node Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 3-Content Pipeline & Node Panel
**Areas discussed:** Panel presentation, Citations & attribution, Search & filter UX, Panel content structure

---

## Panel presentation

### Desktop panel mode
| Option | Description | Selected |
|--------|-------------|----------|
| Side drawer (right) | Slides from right; graph dimmed-but-visible; keeps node-in-context, reuses obsidian/gold | ✓ |
| Modal overlay | Centered card over dimmed graph; stronger focus, loses spatial context | |
| Full-screen takeover | Panel replaces graph; max reading space, weakest sense of place | |

### Graph interactivity while open
| Option | Description | Selected |
|--------|-------------|----------|
| Graph stays interactive | Click another node → panel swaps content live (persistent inspector) | ✓ |
| Graph locked while open | Graph dims + non-interactive until dismissed | |

### Mobile tap behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen sheet | Full-screen content view + back button | |
| Bottom sheet (partial) | Slides up ~80%, swipe-down dismiss; list peeks | ✓ |
| Inline expand | Card expands in place | |

**User's choice:** Right side drawer · live inspector · mobile bottom sheet.
**Notes:** Drawer + live-swap makes graph + panel one continuous exploration surface.

---

## Citations & attribution

### Inline science citation form
| Option | Description | Selected |
|--------|-------------|----------|
| Numbered refs + list | Superscript [n] → numbered References list at panel bottom | ✓ |
| Inline expandable | Marker expands popover with source + applicationNote | |
| Margin / sidebar notes | Citations float beside paragraph | |

### WC3-creator wisdom vs science (CONT-03)
| Option | Description | Selected |
|--------|-------------|----------|
| Distinct 'pro wisdom' callout | Quote-card block, creator name prominent, separate from science refs | ✓ |
| Same list, tagged | One list, each tagged Science / WC3 Creator | |
| Dedicated panel section | Separate 'What the pros say' section | |

### Where applicationNote surfaces
| Option | Description | Selected |
|--------|-------------|----------|
| Shown with each citation | Displayed alongside its source; guards decorative science (CONT-05) | ✓ |
| Hover/expand only | Hidden until hover/click | |
| Author-only metadata | CI/authoring guardrail, not shown in UI | |

**User's choice:** Numbered science refs + distinct creator callout, applicationNote always visible.
**Notes:** Drives a `CitationSchema` discriminator (`kind: science|creator`) — flagged for planner.

---

## Search & filter UX

### Non-matching node treatment
| Option | Description | Selected |
|--------|-------------|----------|
| Dim, keep mounted | Fade/blur but stay placed (mirrors Phase 2 spotlight + memoization) | ✓ |
| Hide entirely | Disappear + layout reflows to matches | |
| Highlight matches | All full-opacity, matches get gold ring | |

### Control location
| Option | Description | Selected |
|--------|-------------|----------|
| Top app bar | Search + filter chips in existing 56px bar; always visible | ✓ |
| Floating panel (toggle) | 'Filter' button opens floating panel | |
| Left sidebar | Persistent filter rail; eats canvas width | |

### Text search scope
| Option | Description | Selected |
|--------|-------------|----------|
| Title + tags | Matches title + tags[]; no content lazy-load needed | ✓ |
| Title only | Matches just title | |
| Title + tags + body | Full-text incl. MDX body; needs index, heavier | |

**User's choice:** Dim non-matches · top-bar controls · title+tags search.
**Notes:** skillType facet + tags search need a `GraphDisplayNode` projection extension (new ADR) — flagged. Mastery facet reads Phase 2 mocked mastery until Phase 5.

---

## Panel content structure

### Content ordering (CONT-02)
| Option | Description | Selected |
|--------|-------------|----------|
| How-to-apply pinned on top | Practical drill prominent at top; concept/why below | ✓ |
| Natural MDX order | Authored order (concept → how-to-apply at end) | |
| Tabbed (Learn / Apply) | Two tabs separating theory and drill | |

### In-panel navigation
| Option | Description | Selected |
|--------|-------------|----------|
| Show prereq links | Prerequisite chips → click swaps panel to that node | ✓ |
| No in-panel nav | Content only; return to graph to navigate | |

### Staleness in panel
| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 9 | No staleness indicator this phase | ✓ |
| Minimal 'last reviewed' line | Small last-reviewed/patch line now | |

**User's choice:** How-to-apply pinned top · prereq chips · staleness deferred.
**Notes:** Pinning How-to-Apply requires splitting the `## How to Apply` section out of the compiled MDX body — flagged for planner.

---

## Claude's Discretion

- Drawer/sheet width, Motion animation, dismiss affordances (within ADR 0001).
- Reference-numbering scheme, callout/chip styling.
- Facet-combination refinement beyond AND-across / OR-within default.
- Mechanism for splitting How-to-Apply (transform-time vs render-time).
- Lazy-load mechanism for panel content (dynamic import vs server fn vs content-collections).
- Mobile breakpoint reuse from Phase 2 (`md`).

## Deferred Ideas

- Full staleness UI — Phase 9.
- Full-text body search — deferred.
- Real mastery-based filtering on persisted data — Phase 5.
- Launch content gate (~25 nodes) + citation review audit — Phase 9 (CONT-04/05).
- Race-specific content / per-race theming — v2.
