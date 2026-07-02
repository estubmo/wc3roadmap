// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Unit tests for replay-signals.ts — the pure semantic signal layer
 * (REPLAY-02, D-11) and the structural 1v1 gate `isSoloMatch` (D-15,
 * Pitfall 7).
 *
 * deriveReplaySignals/isSoloMatch are PURE functions: no fetch, no DB, no
 * auth, no real `.w3g` binary needed. Every fixture below is a hand-authored
 * minimal-structural-subset object (ReplayPlayerInput/ReplayParsedInput/
 * SoloMatchInput) — the same "minimal structural subset" convention
 * detect-mastery-signals.test.ts follows for AutoDetectableNode.
 *
 * What these tests prove (structural guarantees, not incidental behavior):
 *   - buildOrder merges units + buildings and sorts ascending by ms.
 *   - eapm is a documented, deterministic action-classification heuristic
 *     (A3), normalized per-minute by the replay's own duration.
 *   - controlGroupUsage maps groupHotkeys 1:1 into {groupId, assigned, used}.
 *   - heroTiming pairs heroCollector's level with the hero's own units.order
 *     ms, skipping heroes with no matching order entry (never fabricates 0).
 *   - expansionTimingMs is the first townhall-kind building queued, or null
 *     when none was ever queued.
 *   - Purity: identical input -> deep-equal output across two calls.
 *   - No db/fetch/auth-middleware imports anywhere in the module source.
 *   - isSoloMatch is true only for exactly two players (D-15).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  deriveReplaySignals,
  estimateEffectiveActions,
  isSoloMatch,
  type ReplayPlayerInput,
  type ReplayParsedInput,
  type SoloMatchInput,
} from "./replay-signals";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** A zeroed-out actions block — tests override only the categories they need. */
function actionsFixture(
  overrides: Partial<ReplayPlayerInput["actions"]> = {},
): ReplayPlayerInput["actions"] {
  return {
    timed: [],
    assigngroup: 0,
    rightclick: 0,
    basic: 0,
    buildtrain: 0,
    ability: 0,
    item: 0,
    select: 0,
    removeunit: 0,
    subgroup: 0,
    selecthotkey: 0,
    esc: 0,
    ...overrides,
  };
}

/** A minimal ReplayPlayerInput fixture — tests override only the fields they need. */
function playerFixture(
  overrides: Partial<ReplayPlayerInput> = {},
): ReplayPlayerInput {
  return {
    units: { summary: {}, order: [] },
    buildings: { summary: {}, order: [] },
    groupHotkeys: {},
    heroCollector: {},
    actions: actionsFixture(),
    ...overrides,
  };
}

/** A minimal ReplayParsedInput fixture (duration in ms). */
function parsedFixture(durationMs = 600_000): ReplayParsedInput {
  return { duration: durationMs };
}

// ---------------------------------------------------------------------------
// buildOrder — merge + sort
// ---------------------------------------------------------------------------

describe("deriveReplaySignals — buildOrder", () => {
  it("merges units and buildings and sorts ascending by ms", () => {
    const player = playerFixture({
      units: { summary: {}, order: [{ id: "hpea", ms: 5000 }] },
      buildings: { summary: {}, order: [{ id: "hfar", ms: 1000 }] },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.buildOrder).toEqual([
      { unitOrBuildingId: "hfar", ms: 1000 },
      { unitOrBuildingId: "hpea", ms: 5000 },
    ]);
  });

  it("returns an empty array when nothing was queued", () => {
    const result = deriveReplaySignals(parsedFixture(), playerFixture());
    expect(result.buildOrder).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// eapm — A3 action-classification heuristic, per-minute normalized
// ---------------------------------------------------------------------------

describe("estimateEffectiveActions (A3 heuristic)", () => {
  it("sums only game-state-changing categories, excluding selection/spam noise", () => {
    const actions = actionsFixture({
      assigngroup: 2,
      rightclick: 10,
      basic: 3,
      buildtrain: 4,
      ability: 5,
      item: 1,
      // Spam categories below must NOT contribute to the total.
      select: 100,
      selecthotkey: 100,
      subgroup: 100,
      esc: 100,
      removeunit: 100,
    });
    // 2 + 10 + 3 + 4 + 5 + 1 = 25
    expect(estimateEffectiveActions(actions)).toBe(25);
  });

  it("returns 0 for an all-zero actions block", () => {
    expect(estimateEffectiveActions(actionsFixture())).toBe(0);
  });
});

describe("deriveReplaySignals — eapm (per-minute normalized)", () => {
  it("normalizes the effective action count by the replay's duration in minutes", () => {
    const player = playerFixture({
      actions: actionsFixture({ buildtrain: 60 }),
    });
    // 60 effective actions over 2 minutes (120_000ms) = 30 eapm.
    const result = deriveReplaySignals(parsedFixture(120_000), player);
    expect(result.eapm).toBe(30);
  });

  it("returns 0 rather than dividing by zero for a zero-duration replay", () => {
    const player = playerFixture({ actions: actionsFixture({ basic: 10 }) });
    const result = deriveReplaySignals(parsedFixture(0), player);
    expect(result.eapm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// controlGroupUsage
// ---------------------------------------------------------------------------

describe("deriveReplaySignals — controlGroupUsage", () => {
  it("maps groupHotkeys 1:1 into {groupId, assigned, used} entries", () => {
    const player = playerFixture({
      groupHotkeys: {
        1: { assigned: 3, used: 12 },
        2: { assigned: 1, used: 0 },
      },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.controlGroupUsage).toEqual([
      { groupId: 1, assigned: 3, used: 12 },
      { groupId: 2, assigned: 1, used: 0 },
    ]);
  });

  it("returns an empty array when no groups were ever assigned", () => {
    const result = deriveReplaySignals(parsedFixture(), playerFixture());
    expect(result.controlGroupUsage).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// heroTiming — pairs heroCollector level with units.order ms
// ---------------------------------------------------------------------------

describe("deriveReplaySignals — heroTiming", () => {
  it("pairs each hero's level (heroCollector) with its ms (units.order), sorted ascending", () => {
    const player = playerFixture({
      heroCollector: {
        Hpal: { level: 3, abilities: {}, order: 0, id: "Hpal", retrainingHistory: [], abilityOrder: [] },
        Hblm: { level: 1, abilities: {}, order: 1, id: "Hblm", retrainingHistory: [], abilityOrder: [] },
      },
      units: {
        summary: {},
        order: [
          { id: "Hblm", ms: 90_000 },
          { id: "Hpal", ms: 30_000 },
        ],
      },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.heroTiming).toEqual([
      { heroId: "Hpal", level: 3, ms: 30_000 },
      { heroId: "Hblm", level: 1, ms: 90_000 },
    ]);
  });

  it("skips a hero with no matching units.order entry rather than fabricating ms: 0", () => {
    const player = playerFixture({
      heroCollector: {
        Hpal: { level: 1, abilities: {}, order: 0, id: "Hpal", retrainingHistory: [], abilityOrder: [] },
      },
      units: { summary: {}, order: [] },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.heroTiming).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// expansionTimingMs — first townhall-kind building queued, or null
// ---------------------------------------------------------------------------

describe("deriveReplaySignals — expansionTimingMs", () => {
  it("returns the ms of the first townhall-kind building queued", () => {
    const player = playerFixture({
      buildings: {
        summary: {},
        order: [
          { id: "hfar", ms: 2000 }, // not townhall-kind — ignored
          { id: "htow", ms: 240_000 }, // human town hall — expansion
        ],
      },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.expansionTimingMs).toBe(240_000);
  });

  it("returns null when no townhall-kind building was ever queued", () => {
    const player = playerFixture({
      buildings: { summary: {}, order: [{ id: "hfar", ms: 2000 }] },
    });
    const result = deriveReplaySignals(parsedFixture(), player);
    expect(result.expansionTimingMs).toBeNull();
  });

  it("returns null when nothing was ever built", () => {
    const result = deriveReplaySignals(parsedFixture(), playerFixture());
    expect(result.expansionTimingMs).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Purity — identical input always yields deep-equal output
// ---------------------------------------------------------------------------

describe("deriveReplaySignals — purity", () => {
  it("returns a deep-equal result across two calls with identical input", () => {
    const parsed = parsedFixture(300_000);
    const player = playerFixture({
      units: { summary: {}, order: [{ id: "hpea", ms: 1000 }] },
      buildings: {
        summary: {},
        order: [{ id: "htow", ms: 200_000 }],
      },
      groupHotkeys: { 1: { assigned: 2, used: 5 } },
      heroCollector: {
        Hpal: { level: 2, abilities: {}, order: 0, id: "Hpal", retrainingHistory: [], abilityOrder: [] },
      },
      actions: actionsFixture({ basic: 20 }),
    });

    const first = deriveReplaySignals(parsed, player);
    const second = deriveReplaySignals(parsed, player);

    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// NO I/O — module source imports nothing from db/fetch/auth-middleware
// ---------------------------------------------------------------------------

describe("replay-signals.ts — NO I/O discipline", () => {
  it("imports nothing from #/lib/db, fetch, or #/lib/auth-middleware", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "./replay-signals.ts"),
      "utf-8",
    );
    const importLines = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line));

    for (const line of importLines) {
      expect(line).not.toMatch(/["']#\/lib\/db["']/);
      expect(line).not.toMatch(/\bfetch\b/);
      expect(line).not.toMatch(/["']#\/lib\/auth-middleware["']/);
      expect(line).not.toMatch(/["']\.\.?\/db["']/);
      expect(line).not.toMatch(/["']\.\.?\/auth-middleware["']/);
    }
  });
});

// ---------------------------------------------------------------------------
// isSoloMatch — D-15 structural 1v1 gate
// ---------------------------------------------------------------------------

describe("isSoloMatch (D-15, Pitfall 7)", () => {
  it("returns true for a 2-player replay", () => {
    const parsed: SoloMatchInput = { players: [{}, {}] as SoloMatchInput["players"] };
    expect(isSoloMatch(parsed)).toBe(true);
  });

  it("returns false for a 3+/FFA replay", () => {
    const parsed: SoloMatchInput = {
      players: [{}, {}, {}] as SoloMatchInput["players"],
    };
    expect(isSoloMatch(parsed)).toBe(false);
  });

  it("returns false for a 1-player (or empty) replay", () => {
    expect(isSoloMatch({ players: [] as unknown as SoloMatchInput["players"] })).toBe(
      false,
    );
  });
});
