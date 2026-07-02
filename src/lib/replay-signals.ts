// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * deriveReplaySignals — the pure, zero-I/O semantic signal layer for `.w3g`
 * replay parsing (REPLAY-02, D-11).
 *
 * This is Phase 8's analog of `detect-mastery-signals.ts`: a framework-free
 * deep module turning raw w3gjs `ParserOutput`/`Player` data into typed,
 * node-mappable WC3 events — build-order timing, an eAPM approximation,
 * control-group/hotkey usage, hero buy timing, and expansion timing. Every
 * signal carries the value + timing pairing REPLAY-07's "you did X at time Y"
 * feedback needs.
 *
 * STRUCTURAL GUARANTEES (proven by replay-signals.test.ts):
 *   - D-09: only race-agnostic mechanical signals are emitted — build order,
 *     eAPM, control-group usage, hero timing, expansion timing. No
 *     race-specific interpretation happens in this module.
 *   - D-15 / Pitfall 7: `isSoloMatch` derives the 1v1 gate structurally from
 *     `parsed.players.length` alone, mirroring the "filter-then-detect"
 *     ordering `detectMasterySignals` already established for AUTO-03.
 *     `deriveReplaySignals` itself does NOT enforce this gate — it always
 *     derives signals for whatever replay it is given, since team/FFA
 *     replays still get real feedback (D-15's "still parse + show signals"
 *     half). Callers MUST check `isSoloMatch` upstream of any threshold
 *     evaluation / mastery write, never after.
 *   - NOT untouched-only (D-11): unlike `detectMasterySignals`'s D-05 filter,
 *     this module carries no `existingProgressNodeIds` concept — replay is
 *     allowed to override existing progress rows per D-03/D-04. That filter
 *     belongs only in the write path (a later plan), never here.
 *
 * NO I/O: this module imports NOTHING from db, fetch, or auth layers. Its
 * only dependency beyond plain JS is the pure `./object-id-maps` registry
 * (used only to classify a building id as "townhall-kind" for expansion
 * detection — never to resolve a patch-specific version; see
 * `isTownhallKind` below). `./replay-parser` is a type-only import (erased
 * at build time — no runtime dependency on the w3gjs I/O wrapper).
 */

import type { ParserOutput, Player } from "./replay-parser";
import { OBJECT_ID_MAPS } from "./object-id-maps";

/**
 * The minimal structural subset of w3gjs's `Player` this module needs —
 * mirrors `AutoDetectableNode`'s "minimal structural subset" convention
 * (detect-mastery-signals.ts) instead of requiring every internal field
 * w3gjs's `Player` class declares (most of which — `_currentlyTrackedAPM`,
 * parser handler methods, etc. — are irrelevant to signal derivation and
 * would otherwise force hand-authored test fixtures to stub them out).
 */
export type ReplayPlayerInput = Pick<
  Player,
  "units" | "buildings" | "groupHotkeys" | "heroCollector" | "actions"
>;

/** The minimal structural subset of w3gjs's `ParserOutput` `deriveReplaySignals` needs. */
export type ReplayParsedInput = Pick<ParserOutput, "duration">;

/** The minimal structural subset `isSoloMatch` needs — just the player list. */
export type SoloMatchInput = Pick<ParserOutput, "players">;

/** One build-order event — a unit or building queued, with its game-clock ms. */
export interface BuildOrderEntry {
  unitOrBuildingId: string;
  ms: number;
}

/** One control group's assign/use counts (from w3gjs's `groupHotkeys`). */
export interface ControlGroupUsageEntry {
  groupId: number;
  assigned: number;
  used: number;
}

/** One hero's buy timing — the ms its unit/summon event first appears in the build order. */
export interface HeroTimingEntry {
  heroId: string;
  level: number;
  ms: number;
}

/**
 * The pure output shape of `deriveReplaySignals` — a minimal structural
 * interface (D-11 / RESEARCH.md Pattern 1), NOT the full w3gjs types.
 */
export interface ReplaySignals {
  buildOrder: BuildOrderEntry[];
  eapm: number;
  controlGroupUsage: ControlGroupUsageEntry[];
  heroTiming: HeroTimingEntry[];
  expansionTimingMs: number | null;
}

/**
 * Turn raw w3gjs parse output into typed, node-mappable WC3 signals
 * (REPLAY-02). Pure — an identical `(parsed, player)` input always yields a
 * deep-equal output; no I/O of any kind.
 */
export function deriveReplaySignals(
  parsed: ReplayParsedInput,
  player: ReplayPlayerInput,
): ReplaySignals {
  return {
    buildOrder: deriveBuildOrder(player),
    eapm: deriveEapm(parsed, player),
    controlGroupUsage: deriveControlGroupUsage(player),
    heroTiming: deriveHeroTiming(player),
    expansionTimingMs: deriveExpansionTimingMs(player),
  };
}

function deriveBuildOrder(player: ReplayPlayerInput): BuildOrderEntry[] {
  return [...player.units.order, ...player.buildings.order]
    .map((entry) => ({ unitOrBuildingId: entry.id, ms: entry.ms }))
    .sort((a, b) => a.ms - b.ms);
}

function deriveControlGroupUsage(
  player: ReplayPlayerInput,
): ControlGroupUsageEntry[] {
  return Object.entries(player.groupHotkeys).map(([groupId, usage]) => ({
    groupId: Number(groupId),
    assigned: usage.assigned,
    used: usage.used,
  }));
}

/**
 * eAPM approximation (Assumptions Log A3, RESEARCH.md): normalize the
 * "effective" action count (see `estimateEffectiveActions`) to a per-minute
 * rate using the replay's own duration — mirroring how raw APM is
 * conventionally expressed. Returns 0 for a zero/negative duration
 * (degenerate fixture) rather than dividing by zero.
 */
function deriveEapm(parsed: ReplayParsedInput, player: ReplayPlayerInput): number {
  const effective = estimateEffectiveActions(player.actions);
  const minutes = parsed.duration > 0 ? parsed.duration / 60000 : 0;
  return minutes > 0 ? Math.round(effective / minutes) : 0;
}

/**
 * The eAPM action-classification heuristic (Assumptions Log A3,
 * RESEARCH.md): counts only action categories that reflect real
 * game-state-changing commands (`assigngroup`, `rightclick`, `basic`,
 * `buildtrain`, `ability`, `item`), excluding categories that are pure
 * UI/selection noise commonly used to pad raw APM without any game impact
 * (`select`, `selecthotkey`, `subgroup`, `esc`, `removeunit`).
 *
 * This is a heuristic, not a scientific claim — no canonical eAPM formula
 * exists in w3gjs's or w3champions' documentation (A3). The category split
 * is content/UX-reviewable and may be re-tuned later without changing this
 * function's shape or the caller's contract.
 */
export function estimateEffectiveActions(actions: Player["actions"]): number {
  return (
    actions.assigngroup +
    actions.rightclick +
    actions.basic +
    actions.buildtrain +
    actions.ability +
    actions.item
  );
}

function deriveHeroTiming(player: ReplayPlayerInput): HeroTimingEntry[] {
  const entries: HeroTimingEntry[] = [];
  for (const [heroId, info] of Object.entries(player.heroCollector)) {
    // A hero's purchase/summon is itself a unit-order event — cross-reference
    // heroCollector (which carries level, not timing) against units.order
    // (which carries ms, not level) to pair value + timing (REPLAY-07).
    const firstOrderEntry = player.units.order.find((u) => u.id === heroId);
    if (firstOrderEntry) {
      entries.push({ heroId, level: info.level, ms: firstOrderEntry.ms });
    }
    // No matching units.order entry: skip rather than fabricate a ms of 0 —
    // an honest missing signal beats a misleading one (T-08-05a tolerance).
  }
  return entries.sort((a, b) => a.ms - b.ms);
}

/**
 * Expansion timing (D-09/D-10, build-order-adjacent signal): the ms of the
 * FIRST townhall-kind building appearing in `buildings.order`. WC3's
 * starting town hall is pre-placed at map start and is never queued/built,
 * so it never appears in `buildings.order` — the first townhall-kind entry
 * that DOES appear there is, by construction, an expansion. Classification
 * uses the pure `object-id-maps` registry (`isTownhallKind`) rather than a
 * hardcoded id list duplicated in this module, checked across every known
 * map version since this pure layer has no `patchId` to resolve one
 * specific version from — that patch-aware resolution belongs to the later
 * threshold-detection layer. Returns null when no townhall-kind building
 * was ever queued (no expansion detected).
 */
function deriveExpansionTimingMs(player: ReplayPlayerInput): number | null {
  const sortedBuildings = [...player.buildings.order].sort((a, b) => a.ms - b.ms);
  const firstTownhall = sortedBuildings.find((b) => isTownhallKind(b.id));
  return firstTownhall ? firstTownhall.ms : null;
}

/** True when `id` resolves to a "townhall"-kind entry in ANY known object-id-map version. */
function isTownhallKind(id: string): boolean {
  return Object.values(OBJECT_ID_MAPS).some(
    (table) =>
      Object.prototype.hasOwnProperty.call(table, id) &&
      table[id].kind === "townhall",
  );
}

/**
 * Structural 1v1 gate (D-15, Pitfall 7): true only when exactly two players
 * are present. w3gjs's `ParserOutput.players` already excludes observers
 * (tracked separately as `ParserOutput.observers: string[]`), so a plain
 * length check is the correct structural signal — no ad-hoc
 * team/race/observer-flag inspection needed. Runs upstream of any threshold
 * evaluation per Pitfall 7 — callers must check this BEFORE using replay
 * signals to advance node mastery, never after.
 */
export function isSoloMatch(parsed: SoloMatchInput): boolean {
  return parsed.players.length === 2;
}
