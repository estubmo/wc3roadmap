// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Drizzle ORM schema — identity tables for Phase 4 (auth + database).
 *
 * Phase 4 scope: auth identity tables only (user, session, account, verification).
 * Phase 5 writes progress records that reference users.id as the stable UUID
 * progress key (AUTH-04).
 *
 * The four tables are required by better-auth's Drizzle adapter. Each JS export
 * name (users, sessions, accounts, verifications) maps to its DB table name
 * per better-auth's convention ("user", "session", "account", "verification").
 * Custom identity fields (battleTag, gateway, bnetSub, avatarUrl) extend the
 * user table per D-05 / D-06 / D-07.
 *
 * All consumers should use `import * as schema from "#/db/schema"` so that
 * Drizzle's relational query builder can resolve relations at runtime.
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// users (DB table name: "user" — better-auth convention)
// ---------------------------------------------------------------------------

/**
 * User identity record.
 *
 * The stable internal UUID in `id` is the progress key used by all Phase 5+
 * progress records (AUTH-04). It is permanently decoupled from the mutable
 * BattleTag — display-name changes never orphan a player's progress history.
 *
 * Custom columns (battleTag, gateway, bnetSub, avatarUrl) satisfy the D-05/D-06
 * identity contract required for Phase 7/8 w3champions integration.
 */
export const users = pgTable("user", {
  /**
   * Stable internal UUID — the progress key (AUTH-04).
   *
   * better-auth generates this ID via its own generator. In auth.ts (Plan 04-03)
   * better-auth is configured with `generateId: () => crypto.randomUUID()` to
   * guarantee UUID v4 format. This column accepts any text; the UUID guarantee
   * lives in the application layer, not the DB constraint.
   */
  id: text("id").primaryKey(),

  /**
   * Display name — set to the player's BattleTag (e.g. "Player#1234") on sign-in.
   * Refreshed on every login per D-08 (overrideUserInfo: true in auth.ts).
   */
  name: text("name").notNull(),

  /**
   * Battle.net account email. May be unavailable depending on OAuth scope;
   * better-auth requires this field so it is declared NOT NULL but may be
   * an empty string if the scope omits it.
   */
  email: text("email").notNull().unique(),

  /** Whether the email address has been verified by better-auth. */
  emailVerified: boolean("email_verified").default(false).notNull(),

  /**
   * Built-in better-auth image/avatar field (nullable).
   * Battle.net OAuth does NOT expose avatar URLs (Pitfall 2 in RESEARCH.md).
   * In auth.ts (Plan 04-03) this is populated with a generated avatar URL
   * (e.g. DiceBear initials) derived from the BattleTag.
   */
  image: text("image"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),

  // ---------------------------------------------------------------------------
  // Custom identity fields (D-05 / D-06 / D-07)
  // ---------------------------------------------------------------------------

  /**
   * Canonical BattleTag in "Name#1234" format (D-06).
   *
   * This is the EXACT key that w3champions queries by in Phase 7 / Phase 8.
   * Refreshed on every login (overrideUserInfo: true, D-08) so display-name
   * changes stay current without breaking the progress record (which keys on `id`).
   *
   * MUST NOT be used as the progress key — `id` (UUID) is the progress key (AUTH-04).
   */
  battleTag: text("battleTag").notNull(),

  /**
   * Battle.net region/gateway — "us" | "eu" | "kr" (D-05 / D-07).
   *
   * Not returned by the Battle.net OAuth userinfo endpoint (Pitfall 1 in RESEARCH.md).
   * Captured via a UI region selector before the OAuth redirect (Plan 04-05) and
   * stored here so Phase 7 / Phase 8 can resolve the player's w3champions profile
   * without re-prompting for region on every session.
   */
  gateway: text("gateway").notNull(),

  /**
   * Stable Battle.net account sub from the OAuth userinfo response.
   *
   * Used for deduplication across re-authentications: if the same Battle.net
   * account is used from multiple regions (e.g. US then EU), `bnetSub` identifies
   * it as the same player and avoids creating duplicate user rows.
   */
  bnetSub: text("bnetSub").notNull(),

  /**
   * Generated avatar URL (nullable — Pitfall 2 in RESEARCH.md).
   *
   * Battle.net OAuth does not expose avatar images. Populated during sign-in
   * (Plan 04-03) with a deterministic generated avatar (DiceBear initials API
   * seeded from the BattleTag). Nullable so the field degrades gracefully if
   * the generated avatar service is unavailable.
   */
  avatarUrl: text("avatarUrl"),
});

// ---------------------------------------------------------------------------
// sessions (DB table name: "session")
// ---------------------------------------------------------------------------

/**
 * better-auth session records.
 *
 * Sessions are 30-day rolling windows (D-09): the `expiresAt` is extended on
 * each activity refresh (configured via session.updateAge in auth.ts, Plan 04-03).
 * The session token is stored in an always-persistent cookie (D-10).
 */
export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),

    /** Session expiry timestamp — 30-day rolling window refreshed on activity (D-09). */
    expiresAt: timestamp("expires_at").notNull(),

    /** Unique session token stored in the always-persistent session cookie (D-10). */
    token: text("token").notNull().unique(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),

    /** Client IP address for audit/security purposes (nullable). */
    ipAddress: text("ip_address"),

    /** Client user-agent string for audit/security purposes (nullable). */
    userAgent: text("user_agent"),

    /** FK → users.id — cascades on user deletion. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// accounts (DB table name: "account")
// ---------------------------------------------------------------------------

/**
 * better-auth OAuth account records — one per OAuth provider per user.
 *
 * For this project, each user has a single account row with
 * providerId = "battlenet". Stores the OAuth access/refresh tokens
 * so better-auth can refresh the session without re-prompting.
 */
export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),

    /** Provider-specific account identifier — the Battle.net `sub` claim. */
    accountId: text("account_id").notNull(),

    /** OAuth provider identifier — "battlenet" for Battle.net sign-in. */
    providerId: text("provider_id").notNull(),

    /** FK → users.id — cascades on user deletion. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    /** Hashed password — unused for OAuth-only sign-in; included for better-auth schema compatibility. */
    password: text("password"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// verifications (DB table name: "verification")
// ---------------------------------------------------------------------------

/**
 * better-auth email/token verification records.
 *
 * Used internally by better-auth for email verification flows and
 * one-time token operations. Not directly queried by application code.
 */
export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Relations (Drizzle relational query builder wiring)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  nodeProgress: many(nodeProgress),
  quizProgress: many(quizProgress),
  w3championsSync: many(w3championsSync),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// nodeProgress (DB table name: "node_progress")
// ---------------------------------------------------------------------------

/**
 * Per-user node mastery progress record.
 *
 * Design: surrogate text PK + unique index on (userId, nodeId) — the unique
 * index is the `onConflictDoUpdate` target for the 05-04 `setNodeMastery`
 * upsert. One row per user-node pair; inserting twice updates in place.
 *
 * `masteryState` is stored as plain TEXT (not pgEnum) because the canonical
 * value `"in-progress"` contains a hyphen that breaks pgEnum DDL quoting
 * (RESEARCH.md Pitfall 1). Validation lives in `MasteryStateSchema` (Zod) at
 * the app layer, not in the database.
 *
 * `source` (D-04): "manual" | "auto" — stamped server-side; never from client
 * input. Defaults to "manual"; future Phase 7 auto-detection writes "auto".
 *
 * `patchId` (D-05): stamped from CURRENT_PATCH.id by the 05-04 server fn.
 * Designed in now so patch versioning is a first-class column from day one,
 * avoiding a Phase-7 migration later.
 *
 * FK to users.id with onDelete cascade — deleting a user removes all their
 * progress rows (T-05-03b: prevents orphaned cross-user data).
 */
export const nodeProgress = pgTable(
  "node_progress",
  {
    /** Surrogate text PK — matches the project convention (users.id, sessions.id). */
    id: text("id").primaryKey(),

    /** FK → users.id — the stable UUID progress key (AUTH-04). Cascades on delete. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Content node identifier — matches the node `id` field in the content schema. */
    nodeId: text("node_id").notNull(),

    /**
     * Mastery state value — "untouched" | "in-progress" | "mastered".
     *
     * Stored as TEXT (not pgEnum) — the hyphen in "in-progress" causes DDL
     * quoting issues with pgEnum. Validated at the app layer via MasteryStateSchema.
     */
    masteryState: text("mastery_state").notNull(),

    /**
     * Signal source — "manual" | "auto" | "quiz" | "replay" (D-01/D-04).
     *
     * Server-side only: stamped by the writing server fn (never accepted from
     * client input). Defaults to "manual". Phase 7 w3champions auto-detection
     * writes "auto"; Phase 6 quiz-pass writes "quiz"; Phase 8 `.w3g` replay
     * parsing writes "replay" (D-01). Stored as plain TEXT (not pgEnum) so new
     * source values never require a DDL change — validation of the full set
     * lives in `ProgressRecordSchema` (Zod) at the app layer.
     */
    source: text("source").notNull().default("manual"),

    /**
     * Patch version when this record was last written (D-05).
     *
     * Stamped from CURRENT_PATCH.id by the 05-04 server fn. Enables future
     * patch-aware mastery resets or migrations without schema changes.
     */
    patchId: text("patch_id").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    /**
     * Unique index on (userId, nodeId) — the `onConflictDoUpdate` upsert target
     * for `setNodeMastery` in 05-04. Enforces one row per user-node pair and
     * prevents duplicate/conflicting rows (T-05-03a).
     */
    uniqueIndex("progress_user_node_unique").on(table.userId, table.nodeId),
    /** Covering index on userId for efficient bulk-fetch of all progress rows for a user. */
    index("progress_userId_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Relations — nodeProgress
// ---------------------------------------------------------------------------

export const nodeProgressRelations = relations(nodeProgress, ({ one }) => ({
  user: one(users, {
    fields: [nodeProgress.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// quizProgress (DB table name: "quiz_progress")
// ---------------------------------------------------------------------------

/**
 * Per-user quiz attempt record — the SRS tracking counterpart to nodeProgress.
 *
 * Design intent: `nodeProgress` is the mastery-state record (what the graph
 * displays); `quizProgress` is the SRS tracking record (what a future
 * spaced-repetition scheduler needs). Keeping them separate avoids coupling
 * the mastery display to the quiz retention model (D-07/D-08).
 *
 * The unique index on (userId, nodeId) is the `onConflictDoUpdate` upsert
 * target for the 06-05 `recordQuizPass` server fn — one row per user-node
 * pair; re-attempts update in place.
 *
 * `passed` / `lastAttemptAt` / `attemptCount` are updated on every attempt.
 * `lapseCount` increments on a failed re-attempt AFTER the first pass — an
 * FSRS forward hook. It CANNOT be reconstructed from `attemptCount` retroactively
 * because a lapse requires knowing which prior state was "passed". Designed in
 * now so the future scheduler has the seed data it needs (D-08).
 *
 * FK to users.id with onDelete cascade — deleting a user removes all their
 * quiz progress rows (T-06-04: prevents orphaned cross-user data).
 */
export const quizProgress = pgTable(
  "quiz_progress",
  {
    /** Surrogate text PK — matches the project convention (users.id, sessions.id, nodeProgress.id). */
    id: text("id").primaryKey(),

    /** FK → users.id — the stable UUID progress key (AUTH-04). Cascades on delete. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Content node identifier — matches the node `id` field in the content schema. */
    nodeId: text("node_id").notNull(),

    /**
     * Whether the most recent quiz attempt resulted in a pass.
     *
     * True when the player met the PASS_THRESHOLD for the question count.
     * Resets to false on a lapse (failed re-attempt after a prior pass).
     */
    passed: boolean("passed").notNull().default(false),

    /**
     * Timestamp of the most recent quiz attempt (pass or fail).
     *
     * Updated on every attempt — used by a future SRS scheduler to compute
     * the next review interval (D-08).
     */
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),

    /**
     * Total number of quiz attempts (pass + fail) for this node.
     *
     * Incremented on every attempt. Used alongside `lapseCount` to derive
     * the player's raw quiz history without storing per-attempt rows.
     */
    attemptCount: integer("attempt_count").notNull().default(0),

    /**
     * Number of failed re-attempts AFTER the first successful pass — an FSRS
     * forward hook (D-08).
     *
     * CRITICAL: cannot be reconstructed retroactively from `attemptCount`
     * because a lapse requires knowing which prior attempt was the first pass.
     * Designed in now so the future FSRS scheduler has the seed data it needs.
     * Incremented by `recordQuizAttempt` (06-05) on fail when `passed = true`.
     */
    lapseCount: integer("lapse_count").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    /**
     * Unique index on (userId, nodeId) — the `onConflictDoUpdate` upsert target
     * for `recordQuizPass` in 06-05. Enforces one row per user-node pair.
     */
    uniqueIndex("quiz_progress_user_node_unique").on(table.userId, table.nodeId),
    /** Covering index on userId for efficient per-user quiz progress lookups (T-06-05). */
    index("quiz_progress_userId_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Relations — quizProgress
// ---------------------------------------------------------------------------

export const quizProgressRelations = relations(quizProgress, ({ one }) => ({
  user: one(users, {
    fields: [quizProgress.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// w3championsSync (DB table name: "w3champions_sync")
// ---------------------------------------------------------------------------

/**
 * Per-user w3champions ladder-sync cache — the durable TTL gate behind
 * criterion 3 / AUTO-04.
 *
 * Design: single-row cache — exactly ONE row per user, enforced by a unique
 * index on `userId` ALONE (unlike `nodeProgress`/`quizProgress`, which key on
 * (userId, nodeId)). This is the `onConflictDoUpdate` target for the 07-07
 * `syncW3champions` handler. The surrogate text PK matches the project
 * convention (users.id, nodeProgress.id).
 *
 * `lastSyncedAt` is the authoritative rate-limit gate — NOT TanStack Query's
 * `staleTime`. Because this row lives in the DB it survives across browser
 * tabs and devices, so the TTL check in 07-07 cannot be bypassed by opening a
 * fresh tab (RESEARCH: Alternatives Considered / AUTO-04, criterion 3).
 *
 * `mmrTier` is NULLABLE (D-10c): null = unranked / no ladder data this season.
 * A player with a valid sync but no ranked games still gets a cache row so the
 * TTL gate holds; the tier is simply absent.
 *
 * `gamesPlayed` is NOT NULL (defaults to 0) — the games-played auto-detect
 * signal always has a concrete count once a sync completes.
 *
 * FK to users.id with onDelete cascade — deleting a user removes their sync
 * cache row (T-07-02b: no orphaned cross-user cache data; IDOR impossible by
 * construction via principal-keyed queries in 07-07).
 */
export const w3championsSync = pgTable(
  "w3champions_sync",
  {
    /** Surrogate text PK — matches the project convention (users.id, nodeProgress.id). */
    id: text("id").primaryKey(),

    /** FK → users.id — the stable UUID progress key (AUTH-04). Cascades on delete. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /**
     * Detected MMR tier id (from mmr-tiers.ts ordinal registry) — NULLABLE.
     *
     * null = unranked / no ladder data this season (D-10c). Stored as TEXT
     * following the same text()-over-pgEnum convention as nodeProgress.source
     * (schema.ts Pitfall 1) — validation lives at the app layer.
     */
    mmrTier: text("mmr_tier"),

    /** Games played this season — the games-played auto-detect signal. */
    gamesPlayed: integer("games_played").notNull().default(0),

    /**
     * Timestamp of the last successful w3champions sync — the durable TTL
     * source of truth (AUTO-04 / criterion 3).
     *
     * The 07-07 sync handler compares now() against this value against the
     * rate-limit window; because it lives in the DB it survives across devices
     * and tabs, unlike TanStack Query staleTime.
     */
    lastSyncedAt: timestamp("last_synced_at").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    /**
     * Unique index on `userId` ALONE — enforces exactly one cache row per user
     * (single-row cache). This is the `onConflictDoUpdate` upsert target for
     * the 07-07 `syncW3champions` handler (T-07-02a).
     */
    uniqueIndex("w3c_sync_user_unique").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Relations — w3championsSync
// ---------------------------------------------------------------------------

export const w3championsSyncRelations = relations(w3championsSync, ({ one }) => ({
  user: one(users, {
    fields: [w3championsSync.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// replayAnalysis (DB table name: "replay_analysis")
// ---------------------------------------------------------------------------

/**
 * Global `.w3g` replay signal cache — the physical backing for the D-17
 * cache gate ("a replay with a known gameId is never re-parsed").
 *
 * Design: surrogate text PK + single-column unique index on `gameId` ALONE —
 * mirrors the `w3championsSync` single-row-cache shape (lines above) but the
 * cache is GLOBAL, not per-user (D-17): a gameId is a public match identifier,
 * so any user pulling/uploading the same replay reuses the same cached row.
 * This is the `onConflictDoNothing`/lookup target for the 08-11 server write
 * path — parse-then-cache, never re-parse a known gameId.
 *
 * `signals` stores the JSON-stringified `ReplaySignals` object as `text()`,
 * following the project's text()-over-structured-column convention (see
 * `nodeProgress.masteryState`/`source`). CRITICAL: this table stores derived
 * signals ONLY — never the raw `.w3g` file bytes (RESEARCH.md anti-pattern;
 * T-08-06a mitigation — no redistribution/PII-in-binary ambiguity, bounded
 * storage growth).
 *
 * `buildNumber` (D-12) is the raw WC3 header build number as reported by the
 * replay itself; `patchId` is the resolved patch entry (via `getPatch`/the
 * object-ID map version lookup). Both are stored — buildNumber is the
 * immutable source fact, patchId is the derived/resolved value — so a future
 * re-resolution (e.g. a patch boundary correction) never requires re-parsing.
 */
export const replayAnalysis = pgTable(
  "replay_analysis",
  {
    /** Surrogate text PK — matches the project convention (users.id, nodeProgress.id, w3championsSync.id). */
    id: text("id").primaryKey(),

    /** Public w3champions match identifier — the D-17 global cache key. */
    gameId: text("game_id").notNull(),

    /**
     * JSON-stringified `ReplaySignals` — derived mechanical signals only.
     *
     * Never the raw `.w3g` bytes (RESEARCH.md anti-pattern; T-08-06a).
     * Follows the text()-over-structured-column convention used elsewhere
     * in this schema (`masteryState`, `source`, `mmrTier`).
     */
    signals: text("signals").notNull(),

    /** Resolved patch id (via `getPatch`) at parse time — D-12. */
    patchId: text("patch_id").notNull(),

    /** Raw WC3 replay header build number (D-12) — the immutable source fact behind `patchId`. */
    buildNumber: integer("build_number").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    /**
     * Unique index on `gameId` ALONE — global cache per D-17 (NOT per-user,
     * unlike `nodeProgress`/`quizProgress`'s (userId, nodeId) keying). This is
     * the cache-gate lookup/upsert target for the 08-11 server write path.
     */
    uniqueIndex("replay_analysis_game_id_unique").on(table.gameId),
  ],
);
