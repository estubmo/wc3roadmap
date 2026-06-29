// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway referential-integrity validator.
 *
 * Deep module: a single pure function with no side-effects and no dependency
 * on content-collections or the file system. Accepts plain inputs so it is
 * fully unit-testable. Returns a flat string[] of error messages — one per
 * unresolved step ID — so the orchestrator (validate-content.ts) can
 * aggregate them with other validation results.
 *
 * Mirrors the validatePrerequisiteIds pattern from scripts/lib/validators.ts.
 * Called by validate-content.ts after parsing pathways/beginner-fundamentals.json
 * with PathwaySchema so CI blocks on any dangling pathway step reference (T-02-07).
 */

/**
 * Validate that every step ID in a pathway references an existing node.
 *
 * @param pathway - Validated pathway data (id + steps from PathwaySchema output).
 * @param nodeIds - Authoritative set of node IDs from the content corpus.
 * @returns One descriptive error string per step ID not present in nodeIds.
 *          Returns [] when every step resolves to a real node.
 */
export function validatePathwayStepIds(
  pathway: { readonly id: string; readonly steps: readonly string[] },
  nodeIds: ReadonlySet<string>
): string[] {
  const errors: string[] = [];

  for (const stepId of pathway.steps) {
    if (!nodeIds.has(stepId)) {
      errors.push(
        `Pathway "${pathway.id}": step "${stepId}" does not reference an existing node`
      );
    }
  }

  return errors;
}
