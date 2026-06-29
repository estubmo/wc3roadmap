// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * NodeDetailPanel — SSR-safe responsive node detail panel.
 *
 * Renders a single <ClientOnly fallback={null}> wrapping NodeDetailPanelInner,
 * which hosts two AnimatePresence-managed motion panels:
 *
 *   DESKTOP (hidden md:flex): a right-side fixed drawer that slides in from the
 *   right (D-01). A matching hidden md:block backdrop dims the graph while
 *   keeping it interactive (D-01). Spring damping 28 / stiffness 280.
 *
 *   MOBILE (block md:hidden): a fixed bottom sheet at ~80svh that slides up from
 *   the bottom (D-03). Swipe-to-dismiss via `drag="y"`: close when velocity
 *   > 300 px/s or drag offset > 120 px.
 *
 * Both variants render <NodePanelContent nodeId={selectedNodeId} onClose={…} />.
 * Changing selectedNodeId swaps content in place — no close/reopen (D-02).
 *
 * Three dismiss paths (D-02):
 *   1. Esc key — useEffect keydown listener on document
 *   2. Backdrop click — desktop only
 *   3. Close button — delegated to NodePanelContent via onClose prop
 *   (4. Swipe down — mobile only, handled by motion drag events)
 *
 * Architecture constraints:
 *   - Single <ClientOnly> boundary — MDXContent runs client-side only (Pitfall 4)
 *   - NO Radix portal — CSS breakpoint classes (hidden md:flex) must apply to
 *     these elements; portals escape the CSS cascade (Pitfall 1)
 *   - Responsive split is CSS-only (hidden md:flex / block md:hidden) — no
 *     window.innerWidth, no JS media query
 *
 * Motion imports: `motion`, `AnimatePresence` from `motion/react` (not
 * framer-motion — the old package name per CLAUDE.md "What NOT to Use").
 *
 * Pattern source: 03-RESEARCH.md §Q5; 03-PATTERNS.md §NodeDetailPanel.
 */

import { useEffect } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useGraphStore } from "#/lib/graph-store";
import { NodePanelContent } from "./NodePanelContent";

// ---------------------------------------------------------------------------
// NodeDetailPanelInner — client-only inner implementation
// ---------------------------------------------------------------------------

/**
 * Client-only panel implementation.
 *
 * Reads selectedNodeId from the graph store (slice subscription — avoids
 * re-renders from hoveredNodeId or filter changes). Mounts an Esc key
 * listener on document for keyboard dismissal.
 *
 * Two AnimatePresence groups are used so the desktop panel + backdrop
 * and the mobile sheet can each control their own enter/exit timing.
 */
function NodeDetailPanelInner() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  // -------------------------------------------------------------------------
  // Esc key dismiss (D-02 keyboard dismiss path)
  // -------------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedNode(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setSelectedNode]);

  const handleClose = () => setSelectedNode(null);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP: right-side fixed drawer (hidden md:flex, D-01)             */}
      {/* ------------------------------------------------------------------ */}

      {/* Desktop backdrop — dims the graph, click-away to dismiss (D-01/D-02) */}
      <AnimatePresence>
        {selectedNodeId && (
          <motion.div
            key="node-panel-backdrop"
            className="hidden md:block fixed inset-0 top-[56px] z-40"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-obsidian-950) 60%, transparent)",
              pointerEvents: "all",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop panel — slides in from the right */}
      <AnimatePresence>
        {selectedNodeId && (
          <motion.aside
            key={`node-panel-desktop-${selectedNodeId}`}
            className="hidden md:flex fixed right-0 top-[56px] bottom-0 z-50 w-[480px] flex-col overflow-hidden"
            style={{
              backgroundColor: "var(--color-obsidian-900)",
              borderLeft: "1px solid var(--color-obsidian-600)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <NodePanelContent nodeId={selectedNodeId} onClose={handleClose} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE: bottom sheet (~80svh, block md:hidden, D-03)                */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {selectedNodeId && (
          <motion.div
            key={`node-panel-mobile-${selectedNodeId}`}
            className="block md:hidden fixed bottom-0 inset-x-0 z-50 overflow-hidden"
            style={{
              height: "80svh",
              backgroundColor: "var(--color-obsidian-900)",
              borderTop: "1px solid var(--color-obsidian-600)",
              borderRadius: "12px 12px 0 0",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_event, info) => {
              // Swipe-to-dismiss (D-03): fast swipe OR large downward drag offset
              if (info.velocity.y > 300 || info.offset.y > 120) {
                handleClose();
              }
            }}
          >
            <NodePanelContent nodeId={selectedNodeId} onClose={handleClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// NodeDetailPanel — named export (thin ClientOnly wrapper)
// ---------------------------------------------------------------------------

/**
 * Thin ClientOnly wrapper — ensures NodeDetailPanelInner (motion.div +
 * MDXContent) only renders on the client. Fallback is null — no SSR
 * skeleton for the panel (the panel only appears after user interaction).
 *
 * Usage: mount once in the route's Home component, adjacent to the graph
 * container. The panel reads selectedNodeId from the graph store; the graph
 * canvas wires onNodeClick → setSelectedNode(node.id) on all viewports.
 *
 * Example:
 *   <div style={{ height: "calc(100dvh - 56px)" }}>
 *     <RoadmapGraph nodes={nodes} pathway={pathway} />
 *   </div>
 *   <NodeDetailPanel />  ← mounts here; reads its own state from store
 */
export function NodeDetailPanel() {
  return (
    <ClientOnly fallback={null}>
      <NodeDetailPanelInner />
    </ClientOnly>
  );
}
