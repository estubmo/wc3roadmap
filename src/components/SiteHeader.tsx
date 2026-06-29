// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * SiteHeader — fixed 48px banner composing the auth UI layer (AUTH-01, AUTH-02).
 *
 * Structure:
 *   <header role="banner"> — fixed overlay, z-50, obsidian-900 bg
 *     Left region:  empty (future: app wordmark)
 *     Right region: <SignInButton> (signed-out) | <UserDropdown> (signed-in)
 *                   | nothing (pending — avoids flash of CTA on refresh)
 *
 * Session state is derived from useSession() (cookie-based, SSR-safe).
 * While session is pending, the right slot renders nothing so a refreshed
 * signed-in user does not momentarily see the gold CTA (T-04-06b mitigation).
 *
 * OAuth error: renders an inline message per UI-SPEC §"OAuth Error Handling".
 * Sign-in is always additive (D-03) — the app remains usable signed-out.
 *
 * Open-state ownership: SiteHeader owns the RegionSelector open state
 * (`regionOpen`) and passes the callback to SignInButton. This keeps
 * SignInButton and RegionSelector decoupled from each other.
 */

import { useState } from "react";
import { useSession } from "#/lib/auth-client";
import { SignInButton } from "#/components/auth/SignInButton";
import { RegionSelector } from "#/components/auth/RegionSelector";
import { UserDropdown } from "#/components/auth/UserDropdown";

// ---------------------------------------------------------------------------
// SiteHeader — named export
// ---------------------------------------------------------------------------

/**
 * Fixed top header composing the auth entry points (D-01/D-02/D-03).
 *
 * Mount inside the QueryClientProvider in __root.tsx, above {children}.
 * The {children} wrapper must add padding-top: 48px so content clears this bar.
 */
export function SiteHeader() {
  const { data: session, isPending, error } = useSession();
  const [regionOpen, setRegionOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Determine right-region content
  // ---------------------------------------------------------------------------

  let rightContent: React.ReactNode;

  if (isPending) {
    // Suppress the CTA while session resolves from the cookie to prevent a
    // flash of signed-out state on browser refresh (T-04-06b / AUTH-02).
    rightContent = null;
  } else if (error) {
    // OAuth error or session fetch failure — show inline non-blocking message.
    rightContent = (
      <span
        aria-live="polite"
        style={{
          fontSize: "14px",
          fontWeight: 400,
          color: "#e9e8ee",
          fontFamily: "var(--font-sans)",
        }}
      >
        Sign-in failed — check your connection and try again.
      </span>
    );
  } else if (session) {
    rightContent = <UserDropdown />;
  } else {
    rightContent = (
      <SignInButton onOpenRegion={() => setRegionOpen(true)} />
    );
  }

  return (
    <>
      {/* Fixed header bar */}
      <header
        role="banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "48px",
          zIndex: 50,
          backgroundColor: "var(--color-obsidian-900)",
          borderBottom: "1px solid var(--color-obsidian-600)",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {/* Left region — reserved for future wordmark */}
        <div style={{ flex: 1 }} />

        {/* Right region — auth slot */}
        <div>{rightContent}</div>
      </header>

      {/* Region selector dialog — owned by SiteHeader (decoupled from SignInButton) */}
      <RegionSelector open={regionOpen} onOpenChange={setRegionOpen} />
    </>
  );
}
