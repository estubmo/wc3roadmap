// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

/*
 * inventoryProvenance — claims about inventory slot bindings or item
 * uses get weighted by the source of the underlying Item.
 *
 * For teleport claims: the dispatching slot's item has a `source` field
 * (set by HeroInventory.add: 'startup-grant', 'shop-known', 'shop-inferred',
 * 'creep-drop', 'pickup', 'trade', 'reclassification-backfill',
 * 'inferred-from-uses', 'use-no-slot').
 *
 * A `startup-grant` item used in the first ~3 minutes of game is the
 * defining red flag — the auto-grant is supposed to sit unused unless
 * the player actually invokes a TP. Tracked purchases ('shop-known')
 * support the claim strongly.
 *
 * This strategy is look-behind (uses data captured at dispatch time).
 */

const SOURCE_WEIGHTS = Object.freeze({
  'shop-known':                  +0.4,   // explicit purchase observed
  'shop-inferred':               +0.2,   // inferred purchase, less certain
  'trade':                       +0.3,   // hero-to-hero trade is concrete
  'creep-drop':                  +0.2,
  'pickup':                      +0.2,
  // Reclassification is the parser self-correcting (e.g. stwp→stel when
  // target wasn't a TH). It's a *positive* signal that the surface item
  // claim matches reality better; the teleport itself stays neutral.
  'reclassification-backfill':   0.0,
  'inferred-from-uses':          -0.3,   // synthesized post-hoc
  'use-no-slot':                 -0.3,
  'startup-grant':               -0.3    // the auto-grant. Suspect when used early.
});

module.exports = {
  name:     'inventoryProvenance',
  subjects: ['teleport', 'itemUse'],
  phase:    'look-behind',

  score (claim, ctx) {
    const payload = claim.payload || {};
    // payload.itemSource is set when the dispatch builds the claim.
    const src = payload.itemSource;
    if (!src) return null;

    let weight = SOURCE_WEIGHTS[src];
    if (weight == null) return null;

    // Slot-tracking can mis-attribute *which* of multiple same-itemId
    // entries got used. If the player has a real tracked purchase of
    // the alleged item before the cast, treat a 'startup-grant'
    // attribution as suspect: the click probably resolved to the
    // *purchased* copy, not the auto-grant. Same Phase-B root cause
    // as recentPurchaseContradiction's matching-purchase guard.
    if (src === 'startup-grant' &&
        hasPriorPurchase(ctx.player, payload.itemId, payload.gameTime)) {
      return {
        kind:   'observation',
        weight: +0.1,
        ref:    { gameTime: payload.gameTime },
        detail: {
          itemSource: src, rule: 'inventoryProvenance',
          note: 'matching prior purchase exists; slot attribution likely off'
        }
      };
    }

    // Startup-grant gets harsher early in the game (sub-3:00 stwp casts
    // are almost never legitimate — the free TP is an emergency item).
    if (src === 'startup-grant' && payload.gameTime != null && payload.gameTime < 180000) {
      weight = -0.5;
    }

    return {
      kind:   weight >= 0 ? 'observation' : 'contradiction',
      weight,
      ref:    { gameTime: payload.gameTime },
      detail: { itemSource: src, rule: 'inventoryProvenance' }
    };
  }
};

function hasPriorPurchase (player, itemId, beforeTime) {
  if (!player || !player.eventStream || !itemId || beforeTime == null) return false;
  for (const ev of player.eventStream) {
    if (ev.gameTime == null) continue;
    if (ev.gameTime > beforeTime) break;
    if (ev.key !== 'itemPurchase' && ev.key !== 'pickupItem') continue;
    const id = ev.item && (ev.item.itemId || ev.item.knownItemId);
    if (id === itemId) return true;
  }
  return false;
}
