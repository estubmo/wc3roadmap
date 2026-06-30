// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * NodePanelContent — inner display component for the node detail panel.
 *
 * Renders the full learning content for the selected node in D-12
 * practical-first order:
 *   1. "How to Apply in Your Next Game" — pinned at top (D-12)
 *   2. Conceptual body (MDX prose)
 *   3. Pro Wisdom callout (creator citations, CONT-03)
 *   4. Numbered science references (CitationList, CONT-01)
 *   5. Prerequisite chips (D-14 in-panel navigation)
 *
 * Phase 6 additions (QUIZ-01/02/03):
 *   - QuizCTA rendered after MasteryControls, gated to CONCEPTUAL+quiz (D-04, criterion 1).
 *   - AnimatePresence in-panel takeover: QuizTakeover REPLACES the body while answering —
 *     node prose/citations are not mounted during the quiz (D-09 active recall).
 *   - MasteryBadge receives source={currentSource} — shows "Mastered · via quiz" when
 *     the node was passed via quiz (D-14 panel surfacing).
 *   - currentSource read from store sourceMap alongside currentState (Phase 6 sourceMap slice).
 *
 * Content loads via TanStack Query (`nodeContentQueryOptions`) — static
 * allNodes lookup with staleTime: Infinity. Loading and error states are
 * unexported helper sub-components following the MobileNodeList pattern.
 *
 * Security: the `a` component in `mdxComponents` applies an http(s)-only URL
 * allowlist (T-3-01 mitigation, ASVS V5, Pitfall 5 from 03-RESEARCH.md).
 * javascript:/data: URLs are rendered as plain text, never as anchors.
 *
 * Must render inside a <ClientOnly> boundary — MDXContent evaluates compiled
 * JS client-side (Pitfall 4 from 03-RESEARCH.md). Never mount this component
 * during SSR.
 *
 * Does NOT surface meta_volatile / last_reviewed / patch_context (D-15;
 * staleness UI is deferred to Phase 9).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MDXContent } from "@content-collections/mdx/react";
import { X } from "lucide-react";
import { allNodes } from "content-collections";
import { useShallow } from "zustand/shallow";
import { motion, AnimatePresence } from "motion/react";
import { nodeContentQueryOptions } from "#/lib/node-content-query";
import { useGraphStore } from "#/lib/graph-store";
import { CitationList } from "./CitationList";
import { MasteryBadge } from "./MasteryBadge";
import { MasteryControls } from "./MasteryControls";
import { ProWisdomCallout } from "./ProWisdomCallout";
import { PrerequisiteChips } from "./PrerequisiteChips";
import { QuizCTA } from "./quiz/QuizCTA";
import { QuizTakeover } from "./quiz/QuizTakeover";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NodePanelContentProps {
  /** ID of the selected node whose content to load and display. */
  nodeId: string;
  /** Called when the user activates any dismiss affordance in this component. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// URL security helper (T-3-01, ASVS V5, Pitfall 5)
// ---------------------------------------------------------------------------

/**
 * Returns true only when the URL protocol is http or https.
 * Blocks javascript:/data: and any other non-web protocol from becoming a link.
 * url?.startsWith(...) returns boolean | undefined; === true coerces undefined → false.
 */
function isSafeUrl(url?: string): boolean {
  return url?.startsWith("http://") === true || url?.startsWith("https://") === true;
}

// ---------------------------------------------------------------------------
// MDX custom component map — security-hardened anchor
// ---------------------------------------------------------------------------

/**
 * Custom MDX components. The `a` renderer validates the href protocol before
 * emitting an anchor — blocks XSS via javascript:/data: URL injection (T-3-01).
 *
 * Defined at module scope (stable reference — no re-creation on render).
 */
const mdxComponents = {
  a: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!isSafeUrl(href)) {
      // Render as plain text; never a clickable anchor (T-3-01 mitigation).
      return <span>{children}</span>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--color-rune-400)",
          textDecoration: "underline",
          textDecorationColor: "var(--color-rune-600)",
          textUnderlineOffset: "2px",
        }}
        {...rest}
      >
        {children}
      </a>
    );
  },
};

// ---------------------------------------------------------------------------
// Static nodeTitles lookup — powers PrerequisiteChips labels (D-14)
// ---------------------------------------------------------------------------

/**
 * Module-scope lookup map: nodeId → title.
 * Built once from the static allNodes bundle — no per-render cost.
 * Used to label PrerequisiteChips with human-readable titles.
 */
const _ALL_NODE_TITLES = new Map<string, string>(
  allNodes.map((n) => [n.id, n.title])
);

function buildNodeTitles(ids: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const id of ids) {
    const title = _ALL_NODE_TITLES.get(id);
    if (title !== undefined) result[id] = title;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helper sub-components (unexported — MobileNodeList pattern)
// ---------------------------------------------------------------------------

/** Pulsing skeleton shown while the node content query is loading. */
function PanelLoadingSkeleton() {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Varying-width bars simulate heading + paragraphs */}
      {[75, 100, 60, 90, 45].map((widthPct, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height: i === 0 ? "20px" : "14px",
            width: `${widthPct}%`,
            backgroundColor: "var(--color-obsidian-700)",
            borderRadius: "4px",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Error state shown when the node content query rejects (e.g. unknown node ID).
 * Displays a brief message; the user can dismiss the panel via the close control.
 */
function PanelErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--color-rune-400)",
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        Unable to load content
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
          lineHeight: 1.5,
          opacity: 0.6,
          margin: 0,
          wordBreak: "break-word",
        }}
      >
        {message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NodePanelContent — named export
// ---------------------------------------------------------------------------

/**
 * Renders the full content for the node identified by `nodeId`.
 *
 * D-12 practical-first ordering: "How to Apply" is visually prominent and
 * appears BEFORE the conceptual body — players see the actionable guidance
 * first, theory second. This is the project's core content value proposition.
 *
 * D-15: meta_volatile / last_reviewed / patch_context are intentionally absent
 * — staleness UI is deferred to Phase 9.
 *
 * D-14: PrerequisiteChips are rendered at the bottom of the panel. Activating
 * a chip calls setSelectedNode(prereqId) via the graph store, swapping panel
 * content to the selected prerequisite without closing/reopening the panel.
 */
export function NodePanelContent({ nodeId, onClose }: NodePanelContentProps) {
  const {
    data: node,
    isLoading,
    error,
  } = useQuery(nodeContentQueryOptions(nodeId));

  const currentState = useGraphStore(
    useShallow((s) => s.masteryMap[nodeId] ?? "untouched")
  );

  // Phase 6: read mastery source for MasteryBadge label + QuizCTA label (D-14).
  // useShallow: sourceMap is a Record — same pitfall as masteryMap (05-RESEARCH.md Pitfall 2).
  const currentSource = useGraphStore(
    useShallow((s) => s.sourceMap[nodeId])
  );

  // Phase 6: local quiz-open state — drives the AnimatePresence body swap (D-09).
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-obsidian-900)",
      }}
    >
      {/* -------------------------------------------------------------- */}
      {/* Panel header — node title + mastery badge + close button        */}
      {/* -------------------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-obsidian-700)",
          flexShrink: 0,
          minHeight: "56px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: "8px",
          }}
        >
          {node?.title ?? ""}
        </span>

        {/* Phase 6: mastery badge in panel header — shows "Mastered · via quiz"
            when source === "quiz" (D-14). MasteryBadge returns null for "untouched"
            so no extra space is taken when the node has no progress record. */}
        <div style={{ flexShrink: 0, marginRight: "8px" }}>
          <MasteryBadge state={currentState} source={currentSource} />
        </div>

        {/* Close control — invokes onClose (D-02 dismiss path) */}
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            flexShrink: 0,
            background: "none",
            border: "1px solid transparent",
            cursor: "pointer",
            color: "inherit",
            opacity: 0.55,
            borderRadius: "6px",
            padding: 0,
            transition: "opacity 0.15s ease, border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.borderColor = "var(--color-obsidian-600)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.55";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Panel body — scrollable content area                           */}
      {/* -------------------------------------------------------------- */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Loading state */}
        {isLoading && <PanelLoadingSkeleton />}

        {/* Error state */}
        {error && (
          <PanelErrorState
            message={
              error instanceof Error
                ? error.message
                : "Unknown error loading node content."
            }
          />
        )}

        {/* Success state — D-12 practical-first content order.
            Phase 6: AnimatePresence body swap — when quizOpen the panel body is
            REPLACED by QuizTakeover so node prose/citations are NOT readable
            during answering (D-09 active recall, T-06-20 mitigation). */}
        {node && (
          <AnimatePresence mode="wait">
            {quizOpen && node.quiz ? (
              /* Quiz variant: takeover replaces the full body (D-09) */
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ padding: "20px" }}
              >
                <QuizTakeover
                  quiz={node.quiz}
                  nodeId={nodeId}
                  onClose={() => setQuizOpen(false)}
                />
              </motion.div>
            ) : (
              /* Content variant: normal learning content + CTA */
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {/* 0. D-01: MasteryControls — FIRST CHILD, above How to Apply */}
                  <MasteryControls nodeId={nodeId} currentState={currentState} />

                  {/* Phase 6: QuizCTA — grouped with MasteryControls (D-11).
                      Self-gates: returns null for MECHANIC nodes and CONCEPTUAL
                      nodes without a quiz (D-04, criterion 1, T-06-21 mitigation).
                      Placed after MasteryControls, before How to Apply section. */}
                  <QuizCTA
                    nodeId={nodeId}
                    nodeType={node.nodeType}
                    hasQuiz={!!node.quiz}
                    currentState={currentState}
                    currentSource={currentSource}
                    onStart={() => setQuizOpen(true)}
                  />

                  {/* 1. D-12: "How to Apply" — PINNED TOP (practical-first) */}
                  <section
                    aria-label="How to apply in your next game"
                    style={{
                      backgroundColor: "var(--color-obsidian-800)",
                      border: "1px solid var(--color-obsidian-600)",
                      borderLeft: "3px solid var(--color-rune-400)",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-rune-400)",
                        margin: "0 0 12px 0",
                      }}
                    >
                      How to Apply in Your Next Game
                    </h3>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        lineHeight: 1.65,
                      }}
                    >
                      <MDXContent
                        code={node.mdxHowToApply}
                        components={mdxComponents}
                      />
                    </div>
                  </section>

                  {/* 2. Conceptual body (MDX prose) */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      lineHeight: 1.65,
                    }}
                  >
                    <MDXContent code={node.mdx} components={mdxComponents} />
                  </div>

                  {/* 3. Pro Wisdom callout (creator citations, CONT-03) */}
                  <ProWisdomCallout citations={node.citations} />

                  {/* 4. Numbered science references (CONT-01) */}
                  <CitationList citations={node.citations} />

                  {/* 5. Prerequisite chips — D-14 in-panel navigation */}
                  {node.prerequisites.length > 0 && (
                    <div
                      style={{
                        borderTop: "1px solid var(--color-obsidian-700)",
                        paddingTop: "16px",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "11px",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          opacity: 0.5,
                          margin: "0 0 10px 0",
                        }}
                      >
                        Prerequisites
                      </p>
                      <PrerequisiteChips
                        prerequisites={node.prerequisites}
                        nodeTitles={buildNodeTitles(node.prerequisites)}
                      />
                    </div>
                  )}

                  {/* Bottom breathing room */}
                  <div style={{ paddingBottom: "8px" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
