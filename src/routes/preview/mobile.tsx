// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /preview/mobile — mobile node-card list acceptance surface (UI-SPEC Preview 4).
 *
 * Demonstrates:
 *   - MobileNodeList in a constrained container (max-width: 390px) simulating a
 *     mobile viewport, centered horizontally so the layout is clear at any window size.
 *   - "Beginner Fundamentals" sticky header (Space Grotesk 22px/600).
 *   - "Your Pathway" section first (pathway nodes in step order).
 *   - "All Nodes" section below (remaining nodes).
 *   - Each card: type icon + title + mastery badge, 72px min-height, tap is a no-op.
 *   - All three mastery states represented across cards (via getMockMastery in MobileNodeList).
 *
 * Mastery distribution (mock-mastery.ts):
 *   mastered   — map-control, supply-management, scouting, hotkey-discipline
 *   in-progress — creep-routing, hero-leveling, army-positioning
 *   untouched  — resource-banking, micro-focus-fire, expansion-timing, etc.
 *
 * Acceptance criteria link: ROADMAP success criterion 4 (mobile viewport, readable
 * scrollable form without layout breakage).
 *
 * Dev-only route — no production nav link required (plan 10 must_haves §prohibitions).
 */

import { createFileRoute } from "@tanstack/react-router";
import { allNodes } from "content-collections";
import { GraphDisplayNodeSchema } from "#/schemas/graph";
import type { GraphDisplayNode } from "#/schemas/graph";
import { PathwaySchema } from "#/schemas/pathway";
import type { Pathway } from "#/schemas/pathway";
import { MobileNodeList } from "#/components/graph/MobileNodeList";
import pathwayRaw from "../../../pathways/beginner-fundamentals.json";

export const Route = createFileRoute("/preview/mobile")({
  component: PreviewMobile,
});

function PreviewMobile() {
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

  // Constrained container (390px = iPhone 14 Pro width) centered on the page.
  // This simulates the mobile layout at any browser window size, making the
  // mobile acceptance surface reviewable without resizing the browser.
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-obsidian-950)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "390px",
          height: "100dvh",
          overflow: "hidden",
          // Subtle left/right border to delineate the simulated mobile frame
          borderInline: "1px solid var(--color-obsidian-700)",
        }}
      >
        <MobileNodeList nodes={nodes} pathway={pathway} />
      </div>
    </div>
  );
}
