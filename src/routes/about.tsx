// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * About / Privacy route (D-16 launch polish).
 *
 * A deliberately minimal, honest static page — not a marketing site. States the
 * project mission (PROJECT.md core value), the GPL-3.0-or-later openness
 * commitment (ADR 004), and a one-line privacy statement naming exactly what is
 * stored (BattleTag + per-node progress records; no third-party trackers).
 *
 * Metadata: a per-route head() override supplies an about-specific title and
 * og:title / og:description (property: keys, per UI-SPEC §Page Metadata),
 * overriding the root route's defaults on this page only.
 *
 * Typography reuses the locked Phase 2 type scale (UI-SPEC §Typography):
 *   - h1  → 22px/600 Space Grotesk (pathway-heading role)
 *   - h2  → 15px/600 Outfit (node-title role)
 *   - body → 14px/400/1.65 Outfit (panel body-prose role)
 * Links reuse the MDX anchor convention from NodePanelContent.tsx
 * (color rune-400, underline rune-600). No hardcoded hex — CSS variables only.
 */

import { createFileRoute, Link } from "@tanstack/react-router";

const LICENSE_URL = "https://github.com/estubmo/wc3roadmap/blob/main/LICENSE";

// Shared anchor style — mirrors the MDX anchor convention in NodePanelContent.tsx.
const linkStyle: React.CSSProperties = {
  color: "var(--color-rune-400)",
  textDecoration: "underline",
  textDecorationColor: "var(--color-rune-600)",
  textUnderlineOffset: "2px",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: 1.65,
  margin: 0,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: 1.25,
  margin: 0,
};

export const Route = createFileRoute("/about")({
  // Per-route metadata override — about-specific title + OG share tags.
  // property: keys for Open Graph (UI-SPEC §Page Metadata); static strings,
  // no reflected input (threat T-09-06 accepted — privacy copy is accurate,
  // no over-claim beyond the Phase 4/5 data model).
  head: () => ({
    meta: [
      {
        title: "About — WC3 Learning Roadmap",
      },
      {
        property: "og:title",
        content: "About — WC3 Learning Roadmap",
      },
      {
        property: "og:description",
        content:
          "What WC3 Learning Roadmap is, why it's open source under GPL-3.0, and exactly what data it stores.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-obsidian-950)",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
        }}
      >
        {/* Page heading — 22px/600 Space Grotesk (pathway-heading role). */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 600,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          About WC3 Learning Roadmap
        </h1>

        {/* Mission — distilled from PROJECT.md core value. */}
        <p style={bodyStyle}>
          WC3 Learning Roadmap is a free, science-backed learning path for
          Warcraft III. It presents an interactive node graph of RTS
          fundamentals — each concept backed by real citations from motor
          learning, deliberate practice, and competitive psychology, plus
          distilled wisdom from the most recognized WC3 players and creators.
          The learning content is the point: it&rsquo;s meant to genuinely make
          people better at the game, and the guidance stands on its own even if
          every integration around it failed.
        </p>

        {/* Open source section. */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={sectionHeadingStyle}>Open source</h2>
          <p style={bodyStyle}>
            This project is free and open source under{" "}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              GPL-3.0-or-later
            </a>
            . No paywalls — the code and the learning content are public. The
            copyleft license keeps every derivative open too.
          </p>
        </section>

        {/* Privacy section — one-line honest statement of what is stored. */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={sectionHeadingStyle}>Privacy</h2>
          <p style={bodyStyle}>
            When you sign in, we store only your Battle.net BattleTag and your
            per-node progress records. There are no third-party trackers and no
            advertising.
          </p>
        </section>

        {/* Link home. */}
        <p style={bodyStyle}>
          <Link to="/" style={linkStyle}>
            &larr; Back to the roadmap
          </Link>
        </p>
      </div>
    </main>
  );
}
