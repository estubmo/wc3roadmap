// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { masteryStateIndex, MASTERY_STATES } from "./mastery-ordinal";
import { MasteryStateSchema } from "../schemas/progress";

describe("mastery-ordinal registry", () => {
  describe("masteryStateIndex — strictly ordinal, registry order == index order", () => {
    it("returns 0 for untouched", () => {
      expect(masteryStateIndex("untouched")).toBe(0);
    });

    it("returns 1 for in-progress", () => {
      expect(masteryStateIndex("in-progress")).toBe(1);
    });

    it("returns 2 for mastered", () => {
      expect(masteryStateIndex("mastered")).toBe(2);
    });

    it("returns -1 for an unknown id", () => {
      expect(masteryStateIndex("bogus")).toBe(-1);
    });
  });

  describe("drift guard — registry order matches MasteryStateSchema.options (Pitfall 5)", () => {
    it("has the same ids in the same order as MasteryStateSchema.options", () => {
      expect(MASTERY_STATES.map((s) => s.id)).toEqual(MasteryStateSchema.options);
    });
  });
});
