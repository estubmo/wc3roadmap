---
phase: 04-auth-database
plan: "02"
subsystem: auth-database-schema
status: complete
tags: [auth, database, drizzle, schema, neon, tdd]
completed: "2026-06-29"
duration: "6m"
tasks_completed: 3
files_changed: 5

dependency_graph:
  requires:
    - 04-01 (drizzle-orm@0.45.2, drizzle-kit@0.31.10, @neondatabase/serverless, drizzle.config.ts)
  provides:
    - src/db/schema.ts (users/sessions/accounts/verifications Drizzle table exports)
    - src/lib/db.ts (db singleton — drizzle+neon-http)
    - src/db/migrations/0000_dapper_gressill.sql (committed migration SQL)
    - live Neon dev DB: user/session/account/verification tables with custom identity columns
  affects:
    - 04-03 (auth.ts imports db from db.ts and schema from db/schema.ts)
    - 04-05 (UserDropdown reads from db.query.users via authedServerFn)
    - Phase 5 (progress records reference users.id as UUID progress key — AUTH-04)
    - Phase 7/8 (battleTag + gateway stored columns support w3champions queries)

tech_stack:
  added:
    - "Drizzle pgTable schema with better-auth column convention"
    - "drizzle-orm/neon-http driver for Vercel Node.js + edge runtimes"
    - "Neon dev branch live tables: user, session, account, verification"
  patterns:
    - "TDD RED/GREEN per task: failing test committed first, then implementation"
    - "getTableName(table) from drizzle-orm for structural table-name assertions"
    - "vi.mock('@neondatabase/serverless') for offline CI db singleton tests"
    - "Module-scope singleton (db.ts) — ES module cache prevents per-request reconnect"

key_files:
  created:
    - src/db/schema.ts
    - src/db/schema.test.ts
    - src/lib/db.ts
    - src/lib/db.test.ts
    - src/db/migrations/0000_dapper_gressill.sql
    - src/db/migrations/meta/_journal.json
    - src/db/migrations/meta/0000_snapshot.json
  modified: []

decisions:
  - "users table exports as 'users' (JS) but DB table name is 'user' (better-auth convention)"
  - "Custom columns battleTag/gateway/bnetSub use camelCase DB column names to match better-auth additionalFields keys"
  - "avatarUrl is nullable (Pitfall 2: Battle.net OAuth has no avatar endpoint — generated avatar in Plan 04-03)"
  - "gateway NOT NULL despite not coming from OAuth (Pitfall 1: captured via UI region selector in Plan 04-05)"
  - "users.id left as text() without DB-level UUID default — better-auth always provides ID; UUID enforcement done via auth.ts generateId config in Plan 04-03"
  - "getTableName() from drizzle-orm used in tests instead of symbol introspection — public API, version-stable"
  - "Drizzle relations exported (usersRelations, sessionsRelations, accountsRelations) for relational query builder"

metrics:
  duration: "6m"
  completed: "2026-06-29"
  tasks: 3
  files: 7
---

# Phase 04 Plan 02: Drizzle Schema + DB Singleton + Live Schema Push Summary

**One-liner:** Defined better-auth Drizzle schema (4 tables + custom identity fields), authored offline-testable db singleton, and pushed schema to live Neon dev branch with all tables verified in the DB.

## What Was Built

### Task 1: Drizzle schema with better-auth tables + custom identity fields

`src/db/schema.ts` defines four `pgTable` exports matching better-auth's Drizzle adapter column expectations (from Context7 authoritative source: `auth-schema-pg-enum.txt`):

| JS Export | DB Table | Key Custom Columns |
|-----------|----------|--------------------|
| `users` | `user` | `battleTag` NOT NULL, `gateway` NOT NULL, `bnetSub` NOT NULL, `avatarUrl` NULL |
| `sessions` | `session` | `expiresAt`, `token` unique, `userId` FK→user.id (CASCADE) |
| `accounts` | `account` | `accountId`, `providerId`, `userId` FK→user.id (CASCADE) |
| `verifications` | `verification` | `identifier`, `value`, `expiresAt` |

**AUTH-04 stable UUID progress key:** `users.id` is the stable internal UUID. It is permanently decoupled from the mutable BattleTag — display-name changes never orphan a player's progress record. UUID format enforcement is configured in `auth.ts` (Plan 04-03) via `generateId: () => crypto.randomUUID()`.

**D-06 constraint documented:** `battleTag` JSDoc states it is the exact key w3champions queries by (`Name#1234` format). Must not be used as the progress key.

**Pitfall 2 addressed:** `avatarUrl` is nullable. Battle.net OAuth provides no avatar endpoint; a generated avatar will be populated in Plan 04-03.

**Pitfall 1 acknowledged:** `gateway` is NOT NULL but not returned by OAuth. It is captured via a UI region selector (Plan 04-05) before the OAuth redirect.

Drizzle relations exported for relational query builder: `usersRelations`, `sessionsRelations`, `accountsRelations`.

**TDD flow:** `schema.test.ts` (20 tests) written and committed as RED before `schema.ts` existed. Tests use `getTableName()` from `drizzle-orm` (not symbol introspection) to check DB table names. All 20 tests pass GREEN.

### Task 2: Database singleton + connection smoke test

`src/lib/db.ts` is a three-line singleton following the `patches.ts` module-singleton pattern:

```typescript
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

`src/lib/db.test.ts` (3 tests) runs offline by mocking `@neondatabase/serverless`:
1. `db` is defined after import
2. `db.query.users` exists (schema wired into relational query builder)
3. Two imports return the same reference (ES module singleton)

**TDD flow:** `db.test.ts` committed as RED first (3 failing). `db.ts` created GREEN; all 3 tests pass.

### Task 3: [BLOCKING] Schema pushed to live Neon dev branch

Generated committed migration SQL:
- `src/db/migrations/0000_dapper_gressill.sql` — CREATE TABLE statements for all 4 tables, FK constraints, 3 indexes

Ran `drizzle-kit push` against DATABASE_URL_DIRECT (non-pooled). Output: `[✓] Changes applied`.

**Live DB verification (queried Neon dev branch directly):**
```
Tables: account, session, user, verification — ALL PRESENT
user columns: id(nn), name(nn), email(nn), email_verified(nn), image(null),
              created_at(nn), updated_at(nn),
              battleTag(nn), gateway(nn), bnetSub(nn), avatarUrl(null)
Custom identity columns: VERIFIED — battleTag/gateway/bnetSub NOT NULL, avatarUrl nullable
```

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 RED: failing schema tests | 8db2a65 | src/db/schema.test.ts |
| Task 1 GREEN: schema.ts | 29a3521 | src/db/schema.ts, src/db/schema.test.ts |
| Task 2 RED: failing db tests | 4794120 | src/lib/db.test.ts |
| Task 2 GREEN: db.ts singleton | 2b55d58 | src/lib/db.ts |
| Task 3: migration + push | f586e2a | src/db/migrations/ (3 files) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test used symbol introspection for table name; replaced with `getTableName()`**
- **Found during:** Task 1 GREEN (tests failed on table-name assertions after schema.ts created)
- **Issue:** Initial tests accessed `table._?.name` (internal Drizzle symbol), which returned `undefined` in Drizzle 0.45.2 — the table name moved to `Symbol(drizzle:Name)`, not `._`
- **Fix:** Imported `getTableName` from `drizzle-orm` — the public API for this; confirmed works with 0.45.2
- **Files modified:** `src/db/schema.test.ts`
- **Commit:** 29a3521 (included in GREEN commit)

All other plan directives executed exactly as specified.

## Known Stubs

None. All files are complete for their stated purpose in this plan:
- `gateway: text("gateway").notNull()` accepts any string (no enum constraint in DB). The "us" | "eu" | "kr" constraint will be enforced at the application layer in auth.ts (Plan 04-03). This is intentional, not a stub.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | src/lib/db.ts | DATABASE_URL read at module scope — correct (server-only file), but consumers must never import this into client bundles. Documented in JSDoc. |

T-04-02b (information_disclosure) addressed: `db.ts` is server-only, contains JSDoc warning against client-side import. DATABASE_URL never bundled into client.

T-04-02c (spoofing via users.id) addressed: AUTH-04 stable UUID documented in both schema.ts JSDoc and this summary. Plan 04-03 configures `generateId` to ensure UUID format.

T-04-02a (SQL injection): no raw SQL string interpolation in schema.ts — Drizzle parameterized queries only. Applied.

## Self-Check: PASSED

- `src/db/schema.ts` exists with `export const users/sessions/accounts/verifications`
- `src/lib/db.ts` exists with `export const db`
- `src/lib/db.test.ts` exists — 3/3 pass offline
- `src/db/schema.test.ts` exists — 20/20 pass
- `src/db/migrations/0000_dapper_gressill.sql` exists
- 218 total tests pass; `npm run typecheck` clean
- Live Neon DB: user/session/account/verification tables verified with correct columns
- Commits 8db2a65, 29a3521, 4794120, 2b55d58, f586e2a confirmed in git log
- No secrets printed or committed
