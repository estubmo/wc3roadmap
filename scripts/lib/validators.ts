// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Cross-document content validators for the WC3 node corpus.
 *
 * Deep module: two pure functions with small signatures, no side-effects,
 * and no dependency on content-collections or the file system. Both return
 * flat string[] error arrays so the orchestrator can aggregate them.
 *
 * Decoupled from content-collections to stay unit-testable with plain arrays.
 */

/** Minimal node shape required by the prerequisite validator. */
interface NodeWithPrereqs {
  readonly id: string;
  readonly prerequisites: readonly string[];
}

/** Minimal node shape required by the patchId validator. */
interface NodeWithPatchId {
  readonly id: string;
  readonly patchId: string;
}

/**
 * Validate that every node's prerequisite IDs reference existing nodes.
 *
 * @param nodes - The full corpus of nodes.
 * @returns Error strings for each unresolved prerequisite reference.
 *          Returns [] when every reference resolves.
 */
export function validatePrerequisiteIds(nodes: readonly NodeWithPrereqs[]): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const errors: string[] = [];

  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      if (!nodeIds.has(prereqId)) {
        errors.push(
          `Node "${node.id}": prerequisite "${prereqId}" does not reference an existing node`
        );
      }
    }
  }

  return errors;
}

/**
 * Validate that every node's patchId is in the authoritative registry.
 *
 * Belt-and-suspenders check: content-collections already validates patchId
 * membership via z.enum(PATCH_IDS). This check catches the same issue in
 * the cross-document CI pass, producing a clear corpus-level report.
 *
 * @param nodes     - The full corpus of nodes.
 * @param validIds  - The authoritative patch id list (from src/lib/patches.ts).
 * @returns Error strings for each node with an unrecognised patchId.
 *          Returns [] when all patchIds are valid.
 */
export function validatePatchIds(
  nodes: readonly NodeWithPatchId[],
  validIds: readonly string[]
): string[] {
  const validSet = new Set(validIds);
  const errors: string[] = [];

  for (const node of nodes) {
    if (!validSet.has(node.patchId)) {
      errors.push(
        `Node "${node.id}": patchId "${node.patchId}" is not in the patch registry`
      );
    }
  }

  return errors;
}
