// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Node content schemas — the single source of truth for node structure.
 *
 * Two distinct surfaces (DATA-02, ADR 002):
 *
 *   NodeSummarySchema   — graph-display subset (id, title, nodeType, race,
 *                          prerequisites). The graph engine imports ONLY this type.
 *
 *   NodeFrontmatterSchema — full validated schema extending NodeSummarySchema
 *                            with all content fields. Used by the content pipeline
 *                            and node detail panel (lazy-loaded per ADR 002).
 *
 * Zod v4 idioms used throughout:
 *   - z.enum([...])    — never z.nativeEnum()
 *   - { error: "..." } — never { message: "..." }
 *   - .min(1)          — ensures non-empty strings
 *   - .extend()        — composes NodeFrontmatterSchema as a strict superset
 *
 * PARALLEL-SCHEMA SYNC NOTE:
 *   The NodeFrontmatter shape is intentionally defined twice:
 *   1. Here in src/schemas/node.ts   — project zod, runtime/test surface.
 *   2. Inline in content-collections.ts — injected z, build-time surface.
 *   These two definitions MUST stay field-for-field identical. Any change here
 *   must be mirrored in content-collections.ts (plan 01-06) and vice versa.
 */

import { z } from "zod";
import { PATCH_IDS } from "../lib/patches";

// ---------------------------------------------------------------------------
// NodeSummarySchema — graph-display-only subset (DATA-02, ADR 002)
// ---------------------------------------------------------------------------

/**
 * Minimal node data required by the graph engine. The graph engine depends on
 * `NodeSummary[]` — a flat array of plain objects. It must not import
 * NodeFrontmatter or any content-only field (citations, patch_context, etc.).
 *
 * nodeType is the primary filtering dimension for the graph (DATA-01).
 * prerequisites drives edge derivation — the graph engine reads these to draw
 * arrows; no separate edges file exists (DATA-05).
 */
export const NodeSummarySchema = z.object({
  /** Kebab-case unique identifier matching the node's filename. */
  id: z.string(),
  /** Human-readable display label for the graph node. */
  title: z.string(),
  /**
   * First-class node category (DATA-01). Exactly MECHANIC or CONCEPTUAL —
   * locked per CONTEXT.md; new values require a schema migration and ADR.
   */
  nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
  /**
   * WC3 race the node applies to. Defaults to "agnostic" for v1 content.
   * Race-specific branch content is deferred to v2 (RACE-01..05).
   */
  race: z.enum(["agnostic", "human", "orc", "undead", "nightelf"]),
  /**
   * Soft, non-locking prerequisite node IDs (DATA-05). Accepts an empty array.
   * CI validates that every referenced ID exists and the graph is acyclic.
   * The graph engine uses these to derive edges — no separate edges file.
   */
  prerequisites: z.array(z.string()),
});

/** Inferred TypeScript type for the graph-display-only node subset. */
export type NodeSummary = z.infer<typeof NodeSummarySchema>;

// ---------------------------------------------------------------------------
// Citation sub-schema
// ---------------------------------------------------------------------------

/**
 * A single citation backing a node's learning claim (D-03).
 * `applicationNote` is required — CI and this schema both enforce it.
 * Final field structure is fully finalized in Phase 3; this schema
 * defines the enforcement hook from day one.
 */
const CitationSchema = z.object({
  /** Human-readable reference (paper title, creator name, video title). */
  source: z.string().min(1),
  /** Optional URL to the source. */
  url: z.string().optional(),
  /**
   * Required per-citation bridge between source and WC3 application (D-03).
   * Answers: "How does this source support the claim that [node concept]
   * makes you better at WC3?" CI fails if absent or empty.
   */
  applicationNote: z.string().min(1, {
    error: "Every citation must have a non-empty applicationNote (D-03)",
  }),
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — full validated schema (extends NodeSummarySchema)
// ---------------------------------------------------------------------------

/**
 * Full node frontmatter schema — extends NodeSummarySchema with all remaining
 * content fields. Used by the content pipeline (content-collections) and the
 * node detail panel (Phase 3 lazy load).
 *
 * All fields in this schema are REQUIRED unless explicitly marked optional.
 * patch_context, last_reviewed, and meta_volatile are non-optional per DATA-03.
 * patchId is validated against the patch registry per DATA-04.
 */
export const NodeFrontmatterSchema = NodeSummarySchema.extend({
  /**
   * Sub-classification of cognitive/physical demand (D-07).
   * Supports GRAPH-04 filtering (Phase 3) without migration.
   */
  skillType: z.enum(["macro", "micro", "mental"]),
  /**
   * Relative learning curve calibrated to the WC3 community audience (D-07).
   * Supports GRAPH-04 filtering (Phase 3) without migration.
   */
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  /**
   * Free-form thematic tags (the loose layer above strict enums). An empty
   * array is valid — tags are additive metadata only.
   */
  tags: z.array(z.string()),
  /**
   * Registry-validated WC3 patch identifier (DATA-04).
   * Must reference an entry in src/lib/patches.ts. Unknown IDs fail parsing.
   * z.enum(PATCH_IDS) — PATCH_IDS is typed [string, ...string[]] for direct
   * use here without an extra cast (see src/lib/patches.ts).
   */
  patchId: z.enum(PATCH_IDS),
  /**
   * Short free-text note explaining what, if anything, changed in this node's
   * content relative to patchId (D-06, DATA-03). Required — CI fails if absent.
   * Answers: "What is patch-relevant about this node's current content?"
   */
  patch_context: z.string().min(1, {
    error: "patch_context is required and must not be empty (DATA-03)",
  }),
  /**
   * ISO 8601 date (YYYY-MM-DD) of the last content review against patchId
   * (D-06, DATA-03). Required — CI fails if absent or malformed.
   */
  last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: "last_reviewed must be a YYYY-MM-DD date string (DATA-03)",
  }),
  /**
   * True if this node's content is likely to become stale when the WC3 patch
   * changes (D-06, DATA-03). Required — CI fails if absent.
   * Volatile nodes trigger a staleness indicator in Phase 9 when
   * CURRENT_PATCH.id !== patchId.
   */
  meta_volatile: z.boolean(),
  /**
   * Sources backing the node's learning claims (D-03). Each citation requires
   * a non-empty applicationNote. An empty array is valid (no citations yet),
   * but CI may enforce a minimum citation count in Phase 3.
   */
  citations: z.array(CitationSchema),
});

/** Inferred TypeScript type for the full node frontmatter. */
export type NodeFrontmatter = z.infer<typeof NodeFrontmatterSchema>;
