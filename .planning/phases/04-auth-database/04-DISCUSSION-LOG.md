# Phase 4: Auth & Database - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 4-Auth & Database
**Areas discussed:** Sign-in & identity UI, Identity data model, Session lifetime & persistence, Auth authorization module shape

---

## Sign-in & Identity UI

### Sign-in entry
| Option | Description | Selected |
|--------|-------------|----------|
| Persistent header button | Top-right, always visible over the full-screen graph; gold-accent CTA | ✓ |
| Dedicated /login route | Separate page; navigates away from the graph | |
| Modal from a CTA | Dialog; awkward with better-auth redirect flow | |

### Signed-in UI
| Option | Description | Selected |
|--------|-------------|----------|
| BattleTag + avatar + dropdown | Avatar + BattleTag, dropdown holds sign-out + future profile/sync | ✓ |
| BattleTag text + sign-out | No avatar | |
| Avatar only | Compact | |

### Gating
| Option | Description | Selected |
|--------|-------------|----------|
| Purely additive | Fully usable signed-out; sign-in only unlocks progress persistence | ✓ |
| Soft prompt | Nudge after marking progress | |

**Notes:** Sign-in stays additive so Phase 5's localStorage→server merge has a clean transition. Dropdown reserves the entry point for the Phase 7 "Sync with w3champions" link.

---

## Identity Data Model

### Regions
| Option | Description | Selected |
|--------|-------------|----------|
| All western regions (US/EU/KR) | Widest reach; matches w3champions global base; store region | ✓ |
| EU + US only | Defer KR/APAC | |
| You decide | Let research pick broadest safe set | |

### User fields
| Option | Description | Selected |
|--------|-------------|----------|
| UUID + BattleTag + region + avatar + timestamps | Full profile; avoids later migration | ✓ |
| UUID + BattleTag only | Minimal; needs migration for Phase 7 | |
| You decide | better-auth defaults + Phase 7 minimum | |

### BattleTag refresh
| Option | Description | Selected |
|--------|-------------|----------|
| Refresh on every login | Re-pull BattleTag + avatar each sign-in; UUID stays stable | ✓ |
| Capture once at signup | Can drift stale on rename | |

**Notes:** User added "Should work with w3champions games too" — elevated the requirement to storing the *canonical w3champions-queryable BattleTag + gateway/region* so Phases 7/8 need no identity migration. Sync features remain deferred; only the correct key is a Phase-4 obligation.

---

## Session Lifetime & Persistence

### Duration
| Option | Description | Selected |
|--------|-------------|----------|
| 30-day rolling | Refreshes on activity; minimal re-login friction | ✓ |
| 7-day rolling | better-auth default | |
| Session-only | Expires on browser close; high friction | |

### Persistence
| Option | Description | Selected |
|--------|-------------|----------|
| Always persistent | No toggle; full window every sign-in | ✓ |
| Remember-me toggle | User chooses persistent vs session | |

**Notes:** Low security stakes (no PII/payment data) justify long-lived, always-persistent sessions.

---

## Auth Authorization Module Shape

### Auth module
| Option | Description | Selected |
|--------|-------------|----------|
| Reusable authed wrapper (deep module) | `authedServerFn` resolves session, injects principal, throws 401 | ✓ |
| Manual getSession() per function | Repetitive, easy to forget, weaker for AUTH-03 | |

### Ownership
| Option | Description | Selected |
|--------|-------------|----------|
| Principal-keyed by construction | Client userId ignored; queries keyed by session UUID | ✓ |
| Explicit ownership assert | Assert resource belongs to principal | |

### Auth test
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — lock it with a test | Integration test: forged userId returns principal's data / 401 | ✓ |
| Manual verification only | No regression test | |

**Notes:** Authorization is safe by construction, not by remembering a check — reflects the deep-module / low-coupling priority. The test encodes ROADMAP success criterion 3.

---

## Claude's Discretion

- Local dev DB + contributor secrets workflow (Neon dev branch vs local Docker Postgres, drizzle-kit migration flow, `.env.example`) — user chose "ready for context"; left to research/planning, flagged as real OSS-onboarding work to answer in PLAN.
- better-auth schema details (account/session/verification tables; how custom profile fields attach).
- Battle.net OAuth host/scope specifics (regional endpoints, minimal BattleTag scope).
- Header dropdown component (reuse shadcn primitives; add dropdown-menu/avatar via CLI).

## Deferred Ideas

- w3champions ladder sync — Phase 7.
- Replay upload + auto-pull — Phase 8.
- Progress persistence + localStorage merge — Phase 5.
- Profile page beyond the header dropdown — future.
