// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Index route — home page with responsive graph/list render.
 *
 * Loader:
 *   - Projects allNodes from content-collections to GraphDisplayNode[]
 *     (NO content fields — ADR 002 / ADR 005 / ADR 006 / T-02-15 projection boundary).
 *     Explicit field-by-field projection preserves the content/graph decoupling;
 *     no spreading of full NodeFrontmatter (ADR 002 rule).
 *   - Parses pathways/beginner-fundamentals.json via PathwaySchema.safeParse
 *     (T-02-16: invalid JSON → empty-state fallback, not a crash).
 *
 * Responsive switch (CSS-only — Pitfall 4 / GRAPH-05):
 *   - Desktop (≥768px): `hidden md:block` canvas wrapper, height calc(100dvh - 56px).
 *   - Mobile (<768px):  `block md:hidden` node-card list.
 *   Both wrappers are SSR-rendered; CSS hides the one that doesn't apply.
 *   No window.innerWidth check — enforced by acceptance grep.
 */

import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { allNodes } from "content-collections";
import { GraphDisplayNodeSchema } from "#/schemas/graph";
import type { GraphDisplayNode } from "#/schemas/graph";
import { PathwaySchema } from "#/schemas/pathway";
import type { Pathway } from "#/schemas/pathway";
import { RoadmapGraph } from "#/components/graph/RoadmapGraph";
import { MobileNodeList } from "#/components/graph/MobileNodeList";
import { FilterBar } from "#/components/graph/FilterBar";
import { NodeDetailPanel } from "#/components/graph/NodeDetailPanel";
// Pathway JSON — bundled by Vite at build time; works in SSR + client contexts.
// Validated at runtime via PathwaySchema.safeParse (T-02-16 mitigation).
import pathwayRaw from "../../pathways/beginner-fundamentals.json";

// ---------------------------------------------------------------------------
// Route — loader + component registration
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/")({
  loader: (): { nodes: GraphDisplayNode[]; pathway: Pathway | null } => {
    // Project each node to the GraphDisplayNode boundary.
    // GraphDisplayNodeSchema strips all non-boundary fields at parse time
    // (ADR 002: no citations / patch_context / body on the graph layer).
    // Invalid projections are filtered out rather than crashing the loader.
    const nodes: GraphDisplayNode[] = allNodes
      .map((n) => {
        const result = GraphDisplayNodeSchema.safeParse({
          id: n.id,
          title: n.title,
          nodeType: n.nodeType,
          race: n.race,
          prerequisites: n.prerequisites,
          difficulty: n.difficulty,
          skillType: n.skillType, // ADR-006: GRAPH-04 skill-type filtering (D-11)
          tags: n.tags,           // ADR-006: GRAPH-04 tag search (D-11)
        });
        return result.success ? result.data : null;
      })
      .filter((n): n is GraphDisplayNode => n !== null);

    // Validate the pathway JSON (T-02-16: safeParse → empty-state fallback).
    const pathwayResult = PathwaySchema.safeParse(pathwayRaw);
    const pathway: Pathway | null = pathwayResult.success
      ? pathwayResult.data
      : null;

    return { nodes, pathway };
  },
  component: Home,
});

// ---------------------------------------------------------------------------
// Empty state — rendered when pathway parse fails or nodes are absent
// (UI-SPEC §Copywriting Contract: "No pathway loaded" / "Graph error state")
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        gap: "12px",
        backgroundColor: "var(--color-obsidian-950)",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 600,
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        No pathway loaded
      </h1>
      <p
        style={{
          fontSize: "13px",
          fontWeight: 400,
          lineHeight: 1.4,
          opacity: 0.7,
          margin: 0,
          maxWidth: "480px",
        }}
      >
        Add node IDs to pathways/beginner-fundamentals.json to populate the
        pathway view.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Home — main component
// ---------------------------------------------------------------------------

function Home() {
  const { nodes, pathway } = Route.useLoaderData();

  // T-02-16: invalid pathway JSON or missing nodes → graceful empty state
  if (!pathway || nodes.length === 0) {
    return <EmptyState />;
  }

  return (
    <main style={{ backgroundColor: "var(--color-obsidian-950)" }}>
      {/* 56px app control bar — SSR-safe structural element.
          Height is consumed by calc(100dvh - 56px) on the canvas wrapper below.
          Content: app identity (left) + FilterBar (D-09, fills remaining width). */}
      <div
        style={{
          height: "56px",
          display: "flex",
          alignItems: "center",
          paddingInline: "32px",
          backgroundColor: "var(--color-obsidian-900)",
          borderBottom: "1px solid var(--color-obsidian-600)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: 600,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          WC3 Roadmap
        </span>

        {/* FilterBar — D-09/D-10 search input + four facet groups.
            Fills remaining top-bar width; dispatches to graph-store.
            useShallow slice subscription inside FilterBar (Pitfall 3). */}
        <FilterBar />
      </div>

      {/* Desktop canvas — hidden below md breakpoint (CSS-only, Pitfall 4).
          Both this div and the mobile div below are always SSR-rendered;
          Tailwind CSS hides the one that doesn't apply. */}
      <div
        className="hidden md:block"
        style={{ height: "calc(100dvh - 56px)" }}
      >
        <RoadmapGraph nodes={nodes} pathway={pathway} />
      </div>

      {/* Mobile node-card list — hidden at md breakpoint and above.
          MobileNodeList is SSR-safe plain HTML (no @xyflow/react import). */}
      <div className="block md:hidden">
        <MobileNodeList nodes={nodes} pathway={pathway} />
      </div>

      {/* Panel layer — client-only, mounted once above both desktop + mobile.
          NodeDetailPanel reads selectedNodeId from graph-store; no props needed.
          Single mount point per RESEARCH §Q5 "Home owns the panel layer". */}
      <ClientOnly fallback={null}>
        <NodeDetailPanel />
      </ClientOnly>
    </main>
  );
}
