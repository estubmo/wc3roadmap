// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { parseReplay, ReplayParseError } from "./replay-parser";

/**
 * Real fixture from 08-01 (the Nyquist "real-binary" vehicle) — see
 * src/lib/__fixtures__/README.md for provenance. Parsing logic against the
 * undocumented `.w3g` wire format is verified against actual game files,
 * not hand-crafted mocks.
 */
const FIXTURE_PATH = resolve(import.meta.dirname, "./__fixtures__/1v1-sample.w3g");

describe("parseReplay", () => {
  it("resolves a real fixture with the full REPLAY-01 field shape", async () => {
    const buffer = readFileSync(FIXTURE_PATH);

    const result = await parseReplay(buffer);

    expect(result.buildNumber).toBeGreaterThan(0);
    expect(typeof result.version).toBe("string");
    expect(result.version.length).toBeGreaterThan(0);
    expect(typeof result.duration).toBe("number");
    expect(result.players.length).toBeGreaterThanOrEqual(2);

    for (const player of result.players) {
      expect(typeof player.apm).toBe("number");
      expect(player.groupHotkeys).toBeDefined();
      expect(Array.isArray(player.units.order)).toBe(true);
      expect(Array.isArray(player.buildings.order)).toBe(true);
      expect(Array.isArray(player.upgrades.order)).toBe(true);
      expect(Array.isArray(player.items.order)).toBe(true);
      expect(player.heroCollector).toBeDefined();
      expect(player.actions).toBeDefined();
    }
  });

  it("rejects a garbage buffer with an opaque ReplayParseError — no internal detail leaks", async () => {
    const garbage = Buffer.from("not a real replay file, just garbage bytes");

    await expect(parseReplay(garbage)).rejects.toThrow(ReplayParseError);

    try {
      await parseReplay(garbage);
      throw new Error("expected parseReplay to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(ReplayParseError);
      // Opaque — the message must never echo w3gjs's internal parser detail.
      expect((err as Error).message).toBe("Failed to parse replay");
    }
  });
});
