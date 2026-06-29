// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * FilterBar — search input + race/skillType/difficulty/mastery facet toggles.
 *
 * D-09/D-10 (GRAPH-04): always-visible top-bar discovery surface that drives
 * the graph's dim-non-matching behaviour. Renders inside the 56px obsidian
 * top bar as a flex sibling to the brand span in `src/routes/index.tsx`.
 *
 * State reads:
 *   Slice subscription via useShallow from zustand/shallow — subscribes to
 *   { searchQuery, activeFilters } only. This avoids re-renders triggered by
 *   hoveredNodeId / ancestorEdgeIds / selectedNodeId changes (Pitfall 3 from
 *   03-RESEARCH.md §Common Pitfalls).
 *
 * State writes:
 *   All dispatches use useGraphStore.getState().[action] in event handlers —
 *   never a hook subscription in the write path (consistent with the store's
 *   hover pattern in RoadmapGraph.tsx).
 *
 * Security (T-3-05):
 *   The search value flows only into store state and is consumed by
 *   String.toLowerCase().includes() inside matchesFilter — never rendered as
 *   HTML. Safe by construction; no sanitization required.
 *
 * Design (ADR 0001):
 *   All colours use CSS variable tokens (--color-obsidian-*, --color-rune-*).
 *   No hardcoded hex, no Tailwind brand-colour classes on structural elements.
 *   Active facet buttons highlighted with rune-400 border + rune-300 text.
 */

import { useShallow } from "zustand/shallow";
import { useGraphStore } from "#/lib/graph-store";
import type { ActiveFilters } from "#/lib/graph-store";
import { isFilterActive } from "#/lib/filter-utils";

// ---------------------------------------------------------------------------
// Facet configuration
// ---------------------------------------------------------------------------

/** All facet keys surfaced in the FilterBar (D-10). */
type FacetKey = keyof ActiveFilters;

interface FacetConfig {
  key: FacetKey;
  /** Short label shown before the value pills (uppercase, muted). */
  label: string;
  /** Ordered list of selectable values for this facet. */
  values: readonly string[];
}

const FACETS: readonly FacetConfig[] = [
  {
    key: "race",
    label: "Race",
    values: ["agnostic", "human", "orc", "undead", "nightelf"],
  },
  {
    key: "skillType",
    label: "Skill",
    values: ["macro", "micro", "mental"],
  },
  {
    key: "difficulty",
    label: "Level",
    values: ["beginner", "intermediate", "advanced"],
  },
  {
    key: "mastery",
    label: "Mastery",
    values: ["untouched", "in-progress", "mastered"],
  },
] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Muted section label above each facet group (uppercase micro-text). */
function FacetLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: "10px",
        fontWeight: 500,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        opacity: 0.5,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {children}
    </span>
  );
}

interface FacetPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Individual facet value toggle pill. Rune-gold accent when active. */
function FacetPill({ label, active, onClick }: FacetPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        backgroundColor: active
          ? "var(--color-rune-600)"
          : "var(--color-obsidian-800)",
        color: active ? "var(--color-rune-300)" : "#e9e8ee",
        border: `1px solid ${active ? "var(--color-rune-400)" : "var(--color-obsidian-600)"}`,
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 500,
        lineHeight: 1,
        padding: "3px 8px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",
        // Reset button styles
        appearance: "none",
        outline: "none",
        flexShrink: 0,
      }}
      // Inline focus ring via CSS is handled by the global :focus-visible rule.
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// FilterBar — named export
// ---------------------------------------------------------------------------

/**
 * Renders the top-bar search input + four-facet filter controls (D-09/D-10).
 *
 * Place inside the 56px top-bar flex row in `src/routes/index.tsx` as a flex
 * sibling after the brand span — `flex: "1 1 0%"` fills the remaining width.
 *
 * Facets: race | skillType | difficulty | mastery
 * Each facet pill toggles its value in `activeFilters[facet]` via `setFilter`.
 * "Clear" button appears only when `isFilterActive` is true.
 *
 * State read via shallow slice subscription; dispatches via getState() in handlers.
 */
export function FilterBar() {
  // Slice subscription — only re-renders when searchQuery or activeFilters change.
  // useShallow prevents object-identity churn on every store update (Pitfall 3).
  const { searchQuery, activeFilters } = useGraphStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      activeFilters: s.activeFilters,
    }))
  );

  const isActive = isFilterActive(searchQuery, activeFilters);

  // ---------------------------------------------------------------------------
  // Handlers — all use getState() to avoid registering hook subscriptions
  // ---------------------------------------------------------------------------

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    useGraphStore.getState().setSearchQuery(e.target.value);
  }

  function handleClear() {
    useGraphStore.getState().clearFilters();
  }

  function toggleFacetValue(facet: FacetKey, value: string) {
    const current = activeFilters[facet];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    useGraphStore.getState().setFilter(facet, next);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flex: "1 1 0%",
        // Overflow hidden on the container; inner facet area scrolls.
        overflow: "hidden",
        // Minimal padding so search input aligns with brand span text.
        paddingInline: "12px",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Search input — title + tags free-text (D-10)                        */}
      {/* ------------------------------------------------------------------ */}
      <input
        type="search"
        placeholder="Search nodes and tags…"
        value={searchQuery}
        onChange={handleSearchChange}
        aria-label="Search nodes by title or tags"
        style={{
          flexShrink: 0,
          width: "180px",
          height: "28px",
          backgroundColor: "var(--color-obsidian-800)",
          color: "#e9e8ee",
          border: "1px solid var(--color-obsidian-600)",
          borderRadius: "6px",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
          paddingInline: "8px",
          outline: "none",
          transition: "border-color 0.12s ease",
          // Placeholder styling via CSS variable (app.css provides ::placeholder rule)
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-rune-400)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-obsidian-600)";
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Facet groups — horizontally scrollable if viewport is narrow        */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="group"
        aria-label="Filter facets"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          overflowX: "auto",
          flex: "1 1 0%",
          // Hide scrollbar visually while still scrollable (app.css sets thin scrollbar)
          scrollbarWidth: "none",
        }}
      >
        {FACETS.map(({ key, label, values }) => (
          <div
            key={key}
            role="group"
            aria-label={`${label} filter`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            <FacetLabel>{label}</FacetLabel>
            {values.map((value) => (
              <FacetPill
                key={value}
                label={value}
                active={activeFilters[key].includes(value)}
                onClick={() => toggleFacetValue(key, value)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Clear filters — visible only when any filter is active (D-09)       */}
      {/* ------------------------------------------------------------------ */}
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear all filters"
          style={{
            flexShrink: 0,
            backgroundColor: "transparent",
            color: "var(--color-rune-400)",
            border: "1px solid var(--color-rune-600)",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 500,
            lineHeight: 1,
            padding: "3px 10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.12s ease, color 0.12s ease",
            appearance: "none",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-rune-400)";
            e.currentTarget.style.color = "var(--color-rune-300)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-rune-600)";
            e.currentTarget.style.color = "var(--color-rune-400)";
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
