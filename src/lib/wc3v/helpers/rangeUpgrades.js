// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

/**
 * Range-modifying research upgrades. Hand-maintained table — covers the
 * standard melee-WC3 range upgrades only; extend as needed.
 *
 * Schema per entry:
 *   { displayName, applies: [unit itemIds], delta: WU }
 *
 * Per-player range state is reconstructed from the player's research event
 * stream (lib/Player.addResearch); see helpers/effectiveRange.js for the
 * lookup used at action-dispatch time.
 *
 * Sources verified against UnitWeapons.slk via tools/extract-unit-ranges.js
 * (e.g. Rifleman base 400, Long Rifles +200 → effective 600 — matches
 * WC3 tooltip text).
 */

const RANGE_UPGRADES = {
  // Human — Long Rifles, riflemen only
  'Rhri': { displayName: 'Long Rifles',     applies: ['hrif'],        delta: 200 },

  // Night Elf — Marksmanship, archers only
  'Remk': { displayName: 'Marksmanship',    applies: ['earc'],        delta: 100 },

  // (Orc and Undead have no native range-extender upgrade — Headhunters
  // / Crypt Fiends get other stat boosts instead.)
};

module.exports = { RANGE_UPGRADES };
