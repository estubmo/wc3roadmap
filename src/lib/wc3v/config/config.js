// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.


const config = {
  logToConsole: false,
	debugActions: false,
	debugPlayer: null,
	debugWorkers: false,
	debugOutput: false,
	// when true, prints HeroItemN dispatch context (slot, opcode, items[slot],
	// targetUnit) at every targeted/no-target item use. Diagnostic for
	// slot-drift investigations (phantom TP detection). Pairs with
	// `debugPlayer` to scope to one player.
	debugItemDispatch: false,
	// when true, capture authoritative replay move-command targets
	// (gameTime, targetX/Y, unit uuids) into player.moveTrace for the
	// path-verification harness. Opt-in via `--move-trace`; not exported
	// in normal runs.
	moveTrace: false,
	// when true, capture combat-formation resolution context (per attack order:
	// resolved slots, unit roles/ranges, enemy count, focus point, stop-vs-range
	// error) into player.formationTrace for tools/formation-check.js. Opt-in via
	// `--formation-trace`; not exported in normal runs.
	debugFormation: false,
	// Kinematic re-simulation of unit paths (move speed + turn rate + propulsion
	// window) — lib/KinematicResim.js. Default ON. Set false to fall back to the
	// legacy facing-only bake (lib/FacingInference.js) for A/B debugging.
	kinematicResim: true
};

module.exports = config;
