// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * CitationList — numbered science references with applicationNote.
 *
 * Renders a "References" section containing peer-reviewed / academic citations
 * as a numbered list. Each entry shows the [n] index, source (linked when safe),
 * and the applicationNote explaining why this source supports the node's claim
 * (D-04/D-06 — every citation visibly earns its place).
 *
 * Numbering derives from the filtered array position — no React state for
 * indices (CONT-01, key_links).
 *
 * Security: citation URLs are only rendered as anchors when the protocol is
 * http:// or https:// (ASVS V5, Pitfall 5). javascript:/data: URLs render as
 * plain text, never as clickable anchors.
 *
 * Renders nothing when there are zero science citations.
 */

import type { Citation, ScienceCitation } from "#/schemas/node";

interface CitationListProps {
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
 * Named export — renders a numbered "References" list for all science citations.
 * Returns null when there are no science citations in the provided array.
 */
export function CitationList({ citations }: CitationListProps) {
  const scienceCitations = citations.filter(
    (c): c is ScienceCitation => c.kind === "science"
  );

  if (scienceCitations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="References"
      style={{
        marginTop: "24px",
        paddingTop: "16px",
        borderTop: "1px solid var(--color-obsidian-700)",
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
          margin: "0 0 12px 0",
        }}
      >
        References
      </h3>

      {/* Numbered list — indices derive from filtered array position, no useState */}
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {scienceCitations.map((citation, index) => (
          <li
            key={`science-${index}`}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            {/* [n] index — mono font per ADR 0001; rune-gold for accent */}
            <span
              aria-label={`Reference ${index + 1}`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--color-rune-400)",
                fontWeight: 400,
                flexShrink: 0,
                marginTop: "2px",
                minWidth: "26px",
                lineHeight: 1.4,
              }}
            >
              [{index + 1}]
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                minWidth: 0,
                flex: 1,
              }}
            >
              {/* Source — linked only when http(s) safe; plain text otherwise */}
              {isSafeUrl(citation.url) ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-rune-400)",
                    textDecoration: "underline",
                    textDecorationColor: "var(--color-rune-600)",
                    textUnderlineOffset: "2px",
                    wordBreak: "break-word",
                  }}
                >
                  {citation.source}
                </a>
              ) : (
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-rune-400)",
                    wordBreak: "break-word",
                  }}
                >
                  {citation.source}
                </span>
              )}

              {/* applicationNote — bridges source to WC3 application (D-03/D-06) */}
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  lineHeight: 1.55,
                  opacity: 0.65,
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {citation.applicationNote}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
