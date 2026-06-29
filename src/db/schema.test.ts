// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for src/db/schema.ts (AUTH-01, AUTH-04).
 *
 * Structural checks that the Drizzle table exports exist and carry the
 * required custom identity columns (battleTag, gateway, bnetSub, avatarUrl).
 * These tests are intentionally minimal — they prove the schema surface
 * without a live DB connection (AUTH-04 stable-UUID key, D-05/D-06 fields).
 */
import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  users,
  sessions,
  accounts,
  verifications,
} from "#/db/schema";

// ---------------------------------------------------------------------------
// Export presence
// ---------------------------------------------------------------------------

describe("schema exports", () => {
  it("exports users table", () => {
    expect(users).toBeDefined();
  });

  it("exports sessions table", () => {
    expect(sessions).toBeDefined();
  });

  it("exports accounts table", () => {
    expect(accounts).toBeDefined();
  });

  it("exports verifications table", () => {
    expect(verifications).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// users table — DB table name and required columns (AUTH-04, D-05, D-06)
// ---------------------------------------------------------------------------

describe("users table", () => {
  it("has DB table name 'user' (better-auth convention)", () => {
    expect(getTableName(users)).toBe("user");
  });

  it("has id column (stable UUID progress key — AUTH-04)", () => {
    expect(users.id).toBeDefined();
  });

  it("has battleTag column (canonical Name#1234 — D-06)", () => {
    expect(users.battleTag).toBeDefined();
  });

  it("has gateway column (region/gateway — D-05/D-07)", () => {
    expect(users.gateway).toBeDefined();
  });

  it("has bnetSub column (stable Battle.net sub — D-05)", () => {
    expect(users.bnetSub).toBeDefined();
  });

  it("has avatarUrl column (nullable — Pitfall 2)", () => {
    expect(users.avatarUrl).toBeDefined();
  });

  it("has email column (better-auth required)", () => {
    expect(users.email).toBeDefined();
  });

  it("has name column (better-auth required)", () => {
    expect(users.name).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// sessions table — DB table name and FK column
// ---------------------------------------------------------------------------

describe("sessions table", () => {
  it("has DB table name 'session'", () => {
    expect(getTableName(sessions)).toBe("session");
  });

  it("has userId FK column", () => {
    expect(sessions.userId).toBeDefined();
  });

  it("has token column", () => {
    expect(sessions.token).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// accounts table — DB table name and FK column
// ---------------------------------------------------------------------------

describe("accounts table", () => {
  it("has DB table name 'account'", () => {
    expect(getTableName(accounts)).toBe("account");
  });

  it("has userId FK column", () => {
    expect(accounts.userId).toBeDefined();
  });

  it("has providerId column (battlenet)", () => {
    expect(accounts.providerId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// verifications table — DB table name
// ---------------------------------------------------------------------------

describe("verifications table", () => {
  it("has DB table name 'verification'", () => {
    expect(getTableName(verifications)).toBe("verification");
  });

  it("has identifier column", () => {
    expect(verifications.identifier).toBeDefined();
  });
});
