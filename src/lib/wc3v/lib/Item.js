// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

const utils = require("../helpers/utils"),
      mappings = require("../helpers/mappings");

const Unit = require("./Unit");

const { 
  abilityActions,
  abilityFlagNames,
  mapStartPositions,
  specialBuildings,
  itemAbilityData
} = mappings;

const Item = class extends Unit {

  constructor (eventTimer, itemId1, itemId2, knownItemId, isSpawnedAtStart = false) {
    super(eventTimer, itemId1, itemId2, knownItemId, isSpawnedAtStart);

    this.knownOwner = false;

    this.itemSlotId = null;
    this.knownItemX = null;
    this.knownItemY = null;

    this.expires = false;
    this.usesLeft = 0;

    this.cooldown = 0;
    this.onCooldown = false;

    // Provenance — set by HeroInventory.add when the item enters a slot.
    // `source` ∈ 'startup-grant' | 'shop-known' | 'shop-inferred' |
    //   'creep-drop' | 'pickup' | 'trade' | 'reclassification-backfill' |
    //   'inferred-from-uses'.
    // `confidence` ∈ 'high' | 'medium' | 'low'.
    // `acquiredAt` / `lastModifiedAt` are gameTime stamps for the ledger.
    // `knownObjectId` records the world objectId pair the item was last
    // seen as on the ground (helps trade-out / pickup matching).
    this.source = null;
    this.confidence = null;
    this.acquiredAt = null;
    this.lastModifiedAt = null;
    this.knownObjectId = null;

    const itemData = knownItemId && itemAbilityData[knownItemId];
    if (itemData) {
      const { uses, cooldown } = itemData;

      this.cooldown = cooldown;

      if (uses) {
        this.expires = true;
        this.usesLeft = uses;
      }
    }
  }

  exportItemReference () {
    const self = this;

    return {
      displayName:   self.displayName,
      itemId:        self.itemId,
      itemId1:       self.itemId1 && self.itemId1.toString(),
      itemId2:       self.itemId2 && self.itemId2.toString(),
      objectId1:     self.objectId1,
      objectId2:     self.objectId2,
      isRegistered:  self.isRegistered,
      isUnit:        self.isUnit,
      isBuilding:    self.isBuilding,
      isIllusion:    self.isIllusion,
      level:         self.knownLevel,
      lastPosition:  { x: self.currentX, y: self.currentY },
      // item properties
      onCooldown:    self.onCooldown,
      expires:       self.expires,
      usesLeft:      self.usesLeft,
      knownItemId:   self.knownItemId,
      knownItemX:    self.knownItemX,
      knownItemY:    self.knownItemY,
      // provenance (Phase 2 ledger)
      source:        self.source,
      confidence:    self.confidence,
      acquiredAt:    self.acquiredAt,
      lastModifiedAt: self.lastModifiedAt,
      knownObjectId: self.knownObjectId
    };
  }

  setCooldownState (state) {
    this.onCooldown = state;
  }

  setSlot (slot) {
    this.itemSlotId = slot;
  }

  registerKnownItem (objectId1, objectId2, targetX, targetY) {
    this.registerObjectIds(objectId1, objectId2);

    this.knownItemX = targetX;
    this.knownItemY = targetY;
  }

};

module.exports = Item;
