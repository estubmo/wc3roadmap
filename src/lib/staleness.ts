// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * The single staleness predicate for the whole codebase (D-06 locked trigger).
 *
 * A meta-volatile node is "stale" exactly when its authored patch id no longer
 * matches the current patch — the content was calibrated for a patch that has
 * since moved on and may need review. Non-volatile nodes are never stale, even
 * across a patch change.
 *
 * This one function is the sole staleness rule. Both consumers call it so there
 * is exactly one place the rule lives:
 *   - the graph loader projection populating GraphDisplayNode.stale (D-09), and
 *   - the NodePanelContent staleness strip (D-07).
 *
 * Pure boolean logic — no imports, no runtime input, trivially unit-testable.
 */
export function isStale(
  metaVolatile: boolean,
  patchId: string,
  currentPatchId: string,
): boolean {
  return metaVolatile && patchId !== currentPatchId;
}
