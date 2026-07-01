// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /preview/auto-advance — Phase 7 UAT harness for the w3champions auto-advance
 * visual (Test 2 / D-07 / D-09). Dev-only preview surface, no production nav.
 *
 * WHY THIS EXISTS: the real path (Battle.net login → Sync → detectMasterySignals)
 * cannot advance a node until a content node carries an `autoDetect` criterion
 * (separate content workstream). This harness drives the *visual state directly*
 * from the graph store so the auto-advance rendering is observable without any
 * network / DB / real ladder event — the testability seam the mechanism was
 * built for.
 *
 * It seeds three coexisting sources so "visibly different" (Test 2) is a direct
 * side-by-side comparison, NOT a from-memory judgement:
 *   - creep-routing   → source "auto"  + recentlyAdvanced → "In progress · from
 *                        w3champions" badge, ◈ canvas marker, one-shot Motion pulse
 *   - hero-leveling   → manual in-progress (no source)    → plain "In Progress"
 *   - map-control     → source "quiz" (mastered)          → "Mastered · via quiz", ◆
 *   - hotkey-discipline → manual mastered                 → plain "Mastered"
 *
 * (this route seeds the graph store directly — `masteryMap` from MOCK_MASTERY,
 * plus `sourceMap` + `recentlyAdvancedNodeIds` — since ProgressProvider only
 * hydrates masteryMap from the server/localStorage in the real app.)
 *
 * Copy/glyph/pulse are placeholders per the phase objective — final styling is
 * deferred to the UI-SPEC pass (CONTEXT.md). This confirms the mechanism renders
 * and reads distinct, not the final polish.
 */

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { allNodes } from "content-collections";
import { GraphDisplayNodeSchema } from "#/schemas/graph";
import type { GraphDisplayNode } from "#/schemas/graph";
import { PathwaySchema } from "#/schemas/pathway";
import type { Pathway } from "#/schemas/pathway";
import { RoadmapGraph } from "#/components/graph/RoadmapGraph";
import { useGraphStore } from "#/lib/graph-store";
import { MOCK_MASTERY } from "#/lib/mock-mastery";
import pathwayRaw from "../../../pathways/beginner-fundamentals.json";

export const Route = createFileRoute("/preview/auto-advance")({
  component: PreviewAutoAdvance,
});

// The node whose in-progress state is auto-detected from w3champions (D-09).
// mock-mastery.ts marks it "in-progress", so the auto badge/marker apply.
const AUTO_NODE = "creep-routing";

function PreviewAutoAdvance() {
  const [seeded, setSeeded] = useState(false);

  // Seed mastery + source distinctions once on mount, decoupled from any
  // network/DB path. In the real app ProgressProvider hydrates masteryMap from
  // the server/localStorage; here we inject the mock distribution directly so
  // the auto-advance visual is observable without auth or a ladder event.
  useEffect(() => {
    const { initMasteryMap, setSource, setRecentlyAdvanced } =
      useGraphStore.getState();
    // MOCK_MASTERY: creep-routing / hero-leveling → in-progress,
    // map-control / hotkey-discipline → mastered (mock-mastery.ts).
    initMasteryMap({ ...MOCK_MASTERY });
    setSource(AUTO_NODE, "auto"); // w3champions auto-advance (D-09)
    setSource("map-control", "quiz"); // quiz mastery contrast (D-14)
    // hero-leveling / hotkey-discipline intentionally left source-less (manual).
    setRecentlyAdvanced([AUTO_NODE]); // one-shot pulse on return (D-07)
    setSeeded(true);
  }, []);

  // Re-trigger the one-shot pulse: clear then re-set so the per-node boolean
  // selector flips false→true (a same-set re-set would not re-render).
  function replayPulse() {
    const { setRecentlyAdvanced } = useGraphStore.getState();
    setRecentlyAdvanced([]);
    requestAnimationFrame(() => setRecentlyAdvanced([AUTO_NODE]));
  }

  const nodes: GraphDisplayNode[] = allNodes
    .map((n) => {
      const result = GraphDisplayNodeSchema.safeParse({
        id: n.id,
        title: n.title,
        nodeType: n.nodeType,
        race: n.race,
        prerequisites: n.prerequisites,
        difficulty: n.difficulty,
        skillType: n.skillType,
        tags: n.tags,
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

  return (
    <div style={{ height: "100dvh", backgroundColor: "var(--color-obsidian-950)" }}>
      {/* Dev-only legend + pulse replay — orients the eye for Test 2. */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 50,
          maxWidth: "320px",
          padding: "12px 14px",
          borderRadius: "10px",
          backgroundColor: "color-mix(in oklch, var(--color-obsidian-900) 88%, transparent)",
          border: "1px solid var(--color-obsidian-700, #333)",
          color: "var(--color-rune-100, #eee)",
          fontFamily: "var(--font-display)",
          fontSize: "12px",
          lineHeight: 1.5,
          boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "6px" }}>
          Phase 7 · auto-advance preview
        </div>
        <div style={{ opacity: 0.85 }}>
          <strong>creep-routing</strong> — auto (◈ + “In progress · from w3champions”), pulses on load
          <br />
          <strong>hero-leveling</strong> — manual “In Progress” (no marker)
          <br />
          <strong>map-control</strong> — quiz “Mastered · via quiz” (◆)
          <br />
          <strong>hotkey-discipline</strong> — manual “Mastered”
        </div>
        <button
          type="button"
          onClick={replayPulse}
          disabled={!seeded}
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            borderRadius: "7px",
            border: "1px solid var(--color-rune-500, #6a5acd)",
            backgroundColor: "var(--color-rune-600, #4b3f9e)",
            color: "var(--color-rune-100, #fff)",
            fontFamily: "var(--font-display)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: seeded ? "pointer" : "default",
          }}
        >
          ▸ Replay pulse
        </button>
      </div>
      <RoadmapGraph nodes={nodes} pathway={pathway} initialExploring />
    </div>
  );
}
