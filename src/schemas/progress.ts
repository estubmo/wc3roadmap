// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Progress record schemas — minimal but real (D-10, DATA-04).
 *
 * MasteryState is the three-state lifecycle of a player's engagement with a
 * node. ProgressRecord captures one player's current state on one node for
 * one patch — it is patch-tagged because mastery thresholds change between
 * patches (DATA-04).
 *
 * Phase 1 scope: schema definition only — no DB table, no API, no persistence.
 * The schema establishes the typed surface that Phases 4–5 build on.
 *
 * All three schemas (node, masteryThreshold, progressRecord) import PATCH_IDS
 * from the same registry, proving the patch primitive spans every schema from
 * the first commit (DATA-04, ROADMAP success criterion 4).
 */

import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

// ---------------------------------------------------------------------------
// MasteryStateSchema
// ---------------------------------------------------------------------------

/**
 * Three-state lifecycle of a player's progress on a node (CONTEXT.md).
 *
 *   - `untouched`   — player has not engaged with this node.
 *   - `in-progress` — player has started but not yet met the mastery threshold.
 *   - `mastered`    — player has met the MasteryThreshold criteria for the current patch.
 *
 * State transitions: untouched → in-progress → mastered (one direction only in v1).
 * Staleness (mastered → alert) is handled in Phase 9 via CURRENT_PATCH comparison.
 *
 * D-03: `in-progress` is the canonical enum value end-to-end (schema → DB text column →
 * graph node color contract). No translation layer between vocabulary layers.
 */
export const MasteryStateSchema = z.enum(["untouched", "in-progress", "mastered"]);

/** Inferred TypeScript type for mastery state. */
export type MasteryState = z.infer<typeof MasteryStateSchema>;

// ---------------------------------------------------------------------------
// ProgressRecordSchema
// ---------------------------------------------------------------------------

/**
 * A single player's progress on a single node for a specific WC3 patch.
 *
 * Progress is patch-tagged (DATA-04) because a player's `mastered` state
 * is only valid for the patch whose threshold they met. When the patch
 * advances, the progress record retains the historical patchId — staleness
 * logic in Phase 9 compares patchId to CURRENT_PATCH.id to surface alerts.
 *
 * Required fields (all non-optional):
 *   - userId:       identifies the player (matches auth identity in Phase 4)
 *   - nodeId:       the node whose progress is recorded
 *   - patchId:      registry-validated patch this record is valid for (DATA-04)
 *   - masteryState: untouched | learning | mastered
 *   - lastUpdated:  ISO 8601 datetime of the last state change
 */
export const ProgressRecordSchema = z.object({
  /**
   * Player identity — matched to auth system identity in Phase 4.
   * Format is implementation-defined (Phase 4); this schema accepts any string.
   * D-05: UUID guarantee lives in the auth/DB layer, not this Zod schema — z.string()
   * is intentional; the DB column references users.id which enforces UUID at persistence.
   */
  userId: z.string(),
  /** The node whose progress this record tracks (matches node `id`). */
  nodeId: z.string(),
  /**
   * Registry-validated WC3 patch identifier (DATA-04).
   * Records are patch-tagged so staleness can be derived when CURRENT_PATCH
   * advances past the patchId recorded here. Unknown patchIds are rejected.
   */
  patchId: z.enum(PATCH_IDS),
  /**
   * Current mastery state for this node + patch combination.
   * Must be one of the three locked values from MasteryStateSchema.
   */
  masteryState: MasteryStateSchema,
  /**
   * Origin of this progress record (D-04 forward-design).
   * - `manual`: player explicitly set this state via UI controls (Phase 5).
   * - `auto`: state derived from w3champions ladder data (Phase 7/8 auto-detection).
   * Defaults to `"manual"` — only manual writes occur in Phase 5.
   * Note: 05-04 server fn hardcodes `"manual"` server-side; a manual mark may
   * override an auto state in the Phase 7/8 merge logic.
   */
  source: z.enum(["manual", "auto"]).default("manual"),
  /**
   * ISO 8601 datetime of the last state transition for this record.
   * Stored as a string; DB persistence layer (Phase 4) converts to timestamp.
   * Must be a full datetime (not a date-only string) to support ordering.
   */
  lastUpdated: z.string().datetime(),
});

/** Inferred TypeScript type for a player's progress record. */
export type ProgressRecord = z.infer<typeof ProgressRecordSchema>;
