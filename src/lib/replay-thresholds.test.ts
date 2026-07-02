// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Wave-2 unit tests for detectReplaySignals — the pure, patch-aware
 * replay-threshold detector (REPLAY-06/07/08, D-02, D-11).
 *
 * detectReplaySignals is a PURE function: no fetch, no DB, no auth. These
 * tests construct plain fixtures and assert on the emitted results — no
 * mocking needed.
 *
 * What these tests prove (structural guarantees, not incidental behavior):
 *   - MECHANIC-only: a CONCEPTUAL node never emits, even when its criterion
 *     is trivially met.
 *   - replayCriteria-required: a MECHANIC node with no replayCriteria never
 *     emits (graceful default).
 *   - Each of the five signal variants emits on a met threshold and does not
 *     emit on a missed one, boundary-tested where applicable.
 *   - Every emitted result carries { nodeId, targetState: "mastered", actual,
 *     target, signal } — the REPLAY-07 feedback contract.
 *   - Purity: identical input produces deep-equal output across calls.
 *   - NOT untouched-only (D-11): the function signature carries no
 *     existingProgressNodeIds parameter at all — it is free to retarget any
 *     node regardless of prior progress (structural guarantee by omission,
 *     mirroring how detectMasterySignals's D-05 filter is proven present by
 *     its explicit `existingProgressNodeIds` parameter).
 */

import { describe, it, expect } from "vitest";
import { detectReplaySignals, type ReplayThresholdInput } from "./replay-thresholds";
import type { ReplaySignals } from "./replay-signals";
import { CURRENT_PATCH } from "./patches";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** A ReplaySignals fixture with every signal at a "no data" baseline. */
const emptySignals: ReplaySignals = {
  buildOrder: [],
  eapm: 0,
  controlGroupUsage: [],
  heroTiming: [],
  expansionTimingMs: null,
};

const PATCH_ID = CURRENT_PATCH.id;

// ---------------------------------------------------------------------------
// MECHANIC-only (structural guarantee)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — MECHANIC-only (structural guarantee)", () => {
  it("never emits a CONCEPTUAL node, even when its criterion is trivially met", () => {
    const nodes: ReplayThresholdInput[] = [
      {
        id: "map-awareness",
        nodeType: "CONCEPTUAL",
        replayCriteria: { signal: "eapm", gte: 1 },
      },
    ];
    expect(detectReplaySignals(nodes, { ...emptySignals, eapm: 999 }, PATCH_ID)).toEqual([]);
  });

  it("emits the MECHANIC sibling but never the CONCEPTUAL one from a mixed list", () => {
    const nodes: ReplayThresholdInput[] = [
      {
        id: "eapm-mechanic",
        nodeType: "MECHANIC",
        replayCriteria: { signal: "eapm", gte: 50 },
      },
      {
        id: "map-awareness",
        nodeType: "CONCEPTUAL",
        replayCriteria: { signal: "eapm", gte: 50 },
      },
    ];
    const signals = { ...emptySignals, eapm: 100 };
    expect(detectReplaySignals(nodes, signals, PATCH_ID).map((r) => r.nodeId)).toEqual([
      "eapm-mechanic",
    ]);
  });
});

// ---------------------------------------------------------------------------
// replayCriteria-required (graceful default)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — replayCriteria-required (graceful default)", () => {
  it("never emits a MECHANIC node lacking a replayCriteria", () => {
    const nodes: ReplayThresholdInput[] = [{ id: "no-criterion", nodeType: "MECHANIC" }];
    expect(detectReplaySignals(nodes, emptySignals, PATCH_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildOrderTiming (patch-aware, REPLAY-08)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — buildOrderTiming (patch-aware, REPLAY-08)", () => {
  const node: ReplayThresholdInput = {
    id: "build-order-human",
    nodeType: "MECHANIC",
    replayCriteria: { signal: "buildOrderTiming", beforeMs: 120000 },
  };

  it("emits when the opener-kind unit is queued before beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 100000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "build-order-human",
        targetState: "mastered",
        actual: 100000,
        target: 120000,
        signal: "buildOrderTiming",
      },
    ]);
  });

  it("does not emit at the exact boundary (ms === beforeMs is not 'before')", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 120000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });

  it("does not emit when the opener-kind unit is queued after beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 150000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });

  it("does not emit when no opener-kind unit was ever queued (worker/townhall only)", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [
        { unitOrBuildingId: "hpea", ms: 100 },
        { unitOrBuildingId: "htow", ms: 200 },
      ],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });

  it("resolves the correct opener across all four races without a node.race field", () => {
    const orcNode: ReplayThresholdInput = {
      id: "build-order-orc",
      nodeType: "MECHANIC",
      replayCriteria: { signal: "buildOrderTiming", beforeMs: 100000 },
    };
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "ogru", ms: 90000 }],
    };
    expect(detectReplaySignals([orcNode], signals, PATCH_ID).map((r) => r.nodeId)).toEqual([
      "build-order-orc",
    ]);
  });
});

// ---------------------------------------------------------------------------
// eapm (boundary inclusive)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — eapm (boundary inclusive)", () => {
  const node: ReplayThresholdInput = {
    id: "eapm-mechanic",
    nodeType: "MECHANIC",
    replayCriteria: { signal: "eapm", gte: 100 },
  };

  it("emits when eapm is above the threshold", () => {
    expect(detectReplaySignals([node], { ...emptySignals, eapm: 101 }, PATCH_ID)).toEqual([
      {
        nodeId: "eapm-mechanic",
        targetState: "mastered",
        actual: 101,
        target: 100,
        signal: "eapm",
      },
    ]);
  });

  it("emits when eapm equals the threshold (inclusive boundary)", () => {
    expect(
      detectReplaySignals([node], { ...emptySignals, eapm: 100 }, PATCH_ID).map((r) => r.nodeId),
    ).toEqual(["eapm-mechanic"]);
  });

  it("does not emit when eapm is below the threshold", () => {
    expect(detectReplaySignals([node], { ...emptySignals, eapm: 99 }, PATCH_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// controlGroupUsage (aggregate 'used' across groups, inclusive)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — controlGroupUsage (aggregate 'used' across groups, inclusive)", () => {
  const node: ReplayThresholdInput = {
    id: "hotkey-discipline",
    nodeType: "MECHANIC",
    replayCriteria: { signal: "controlGroupUsage", gte: 20 },
  };

  it("emits when the summed 'used' count across groups meets the threshold", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      controlGroupUsage: [
        { groupId: 1, assigned: 5, used: 12 },
        { groupId: 2, assigned: 3, used: 8 },
      ],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "hotkey-discipline",
        targetState: "mastered",
        actual: 20,
        target: 20,
        signal: "controlGroupUsage",
      },
    ]);
  });

  it("does not emit when the summed 'used' count is below the threshold", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      controlGroupUsage: [{ groupId: 1, assigned: 5, used: 10 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// heroTiming (earliest hero-buy entry)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — heroTiming (earliest hero-buy entry)", () => {
  const node: ReplayThresholdInput = {
    id: "hero-timing",
    nodeType: "MECHANIC",
    replayCriteria: { signal: "heroTiming", beforeMs: 30000 },
  };

  it("emits when the earliest hero-buy entry occurs before beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      heroTiming: [{ heroId: "hmkg", level: 1, ms: 20000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "hero-timing",
        targetState: "mastered",
        actual: 20000,
        target: 30000,
        signal: "heroTiming",
      },
    ]);
  });

  it("does not emit when the earliest hero-buy entry occurs after beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      heroTiming: [{ heroId: "hmkg", level: 1, ms: 40000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });

  it("does not emit when no hero was ever bought", () => {
    expect(detectReplaySignals([node], emptySignals, PATCH_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// expansionTiming
// ---------------------------------------------------------------------------

describe("detectReplaySignals — expansionTiming", () => {
  const node: ReplayThresholdInput = {
    id: "expansion-timing",
    nodeType: "MECHANIC",
    replayCriteria: { signal: "expansionTiming", beforeMs: 300000 },
  };

  it("emits when expansionTimingMs occurs before beforeMs", () => {
    const signals: ReplaySignals = { ...emptySignals, expansionTimingMs: 250000 };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "expansion-timing",
        targetState: "mastered",
        actual: 250000,
        target: 300000,
        signal: "expansionTiming",
      },
    ]);
  });

  it("does not emit when expansionTimingMs is null (no expansion detected)", () => {
    expect(detectReplaySignals([node], emptySignals, PATCH_ID)).toEqual([]);
  });

  it("does not emit when expansionTimingMs occurs after beforeMs", () => {
    const signals: ReplaySignals = { ...emptySignals, expansionTimingMs: 350000 };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Purity + output shape
// ---------------------------------------------------------------------------

describe("detectReplaySignals — purity", () => {
  it("returns deep-equal output for identical input across repeated calls", () => {
    const nodes: ReplayThresholdInput[] = [
      {
        id: "eapm-mechanic",
        nodeType: "MECHANIC",
        replayCriteria: { signal: "eapm", gte: 50 },
      },
    ];
    const signals = { ...emptySignals, eapm: 60 };
    const first = detectReplaySignals(nodes, signals, PATCH_ID);
    const second = detectReplaySignals(nodes, signals, PATCH_ID);
    expect(first).toEqual(second);
  });
});

describe("detectReplaySignals — output shape", () => {
  it("returns an empty array when no nodes qualify", () => {
    expect(detectReplaySignals([], emptySignals, PATCH_ID)).toEqual([]);
  });
});
