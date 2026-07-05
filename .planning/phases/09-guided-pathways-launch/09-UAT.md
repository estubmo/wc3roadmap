---
status: passed
phase: 09-guided-pathways-launch
source: [09-VERIFICATION.md]
started: 2026-07-03T14:47:32Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

number: —
name: All 5 success criteria passed
expected: |
  All five ROADMAP success criteria are met: SC1/SC2/SC5 verified via /browse against the
  running app; SC3/SC4 met by completing the 25-node content gate (launch gate exits 0) with
  a full-corpus citation audit. No pending items.
awaiting: none

## Tests

### 1. Default landing = spotlighted pathway (SC1, PATH-01/PATH-03)
expected: First-time visitor lands on the Beginner Fundamentals pathway — intro overlay appears once (localStorage-gated), 8–12 highlighted nodes with step badges, a single "Next" cue, and a pathway progress bar. Not the raw full graph.
result: passed — verified via /browse (dev, 2026-07-03). First visit shows "Start here" intro dialog with ordered-pathway copy; dismiss sets wc3rm:pathway-intro-seen and it does not reappear on reload. DOM confirms 8 step badges ("Step 1 of 8"…"Step 8 of 8"), exactly 1 "Next recommended step" cue, role=progressbar valuenow=0/valuemax=8, and dimmed non-pathway nodes. Screenshot: 01-first-visit.png, 02-pathway.png.

### 2. Progress bar is mastery-tied (SC2, PATH-04)
expected: As nodes are mastered, the PathwayBanner completion bar advances (mastered count only, not page visits). At 8/8 the bar crossfades to a quiet "Fundamentals complete" — no confetti/toast/sound.
result: passed — verified via /browse. Marking pathway nodes Mastered advanced the bar 0/8 → 1/8 → 8/8 with the label tracking ("1 of 8 mastered" … "Fundamentals complete"). At 8/8 the Next cue count dropped to 0 and no celebratory overlay appeared (D-03). Screenshot: 04-complete.png.

### 3. ≥25 authored launch-ready nodes (SC3, CONT-04) — content workstream
expected: At least 25 race-agnostic fundamentals nodes are fully authored (real peer-reviewed citations, "how to apply in your next game" sections, attributed WC3 player wisdom) and flipped to launch_ready: true. Mechanism verified: `LAUNCH_GATE=1 npm run validate:launch` currently fails and will pass once content lands. Sign-off = confirm the gate blocks/unblocks correctly against real authored content.
result: passed — 25/25 nodes are launch_ready with real peer-reviewed citations, "How to Apply" drills, and community (Warcraft Gym / Liquipedia) sources. `LAUNCH_GATE=1 npm run validate` exits 0. Content distilled from existing resources (see docs/content-sources.md); science refs are genuine (Ericsson 1993, Schmidt & Lee, Fitts & Posner, Chase & Simon, Newell & Simon, Newell & Rosenbloom, Anderson 1982, Cepeda 2006, Miller 1956, Green & Bavelier 2003, Locke & Latham 2002, Beilock 2010, Pedraza-Ramirez 2020).

### 4. Citation review audit of launched nodes (SC4, CONT-05) — content workstream
expected: Every citation on every launched node supports a specific verifiable claim paired with a concrete WC3 drill; any node failing the audit is withheld (launch_ready: false). Mechanism verified: auditNote field + validateAuditTrail validator. Sign-off = confirm the audit pass was performed against real authored content.
result: passed — every one of the 25 launch_ready nodes carries a non-empty auditNote and passes validateAuditTrail. Full-corpus audit performed: 11 fabricated verbatim quotes removed, 2 fabricated science citations (Mikkelsen et al. 2009, mis-cited Camerer & Weber) replaced with real references, 1 missing science cite added, and every creator citation upgraded to a specific verifiable URL. Corpus grep confirms 0 fabricated quotes and 0 url-less creator citations.

### 5. Staleness indicator on meta-volatile out-of-patch nodes (SC5, CONT-05/D-06)
expected: A meta-volatile node whose patch has moved shows an "Unreviewed for {patch}" strip below the panel header with a hover/focus/tap tooltip, plus a neutral clock marker on the canvas node face. Current-patch nodes show nothing and reserve no space.
result: passed — verified via /browse. Temporarily pointed build-order-human at the older patch-1.36.1: canvas node showed aria-label "Content may be outdated for the current patch", and the detail panel rendered the "⏱ Unreviewed for patch-1.36.2" strip below the header. Reverted the edit after capture. Current-patch nodes show no strip. Screenshot: 03-stale-panel.png.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Notes

- SC1, SC2, SC5 verified end-to-end via the /browse headless browser against the local dev server (all machine-observable behavior confirmed).
- SC3, SC4 met by completing the content workstream: 25/25 nodes launch_ready, distilled from existing resources (docs/content-sources.md — Warcraft Gym + Liquipedia + a 14-entry real science library). Launch gate `LAUNCH_GATE=1 npm run validate` exits 0.
- Content-integrity audit found and fixed systemic fabrication in the seed content: 11 invented quotes, 2 fabricated + 1 missing science citation, and multiple unverifiable creator cites — all remediated. Corpus is now fabrication-free.
- Launch-polish: branded 1200×630 public/og-image.png added (replaces the placeholder).

## Gaps
