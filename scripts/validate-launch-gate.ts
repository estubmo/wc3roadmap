// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Launch-readiness gate validators (CONT-04, PATH-02, CONT-05).
 *
 * Deep module: three pure functions with no side-effects and no dependency on
 * content-collections or the file system. Each accepts plain data (structurally
 * typed node/pathway objects) and returns a flat string[] of error messages, so
 * the orchestrator (validate-content.ts) can aggregate them with the other
 * validators via the shared errors.push(...) pattern.
 *
 * These checks encode the deploy invariant "the launched graph is populated,
 * its beginner pathway is intact, and every launched node is audited". They are
 * enforced only at the deploy gate (validate:launch / LAUNCH_GATE=1), never in
 * the always-on per-PR validate script — so CI stays green while the parallel
 * content workstream flips nodes to launch_ready.
 */

/** Structural shape of a node as far as the launch gate cares. */
interface LaunchNode {
  readonly id: string;
  readonly launch_ready: boolean;
  readonly auditNote?: string;
}

/**
 * Validate that the launched graph has enough launch_ready nodes (CONT-04).
 *
 * @param nodes - The full node corpus.
 * @param minCount - Minimum launch_ready nodes required (default 25).
 * @returns A single-element error array when the launch_ready count is below
 *          minCount, else [].
 */
export function validateLaunchGate(
  nodes: ReadonlyArray<LaunchNode>,
  minCount = 25
): string[] {
  const readyCount = nodes.filter((n) => n.launch_ready).length;
  if (readyCount < minCount) {
    return [
      `Launch gate: only ${readyCount} launch_ready nodes found; need >= ${minCount} (CONT-04)`,
    ];
  }
  return [];
}

/**
 * Validate that every step of a pathway resolves to a launch_ready node
 * (PATH-02 / Pitfall 5). Prevents shipping the pathway with a step that the
 * launched-graph loader would silently filter out.
 *
 * @param pathway - Validated pathway data (id + steps).
 * @param nodes - The full node corpus.
 * @returns One error per pathway step whose id is not in the set of
 *          launch_ready node ids; [] when all steps are launch_ready.
 */
export function validatePathwayStepsAreLaunchReady(
  pathway: { readonly id: string; readonly steps: readonly string[] },
  nodes: ReadonlyArray<LaunchNode>
): string[] {
  const readyIds = new Set(
    nodes.filter((n) => n.launch_ready).map((n) => n.id)
  );
  return pathway.steps
    .filter((stepId) => !readyIds.has(stepId))
    .map(
      (stepId) =>
        `Pathway "${pathway.id}": step "${stepId}" is not launch_ready — cannot ship the pathway with a missing step`
    );
}

/**
 * Validate that every launch_ready node carries a non-empty audit trail note
 * (CONT-05 / D-13). Nodes with launch_ready:false are ignored — the audit note
 * requirement applies only once a node is slated to ship.
 *
 * @param nodes - The full node corpus.
 * @returns One error per launch_ready node whose auditNote is missing or empty
 *          after trimming; [] when every launch_ready node is audited.
 */
export function validateAuditTrail(nodes: ReadonlyArray<LaunchNode>): string[] {
  return nodes
    .filter((n) => n.launch_ready && (n.auditNote ?? "").trim() === "")
    .map(
      (n) =>
        `Audit trail: launch_ready node "${n.id}" is missing its auditNote (CONT-05)`
    );
}
