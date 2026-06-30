// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [viteReact()],
  test: {
    // Node environment is the default for schema/logic unit tests with no DOM
    // dependency. For React component tests that require a DOM, opt in per-file
    // by adding the following directive at the top of the test file:
    //   // @vitest-environment jsdom
    // Do NOT switch this global environment to jsdom — it would slow the entire
    // schema/logic suite unnecessarily. jsdom is installed as a devDependency
    // so the per-file directive works without any further config.
    environment: "node",
    // Include .tsx test files in addition to .ts — needed for React component tests.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
});
