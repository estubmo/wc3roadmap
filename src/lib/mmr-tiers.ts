// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * MMR-tier registry — the project-owned, ordinal skill-tier scale
 * (bronze < silver < gold < platinum < diamond < master < grandmaster).
 * Mirrors the singleton-registry shape of `src/lib/patches.ts`: a private
 * ascending array, a public readonly view, an ID tuple for `z.enum()`, and
 * two pure lookup helpers. Zero top-level side effects — pure constants only.
 *
 * WHY NOT w3champions' own League names (RESEARCH Pitfall 5):
 * w3champions League names ("Grand Master", "Master", "Adept", …) are
 * season-and-gamemode-specific, fetched via a separate
 * `/api/ladder/league-constellation?season=X` call, and their MMR boundaries
 * shift every season. Depending on them would cost an extra API call per sync
 * and would silently reinterpret old node-frontmatter `gte` thresholds when
 * w3champions redraws league boundaries. A static, project-owned scale is a
 * deep module: one file to recalibrate, no migration needed anywhere else.
 *
 * The `minMmr` cutoffs below are `[ASSUMED]` round-number defaults (RESEARCH
 * A3). Recalibrate later against the real
 * `GET /api/w3c-stats/mmr-distribution?season=N&gateWay=Europe&gameMode=GM_1v1`
 * endpoint — that is a one-file change here, with no downstream migration
 * (D-04 already caps auto-detect at `in-progress`, bounding the blast radius).
 */

/** Metadata for a single ordinal MMR tier. */
export interface TierEntry {
  /** Project-owned tier id, e.g. "gold". NOT a w3champions League name. */
  readonly id: string;
  /** Ascending integer; strictly increasing across the registry (0, 1, 2, …). */
  readonly order: number;
  /** Inclusive lower bound in 1v1 solo MMR. */
  readonly minMmr: number;
}

/**
 * Ordered registry of MMR tiers, ascending by `minMmr` (and `order`).
 * - `order` must be strictly ascending (0, 1, 2, …).
 * - The array is private to this module; callers use TIER_IDS, tierForMmr(),
 *   or tierIndex(), never direct indexing.
 * - [ASSUMED] cutoffs (RESEARCH A3) — recalibrate in this one file only.
 */
const _TIERS = [
  { id: "bronze", order: 0, minMmr: 0 },
  { id: "silver", order: 1, minMmr: 1000 },
  { id: "gold", order: 2, minMmr: 1200 },
  { id: "platinum", order: 3, minMmr: 1400 },
  { id: "diamond", order: 4, minMmr: 1600 },
  { id: "master", order: 5, minMmr: 1800 },
  { id: "grandmaster", order: 6, minMmr: 2000 },
] as const satisfies readonly TierEntry[];

/** Read-only view of the tier registry for code that legitimately needs to iterate. */
export const TIERS: readonly TierEntry[] = _TIERS;

/**
 * All tier ids as a non-empty tuple — accepted directly by z.enum() without an
 * extra cast at the call site. (Zod v4 requires [string, ...string[]].)
 */
export const TIER_IDS: [string, ...string[]] = _TIERS.map((t) => t.id) as [
  string,
  ...string[],
];

/**
 * Map a raw MMR integer to the highest tier whose `minMmr` it meets or exceeds
 * (boundary inclusive). `_TIERS` is ascending, so reverse-scan and return the
 * first qualifying entry. Always resolves — the lowest tier has `minMmr: 0`.
 */
export function tierForMmr(mmr: number): string {
  return [..._TIERS].reverse().find((t) => mmr >= t.minMmr)!.id;
}

/**
 * Ordinal index of a tier id (registry order == index order). Returns -1 for an
 * unknown id — callers comparing node `gte` thresholds must supply valid ids
 * (validated upstream via z.enum(TIER_IDS)).
 */
export function tierIndex(id: string): number {
  return _TIERS.findIndex((t) => t.id === id);
}
