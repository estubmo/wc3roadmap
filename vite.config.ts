// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import contentCollections from "@content-collections/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // contentCollections MUST be first — generates .content-collections/generated/
    // types before other plugins run (avoids missing-module errors at build time).
    contentCollections(),
    tanstackStart(),
    // nitro is required for Vercel zero-config detection of TanStack Start.
    nitro(),
    viteReact(),
  ],
});
