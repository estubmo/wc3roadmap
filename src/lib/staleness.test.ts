// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Colocated Vitest coverage for the single staleness predicate (D-06 locked
 * trigger, CONT-05). Exhaustively asserts all four boolean combinations of
 * meta_volatile × patch-id equality.
 *
 * A relative import (./staleness) is used deliberately: vitest.config.ts has
 * no "#/" alias resolver, so the app-build alias would fail here
 * (09-PATTERNS.md §#-path-alias caveat).
 */

import { describe, expect, it } from "vitest";
import { isStale } from "./staleness";

// Concrete patch ids so the patchId-inequality path is genuinely exercised.
const CURRENT = "patch-1.36.2";
const OLDER = "patch-1.36.1";

describe("isStale", () => {
  it("meta-volatile true + patch moved (patchId !== currentPatchId) → stale", () => {
    expect(isStale(true, OLDER, CURRENT)).toBe(true);
  });

  it("meta-volatile true + patch unchanged (patchId === currentPatchId) → not stale", () => {
    expect(isStale(true, CURRENT, CURRENT)).toBe(false);
  });

  it("meta-volatile false + patch moved → not stale (volatility gate)", () => {
    expect(isStale(false, OLDER, CURRENT)).toBe(false);
  });

  it("meta-volatile false + patch unchanged → not stale", () => {
    expect(isStale(false, CURRENT, CURRENT)).toBe(false);
  });
});
