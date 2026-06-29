// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Database singleton — Drizzle ORM over the Neon HTTP driver.
 *
 * The Neon HTTP driver (`neon-http`) works on both Vercel Node.js and edge
 * runtimes without requiring a persistent WebSocket connection. It sends each
 * query as an HTTP POST to Neon's serverless endpoint, making it compatible
 * with short-lived function invocations (Vercel Serverless and Edge Functions).
 *
 * This module exports a single `db` constant created once at module load.
 * ES module caching ensures the same Drizzle instance is reused across all
 * server function invocations within the same runtime isolate — no
 * per-request reconnect overhead (mirrors the patches.ts singleton pattern).
 *
 * For schema migrations and push operations, use DATABASE_URL_DIRECT
 * (non-pooled direct connection) via drizzle.config.ts — NOT this module.
 * See RESEARCH.md Pitfall 5 and drizzle.config.ts for rationale.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "#/db/schema";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Drizzle ORM singleton wired to the Neon HTTP driver and the full schema.
 *
 * Use `db.query.*` for type-safe relational queries (e.g. `db.query.users.findFirst()`).
 * Use `db.insert/select/update/delete` for direct table operations.
 *
 * Server-only — never import this from client components. DATABASE_URL is a
 * server-side environment variable and must not be bundled into the client.
 */
export const db = drizzle({ client: sql, schema });
