// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * GraphDisplayNode schema — graph-display projection for the graph engine.
 *
 * This schema is the sole data contract between the content pipeline and the
 * graph engine (D-04, ADR 002, ADR 005). It extends `NodeSummarySchema` with
 * exactly ONE additional field — `difficulty` — required for the node face.
 *
 * The graph engine MUST import only this type. Importing content-surface
 * types or fields is strictly prohibited (ADR 002 / ADR 005). Any new field
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
 * with `difficulty` — the only field the graph engine adds beyond the summary.
 * Components that render graph nodes type their props to `GraphDisplayNode`;
 * TypeScript enforces the ADR 002 boundary at compile time.
 */
export const GraphDisplayNodeSchema = NodeSummarySchema.extend({
  /**
   * Relative learning curve calibrated to the WC3 community audience (D-07).
   * Carried on the graph face to support visual encoding and future GRAPH-04
   * filtering (Phase 3). Three values locked per CONTEXT.md.
   */
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

/** Inferred TypeScript type for the graph-display node projection. */
export type GraphDisplayNode = z.infer<typeof GraphDisplayNodeSchema>;
