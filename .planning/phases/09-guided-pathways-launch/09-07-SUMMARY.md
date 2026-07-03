---
phase: 09-guided-pathways-launch
plan: 07
subsystem: graph-ui
tags: [overlay, dialog, localStorage, ssr-safe, onboarding]
status: complete
requires:
  - "#/components/ui/dialog (shadcn Dialog primitives, Phase 4)"
  - "#/components/ui/button (gold CTA family, Phase 4)"
provides:
  - "PathwayIntroOverlay — self-gating first-visit intro Dialog"
affects:
  - "src/routes/index.tsx home route (mount deferred to plan 09-10)"
tech-stack:
  added: []
  patterns:
    - "SSR-safe localStorage: default-closed dialog + post-mount useEffect check (never useState initializer)"
    - "try/catch-guarded localStorage read/write mirroring local-progress.ts (typeof window guard)"
    - "single onOpenChange dismiss path covers CTA/X/Escape/backdrop and persists the seen flag"
key-files:
  created:
    - src/components/graph/PathwayIntroOverlay.tsx
  modified: []
decisions:
  - "localStorage key uses verified wc3rm: prefix (wc3rm:pathway-intro-seen), correcting UI-SPEC's wc3roadmap: assumption"
  - "Body-copy color uses #e9e8ee (RegionSelector precedent / global body token) — no CSS var exists for a light-neutral role"
metrics:
  duration: ~10m
  completed: 2026-07-03
  tasks: 1
  files: 1
---

# Phase 09 Plan 07: First-Visit Pathway Intro Overlay Summary

Self-contained, SSR-safe, one-time-gated shadcn Dialog that orients first-time visitors ("Start here — 8 ordered fundamentals") and never re-nags returning visitors, ready for plan 09-10 to mount in the home route.

## What Was Built

`src/components/graph/PathwayIntroOverlay.tsx` — a client-only Dialog component with no required props (it self-gates):

- **SSR-safe open state (RESEARCH Pitfall 3):** `open` defaults to `false`; a post-mount `useEffect` performs the localStorage read and calls `setOpen(true)` only when the stored flag is not `"true"`. No localStorage access in the `useState` initializer or render body, so server render and client first paint agree — no hydration mismatch, no flash.
- **One-time gate:** localStorage key `wc3rm:pathway-intro-seen` (verified repo `wc3rm:` prefix, per `local-progress.ts`).
- **Unified dismissal:** a single `onOpenChange` handler writes the seen flag before closing, so every close trigger — CTA button, built-in X, Escape, and backdrop click — counts as "seen". `onInteractOutside` is intentionally NOT overridden (backdrop dismiss allowed; this is not RegionSelector's captive flow).
- **Guarded storage (T-09-07):** both the read and write are wrapped in `typeof window` guards + try/catch, degrading a tampered/unavailable value to a no-op rather than throwing.
- **Copy per Copywriting Contract:** title "Start here" (22px/600 Space Grotesk, pathway-heading role), body "8 fundamentals, ordered top to bottom. Click any node to learn — mastering them lights up your map." (14px/400/1.65), full-width gold CTA "Got it — let's start" (rune-500 fill / obsidian-950 text, SignInButton family).

## Deviations from Plan

**1. [Rule 1 - Bug] Body-copy color: non-existent CSS variable → precedent hex**
- **Found during:** Task 1
- **Issue:** The plan/UI-SPEC implies CSS-variable-only styling, but no light-neutral text variable exists — the obsidian scale in `src/styles/app.css` is 600–950 (all dark). An initial `var(--color-obsidian-100)` would resolve to nothing and render the body copy invisible/inherited.
- **Fix:** Used `#e9e8ee`, matching the exact analog `RegionSelector.tsx` (same DialogDescription role) and the global `body` color token in app.css. Documented inline with a comment.
- **Files modified:** src/components/graph/PathwayIntroOverlay.tsx
- **Commit:** f74e36d

## Verification

- `test -f` + `grep wc3rm:pathway-intro-seen` + `grep useEffect`: all pass.
- `npx tsc --noEmit`: exit 0 (clean).
- Manual first-load / dismiss-and-reload verification deferred to end-of-phase verify (plan 09-13), per plan.

## Self-Check: PASSED

- FOUND: src/components/graph/PathwayIntroOverlay.tsx
- FOUND commit: f74e36d
