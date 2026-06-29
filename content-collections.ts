// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
//
// Content-collections pipeline — defines the nodes collection.
// Schema: per-document Zod v4 validation of MDX frontmatter + body.
// Transform: enforces the required How-to-Apply section (D-03), compiles MDX.
//
// PARALLEL-SCHEMA SYNC NOTE: The node frontmatter shape is intentionally
// defined twice (plan 01-06 decision):
//   1. Here in content-collections.ts — project Zod import, build-time surface.
//   2. In src/schemas/node.ts         — same Zod, runtime/test surface.
// Both definitions MUST stay field-for-field identical. Any change here must
// be mirrored in src/schemas/node.ts (and vice versa).
import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";
import { PATCH_IDS } from "./src/lib/patches";

const nodes = defineCollection({
  name: "nodes",
  directory: "content/nodes",
  include: "**/*.mdx",
  schema: z.object({
    // Explicit content property — avoids the implicit-content deprecation in
    // content-collections 0.15.x. The frontmatter parser populates this with
    // the MDX body (everything after the closing ---).
    content: z.string(),
    // --- Frontmatter fields (mirror NodeFrontmatterSchema in src/schemas/node.ts) ---
    /** Kebab-case unique identifier matching the node's filename. */
    id: z.string().regex(/^[a-z0-9-]+$/, { error: "Node id must be kebab-case" }),
    title: z.string().min(1),
    /** MECHANIC | CONCEPTUAL — locked per CONTEXT.md (DATA-01). */
    nodeType: z.enum(["MECHANIC", "CONCEPTUAL"]),
    skillType: z.enum(["macro", "micro", "mental"]),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    race: z.enum(["agnostic", "human", "orc", "undead", "nightelf"]),
    /** Free-form thematic tags; an empty array is valid. */
    tags: z.array(z.string()).default([]),
    /** Soft prerequisite node IDs; validated for existence in CI (01-07). */
    prerequisites: z.array(z.string()).default([]),
    /** Registry-validated WC3 patch identifier (DATA-04). */
    patchId: z.enum(PATCH_IDS),
    /** Free-text note on patch-relevance of this node's content (DATA-03). */
    patch_context: z.string().min(1, {
      error: "patch_context is required and must not be empty (DATA-03)",
    }),
    /** ISO 8601 date of the last content review against patchId (DATA-03). */
    last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: "last_reviewed must be a YYYY-MM-DD date string (DATA-03)",
    }),
    /** True if this node's content is likely to become stale on patch change (DATA-03). */
    meta_volatile: z.boolean(),
    /**
     * Science + creator citations backing the node's learning claims (D-03, D-07).
     * Discriminated union: kind "science" (peer-reviewed) | "creator" (WC3 coaches/players).
     *
     * PARALLEL-SCHEMA SYNC NOTE: this discriminated union must stay field-for-field
     * identical to CitationSchema in src/schemas/node.ts (plan 03-02 decision).
     * Any change here must be mirrored there, and vice versa.
     */
    citations: z.array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("science"),
          source: z.string().min(1),
          url: z.string().optional(),
          applicationNote: z.string().min(1, {
            error: "Every citation must have a non-empty applicationNote (D-03)",
          }),
        }),
        z.object({
          kind: z.literal("creator"),
          source: z.string().min(1),
          url: z.string().optional(),
          applicationNote: z.string().min(1, {
            error: "Every citation must have a non-empty applicationNote (D-03)",
          }),
          quote: z.string().optional(),
        }),
      ])
    ),
  }),
  transform: async (document, context) => {
    // CONT-02: Enforce the required How-to-Apply section FIRST so CI enforcement
    // fires before any split — a missing heading is a build error regardless of split.
    if (!document.content.includes("## How to Apply")) {
      throw new Error(
        `Node "${document.id}": missing required "## How to Apply" section in MDX body (D-03).` +
          ` Every node must include a "## How to Apply" heading with concrete in-game guidance.`
      );
    }

    // D-13: Split body prose from the "## How to Apply" section.
    // Both chunks are compiled to MDX independently so the panel can pin
    // mdxHowToApply at the top (D-12) while mdx renders the theory below.
    const HOW_TO_APPLY_RE = /^## How to Apply\s*/m;
    const splitIdx = document.content.search(HOW_TO_APPLY_RE);
    const bodyRaw = document.content.slice(0, splitIdx).trim();
    const howToApplyRaw = document.content.slice(splitIdx).trim();

    // Pitfall 2 guard: body must have prose before the ## How to Apply heading.
    if (bodyRaw.length === 0) {
      throw new Error(
        `Node "${document.id}": content body is empty before "## How to Apply".` +
          ` Add introductory prose above the How to Apply section.`
      );
    }

    // Compile body and How-to-Apply section separately.
    // Assumption A1: compileMDX accepts a partial document with only `content` replaced.
    // If A1 fails, fall back to a cloned object (see comment below).
    const mdx = await compileMDX(context, { ...document, content: bodyRaw });
    const mdxHowToApply = await compileMDX(context, { ...document, content: howToApplyRaw });

    return { ...document, mdx, mdxHowToApply };
  },
});

export default defineConfig({ content: [nodes] });
