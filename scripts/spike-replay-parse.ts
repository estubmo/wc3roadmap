// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Phase 8, Plan 01 — Wave-0 spike script (RESEARCH Open Questions 1 & 2).
 *
 * Resolves two of the three planning-gate spikes empirically:
 *
 *   Spike 1 (parse cost): parses a real `.w3g` buffer with w3gjs and reports
 *   wall-clock parse time + heap delta, so ADR 011 can cite real numbers
 *   against Vercel's serverless limits (60s / 2GB, Hobby default) instead of
 *   the RESEARCH doc's [ASSUMED] "probably fine" claim (A2).
 *
 *   Spike 2 (endpoint): functionally confirms the public, unauthenticated
 *   w3champions `GET /api/replays/{gameId}` endpoint returns real octet-stream
 *   `.w3g` bytes, reusing `fetchReplayBytes` (the SSRF-guarded native-fetch
 *   wrapper added to `src/lib/w3champions-client.ts` in plan 08-08) rather than
 *   hand-rolling a second fetch with a different guard discipline.
 *
 * Not a test — a one-off, human-run diagnostic. Run with:
 *   npx tsx scripts/spike-replay-parse.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import W3GReplay from "w3gjs";
import { fetchReplayBytes } from "../src/lib/w3champions-client";

/**
 * Fixture sourced via the auto-fetch path authorized at the Task 1 checkpoint:
 * a real 1v1 replay pulled from the public w3champions replay-download
 * endpoint (see src/lib/__fixtures__/README.md for provenance).
 */
const FIXTURE_PATH = resolve(
  import.meta.dirname,
  "../src/lib/__fixtures__/1v1-sample.w3g",
);

/** gameId the fixture above was sourced from — reused here to independently
 * exercise Spike 2 (the endpoint itself), not just replay the cached bytes. */
const FIXTURE_GAME_ID = "6a460e52ea6bb176a026d3b2";

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatMs(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

async function runParseCostSpike(buffer: Buffer, label: string): Promise<void> {
  console.log(`\n--- Spike 1: parse-cost (${label}) ---`);
  console.log(`Input size: ${formatBytes(buffer.byteLength)}`);

  const heapBefore = process.memoryUsage().heapUsed;
  const wallStart = performance.now();

  const parser = new W3GReplay();
  const result = await parser.parse(buffer);

  const wallEnd = performance.now();
  const heapAfter = process.memoryUsage().heapUsed;

  const wallMs = wallEnd - wallStart;
  const heapDeltaBytes = heapAfter - heapBefore;

  console.log(`Wall-clock parse time: ${formatMs(wallMs)}`);
  console.log(`Heap delta: ${formatBytes(heapDeltaBytes)}`);
  console.log(`buildNumber: ${result.buildNumber}`);
  console.log(`version: ${result.version}`);
  console.log(`matchup: ${result.matchup}`);
  // result.duration is replayLengthMS (w3gjs internals) — milliseconds, not seconds.
  console.log(`duration: ${result.duration}ms (~${(result.duration / 1000 / 60).toFixed(1)} min)`);
  console.log(`players.length: ${result.players.length}`);
  console.log(
    `players: ${result.players.map((p) => `${p.name} (${p.race}, apm=${p.apm})`).join(", ")}`,
  );

  // Vercel Hobby default: 60s timeout / 2048 MB memory. Report headroom so the
  // ADR can cite a concrete margin instead of an assumption.
  const VERCEL_TIMEOUT_MS = 60_000;
  const VERCEL_MEMORY_BYTES = 2048 * 1024 * 1024;
  console.log(
    `Timeout headroom: ${((1 - wallMs / VERCEL_TIMEOUT_MS) * 100).toFixed(2)}% under Vercel's 60s Hobby limit`,
  );
  console.log(
    `Memory headroom: ${((1 - heapDeltaBytes / VERCEL_MEMORY_BYTES) * 100).toFixed(4)}% under Vercel's 2GB Hobby limit`,
  );

  if (result.players.length < 2) {
    throw new Error(
      `Expected players.length >= 2 for a 1v1 replay, got ${result.players.length}`,
    );
  }
  if (!result.buildNumber || result.buildNumber <= 0) {
    throw new Error(`Expected a non-zero buildNumber, got ${result.buildNumber}`);
  }
}

async function runEndpointSpike(): Promise<Buffer | null> {
  console.log("\n--- Spike 2: w3champions replay-download endpoint ---");
  console.log(`GET /api/replays/${FIXTURE_GAME_ID} (via fetchReplayBytes)`);

  const download = await fetchReplayBytes(FIXTURE_GAME_ID);
  console.log(`Result status: ${download.status}`);

  if (download.status !== "ok" || !download.bytes) {
    console.warn(
      "Endpoint spike did not return bytes this run (status: " +
        download.status +
        "). This can happen transiently (rate-limited / no-data for this " +
        "specific gameId over time) — the committed fixture is the durable " +
        "evidence that the endpoint returned real bytes at spike time.",
    );
    return null;
  }

  console.log(`Downloaded ${formatBytes(download.bytes.byteLength)} of octet-stream bytes`);
  const header = download.bytes.subarray(0, 27).toString("ascii");
  if (!header.startsWith("Warcraft III recorded game")) {
    throw new Error(
      `Downloaded bytes do not start with the expected .w3g header, got: ${header}`,
    );
  }
  console.log("Header check: starts with 'Warcraft III recorded game' — confirmed .w3g bytes");
  return download.bytes;
}

async function main(): Promise<void> {
  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(
      `Fixture not found at ${FIXTURE_PATH}. See src/lib/__fixtures__/README.md.`,
    );
  }

  const fixtureBuffer = readFileSync(FIXTURE_PATH);
  await runParseCostSpike(fixtureBuffer, "committed fixture: 1v1-sample.w3g");

  const liveBytes = await runEndpointSpike();
  if (liveBytes) {
    await runParseCostSpike(liveBytes, "live endpoint fetch");
  }

  console.log("\nBoth Wave-0 spikes complete. See docs/adr/011-replay-parse-architecture.md.");
}

main().catch((err) => {
  console.error("\nSpike script failed:", err);
  process.exitCode = 1;
});
