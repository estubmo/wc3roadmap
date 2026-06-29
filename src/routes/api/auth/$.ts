// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Catch-all auth handler route — delegates all GET and POST requests under
 * /api/auth/* to better-auth's request handler (AUTH-01/AUTH-02).
 *
 * better-auth mounts its endpoints at /api/auth/:endpoint, e.g.:
 *   GET  /api/auth/get-session         — read current session
 *   POST /api/auth/sign-in/oauth2      — initiate Battle.net OAuth redirect
 *   GET  /api/auth/oauth2/callback/battlenet — OAuth callback
 *   POST /api/auth/sign-out            — end session
 *
 * The catch-all `$` segment in the filename captures any path after /api/auth/.
 * One file handles all methods — do NOT split into one file per HTTP method
 * (see RESEARCH.md Anti-Patterns: "catch-all $.ts, not one file per method").
 *
 * Security note (T-04-03a/b): better-auth manages PKCE, state param (CSRF),
 * token validation, session fixation protection, and httpOnly cookie signing.
 * This route intentionally delegates everything to auth.handler — do not add
 * manual auth logic here.
 */

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
