// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * ProWisdomCallout — distinct named creator quote card with applicationNote.
 *
 * Renders each WC3 creator / community wisdom citation as a visually distinct
 * card callout (D-05). The creator's name is PROMINENT — display font, weight 600,
 * rune-gold — never buried in a footnote. The optional direct quote renders in
 * italic body text; the applicationNote renders as smaller muted text (D-06,
 * every citation visibly earns its place).
 *
 * Visually separate from the numbered science reference list (CitationList) —
 * different surface (obsidian-800 card + rune-500 left accent) and different
 * typographic voice (display name vs mono index).
 *
 * Security: citation URLs are only rendered as anchors when the protocol is
 * http:// or https:// (ASVS V5, Pitfall 5). javascript:/data: URLs render as
 * plain text, never as clickable anchors.
 *
 * Renders nothing when there are zero creator citations.
 */

import type { Citation, CreatorCitation } from "#/schemas/node";

interface ProWisdomCalloutProps {
  citations: Citation[];
}

/**
 * Returns true only when the URL protocol is http or https.
 * Blocks javascript:/data: and any other non-web protocol from becoming a link.
 * url?.startsWith(...) returns boolean | undefined; === true coerces undefined → false.
 */
function isSafeUrl(url?: string): boolean {
  return url?.startsWith("http://") === true || url?.startsWith("https://") === true;
}

/**
 * Named export — renders a "Pro Wisdom" section with one card per creator citation.
 * Returns null when there are no creator citations in the provided array.
 */
export function ProWisdomCallout({ citations }: ProWisdomCalloutProps) {
  const creatorCitations = citations.filter(
    (c): c is CreatorCitation => c.kind === "creator"
  );

  if (creatorCitations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Pro Wisdom"
      style={{
        marginTop: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Section label — uppercase, muted, display font */}
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.5,
          margin: 0,
        }}
      >
        Pro Wisdom
      </h3>

      {creatorCitations.map((citation, index) => (
        <div
          key={`creator-${index}`}
          style={{
            backgroundColor: "var(--color-obsidian-800)",
            border: "1px solid var(--color-obsidian-600)",
            borderLeft: "3px solid var(--color-rune-500)",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Creator name — PROMINENT: display font, weight 600, rune-gold (D-05) */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-rune-400)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {isSafeUrl(citation.url) ? (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "underline",
                  textDecorationColor: "var(--color-rune-600)",
                  textUnderlineOffset: "2px",
                }}
              >
                {citation.source}
              </a>
            ) : (
              citation.source
            )}
          </p>

          {/* Optional direct pull-quote — italic body text (D-05) */}
          {citation.quote != null && (
            <blockquote
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                fontStyle: "italic",
                lineHeight: 1.6,
                margin: 0,
                opacity: 0.9,
                borderLeft: "none",
                padding: 0,
              }}
            >
              &ldquo;{citation.quote}&rdquo;
            </blockquote>
          )}

          {/* applicationNote — bridges creator wisdom to WC3 application (D-03/D-06) */}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              lineHeight: 1.55,
              opacity: 0.6,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {citation.applicationNote}
          </p>
        </div>
      ))}
    </section>
  );
}
