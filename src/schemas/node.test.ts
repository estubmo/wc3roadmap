// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for NodeSummarySchema and NodeFrontmatterSchema (DATA-01 through DATA-05).
 *
 * Test-first (TDD RED phase): these tests drive the shape of src/schemas/node.ts.
 */
import { describe, it, expect } from "vitest";
import {
  NodeSummarySchema,
  NodeFrontmatterSchema,
  // CitationSchema is exported after plan 03-02 adds the kind discriminator.
  // Until then this import is undefined → the CitationSchema describe blocks below
  // are RED. Existing NodeSummarySchema / NodeFrontmatterSchema tests are unaffected.
  CitationSchema,
  QuizSchema,
} from "./node";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid NodeSummary — graph-display fields only (DATA-02). */
const validSummary = {
  id: "supply-management",
  title: "Supply Management",
  nodeType: "MECHANIC",
  race: "agnostic",
  prerequisites: [],
};

/** Full valid NodeFrontmatter (all required fields present). */
const validFrontmatter = {
  ...validSummary,
  skillType: "macro",
  difficulty: "beginner",
  tags: ["economy", "fundamentals"],
  patchId: "patch-1.36.2",
  patch_context: "Supply limit unchanged in this patch; timing windows are current.",
  last_reviewed: "2026-06-28",
  meta_volatile: false,
  citations: [
    {
      kind: "science" as const,
      source: "Ericsson (1993) – Deliberate Practice",
      url: "https://example.com/paper",
      applicationNote:
        "Deliberate practice principles apply directly to repetitive supply-management drills.",
    },
  ],
};

// ---------------------------------------------------------------------------
// NodeSummarySchema
// ---------------------------------------------------------------------------

describe("NodeSummarySchema", () => {
  it("accepts a valid NodeSummary object", () => {
    const result = NodeSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it("accepts all five race values", () => {
    const races = ["agnostic", "human", "orc", "undead", "nightelf"] as const;
    for (const race of races) {
      const result = NodeSummarySchema.safeParse({ ...validSummary, race });
      expect(result.success, `race "${race}" should be accepted`).toBe(true);
    }
  });

  it("accepts both nodeType values", () => {
    expect(NodeSummarySchema.safeParse({ ...validSummary, nodeType: "MECHANIC" }).success).toBe(true);
    expect(NodeSummarySchema.safeParse({ ...validSummary, nodeType: "CONCEPTUAL" }).success).toBe(true);
  });

  it("rejects an invalid nodeType (DATA-01)", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, nodeType: "mechanical" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string nodeType", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, nodeType: "" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty prerequisites array (DATA-05)", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, prerequisites: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a prerequisites array with node-id strings (DATA-05)", () => {
    const result = NodeSummarySchema.safeParse({
      ...validSummary,
      prerequisites: ["map-control", "creep-jacking"],
    });
    expect(result.success).toBe(true);
  });

  it("contains exactly the graph-display fields: id, title, nodeType, race, prerequisites (DATA-02)", () => {
    // NodeSummary should NOT include content-only fields
    const extraFields = {
      ...validSummary,
      skillType: "macro",         // content-only
      patchId: "patch-1.36.2",   // content-only
      patch_context: "...",       // content-only
    };
    // NodeSummarySchema strips unknown keys — parse should succeed but drop extras
    const result = NodeSummarySchema.safeParse(extraFields);
    expect(result.success).toBe(true);
    if (result.success) {
      // The inferred type should not have these fields
      const keys = Object.keys(result.data);
      expect(keys).toEqual(
        expect.arrayContaining(["id", "title", "nodeType", "race", "prerequisites"])
      );
    }
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — acceptance
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — acceptance", () => {
  it("accepts a fully valid NodeFrontmatter object", () => {
    const result = NodeFrontmatterSchema.safeParse(validFrontmatter);
    expect(result.success).toBe(true);
  });

  it("accepts nodeType CONCEPTUAL", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "CONCEPTUAL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid skillType values", () => {
    for (const skillType of ["macro", "micro", "mental"] as const) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, skillType });
      expect(result.success, `skillType "${skillType}" should be accepted`).toBe(true);
    }
  });

  it("accepts all valid difficulty values", () => {
    for (const difficulty of ["beginner", "intermediate", "advanced"] as const) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, difficulty });
      expect(result.success, `difficulty "${difficulty}" should be accepted`).toBe(true);
    }
  });

  it("accepts all registry patchId values", () => {
    for (const patchId of ["patch-1.36.1", "patch-1.36.2"]) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, patchId });
      expect(result.success, `patchId "${patchId}" should be accepted`).toBe(true);
    }
  });

  it("accepts an empty tags array", () => {
    const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, tags: [] });
    expect(result.success).toBe(true);
  });

  it("accepts citations without a url (url is optional)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          kind: "science" as const,
          source: "Ericsson (1993)",
          applicationNote: "Relevant to drilling WC3 mechanics systematically.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts meta_volatile = true", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      meta_volatile: true,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: nodeType (DATA-01)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — nodeType rejection (DATA-01)", () => {
  it("rejects nodeType 'mechanical' (wrong case/spelling)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "mechanical",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'conceptual' (lowercase)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "conceptual",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'STRATEGY' (invented value)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "STRATEGY",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: required content fields (DATA-03)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — required content field rejection (DATA-03)", () => {
  it("rejects when patch_context is absent", () => {
    const { patch_context: _, ...withoutPatchContext } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutPatchContext);
    expect(result.success).toBe(false);
  });

  it("rejects when patch_context is an empty string", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patch_context: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when last_reviewed is absent", () => {
    const { last_reviewed: _, ...withoutLastReviewed } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutLastReviewed);
    expect(result.success).toBe(false);
  });

  it("rejects when meta_volatile is absent", () => {
    const { meta_volatile: _, ...withoutMetaVolatile } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutMetaVolatile);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: last_reviewed date format
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — last_reviewed date format", () => {
  it("rejects a datetime string (ISO 8601 with time)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2026-06-28T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-date string", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "yesterday",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a date with slashes", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2026/06/28",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid YYYY-MM-DD date", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2025-01-15",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: patchId registry validation (DATA-04)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — patchId registry validation (DATA-04)", () => {
  it("rejects an unknown patchId", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patchId: "patch-99.99.99",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string patchId", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patchId: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: citation applicationNote
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — citation applicationNote", () => {
  it("rejects a citation missing applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          kind: "science" as const,
          source: "Some Paper",
          url: "https://example.com",
          // applicationNote intentionally omitted
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a citation with an empty applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          kind: "science" as const,
          source: "Some Paper",
          applicationNote: "",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a citation with a non-empty applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          kind: "science" as const,
          source: "Some Paper",
          applicationNote: "Directly relevant to WC3 practice methods.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CitationSchema — kind discriminator (D-07, CONT-01, CONT-03) — Wave 0 RED
//
// CitationSchema is exported from node.ts after plan 03-02 replaces the flat
// CitationSchema with z.discriminatedUnion("kind", [science, creator]).
// Until plan 03-02 lands, CitationSchema is undefined here → RED.
// ---------------------------------------------------------------------------

describe("CitationSchema — kind: science (CONT-01)", () => {
  it("accepts a valid science citation with required fields", () => {
    const result = CitationSchema.safeParse({
      kind: "science",
      source: "Ericsson (1993) — Deliberate Practice",
      applicationNote: "Deliberate practice applies to WC3 drills.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a science citation with an optional url", () => {
    const result = CitationSchema.safeParse({
      kind: "science",
      source: "Mikkelsen et al. (2009)",
      url: "https://example.com/paper",
      applicationNote: "Motor learning research supports micro-practice.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a science citation missing applicationNote", () => {
    const result = CitationSchema.safeParse({
      kind: "science",
      source: "Some Paper",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a science citation with an empty applicationNote", () => {
    const result = CitationSchema.safeParse({
      kind: "science",
      source: "Some Paper",
      applicationNote: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("CitationSchema — kind: creator (CONT-03)", () => {
  it("accepts a valid creator citation without a quote", () => {
    const result = CitationSchema.safeParse({
      kind: "creator",
      source: "Grubby (YouTube)",
      applicationNote: "Grubby demonstrates map control in every high-level game.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a creator citation with an optional quote", () => {
    const result = CitationSchema.safeParse({
      kind: "creator",
      source: "Grubby (YouTube)",
      url: "https://www.youtube.com/c/Grubby",
      applicationNote: "Map control is the largest skill gap.",
      quote: "Map control — specifically denying opponent creeping routes — is the single largest skill gap.",
    });
    expect(result.success).toBe(true);
  });

  it("quote is optional on the creator branch (omitting it still passes)", () => {
    const withQuote = CitationSchema.safeParse({
      kind: "creator",
      source: "TempO",
      applicationNote: "High APM enables faster scouting responses.",
      quote: "APM is a proxy for decision speed, not just mechanics.",
    });
    const withoutQuote = CitationSchema.safeParse({
      kind: "creator",
      source: "TempO",
      applicationNote: "High APM enables faster scouting responses.",
    });
    expect(withQuote.success).toBe(true);
    expect(withoutQuote.success).toBe(true);
  });

  it("rejects a creator citation missing applicationNote", () => {
    const result = CitationSchema.safeParse({
      kind: "creator",
      source: "Grubby (YouTube)",
    });
    expect(result.success).toBe(false);
  });
});

describe("CitationSchema — kind discriminator rejection (D-07)", () => {
  it("rejects a citation with an unknown kind", () => {
    const result = CitationSchema.safeParse({
      kind: "community",
      source: "WC3 forums",
      applicationNote: "Forum wisdom.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a citation with no kind field", () => {
    const result = CitationSchema.safeParse({
      source: "Some source",
      applicationNote: "Some note.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a citation with an empty-string kind", () => {
    const result = CitationSchema.safeParse({
      kind: "",
      source: "Some source",
      applicationNote: "Some note.",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// QuizSchema — QUIZ-01 (count bounds) and QUIZ-03 (structural guardrails)
// ---------------------------------------------------------------------------

/**
 * Shared valid question fixture used across quiz tests.
 * Provides a well-formed 3-option question with exactly one correct answer
 * and a non-empty explanation.
 */
const validQuestion = {
  text: "What is the supply limit in WC3?",
  options: [
    { text: "50", isCorrect: false },
    { text: "100", isCorrect: true },
    { text: "150", isCorrect: false },
  ],
  explanation: "The supply cap in WC3 is 100 food. Exceeding it requires extra supply buildings.",
};

/** Makes n copies of validQuestion for constructing test quizzes. */
function makeQuestions(n: number) {
  return Array.from({ length: n }, () => ({ ...validQuestion }));
}

describe("QuizSchema — QUIZ-01 count bounds", () => {
  it("accepts a valid 3-question quiz", () => {
    const result = QuizSchema.safeParse(makeQuestions(3));
    expect(result.success).toBe(true);
  });

  it("accepts a valid 4-question quiz", () => {
    const result = QuizSchema.safeParse(makeQuestions(4));
    expect(result.success).toBe(true);
  });

  it("accepts a valid 5-question quiz", () => {
    const result = QuizSchema.safeParse(makeQuestions(5));
    expect(result.success).toBe(true);
  });

  it("rejects a 2-question quiz (below minimum of 3) (QUIZ-01)", () => {
    const result = QuizSchema.safeParse(makeQuestions(2));
    expect(result.success).toBe(false);
  });

  it("rejects a 6-question quiz (above maximum of 5) (QUIZ-01)", () => {
    const result = QuizSchema.safeParse(makeQuestions(6));
    expect(result.success).toBe(false);
  });

  it("rejects an empty quiz (0 questions)", () => {
    const result = QuizSchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

describe("QuizSchema — QUIZ-03 exactly-one-correct guardrail", () => {
  it("rejects a question with zero correct options (QUIZ-03)", () => {
    const badQuestion = {
      ...validQuestion,
      options: [
        { text: "50", isCorrect: false },
        { text: "100", isCorrect: false },
        { text: "150", isCorrect: false },
      ],
    };
    const result = QuizSchema.safeParse([badQuestion, validQuestion, validQuestion]);
    expect(result.success).toBe(false);
  });

  it("rejects a question with two correct options (QUIZ-03)", () => {
    const badQuestion = {
      ...validQuestion,
      options: [
        { text: "50", isCorrect: true },
        { text: "100", isCorrect: true },
        { text: "150", isCorrect: false },
      ],
    };
    const result = QuizSchema.safeParse([badQuestion, validQuestion, validQuestion]);
    expect(result.success).toBe(false);
  });
});

describe("QuizSchema — QUIZ-03 explanation required guardrail", () => {
  it("rejects a question with a missing explanation (QUIZ-03)", () => {
    const { explanation: _, ...missingExplanation } = validQuestion;
    const result = QuizSchema.safeParse([missingExplanation, validQuestion, validQuestion]);
    expect(result.success).toBe(false);
  });

  it("rejects a question with an empty explanation (QUIZ-03)", () => {
    const badQuestion = { ...validQuestion, explanation: "" };
    const result = QuizSchema.safeParse([badQuestion, validQuestion, validQuestion]);
    expect(result.success).toBe(false);
  });
});

describe("NodeFrontmatterSchema — D-04 graceful default (quiz omitted)", () => {
  it("accepts a CONCEPTUAL node with quiz field omitted (D-04)", () => {
    // quiz is optional — nodes without quiz content still validate and show no CTA
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "CONCEPTUAL",
      // quiz intentionally absent
    });
    expect(result.success).toBe(true);
  });

  it("accepts a CONCEPTUAL node with a valid 3-question quiz", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "CONCEPTUAL",
      quiz: makeQuestions(3),
    });
    expect(result.success).toBe(true);
  });
});
