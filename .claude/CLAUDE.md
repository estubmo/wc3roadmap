<!-- GSD:project-start source:PROJECT.md -->

## Project

**WC3 Learning Roadmap**

A free, open-source public web app that presents an interactive, beautifully designed **node graph** of Warcraft III / RTS learning concepts. Race-agnostic fundamentals form the core, with race-specific branches layered on top. Each node carries science-backed learning content with **visible per-node citations** (motor learning, deliberate practice, sport/competitive psychology) plus distilled wisdom from the most recognized WC3 players and content-creators. Players sign in with Battle.net / w3champions identity and the app auto-detects skill mastery from real w3champions ladder data to track progress as they learn.

It is for the WC3 community — players of any race and any skill level who want a structured, evidence-based path to genuinely improve.

**Core Value:** The learning content actually makes people better at WC3 — science-backed, effective, and trustworthy. If the interface, tracking, and integrations all failed, the substance of the guidance must still stand on its own.

### Constraints

- **Tech stack**: Centered on the **TanStack ecosystem** — **TanStack Start** (React, full-stack, type-safe) as the core framework, **TanStack Router** for routing, **TanStack Query** for data fetching/caching (incl. the w3champions API). Form/Table from TanStack as needed. — User preference; want a cohesive, modern, type-safe stack.
- **Graph visualization**: Interactive node graph is the centerpiece; React Flow is the likely fit in a React/TanStack world — confirm during research.
- **Design bar**: Must be elegant, intuitive, and beautifully designed — this is a stated product priority, not an afterthought.
- **Extensibility**: Architecture must make adding nodes, races, and sources easy without rework — User priority ("make changes along the way").
- **Architecture discipline (cross-cutting)**: Apply the `/improve-codebase-architecture` + `codebase-design` teachings throughout planning AND implementation — design **deep modules** (simple interfaces hiding substantial implementation), keep the codebase testable and AI-navigable, and reduce coupling. Maintain a **`CONTEXT.md`** capturing the project's ubiquitous domain language (node, mastery, pathway, signal, patch, etc.) and record significant choices as **ADRs in `docs/adr/`**. Every phase plan should reference and extend these. — User priority.
- **Openness**: Free and open source under **GPL-3.0** (strong copyleft) — no paywalls, code/content public. License is GPL-3.0 specifically because the project forks/integrates wc3v (jblanchette/wc3v), which is GPL-3.0; user accepted this.
- **Feasibility risk**: Battle.net OAuth is confirmed; w3champions API rate limits/stability are undocumented (treat as fragile). `.w3g` replay parsing feasibility/maturity for the current patch is the new key unknown — needs a spike. Manual tracking + self-assessment is the fallback if auto-detection underdelivers.
- **Patch versioning**: Patch version is a cross-cutting concern, not a single feature — it touches the content schema, replay parser, mastery thresholds, and progress records. Must be designed in from the data-model phase, not bolted on.
- **Operational cost/limits**: Even as a free OSS project, the web app + database + w3champions API calls have real hosting costs and likely API rate limits — research must surface these so the architecture (caching via TanStack Query, sync cadence) respects them.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@tanstack/react-start` | 1.168.x (RC, stable API) | Full-stack React framework — SSR, server functions, routing | Committed framework. RC since Sep 2025, weekly releases, feature-stable. Built on Vite + Nitro so it's not a dead end — Nitro handles every deploy target. |
| `@tanstack/react-router` | 1.x (bundled with Start) | Type-safe file-based routing | Same package tree as Start; createFileRoute gives full TypeScript inference of params, search params (Zod-validated), and loader data. Zero config when using Start. |
| `@tanstack/react-query` | 5.x | Client-side data fetching + caching | Pairs with Start's server functions for w3champions API calls. staleTime config is critical for respecting rate limits on external API. |
| `@xyflow/react` | 12.x | Interactive node-graph visualization | See Graph Library section below. |
| `better-auth` | latest | Authentication — Battle.net OAuth + sessions | Has an official TanStack Start adapter. Generic OAuth plugin can configure Battle.net as a custom provider. Actively maintained, absorbed Auth.js in 2025. |
| `drizzle-orm` | 0.44.x | ORM for PostgreSQL | Lightweight, type-safe, SQL-transparent. Edge-compatible with Neon HTTP driver. Drizzle-kit handles migrations. Community standard for TanStack Start stacks. |
| `drizzle-kit` | 0.25.x | Schema migrations | Paired with drizzle-orm. Generates and applies SQL migrations. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Neon PostgreSQL | N/A (managed) | Primary database — accounts, progress, sessions | Free tier includes 100 CU-hours/month + 0.5GB (plenty for OSS side project). Scale-to-zero. HTTP driver works on Cloudflare Workers edge. Acquired by Databricks 2025 — financially stable. |
| `@neondatabase/serverless` | latest | Edge-compatible Neon driver | Required for Cloudflare Workers deploy target; also works on Vercel. Pairs with drizzle-orm natively. |

### Content Pipeline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@content-collections/core` | latest | Type-safe content from MDX/JSON files | Official TanStack Start quickstart exists (v1.121.0+). Processes content at build time, validated with Zod schemas. No runtime parsing cost. |
| `@content-collections/vite` | latest | Vite plugin for content-collections | First plugin in vite.config, generates typed content imports. |
| `@content-collections/mdx` | latest | MDX compilation within content pipeline | Compiles MDX inside transform function, caches result. Server and client components for rendering. |
| `zod` | 4.x | Schema validation for content + API responses | Used in content schemas, route search params, w3champions API response parsing. Zod v4 released 2025 — use v4 for new projects. |

### Styling and UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | v4 is current; shadcn/ui and @xyflow/react both updated to v4 in late 2025. OKLCH colors, no config file needed. |
| shadcn/ui | N/A (copy-paste) | Component primitives (dialogs, tooltips, buttons, etc.) | Not an npm package — CLI copies components into your project. Updated for Tailwind v4 + React 19. New-york style default. Radix UI primitives under the hood. |
| `motion` (formerly framer-motion) | 12.x | Animation — node entrance, pathway highlights, transitions | Import from `motion/react` (not `framer-motion`). v12 current. Hardware-accelerated scroll, OKLCH support. 30M+ downloads/month. Trusted by Figma/Framer. |
| `lucide-react` | latest | Icon library | Default for shadcn/ui. Consistent, tree-shakeable SVG icons. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-form` | 1.x | Form state + validation | User onboarding, quiz self-assessments, settings forms |
| `@tanstack/react-table` | 8.x | Tabular data display | Leaderboard / stats comparison views if needed |
| `class-variance-authority` (cva) | 1.x | Variant styling for components | Comes with shadcn/ui; use for node state variants (mastered/in-progress/locked) |
| `clsx` + `tailwind-merge` | latest | Class merging utilities | Standard shadcn/ui companion |
| `react-markdown` | 9.x | Render markdown within node content panels | Fallback if content-collections MDX is overkill for simple nodes |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | 5.x | Type safety everywhere | Strict mode — do not disable |
| Vite | 6.x | Bundler (included with TanStack Start) | Do not eject or override; TanStack Start owns Vite config |
| ESLint + Prettier | latest | Code quality + formatting | Use `@tanstack/eslint-plugin-router` for router-specific rules |
| `drizzle-kit studio` | — | Visual DB inspection during dev | Run locally; don't expose in production |

## Auth Architecture: Battle.net + w3champions (CRITICAL)

### What Battle.net OAuth provides

### What w3champions provides

### w3champions API feasibility (MEDIUM confidence — unverified rate limits)

- **No official third-party API documentation exists**
- **Rate limits are unknown** — must be discovered empirically or via the w3champions Discord
- **API shape may change** without notice (community project, not a commercial API)

### better-auth configuration for Battle.net

## Graph Library Decision: @xyflow/react

### Why @xyflow/react wins

| Criterion | @xyflow/react | Cytoscape.js |
|-----------|--------------|--------------|
| React integration | Native React — nodes are React components | Imperative JS API, React wrappers are unofficial third-party |
| Custom node styling | Full React + Tailwind in every node | Limited CSS, custom rendering requires canvas or hacks |
| Tailwind v4 support | Official support (Oct 2025 update) | None |
| Dark mode | Built-in `colorMode` prop + CSS variables | Manual |
| Performance at WC3 graph scale (~50-200 nodes) | Excellent | Excellent (optimized for larger graphs) |
| shadcn/ui integration | Official React Flow UI component kit uses shadcn | None |
| Beautiful animations | Motion library + React in nodes | Limited |
| SSR | Supported in v12 | Not React-native |
| Community + maintenance | xyflow team, active in 2025-2026 | Community-maintained React wrapper, core lib not React-first |

### Performance guidance for @xyflow/react

- Use `nodesDraggable={false}` if nodes are layout-fixed (reduces event overhead)
- Memoize custom node components with `React.memo`
- Use `onlyRenderVisibleElements` for graphs over 100 nodes
- Avoid storing heavy content in node data — nodes contain IDs only; content loads on click via TanStack Query

## Deployment Target

| Target | Pro | Con | When to Choose |
|--------|-----|-----|----------------|
| Vercel | Zero-config TanStack Start detection, full Node.js runtime, free hobby tier for OSS | Cold starts on free tier | Default choice — eliminates ops work |
| Cloudflare Workers | Edge performance, generous free tier, long-running | nodejs_compat required, some npm packages won't work | If Neon HTTP driver + all deps are edge-compatible (verify per-phase) |
| Node.js VPS | Full control | Ops overhead | Not appropriate for OSS free project |

## Installation

# Bootstrap

# Graph

# Auth

# Database

# Content pipeline

# Validation

# Animation

# Icons + utilities

# TanStack Form (when needed)

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Graph library | `@xyflow/react` | Cytoscape.js | Cytoscape is not React-native; custom nodes require canvas or imperative mutation — impossible to style with Tailwind/Motion without hacks. Irrelevant performance advantage at WC3 graph scale. |
| Graph library | `@xyflow/react` | D3-force | D3 requires full imperative control; no React component model for nodes. Massive DX cost. |
| Auth | `better-auth` | Auth.js (NextAuth) | Auth.js v5 is Next.js-centric; TanStack Start integration is community-maintained. better-auth has an official adapter. Auth.js is now maintained under the better-auth umbrella anyway. |
| Auth | `better-auth` | Clerk | Clerk is a hosted SaaS; adds per-MAU cost and vendor lock-in. OSS project should own its auth. |
| Database | Neon | Supabase | Supabase adds a full BaaS layer (Storage, Realtime, Edge Functions) this project doesn't need. Neon is pure Postgres — simpler mental model. Neon's serverless HTTP driver is cleaner for edge deploys. |
| Database | Neon | PlanetScale | PlanetScale dropped MySQL free tier in 2024; Postgres is the industry standard for 2025 stacks. |
| ORM | Drizzle | Prisma | Prisma's generated client is heavy; edge runtime support requires Prisma Accelerate (paid). Drizzle is edge-first, lighter, and has stronger community momentum for TanStack stacks. |
| Content | content-collections | Contentlayer | Contentlayer is unmaintained (abandoned ~2024). content-collections is its active successor with TanStack Start quickstart. |
| Content | content-collections | Custom JSON loader | Type safety at authoring time requires schema validation. content-collections gives Zod validation + MDX in one. |
| Styling | Tailwind v4 + shadcn | Chakra UI / MUI | Component libraries that ship their own styles fight with custom graph aesthetics. shadcn owns zero styles in your bundle — you control everything. |
| Animation | Motion (motion/react) | React Spring | Motion has broader adoption, better docs, and the React Flow team recommends it for node animations. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `framer-motion` (old package) | Renamed; use new package | `motion` — import from `motion/react` |
| `contentlayer` | Unmaintained since ~2024 | `@content-collections/core` |
| tRPC | Server functions in TanStack Start already provide type-safe RPC with no boilerplate | `createServerFn` from `@tanstack/react-start` |
| GraphQL | Over-engineered for this use case — node content is static, w3champions data is simple REST | Direct w3champions API calls via TanStack Query |
| Prisma | Edge-runtime issues without Prisma Accelerate (paid); Drizzle is better-fit | `drizzle-orm` |
| `@tanstack/start` (old package name) | Renamed in v1 | `@tanstack/react-start` |
| `tailwindcss-animate` | Deprecated in shadcn/ui as of March 2025 | CSS transitions or Motion |
| Supabase Auth | Redundant with better-auth; Supabase Auth doesn't support Battle.net out of the box | `better-auth` with generic OAuth plugin |
| React Flow < v12 / `reactflow` package | Old package name, missing SSR + Tailwind v4 support | `@xyflow/react` v12 |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@tanstack/react-start@1.168.x` | React 19, Vite 6 | Do not use React 18 — Start v1 targets React 19 |
| `@xyflow/react@12.x` | React 19, Tailwind v4 | Updated Oct 2025; import from `@xyflow/react` not `reactflow` |
| `shadcn/ui` (Feb 2025+) | Tailwind v4, React 19 | Run `npx shadcn init` for fresh setup with v4 defaults |
| `motion@12.x` | React 19 | Import from `motion/react` not `framer-motion` |
| `drizzle-orm@0.44.x` | `@neondatabase/serverless` latest | Use neon HTTP mode for edge; use node-postgres for Node.js target |
| `@content-collections/vite` | TanStack Start v1.121.0+ | Older versions needed `@content-collections/vinxi` — do not use vinxi adapter |
| `zod@4.x` | All listed libraries | Zod v4 is a new major; confirm each library's peer dependency before upgrading from v3 |
| `better-auth` | TanStack Start v1, Drizzle | Mount handler at `/src/routes/api/auth/$.ts`; use `tanstackStartCookies()` plugin |

## Confidence Flags by Area

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| TanStack Start maturity | MEDIUM | npm + InfoQ article | RC status, weekly releases, stable API. Not yet `1.0.0` GA but functionally production-grade per community reports. |
| TanStack Start server functions | MEDIUM | Web search + official docs (403 on direct fetch) | createServerFn API well-documented in community; could not fetch official docs directly. |
| @xyflow/react capabilities | MEDIUM | reactflow.dev + xyflow blog | v12 features confirmed. Tailwind v4 update confirmed Oct 2025. |
| Battle.net OAuth feasibility | MEDIUM | Blizzard developer portal search results | OAuth 2.0 for third parties confirmed. No WC3-specific scope — BattleTag-only is sufficient. |
| better-auth + Battle.net integration | LOW-MEDIUM | better-auth docs + web search | Generic OAuth plugin is documented. Battle.net-specific configuration is not community-validated — treat as "probably works, needs 1-2 days to confirm." |
| w3champions API | LOW | GitHub source inspection + community knowledge | API exists and is public. Rate limits, stability SLA, and breaking-change policy are unknown. |
| Drizzle + Neon | HIGH | Multiple tutorials, official docs | Well-documented, widely adopted combination in 2025-2026 TanStack Start stacks. |
| content-collections | MEDIUM | Official quickstart confirmed for TanStack Start | Works. MDX pipeline is standard. |
| Neon free tier costs | HIGH | Neon pricing page (via search) | 100 CU-hours/month free as of Oct 2025. Sufficient for low-traffic OSS project. |
| Deployment (Vercel) | HIGH | Vercel docs + search | TanStack Start auto-detected, zero config. |

## Sources

- [TanStack Start npm — @tanstack/react-start](https://www.npmjs.com/package/@tanstack/react-start) — version 1.168.26 confirmed June 2026
- [TanStack Start v1 RC announcement — InfoQ](https://www.infoq.com/news/2025/11/tanstack-start-v1/) — SSR, server functions, deployment capabilities
- [TanStack Start on Vercel — Vercel docs](https://vercel.com/docs/frameworks/full-stack/tanstack-start) — deployment confirmed
- [TanStack Start on Cloudflare Workers — Cloudflare docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) — Workers deployment confirmed
- [Blizzard OAuth developer portal](https://community.developer.battle.net/documentation/guides/using-oauth) — OAuth 2.0 for third parties confirmed
- [better-auth TanStack Start integration docs](https://better-auth.com/docs/integrations/tanstack) — handler setup confirmed
- [better-auth generic OAuth plugin](https://better-auth.com/docs/plugins/generic-oauth) — custom provider configuration confirmed
- [w3champions identification-service — GitHub](https://github.com/w3champions/identification-service) — JWT-based auth via Battle.net confirmed
- [React Flow v12 release — xyflow blog](https://xyflow.com/blog/react-flow-12-release) — SSR, dark mode, CSS variables
- [React Flow Tailwind CSS 4 update — reactflow.dev](https://reactflow.dev/whats-new/2025-10-28) — Tailwind v4 + React 19 support confirmed Oct 2025
- [content-collections TanStack Start quickstart](https://www.content-collections.dev/docs/quickstart/tanstack-start) — Vite plugin integration confirmed
- [Drizzle + Neon full-stack example — freeCodeCamp](https://www.freecodecamp.org/news/full-stack-saas-tanstack-start-elysia-neon/) — combination validated
- [Neon pricing 2026](https://neon.com/pricing) — free tier confirmed 100 CU-hours/month
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 + React 19 support confirmed
- [Motion for React](https://motion.dev/docs/react) — rename from framer-motion confirmed, v12 current

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| codebase-design | Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary. | `.agents/skills/codebase-design/SKILL.md` |
| design-taste-frontend | Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check. | `.agents/skills/design-taste-frontend/SKILL.md` |
| improve-codebase-architecture | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. | `.agents/skills/improve-codebase-architecture/SKILL.md` |
| redesign-existing-projects | Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS. | `.agents/skills/redesign-existing-projects/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
