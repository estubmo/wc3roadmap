// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Client-side auth client — the ONLY auth surface React components may import.
 *
 * This module is safe to import in browser-bundled code: it contains no database
 * adapter, no secrets, and no server-only imports. It communicates with the
 * server via the /api/auth/$ handler over HTTP.
 *
 * ⚠  Do NOT import #/lib/auth (the server-only betterAuth instance) from any
 * React component or client-side module. That module embeds credentials and
 * the Drizzle adapter; importing it in client code exposes secrets.
 *
 * Usage in components:
 *   import { useSession, signIn, signOut } from "#/lib/auth-client";
 */

import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

// ---------------------------------------------------------------------------
// Auth client instance
// ---------------------------------------------------------------------------

/**
 * better-auth React client wired to the /api/auth handler on this origin.
 *
 * The genericOAuthClient plugin enables authClient.signIn.oauth2({ providerId:
 * "battlenet", ... }) — the method components use to initiate the Battle.net
 * OAuth redirect (AUTH-01). The region is passed via authorizationUrlParams
 * before this call (Plan 04-05/06).
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL ?? "http://localhost:3000",
  plugins: [genericOAuthClient()],
});

// ---------------------------------------------------------------------------
// Named re-exports for clean consumer imports
// ---------------------------------------------------------------------------

/**
 * React hook — returns the current session state.
 * { data: Session | null, isPending, isRefetching, error, refetch }
 *
 * Safe to call in any React component; re-renders on session change.
 * Reads from the session cookie that the /api/auth/$ handler sets.
 */
export const { useSession, signIn, signOut } = authClient;
