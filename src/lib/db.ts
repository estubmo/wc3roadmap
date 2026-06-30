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
 * This module exports a single `db` constant. The underlying Drizzle instance
 * is created LAZILY on first property access (not at module load) and then
 * cached for the lifetime of the runtime isolate — no per-request reconnect
 * overhead (mirrors the patches.ts singleton pattern).
 *
 * Why lazy: `process.env.DATABASE_URL` is only populated by TanStack Start when
 * a server function actually runs. Reading it at module-eval time (which happens
 * during SSR module-graph setup, before env is injected, via the auth/server-fn
 * import chain) yields `undefined` and makes `neon()` throw
 * "No database connection string was provided". Deferring instantiation to first
 * use guarantees the env var is read inside a server handler, when it exists.
 *
 * For schema migrations and push operations, use DATABASE_URL_DIRECT
 * (non-pooled direct connection) via drizzle.config.ts — NOT this module.
 * See RESEARCH.md Pitfall 5 and drizzle.config.ts for rationale.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "#/db/schema";

type Database = ReturnType<typeof createDb>;

/** Build the Drizzle instance. Reads DATABASE_URL at call time (server handler). */
function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle({ client: sql, schema });
}

let instance: Database | undefined;

/** Lazily create the Drizzle singleton on first use, then reuse it. */
function getDb(): Database {
  instance ??= createDb();
  return instance;
}

/**
 * Drizzle ORM singleton wired to the Neon HTTP driver and the full schema.
 *
 * Use `db.query.*` for type-safe relational queries (e.g. `db.query.users.findFirst()`).
 * Use `db.insert/select/update/delete` for direct table operations.
 *
 * Implemented as a lazy Proxy: the real Drizzle instance is built on the first
 * property access (see `getDb`), so the DATABASE_URL env var is read when a
 * server function runs rather than at import time. Methods are bound to the real
 * instance to preserve `this`.
 *
 * Server-only — never import this from client components. DATABASE_URL is a
 * server-side environment variable and must not be bundled into the client.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
