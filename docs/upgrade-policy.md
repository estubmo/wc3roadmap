# Dependency Upgrade Policy

**Applies to:** All packages in `package.json` (dependencies and devDependencies).
**Rationale:** This project is an application, not a library. Exact pinning
gives reproducible installs across developers and CI — no surprise upgrades
between `npm install` runs.

---

## Pinning Rule

All dependencies are pinned to **exact versions** — no semver ranges (`^` or
`~`). Every entry in `package.json` is a literal version string.

This is enforced by convention and should be validated in PR review. If a `^`
or `~` range appears after an `npm install`, remove it before committing.

The lockfile (`package-lock.json`) must be committed and must be kept in sync.
CI runs `npm ci` (not `npm install`) to guarantee lockfile fidelity.

---

## Upgrade Process

A dependency bump requires all of the following:

1. **Read the changelog** — review the changelog from the current pinned
   version to the target version. Note any breaking API changes, behaviour
   differences, or peer-dependency requirement changes that affect this project.

2. **Update the version** in `package.json` (exact version, no range).

3. **Run `npm install`** to regenerate `package-lock.json`.

4. **Run CI locally** — all three checks must pass:

   ```bash
   npm run typecheck   # TypeScript strict mode — no new errors
   npm run test        # Vitest unit suite
   npm run build       # build + content-collections validation
   ```

5. **Commit `package.json` + `package-lock.json`** together in a single
   `chore(deps):` commit. Reference the changelog version in the commit message.

6. **Update `CLAUDE.md`** version compatibility matrix if the bumped version
   differs from the version listed there.

Do not bump a dependency without CI green. Do not batch multiple package bumps
into a single commit unless they are tightly coupled (e.g., `drizzle-orm` +
`drizzle-kit` together).

---

## Compatibility Source of Truth

The version compatibility matrix in `.claude/CLAUDE.md` (§"Version
Compatibility") is the **authoritative record** of which package versions are
known to work together in this stack. Before bumping any package, consult the
matrix to understand cross-package compatibility constraints.

---

## Forward Watch-list

The following packages have version drift or instability that must be
investigated before the phase that installs them:

### drizzle-orm and drizzle-kit (Phase 4)

| Package | CLAUDE.md Pin | npm Current (2026-06-28) | Risk |
|---------|--------------|--------------------------|------|
| `drizzle-orm` | 0.44.x | 0.45.2 | Minor drift; review changelog for breaking changes in migration helpers |
| `drizzle-kit` | 0.25.x | 0.31.10 | **Significant drift** — drizzle-kit minor versions have historically changed CLI syntax and config format; verify carefully before Phase 4 |

**Action before Phase 4:** Read the drizzle-orm and drizzle-kit changelogs
from the CLAUDE.md-pinned version to current. Pin to the versions confirmed
to work with the TanStack Start + Neon stack at Phase 4 planning time. Do not
assume CLAUDE.md pins are still current by the time Phase 4 executes.

### nitro (active dependency)

Current pin: `3.0.260610-beta`

`nitro@3.x` carries a beta designation on npm. The pinned version builds and
deploys to Vercel correctly. Before any nitro bump:

- Verify the resolved version still builds with `npm run build`.
- Confirm Vercel still auto-detects the TanStack Start framework (no 404s on
  SSR routes after deploy).
- Check for nitro changelog entries that affect the Nitro + TanStack Start
  integration specifically.

### content-collections (active dependency)

Current pin: `@content-collections/core@0.15.2` (published 2026-06-16).

This version was published 12 days before the Phase 1 scaffold. Before any
bump:

- Read the content-collections changelog from 0.15.2 to the target.
- Specifically check for any changes to: `defineConfig`, `defineCollection`,
  the injected `z` in the `schema` function, the `transform` API, or the Vite
  plugin's plugin-ordering requirement.
- Run `npm run build` after the bump to confirm content validation still passes.

---

## What Does Not Apply

This policy governs **application dependencies only**. It does not cover:

- Node.js runtime version — see `.nvmrc` or `engines` field if added.
- GitHub Actions runner versions — pinned separately in `.github/workflows/`.
- Vercel build image — managed by Vercel; no pin needed.

---

*Satisfies: D-14 (documented upgrade policy) from Phase 1 implementation decisions.*
