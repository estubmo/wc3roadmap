// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Global design system — Direction 0 "Modern" (see docs/adr/0001-visual-design-direction.md).
import appCss from "#/styles/app.css?url";
import { SiteHeader } from "#/components/SiteHeader";

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
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
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
          {/* SiteHeader mounts above {children}; the content wrapper below
              clears the fixed 48px bar with padding-top so the graph canvas
              is not hidden behind the header (UI-SPEC §SiteHeader). */}
          <SiteHeader />
          <div style={{ paddingTop: "48px" }}>{children}</div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
