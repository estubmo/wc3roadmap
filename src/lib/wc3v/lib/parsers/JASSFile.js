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

const METHOD_HEADERS = {
  'neutralHostiles': 'function CreateNeutralHostile takes nothing returns nothing',
  'neutralPassiveBuildings': 'function CreateNeutralPassiveBuildings takes nothing returns nothing',
  'neutralPassive': 'function CreateNeutralPassive takes nothing returns nothing'
};

const METHOD_CREATE = 'CreateUnit';
const METHOD_END = 'endfunction';

const JASSFile = class {
  constructor (filePath, mapData) {
    this.read(filePath, mapData);
  }

  write (outPath) {

  }

  read (filePath, mapData) {
    const buffer = fs.readFileSync(filePath, 'utf-8');
    const methodKeys = Object.keys(METHOD_HEADERS);
    const lines = buffer.split(/\r?\n/);

    let isSectionOpen = false;
    let openSection = null;

    const methodMap = methodKeys.reduce((acc, key) => {
      acc[key] = null;

      return acc;
    }, {});

    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();

      methodKeys.forEach(methodKey => {
        const methodText = METHOD_HEADERS[methodKey];
        
        // ending sections
        if (line.startsWith(METHOD_END)) {
          if (openSection && methodMap[openSection]) {
            methodMap[openSection].end = lineIndex;

            isSectionOpen = false;
            openSection = null;
          }
        }

        // starting sections
        if (line.startsWith(methodText)) {
          if (isSectionOpen) {
            console.error("error in JASS file, missing ending block section.", openSection);
            throw new Error("JASS file error");
          }

          isSectionOpen = true;
          openSection = methodKey;

          methodMap[methodKey] = {
            start: lineIndex,
            end: null,
            units: []
          };
        }

        // units

        if (isSectionOpen && methodMap[openSection]) {
          if (line.includes(METHOD_CREATE)) {
            methodMap[openSection].units.push(line);
          }
        }
      });
    });

    console.log("jass method map: ", methodMap);

  }
};

module.exports = JASSFile;
