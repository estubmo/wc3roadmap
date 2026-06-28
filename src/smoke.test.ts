// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
//
// Smoke test — proves the Vitest harness is wired correctly.
// If this file fails, the test infrastructure itself is broken.
// Real tests live in src/schemas/*.test.ts, src/lib/*.test.ts, scripts/lib/*.test.ts.
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("vitest harness is operational", () => {
    expect(1 + 1).toBe(2);
  });
});
