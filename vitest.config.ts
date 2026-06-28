// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment is sufficient for Phase 1 — all tests are schema/logic
    // unit tests with no DOM dependency. DOM tests are added in later phases.
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
