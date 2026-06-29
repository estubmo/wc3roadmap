// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /preview/full-map — explore-mode full map acceptance surface (UI-SPEC Preview 3).
 *
 * Demonstrates:
 *   - Full graph loaded; click "Explore full map" to reveal all nodes at 100% opacity.
 *   - Camera re-fits to the full graph after explore activation.
 *   - "Back to pathway" button appears after explore activation.
 *   - Pan/zoom/click fully interactive — no frame drops (success criterion 1 / GRAPH-06).
 *
 * To verify criterion 1:
 *   - Open React DevTools → Profiler, record a 200px pan drag, stop.
 *   - Confirm any GraphNode renders ≤2 times across the recording.
 *
 * Acceptance criteria link: ROADMAP success criterion 1 (pan/zoom/click, <3 re-renders)
 * + criterion 3 (full map reveal via "Explore full map" action).
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

export const Route = createFileRoute("/preview/full-map")({
  component: PreviewFullMap,
});

function PreviewFullMap() {
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

  // Starts in guided-pathway mode. Click "Explore full map" to reveal all nodes
  // at 100% opacity with "Back to pathway" visible. Pan/zoom/click for Profiler check.
  return (
    <div style={{ height: "100dvh", backgroundColor: "var(--color-obsidian-950)" }}>
      <RoadmapGraph nodes={nodes} pathway={pathway} />
    </div>
  );
}
