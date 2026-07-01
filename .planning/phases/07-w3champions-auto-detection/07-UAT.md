---
status: testing
phase: 07-w3champions-auto-detection
source: [07-VERIFICATION.md]
started: 2026-07-01T18:43:01Z
updated: 2026-07-01T18:43:01Z
---

## Current Test

number: 1
name: Sync action + "Last synced Xm ago" indicator
expected: |
  The sync action is present in the signed-in profile dropdown, always clickable
  (no disabled/countdown state), and the "Last synced Xm ago" label refreshes after
  a completed sync — no separate linking step (BattleTag comes from the session).
awaiting: user response

## Tests

### 1. Sync action + "Last synced Xm ago" indicator
expected: Log in, open the profile dropdown, click "Sync with w3champions", observe the "Last synced Xm ago" indicator update. The action is always clickable (no disabled/countdown), uses the session BattleTag (no separate linking step), and the last-synced label refreshes after a completed sync. (AUTO-01 / criterion 1)
result: [pending]

### 2. Auto-advance visual distinctness
expected: Trigger a sync that qualifies ≥1 MECHANIC node, return to the graph, and confirm the freshly-advanced node shows the one-shot Motion pulse and the panel badge reads "In progress · from w3champions" with a distinct canvas marker — visibly different from manual check-off and quiz mastery. (D-07 / D-09 / criterion 2)
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
