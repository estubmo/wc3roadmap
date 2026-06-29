// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /preview/pathway — guided-pathway acceptance surface (UI-SPEC Preview 1).
 *
 * Demonstrates:
 *   - 8 seed nodes in the DAG; non-pathway nodes dimmed to 20% opacity.
 *   - Camera fit-framed to pathway nodes on mount.
 *   - PathwayBanner ("Beginner Fundamentals") visible with "Explore full map" CTA.
 *   - React.memo, useCallback, onlyRenderVisibleElements all active (via RoadmapGraph).
 *
 * Acceptance criteria link: ROADMAP success criterion 3 (guided pathway → full graph).
 *
 * Dev-only route — no production nav link required (plan 10 must_haves §prohibitions).
 */

import { createFileRoute } from "@tanstack/react-router";
import { allNodes } from "content-collections";
import { GraphDisplayNodeSchema } from "#/schemas/graph";
import type { GraphDisplayNode } from "#/schemas/graph";
import { PathwaySchema } from "#/schemas/pathway";
import type { Pathway } from "#/schemas/pathway";
import { RoadmapGraph } from "#/components/graph/RoadmapGraph";
import pathwayRaw from "../../../pathways/beginner-fundamentals.json";

export const Route = createFileRoute("/preview/pathway")({
  component: PreviewPathway,
});

function PreviewPathway() {
  // Project allNodes to the GraphDisplayNode boundary (ADR 002 / ADR 005).
  const nodes: GraphDisplayNode[] = allNodes
    .map((n) => {
      const result = GraphDisplayNodeSchema.safeParse({
        id: n.id,
        title: n.title,
        nodeType: n.nodeType,
        race: n.race,
        prerequisites: n.prerequisites,
        difficulty: n.difficulty,
      });
      return result.success ? result.data : null;
    })
    .filter((n): n is GraphDisplayNode => n !== null);

  const pathwayResult = PathwaySchema.safeParse(pathwayRaw);
  const pathway: Pathway | null = pathwayResult.success
    ? pathwayResult.data
    : null;

  if (!pathway || nodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          backgroundColor: "var(--color-obsidian-950)",
          fontFamily: "var(--font-display)",
          fontSize: "15px",
          opacity: 0.5,
        }}
      >
        Preview data unavailable
      </div>
    );
  }

  // Render the full-canvas graph in guided-pathway mode (exploring=false by default).
  // On mount, camera fits to pathway nodes; non-pathway nodes are dimmed to 20%.
  return (
    <div style={{ height: "100dvh", backgroundColor: "var(--color-obsidian-950)" }}>
      <RoadmapGraph nodes={nodes} pathway={pathway} />
    </div>
  );
}
