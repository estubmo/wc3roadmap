// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * `.w3g` binary replay parser wrapper — the SOLE server-side seam where an
 * untrusted `.w3g` buffer is turned into typed w3gjs output (REPLAY-01).
 *
 * DEEP MODULE: this is the ONLY place `w3gjs` is imported anywhere in this
 * project for parsing. The pure semantic signal layer (`replay-signals.ts`,
 * 08-05) and every downstream consumer work exclusively off the typed
 * `ParserOutput`/`Player` types re-exported below — they never import
 * `w3gjs` directly, and this module never imports db/auth/fetch.
 *
 * Server-only: requires Node `Buffer` and is never bundled to the client
 * (mirrors the "server-only" discipline documented in
 * `src/lib/w3champions-client.ts`).
 *
 * THREAT MODEL (T-08-03a/b): an uploaded or auto-pulled `.w3g` buffer is
 * untrusted binary input crossing into w3gjs. `parseReplay` wraps the parse
 * call in a single try/catch and, on ANY failure, throws one opaque
 * `ReplayParseError` — no upstream/internal parser error strings ever leave
 * this module (mirrors `w3champions-client.ts`'s T-07-06c "no upstream error
 * strings" discipline). A malformed or adversarial replay fails cleanly
 * rather than crashing the server function or leaking internal parser state.
 * The upload size cap (ADR 011, enforced upstream in 08-11/08-12) is the
 * first-line resource-exhaustion guard; this module is the parse-failure
 * backstop.
 */

import W3GReplay from "w3gjs";
import type { ParserOutput } from "w3gjs";

export type { ParserOutput };
/**
 * w3gjs does not export `Player` as a named type (only as a `default` class
 * export from an internal module path) — derive it structurally from
 * `ParserOutput["players"]` instead of reaching into `w3gjs`'s internals.
 */
export type Player = ParserOutput["players"][number];

/**
 * Opaque parse failure. Deliberately carries NO upstream/internal detail —
 * only this fixed message. Thrown for any malformed, truncated, or
 * non-`.w3g` buffer.
 */
export class ReplayParseError extends Error {
  constructor() {
    super("Failed to parse replay");
    this.name = "ReplayParseError";
  }
}

/**
 * Parse a `.w3g` replay buffer into typed w3gjs `ParserOutput` — build
 * order, APM, group hotkeys, hero timing, and per-player actions (REPLAY-01).
 *
 * Any parse failure (malformed buffer, non-`.w3g` content, truncated data)
 * rejects with an opaque `ReplayParseError` instead of surfacing w3gjs's
 * internal error detail.
 */
export async function parseReplay(buffer: Buffer): Promise<ParserOutput> {
  try {
    const parser = new W3GReplay();
    return await parser.parse(buffer);
  } catch {
    throw new ReplayParseError();
  }
}
