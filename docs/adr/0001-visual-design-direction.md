# ADR 0001 — Visual design direction and design tokens

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Project owner

## Context

The product needs a single, committed visual direction before UI phases begin.
A throwaway preview app (Vite + React + Tailwind v4 + Motion + `@xyflow/react`,
in a separate git worktree) was built to explore options against the real
product story: the interactive node graph, node detail panels with citations,
and w3champions-driven mastery tracking.

Several directions were mocked and compared:

- **Direction 0 — "Modern"**: dark obsidian base, single warm-gold accent,
  modern grotesk type.
- **Direction 1 — "Reign of Chaos"** and four faction skins (1A Lordaeron /
  1B War Camp / 1C Moonglade / 1D Necropolis): skeuomorphic stone-and-gold,
  heraldic serif.
- Concept sketches: Ladder HUD, Codex Arcanum, Clean Slate, Frostforged.

## Decision

Adopt **Direction 0 ("Modern")** as the design system.

Principles (locked):

1. **One theme, dark.** Off-black obsidian surfaces — never pure `#000`.
2. **One accent.** Warm runed gold (`--color-rune-*`). No AI-purple, no neon
   glow, no serif display by default.
3. **Faction colors are data, not decoration.** Human / Orc / Night Elf /
   Undead tints are used **only** as semantic encoding inside the node graph
   (and legend), never as page-wide accents.
4. **Type:** Space Grotesk (display) + Outfit (body) + JetBrains Mono (ladder
   stats / numbers), self-hosted via Fontsource. No `<link>` to Google Fonts.

Tokens are expressed as Tailwind v4 `@theme` CSS variables so every utility
resolves to `var(--color-*)`. The canonical artifact is
[`src/styles/app.css`](../../src/styles/app.css).

### Token reference

| Token group | Values |
|---|---|
| `--color-obsidian-{950..600}` | `#0a0a0d` `#101015` `#15151c` `#1c1c25` `#262631` `#34343f` |
| `--color-rune-{300..600}` (accent) | `#f4d99b` `#ecc472` `#d9a441` `#b9852c` |
| `--color-faction-human` | `#6ea8ff` |
| `--color-faction-orc` | `#e0593f` |
| `--color-faction-nightelf` | `#59d6c2` |
| `--color-faction-undead` | `#9d7bd8` |
| `--font-display` | Space Grotesk |
| `--font-sans` | Outfit |
| `--font-mono` | JetBrains Mono |

## Alternatives considered

- **Reign of Chaos family (Dir 1, 1A–1D)** — rejected as the default. Strong
  nostalgia appeal but heavier and harder to keep elegant at scale. Kept for
  reference in the preview worktree.
- **HUD / Codex / Clean Slate / Frostforged** — rejected; kept as reference.

Because tokens are CSS variables, a faction-skinned or per-race theme (keyed to
the player's main race from w3champions) remains possible later via a
`[data-theme]` override layer, without touching components. This is explicitly
**out of scope** for v1.

## Consequences

The styling phase must:

1. Install Tailwind v4 and the Vite plugin:
   `npm i -D tailwindcss @tailwindcss/vite` and add `tailwindcss()` to
   `vite.config.ts` plugins.
2. Install fonts:
   `npm i @fontsource-variable/space-grotesk @fontsource-variable/outfit @fontsource-variable/jetbrains-mono`.
3. Import `src/styles/app.css` from `src/routes/__root.tsx` (e.g. as a
   `?url` asset linked in `head`, the TanStack Start convention).

Until then, `src/styles/app.css` is an unreferenced, version-controlled
artifact: it does not affect the current build.
