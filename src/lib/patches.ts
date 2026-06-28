// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Patch registry module — the single source of valid WC3 patch IDs for the
 * whole codebase. Add new patches by appending to the PATCHES array below.
 * The order field must be strictly ascending. Every schema that requires a
 * patchId imports PATCH_IDS from this module.
 */

/** Metadata for a single WC3 patch. */
export interface PatchEntry {
  /** Kebab-case patch identifier, e.g. "patch-1.36.2". */
  readonly id: string;
  /** Ascending integer; used for ordering and staleness calculations. */
  readonly order: number;
  /** ISO 8601 date the patch was released (YYYY-MM-DD). */
  readonly released: string;
  /**
   * Reserved for Phase 8 replay parsing. Each patch may ship a new replay
   * object-ID map; this field is the version hook for that feature.
   * Do not use before Phase 8.
   */
  readonly objectIdMapVersion: number;
}

/**
 * Ordered registry of known WC3 patches.
 * - `order` must be strictly ascending (0, 1, 2, …).
 * - Append new entries here to make them valid across all schemas.
 * - The array is private to this module; callers use getPatch() or PATCH_IDS.
 */
const _PATCHES = [
  { id: "patch-1.36.1", order: 0, released: "2022-11-16", objectIdMapVersion: 1 },
  { id: "patch-1.36.2", order: 1, released: "2024-03-15", objectIdMapVersion: 1 },
] as const satisfies readonly PatchEntry[];

/** Read-only view of the patch registry for code that legitimately needs to iterate. */
export const PATCHES: readonly PatchEntry[] = _PATCHES;

/** The current (most recent) patch — always the last entry in the registry. */
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];

/**
 * All patch ids as a non-empty tuple — accepted directly by z.enum() without
 * an extra cast at the call site. (Zod v4 requires [string, ...string[]].)
 */
export const PATCH_IDS: [string, ...string[]] = _PATCHES.map((p) => p.id) as [
  string,
  ...string[],
];

/**
 * Look up a patch entry by id.
 * Throws an Error if the id is not in the registry — fail-fast so callers
 * discover invalid ids at the earliest possible point.
 */
export function getPatch(id: string): PatchEntry {
  const patch = _PATCHES.find((p) => p.id === id);
  if (!patch) throw new Error(`Unknown patch id: "${id}"`);
  return patch;
}
