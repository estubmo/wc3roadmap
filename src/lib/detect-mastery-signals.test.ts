// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Wave-0 unit tests for detectMasterySignals — the pure auto-detect eligibility
 * function (AUTO-03, D-02, D-05, D-10c).
 *
 * detectMasterySignals is a PURE function: no fetch, no DB, no auth. All inputs
 * are supplied by the caller (07-07 syncW3championsHandler). These tests need
 * NO mocking — they construct plain fixtures and assert on the emitted node ids.
 *
 * What these tests prove (structural guarantees, not incidental behavior):
 *   - "CONCEPTUAL": a CONCEPTUAL node is NEVER emitted, even when its criterion
 *     is trivially met (AUTO-03 / criterion 5, T-07-05a). The MECHANIC-only
 *     filter is the structural guarantee that CONCEPTUAL can never advance.
 *   - "untouched": a MECHANIC node already present in existingProgressNodeIds is
 *     NEVER emitted, even when its criterion is met (D-05 untouched-only,
 *     T-07-05b). Auto-detect only ever proposes ids absent from the set.
 *   - A MECHANIC node with no autoDetect field is never emitted (D-01 default).
 *   - gamesPlayed: emitted iff signals.gamesPlayed >= gte (boundary inclusive).
 *   - mmrTier: emitted iff tierIndex(signal) >= tierIndex(gte) — ordinal, not
 *     string, comparison ("gold" node fires for gold/diamond, not for silver).
 *   - mmrTier under a null (unranked) signal is never emitted (D-10c no-data).
 *   - Output shape is { nodeId }[] carrying only qualifying MECHANIC untouched ids.
 */

import { describe, it, expect } from "vitest";
import {
  detectMasterySignals,
  type AutoDetectableNode,
  type W3cSignals,
} from "./detect-mastery-signals";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Extract the flat list of emitted node ids for concise assertions. */
function emittedIds(
  nodes: AutoDetectableNode[],
  signals: W3cSignals,
  existing: ReadonlySet<string> = new Set(),
): string[] {
  return detectMasterySignals(nodes, signals, existing).map((c) => c.nodeId);
}

/** A signal payload comfortably above every threshold used below. */
const highSignals: W3cSignals = { mmrTier: "diamond", gamesPlayed: 500 };

// ---------------------------------------------------------------------------
// AUTO-03 — CONCEPTUAL nodes can never advance (structural guarantee)
// ---------------------------------------------------------------------------

describe("detectMasterySignals — CONCEPTUAL nodes never emit (AUTO-03, T-07-05a)", () => {
  it("does not emit a CONCEPTUAL node whose criterion is trivially met", () => {
    const nodes: AutoDetectableNode[] = [
      {
        id: "map-awareness",
        nodeType: "CONCEPTUAL",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
    ];
    expect(emittedIds(nodes, highSignals)).toEqual([]);
  });

  it("emits the MECHANIC sibling but never the CONCEPTUAL one from a mixed list", () => {
    const nodes: AutoDetectableNode[] = [
      {
        id: "creep-routing", // MECHANIC — should emit
        nodeType: "MECHANIC",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
      {
        id: "map-awareness", // CONCEPTUAL — must never emit
        nodeType: "CONCEPTUAL",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
    ];
    expect(emittedIds(nodes, highSignals)).toEqual(["creep-routing"]);
  });
});

// ---------------------------------------------------------------------------
// D-05 — untouched-only: nodes with an existing progress row never emit
// ---------------------------------------------------------------------------

describe("detectMasterySignals — untouched-only (D-05, T-07-05b)", () => {
  it("does not emit a MECHANIC node already in existingProgressNodeIds, even when its criterion is met", () => {
    const nodes: AutoDetectableNode[] = [
      {
        id: "supply-management",
        nodeType: "MECHANIC",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
    ];
    const existing = new Set(["supply-management"]);
    expect(emittedIds(nodes, highSignals, existing)).toEqual([]);
  });

  it("emits only the untouched MECHANIC node when a touched sibling also qualifies", () => {
    const nodes: AutoDetectableNode[] = [
      {
        id: "touched-node",
        nodeType: "MECHANIC",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
      {
        id: "fresh-node",
        nodeType: "MECHANIC",
        autoDetect: { signal: "gamesPlayed", gte: 1 },
      },
    ];
    const existing = new Set(["touched-node"]);
    expect(emittedIds(nodes, highSignals, existing)).toEqual(["fresh-node"]);
  });
});

// ---------------------------------------------------------------------------
// D-01 — graceful default: a MECHANIC node with no autoDetect never emits
// ---------------------------------------------------------------------------

describe("detectMasterySignals — no autoDetect field (D-01 graceful default)", () => {
  it("never emits a MECHANIC node lacking an autoDetect criterion", () => {
    const nodes: AutoDetectableNode[] = [
      { id: "no-criterion", nodeType: "MECHANIC" },
    ];
    expect(emittedIds(nodes, highSignals)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// D-02 — gamesPlayed threshold (boundary inclusive)
// ---------------------------------------------------------------------------

describe("detectMasterySignals — gamesPlayed threshold (D-02, boundary inclusive)", () => {
  const node: AutoDetectableNode = {
    id: "ladder-experience",
    nodeType: "MECHANIC",
    autoDetect: { signal: "gamesPlayed", gte: 50 },
  };

  it("emits when gamesPlayed is above the threshold", () => {
    expect(emittedIds([node], { mmrTier: null, gamesPlayed: 51 })).toEqual([
      "ladder-experience",
    ]);
  });

  it("emits when gamesPlayed equals the threshold (inclusive boundary)", () => {
    expect(emittedIds([node], { mmrTier: null, gamesPlayed: 50 })).toEqual([
      "ladder-experience",
    ]);
  });

  it("does not emit when gamesPlayed is below the threshold", () => {
    expect(emittedIds([node], { mmrTier: null, gamesPlayed: 49 })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// D-02 — mmrTier ordinal threshold (tierIndex comparison, not string compare)
// ---------------------------------------------------------------------------

describe("detectMasterySignals — mmrTier ordinal threshold (D-02)", () => {
  const goldNode: AutoDetectableNode = {
    id: "gold-mechanic",
    nodeType: "MECHANIC",
    autoDetect: { signal: "mmrTier", gte: "gold" },
  };

  it("emits when the signal tier equals the gte tier (gold >= gold, inclusive)", () => {
    expect(emittedIds([goldNode], { mmrTier: "gold", gamesPlayed: 0 })).toEqual(
      ["gold-mechanic"],
    );
  });

  it("emits when the signal tier is ordinally above the gte tier (diamond >= gold)", () => {
    expect(
      emittedIds([goldNode], { mmrTier: "diamond", gamesPlayed: 0 }),
    ).toEqual(["gold-mechanic"]);
  });

  it("does not emit when the signal tier is ordinally below the gte tier (silver < gold)", () => {
    expect(emittedIds([goldNode], { mmrTier: "silver", gamesPlayed: 0 })).toEqual(
      [],
    );
  });
});

// ---------------------------------------------------------------------------
// D-10c — unranked (mmrTier === null) never satisfies an mmrTier criterion
// ---------------------------------------------------------------------------

describe("detectMasterySignals — unranked signal, mmrTier === null (D-10c)", () => {
  it("never emits an mmrTier node when the player is unranked (null tier)", () => {
    const node: AutoDetectableNode = {
      id: "any-tier-mechanic",
      nodeType: "MECHANIC",
      autoDetect: { signal: "mmrTier", gte: "bronze" },
    };
    // Even the lowest tier gate must not fire on a null (no-data) signal.
    expect(emittedIds([node], { mmrTier: null, gamesPlayed: 999 })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("detectMasterySignals — output shape", () => {
  it("returns an array of { nodeId } objects for qualifying nodes", () => {
    const nodes: AutoDetectableNode[] = [
      {
        id: "harass-timing",
        nodeType: "MECHANIC",
        autoDetect: { signal: "gamesPlayed", gte: 10 },
      },
    ];
    expect(detectMasterySignals(nodes, highSignals, new Set())).toEqual([
      { nodeId: "harass-timing" },
    ]);
  });

  it("returns an empty array when no nodes qualify", () => {
    expect(detectMasterySignals([], highSignals, new Set())).toEqual([]);
  });
});
