// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway schema — standalone pathway data file structure (D-10).
 *
 * A pathway is a named, ordered sequence of node IDs forming a coherent
 * learning arc (e.g., "Beginner Fundamentals"). Pathways are static JSON
 * files under `pathways/` and are Zod-validated at load time.
 *
 * Phase 2 scope: data contract definition and validation only.
 * Phase 9 extends this schema with progress tracking and content fields.
 *
 * CI validates that every `steps[]` ID resolves to a real node in the
 * content corpus (referential integrity — see scripts/validate-pathway.ts).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// PathwaySchema — validated pathway data contract (D-10)
// ---------------------------------------------------------------------------

/**
 * Schema for a pathway data file (`pathways/*.json`).
 *
 * All string fields use `.min(1)` to reject empty strings.
 * `steps` requires at least one node ID — an empty pathway is not meaningful.
 */
export const PathwaySchema = z.object({
  /** Kebab-case unique identifier matching the pathway filename. */
  id: z.string().min(1),
  /** Human-readable display name for the pathway. */
  title: z.string().min(1),
  /** Short descriptor displayed beneath the pathway title in the banner. */
  subtitle: z.string().min(1),
  /**
   * Ordered array of node IDs forming the pathway's learning sequence (D-10).
   * Must be non-empty — a pathway with no steps has no learning value.
   * CI validates every ID references a real node (validate-pathway.ts).
   */
  steps: z.array(z.string()).min(1),
});

/** Inferred TypeScript type for a pathway data file. */
export type Pathway = z.infer<typeof PathwaySchema>;
