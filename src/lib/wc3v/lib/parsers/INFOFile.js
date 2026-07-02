// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

 const fs = require('fs');
 const W3Buffer = require('./W3Buffer');

 // note: only reads enough of the file for what we need

 const INFOFile = class {
  constructor (filePath, mapData) {
    this.read(filePath, mapData);
  }

  write (outPath) {
    // write the grid as json

    fs.writeFileSync(
      outPath, JSON.stringify({ info: this.info }, null, 2) , 'utf-8');
  }

  read (filePath, mapData) {
    this.info = this.doParsing(filePath, mapData, false);
  }


  doParsing (filePath, mapData, useUnknown = false) {
    const buffer = fs.readFileSync(filePath);
    const outBuffer = new W3Buffer(buffer);

    outBuffer.readInt();
    outBuffer.readInt(); // saves
    outBuffer.readInt(); // editor
    outBuffer.readInt(); // major
    outBuffer.readInt(); // minor
    outBuffer.readInt(); // patch
    outBuffer.readInt(); // build

    outBuffer.readString(); // name

    outBuffer.readString(); // author
    outBuffer.readString(); // desc
    outBuffer.readString(); // rec

    // Camera bounds (8 floats total)
    const cameraBounds = [];

    for (let cbIndex = 0; cbIndex < 8; cbIndex++) {
        cameraBounds.push(outBuffer.readFloat()); // cam bounds
    }

    // Camera complements: boundary margins [left, right, bottom, top] in tiles
    const margins = [];
    for (let ccIndex = 0; ccIndex < 4; ccIndex++) {
        margins.push(outBuffer.readInt());
    }

    const playableWidth = outBuffer.readInt();
    const playableHeight = outBuffer.readInt();

    return {
      bounds: {
        camera: [
          [ cameraBounds[4], cameraBounds[5] ],
          [ cameraBounds[6], cameraBounds[7] ] 
        ],
        map: [
          [ cameraBounds[0], cameraBounds[1] ],
          [ cameraBounds[2], cameraBounds[3] ]
        ]
      },
      gridSize: {
        playable: [ playableWidth, playableHeight ],
        margins: margins
      }
    };
  }
};

module.exports = INFOFile;
