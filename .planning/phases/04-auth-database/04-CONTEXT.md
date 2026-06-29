# Phase 4: Auth & Database - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Battle.net OAuth sign-in (via better-auth) backed by Drizzle + Neon Postgres, with sessions that persist across browser refreshes, and establish the server-side authorization pattern: every server function that reads or writes user data derives the user identity from the server session — never from client input. This phase builds the auth/identity/session foundation and the reusable authorization primitive that every later user-data phase reuses.

**In scope:** Battle.net OAuth via better-auth generic-OAuth plugin; Drizzle ORM + Neon Postgres setup + better-auth schema/migrations; the `users` table with a stable internal UUID + identity fields; session config (cookie persistence, lifetime); the sign-in header UI + signed-in identity display + sign-out; the reusable `authedServerFn` authorization deep module; an automated test proving cross-user access fails.

**Out of scope (own phases):** progress persistence / localStorage merge (Phase 5), self-assessment quizzes (Phase 6), w3champions ladder sync (Phase 7), replay upload/parsing (Phase 8). This phase captures the identity *key* those phases need but builds none of their sync/query features.

</domain>

<decisions>
## Implementation Decisions

### Sign-in & Identity UI (AUTH-01, UI hint=yes)
- **D-01:** Sign-in entry is a **persistent header button** (top-right), always visible over the full-screen graph. Triggers the Battle.net OAuth redirect flow. Single gold-accent CTA consistent with the obsidian+gold design direction (see [[design-direction]]).
- **D-02:** Signed-in state shows **BattleTag + Battle.net avatar + a dropdown** in the header; the dropdown holds sign-out now and is the home for future profile / "Sync with w3champions" links (Phase 7).
- **D-03:** Sign-in is **purely additive** — the graph and all content are fully usable signed-out. Sign-in only unlocks server-side progress persistence. No walls, no gates. (Phase 5 merges pre-login localStorage progress on first sign-in.)

### Identity Data Model (AUTH-04)
- **D-04:** The `users` table progress key is a **stable internal UUID**, never the BattleTag (survives BattleTag display-name changes — AUTH-04). The placeholder `userId: z.string()` in `src/schemas/progress.ts` becomes this UUID in Phase 5.
- **D-05:** Persist a **full identity profile**: UUID + BattleTag + gateway/region + avatar URL + created/updated timestamps. (Not minimal — region + BattleTag are required by Phase 7/8 and a later migration is avoided.)
- **D-06:** **w3champions compatibility is a Phase 4 constraint.** The stored BattleTag MUST be the exact canonical form w3champions queries by (`Name#1234`), and the gateway/region MUST be persisted, so Phase 7 ladder sync and Phase 8 replay auto-pull can resolve a user to their w3champions matches without a re-capture. The *querying itself* is deferred to Phase 7/8; only the correct key is captured here.
- **D-07:** Sign-in supports **all western Battle.net regions (US / EU / KR / APAC; non-China)**; store the user's region/gateway.
- **D-08:** **Refresh BattleTag + avatar on every login** from Battle.net so the display name stays current; the UUID stays stable as the immutable progress key.

### Sessions (AUTH-02)
- **D-09:** Sessions are **30-day rolling** — the window refreshes on activity, expires after 30 days idle. Low-friction for a low-stakes learning app with no sensitive/PII/payment data.
- **D-10:** **Always-persistent** cookie — no "remember me" toggle. The cookie persists for the full window every sign-in (survives browser refresh — AUTH-02).

### Server-Function Authorization (AUTH-03 — the centerpiece)
- **D-11:** Build a **single reusable `authedServerFn` deep module** (factory / middleware): it resolves `getSession()`, injects the authenticated principal (the user UUID) into the handler, and throws a 401 when no valid session exists. Every user-data server function is built on it — one place to audit authorization. Aligns with the project's deep-module discipline.
- **D-12:** Resource ownership is enforced **principal-keyed by construction**: user-data server functions ignore any client-supplied `userId` entirely and key every query by the session principal's UUID. Cross-user access is impossible by design, not by an after-the-fact check (satisfies ROADMAP success criterion 3).
- **D-13:** This phase **includes an automated authorization test**: call a user-data server function with a forged / other user's id and assert it returns the principal's data (or 401), never the forged target. Encodes success criterion 3 as a regression test.

### Architecture discipline
- **D-14:** Extend root `CONTEXT.md` with the new domain terms introduced here (principal, session, BattleTag, gateway/region, account UUID) and record significant choices as ADRs in `docs/adr/` — at minimum an ADR for the `authedServerFn` authorization convention (D-11/D-12) and the better-auth + Battle.net integration. (Per the cross-cutting architecture constraint; numbering follows the existing 001-006 sequence.)

### Claude's Discretion
- **Local dev DB + contributor secrets workflow** — Neon dev branch vs local Docker Postgres, drizzle-kit migration workflow, `.env.example` documentation. User chose to let research/planning decide per deep-module discipline. (OSS contributor onboarding still matters — surface a clear answer in planning.)
- **better-auth schema details** — exact better-auth table set (account, session, verification) and how the custom `users` profile fields attach (better-auth user-table extension vs adjacent table) — Claude's call, constrained by D-04..D-08.
- **Battle.net OAuth host/scope specifics** — which regional authorization endpoints and the minimal scope (BattleTag/`openid`) — confirm during research; D-07 sets the regional breadth.
- **Header dropdown component** — reuse shadcn primitives already installed (button/badge/tooltip; add dropdown-menu via shadcn CLI as needed).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & acceptance bar
- `.planning/ROADMAP.md` §"Phase 4: Auth & Database" — goal + 4 success criteria (the acceptance bar; criterion 1 = `getSession()`→ownership pattern on the first server fn, criterion 3 = cross-user curl test, criterion 4 = UUID progress key).
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-04 (lines ~47-50, §"Auth").
- `.planning/PROJECT.md` — Key Decisions table (Battle.net OAuth for identity; w3champions as a BattleTag-keyed API lookup, not an OAuth provider), constraints, out-of-scope.

### Stack / architecture (authoritative)
- `.claude/CLAUDE.md` — pinned stack + versions: better-auth (Battle.net via generic OAuth plugin, `tanstackStartCookies()`, handler at `src/routes/api/auth/$.ts`), Drizzle 0.44.x, `@neondatabase/serverless`, Neon free tier, Vercel deploy. §"Auth Architecture", §"What NOT to Use" (no Auth.js/Clerk/Supabase Auth/Prisma), §"Version Compatibility", §"Confidence Flags" (better-auth+Battle.net = LOW-MEDIUM, needs 1-2 day spike).
- `docs/adr/001-stack-choice.md` — locks TanStack Start + Drizzle/Neon + better-auth.
- `docs/adr/004-gpl3-licensing.md` — GPL-3.0 / SPDX header convention for new files.
- `.agents/skills/codebase-design/SKILL.md` — deep-module vocabulary; apply to the `authedServerFn` module.
- `.agents/skills/improve-codebase-architecture/SKILL.md` — deepening discipline (cross-cutting constraint).

### Existing code touched/extended
- `src/schemas/progress.ts` — `ProgressRecordSchema.userId` is the Phase-4 identity hook (D-04); `userId` becomes the users-table UUID in Phase 5.
- `CONTEXT.md` (repo root) — domain language; extend with this phase's terms (D-14).
- `docs/adr/` — add ADR(s) for the auth convention + Battle.net integration (D-14); numbering continues from 006.

### Prior context
- `.planning/phases/01-foundation-schema/01-CONTEXT.md` — schema set (incl. progressRecord), patch registry, architecture-foundations decisions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas/progress.ts` (`ProgressRecordSchema`, `MasteryStateSchema`) — already patch-tagged; `userId` field is the slot for the new account UUID.
- `src/components/ui/` (button, badge, tooltip) — shadcn primitives present; add `dropdown-menu` + `avatar` via shadcn CLI for the signed-in header.
- `src/routes/__root.tsx` — root layout where the persistent header / sign-in button mounts.
- `src/lib/patches.ts` — `CURRENT_PATCH` / `PATCH_IDS` for stamping progress (consumed Phase 5, referenced here for the identity→progress wiring).

### Established Patterns
- **No server functions or DB exist yet** — this phase establishes the first `createServerFn` usage and the DB layer. The `authedServerFn` wrapper (D-11) IS the pattern every later phase copies; it must be a clean deep module from commit one.
- TanStack Start 1.168.26, React 19, Zod 4.4.3 (strict mode). better-auth handler mounts at `src/routes/api/auth/$.ts` per CLAUDE.md.
- SPDX `GPL-3.0-or-later` header on every new source file (see `src/schemas/progress.ts` top).

### Integration Points
- better-auth ↔ Drizzle adapter ↔ Neon Postgres (new).
- Session ↔ server functions: `authedServerFn` reads the session cookie server-side and injects the principal.
- Identity ↔ future phases: the UUID keys Phase 5 progress; BattleTag+region key Phase 7 ladder sync and Phase 8 replay auto-pull.

</code_context>

<specifics>
## Specific Ideas

- User emphasized mid-discussion: **"Should work with w3champions games too."** → the captured identity must be the exact key w3champions match/replay endpoints query by. This elevated D-05/D-06 from "store BattleTag" to "store the canonical w3champions-queryable BattleTag + gateway/region" so Phases 7/8 need no identity migration. The sync features stay deferred; only the correct key is a Phase-4 obligation.
- The authorization model should be safe *by construction* (principal-keyed), not by remembering to add a check — reflects the user's deep-module / low-coupling priority.

</specifics>

<deferred>
## Deferred Ideas

- **w3champions ladder sync** (MMR tier, games volume, W/L) — Phase 7. Phase 4 only captures the BattleTag+region key it needs.
- **Replay upload + auto-pull from w3champions** — Phase 8. Same: identity key only.
- **Progress persistence + localStorage merge on first sign-in** — Phase 5. Phase 4 keeps sign-in purely additive so Phase 5's merge has a clean signed-out→signed-in transition.
- **Profile page** (beyond the header dropdown) — future; the dropdown reserves the entry point.
- **Local dev DB + contributor secrets setup** — not deferred to another phase; left to Phase 4 research/planning (Claude's discretion above), but flagged as real OSS-onboarding work to answer concretely in PLAN.

</deferred>

---

*Phase: 4-Auth & Database*
*Context gathered: 2026-06-29*
