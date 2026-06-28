// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
// Global design system — Direction 0 "Modern" (see docs/adr/0001-visual-design-direction.md).
import appCss from "#/styles/app.css?url";

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
        {children}
        <Scripts />
      </body>
    </html>
  );
}
