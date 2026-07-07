# Milestones

## v1.0 MVP (Shipped: 2026-07-07)

**Phases completed:** 9 phases, 88 plans, 138 tasks
**Timeline:** 2026-06-28 → 2026-07-07 (9 days) · 435 commits · ~21.3k LOC TS/TSX
**Live:** https://wc3roadmap.vercel.app · GPL-3.0-or-later
**Closeout:** verified — all 9 phases verified `passed`; milestone audit `passed` after inline remediation.

**Delivered:** A free, open-source, science-backed WC3 learning roadmap — an interactive node graph of race-agnostic RTS fundamentals with per-node cited content, four converging mastery-detection paths, and a guided Beginner Fundamentals pathway, live on Vercel.

**Key accomplishments:**

- **Interactive React Flow node-graph** with a guided *Beginner Fundamentals* pathway (ordered spotlight, mastery-tied progress bar, "next step" cue), three mastery-state node visuals, prerequisite edges, filter/search, and desktop-canvas / mobile-list responsive switch.
- **25-node science-backed content corpus**, every node `launch_ready` with verified per-node citations (peer-reviewed science + Warcraft Gym / Liquipedia creator sources) and a full anti-fabrication audit trail — the project's core value made real. A content-integrity sweep removed all fabricated quotes and mis-cited science from the seed content.
- **Four mastery-detection sources converging on one `nodeProgress` store**, all patch-version-aware and server-stamped: manual check-off (P5), self-assessment quizzes for CONCEPTUAL nodes (P6), coarse w3champions ladder auto-detection (P7), and fine `.w3g` replay-signal parsing via w3gjs (P8).
- **Battle.net OAuth** (better-auth generic-OAuth) + **Neon Postgres / Drizzle**, with a principal-keyed server-function authorization convention applied to all 11 user-data endpoints (ADR 007); anonymous localStorage progress that merges once on first sign-in.
- **System-wide patch-version primitive** — a single patch registry consumed by content nodes, mastery thresholds, replay stamping, and staleness UI; meta-volatile out-of-patch nodes surface an "unreviewed for {patch}" indicator.
- **Deep-module architecture discipline throughout** — `CONTEXT.md` ubiquitous domain language, 13 ADRs, content/graph-engine decoupling; **541 passing tests**, a CI content-validation gate, and a `LAUNCH_GATE` readiness check enforcing ≥25 audited nodes.
- **Launch polish**: deployed live to Vercel (zero-config), branded OG/Twitter share meta, a static `/about` openness + privacy page, a branded 404, and a primary nav.

**Deferred to v1.x:**
- **REPLAY-03** (wc3v advanced-analysis layer — supply curves, compare-to-pro) — descoped after a faithful GO attempt hit external proprietary/gitignored WC3 data (SLK-derived unit costs + per-map pathing grids), not a code gap. Base replay loop ships complete and unaffected. See ADR 012.
- Race-specific branch content, community contribution UI, finer matchup auto-detection, mobile-graph interaction — roadmap Deferred Items.

**Milestone audit note:** The v1.0 audit (`.planning/milestones/v1.0-MILESTONE-AUDIT.md`) surfaced a real cross-phase gap that per-phase verification missed — the entire `/replays` feature (Phase 8) and `/about` page were shipped with **no in-app navigation link** (only `to="/"` existed). Fixed inline before close (commit `ac5fb6d`, browser-verified) — the headline replay flow is now reachable.

**Known non-blocking notes:**
- 09-UAT.md trips the artifact-audit heuristic (leftover "Current Test" scaffold) despite being `passed` with 0 pending scenarios — benign false-positive, acknowledged at close.
- `setNodeMastery` manual writes are intentionally non-monotonic (user intent can override auto/quiz/replay evidence) — by design, documented at `src/schemas/progress.ts:99`.
