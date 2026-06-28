// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * MasteryThreshold schema — minimal but real (D-10, DATA-04).
 *
 * A mastery threshold defines the criteria a player must meet to transition
 * a node from `learning` to `mastered` for a given patch. Thresholds are
 * patch-tagged because game balance changes alter what "mastered" looks like.
 *
 * Phase 1 scope: schema structure only — no persistence, no signal wiring.
 * `thresholdDefinition` is intentionally open (z.record) to remain extensible.
 * Phases 7–8 will extend it with signal-specific fields (win-rate, APM, etc.).
 *
 * All three schemas (node, masteryThreshold, progressRecord) import PATCH_IDS
 * from the same registry, proving the patch primitive spans every schema from
 * the first commit (DATA-04, ROADMAP success criterion 4).
 */

import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

/**
 * MasteryThreshold — the criteria a player must meet to call a node mastered.
 *
 * Required fields (all non-optional per D-10):
 *   - nodeId: the node this threshold applies to
 *   - nodeType: MECHANIC | CONCEPTUAL (mirrors the node's nodeType)
 *   - patchId: which patch version this threshold is valid for (DATA-04)
 *   - thresholdDefinition: open record — Phase 7/8 extend with signal specifics
 *
 * Do NOT add signal-specific fields here before Phase 7 — the `thresholdDefinition`
 * record is the deliberate extension point (see D-10 and RESEARCH "Deferred Items").
 */
export const MasteryThresholdSchema = z.object({
  /** The node this threshold applies to (matches node `id`). */
  nodeId: z.string(),
  /**
   * Node type mirrored from the node — allows threshold consumers to filter
   * by node type without joining to the node schema.
   * Exactly MECHANIC or CONCEPTUAL — no other values.
   */
  nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
  /**
   * Registry-validated WC3 patch identifier (DATA-04).
   * A threshold is patch-tagged because game balance changes what "mastered"
   * means. Unknown patchIds are rejected at parse time.
   */
  patchId: z.enum(PATCH_IDS),
  /**
   * Open record of threshold criteria — intentionally kept generic in Phase 1.
   * Phase 7 (w3champions signal ingestion) and Phase 8 (replay analysis) will
   * populate this with typed signal configurations. Using z.record here avoids
   * a schema migration when those fields are added.
   */
  thresholdDefinition: z.record(z.string(), z.unknown()),
});

/** Inferred TypeScript type for a mastery threshold. */
export type MasteryThreshold = z.infer<typeof MasteryThresholdSchema>;
