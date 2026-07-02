// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Mastery-state ordinal registry — mirrors the singleton-registry shape of
 * `src/lib/mmr-tiers.ts` (and, transitively, `src/lib/patches.ts`): a private
 * ascending array, a public readonly view, and a pure `masteryStateIndex()`
 * lookup helper. Zero top-level side effects — pure constants only.
 *
 * WHY THIS EXISTS (D-04, Pitfall 5): the replay write path needs a
 * monotonic-max upsert — a new mastery observation should only overwrite the
 * stored state if it is ordinally >= the current one (so a stale `auto` sync
 * can never regress a `mastered` state recorded by a later replay). Comparing
 * `MasteryState` strings directly has no ordering; `masteryStateIndex()` gives
 * the write path a single, drift-guarded comparison idiom.
 *
 * DRIFT GUARD: `_MASTERY_STATES` below MUST stay in the exact same order as
 * `MasteryStateSchema.options` in `src/schemas/progress.ts` — the schema is
 * the single source of truth for the enum's members and their sequence; this
 * registry only assigns ordinals to that existing order. A test in
 * `mastery-ordinal.test.ts` asserts the two stay in sync, so a future
 * reordering of `MasteryStateSchema` fails loudly here instead of silently
 * corrupting the monotonic-max comparison.
 */

/** Metadata for a single ordinal mastery state. */
export interface MasteryStateEntry {
  /** Mastery state id — must match a `MasteryStateSchema` enum member exactly. */
  readonly id: string;
  /** Ascending integer; strictly increasing across the registry (0, 1, 2, …). */
  readonly order: number;
}

/**
 * Ordered registry of mastery states, ascending by `order`.
 * - `order` must be strictly ascending (0, 1, 2, …).
 * - Order MUST match `MasteryStateSchema.options` in `src/schemas/progress.ts`
 *   (drift guard, Pitfall 5) — see module doc-comment above.
 * - The array is private to this module; callers use `MASTERY_STATES` or
 *   `masteryStateIndex()`, never direct indexing.
 */
const _MASTERY_STATES = [
  { id: "untouched", order: 0 },
  { id: "in-progress", order: 1 },
  { id: "mastered", order: 2 },
] as const satisfies readonly MasteryStateEntry[];

/** Read-only view of the mastery-state registry for code that legitimately needs to iterate. */
export const MASTERY_STATES: readonly MasteryStateEntry[] = _MASTERY_STATES;

/**
 * Ordinal index of a mastery-state id (registry order == index order). Returns
 * -1 for an unknown id — callers must supply valid ids (validated upstream via
 * `MasteryStateSchema`).
 */
export function masteryStateIndex(id: string): number {
  return _MASTERY_STATES.findIndex((s) => s.id === id);
}
