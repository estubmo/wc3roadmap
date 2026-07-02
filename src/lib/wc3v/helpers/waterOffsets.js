// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

// Default-water height offsets per tileset.
//
// Used only by the synthesis fallback in helpers/minimapRenderer.js when
// war3mapMap.blp is unavailable. The BLP-decoded path never reads these.
//
// Values seeded from tools/map-data/terrainart/water.slk column "height" for
// each tileset's default *Sha (shallow) water row. WC3's actual minimap
// formula folds this into the per-corner water-plane height:
//
//   waterWorldY = (waterLevel - 0x2000) / 4 - 89.6 + WATER_OFFSETS[T] * 128
//
// (HiveWE terrain.ixx line ~879). The deep/shallow blend constants are the
// same regardless of tileset; only the threshold shifts.

const WATER_OFFSETS = {
  L: -0.7,  // Lordaeron Summer
  V: -0.7,  // Village
  F: -0.7,  // Lordaeron Fall
  X: -0.7,  // Village Fall
  W: -0.7,  // Lordaeron Winter
  N: -0.7,  // Northrend
  I: -0.7,  // Icecrown Glacier
  A: -0.6,  // Ashenvale
  C: -0.7,  // Felwood
  B: -0.7,  // Barrens
  D: -0.75, // Dungeon
  G: -0.75, // Underground
  K: -0.7,  // Cityscape
  J: -0.6,  // Dalaran Ruins
  Y: -0.4,  // Sunken Ruins
  Z: -0.6,  // Ruins
  Q: -0.7,  // Dalaran
  O: -0.5   // Outland
};

const DEFAULT_WATER_OFFSET = -0.7;

module.exports = { WATER_OFFSETS, DEFAULT_WATER_OFFSET };
