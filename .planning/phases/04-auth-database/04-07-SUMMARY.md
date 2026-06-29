---
phase: 04-auth-database
plan: "07"
subsystem: documentation
status: complete
tags: [docs, adr, context, auth, authorization, battle-net, better-auth, architecture-discipline]
completed: "2026-06-29"
duration: "6m"
tasks_completed: 2
files_changed: 3

dependency_graph:
  requires:
    - 04-04 (src/lib/auth-middleware.ts — the authedServerFn interface ADR 007 documents)
    - 04-03 (src/lib/auth.ts — the Battle.net integration ADR 008 documents)
  provides:
    - CONTEXT.md (Phase 04 identity/auth domain terms appended)
    - docs/adr/007-authed-server-fn-authorization.md
    - docs/adr/008-betterauth-battlenet-integration.md
  affects:
    - Phase 5+ (all user-data server fns reference ADR 007 as the authorization standard)
    - Phase 7/8 (ADR 008 records gateway+BattleTag capture rationale; no re-capture needed)

tech_stack:
  added: []
  patterns:
    - "ADR 007 + ADR 008 follow the docs/adr/006 format: Status/Date/Phase header, Context, Decision, Consequences, Alternatives Considered, Related Decisions"
    - "CONTEXT.md new section: ## Identity & Auth Terms (Phase 04) with five glossary entries matching existing Core Terms / Graph Engine Terms style"

key_files:
  created:
    - docs/adr/007-authed-server-fn-authorization.md
    - docs/adr/008-betterauth-battlenet-integration.md
  modified:
    - CONTEXT.md

decisions:
  - "ADR 007 makes the principal-keyed authedServerFn convention the auditable, citable standard — not tribal knowledge — preventing a later phase from silently adding a userId-from-client server function (T-04-07a)"
  - "ADR 008 records LOW-MEDIUM confidence Assumption A1 (global OAuth endpoint) with an explicit per-region fallback note — spike with EU account required before live rollout"
  - "ADR 008 documents all three Battle.net OAuth workarounds: Pitfall 1 gateway UI capture, Pitfall 2 DiceBear avatar, Pitfall 3 overrideUserInfo BattleTag refresh"

metrics:
  duration: "6m"
  completed: "2026-06-29"
  tasks: 2
  files: 3
---

# Phase 04 Plan 07: Auth Documentation (CONTEXT.md + ADRs 007/008) Summary

**One-liner:** CONTEXT.md gains five Phase 4 identity/auth domain terms; ADR 007 locks the principal-keyed authedServerFn authorization convention as the auditable standard for all user-data server functions; ADR 008 records the better-auth + Battle.net integration decisions including gateway UI capture, DiceBear avatar fallback, and BattleTag refresh via overrideUserInfo.

## What Was Built

### Task 1: CONTEXT.md extended with Phase 4 domain terms

Added `## Identity & Auth Terms (Phase 04)` section with five new glossary entries matching the existing Core Terms style:

- **principal** — session-injected trusted identity; `context.principal` in every `authedServerFn` handler; the D-11/D-12 enforcement point
- **session** — better-auth 30-day rolling cookie auth state; cookie-cached to avoid per-request DB round-trips
- **BattleTag** — canonical `"Name#1234"` Battle.net display identity; mutable; refreshed on every login via `overrideUserInfo`; the w3champions lookup key (D-06)
- **gateway / region** — `"us"` | `"eu"` | `"kr"` captured via UI selector before OAuth redirect (not from userinfo payload); stored for Phase 7/8
- **account UUID** — `users.id`, UUID v4, the stable immutable progress key (AUTH-04, D-04); never changes across BattleTag renames

Updated "Last updated" line from Phase 02 to Phase 04. Extended the appendix tracking table with the five new terms.

### Task 2: ADR 007 + ADR 008

**ADR 007 (`docs/adr/007-authed-server-fn-authorization.md`):**

Documents the principal-keyed authorization convention (AUTH-03, D-11/D-12/D-13) as the mandated pattern for all user-data server functions. Key points:

- `beforeLoad` is a UX guard only — direct server-function HTTP calls bypass it (Pitfall 7)
- Client-supplied `userId` is untrusted (IDOR risk)
- `authMiddleware` throws 401 before calling `next()` when no valid session exists (D-11)
- `authedServerFn` factory returns a `createServerFn` wired with `[authMiddleware]`; handlers receive `context.principal` and accept no `userId` parameter (D-12)
- D-13 regression test asserts: (a) no-session calls never reach the handler; (b) cross-user handler calls query the correct principal's ID, never the forged ID
- Cites `src/lib/auth-middleware.ts` (one file to audit) and `src/server/user-profile.ts` (reference implementation)

**ADR 008 (`docs/adr/008-betterauth-battlenet-integration.md`):**

Documents the better-auth + Battle.net OAuth integration at LOW-MEDIUM confidence (no prior community-validated examples). Nine decisions recorded:

1. Global OAuth endpoint (`oauth.battle.net`) with Assumption A1; per-region fallback documented for EU/KR spike
2. Gateway captured via `RegionSelector` UI before OAuth redirect (sessionStorage `bnet_gateway`) — Pitfall 1 workaround
3. DiceBear 9.x initials avatar client-side; `avatarUrl` nullable — Pitfall 2 workaround
4. `overrideUserInfo: true` — BattleTag refreshed on every login while UUID stays stable — Pitfall 3 / D-08
5. `generateId: () => crypto.randomUUID()` — UUID v4 stable progress key (D-04)
6. 30-day rolling session; 5-minute signed-cookie cache; no "remember me" toggle (D-09/D-10)
7. Server/client bundle split (`auth.ts` server-only, `auth-client.ts` client-safe)
8. `usePlural: true` in Drizzle adapter — plural JS keys vs singular better-auth model names
9. `tanstackStartCookies()` plugin last in the plugins array

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 44fa989 | CONTEXT.md extended with Phase 4 identity/auth domain terms |
| Task 2 | 971fb87 | ADR 007 (authedServerFn convention) + ADR 008 (better-auth/Battle.net) |

## Deviations from Plan

None — plan executed exactly as written. ADR numbers 007 and 008 confirmed correct (existing sequence ends at 006; `0001-visual-design-direction.md` is the separate design-direction file outside the main ADR sequence).

## Threat Surface Scan

No new threat surface. This is a documentation-only plan.

| Coverage | Assessment |
|----------|------------|
| T-04-07a (undocumented authorization convention) | Mitigated — ADR 007 makes the principal-keyed rule explicit and auditable; linked to `auth-middleware.ts` + regression test |

## Known Stubs

None. Documentation is complete and accurate to the shipped implementation.

## Self-Check: PASSED
