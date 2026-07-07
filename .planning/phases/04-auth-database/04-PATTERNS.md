# Phase 4: Auth & Database - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 11 new/modified files
**Analogs found:** 8 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/auth.ts` | config/singleton | request-response | `src/lib/patches.ts` | partial (module-singleton pattern) |
| `src/lib/auth-client.ts` | config/singleton | request-response | `src/lib/utils.ts` | partial (lightweight lib export) |
| `src/lib/auth-middleware.ts` | middleware | request-response | `src/lib/filter-utils.ts` | partial (utility module + named exports) |
| `src/lib/db.ts` | config/singleton | CRUD | `src/lib/patches.ts` | partial (module-scope singleton) |
| `src/db/schema.ts` | model | CRUD | `src/schemas/progress.ts` | role-match (typed data definition) |
| `src/routes/api/auth/$.ts` | route | request-response | `src/routes/index.tsx` | role-match (createFileRoute + Route export) |
| `src/server/user-profile.ts` | service | CRUD | `src/lib/node-content-query.ts` | partial (data-fetch module) |
| `src/components/auth/SignInButton.tsx` | component | request-response | `src/components/ui/button.tsx` | role-match (interactive button component) |
| `src/components/auth/UserDropdown.tsx` | component | request-response | `src/components/graph/FilterBar.tsx` | partial (header-mounted interactive component) |
| `src/lib/auth-middleware.test.ts` | test | — | `src/schemas/progress.test.ts` | exact (vitest describe/it/expect, mock pattern) |
| `drizzle.config.ts` | config | — | (no analog — new root config file) | none |

---

## Pattern Assignments

### `src/lib/auth.ts` (config/singleton, request-response)

**Analog:** `src/lib/patches.ts` (module-scope singleton with typed exports)

**File header pattern** (patches.ts lines 1–8):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * [Module purpose — one sentence].
 *
 * [Deeper explanation of design intent.]
 */
```

**Module-singleton + typed re-export pattern** (patches.ts lines 38–50):
```typescript
// Module-scope constant (not recreated per request)
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];

// Export inferred types for consumers
export const PATCH_IDS: [string, ...string[]] = _PATCHES.map((p) => p.id) as [...];
```

**Apply to `auth.ts`:** Same header, same JSDoc block explaining the module's role. Export `auth` as a module-scope constant (betterAuth instance). Export `Session` and `User` inferred types. NEVER import this file from client components (server-only — contains DB adapter + secrets).

---

### `src/lib/auth-client.ts` (config/singleton, request-response)

**Analog:** `src/lib/utils.ts` (minimal lib module, named exports, GPL header)

**Pattern** (utils.ts lines 1–9):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Apply to `auth-client.ts`:** Same header + copyright. Single `createAuthClient()` call; destructure and re-export `useSession`, `signIn`, `signOut` as named exports for clean consumer imports. Client-only — safe to import in React components.

---

### `src/lib/auth-middleware.ts` (middleware, request-response)

**Analog:** `src/lib/filter-utils.ts` (utility module — deep function + named exports)

**File header pattern** (filter-utils.test.ts lines 1–14 shows the companion test's expectations of the module's export shape):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Module description — what it hides, what the interface is].
 *
 * [Usage example inline in JSDoc.]
 */
```

**Apply to `auth-middleware.ts`:** GPL header + copyright. JSDoc block MUST describe:
- INTERFACE: "Add `.middleware([authMiddleware])` to any server function. Handler receives `context.principal`."
- IMPLEMENTATION: "Hides `getRequestHeaders()` + `auth.api.getSession()` + 401-throw behind one composable primitive."

Export two things: `authMiddleware` (the `createMiddleware` instance) and `authedServerFn` (factory function wrapping `createServerFn`). No other exports.

---

### `src/lib/db.ts` (config/singleton, CRUD)

**Analog:** `src/lib/patches.ts` (module-scope singleton)

**Pattern:** Three lines: import driver, import schema, export `db` as module-scope `drizzle()` instance. JSDoc explaining runtime context (Vercel Node.js vs edge, why neon-http driver). No functions — just the `db` export.

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Database singleton — Drizzle ORM over Neon HTTP driver.
 * neon-http works on Vercel Node.js + edge runtimes (no WebSocket required).
 * For migrations use DATABASE_URL_DIRECT (non-pooled) via drizzle.config.ts.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

---

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/schemas/progress.ts` (typed data definition with JSDoc per field)

**Header + JSDoc pattern** (progress.ts lines 1–19):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Schema module description].
 *
 * Phase N scope: [what this phase does / defers].
 *
 * All [entities] import [thing] from [module].
 */
```

**Per-field JSDoc pattern** (progress.ts lines 62–86):
```typescript
export const ProgressRecordSchema = z.object({
  /**
   * Player identity — matched to auth system identity in Phase 4.
   * Format is implementation-defined (Phase 4); this schema accepts any string.
   */
  userId: z.string(),
```

**Apply to `src/db/schema.ts`:** Same GPL header + copyright. JSDoc per table and per non-obvious column (especially `battleTag`, `gateway`, `bnetSub` — explain the w3champions key constraint D-06). Export each table (`users`, `sessions`, `accounts`, `verifications`) as named exports so Drizzle's `schema` import collects them all.

---

### `src/routes/api/auth/$.ts` (route, request-response)

**Analog:** `src/routes/index.tsx` + `src/routes/preview/full-map.tsx` (createFileRoute + Route export)

**Route registration pattern** (index.tsx lines 43–44, 74):
```typescript
export const Route = createFileRoute("/")({
  loader: (): { nodes: GraphDisplayNode[]; pathway: Pathway | null } => { ... },
  component: Home,
});
```

**Apply to `src/routes/api/auth/$.ts`:** Same GPL header. `createFileRoute("/api/auth/$")`. No `component` or `loader` — only a `server` property with `GET` and `POST` handlers, both delegating to `auth.handler(request)`. Keep the file minimal — 10–15 lines.

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

---

### `src/server/user-profile.ts` (service, CRUD)

**Analog:** `src/lib/node-content-query.ts` (data-fetch module, named function exports)

**Pattern:** GPL header, JSDoc explaining the function's authorization contract and what `context.principal` is. Use `authedServerFn` from `@/lib/auth-middleware`. Key every DB query by `principal.id` — never by any client-supplied argument.

```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * getUserProfile — first server function using the authedServerFn pattern.
 *
 * Authorization: principal-keyed by construction (D-12). context.principal.id
 * is the UUID from the session — no client-supplied userId is accepted or used.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { authedServerFn } from "@/lib/auth-middleware";

export const getUserProfile = authedServerFn({ method: "GET" }).handler(
  async ({ context }) => {
    const { principal } = context;
    return db.query.users.findFirst({ where: eq(users.id, principal.id) }) ?? null;
  }
);
```

---

### `src/components/auth/SignInButton.tsx` (component, request-response)

**Analog:** `src/components/ui/button.tsx` (shadcn button primitive — interactive element)

**Component pattern** (GraphNode.tsx lines 1–3, 32–39 show the established component conventions):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Component name] — [one-line purpose].
 *
 * [Design intent / design system token usage.]
 */
import { memo } from "react";
```

**Apply to `SignInButton.tsx`:** GPL header + copyright. JSDoc explaining D-01 (gold-accent CTA) and the region-selector interaction (region must be captured before `authClient.signIn.oauth2()` is called). Export as a named function (not default export — matches all existing components). Use CSS variable tokens (`--color-gold-*`) for the gold accent, not hardcoded hex.

---

### `src/components/auth/UserDropdown.tsx` (component, request-response)

**Analog:** `src/components/graph/FilterBar.tsx` (header-mounted interactive component using shadcn primitives)

**Pattern** (FilterBar.tsx — header-mounted, uses shadcn, reads from lib hook):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * [Component name] — header-mounted [description].
 */
import { ... } from "lucide-react";
import { cn } from "#/lib/utils";
// shadcn primitives
import { Button } from "#/components/ui/button";
```

**Apply to `UserDropdown.tsx`:** GPL header + copyright. Import `useSession` from `@/lib/auth-client` (NOT from auth.ts — client-safe only). Use shadcn `Avatar`, `DropdownMenu`, `DropdownMenuItem` primitives. Render BattleTag + avatar; include sign-out item and a placeholder "Sync with w3champions" item (D-02, disabled, with tooltip for Phase 7).

---

### `src/lib/auth-middleware.test.ts` (test)

**Analog:** `src/schemas/progress.test.ts` (vitest, describe/it/expect, fixture-first pattern)

**Test file header pattern** (progress.test.ts lines 1–14):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for [module] ([requirement IDs]).
 *
 * [What these tests prove / TDD wave context.]
 */
import { describe, it, expect } from "vitest";
import { [subject] } from "./[module]";
```

**Fixture-first pattern** (progress.test.ts lines 19–25):
```typescript
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid [fixture name]. */
const validRecord = { ... };
```

**Mock pattern** (from RESEARCH.md Pattern 6):
```typescript
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: vi.fn().mockReturnValue(new Headers()),
}));
```

**Apply to `auth-middleware.test.ts`:** GPL header + copyright. Fixture-first. Section separators (`// ----`) matching progress.test.ts style. Cover: (1) 401 thrown when no session; (2) `next()` not called when no session (D-13); (3) principal injected when session is valid. Import `vi` alongside `describe/it/expect`.

---

### `drizzle.config.ts` (config)

**No analog** — root-level config file; no existing drizzle.config.ts in the repo.

Use RESEARCH.md Pattern 5 directly. Key constraint: `dbCredentials.url` must use `DATABASE_URL_DIRECT` (non-pooled) — NOT `DATABASE_URL`. Add a comment explaining why.

---

## Shared Patterns

### GPL-3.0 File Header
**Source:** Every file in `src/` — established in Phase 1
**Apply to:** All new source files
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
```

### JSDoc Module Block
**Source:** `src/lib/patches.ts` lines 1–8, `src/schemas/progress.ts` lines 4–18
**Apply to:** All new `src/lib/` and `src/server/` files
Pattern: Opening `/**` block with one-sentence purpose, then phase-scope statement, then design rationale. Inline JSDoc on every exported symbol that is non-obvious.

### Path Alias (`#/` → `@/`)
**Source:** Existing code uses `#/` alias (e.g., `import { cn } from "#/lib/utils"` in GraphNode.tsx)
**Apply to:** All new files — use `@/` alias per RESEARCH.md patterns (matches CLAUDE.md), but confirm the `tsconfig.json` alias name before writing. Existing code uses `#/`; new auth files in RESEARCH.md show `@/`. **Planner must check `tsconfig.json` and use whichever alias is configured.**

### Named Exports (no default exports)
**Source:** All existing `src/lib/` and `src/components/` files
**Apply to:** All new files — use named exports exclusively. No `export default`.

### Section Separator Comments
**Source:** `src/schemas/progress.ts`, `src/lib/graph-store.ts`
**Apply to:** All files with multiple logical sections
```typescript
// ---------------------------------------------------------------------------
// [Section Title]
// ---------------------------------------------------------------------------
```

### Vitest Test Structure
**Source:** `src/schemas/progress.test.ts`
**Apply to:** `src/lib/auth-middleware.test.ts`
Pattern: GPL header → JSDoc block (what tests prove) → imports → fixtures section → `describe` blocks with section separators. Use `vi.mock()` at the top of the file (before imports of the module under test). Use `@ts-expect-error` with a comment when mocking partial types.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `drizzle.config.ts` | config | — | No existing ORM or migration config in the repo; use RESEARCH.md Pattern 5 |
| `src/db/schema.ts` (Drizzle tables) | model | CRUD | Existing schemas are Zod (runtime validation), not Drizzle table defs (SQL DDL). Partial analog to `src/schemas/progress.ts` for JSDoc style only; table definition syntax comes from RESEARCH.md Pattern and `npx auth@latest generate` output |
| `src/server/user-profile.ts` (createServerFn) | service | CRUD | No existing server functions in the repo — this is the first. RESEARCH.md Pattern 3 + 6 are the authoritative reference |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/schemas/`, `src/routes/`, `src/components/`
**Files scanned:** 12
**Pattern extraction date:** 2026-06-29
