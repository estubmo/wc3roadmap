// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

import { describe, expect, it } from "vitest";
import {
  validateAuditTrail,
  validateLaunchGate,
  validatePathwayStepsAreLaunchReady,
} from "./validate-launch-gate";

/** Build an array of n launch_ready nodes (each with a non-empty auditNote). */
function readyNodes(
  n: number
): Array<{ id: string; launch_ready: boolean; auditNote?: string }> {
  return Array.from({ length: n }, (_, i) => ({
    id: `node-${i}`,
    launch_ready: true,
    auditNote: "audited: sources verified",
  }));
}

describe("validateLaunchGate", () => {
  it("returns an error when fewer than 25 launch_ready nodes exist", () => {
    const errors = validateLaunchGate(readyNodes(24));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/24/);
    expect(errors[0]).toMatch(/25/);
  });

  it("returns [] at exactly 25 launch_ready nodes (boundary)", () => {
    expect(validateLaunchGate(readyNodes(25))).toEqual([]);
  });

  it("returns [] above 25 launch_ready nodes", () => {
    expect(validateLaunchGate(readyNodes(30))).toEqual([]);
  });

  it("counts only launch_ready nodes, ignoring launch_ready:false", () => {
    const nodes = [
      ...readyNodes(24),
      { id: "not-ready", launch_ready: false },
    ];
    const errors = validateLaunchGate(nodes);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/24/);
  });

  it("respects a custom minCount", () => {
    expect(validateLaunchGate(readyNodes(3), 3)).toEqual([]);
    expect(validateLaunchGate(readyNodes(2), 3).length).toBeGreaterThan(0);
  });
});

describe("validatePathwayStepsAreLaunchReady", () => {
  const pathway = {
    id: "beginner-fundamentals",
    steps: ["a", "b", "c"],
  };

  it("returns [] when every pathway step is launch_ready", () => {
    const nodes = [
      { id: "a", launch_ready: true },
      { id: "b", launch_ready: true },
      { id: "c", launch_ready: true },
    ];
    expect(validatePathwayStepsAreLaunchReady(pathway, nodes)).toEqual([]);
  });

  it("returns one error per pathway step that is not launch_ready", () => {
    const nodes = [
      { id: "a", launch_ready: true },
      { id: "b", launch_ready: false },
      { id: "c", launch_ready: false },
    ];
    const errors = validatePathwayStepsAreLaunchReady(pathway, nodes);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.includes('"b"'))).toBe(true);
    expect(errors.some((e) => e.includes('"c"'))).toBe(true);
  });

  it("treats a step whose node is absent as not launch_ready", () => {
    const nodes = [{ id: "a", launch_ready: true }];
    const errors = validatePathwayStepsAreLaunchReady(pathway, nodes);
    expect(errors).toHaveLength(2);
  });
});

describe("validateAuditTrail", () => {
  it("returns [] when every launch_ready node has a non-empty auditNote", () => {
    expect(validateAuditTrail(readyNodes(3))).toEqual([]);
  });

  it("returns one error per launch_ready node missing an auditNote", () => {
    const nodes = [
      { id: "a", launch_ready: true, auditNote: "verified" },
      { id: "b", launch_ready: true },
      { id: "c", launch_ready: true, auditNote: "" },
    ];
    const errors = validateAuditTrail(nodes);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.includes('"b"'))).toBe(true);
    expect(errors.some((e) => e.includes('"c"'))).toBe(true);
  });

  it("treats a whitespace-only auditNote as empty", () => {
    const nodes = [{ id: "a", launch_ready: true, auditNote: "   " }];
    expect(validateAuditTrail(nodes)).toHaveLength(1);
  });

  it("ignores nodes with launch_ready:false", () => {
    const nodes = [
      { id: "a", launch_ready: false },
      { id: "b", launch_ready: false, auditNote: "" },
    ];
    expect(validateAuditTrail(nodes)).toEqual([]);
  });
});
