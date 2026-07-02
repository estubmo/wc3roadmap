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

const LUAJASSFile = class {
  constructor (filePath, mapData) {
    this.read(filePath, mapData);
  }

  write (outPath) {

  }

  read (filePath, mapData) {
    const buffer = fs.readFileSync(filePath, 'utf-8');
    const lines = buffer.split(/\r?\n/);

    const searchTarget = 'DefineStartLocation';
    const targets = [];

    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();

      if (line.indexOf(searchTarget) != -1) {
        targets.push(line);
      }
    });

    const output = {};
    const pattern = new RegExp(/\((.*)\)/, 'g');
    
    targets.forEach(target => {
      const matches = target.match(pattern);
      const trimmed = matches.map(match => {
        return match.substring(1, match.length - 1);
      });

      trimmed.forEach(item => {
        const arr = item.split(",");

        // add the starting position to the output object with the key as the spot id
        output[arr[0]] = { x: parseFloat(arr[1]), y: parseFloat(arr[2]) };
      });
    });

    this.startingPositions = output;
  }
};

module.exports = LUAJASSFile;
