# Phase 8: Replay Parsing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 8-replay-parsing
**Areas discussed:** Replay mastery power, wc3v fork scope, Signal & race coverage, Feedback & upload UX

Note: user selected all four gray areas, then partway through said "drive autonomously" — Area 4 (Feedback & upload UX) and remaining discretionary calls were decided by Claude using established precedent + project priorities.

---

## Replay mastery power

### Can a replay signal set a MECHANIC node directly to `mastered`?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes → mastered | Threshold-meeting replay sets node straight to mastered (criterion 3); replay is strong fine-grained evidence | ✓ |
| Two-tier (in-progress then mastered) | One clean exec → in-progress; repeated → mastered; needs a consistency counter | |
| Only in-progress | Caps at in-progress like auto; contradicts criterion 3 | |

### How does replay rank vs an existing manual/quiz/auto row?
| Option | Description | Selected |
|--------|-------------|----------|
| Replay wins (strongest evidence) | Overwrites any source incl. manual; objective execution outranks self-report | ✓ |
| Replay wins except manual | Outranks auto/quiz but never a manual mark | |
| Latest-write-wins (ADR 010 baseline) | No special replay handling | |

### If a later replay is worse than current mastered state?
| Option | Description | Selected |
|--------|-------------|----------|
| Monotonic — never downgrade | Stays mastered; worse later replay ignored (Phase 7 D-06 ratchet) | ✓ |
| Reflects latest replay | A bad game can drop node back; honest but punishing | |

**User's choice:** mastered / replay-wins / monotonic.
**Notes:** Yields a one-way UPWARD ratchet — replay outranks all sources for upgrades but never removes progress. New `source:"replay"` + distinct labeling follows Phase 6/7 sourceMap precedent (not re-asked).

---

## wc3v fork scope

### How should the wc3v fork relate to the w3gjs base signals?
| Option | Description | Selected |
|--------|-------------|----------|
| Base first, wc3v as later layer | Ship w3gjs base signals first; wc3v layered after, possibly own phase | |
| wc3v integrated from the start | Fork + integrate alongside w3gjs as one combined effort | ✓ |
| Spike wc3v before deciding | Add a feasibility spike to decide integrate-now vs defer | |

### If base ships but wc3v proves heavy, can it slip to its own phase?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — wc3v can become its own phase | Criterion 4 is the descope valve; ship base-signal replay as complete | ✓ |
| No — wc3v must land in Phase 8 | All 5 criteria ship together | |

**User's choice:** integrated from the start, WITH a descope valve to Phase 8.x.
**Notes:** Ambition + safety valve. wc3v-fork feasibility becomes a third planning-gate spike alongside the two in STATE.md.

---

## Signal & race coverage

### How to handle race/matchup-specific build-order timing (race branches are v2-deferred)?
| Option | Description | Selected |
|--------|-------------|----------|
| Extract for feedback, agnostic drives mastery | Show build-order to all; only race-agnostic mechanics advance mastery | |
| Include race-specific build-order nodes now | Author race-specific build nodes + thresholds this phase | ✓ |
| Skip build-order entirely | Don't extract until race branches exist; violates criterion 1 | |

### Where do patch-aware thresholds live?
| Option | Description | Selected |
|--------|-------------|----------|
| Per-node frontmatter, patch-keyed | Extend the autoDetect pattern | |
| Central patch-keyed threshold table | Separate module keyed by (signal, patch) | |
| You decide (research-gated) | Let research recommend | ✓ |

### (Follow-up) How much race-specific build-order content in Phase 8?
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal seed — one race, few builds | Prove pipeline on one matchup | |
| One canonical build per race | One standard opening build node per race (4 nodes) | ✓ |
| Full race build-order coverage | Main builds across all races/matchups; pulls most of RACE-* in | |

### (Follow-up) Source of truth for build-order thresholds?
| Option | Description | Selected |
|--------|-------------|----------|
| Content-authored from pro/creator wisdom | Authors set targets from established knowledge; citable | |
| Derived from w3champions/pro replays | Empirical targets from corpus; ties to wc3v compare-to-pro | |
| You decide (research-gated) | Let research recommend | ✓ |

**User's choice:** one canonical build per race (bounded pull-forward of RACE-*); threshold location + BO threshold source research-gated.
**Notes:** Bounded to keep the phase shippable — remaining races become v2 pure content additions once schema + parser handle them here.

---

## Feedback & upload UX (Claude autonomous)

Decided by Claude after "drive autonomously":
- Dedicated `/replays` surface: drag-drop `.w3g` upload + w3champions auto-pull (reuse Phase 7 client + rate-limit guard).
- Player identified by BattleTag; no match → manual pick.
- Only 1v1 replays drive mastery; team/FFA parse for feedback only.
- Feedback = per-replay report ("you did X at Y; target Z" + node mapping + advanced nodes) + graph pulse + inline node-panel latest signal.
- Cache parsed results by gameId (store signals + patchId + build number); never re-parse.

---

## Claude's Discretion

- Build-order threshold source of truth (content-authored vs corpus-derived) — research-gated.
- Threshold location (per-node frontmatter vs central table) — research-gated.
- Parse location (client vs serverless vs background) — spike/research.
- Cache table keying (per-user vs global-by-gameId) — planner.
- Exact UI copy, report layout, marker styling — UI-SPEC.
- Entire Feedback & upload UX area decided autonomously (D-13..D-17).

## Deferred Ideas

- Full race/matchup build-order coverage beyond one canonical build per race (RACE-*) — v2.
- Matchup W/L & finer matchup detection (ADET-*) — v2.
- Team/FFA replay → mastery mapping — future (targets are 1v1-calibrated).
- wc3v advanced-analysis layer — may split to Phase 8.x if fork proves heavy.
- Background/automatic replay ingestion — out of scope (user-triggered only).
