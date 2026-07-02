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
 * translated from https://github.com/ChiefOfGxBxL/WC3MapTranslator/blob/1f349b0d0bfb2042b9eee84bca65094c745704a2/lib/translators/DoodadsTranslator.ts
 * used for researching and learning purposes only.  all copyright andd rights reserved to the owner under MIT license.
 **/

const fs = require('fs');
const W3Buffer = require('./W3Buffer');

const DOOFile = class {
  constructor (filePath) {
    this.read(filePath);
  }

  // Build an instance from already-parsed cache JSON (browser path).
  // cacheJson is the shape written by `write()`: { grid: [...doodads...] }.
  static fromCache (cacheJson) {
    const inst = Object.create(DOOFile.prototype);
    inst.grid = cacheJson.grid;
    return inst;
  }

  write (outPath) {
    // write the grid as json

    fs.writeFileSync(
      outPath, JSON.stringify({ "grid": this.grid }, null, 2) , 'utf-8');
  }

  read (filePath) {
    const buffer = fs.readFileSync(filePath);
    const outBuffer = new W3Buffer(buffer);

    const fileId = outBuffer.readChars(4); // W3do for doodad file
    const fileVersion = outBuffer.readInt(); // File version = 8
    const subVersion = outBuffer.readInt(); // 0B 00 00 00
    const numDoodads = outBuffer.readInt(); // # of doodads

    this.grid = [];

    for (let i = 0; i < numDoodads; i++) {
        const doodad = {
            type: '',
            variation: 0,
            position: { x: 0, y: 0, z: 0 },
            angle: -1,
            scale: [0, 0, 0],
            skinId: '',
            flags: { visible: 0, solid: 0 },
            life: -1,
            id: -1
        };

        doodad.type = outBuffer.readChars(4);
        doodad.variation = outBuffer.readInt();
        
        // X Y Z coords
        doodad.position = {
          x: outBuffer.readFloat().toFixed(4), 
          y: outBuffer.readFloat().toFixed(4), 
          z: outBuffer.readFloat().toFixed(4)
        }; 

        // Angle
        doodad.angle = outBuffer.readFloat();

        doodad.scale = [outBuffer.readFloat(), outBuffer.readFloat(), outBuffer.readFloat()]; // X Y Z scaling
        doodad.skinId = outBuffer.readChars(4);

        const flags = outBuffer.readByte();
        doodad.flags = {
            visible: flags === 1 || flags === 2,
            solid: flags === 2
        };

        doodad.life = outBuffer.readByte(); // as a %

        // UNSUPPORTED: random item set drops when doodad is destroyed/killed
        // This section just consumes the bytes from the file
        const randomItemSetPtr = outBuffer.readInt(); // points to an item set defined in the map (rather than custom one defined below)
        const numberOfItemSets = outBuffer.readInt(); // this should be 0 if randomItemSetPtr is >= 0

        for (let j = 0; j < numberOfItemSets; j++) {
            // Read the item set
            const numberOfItems = outBuffer.readInt();
            for (let k = 0; k < numberOfItems; k++) {
                outBuffer.readChars(4); // Item ID
                outBuffer.readInt(); // % chance to drop
            }
        }

        doodad.id = outBuffer.readInt();

        this.grid.push(doodad);
    }
  }
};

module.exports = DOOFile;
