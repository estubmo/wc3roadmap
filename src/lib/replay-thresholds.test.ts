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
 *   - REPLAY-07 report completeness: EVERY evaluated MECHANIC+replayCriteria
 *     node is emitted — met OR not — carrying a `met` flag plus actual+target
 *     so the report can render "you did X; target is Z" on a miss. Only
 *     `met === true` results are eligible for advancement (the write path
 *     filters on `met`); a miss emits `met: false` and never advances.
 *   - Each of the five signal variants sets met=true on a met threshold and
 *     met=false on a missed one, boundary-tested where applicable.
 *   - Every emitted result carries { nodeId, targetState: "mastered", met,
 *     actual, target, signal } — the REPLAY-07 feedback contract.
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
    race: "human",
    replayCriteria: { signal: "buildOrderTiming", beforeMs: 120000 },
  };

  it("emits met when the opener-kind unit is queued before beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 100000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "build-order-human",
        targetState: "mastered",
        met: true,
        actual: 100000,
        target: 120000,
        signal: "buildOrderTiming",
      },
    ]);
  });

  it("emits met:false (not omitted) at the exact boundary (ms === beforeMs is not 'before')", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 120000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "build-order-human",
        targetState: "mastered",
        met: false,
        actual: 120000,
        target: 120000,
        signal: "buildOrderTiming",
      },
    ]);
  });

  it("emits met:false when the opener-kind unit is queued after beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "hfoo", ms: 150000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "build-order-human",
        targetState: "mastered",
        met: false,
        actual: 150000,
        target: 120000,
        signal: "buildOrderTiming",
      },
    ]);
  });

  it("emits met:false with actual:null when no opener-kind unit was ever queued (worker/townhall only)", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [
        { unitOrBuildingId: "hpea", ms: 100 },
        { unitOrBuildingId: "htow", ms: 200 },
      ],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "build-order-human",
        targetState: "mastered",
        met: false,
        actual: null,
        target: 120000,
        signal: "buildOrderTiming",
      },
    ]);
  });

  it("resolves the opener for the node's own race (orc grunt for the orc node)", () => {
    const orcNode: ReplayThresholdInput = {
      id: "build-order-orc",
      nodeType: "MECHANIC",
      race: "orc",
      replayCriteria: { signal: "buildOrderTiming", beforeMs: 100000 },
    };
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "ogru", ms: 90000 }],
    };
    const results = detectReplaySignals([orcNode], signals, PATCH_ID);
    expect(results.map((r) => r.nodeId)).toEqual(["build-order-orc"]);
    expect(results[0]?.met).toBe(true);
  });

  it("resolves a broadened opener (orc headhunter ohun, not just grunt)", () => {
    const orcNode: ReplayThresholdInput = {
      id: "build-order-orc",
      nodeType: "MECHANIC",
      race: "orc",
      replayCriteria: { signal: "buildOrderTiming", beforeMs: 100000 },
    };
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "ohun", ms: 80000 }],
    };
    const results = detectReplaySignals([orcNode], signals, PATCH_ID);
    expect(results[0]).toMatchObject({ met: true, actual: 80000, signal: "buildOrderTiming" });
  });

  it("race-gates: an orc opener never advances another race's build-order node (08-12 fix)", () => {
    // An orc player's replay (headhunter opener) evaluated against ALL four
    // race build-order nodes. Only the ORC node may be met — the human /
    // undead / nightelf nodes must report actual:null, met:false (no false
    // cross-race mastery). undead's 130000 target would have wrongly matched
    // the 80000 opener before this fix.
    const nodes: ReplayThresholdInput[] = [
      { id: "build-order-human", nodeType: "MECHANIC", race: "human", replayCriteria: { signal: "buildOrderTiming", beforeMs: 120000 } },
      { id: "build-order-orc", nodeType: "MECHANIC", race: "orc", replayCriteria: { signal: "buildOrderTiming", beforeMs: 100000 } },
      { id: "build-order-undead", nodeType: "MECHANIC", race: "undead", replayCriteria: { signal: "buildOrderTiming", beforeMs: 130000 } },
      { id: "build-order-nightelf", nodeType: "MECHANIC", race: "nightelf", replayCriteria: { signal: "buildOrderTiming", beforeMs: 120000 } },
    ];
    const signals: ReplaySignals = {
      ...emptySignals,
      buildOrder: [{ unitOrBuildingId: "ohun", ms: 80000 }],
    };
    const results = detectReplaySignals(nodes, signals, PATCH_ID);
    const met = results.filter((r) => r.met).map((r) => r.nodeId);
    expect(met).toEqual(["build-order-orc"]);
    // Non-orc nodes are still REPORTED (met:false, actual:null) — never advanced.
    const undead = results.find((r) => r.nodeId === "build-order-undead");
    expect(undead).toMatchObject({ met: false, actual: null });
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

  it("emits met when eapm is above the threshold", () => {
    expect(detectReplaySignals([node], { ...emptySignals, eapm: 101 }, PATCH_ID)).toEqual([
      {
        nodeId: "eapm-mechanic",
        targetState: "mastered",
        met: true,
        actual: 101,
        target: 100,
        signal: "eapm",
      },
    ]);
  });

  it("emits met when eapm equals the threshold (inclusive boundary)", () => {
    const results = detectReplaySignals([node], { ...emptySignals, eapm: 100 }, PATCH_ID);
    expect(results.map((r) => r.nodeId)).toEqual(["eapm-mechanic"]);
    expect(results[0]?.met).toBe(true);
  });

  it("emits met:false when eapm is below the threshold", () => {
    expect(detectReplaySignals([node], { ...emptySignals, eapm: 99 }, PATCH_ID)).toEqual([
      {
        nodeId: "eapm-mechanic",
        targetState: "mastered",
        met: false,
        actual: 99,
        target: 100,
        signal: "eapm",
      },
    ]);
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

  it("emits met when the summed 'used' count across groups meets the threshold", () => {
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
        met: true,
        actual: 20,
        target: 20,
        signal: "controlGroupUsage",
      },
    ]);
  });

  it("emits met:false when the summed 'used' count is below the threshold", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      controlGroupUsage: [{ groupId: 1, assigned: 5, used: 10 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "hotkey-discipline",
        targetState: "mastered",
        met: false,
        actual: 10,
        target: 20,
        signal: "controlGroupUsage",
      },
    ]);
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

  it("emits met when the earliest hero-buy entry occurs before beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      heroTiming: [{ heroId: "hmkg", level: 1, ms: 20000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "hero-timing",
        targetState: "mastered",
        met: true,
        actual: 20000,
        target: 30000,
        signal: "heroTiming",
      },
    ]);
  });

  it("emits met:false when the earliest hero-buy entry occurs after beforeMs", () => {
    const signals: ReplaySignals = {
      ...emptySignals,
      heroTiming: [{ heroId: "hmkg", level: 1, ms: 40000 }],
    };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "hero-timing",
        targetState: "mastered",
        met: false,
        actual: 40000,
        target: 30000,
        signal: "heroTiming",
      },
    ]);
  });

  it("emits met:false with actual:null when no hero was ever bought", () => {
    expect(detectReplaySignals([node], emptySignals, PATCH_ID)).toEqual([
      {
        nodeId: "hero-timing",
        targetState: "mastered",
        met: false,
        actual: null,
        target: 30000,
        signal: "heroTiming",
      },
    ]);
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

  it("emits met when expansionTimingMs occurs before beforeMs", () => {
    const signals: ReplaySignals = { ...emptySignals, expansionTimingMs: 250000 };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "expansion-timing",
        targetState: "mastered",
        met: true,
        actual: 250000,
        target: 300000,
        signal: "expansionTiming",
      },
    ]);
  });

  it("emits met:false with actual:null when expansionTimingMs is null (no expansion detected)", () => {
    expect(detectReplaySignals([node], emptySignals, PATCH_ID)).toEqual([
      {
        nodeId: "expansion-timing",
        targetState: "mastered",
        met: false,
        actual: null,
        target: 300000,
        signal: "expansionTiming",
      },
    ]);
  });

  it("emits met:false when expansionTimingMs occurs after beforeMs", () => {
    const signals: ReplaySignals = { ...emptySignals, expansionTimingMs: 350000 };
    expect(detectReplaySignals([node], signals, PATCH_ID)).toEqual([
      {
        nodeId: "expansion-timing",
        targetState: "mastered",
        met: false,
        actual: 350000,
        target: 300000,
        signal: "expansionTiming",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Report/advance split (REPLAY-07)
// ---------------------------------------------------------------------------

describe("detectReplaySignals — report/advance split (REPLAY-07)", () => {
  it("emits both a met and an unmet node from a mixed list; only the met one is advancement-eligible", () => {
    const nodes: ReplayThresholdInput[] = [
      { id: "eapm-hit", nodeType: "MECHANIC", replayCriteria: { signal: "eapm", gte: 50 } },
      { id: "eapm-miss", nodeType: "MECHANIC", replayCriteria: { signal: "eapm", gte: 200 } },
    ];
    const results = detectReplaySignals(nodes, { ...emptySignals, eapm: 100 }, PATCH_ID);
    // Report sees BOTH nodes (feedback completeness)...
    expect(results.map((r) => r.nodeId).sort()).toEqual(["eapm-hit", "eapm-miss"]);
    // ...but only the met one is eligible for the write path.
    expect(results.filter((r) => r.met).map((r) => r.nodeId)).toEqual(["eapm-hit"]);
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
