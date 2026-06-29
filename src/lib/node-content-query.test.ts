// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for nodeContentQueryOptions — TanStack Query options factory for lazy
 * node content loading (GRAPH-03, D-02).
 *
 * Wave 0 RED scaffolds: src/lib/node-content-query.ts does not exist yet.
 * These tests turn GREEN when plan 03-05 creates the production module.
 *
 * Query semantics:
 *   - enabled: false when nodeId is null (prevents unnecessary fetches)
 *   - queryKey: ["node-content", nodeId] — stable per-node cache key
 *   - queryFn: synchronous lookup over allNodes (in-memory); throws if not found
 *   - staleTime: Infinity — static build-time content never stales
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nodeContentQueryOptions } from "#/lib/node-content-query";

// ---------------------------------------------------------------------------
// Mock content-collections — allNodes is generated at build time and is not
// available in the test environment without the build step. The mock provides
// a minimal in-memory substitute covering the cases under test.
// ---------------------------------------------------------------------------
vi.mock("content-collections", () => ({
  allNodes: [
    {
      id: "map-control",
      title: "Map Control",
      nodeType: "MECHANIC",
      race: "agnostic",
      prerequisites: [],
      difficulty: "beginner",
      skillType: "macro",
      tags: ["fundamentals"],
      patchId: "patch-1.36.2",
      patch_context: "Map control principles unchanged.",
      last_reviewed: "2026-06-28",
      meta_volatile: false,
      citations: [],
    },
  ],
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// enabled / disabled state
// ---------------------------------------------------------------------------

describe("nodeContentQueryOptions — enabled state", () => {
  it("enabled is false when nodeId is null", () => {
    const opts = nodeContentQueryOptions(null);
    expect(opts.enabled).toBe(false);
  });

  it("enabled is true when nodeId is a non-null string", () => {
    const opts = nodeContentQueryOptions("map-control");
    expect(opts.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// queryKey shape
// ---------------------------------------------------------------------------

describe("nodeContentQueryOptions — queryKey", () => {
  it("queryKey is ['node-content', nodeId] for a non-null id", () => {
    const opts = nodeContentQueryOptions("map-control");
    expect(opts.queryKey).toEqual(["node-content", "map-control"]);
  });

  it("queryKey is ['node-content', null] for null nodeId", () => {
    const opts = nodeContentQueryOptions(null);
    expect(opts.queryKey).toEqual(["node-content", null]);
  });
});

// ---------------------------------------------------------------------------
// queryFn — found / not-found
// ---------------------------------------------------------------------------

describe("nodeContentQueryOptions — queryFn", () => {
  it("queryFn returns the node object for a known node id", async () => {
    const opts = nodeContentQueryOptions("map-control");
    // queryFn is async; call with a minimal TanStack Query context
    const result = await (opts as unknown as { queryFn: () => unknown }).queryFn();
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("map-control");
  });

  it("queryFn throws for an unknown node id", async () => {
    const opts = nodeContentQueryOptions("completely-unknown-node-xyz");
    await expect(
      () => (opts as unknown as { queryFn: () => unknown }).queryFn()
    ).rejects.toThrow();
  });
});
