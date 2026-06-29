// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Node content query options factory — lazy per-node content loading.
 *
 * Deep module: single export (nodeContentQueryOptions) wrapping a synchronous
 * allNodes lookup behind the TanStack Query options interface. The panel imports
 * only this factory — no direct allNodes access outside this module.
 *
 * ADR-002: content loads lazily per node; no full-page reload.
 * GRAPH-03: panel fetches only the selected node's full content.
 */

import { queryOptions } from "@tanstack/react-query";
import { allNodes } from "content-collections";
import type { NodeFrontmatter } from "#/schemas/node";

/**
 * Full node content type including the transform-added MDX fields from plan 03-02.
 * The content-collections transform compiles body and How-to-Apply sections
 * separately — these fields are present on runtime allNodes entries but are not
 * part of NodeFrontmatterSchema (build-time only, not Zod-parsed at runtime).
 */
export type NodeFrontmatterWithMDX = NodeFrontmatter & {
  /** Compiled MDX string for the main learning body. */
  mdx: string;
  /** Compiled MDX string for the "## How to Apply" section (D-13, plan 03-02). */
  mdxHowToApply: string;
};

/**
 * TanStack Query options factory for lazy per-node content loading (GRAPH-03, D-02).
 *
 * - enabled: false when nodeId is null — no query runs until a node is clicked.
 * - queryKey: ["node-content", nodeId] — stable per-node cache key.
 * - queryFn: synchronous allNodes lookup — no network round-trip.
 * - staleTime: Infinity — static build-time content never stales.
 *
 * Throws "Node not found: <id>" for unknown ids (T-3-06: surfaced as query error
 * state in the panel rather than returning undefined and rendering a broken panel).
 */
export function nodeContentQueryOptions(nodeId: string | null) {
  return queryOptions({
    queryKey: ["node-content", nodeId] as const,
    enabled: nodeId !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<NodeFrontmatterWithMDX> => {
      const node = (allNodes as unknown as NodeFrontmatterWithMDX[]).find(
        (n) => n.id === nodeId
      );
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      return node;
    },
  });
}
