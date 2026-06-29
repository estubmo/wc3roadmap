---
phase: 02
slug: graph-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (established Phase 1) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test --run && pnpm lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test --run && pnpm lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | GRAPH-{XX} | — | N/A | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner / nyquist-auditor fills this map from the Validation Architecture section of 02-RESEARCH.md (Phase Requirements → Test Map).*

---

## Wave 0 Requirements

- [ ] Dagre layout pure-function tests — deterministic positions for a fixed prerequisite DAG (GRAPH-01)
- [ ] Pathway data Zod schema + CI referential-integrity check — every step id resolves to a real node (GRAPH-03 structure)
- [ ] `GraphDisplayNodeSchema` projection test — `difficulty` present, no `NodeFrontmatter` content fields leak (ADR 002)

*Refine against 02-RESEARCH.md §Validation Architecture → Wave 0 Gaps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| <3 re-renders per custom node during pan | GRAPH-06 | Requires React DevTools Profiler observation | Open graph route, start Profiler, pan canvas, confirm each custom node renders <3× |
| Three mastery states visually distinct | GRAPH-02 | Visual judgement | Render mocked nodes in all three states; confirm dim-obsidian / gold-ring / full-gold-glow + badge are distinguishable |
| Mobile list fallback readable | GRAPH-05 | Visual / responsive judgement | Load graph route at mobile viewport; confirm canvas drops to readable node-card list without layout break |

*Profiler-based verification of Success Criterion 1 is inherently manual; see 02-RESEARCH.md §Profiler Verification Strategy.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
