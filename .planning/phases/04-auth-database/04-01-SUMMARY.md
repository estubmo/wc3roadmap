---
phase: 04-auth-database
plan: "01"
subsystem: auth-database-bootstrap
status: complete
tags: [auth, database, drizzle, shadcn, bootstrap]
completed: "2026-06-29"
duration: "5m"
tasks_completed: 3
files_changed: 7

dependency_graph:
  requires: []
  provides:
    - better-auth@1.6.22 installed
    - drizzle-orm@0.45.2 installed
    - drizzle-kit@0.31.10 installed
    - "@neondatabase/serverless@1.1.0 installed"
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/avatar.tsx
    - src/components/ui/dialog.tsx
    - drizzle.config.ts
    - .env.example
  affects:
    - 04-02 (schema push needs drizzle.config.ts + DATABASE_URL_DIRECT)
    - 04-03 (auth wiring needs better-auth + shadcn primitives)
    - All Phase 4 plans (pinned toolchain foundation)

tech_stack:
  added:
    - "better-auth@1.6.22 — authentication framework"
    - "drizzle-orm@0.45.2 — ORM for PostgreSQL"
    - "drizzle-kit@0.31.10 — schema migrations CLI"
    - "@neondatabase/serverless@1.1.0 — Neon HTTP driver"
    - "shadcn: dropdown-menu, avatar, dialog primitives"
  patterns:
    - "Exact-pinned deps (no ^ or ~) per ADR-001 convention"
    - "DATABASE_URL_DIRECT (non-pooled) for drizzle-kit; DATABASE_URL (pooled) for app"

key_files:
  created:
    - drizzle.config.ts
    - .env.example
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/avatar.tsx
    - src/components/ui/dialog.tsx
  modified:
    - package.json
    - package-lock.json
    - .claude/CLAUDE.md
    - docs/adr/001-stack-choice.md

decisions:
  - "drizzle-orm pinned to 0.45.2 (not 0.44.x from CLAUDE.md) per RESEARCH Pitfall 6 + better-auth adapter compatibility"
  - "drizzle-kit pinned to 0.31.10 (not 0.25.x from CLAUDE.md) per RESEARCH Pitfall 6"
  - "DATABASE_URL_DIRECT used in drizzle.config.ts (non-pooled) per RESEARCH Pitfall 5"
  - "shadcn add used for all three primitives — no hand-editing generated files"
  - ".env.example holds placeholder values only — no real secrets committed"

metrics:
  duration: "5m"
  completed: "2026-06-29"
  tasks: 3
  files: 7
---

# Phase 04 Plan 01: Bootstrap Packages, Primitives, and Config Summary

**One-liner:** Installed exact-pinned better-auth@1.6.22 + drizzle@0.45.2/drizzle-kit@0.31.10 + Neon driver; added shadcn dropdown-menu/avatar/dialog; authored drizzle.config.ts (non-pooled migrations) and .env.example (contributor template).

## What Was Built

### Task 1: Install pinned auth + database packages

Installed all four packages at exact pinned versions per RESEARCH.md §"Standard Stack" and Pitfall 6 (drizzle version drift):

| Package | Version |
|---------|---------|
| `better-auth` | 1.6.22 |
| `drizzle-orm` | 0.45.2 |
| `drizzle-kit` | 0.31.10 |
| `@neondatabase/serverless` | 1.1.0 |

Versions were exact-pinned (no `^` or `~`) in package.json, consistent with ADR-001 convention. CLAUDE.md version table updated for drizzle-orm, drizzle-kit, neondatabase/serverless, and better-auth rows. ADR-001 received a Changelog section recording the drizzle version drift correction (0.44.x → 0.45.2; 0.25.x → 0.31.10).

`npm ls` confirms no UNMET peer dependencies.

### Task 2: Add shadcn dropdown-menu, avatar, and dialog primitives

Ran `npx shadcn add dropdown-menu avatar dialog --yes`. All three files created at `src/components/ui/`:

- `dropdown-menu.tsx` — used by UserDropdown (Plan 04-05)
- `avatar.tsx` — used by UserDropdown (Plan 04-05)
- `dialog.tsx` — available for future use (region selector, etc.)

`npm run typecheck` and all 195 tests pass after the additions.

### Task 3: Author drizzle.config.ts and .env.example

`drizzle.config.ts` created at project root:
- Schema: `./src/db/schema.ts` (to be created in Plan 04-02)
- Output: `./src/db/migrations`
- Dialect: `postgresql`
- `dbCredentials.url`: reads from `DATABASE_URL_DIRECT` (non-pooled)
- Inline comment explaining Pitfall 5 (pooled pgbouncer breaks migrations)

`.env.example` created with all 7 documented keys:
- `BETTER_AUTH_SECRET` — with generation instruction
- `BETTER_AUTH_URL` — with dev/prod guidance
- `BNET_CLIENT_ID` / `BNET_CLIENT_SECRET` — with dashboard link
- `DATABASE_URL` — pooled, for app runtime
- `DATABASE_URL_DIRECT` — non-pooled, for drizzle-kit
- `VITE_APP_URL` — public client URL

All values are placeholders only. No real secrets committed or present. `.gitignore` already excludes `.env`, `.env.local`, `.env.*.local`; `.env.example` is correctly not excluded and was committed.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Install packages + update docs | 3fdaedd | package.json, package-lock.json, .claude/CLAUDE.md, docs/adr/001-stack-choice.md |
| Task 2: shadcn primitives | 6c018d0 | src/components/ui/avatar.tsx, dialog.tsx, dropdown-menu.tsx |
| Task 3: drizzle.config.ts + .env.example | 4e328fa | drizzle.config.ts, .env.example |

## Deviations from Plan

None — plan executed exactly as written.

The plan's verify script checked for `drizzle-orm` version `0.45.x` via `.includes('0.45')`. Initial npm install added `^` prefix in package.json; pins were corrected to exact versions (`0.45.2`, `0.31.10`, `1.6.22`, `1.1.0`) inline with ADR-001's no-caret convention before commit.

## Known Stubs

None. All files are complete for their stated purpose in this plan:
- `drizzle.config.ts` references `./src/db/schema.ts` which does not exist yet (created in Plan 04-02 — intentional forward reference, not a stub)
- `.env.example` has empty placeholder values by design

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced in this plan. The package installs were pre-vetted in RESEARCH §"Package Legitimacy Audit" (both drizzle SUS flags were confirmed false positives). No new threat surface beyond what the threat model already covers.

## Self-Check: PASSED

- `drizzle.config.ts` exists and references DATABASE_URL_DIRECT
- `.env.example` contains all 7 required keys with placeholder values
- `src/components/ui/dropdown-menu.tsx`, `avatar.tsx`, `dialog.tsx` exist
- Commits 3fdaedd, 6c018d0, 4e328fa confirmed in git log
- `npm run typecheck` passes; 195 tests pass
- No secrets in any committed file
