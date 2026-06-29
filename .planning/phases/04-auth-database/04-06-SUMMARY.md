---
phase: 04-auth-database
plan: "06"
subsystem: auth-header-integration
status: complete
tags: [auth, site-header, oauth, session-persistence, battle-net, root-layout]
completed: "2026-06-29"
duration: "2m"
tasks_completed: 2
files_changed: 2

dependency_graph:
  requires:
    - 04-05 (SignInButton, RegionSelector, UserDropdown leaf components)
    - 04-03 (auth-client.ts — useSession, signIn, signOut)
  provides:
    - src/components/SiteHeader.tsx (fixed 48px auth banner, session-switching)
    - src/routes/__root.tsx (SiteHeader mount + 48px content offset)
  affects:
    - 04-07 (tests for SiteHeader auth integration)
    - All routes (header now fixed over every page)

tech_stack:
  added: []
  patterns:
    - "Pending-slot suppression: isPending→null in right slot prevents CTA flash on refresh (T-04-06b)"
    - "Fragment wrapper: SiteHeader returns <></> with header + RegionSelector to keep DOM clean"
    - "inline style: fixed positioning via style prop (not Tailwind class) for pixel-precise layout"
    - "flex: 1 left spacer for future wordmark without rewriting header layout"

key_files:
  created:
    - src/components/SiteHeader.tsx
  modified:
    - src/routes/__root.tsx

decisions:
  - "SiteHeader returns React fragment wrapping <header> + <RegionSelector> — keeps dialog ownership within the component without portal side-effects"
  - "paddingTop 48px on children wrapper uses inline style (not Tailwind pt-12) — precise pixel value matches header height token exactly"
  - "isPending renders null (empty slot), not a skeleton — avoids flash of signed-out state on cookie-authenticated refresh (AUTH-02)"
  - "error branch renders inline error string before the session check so OAuth errors are visible even when data is null"

metrics:
  duration: "2m"
  completed: "2026-06-29"
  tasks: 2
  files: 2
---

# Phase 04 Plan 06: Auth Header Integration Summary

**One-liner:** SiteHeader fixed 48px banner composing SignInButton/RegionSelector/UserDropdown with session-state switching, pending-slot flash prevention, and inline OAuth error — mounted in __root.tsx above all content.

## What Was Built

### Task 1: SiteHeader (commit b10596a)

`src/components/SiteHeader.tsx` — the phase's primary visual focal point.

Key design choices:
- Fixed `<header role="banner">` at top/left/right 0, height 48px, z-index 50
- Background `var(--color-obsidian-900)`, bottom border `1px var(--color-obsidian-600)`, padding `0 16px`
- Right slot state machine: `isPending→null` | `error→inline msg` | `session→<UserDropdown>` | else→`<SignInButton>`
- Pending state renders empty slot (`null`), not the CTA — prevents flash of signed-out state on browser refresh when session cookie is present (T-04-06b mitigation / AUTH-02)
- Owns `regionOpen` state; passes `onOpenRegion` callback to SignInButton; passes `open/onOpenChange` to RegionSelector — components remain decoupled
- Inline OAuth error: `"Sign-in failed — check your connection and try again."` with `aria-live="polite"` — non-blocking, user can continue using the app (D-03)
- Left region is an empty `flex:1` div (future wordmark placeholder)
- GPL-3.0-or-later SPDX header + JSDoc per conventions
- Imports `useSession` from `#/lib/auth-client` only — never from `#/lib/auth` (server-only)

### Task 2: Mount in root layout (commit fe09686)

`src/routes/__root.tsx` — added SiteHeader import and mount.

- `import { SiteHeader } from "#/components/SiteHeader"` added to imports
- Inside `<QueryClientProvider>`: `<SiteHeader />` rendered above `{children}`
- `{children}` wrapped in `<div style={{ paddingTop: "48px" }}>` — graph canvas clears the fixed header bar
- `<Scripts />` remains outside `QueryClientProvider` (structure preserved exactly)
- `queryClient` singleton unchanged

### Task 3: End-of-phase OAuth verification

Automated gate: `npm test` — 235 tests, 19 test files, all pass.

Human-check gate: Full Battle.net OAuth round-trip (sign-in → BattleTag shows → refresh persists → sign-out returns CTA → users row in Neon) — cannot be automated (requires live Blizzard credentials and registered redirect URI). Surfaced as `CHECKPOINT REACHED` for manual execution.

**RESEARCH Open Question #1 (regional routing):** The current auth.ts uses a single genericOAuth provider config with the global Battle.net endpoint. EU and KR players may not reach their regional Battle.net login page if the global endpoint does not honor the captured `sessionStorage["bnet_region"]` value. If the human check reveals that EU/KR sign-in fails or routes to the wrong region, the fix is to add per-region `genericOAuth` provider variants (e.g. `battlenet-eu`, `battlenet-kr`) with region-specific OAuth hostnames, and update the RegionSelector to pass the correct `providerId` per gateway. No code change made preemptively — the risk is documented, not silently swallowed.

## Deviations from Plan

None — plan executed exactly as written. Both automated tasks committed individually; human-check surfaced as checkpoint per plan instructions.

## Known Stubs

None. SiteHeader is fully wired:
- Session state from `useSession()` drives real header switching
- RegionSelector owns real `signIn.oauth2()` call
- UserDropdown calls real `signOut()`

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-04-06a: Header presentational only — protected data routes through authMiddleware (04-04). Accepted.
- T-04-06b: Pending slot renders `null`, not the CTA — SSR-cookie session resolves before paint. Mitigated.

## Self-Check: PASSED

- src/components/SiteHeader.tsx: FOUND
- src/routes/__root.tsx: MODIFIED (SiteHeader import + mount verified)
- Commit b10596a (SiteHeader): FOUND
- Commit fe09686 (root layout): FOUND
- typecheck: PASSED
- npm test: 235 tests PASSED
