// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /preview/mastery-states — three mastery states acceptance surface (UI-SPEC Preview 2).
 *
 * Demonstrates:
 *   - Minimum 3 nodes simultaneously: untouched, in-progress ("Learning"), mastered ("Mastered").
 *   - Fill+glow progression legible: obsidian dim → rune-600 ring → rune-500 fill+glow.
 *   - MECHANIC (sharp 4px) vs CONCEPTUAL (rounded 16px) shapes both represented.
 *   - Prerequisite-chain edge highlight visible on hover (rune-400 animated stroke).
 *
 * Mastery distribution is provided by getMockMastery in RoadmapGraph / GraphNode:
 *   mastered   — map-control, supply-management, scouting, hotkey-discipline
 *   in-progress — creep-routing, hero-leveling, army-positioning
 *   untouched  — resource-banking, micro-focus-fire, expansion-timing, etc.
 *
 * Acceptance criteria link: ROADMAP success criterion 2 (three visually distinct mastery states).
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

export const Route = createFileRoute("/preview/mastery-states")({
  component: PreviewMasteryStates,
});

function PreviewMasteryStates() {
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

  // Starts in explore mode (initialExploring=true) so all nodes are at 100% opacity
  // on mount — all three mastery states (mastered / in-progress / untouched) are
  // simultaneously legible without a manual "Explore full map" click.
  // RoadmapGraph injects mastery state via getMockMastery on every node (mock-mastery.ts).
  // Both MECHANIC and CONCEPTUAL nodes are present in the seed corpus.
  // Hover any node to see the prerequisite-chain edge highlight (rune-400).
  return (
    <div style={{ height: "100dvh", backgroundColor: "var(--color-obsidian-950)" }}>
      <RoadmapGraph nodes={nodes} pathway={pathway} initialExploring />
    </div>
  );
}
