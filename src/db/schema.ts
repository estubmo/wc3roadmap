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
     * Signal source — "manual" | "auto" (D-04).
     *
     * Server-side only: stamped by the 05-04 setNodeMastery server fn.
     * Never accepted from client input. Defaults to "manual"; Phase 7
     * w3champions auto-detection will write "auto".
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
