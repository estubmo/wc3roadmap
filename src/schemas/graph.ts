// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * GraphDisplayNode schema — graph-display projection for the graph engine.
 *
 * This schema is the sole data contract between the content pipeline and the
 * graph engine (D-04, ADR 002, ADR 005, ADR 006). It extends `NodeSummarySchema`
 * with display-classification fields required for the graph face and filter layer.
 *
 * Current projection fields (each addition required a dedicated ADR):
 *   - `difficulty` — visual encoding and GRAPH-04 filtering (ADR 005)
 *   - `skillType`  — GRAPH-04 skill-type filtering (ADR 006, D-11)
 *   - `tags`       — GRAPH-04 tag search (ADR 006, D-11)
 *
 * The graph engine MUST import only this type. Importing content-surface
 * types or fields is strictly prohibited (ADR 002). Any further field
 * addition requires a new ADR so the boundary stays explicit.
 */

import { z } from "zod";
import { NodeSummarySchema } from "./node";

// ---------------------------------------------------------------------------
// GraphDisplayNodeSchema — NodeSummary + difficulty (D-04, ADR 005)
// ---------------------------------------------------------------------------

/**
 * Graph-display projection of a node.
 *
 * Extends `NodeSummarySchema` (id, title, nodeType, race, prerequisites)
 * with display-classification fields for the graph face and filter layer.
 * Components that render graph nodes type their props to `GraphDisplayNode`;
 * TypeScript enforces the ADR 002 boundary at compile time.
 *
 * Fields added beyond NodeSummary (each required a dedicated ADR):
 *   - `difficulty` — ADR 005
 *   - `skillType`, `tags` — ADR 006 (D-11, GRAPH-04)
 *
 * Any further field addition requires a new ADR (ADR 005 / ADR 006 rule).
 */
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  /**
   * Relative learning curve calibrated to the WC3 community audience (D-07).
   * Supports visual encoding and GRAPH-04 difficulty filtering. Three values
   * locked per CONTEXT.md (beginner / intermediate / advanced).
   */
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  /**
   * Sub-classification of cognitive/physical demand (D-07, D-11).
   * Added under ADR-006 for GRAPH-04 skill-type filtering.
   * Three values locked per CONTEXT.md (macro / micro / mental).
   */
  skillType: z.enum(["macro", "micro", "mental"]),
  /**
   * Free-form thematic tags (D-11). Added under ADR-006 for GRAPH-04 tag
   * search. An empty array is valid — tags are additive metadata only.
   */
  tags: z.array(z.string()),
});

/** Inferred TypeScript type for the graph-display node projection. */
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
