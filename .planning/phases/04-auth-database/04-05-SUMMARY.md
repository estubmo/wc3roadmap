---
phase: 04-auth-database
plan: "05"
subsystem: auth-ui-components
status: complete
tags: [auth, ui, battle-net, oauth, region-selector, shadcn, dicebear]
completed: "2026-06-29"
duration: "9m"
tasks_completed: 3
files_changed: 3

dependency_graph:
  requires:
    - 04-03 (auth-client.ts — useSession, signIn.oauth2, signOut)
    - 04-01 (shadcn primitives: button, dialog, dropdown-menu, avatar)
  provides:
    - src/components/auth/SignInButton.tsx (gold rune-500 CTA, onOpenRegion callback)
    - src/components/auth/RegionSelector.tsx (modal dialog, stores bnet_region, initiates OAuth)
    - src/components/auth/UserDropdown.tsx (BattleTag + DiceBear avatar + sign-out)
    - sessionStorage key: bnet_region
  affects:
    - 04-06 (SiteHeader composes these three components)

tech_stack:
  added:
    - "DiceBear 9.x initials avatar URL (no npm package — URL-only; resolves Pitfall 2)"
    - "sessionStorage['bnet_region'] gateway capture pattern (resolves Pitfall 1)"
  patterns:
    - "Tailwind v4 arbitrary CSS-variable values: bg-[var(--color-rune-500)] for inline overrides"
    - "onInteractOutside={(e) => e.preventDefault()} to suppress Radix Dialog outside-click"
    - "DropdownMenuTrigger asChild + Button variant=ghost for accessible dropdown trigger"
    - "hidden min-[480px]:inline for responsive BattleTag label visibility"
    - "void promise operator on async onClick handlers (prevents React handler return value warning)"

key_files:
  created:
    - src/components/auth/SignInButton.tsx
    - src/components/auth/RegionSelector.tsx
    - src/components/auth/UserDropdown.tsx

decisions:
  - "onOpenRegion callback on SignInButton keeps button decoupled from dialog state (parent 04-06 owns the open state)"
  - "Tailwind arbitrary values bg-[var(--color-rune-500)] used instead of inline styles on shadcn Button to leverage twMerge override resolution"
  - "Native <button> elements for region options (not shadcn Button) — consistent with FilterBar.tsx pattern; simpler hover management via onMouseEnter/onMouseLeave inline styles"
  - "RegionSelector onInteractOutside blocks outside-click per UI-SPEC; ESC and X close button both allowed"
  - "buildAvatarUrl and buildInitials extracted as named helpers for unit-testability (plan 04-07)"
  - "handleSignOut is async void pattern — signOut() returns Promise; void operator discards it cleanly in onClick"

metrics:
  duration: "9m"
  completed: "2026-06-29"
  tasks: 3
  files: 3
---

# Phase 04 Plan 05: Auth UI Components Summary

**One-liner:** Three auth UI leaf components — gold rune-500 SignInButton, region-capture modal with bnet_region sessionStorage write, and BattleTag+DiceBear UserDropdown — all per UI-SPEC with no hardcoded hex and no server auth imports.

## What Was Built

### Task 1: SignInButton (commit 3634260)

`src/components/auth/SignInButton.tsx` — the gold CTA (D-01).

Key design choices:
- `shadcn Button size="lg"` with Tailwind arbitrary value overrides: `bg-[var(--color-rune-500)] text-[var(--color-obsidian-950)] hover:bg-[var(--color-rune-400)]`
- `font-semibold` overrides shadcn's default `font-medium` (UI-SPEC 2-weight rule)
- `fontFamily: var(--font-display)` (Space Grotesk) via inline style — Button's font-sans default is overridden
- Accepts `onOpenRegion: () => void` callback; button itself never calls `signIn` directly
- `aria-label="Sign in with Battle.net"` for screen readers

### Task 2: RegionSelector (commit dab5b1d)

`src/components/auth/RegionSelector.tsx` — gateway-capture modal (Pitfall 1 workaround).

Key design choices:
- Controlled `Dialog` via `open`/`onOpenChange` props
- `onInteractOutside={(e) => e.preventDefault()}` prevents outside-click dismissal; ESC and X button still work
- Dialog panel styled with inline styles: `var(--color-obsidian-800)` bg, `var(--color-obsidian-600)` border, 8px radius
- Three native `<button>` elements (not shadcn Button) — 44px height, font-normal 400, hover `var(--color-obsidian-700)` via onMouseEnter/onMouseLeave
- On click: `sessionStorage.setItem("bnet_region", gateway)` → `await signIn.oauth2({ providerId: "battlenet", callbackURL: "/" })` — immediate redirect, no Continue step
- Zero rune accent — verification gate enforced this

### Task 3: UserDropdown (commit 1156fce)

`src/components/auth/UserDropdown.tsx` — signed-in header state (D-02).

Key design choices:
- `useSession` from `#/lib/auth-client` — BattleTag is `session?.user?.name`
- DiceBear URL: `https://api.dicebear.com/9.x/initials/svg?seed={encodeURIComponent(battleTag)}`
- `AvatarFallback`: first 2 chars before "#" (e.g. "Grubby#1234" → "Gr")
- BattleTag label: `hidden min-[480px]:inline` — visible only on desktop
- Ghost Button trigger; Radix DropdownMenu auto-manages `aria-haspopup="menu"` and `aria-expanded`
- Dropdown panel: obsidian-800/obsidian-600/8px/180px via inline styles
- Single item "Sign out" with LogOut icon — no confirmation dialog
- w3champions sync item intentionally absent (Phase 7)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSDoc comment triggered w3champions verification gate**
- **Found during:** Task 3 verify gate
- **Issue:** JSDoc contained "Sync with w3champions" — the node -e verification script checks `/Sync with w3champions/.test(s)` and fails if found. The JSDoc comment "Sync with w3champions placeholder is deferred to Phase 7" triggered it even though no UI element was rendered.
- **Fix:** Reworded JSDoc to "The w3champions sync item is intentionally absent — deferred to Phase 7 (UI-SPEC)."
- **Files modified:** `src/components/auth/UserDropdown.tsx`
- **Commit:** 1156fce (consolidated into task commit)

## Known Stubs

None. All three components are fully functional:
- SignInButton triggers onOpenRegion (parent wires to RegionSelector in 04-06)
- RegionSelector writes sessionStorage and calls signIn.oauth2 (live OAuth flow)
- UserDropdown reads live session state and calls signOut

The `bnet_region` in sessionStorage is populated by RegionSelector on first sign-in and is available for Phase 7's w3champions API lookup.

## Threat Flags

No new threat surface beyond the plan's threat model.

T-04-05a (server auth import): Verified — `grep -e 'from "#/lib/auth"'` finds no match in any component; all three import from `#/lib/auth-client` only.
T-04-05b (gateway tampering): Accepted — user editing their own sessionStorage region only affects their own w3champions lookup key (Phase 7), no cross-user impact.
T-04-05c (DiceBear BattleTag disclosure): Accepted — BattleTag is a public Battle.net identity; disclosure risk is acknowledged in plan.

## Self-Check: PASSED
