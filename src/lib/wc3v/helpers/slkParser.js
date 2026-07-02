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

/**
 * Generic SLK file parser. Returns { headers: string[], rows: object[] }
 * where each row is keyed by column header name.
 *
 * Usage:
 *   const { parseSLK } = require('../helpers/slkParser');
 *   const data = parseSLK('path/to/file.slk');
 *   // data.headers = ['waterID', 'height', ...]
 *   // data.rows = [{ waterID: 'LSha', height: -0.7, ... }, ...]
 *   // data.byId('LSha') returns the row with column 1 === 'LSha'
 */
function parseSLK (filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  if (!text.startsWith('ID')) {
    throw new Error('Not an SLK file (missing ID header): ' + filePath);
  }

  const grid = [];  // grid[row][col] = value
  let x = 0, y = 0;

  for (const line of text.split(/\r?\n/)) {
    if (line[0] === 'B') continue; // bounds line, skip
    if (line[0] === 'E') break;    // end of file
    for (const token of line.split(';')) {
      const op = token[0];
      const val = token.substring(1).trim();
      if (op === 'X') { x = parseInt(val, 10) - 1; }
      else if (op === 'Y') { y = parseInt(val, 10) - 1; }
      else if (op === 'K') {
        if (!grid[y]) grid[y] = [];
        if (val[0] === '"') {
          grid[y][x] = val.substring(1, val.length - 1);
        } else if (val === 'TRUE') {
          grid[y][x] = true;
        } else if (val === 'FALSE') {
          grid[y][x] = false;
        } else {
          grid[y][x] = parseFloat(val);
        }
      }
    }
  }

  const headerRow = grid[0] || [];
  const headers = [];
  for (let i = 0; i < headerRow.length; i++) {
    headers[i] = headerRow[i] != null ? String(headerRow[i]) : ('col' + (i + 1));
  }

  const rows = [];
  for (let r = 1; r < grid.length; r++) {
    if (!grid[r]) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      if (grid[r][c] !== undefined) {
        obj[headers[c]] = grid[r][c];
      }
    }
    rows.push(obj);
  }

  return {
    headers,
    rows,
    byId (id) {
      const idCol = headers[0];
      return rows.find(r => r[idCol] === id) || null;
    }
  };
}

module.exports = { parseSLK };
