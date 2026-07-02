// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { resolveObjectId, objectIdMapVersionForPatch, OBJECT_ID_MAPS } from "./index";
import { CURRENT_PATCH, PATCHES, getPatch } from "../patches";

describe("object-id-maps registry", () => {
  describe("objectIdMapVersionForPatch — delegates to patches.ts hook", () => {
    it("equals getPatch(patchId).objectIdMapVersion for the current patch", () => {
      expect(objectIdMapVersionForPatch(CURRENT_PATCH.id)).toBe(
        getPatch(CURRENT_PATCH.id).objectIdMapVersion,
      );
    });

    it("equals getPatch(patchId).objectIdMapVersion for every registered patch", () => {
      for (const patch of PATCHES) {
        expect(objectIdMapVersionForPatch(patch.id)).toBe(patch.objectIdMapVersion);
      }
    });

    it("throws for an unknown patch id (delegates getPatch's fail-fast behavior)", () => {
      expect(() => objectIdMapVersionForPatch("does-not-exist")).toThrow(Error);
    });
  });

  describe("resolveObjectId — graceful lookup, never throws", () => {
    it("resolves a known seeded id at version 1 to its entry", () => {
      const entry = resolveObjectId("htow", 1);
      expect(entry).toEqual({ name: "Town Hall", race: "human", kind: "townhall" });
    });

    it("resolves the townhall/expansion building for all four races at version 1", () => {
      expect(resolveObjectId("htow", 1)).toMatchObject({ race: "human", kind: "townhall" });
      expect(resolveObjectId("ogre", 1)).toMatchObject({ race: "orc", kind: "townhall" });
      expect(resolveObjectId("unpl", 1)).toMatchObject({ race: "undead", kind: "townhall" });
      expect(resolveObjectId("etol", 1)).toMatchObject({ race: "nightelf", kind: "townhall" });
    });

    it("resolves the worker and opener unit for all four races at version 1", () => {
      expect(resolveObjectId("hpea", 1)).toMatchObject({ race: "human", kind: "worker" });
      expect(resolveObjectId("hfoo", 1)).toMatchObject({ race: "human", kind: "opener" });
      expect(resolveObjectId("opeo", 1)).toMatchObject({ race: "orc", kind: "worker" });
      expect(resolveObjectId("ogru", 1)).toMatchObject({ race: "orc", kind: "opener" });
      expect(resolveObjectId("uaco", 1)).toMatchObject({ race: "undead", kind: "worker" });
      expect(resolveObjectId("ugho", 1)).toMatchObject({ race: "undead", kind: "opener" });
      expect(resolveObjectId("ewsp", 1)).toMatchObject({ race: "nightelf", kind: "worker" });
      expect(resolveObjectId("earc", 1)).toMatchObject({ race: "nightelf", kind: "opener" });
    });

    it("returns null (never throws) for an unknown object id at a known version", () => {
      expect(() => resolveObjectId("zzzz", 1)).not.toThrow();
      expect(resolveObjectId("zzzz", 1)).toBeNull();
    });

    it("returns null (never throws) for a known object id at an unknown version", () => {
      expect(() => resolveObjectId("htow", 999)).not.toThrow();
      expect(resolveObjectId("htow", 999)).toBeNull();
    });

    it("returns null for empty-string / adversarial-looking input without throwing", () => {
      expect(resolveObjectId("", 1)).toBeNull();
      expect(resolveObjectId("__proto__", 1)).toBeNull();
      expect(resolveObjectId("constructor", 1)).toBeNull();
    });
  });

  describe("version-sharing patches resolve the same table (no duplication)", () => {
    it("two patch ids sharing objectIdMapVersion resolve identical entries for the same object id", () => {
      const sharedVersionPatches = PATCHES.filter(
        (p) => p.objectIdMapVersion === CURRENT_PATCH.objectIdMapVersion,
      );
      expect(sharedVersionPatches.length).toBeGreaterThanOrEqual(2);

      const [a, b] = sharedVersionPatches;
      const versionA = objectIdMapVersionForPatch(a.id);
      const versionB = objectIdMapVersionForPatch(b.id);
      expect(versionA).toBe(versionB);
      expect(resolveObjectId("htow", versionA)).toEqual(resolveObjectId("htow", versionB));
    });

    it("registry is keyed by objectIdMapVersion, not by patch id, in OBJECT_ID_MAPS", () => {
      expect(Object.keys(OBJECT_ID_MAPS)).toContain(String(CURRENT_PATCH.objectIdMapVersion));
    });
  });
});
