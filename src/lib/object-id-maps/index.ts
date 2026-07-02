// SPDX-License-Identifier: GPL-3.0-or-later

import { getPatch } from "../patches";

/**
 * Object-ID map registry — the project's OWN patch-versioned lookup from
 * w3gjs's raw object-ID strings (`Player.units.order[].id`,
 * `Player.buildings.order[].id`, etc.) to node-relevant meaning (name + kind).
 *
 * NOT w3gjs's bundled `mappings.ts`: w3gjs ships one static id→name table per
 * npm release, which is not itself versioned against WC3's actual per-patch
 * game-data changes (RESEARCH.md Pitfall 3). A later WC3 patch can reuse an
 * object id for a different unit/building, so resolution MUST be keyed by
 * this project's own `objectIdMapVersion` (the reserved hook on
 * `PatchEntry`, see `src/lib/patches.ts`), never by w3gjs's raw id alone and
 * never by the replay's raw `buildNumber` directly. w3gjs `id` strings are
 * INPUTS to this lookup, not final display-ready names.
 *
 * Mirrors the singleton-registry shape of `src/lib/patches.ts` /
 * `src/lib/mmr-tiers.ts`: a private version-keyed table, a public readonly
 * view, and pure lookup helpers. Zero top-level side effects.
 *
 * Version 1 (seeded here) covers the four race town-hall/expansion buildings
 * plus each race's worker and key opening combat unit — the minimum set
 * needed for build-order and expansion-timing threshold detection this
 * phase (08-09, 08-10). Extend by adding entries to `_OBJECT_ID_MAPS[1]`, or
 * append a new `_OBJECT_ID_MAPS[N]` table and bump `objectIdMapVersion` on
 * the patches that ship the new table.
 */

/** A single race's kebab-case identifier, matching `NodeFrontmatterSchema.race` (excluding "agnostic"). */
export type ObjectRace = "human" | "orc" | "undead" | "nightelf";

/**
 * What role this object plays in build-order/expansion detection.
 * "townhall" doubles as the expansion building — a second townhall-kind
 * building at a new location IS the expansion signal.
 */
export type ObjectKind = "townhall" | "worker" | "opener";

/** A resolved, node-relevant entry for one w3gjs object-id string. */
export interface ObjectIdEntry {
  /** Human-readable unit/building name. */
  readonly name: string;
  /** Race this object belongs to. */
  readonly race: ObjectRace;
  /** Build-order/expansion-detection role. */
  readonly kind: ObjectKind;
}

/**
 * Version-keyed registry: `objectIdMapVersion` -> (w3gjs object-id string ->
 * entry). Patches sharing an `objectIdMapVersion` (see `patches.ts`)
 * transparently share one table here — no per-patch duplication.
 *
 * The array is private to this module; callers use `resolveObjectId()` or
 * `objectIdMapVersionForPatch()`, never direct indexing.
 */
const _OBJECT_ID_MAPS: Record<number, Record<string, ObjectIdEntry>> = {
  1: {
    // Human
    htow: { name: "Town Hall", race: "human", kind: "townhall" },
    hpea: { name: "Peasant", race: "human", kind: "worker" },
    hfoo: { name: "Footman", race: "human", kind: "opener" },
    // Orc
    ogre: { name: "Great Hall", race: "orc", kind: "townhall" },
    opeo: { name: "Peon", race: "orc", kind: "worker" },
    ogru: { name: "Grunt", race: "orc", kind: "opener" },
    // Undead
    unpl: { name: "Necropolis", race: "undead", kind: "townhall" },
    uaco: { name: "Acolyte", race: "undead", kind: "worker" },
    ugho: { name: "Ghoul", race: "undead", kind: "opener" },
    // Night Elf
    etol: { name: "Tree of Life", race: "nightelf", kind: "townhall" },
    ewsp: { name: "Wisp", race: "nightelf", kind: "worker" },
    earc: { name: "Archer", race: "nightelf", kind: "opener" },
  },
};

/** Read-only view of the full version-keyed registry, for code that legitimately needs to iterate. */
export const OBJECT_ID_MAPS: Readonly<Record<number, Readonly<Record<string, ObjectIdEntry>>>> =
  _OBJECT_ID_MAPS;

/**
 * Resolve which `objectIdMapVersion` a given patch id uses, via the
 * `patches.ts` registry hook — never the replay's raw `buildNumber`
 * directly. `buildNumber`/`version` (from `ParserOutput`) inform which patch
 * entry a replay maps to; `objectIdMapVersion` is the actual map key.
 */
export function objectIdMapVersionForPatch(patchId: string): number {
  return getPatch(patchId).objectIdMapVersion;
}

/**
 * Resolve a w3gjs raw object-id string to its node-relevant entry at a given
 * `objectIdMapVersion`. Returns `null` for an unknown id or unknown version
 * — never throws. Replay-supplied object ids are treated as opaque,
 * potentially adversarial input (T-08-04a): a miss is a graceful `null`,
 * never an unsafe index or an exception.
 */
export function resolveObjectId(objectId: string, version: number): ObjectIdEntry | null {
  const table = _OBJECT_ID_MAPS[version];
  if (!table) return null;
  // hasOwnProperty guard: replay-supplied ids are untrusted input (T-08-04a).
  // Plain-object bracket indexing without this guard leaks Object.prototype
  // members (e.g. "__proto__", "constructor", "toString") as false-positive
  // "resolved" hits instead of the required null-on-miss.
  if (!Object.prototype.hasOwnProperty.call(table, objectId)) return null;
  return table[objectId];
}
