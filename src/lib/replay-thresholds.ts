// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * detectReplaySignals — the pure, zero-I/O, patch-aware replay-threshold
 * detector (REPLAY-06/07/08).
 *
 * This is Phase 8's threshold-evaluation analog of `detect-mastery-signals.ts`:
 * a framework-free deep module mapping already-derived `ReplaySignals`
 * (replay-signals.ts) against each MECHANIC node's `replayCriteria`
 * (schemas/node.ts) and emitting per-node target mastery states. Every
 * emitted result carries the actual measured value alongside the target so
 * the feedback layer (REPLAY-07) can render "you did X (actual) at Y; target
 * is Z" without re-deriving anything from raw signals.
 *
 * STRUCTURAL GUARANTEES (proven by replay-thresholds.test.ts):
 *   - MECHANIC-only: only nodeType === "MECHANIC" nodes are ever evaluated.
 *     CONCEPTUAL nodes are filtered out BEFORE any criterion is evaluated,
 *     mirroring `detectMasterySignals`'s AUTO-03 discipline.
 *   - replayCriteria-required: a node with no `replayCriteria` never emits
 *     (graceful default, same convention as `autoDetect`/`quiz`).
 *   - D-02: emitted `targetState` is always "mastered" — replay is the one
 *     signal source strong enough to reach `mastered` directly (D-09).
 *   - D-11: unlike `detectMasterySignals`'s D-05 untouched-only filter, this
 *     function carries NO `existingProgressNodeIds` parameter. It may target
 *     nodes that already have progress — replay is allowed to advance a node
 *     regardless of its current state (the write path, a later plan, owns
 *     any monotonic-max comparison via `mastery-ordinal.ts`).
 *   - Patch-aware (REPLAY-08): `buildOrderTiming` resolves the replay's own
 *     "opener"-kind object via `objectIdMapVersionForPatch(patchId)` +
 *     `resolveObjectId`, never a raw id list duplicated in this module. A
 *     player's own build order only ever contains their own race's units, so
 *     a bare `kind === "opener"` match already identifies the correct object
 *     — no per-node `race` field is needed on `ReplayThresholdInput`.
 *
 * NO I/O: this module imports NOTHING from db, fetch, or auth layers. Its
 * only runtime dependency is the pure `./object-id-maps` registry (which
 * itself only depends on the pure `../lib/patches` registry).
 * `../schemas/node`, `./replay-signals`, and `../schemas/progress` are
 * type-only imports (erased at build time — no runtime dependency).
 */

import { objectIdMapVersionForPatch, resolveObjectId } from "./object-id-maps";
import type { ReplayCriteria } from "../schemas/node";
import type { ReplaySignals } from "./replay-signals";
import type { MasteryState } from "../schemas/progress";

/**
 * The minimal node shape detectReplaySignals needs — a structural subset of
 * the real NodeFrontmatter (src/schemas/node.ts), mirroring
 * `AutoDetectableNode`'s "minimal structural subset" convention
 * (detect-mastery-signals.ts).
 */
export interface ReplayThresholdInput {
  /** Kebab-case unique node id. */
  id: string;
  /** First-class node category (DATA-01). Only "MECHANIC" is replay-evaluable. */
  nodeType: "MECHANIC" | "CONCEPTUAL";
  /**
   * Optional per-node replay-mastery criterion (D-09/D-11, schemas/node.ts).
   * Absent => the node never advances from replay (graceful default, same
   * convention as `autoDetect`/`quiz`).
   */
  replayCriteria?: ReplayCriteria;
}

/**
 * One emitted replay-mastery result: the node to advance, the D-02 target
 * state, and the actual-vs-target pairing REPLAY-07's feedback needs.
 */
export interface ReplayNodeResult {
  nodeId: string;
  /** D-02 — replay is mastered-capable; always "mastered". */
  targetState: MasteryState;
  /**
   * Whether the measured value met the node's threshold. REPLAY-07: every
   * evaluated MECHANIC node is emitted (met OR not) so the feedback report can
   * render "you did X; target is Z" even on a MISS. ONLY `met === true`
   * results are eligible for the mastery write (the caller filters on this
   * before `writeMonotonicMax`) — reporting a node must never advance it.
   */
  met: boolean;
  /** The measured value from the replay signals; null when no signal was observed. */
  actual: number | null;
  /** The content-authored threshold the actual value was measured against. */
  target: number;
  /** Which ReplayCriteria signal this result was evaluated from. */
  signal: ReplayCriteria["signal"];
}

/**
 * Emit the replay-mastery results for a single sync.
 *
 * Pure filter chain (order matters — MECHANIC/replayCriteria filters run
 * first, mirroring `detectMasterySignals`'s structure):
 *   1. nodeType === "MECHANIC"          (only MECHANIC nodes evaluated)
 *   2. replayCriteria !== undefined     (no criterion => never emitted)
 *   3. meetsReplayThreshold(...)        (per-signal actual-vs-target compare)
 *   4. map to ReplayNodeResult          (D-02 mastered + met + actual/target/signal)
 *
 * REPLAY-07 (feedback completeness): unlike a pure advancement detector, this
 * emits EVERY evaluated MECHANIC+replayCriteria node — met OR not — so the
 * report can render "you did X; target is Z" even on a miss (a null/short
 * actual). The `met` flag distinguishes the two; the WRITE path
 * (`writeMonotonicMax`) filters to `met === true` so reporting a node never
 * advances it. Emitting an unmet node here is intentionally NOT a mastery
 * signal.
 *
 * @param nodes All content nodes (only MECHANIC + replayCriteria ones are emitted).
 * @param signals The derived replay signals for this replay (replay-signals.ts).
 * @param patchId The replay's own patch id — resolves the correct objectIdMapVersion (REPLAY-08).
 * @returns Per-node results (met and unmet) carrying met+actual+target for REPLAY-07 feedback.
 */
export function detectReplaySignals(
  nodes: ReplayThresholdInput[],
  signals: ReplaySignals,
  patchId: string,
): ReplayNodeResult[] {
  const results: ReplayNodeResult[] = [];
  for (const node of nodes) {
    if (node.nodeType !== "MECHANIC") continue;
    if (node.replayCriteria === undefined) continue;
    const evaluated = meetsReplayThreshold(node.replayCriteria, signals, patchId);
    results.push({
      nodeId: node.id,
      targetState: "mastered",
      met: evaluated.met,
      actual: evaluated.actual,
      target: evaluated.target,
      signal: node.replayCriteria.signal,
    });
  }
  return results;
}

/** The internal per-criterion evaluation result: met/actual/target triple. */
interface CriteriaEvaluation {
  met: boolean;
  actual: number | null;
  target: number;
}

/**
 * Evaluate a single node's replayCriteria against the derived signals (D-09).
 * A per-signal switch, patch-aware where the signal requires object-id
 * resolution (buildOrderTiming, REPLAY-08).
 *
 * Timing signals ("before" a target ms) use a strict less-than comparison —
 * hitting exactly `beforeMs` is not "before" it. Magnitude signals ("gte" a
 * target) use an inclusive >= comparison per the `gte` naming.
 *
 * controlGroupUsage and heroTiming carry no group/hero id on the criterion
 * (ReplayCriteriaSchema, schemas/node.ts) — controlGroupUsage aggregates the
 * summed `used` count across every control group, and heroTiming reads the
 * earliest hero-buy entry (heroTiming is already ms-sorted by
 * replay-signals.ts), rather than targeting one specific group/hero.
 */
export function meetsReplayThreshold(
  criteria: ReplayCriteria,
  signals: ReplaySignals,
  patchId: string,
): CriteriaEvaluation {
  switch (criteria.signal) {
    case "buildOrderTiming": {
      const actual = firstOpenerMs(signals.buildOrder, patchId);
      return {
        met: actual !== null && actual < criteria.beforeMs,
        actual,
        target: criteria.beforeMs,
      };
    }
    case "eapm":
      return {
        met: signals.eapm >= criteria.gte,
        actual: signals.eapm,
        target: criteria.gte,
      };
    case "controlGroupUsage": {
      const actual = signals.controlGroupUsage.reduce((sum, e) => sum + e.used, 0);
      return { met: actual >= criteria.gte, actual, target: criteria.gte };
    }
    case "heroTiming": {
      const actual = signals.heroTiming[0]?.ms ?? null;
      return {
        met: actual !== null && actual < criteria.beforeMs,
        actual,
        target: criteria.beforeMs,
      };
    }
    case "expansionTiming": {
      const actual = signals.expansionTimingMs;
      return {
        met: actual !== null && actual < criteria.beforeMs,
        actual,
        target: criteria.beforeMs,
      };
    }
  }
}

/**
 * Find the ms of the FIRST "opener"-kind build-order entry, resolved via the
 * replay's own patch-aware `objectIdMapVersion` (REPLAY-08). `signals.buildOrder`
 * is already ms-sorted (replay-signals.ts), so `.find` naturally returns the
 * earliest match. Returns null when no opener-kind entry was ever queued.
 */
function firstOpenerMs(buildOrder: ReplaySignals["buildOrder"], patchId: string): number | null {
  const version = objectIdMapVersionForPatch(patchId);
  const openerEntry = buildOrder.find(
    (entry) => resolveObjectId(entry.unitOrBuildingId, version)?.kind === "opener",
  );
  return openerEntry ? openerEntry.ms : null;
}
