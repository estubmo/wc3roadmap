// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Drizzle Kit configuration for schema migrations.
 *
 * IMPORTANT: Uses DATABASE_URL_DIRECT (non-pooled connection) — NOT DATABASE_URL.
 * Neon pooled connections (pgbouncer, port 5432) do NOT support the extended
 * transactions that drizzle-kit uses for migration and push operations.
 * Always set DATABASE_URL_DIRECT to the direct (non-pooled) connection string
 * from the Neon Console ("Direct connection" toggle).
 * See RESEARCH.md Pitfall 5.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Non-pooled direct connection required for migrations/push.
    // Use DATABASE_URL (pooled) for app queries at runtime.
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
