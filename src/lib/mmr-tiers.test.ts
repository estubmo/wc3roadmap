// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { tierForMmr, tierIndex, TIER_IDS } from "./mmr-tiers";

describe("mmr-tiers registry", () => {
  describe("tierForMmr — highest tier whose minMmr the mmr meets or exceeds (boundary inclusive)", () => {
    it("maps below the first non-zero cutoff to bronze", () => {
      expect(tierForMmr(0)).toBe("bronze");
      expect(tierForMmr(999)).toBe("bronze");
    });

    it("maps exactly on a boundary to that boundary's tier (inclusive lower bound)", () => {
      expect(tierForMmr(1000)).toBe("silver");
      expect(tierForMmr(1200)).toBe("gold");
      expect(tierForMmr(1400)).toBe("platinum");
      expect(tierForMmr(1600)).toBe("diamond");
      expect(tierForMmr(1800)).toBe("master");
      expect(tierForMmr(2000)).toBe("grandmaster");
    });

    it("maps a real w3champions mmr (Happy#17228 = 1453) to platinum (1453 >= 1400)", () => {
      // NOTE: the plan behavior block said "gold" here, but with the
      // authoritative A3 cutoffs (platinum=1400) 1453 qualifies for platinum.
      expect(tierForMmr(1453)).toBe("platinum");
    });

    it("clamps arbitrarily high mmr to the top tier", () => {
      expect(tierForMmr(2000)).toBe("grandmaster");
      expect(tierForMmr(5000)).toBe("grandmaster");
    });
  });

  describe("tierIndex — strictly ordinal, registry order == index order", () => {
    it("returns 0 for the first tier (bronze)", () => {
      expect(tierIndex("bronze")).toBe(0);
    });

    it("returns i for TIER_IDS[i] across the whole tuple", () => {
      for (let i = 0; i < TIER_IDS.length; i++) {
        expect(tierIndex(TIER_IDS[i])).toBe(i);
      }
    });

    it("is strictly increasing across TIER_IDS in declared order", () => {
      for (let i = 1; i < TIER_IDS.length; i++) {
        expect(tierIndex(TIER_IDS[i])).toBeGreaterThan(tierIndex(TIER_IDS[i - 1]));
      }
    });
  });

  describe("TIER_IDS — non-empty tuple usable in z.enum", () => {
    it("is a non-empty array of strings", () => {
      expect(Array.isArray(TIER_IDS)).toBe(true);
      expect(TIER_IDS.length).toBeGreaterThan(0);
      expect(typeof TIER_IDS[0]).toBe("string");
    });

    it("starts at bronze and ends at grandmaster", () => {
      expect(TIER_IDS[0]).toBe("bronze");
      expect(TIER_IDS[TIER_IDS.length - 1]).toBe("grandmaster");
    });
  });
});
