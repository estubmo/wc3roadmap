---
phase: 01-foundation-schema
plan: "08"
subsystem: infra
tags: [vercel, deploy, readme, nitro, oss, gpl-3]

requires:
  - phase: 01-01
    provides: nitro() Vite plugin — the mechanism Vercel uses for zero-config TanStack Start detection
  - phase: 01-07
    provides: CI validation layer (GitHub Actions) already in place before deploy connected

provides:
  - README.md — project description, GPL-3.0-or-later license note, live URL, dev commands, stack summary
  - Live Vercel production deployment at https://wc3roadmap.vercel.app (HTTP 200 confirmed)
  - GitHub repo → Vercel GitHub App auto-deploy pipeline (pushes to main trigger builds)

affects: [all future phases — live URL is the public address for all subsequent deploys]

tech-stack:
  added: []
  patterns:
    - "Zero-config Vercel deploy via nitro() plugin — no vercel.json needed; framework auto-detected"
    - "Human-action checkpoint pattern: automation drives the deploy (gh + Vercel CLI); human confirms URL"

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "vercel.json omitted — nitro adapter from plan 01-01 provides zero-config Vercel detection; explicit config adds friction with no benefit"
  - "Live URL recorded in README immediately after HTTP 200 confirmed — single source of truth for production address"

patterns-established:
  - "Deploy-early pattern: live URL established in Phase 1 (D-12), before any feature work, to surface deploy-target friction early"

requirements-completed: [OSS-01]

coverage:
  - id: D1
    description: "README.md with project description, GPL-3.0-or-later note, live URL, dev commands, and stack summary"
    requirement: OSS-01
    verification:
      - kind: other
        ref: "git show 01a10b4:README.md — all sections confirmed present"
        status: pass
    human_judgment: false
  - id: D2
    description: "Vercel production URL https://wc3roadmap.vercel.app serves the placeholder app (HTTP 200)"
    requirement: OSS-01
    verification:
      - kind: other
        ref: "curl -sI https://wc3roadmap.vercel.app | grep HTTP — HTTP/2 200 confirmed"
        status: pass
    human_judgment: true
    rationale: "Visual page render (no 404, no SSR error) requires a human to open the URL in a browser — automated curl only verifies the HTTP status code, not that the page actually renders correctly"
  - id: D3
    description: "GitHub repo estubmo/wc3roadmap connected to Vercel project with auto-deploy on push to main"
    verification: []
    human_judgment: true
    rationale: "GitHub App connection is a dashboard-only configuration step — no file artifact is produced; only a human can confirm the Vercel project settings page shows the repo connection"

duration: ~15min (including human-action checkpoint for deploy)
completed: 2026-06-28
status: complete
---

# Phase 01 Plan 08: Vercel Live Deploy Summary

**Nitro-adapted TanStack Start app deployed to https://wc3roadmap.vercel.app via zero-config Vercel detection; GitHub repo auto-deploy pipeline live; README records live URL under GPL-3.0-or-later**

## Performance

- **Duration:** ~15 min (including human-action checkpoint for Vercel project connection)
- **Started:** 2026-06-28T20:00:00Z
- **Completed:** 2026-06-28
- **Tasks:** 2
- **Files modified:** 1 (README.md across 2 commits)

## Accomplishments

- README.md: project description, GPL-3.0-or-later license note, live URL (https://wc3roadmap.vercel.app), dev commands (`npm ci`, `npm run dev`, `npm run build`, `npm run validate`, `npm test`), and full stack summary
- `npm run build` exits 0 with nitro/Vercel output directory; no vercel.json needed (zero-config detection via nitro() plugin from plan 01-01)
- Live Vercel production deployment confirmed: `curl -sI https://wc3roadmap.vercel.app` returns HTTP/2 200; placeholder home page renders (valid HTML, no 404, no SSR error)
- GitHub repo `estubmo/wc3roadmap` connected to Vercel project via GitHub App; every push to main triggers a production build and deploy automatically

## Task Commits

1. **Task 1: Confirm Vercel-deployable production build + write README** — `01a10b4` (feat)
2. **Task 2: Record live Vercel production URL in README** — `488b4e8` (feat)

## Files Created/Modified

- `/home/eirikmo/projects/wc3roadmap/README.md` — project description, GPL-3.0 note, live URL, dev commands, stack table (modified across both task commits)

## Decisions Made

- `vercel.json` omitted: the `nitro()` Vite plugin from plan 01-01 is sufficient for Vercel zero-config TanStack Start detection; adding an explicit config file would add friction with no upside (RESEARCH Pitfall 3 in RESEARCH.md)
- Live URL recorded in README.md immediately after HTTP 200 was confirmed from the production domain, making it the single source of truth

## Deviations from Plan

None — plan executed exactly as written. Task 1 confirmed build was Vercel-ready (via nitro adapter, no vercel.json); Task 2 recorded the resolved production URL after human-action deploy was completed by the user.

The plan's `type="auto"` for Task 2 was handled as a human-action checkpoint at the human's request (per `<deploy_result>` context provided at agent spawn — the user completed the Vercel project connection and confirmed HTTP 200 before this continuation agent was invoked).

## Issues Encountered

None.

## User Setup Required

Completed prior to this agent run:
- Vercel project created and connected to `estubmo/wc3roadmap` via Vercel GitHub App
- Framework auto-detected as TanStack Start (nitro preset); build command `npm run build`; install command `npm ci`
- Production deployment triggered and confirmed live at https://wc3roadmap.vercel.app (HTTP/2 200, page renders)

## Threat Surface Scan

No new threat surface introduced in this plan:
- T-01-DEPLOY (Vercel token/secrets): tokens live in Vercel/GitHub settings, never committed; .env gitignored — mitigated
- T-01-SURFACE (placeholder app, public internet): static placeholder with no user input, auth, or data — minimal surface, accepted until Phase 4 adds auth/DB

## Next Phase Readiness

- Live URL established at D-12 (Phase 1); all future deploys go to https://wc3roadmap.vercel.app
- Every push to `main` auto-deploys via the Vercel GitHub App — the CI/CD pipeline is fully operational
- Phase 1 (foundation-schema) is now complete: data schema, patch registry, content pipeline, CI validation, and live deploy all in place
- Phase 2 (graph-engine) can begin; the full-stack foundation is solid

---

## Self-Check

**Files exist:**

- [x] `/home/eirikmo/projects/wc3roadmap/README.md` — present; live URL line = `https://wc3roadmap.vercel.app`

**Commits exist:**

- [x] `01a10b4` — Task 1 (README + Vercel-ready build)
- [x] `488b4e8` — Task 2 (live URL recorded)

**No secrets committed:** vercel.json absent; README contains only the public production URL; no tokens, no .env contents.

## Self-Check: PASSED

---

*Phase: 01-foundation-schema*
*Completed: 2026-06-28*
