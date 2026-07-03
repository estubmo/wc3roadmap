---
status: testing
phase: 09-guided-pathways-launch
source: [09-VERIFICATION.md]
started: 2026-07-03T14:47:32Z
updated: 2026-07-03T14:47:32Z
---

## Current Test

number: 1
name: Default landing shows the Beginner Fundamentals guided pathway, not the raw full graph
expected: |
  A first-time visitor (cleared localStorage) lands on the home route and sees the
  first-visit intro overlay, then an ordered/highlighted subset of 8–12 pathway nodes
  with step-number badges, a single "Next" cue on the first non-mastered step, and a
  "0 of 8 mastered" pathway progress bar — NOT the undifferentiated full graph.
awaiting: user response

## Tests

### 1. Default landing = spotlighted pathway (SC1, PATH-01/PATH-03)
expected: First-time visitor lands on the Beginner Fundamentals pathway — intro overlay appears once (localStorage-gated), 8–12 highlighted nodes with step badges, a single "Next" cue, and a pathway progress bar. Not the raw full graph.
result: [pending]

### 2. Progress bar is mastery-tied (SC2, PATH-04)
expected: As nodes are mastered, the PathwayBanner completion bar advances (mastered count only, not page visits). At 8/8 the bar crossfades to a quiet "Fundamentals complete" — no confetti/toast/sound.
result: [pending]

### 3. ≥25 authored launch-ready nodes (SC3, CONT-04) — content workstream
expected: At least 25 race-agnostic fundamentals nodes are fully authored (real peer-reviewed citations, "how to apply in your next game" sections, attributed WC3 player wisdom) and flipped to launch_ready: true. Mechanism verified: `LAUNCH_GATE=1 npm run validate:launch` currently fails at 0/25 by design and will pass once content lands. Sign-off = confirm the gate blocks/unblocks correctly against real authored content.
result: [pending]

### 4. Citation review audit of launched nodes (SC4, CONT-05) — content workstream
expected: Every citation on every launched node supports a specific verifiable claim paired with a concrete WC3 drill; any node failing the audit is withheld (launch_ready: false). Mechanism verified: auditNote field + validateAuditTrail validator. Sign-off = confirm the audit pass was performed against real authored content.
result: [pending]

### 5. Staleness indicator on meta-volatile out-of-patch nodes (SC5, CONT-05/D-06)
expected: A meta-volatile node whose patch has moved shows an "Unreviewed for {patch}" strip below the panel header with a hover/focus/tap tooltip, plus a neutral clock marker on the canvas node face. Current-patch nodes show nothing and reserve no space.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
