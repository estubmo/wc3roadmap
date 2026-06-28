// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { PATCHES, CURRENT_PATCH, PATCH_IDS, getPatch } from "./patches";

describe("patch registry", () => {
  it("PATCHES has at least two entries", () => {
    expect(PATCHES.length).toBeGreaterThanOrEqual(2);
  });

  it("PATCHES order values are strictly ascending starting at 0", () => {
    for (let i = 0; i < PATCHES.length; i++) {
      expect(PATCHES[i].order).toBe(i);
    }
  });

  it("CURRENT_PATCH is the last entry in PATCHES", () => {
    expect(CURRENT_PATCH).toBe(PATCHES[PATCHES.length - 1]);
  });

  it("PATCH_IDS contains every registry id", () => {
    expect(PATCH_IDS.length).toBe(PATCHES.length);
    for (const patch of PATCHES) {
      expect(PATCH_IDS).toContain(patch.id);
    }
  });

  it("PATCH_IDS is a non-empty tuple (satisfies z.enum constraint)", () => {
    // z.enum requires [string, ...string[]] — verify runtime shape
    expect(Array.isArray(PATCH_IDS)).toBe(true);
    expect(PATCH_IDS.length).toBeGreaterThan(0);
    expect(typeof PATCH_IDS[0]).toBe("string");
  });

  it("getPatch returns the matching PatchEntry for a known id", () => {
    const firstId = PATCHES[0].id;
    const result = getPatch(firstId);
    expect(result).toBe(PATCHES[0]);
    expect(result.id).toBe(firstId);
  });

  it("getPatch returns CURRENT_PATCH for the last entry id", () => {
    const result = getPatch(CURRENT_PATCH.id);
    expect(result).toBe(CURRENT_PATCH);
  });

  it("getPatch throws an Error whose message includes the unknown id", () => {
    const unknownId = "does-not-exist";
    expect(() => getPatch(unknownId)).toThrow(Error);
    expect(() => getPatch(unknownId)).toThrow(unknownId);
  });

  it("each PatchEntry has id, order, released (ISO date), and objectIdMapVersion fields", () => {
    for (const patch of PATCHES) {
      expect(typeof patch.id).toBe("string");
      expect(typeof patch.order).toBe("number");
      expect(patch.released).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof patch.objectIdMapVersion).toBe("number");
    }
  });
});
