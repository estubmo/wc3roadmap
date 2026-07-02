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
 * Effective attack range lookup. Combines:
 *   - base range from helpers/unitRanges.json (extracted from UnitWeapons.slk)
 *   - per-player research-bonus deltas from helpers/rangeUpgrades.js, applied
 *     against the player's research event timeline
 *
 * Usage:
 *   getBaseRange(itemId)                 // number | 0 (0 = no weapon / melee N/A)
 *   getEffectiveRange(itemId, player)    // base + bonus the player has researched
 *
 * Returns 0 for units with no attack (workers, transports without weapons).
 * Callers should fall back to a small melee-equivalent stop distance when 0.
 */

const unitRangesData = require('./unitRanges.json');
const { RANGE_UPGRADES } = require('./rangeUpgrades');

const RANGES = (unitRangesData && unitRangesData.ranges) || {};

function getBaseRange (itemId) {
  if (!itemId) return 0;
  const entry = RANGES[itemId];
  return entry ? entry.range : 0;
}

// Sums all range bonuses the player has researched that apply to this unit.
// Walks the player's researchStream (server-side Unit data); for the browser
// client, a player object with the same shape works equivalently.
function getPlayerRangeBonus (itemId, player) {
  if (!player || !itemId) return 0;
  const research = player.researchLevels || player.researchStream || null;
  if (!research) return 0;

  // researchLevels is the live server map { upgradeId: level }; if it's
  // present prefer it (cheap dict lookup). Otherwise walk researchStream
  // and look for the upgrade.
  let bonus = 0;
  for (const upgradeId in RANGE_UPGRADES) {
    const upgrade = RANGE_UPGRADES[upgradeId];
    if (!upgrade.applies.includes(itemId)) continue;
    let level = 0;
    if (research[upgradeId] != null) {
      level = research[upgradeId] | 0;
    } else if (Array.isArray(research)) {
      for (const r of research) {
        if (r && r.itemId === upgradeId) level = Math.max(level, r.level | 0);
      }
    }
    if (level > 0) bonus += upgrade.delta * level;
  }
  return bonus;
}

function getEffectiveRange (itemId, player) {
  return getBaseRange(itemId) + getPlayerRangeBonus(itemId, player);
}

// Acquisition range: how far away a unit will "see" an enemy and start moving
// to attack it (WC3 "acquire" field from UnitWeapons.slk). Always >= the unit's
// attack range. Range research that extends attack range extends acquisition by
// the same delta in WC3, so we add the same bonus. Falls back to the unit's
// effective attack range when no acquire datum exists (melee/no-weapon units),
// then a small floor so a value is always usable as a search radius.
function getAcquisitionRange (itemId, player) {
  if (!itemId) return 0;
  const entry = RANGES[itemId];
  const base = (entry && entry.acquire != null) ? entry.acquire : getBaseRange(itemId);
  return base + getPlayerRangeBonus(itemId, player);
}

module.exports = {
  getBaseRange,
  getPlayerRangeBonus,
  getEffectiveRange,
  getAcquisitionRange
};
