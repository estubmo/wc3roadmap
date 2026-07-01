// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * detectMasterySignals — the pure, zero-I/O auto-detect eligibility function.
 *
 * This is the canonical deep module of Phase 07: a 3-argument pure interface
 * hiding the MECHANIC-filter + untouched-filter + ordinal-threshold logic.
 * It emits the auto-advance candidate node ids for a single w3champions sync.
 *
 * STRUCTURAL GUARANTEES (proven by detect-mastery-signals.test.ts):
 *   - AUTO-03 (criterion 5, T-07-05a): only nodeType === "MECHANIC" nodes are
 *     ever emitted. CONCEPTUAL nodes are filtered out BEFORE any criterion is
 *     evaluated, so a CONCEPTUAL node can never advance from a sync.
 *   - D-05 (untouched-only, T-07-05b): only nodes absent from
 *     existingProgressNodeIds are emitted. This function only ever PROPOSES
 *     advancing untouched nodes; it never touches an existing progress row.
 *   - D-02: a single signal+threshold criterion per node (mmrTier | gamesPlayed),
 *     compared via the ordinal tierIndex registry (mmr-tiers.ts) for mmrTier.
 *   - D-10c: an unranked signal (mmrTier === null) never satisfies an mmrTier
 *     criterion, regardless of the threshold.
 *
 * D-04/D-05/D-06 RELATIONSHIP: this function only ever proposes
 * untouched → advance candidates. The caller (07-07 syncW3championsHandler)
 * owns the write: it caps masteryState at "in-progress" (D-04, never "mastered"),
 * hardcodes source: "auto", and uses a plain additive insert that never
 * overwrites an existing row (D-05/D-06). All authorization, fetching, caching,
 * and persistence live in the caller — this module is framework-free and
 * independently unit-testable.
 *
 * NO I/O: this module imports NOTHING from db, fetch, or auth layers. Its only
 * dependency is the pure ./mmr-tiers ordinal registry.
 */

import { tierIndex } from "./mmr-tiers";

/**
 * The minimal node shape detectMasterySignals needs. A structural subset of the
 * real NodeFrontmatter (src/schemas/node.ts): the MECHANIC/CONCEPTUAL nodeType
 * discriminator plus the optional per-node autoDetect criterion (D-01/D-02).
 *
 * autoDetect is a single signal+threshold discriminated union — NOT a compound
 * rule engine (D-02). When absent, the node never auto-advances (D-01 default).
 */
export interface AutoDetectableNode {
  /** Kebab-case unique node id. */
  id: string;
  /** First-class node category (DATA-01). Only "MECHANIC" is auto-detectable. */
  nodeType: "MECHANIC" | "CONCEPTUAL";
  /**
   * Optional per-node auto-detect criterion (D-01/D-02):
   *   - { signal: "mmrTier"; gte }     — gte is an ordinal tier id (mmr-tiers.ts).
   *   - { signal: "gamesPlayed"; gte } — gte is a positive career games count.
   * Absent => the node never auto-advances (graceful default).
   */
  autoDetect?:
    | { signal: "mmrTier"; gte: string }
    | { signal: "gamesPlayed"; gte: number };
}

/**
 * The w3champions ladder signals for the principal, as loaded by the caller.
 * These are the only external inputs the threshold comparison reads.
 */
export interface W3cSignals {
  /** null = no ranked games this season / unranked (D-10 bucket c). */
  mmrTier: string | null;
  /** Career-wide total games played across all seasons (0 if none). */
  gamesPlayed: number;
}

/**
 * Emit the auto-advance candidate node ids for a single sync.
 *
 * Pure filter chain (order matters — the two structural guarantees run first):
 *   1. nodeType === "MECHANIC"          (AUTO-03 — CONCEPTUAL can never emit)
 *   2. autoDetect !== undefined         (D-01 — no criterion => never advances)
 *   3. !existingProgressNodeIds.has(id) (D-05 — untouched-only, never overwrite)
 *   4. meetsThreshold(criterion, signal)(D-02 — single signal+threshold match)
 *   5. map to { nodeId }                (candidate output shape)
 *
 * @param nodes All content nodes (only MECHANIC + autoDetect ones can qualify).
 * @param signals The principal's w3champions ladder signals.
 * @param existingProgressNodeIds Node ids that already have a progress row.
 * @returns Candidate ids to auto-advance — MECHANIC, untouched, threshold-met.
 */
export function detectMasterySignals(
  nodes: AutoDetectableNode[],
  signals: W3cSignals,
  existingProgressNodeIds: ReadonlySet<string>,
): { nodeId: string }[] {
  return nodes
    .filter((n) => n.nodeType === "MECHANIC")
    .filter((n) => n.autoDetect !== undefined)
    .filter((n) => !existingProgressNodeIds.has(n.id))
    .filter((n) => meetsThreshold(n.autoDetect!, signals))
    .map((n) => ({ nodeId: n.id }));
}

/**
 * Evaluate a single node's criterion against the signals (D-02).
 *   - gamesPlayed: signals.gamesPlayed >= gte (boundary inclusive).
 *   - mmrTier: false when signals.mmrTier === null (D-10c unranked/no-data),
 *     else ordinal tierIndex(signal) >= tierIndex(gte) — never a string compare.
 */
function meetsThreshold(
  criteria: NonNullable<AutoDetectableNode["autoDetect"]>,
  signals: W3cSignals,
): boolean {
  if (criteria.signal === "gamesPlayed") {
    return signals.gamesPlayed >= criteria.gte;
  }
  // criteria.signal === "mmrTier"
  if (signals.mmrTier === null) return false;
  return tierIndex(signals.mmrTier) >= tierIndex(criteria.gte);
}
