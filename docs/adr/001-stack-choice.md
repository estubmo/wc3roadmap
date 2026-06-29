# ADR 001: Stack Choice

**Status:** Accepted
**Date:** 2026-06-28
**Phase:** 01-foundation-schema

---

## Context

WC3 Roadmap is a free, open-source public web app serving an interactive node
graph of Warcraft III learning concepts. It requires:

- An SSR-capable React framework for the graph UI and server functions
- A content pipeline that validates MDX frontmatter at build time
- A schema library for type-safe content and API validation
- A database + ORM for user progress and sessions (planned Phase 4)
- Authentication via Battle.net OAuth (planned Phase 4)
- A deploy target that minimises operational overhead for an OSS project

The user committed to the **TanStack ecosystem** as the core architectural
constraint before Phase 1 began. All other choices follow from that commitment
or are alternatives evaluated against it.

### Actual pinned versions (as of Phase 01 scaffold)

Versions were resolved against the npm registry on 2026-06-28. The CLI
scaffold and npm latest produced TypeScript 6 and Vite 8 — higher than the
`[ASSUMED]` entries in the original CLAUDE.md version table.

| Package | Pinned Version |
|---------|---------------|
| `@tanstack/react-start` | 1.168.26 |
| `@tanstack/react-router` | 1.170.16 |
| `@content-collections/core` | 0.15.2 |
| `@content-collections/vite` | 0.3.0 |
| `@content-collections/mdx` | 0.2.2 |
| `@content-collections/cli` | 0.1.9 |
| `zod` | 4.4.3 |
| `nitro` | 3.0.260610-beta |
| `react` | 19.2.7 |
| `react-dom` | 19.2.7 |
| `vite` | 8.1.0 |
| `typescript` | 6.0.3 |
| `vitest` | 4.1.9 |
| `tsx` | 4.22.4 |
| `prettier` | 3.9.1 |

All dependencies are **exact-pinned** (no `^` or `~`). See
`docs/upgrade-policy.md` for the bump process.

### Scaffold approach

The CLI scaffold (`npx @tanstack/cli create`) always installs Tailwind CSS,
which Phase 1 explicitly excludes. The scaffold was therefore done **manually
(file-by-file)** rather than via the CLI, giving full control over installed
packages while meeting all Phase 1 acceptance criteria identically.

---

## Decision

### Framework: TanStack Start + TanStack Router

- Full-stack React SSR with type-safe file-based routing and `createServerFn`
  for type-safe server functions (no tRPC or GraphQL boilerplate needed).
- SSR handled by Nitro, which Vercel auto-detects for zero-config deployment.
- Bundled with TanStack Router; no separate router package required.

### Content pipeline: @content-collections

- `@content-collections/core` (not `contentlayer` — abandoned ~2024) validates
  MDX frontmatter at build time via Zod schemas; generates typed exports;
  handles MDX compilation via `compileMDX()` in the transform step.
- `@content-collections/vite` adapter is required for TanStack Start ≥ 1.121.0
  (the `@content-collections/vinxi` adapter is deprecated and must not be used).
- `contentCollections()` must be the **first** Vite plugin so generated types
  exist before other plugins run.

### Schema validation: Zod v4

- `zod@4.4.3` — new project, use v4 from the start. Dramatically faster and
  smaller than v3. Breaking API changes from v3: use `z.enum()` not
  `z.nativeEnum()`, `.check()` not `.superRefine()`, `error:` not `message:`
  in `.refine()`.
- `PATCH_IDS` is exported from the patch registry as `[string, ...string[]]`
  so `z.enum(PATCH_IDS)` compiles without a cast at each call site.

### Database + ORM: Neon + Drizzle (Phase 4, planned)

- Neon PostgreSQL free tier (100 CU-hours/month) with
  `@neondatabase/serverless` HTTP driver for edge-compatible queries.
- `drizzle-orm@0.44.x` — edge-first, type-safe, SQL-transparent. Drizzle-kit
  for migrations.
- **Note (2026-06-28):** `drizzle-orm` has drifted to 0.45.2 and `drizzle-kit`
  to 0.31.10 on npm since the CLAUDE.md table was written. Pin to the researched
  version at Phase 4; review changelogs before adopting current.

### Authentication: better-auth (Phase 4, planned)

- Official TanStack Start adapter. Generic OAuth plugin supports Battle.net as
  a custom provider. Absorbed Auth.js in 2025 — actively maintained.

### Graph visualisation: @xyflow/react (Phase 2, planned)

- Native React — nodes are React components; full Tailwind v4 + React 19
  support as of October 2025. Performance adequate for 50–200 nodes.

### Deploy target: Vercel

- TanStack Start auto-detected by Vercel via the Nitro plugin; zero-config.
  Free hobby tier covers OSS use-case.

---

## Consequences

**Positive:**
- Cohesive TanStack ecosystem: one mental model across routing, data fetching,
  and server functions.
- Build-time content validation prevents malformed nodes from reaching
  production.
- Exact pinning + `npm ci` in CI gives reproducible builds.
- Neon free tier and Vercel free tier together produce zero hosting cost for
  low-traffic OSS.

**Negative / trade-offs:**
- `@tanstack/react-start` is RC (not 1.0.0 GA as of June 2026) — API is
  feature-stable but not yet semver-frozen.
- `nitro@3.x` is a beta on npm — if builds regress, pin to the last known-good
  beta.
- Battle.net OAuth integration has no community-validated TanStack Start
  example as of June 2026; budget discovery time in Phase 4.

---

## Alternatives Considered

| Category | Alternative | Rejected Because |
|----------|-------------|-----------------|
| Content pipeline | `contentlayer` | Abandoned ~2024; `@content-collections` is its active successor |
| Database / ORM | `prisma` | Edge runtime support requires Prisma Accelerate (paid); heavier client; less edge-first than Drizzle |
| Database | Supabase | Adds BaaS layer not needed here; Neon is simpler pure-Postgres with a cleaner HTTP driver for edge |
| Auth | Auth.js / NextAuth | v5 is Next.js-centric; TanStack Start integration is community-maintained; better-auth has an official adapter and absorbed Auth.js upstream |
| Auth | Clerk | Hosted SaaS with per-MAU cost; OSS project should own its auth |
| Graph library | Cytoscape.js | Not React-native; custom nodes require imperative mutations incompatible with Tailwind/Motion; irrelevant performance advantage at WC3 graph scale |
| Graph library | D3-force | Fully imperative; no React component model for nodes; massive DX cost |
| Styling | Chakra UI / MUI | Ship own styles that fight with custom graph aesthetics; shadcn owns zero styles — full control retained |
| RPC layer | tRPC | `createServerFn` in TanStack Start already provides type-safe RPC with no boilerplate |
| Data fetching | GraphQL | Over-engineered for this use case; node content is static, w3champions data is simple REST |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-29 (Phase 04-01) | Drizzle version drift corrected: drizzle-orm 0.44.x → 0.45.2, drizzle-kit 0.25.x → 0.31.10. Both installed at exact pins per RESEARCH Pitfall 6 and package legitimacy audit (both SUS flags confirmed false positives). Also pinned better-auth@1.6.22 and @neondatabase/serverless@1.1.0. |
