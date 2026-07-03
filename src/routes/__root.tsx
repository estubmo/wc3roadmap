// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Global design system — Direction 0 "Modern" (see docs/adr/0001-visual-design-direction.md).
import appCss from "#/styles/app.css?url";
import { SiteHeader } from "#/components/SiteHeader"
import { Toaster } from "#/components/ui/sonner";
import { TooltipProvider } from "#/components/ui/tooltip";
import { NotFoundPage } from "#/components/NotFoundPage";

// Shared description string — reused by the plain `description` meta and its
// `og:description` mirror (UI-SPEC §Page Metadata: og:description == description).
const SITE_DESCRIPTION =
  "A free, science-backed learning path for Warcraft III — structured fundamentals, real citations, and progress tracking synced to your ladder play.";

// ---------------------------------------------------------------------------
// QueryClient — module-scope singleton (not inside RootDocument).
//
// Must live at module scope to prevent re-creation on every render.
// Default staleTime: 5 min. Node-content queries override with staleTime: Infinity
// (static build-time content). No dehydration/hydration this phase — client-only
// QueryClient is sufficient because content-collections data is bundled, not
// fetched over the network. Full SSR dehydration deferred to Phase 7
// (w3champions API calls that benefit from SSR prefetching).
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default; node-content uses Infinity
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "WC3 Learning Roadmap",
      },
      {
        name: "description",
        content: SITE_DESCRIPTION,
      },
      // Open Graph share meta — property: keys (RESEARCH Pattern 4). Static
      // strings, no reflected input (threat T-09-05 accepted).
      {
        property: "og:title",
        content: "WC3 Learning Roadmap",
      },
      {
        property: "og:description",
        content: SITE_DESCRIPTION,
      },
      {
        property: "og:type",
        content: "website",
      },
      // Static OG asset — placeholder path in public/; the 1200×630 image
      // itself is out of scope (content/design workstream, UI-SPEC §OG Tags).
      {
        property: "og:image",
        content: "/og-image.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/*
         * QueryClientProvider wraps {children} only.
         * <Scripts /> is intentionally rendered OUTSIDE the provider — it emits
         * raw <script> tags and is not a React component tree; wrapping it in the
         * provider would be incorrect.
         */}
        <QueryClientProvider client={queryClient}>
          {/*
           * Single app-wide TooltipProvider (Pitfall 1). This is the FIRST
           * Tooltip use in the codebase — every Radix Tooltip (e.g. the
           * NodePanelContent staleness tooltip, 09-12) requires this Provider
           * as an ancestor. It is mounted once here, high in the tree; do NOT
           * add a second provider deeper in the app.
           */}
          <TooltipProvider>
            {/* SiteHeader mounts above {children}; the content wrapper below
                clears the fixed 48px bar with padding-top so the graph canvas
                is not hidden behind the header (UI-SPEC §SiteHeader). */}
            <SiteHeader />
            <div style={{ paddingTop: "48px" }}>{children}</div>
            {/* Toaster mounts inside QueryClientProvider so toast() calls from
                useProgressMutation (05-06) reach the DOM. position/theme per
                UI-SPEC §Toast Specifications. */}
            <Toaster position="bottom-right" theme="dark" />
          </TooltipProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
