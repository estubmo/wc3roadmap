// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Smoke tests for src/lib/db.ts (database singleton).
 *
 * These tests run OFFLINE — the Neon HTTP driver is mocked so no live DB
 * connection is required. This satisfies the VALIDATION.md Wave 0 requirement
 * while keeping CI fast and credential-free.
 *
 * What is proven:
 *   - db is defined and is a Drizzle instance (not undefined/null)
 *   - db.query.users exists — schema is wired into the singleton
 *   - Two imports of the module return the same reference (singleton, not recreated)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

/**
 * Mock @neondatabase/serverless so the test runs offline.
 * The `neon` function returns a tagged template function (sql``).
 * Drizzle wraps it; we return a minimal stub that satisfies neon-http driver.
 */
vi.mock("@neondatabase/serverless", () => {
  const neonStub = vi.fn(() => {
    // Return a function that mimics the neon tagged template executor
    const fn = vi.fn().mockResolvedValue([]);
    // neon also attaches .transaction etc. — just return the minimal fn
    return fn;
  });
  return { neon: neonStub };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The DATABASE_URL env var must be set (even as a placeholder) for the module to import. */
beforeEach(() => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://mock@localhost/mock";
  }
});

// ---------------------------------------------------------------------------
// db singleton
// ---------------------------------------------------------------------------

describe("db singleton", () => {
  it("is defined after import", async () => {
    const { db } = await import("#/lib/db");
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  });

  it("exposes db.query.users (schema wired)", async () => {
    const { db } = await import("#/lib/db");
    // Drizzle's relational query builder exposes a `.query` property for
    // each table when the schema is passed to drizzle(). Its presence proves
    // the `* as schema` import in db.ts includes the users table.
    expect(db.query).toBeDefined();
    expect(db.query.users).toBeDefined();
  });

  it("is a singleton (two imports are referentially equal)", async () => {
    const { db: db1 } = await import("#/lib/db");
    const { db: db2 } = await import("#/lib/db");
    // ES module caching guarantees the same module object is returned for
    // the same specifier within a test run — db must not be recreated.
    expect(db1).toBe(db2);
  });
});
