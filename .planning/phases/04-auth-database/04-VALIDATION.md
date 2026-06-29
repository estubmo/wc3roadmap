---
phase: 4
slug: auth-database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` §"Validation Architecture". Task IDs are filled in by the planner / refined during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~few seconds (unit/integration with mocked OAuth + session) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

> Task IDs are placeholders until the planner finalizes plan/wave breakdown.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-XX-XX | XX | 1+ | AUTH-01 | — | OAuth callback maps profile → users row (battleTag, gateway, bnetSub) | integration (mock OAuth) | `npm test -- auth` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-02 | — | Session cookie survives refresh (30-day rolling, always-persistent) | unit (session config) | `npm test -- auth-session` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-03 | — | `authedServerFn`/middleware throws 401 with no session / forged token | unit (mock getSession) | `npm test -- auth-middleware` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-03 | — | User-data server fn returns principal's data, never the forged target's (cross-user test, D-13 / success criterion 3) | unit (mock getSession) | `npm test -- auth-middleware` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-04 | — | Internal UUID stays stable across BattleTag display-name change (overrideUserInfo) | unit (mock OAuth profile) | `npm test -- auth-user-uuid` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/auth-middleware.test.ts` — covers AUTH-03 (`authedServerFn` 401 + cross-user principal-keying, D-11/D-12/D-13)
- [ ] `src/lib/auth.test.ts` — covers AUTH-01 profile mapping (`mapProfileToUser`) + AUTH-04 UUID stability across re-login
- [ ] `src/lib/db.test.ts` — smoke test: db connection returns non-null (requires test `DATABASE_URL`)
- [ ] Vitest already installed (config exists) — no framework install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full Battle.net OAuth round-trip (redirect → battle.net auth → callback → token exchange) | AUTH-01 | Requires live Blizzard developer credential + real Battle.net login; cannot run in CI without a test credential. Automated scope is limited to `mapProfileToUser` + DB write with a mocked token. | Configure `.env` with real Battle.net client id/secret + redirect URI; click "Sign in with Battle.net"; complete auth on battle.net; confirm return to app recognized by BattleTag. |
| Regional routing (EU / KR / APAC players reach correct auth host) | AUTH-01 | Depends on live regional Battle.net behavior; the global-vs-per-region endpoint question is the Wave 1 spike target. | Spike: attempt sign-in against `https://oauth.battle.net/authorize` from a non-US region context; confirm token + battletag returned. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
