// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * MobileNodeList — SSR-safe vertical node card list for mobile viewports.
 *
 * Renders as plain HTML — no @xyflow/react import, no window.innerWidth check
 * (GRAPH-05, UI-SPEC D-11/D-12, RESEARCH §Mobile Fallback). Responsive
 * switching is CSS-only: the route layer (plan 10) wraps this in `block md:hidden`.
 *
 * Two sections:
 *   "Your Pathway" — pathway nodes in pathway-step order
 *   "All Nodes"    — remaining nodes not referenced by the pathway
 *
 * Each card shows the lucide type icon (20px) + node title (15px/600, 1-line
 * truncated) + MasteryBadge. The full 72px row is the tap target (satisfies
 * 44px minimum). Tap is a no-op in Phase 2; Phase 3 wires the detail panel.
 *
 * Colors: all CSS variable references — no hardcoded hex (UI-SPEC §Color).
 */

import { Sword, BookOpen } from "lucide-react";
import type { GraphDisplayNode } from "#/schemas/graph";
import type { Pathway } from "#/schemas/pathway";
import { getMockMastery } from "#/lib/mock-mastery";
import { useGraphStore } from "#/lib/graph-store";
import { MasteryBadge } from "./MasteryBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MobileNodeListProps {
  /** All graph display nodes available for listing. */
  nodes: GraphDisplayNode[];
  /** Active pathway — drives the "Your Pathway" section ordering. */
  pathway: Pathway;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** 1px obsidian-700 horizontal rule between sections. */
function SectionDivider() {
  return (
    <hr
      aria-hidden="true"
      style={{
        border: "none",
        borderTop: "1px solid var(--color-obsidian-700)",
        marginBlock: "8px",
        marginInline: 0,
      }}
    />
  );
}

/** Section header label ("Your Pathway" / "All Nodes"). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: 400,
        lineHeight: 1.4,
        opacity: 0.55,
        paddingInline: "16px",
        paddingBlock: "6px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

/** Single 72px+ tap-target card for a graph node. */
function MobileNodeCard({ node }: { node: GraphDisplayNode }) {
  const mastery = getMockMastery(node.id);
  const isConceptual = node.nodeType === "CONCEPTUAL";
  const typeIconAriaLabel = isConceptual ? "Conceptual node" : "Mechanic node";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        useGraphStore.getState().setSelectedNode(node.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          useGraphStore.getState().setSelectedNode(node.id);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "72px",
        paddingInline: "16px",
        paddingBlock: "12px",
        gap: "12px",
        backgroundColor: "var(--color-obsidian-800)",
        cursor: "pointer",
        // Focus ring for accessibility (UI-SPEC §Accessibility Baseline)
        outline: "none",
      }}
      // Inline focus ring via CSS class would require global styles;
      // using onFocus/onBlur is avoided for SSR safety — `focus-visible` pseudo
      // is handled by the global CSS focus-visible rule if present.
    >
      {/* Left: type icon + node title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flex: "1 1 0%",
          minWidth: 0,
        }}
      >
        <span
          role="img"
          aria-label={typeIconAriaLabel}
          style={{ flexShrink: 0, display: "inline-flex" }}
        >
          {isConceptual ? (
            <BookOpen size={20} aria-hidden="true" />
          ) : (
            <Sword size={20} aria-hidden="true" />
          )}
        </span>

        <span
          style={{
            fontSize: "15px",
            fontWeight: 600,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.title}
        </span>
      </div>

      {/* Right: mastery badge */}
      <div style={{ flexShrink: 0 }}>
        <MasteryBadge state={mastery} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileNodeList — named export
// ---------------------------------------------------------------------------

/**
 * SSR-safe mobile node list.
 *
 * No @xyflow/react import. No window references. Purely server-renderable HTML.
 * Rendered inside a `block md:hidden` container by the canvas route (plan 10).
 */
export function MobileNodeList({ nodes, pathway }: MobileNodeListProps) {
  // Build a lookup map for O(1) node retrieval by ID.
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Pathway section: steps in pathway order; unknown IDs are skipped gracefully.
  const pathwayNodes = pathway.steps
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphDisplayNode => n !== undefined);

  // "All Nodes" section: everything not referenced by the pathway.
  const pathwaySet = new Set(pathway.steps);
  const otherNodes = nodes.filter((n) => !pathwaySet.has(n.id));

  return (
    <div
      style={{
        backgroundColor: "var(--color-obsidian-900)",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Sticky header — pathway title in Space Grotesk */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--color-obsidian-900)",
          paddingInline: "16px",
          paddingBlock: "24px",
          borderBottom: "1px solid var(--color-obsidian-700)",
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
          {pathway.title}
        </h1>
      </div>

      {/* Section 1: Your Pathway */}
      <section aria-label="Your Pathway" style={{ paddingBlockEnd: "8px" }}>
        <SectionLabel>Your Pathway</SectionLabel>
        {pathwayNodes.map((node) => (
          <MobileNodeCard key={node.id} node={node} />
        ))}
      </section>

      {/* Section separator + Section 2: All Nodes (only when nodes exist) */}
      {otherNodes.length > 0 && (
        <>
          <SectionDivider />
          <section aria-label="All Nodes" style={{ paddingBlockEnd: "8px" }}>
            <SectionLabel>All Nodes</SectionLabel>
            {otherNodes.map((node) => (
              <MobileNodeCard key={node.id} node={node} />
            ))}
          </section>
        </>
      )}

      {/* Bottom breathing room */}
      <div style={{ paddingBlock: "24px" }} />
    </div>
  );
}
