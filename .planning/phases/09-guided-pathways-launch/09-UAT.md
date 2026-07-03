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
result: passed — verified via /browse (dev, 2026-07-03). First visit shows "Start here" intro dialog with ordered-pathway copy; dismiss sets wc3rm:pathway-intro-seen and it does not reappear on reload. DOM confirms 8 step badges ("Step 1 of 8"…"Step 8 of 8"), exactly 1 "Next recommended step" cue, role=progressbar valuenow=0/valuemax=8, and dimmed non-pathway nodes. Screenshot: 01-first-visit.png, 02-pathway.png.

### 2. Progress bar is mastery-tied (SC2, PATH-04)
expected: As nodes are mastered, the PathwayBanner completion bar advances (mastered count only, not page visits). At 8/8 the bar crossfades to a quiet "Fundamentals complete" — no confetti/toast/sound.
result: passed — verified via /browse. Marking pathway nodes Mastered advanced the bar 0/8 → 1/8 → 8/8 with the label tracking ("1 of 8 mastered" … "Fundamentals complete"). At 8/8 the Next cue count dropped to 0 and no celebratory overlay appeared (D-03). Screenshot: 04-complete.png.

### 3. ≥25 authored launch-ready nodes (SC3, CONT-04) — content workstream
expected: At least 25 race-agnostic fundamentals nodes are fully authored (real peer-reviewed citations, "how to apply in your next game" sections, attributed WC3 player wisdom) and flipped to launch_ready: true. Mechanism verified: `LAUNCH_GATE=1 npm run validate:launch` currently fails and will pass once content lands. Sign-off = confirm the gate blocks/unblocks correctly against real authored content.
result: partial — gate mechanism verified live. Authored 3 launch_ready mental-skill nodes with real citations (replay-review/Ericsson 1993, spaced-practice/Cepeda 2006, reading-the-game/Chase & Simon 1973). Gate now reports "only 3 launch_ready nodes found; need >= 25" — correctly closed, up from 0. Remaining 22 nodes are a human content-authoring workstream (real citations required; not auto-fabricated).

### 4. Citation review audit of launched nodes (SC4, CONT-05) — content workstream
expected: Every citation on every launched node supports a specific verifiable claim paired with a concrete WC3 drill; any node failing the audit is withheld (launch_ready: false). Mechanism verified: auditNote field + validateAuditTrail validator. Sign-off = confirm the audit pass was performed against real authored content.
result: partial — the 3 authored launch_ready nodes each carry an auditNote and pass validateAuditTrail. Full audit across the eventual ≥25 set is pending the content workstream.

### 5. Staleness indicator on meta-volatile out-of-patch nodes (SC5, CONT-05/D-06)
expected: A meta-volatile node whose patch has moved shows an "Unreviewed for {patch}" strip below the panel header with a hover/focus/tap tooltip, plus a neutral clock marker on the canvas node face. Current-patch nodes show nothing and reserve no space.
result: passed — verified via /browse. Temporarily pointed build-order-human at the older patch-1.36.1: canvas node showed aria-label "Content may be outdated for the current patch", and the detail panel rendered the "⏱ Unreviewed for patch-1.36.2" strip below the header. Reverted the edit after capture. Current-patch nodes show no strip. Screenshot: 03-stale-panel.png.

## Summary

total: 5
passed: 3
issues: 0
pending: 2
skipped: 0
blocked: 0

## Notes

- SC1, SC2, SC5 verified end-to-end via the /browse headless browser against the local dev server (all machine-observable behavior confirmed).
- SC3, SC4 are the content-authoring workstream: gate + audit mechanisms are verified and correctly blocking launch at 3/25 launch_ready nodes. The remaining 22 require real, cited authoring and were intentionally not auto-generated (project core value: no decorative science).
- Launch-polish: branded 1200×630 public/og-image.png added (replaces the placeholder).

## Gaps
