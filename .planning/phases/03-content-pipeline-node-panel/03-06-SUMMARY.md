---
phase: 03-content-pipeline-node-panel
plan: "06"
subsystem: ui / citation-rendering
tags: [citation, science-refs, creator-wisdom, url-allowlist, asvs-v5, react-component, css-variables]

requires:
  - phase: "03-02"
    provides: "CitationSchema discriminated union (ScienceCitation/CreatorCitation types)"

provides:
  - "CitationList — numbered science reference list with applicationNote (D-04/D-06, CONT-01)"
  - "ProWisdomCallout — distinct named creator quote card with applicationNote (D-05/D-06, CONT-03)"
  - "isSafeUrl() http(s)-only URL allowlist on all citation link render paths (ASVS V5, T-3-01)"

affects:
  - 03-07-PLAN
  - 03-08-PLAN
  - 03-09-PLAN

tech-stack:
  added: []
  patterns:
    - "isSafeUrl(url?): boolean — http(s)-only allowlist; url?.startsWith() === true pattern coerces undefined to false without casting"
    - "Filter by discriminated-union kind via TypeScript type guard: citations.filter((c): c is ScienceCitation => c.kind === 'science')"
    - "Citation index derived from filtered array position — no useState for numbering (key_links per plan)"
    - "CSS-variable-only token usage: var(--color-obsidian-*), var(--color-rune-*), var(--font-display), var(--font-mono), var(--font-sans)"

key-files:
  created:
    - src/components/graph/CitationList.tsx — numbered science refs, applicationNote, mono-font index, safe-URL anchor
    - src/components/graph/ProWisdomCallout.tsx — obsidian-800 card + rune-500 left accent, prominent creator name, optional quote

key-decisions:
  - "isSafeUrl() defined as a module-scope named function (not arrow const) for clarity; both components duplicate it rather than sharing a util to keep each file self-contained — the function is 2 lines and its security contract must be visible at every render site"
  - "ProWisdomCallout section label 'Pro Wisdom' over 'Creator Citations' — shorter, player-vocabulary term matching the project's community audience"
  - "citation.quote guarded with != null (not !) to handle empty string edge case explicitly — empty quote is treated as absent"
  - "blockquote used for quote text — semantic HTML for quoted content; border-left reset to none to avoid browser UA styles fighting the card's own left accent"

requirements-completed: [CONT-01, CONT-03]

coverage:
  - id: D1
    description: "CitationList renders science citations as a numbered [n] references list with applicationNote beneath each source"
    requirement: CONT-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit — clean, no CitationList errors"
        status: pass
    human_judgment: true
    rationale: "Visual rendering and numbered-list layout require manual panel inspection to confirm D-04/D-06 compliance"
  - id: D2
    description: "Citation URL http(s)-only allowlist — javascript:/data: URLs never become anchors in CitationList or ProWisdomCallout"
    requirement: CONT-01
    verification:
      - kind: other
        ref: "Code review: isSafeUrl(url?) returns true only for http:// or https:// prefixes — both components confirmed"
        status: pass
    human_judgment: false
  - id: D3
    description: "ProWisdomCallout renders creator wisdom as a distinct obsidian-800 card with creator name prominent (display font weight 600, rune-gold) and optional quote in italic"
    requirement: CONT-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit — clean, no ProWisdomCallout errors"
        status: pass
    human_judgment: true
    rationale: "Visual distinctiveness, name prominence, and quote presentation require manual panel inspection to confirm D-05 compliance"

duration: 3min
completed: "2026-06-29"
status: complete
---

# Phase 03 Plan 06: Citation Rendering Components Summary

**CitationList (numbered science refs + applicationNote) and ProWisdomCallout (distinct named creator card) built with http(s)-only URL allowlist on all citation link render paths (ASVS V5, T-3-01)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-29T11:37:12Z
- **Completed:** 2026-06-29T11:40:xx Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `CitationList`: filters `kind=science` via type guard, derives `[n]` index from filtered array position (no useState), renders numbered References section with source (linked when http(s) safe) and applicationNote beneath each entry. Mono font for index (rune-gold), sans for text. Returns null for zero science citations.
- `ProWisdomCallout`: filters `kind=creator`, renders each as an obsidian-800 card with rune-500 left accent. Creator `source` PROMINENT: display font 14px weight 600 rune-gold. Optional `quote` in italic. `applicationNote` as smaller muted text (opacity 0.6). Returns null for zero creator citations.
- `isSafeUrl()` http(s)-only allowlist applied on every citation URL render path in both components — `javascript:` / `data:` URLs render as plain text, never as clickable anchors (ASVS V5, T-3-01 mitigated). Links carry `rel="noopener noreferrer"`.
- All colors and fonts use CSS variable design tokens only — no hardcoded hex, no brand Tailwind classes (ADR 0001).

## Task Commits

1. **Task 1: CitationList** — `0577ab8` (feat)
2. **Task 2: ProWisdomCallout** — `c2276cb` (feat)

## Files Created/Modified

- `src/components/graph/CitationList.tsx` — numbered science reference list with http(s)-only URL guard
- `src/components/graph/ProWisdomCallout.tsx` — creator quote card with prominent name and URL guard

## Decisions Made

- `isSafeUrl()` duplicated in both files rather than extracted to a shared util — the function is 2 lines and its security contract (T-3-01 mitigation) must be visible at every render site without an import hop.
- "Pro Wisdom" section label chosen over "Creator Citations" — shorter, matches player vocabulary.
- `citation.quote != null` guard (not truthy `!`) — treats empty string as absent, consistent with the optional field semantics.
- `<blockquote>` for quote text with browser UA border-left reset — semantic HTML, no conflict with card's rune-500 left accent.

## Deviations from Plan

None — plan executed exactly as written. Both components implement all acceptance criteria:
- Numbered refs via filtered array position (no useState)
- http(s)-only allowlist confirmed on all URL render paths
- CSS-variable tokens only
- TypeScript clean (`npx tsc --noEmit` — 0 errors for both files)

## Known Stubs

None. Both components are fully implemented and consume real `Citation[]` props from the discriminated union schema (plan 03-02). Panel rendering wire-up occurs in plans 03-07 through 03-09.

## Threat Flags

None. T-3-01 (javascript:/data: URL XSS via citation href) is now mitigated in both components via `isSafeUrl()`. T-3-07 (source text injection) is safe by construction — JSX text content is auto-escaped by React, no `dangerouslySetInnerHTML` used.

## Self-Check: PASSED

Files verified present:
- `src/components/graph/CitationList.tsx` — FOUND
- `src/components/graph/ProWisdomCallout.tsx` — FOUND

Commits verified:
- `0577ab8` — feat(03-06): CitationList
- `c2276cb` — feat(03-06): ProWisdomCallout
