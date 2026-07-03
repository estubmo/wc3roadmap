// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * NotFoundPage — branded 404 rendered by the root route's notFoundComponent
 * for unknown URLs (Launch Polish D-16, PATH-03).
 *
 * Layout clones the index.tsx EmptyState centered-column convention: inline
 * styles + CSS variables only (no hardcoded hex). Heading reuses the locked
 * 22px/600 Space Grotesk pathway-heading role (UI-SPEC §Typography 404 fix);
 * body is the 14px/400/1.65 Outfit panel-body convention at opacity 0.7.
 *
 * The CTA reuses the gold-accent treatment from the SignInButton family
 * (rune-500 fill / obsidian-950 text) but uses TanStack Router's <Link> to "/"
 * so navigation stays client-side.
 */

import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

// ---------------------------------------------------------------------------
// NotFoundPage — named export wired as notFoundComponent in __root.tsx
// ---------------------------------------------------------------------------

export function NotFoundPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: "100dvh",
        gap: "16px",
        paddingTop: "64px",
        backgroundColor: "var(--color-obsidian-950)",
        paddingInline: "32px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 600,
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: "14px",
          fontWeight: 400,
          lineHeight: 1.65,
          opacity: 0.7,
          margin: 0,
          maxWidth: "480px",
        }}
      >
        This node doesn&apos;t exist on the map.
      </p>
      {/* Gold-CTA treatment matching the SignInButton family (rune-500 fill /
          obsidian-950 text). asChild delegates rendering to the Router Link so
          the button styling wraps a client-side navigation to "/". */}
      <Button
        asChild
        size="lg"
        className="bg-[var(--color-rune-500)] text-[var(--color-obsidian-950)] text-base font-semibold hover:bg-[var(--color-rune-400)] focus-visible:ring-[var(--color-rune-400)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Link to="/">Back to the roadmap</Link>
      </Button>
    </main>
  );
}
