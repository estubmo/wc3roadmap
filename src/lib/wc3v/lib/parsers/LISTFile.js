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

 // NOTE:  this is buggy but it does the job

 const LISTFile = class {
  constructor (filePath, mapData) {
    this.read(filePath, mapData);
  }

  write (outPath) {
    // write the grid as json

    fs.writeFileSync(
      outPath, JSON.stringify({ "files": this.files }, null, 2) , 'utf-8');
  }

  read (filePath, mapData) {
    this.files = this.doParsing(filePath, mapData, true);
  }

  doParsing (filePath, mapData, useUnknown = false) {
    const buffer = fs.readFileSync(filePath);
    const outBuffer = new W3Buffer(buffer);

    let currentString = "",
        result = [];

    const fullBufferSize = outBuffer._buffer.length;

    while (!outBuffer.isExhausted()) {
      const rawChar = outBuffer.readCharsRaw(1);
      const newChar = String.fromCharCode(rawChar[0]);
      const charCode = newChar.charCodeAt(0);

      if (charCode == 13) {
        continue;
      } else if (charCode == 10) {
        result.push(currentString);
        currentString = "";  
      } else {
        currentString += newChar;
      }
    }

    if (currentString != "") {
      result.push(currentString);
    }

    return result;
  }
};

module.exports = LISTFile;
