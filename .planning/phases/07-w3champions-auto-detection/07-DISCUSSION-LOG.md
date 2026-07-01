# Phase 7: w3champions Auto-Detection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 7-w3champions-auto-detection
**Areas discussed:** Signal→node mapping, Advancement ceiling & precedence, Sync UX & feedback, Failure & no-data handling

---

## Signal → Node Mapping

### Where the mapping rule lives
| Option | Description | Selected |
|--------|-------------|----------|
| Per-node eligibility in content | Each node's MDX frontmatter declares its auto-detect criteria; `detectMasterySignals()` reads node metadata. Most extensible. | ✓ |
| Central tier→node rule table | Single detection module holds a curated mapping. Fewer moving parts, less granular, decoupled from content. | |
| Hybrid: node opt-in flag + central thresholds | Nodes carry a flag; central module owns thresholds. Splits authoring from tuning. | |

**User's choice:** Per-node eligibility in content.

### Criteria expressiveness
| Option | Description | Selected |
|--------|-------------|----------|
| Single signal + threshold | One signal + threshold per node. Simplest, matches "coarse". | ✓ |
| Compound AND/OR rules | Multiple conditions per node. More precise, adds a mini rule-engine. | |
| You decide | Defer to research. | |

**User's choice:** Single signal + threshold.

### In-scope signals
| Option | Description | Selected |
|--------|-------------|----------|
| MMR tier + games volume only | Ship the two race-agnostic signals; matchup W/L deferred. | |
| All three, matchup as no-op | Build schema to accept matchup W/L too; no node uses it yet. | |
| You decide | Research confirms API shape, then recommend. | ✓ |

**User's choice:** You decide.
**Notes:** Claude discretion — default to MMR tier + games volume (race-agnostic core); matchup W/L is race/matchup-specific and deferred to v2 (RACE-*/ADET-*). Do not build matchup code paths unless the API makes it trivial. Research confirms whether the w3champions API cleanly separates overall MMR + volume from per-matchup data.

---

## Advancement Ceiling & Precedence

### Ceiling
| Option | Description | Selected |
|--------|-------------|----------|
| Only up to 'in-progress' | Auto nudges untouched → in-progress, never sets 'mastered'. | ✓ |
| Can reach 'mastered' | High signal can auto-set mastered. Simpler, risks weak-evidence mastery. | |

**User's choice:** Only up to 'in-progress'.

### Precedence vs existing records
| Option | Description | Selected |
|--------|-------------|----------|
| Only untouched nodes | Auto acts only on untouched; never overwrites manual/quiz. | ✓ |
| Untouched + auto-owned nodes | Auto can update its own prior results too. | |
| Strict latest-write-wins | Auto overwrites whatever's there (capped at in-progress). | |

**User's choice:** Only untouched nodes.

### Re-sync downgrade
| Option | Description | Selected |
|--------|-------------|----------|
| Monotonic — never downgrade | Auto is a ratchet; advanced state persists. | ✓ |
| Reflect current signal | Revert auto's own in-progress if no longer qualifying. | |

**User's choice:** Monotonic — never downgrade.
**Notes:** Combined with "only untouched", auto is a one-way additive ratchet — sets in-progress once, never revisits, never flaps.

---

## Sync UX & Feedback

### Result communication
| Option | Description | Selected |
|--------|-------------|----------|
| Summary count + graph highlight | Profile count + pulse newly-advanced nodes on the graph. | ✓ |
| Summary count only | Report N advanced; no special highlight. | |
| Toast notification | Transient toast, silent state update. | |

**User's choice:** Summary count + graph highlight.

### Zero-result case
| Option | Description | Selected |
|--------|-------------|----------|
| Explicit reassuring message | "Synced — no new nodes qualified yet. Keep laddering!" | ✓ |
| Neutral 'synced, no changes' | Minimal honest message. | |
| You decide | Defer copy to UI phase. | |

**User's choice:** Explicit reassuring message.

### Source label
| Option | Description | Selected |
|--------|-------------|----------|
| Panel label + canvas marker | "from w3champions" in panel + distinct canvas marker (parallel to quiz ◆). | ✓ |
| Panel label only | Panel label, no canvas marker. | |
| You decide | Defer to UI-SPEC. | |

**User's choice:** Panel label + canvas marker.

---

## Failure & No-Data Handling

### Error messaging granularity
| Option | Description | Selected |
|--------|-------------|----------|
| Three tailored messages | Unreachable / rate-limited→cache / no-ladder-data, each distinct. | ✓ |
| Two buckets: retryable vs no-data | Collapse transient failures; keep no-data separate. | |
| You decide | Research pins down surfaced failure modes. | |

**User's choice:** Three tailored messages.
**Notes:** Rate-limit case falls back to cached data (not an error). Exact status-code → bucket mapping deferred to research.

### Re-sync frequency guard
| Option | Description | Selected |
|--------|-------------|----------|
| Silent cache within TTL, button always live | Button always clickable; serves cache within TTL. Matches criterion 3. | ✓ |
| Disabled button + cooldown timer | Disable + "re-sync in Xm" countdown. | |
| You decide | Defer to research + UI. | |

**User's choice:** Silent cache within TTL, button always live.
**Notes:** Exact TTL value deferred to research — w3champions rate limits are undocumented.

---

## Claude's Discretion

- In-scope signals (default MMR tier + games volume; matchup W/L deferred; research-confirmed).
- Exact cache TTL value (DB + TanStack staleTime) — research-gated on unknown w3champions rate limits.
- Exact UI copy and marker styling — deferred to UI-SPEC / UI phase.

## Deferred Ideas

- Matchup W/L trend signals & finer matchup detection (ADET-01..02) — with race branches (v2).
- Auto-advancing to 'mastered' from ladder data — rejected for coarse signals; strong-evidence mastery is Phase 8.
- Background/automatic sync — out of scope; sync is user-triggered.
