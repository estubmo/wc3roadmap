// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Wave-0 unit tests for the w3champions HTTP client (AUTO-01/AUTO-02, D-10).
 *
 * These tests encode the D-10 status->bucket contract that the sync server fn
 * (07-07) relies on, plus the two safety-critical URL details (Pitfall 3
 * BattleTag encodeURIComponent, Pitfall 4 kr->America gateway mapping).
 *
 * Strategy: stub the GLOBAL `fetch` with a per-URL router returning the
 * RESEARCH.md live-verified response bodies. The client is a pure `fetch`
 * wrapper (no db, no env), so no module mocking is needed — we only replace
 * `globalThis.fetch`. `classifyW3championsResponse` is additionally exercised
 * directly as a pure function.
 *
 * What these tests prove (the six behaviors from the plan):
 *   1. 200 populated game-mode-stats + non-zero career games -> "ok",
 *      mmrTier via tierForMmr(mmr), gamesPlayed = sum of winLosses[].games
 *   2. 200 empty array / all-zero winLosses -> "no-data" (NOT an error)
 *   3. 404 (never-onboarded BattleTag) -> "no-data" (NOT "unreachable")
 *   4. fetch throws / times out -> "unreachable"
 *   5. 429 -> "rate-limited" (independent of any Retry-After header)
 *   6. outbound URL uses encodeURIComponent on the BattleTag (%23) and maps
 *      gateway "kr" -> "America"
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchW3championsSignals,
  classifyW3championsResponse,
  fetchReplayBytes,
  W3C_BASE_URL,
} from "./w3champions-client";
import { tierForMmr } from "./mmr-tiers";

// ---------------------------------------------------------------------------
// Fixtures — RESEARCH.md live-verified response bodies (2026-07-01)
// ---------------------------------------------------------------------------

const SEASONS_BODY = [{ id: 25 }, { id: 24 }, { id: 23 }];

/** Career-wide player stats; gamesPlayed = sum of winLosses[].games = 308. */
const PLAYER_POPULATED = {
  battleTag: "Happy#17228",
  name: "Happy",
  winLosses: [
    { race: 1, wins: 0, losses: 0, games: 0, winrate: 0 },
    { race: 2, wins: 0, losses: 0, games: 0, winrate: 0 },
    { race: 4, wins: 0, losses: 0, games: 0, winrate: 0 },
    { race: 8, wins: 151, losses: 157, games: 308, winrate: 0.49 },
    { race: 0, wins: 0, losses: 0, games: 0, winrate: 0 },
  ],
};

/** Known BattleTag, zero ranked games (all-zero winLosses) — HTTP 200. */
const PLAYER_ALL_ZERO = {
  battleTag: "Newbie#0001",
  name: "Newbie",
  winLosses: [
    { race: 1, wins: 0, losses: 0, games: 0, winrate: 0 },
    { race: 8, wins: 0, losses: 0, games: 0, winrate: 0 },
  ],
};

/** Current-season game-mode-stats, sorted by ranking points desc; mmr = 1453. */
const GAME_MODE_STATS_POPULATED = [
  {
    race: 8,
    gameMode: 1,
    gateWay: 20,
    season: 24,
    id: "24_Happy#17228@20_GM_1v1_UD",
    mmr: 1453,
    rankingPoints: 24.6,
    rank: 27,
    leagueId: 36,
    wins: 3,
    losses: 2,
    games: 5,
    winrate: 0.6,
  },
];

// ---------------------------------------------------------------------------
// Fake fetch plumbing
// ---------------------------------------------------------------------------

interface FakeResponseSpec {
  status?: number;
  body?: unknown;
  throws?: boolean;
}

function fakeResponse(spec: FakeResponseSpec) {
  const status = spec.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => spec.body,
  };
}

/**
 * Build a stubbed fetch that routes by URL substring. Records every requested
 * URL into `calls` for URL-shape assertions.
 */
function stubFetch(routes: {
  seasons?: FakeResponseSpec;
  player?: FakeResponseSpec;
  gameModeStats?: FakeResponseSpec;
}) {
  const calls: string[] = [];
  const mock = vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes("/game-mode-stats")) {
      const s = routes.gameModeStats ?? { body: [] };
      if (s.throws) throw new Error("network down");
      return fakeResponse(s) as unknown as Response;
    }
    if (url.includes("/api/ladder/seasons")) {
      const s = routes.seasons ?? { body: SEASONS_BODY };
      if (s.throws) throw new Error("network down");
      return fakeResponse(s) as unknown as Response;
    }
    // /api/players/{tag}
    const s = routes.player ?? { body: PLAYER_POPULATED };
    if (s.throws) throw new Error("network down");
    return fakeResponse(s) as unknown as Response;
  });
  vi.stubGlobal("fetch", mock);
  return { calls, mock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// fetchW3championsSignals — end-to-end (mocked fetch)
// ---------------------------------------------------------------------------

describe("fetchW3championsSignals", () => {
  it("200 populated -> ok with derived mmrTier + summed gamesPlayed", async () => {
    stubFetch({
      seasons: { body: SEASONS_BODY },
      player: { body: PLAYER_POPULATED },
      gameModeStats: { body: GAME_MODE_STATS_POPULATED },
    });

    const result = await fetchW3championsSignals("Happy#17228", "eu");

    expect(result.status).toBe("ok");
    expect(result.signals?.gamesPlayed).toBe(308);
    expect(result.signals?.mmrTier).toBe(tierForMmr(1453));
  });

  it("200 empty game-mode-stats + all-zero winLosses -> no-data (not an error)", async () => {
    stubFetch({
      seasons: { body: SEASONS_BODY },
      player: { body: PLAYER_ALL_ZERO },
      gameModeStats: { body: [] },
    });

    const result = await fetchW3championsSignals("Newbie#0001", "eu");

    expect(result.status).toBe("no-data");
  });

  it("404 on the player endpoint -> no-data (never-onboarded, not unreachable)", async () => {
    stubFetch({
      seasons: { body: SEASONS_BODY },
      player: { status: 404, body: "Player Fury#21156 not found." },
    });

    const result = await fetchW3championsSignals("Fury#21156", "eu");

    expect(result.status).toBe("no-data");
  });

  it("fetch throws -> unreachable", async () => {
    stubFetch({ seasons: { throws: true } });

    const result = await fetchW3championsSignals("Happy#17228", "eu");

    expect(result.status).toBe("unreachable");
  });

  it("429 -> rate-limited (no Retry-After dependency)", async () => {
    stubFetch({
      seasons: { body: SEASONS_BODY },
      player: { body: PLAYER_POPULATED },
      gameModeStats: { status: 429, body: "" },
    });

    const result = await fetchW3championsSignals("Happy#17228", "eu");

    expect(result.status).toBe("rate-limited");
  });

  it("encodeURIComponent-s the BattleTag '#' and maps kr -> America", async () => {
    const { calls } = stubFetch({
      seasons: { body: SEASONS_BODY },
      player: { body: PLAYER_POPULATED },
      gameModeStats: { body: GAME_MODE_STATS_POPULATED },
    });

    await fetchW3championsSignals("Happy#17228", "kr");

    const playerCall = calls.find(
      (u) => u.includes("/api/players/") && !u.includes("/game-mode-stats"),
    );
    const gmsCall = calls.find((u) => u.includes("/game-mode-stats"));

    // '#' must be percent-encoded, never sent raw (Pitfall 3).
    expect(playerCall).toContain("Happy%2317228");
    expect(playerCall).not.toMatch(/players\/Happy#/);
    // kr has no w3champions gateway -> America (Pitfall 4 [ASSUMED]).
    expect(gmsCall).toContain("gateWay=America");
    expect(gmsCall).toContain("Happy%2317228");
    // Base URL is the fixed w3champions backend host.
    expect(playerCall?.startsWith(W3C_BASE_URL)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// classifyW3championsResponse — pure function (D-10 buckets)
// ---------------------------------------------------------------------------

describe("classifyW3championsResponse", () => {
  it("network-error -> unreachable", () => {
    expect(classifyW3championsResponse({ kind: "network-error" }).status).toBe(
      "unreachable",
    );
  });

  it("http 429 -> rate-limited", () => {
    expect(
      classifyW3championsResponse({ kind: "http", status: 429 }).status,
    ).toBe("rate-limited");
  });

  it("http 404 -> no-data", () => {
    expect(
      classifyW3championsResponse({ kind: "http", status: 404 }).status,
    ).toBe("no-data");
  });

  it("http 200 populated -> ok with signals", () => {
    const result = classifyW3championsResponse({
      kind: "http",
      status: 200,
      player: PLAYER_POPULATED,
      gameModeStats: GAME_MODE_STATS_POPULATED,
    });
    expect(result.status).toBe("ok");
    expect(result.signals?.gamesPlayed).toBe(308);
    expect(result.signals?.mmrTier).toBe(tierForMmr(1453));
  });

  it("http 200 empty + all-zero -> no-data", () => {
    const result = classifyW3championsResponse({
      kind: "http",
      status: 200,
      player: PLAYER_ALL_ZERO,
      gameModeStats: [],
    });
    expect(result.status).toBe("no-data");
  });

  it("http 500 -> unreachable", () => {
    expect(
      classifyW3championsResponse({ kind: "http", status: 500 }).status,
    ).toBe("unreachable");
  });
});

// ---------------------------------------------------------------------------
// fetchReplayBytes — auto-pull download primitive (REPLAY-05, T-08-08a/b)
// ---------------------------------------------------------------------------

describe("fetchReplayBytes", () => {
  it("200 octet-stream -> ok with a Buffer of the raw bytes", async () => {
    const raw = new Uint8Array([1, 2, 3, 4]);
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => raw.buffer,
    }));
    vi.stubGlobal("fetch", mock);

    const result = await fetchReplayBytes("valid-id");

    expect(result.status).toBe("ok");
    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(Array.from(result.bytes ?? [])).toEqual([1, 2, 3, 4]);
  });

  it("429 -> rate-limited, no bytes, no upstream string surfaced", async () => {
    const mock = vi.fn(async () => ({
      ok: false,
      status: 429,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", mock);

    const result = await fetchReplayBytes("throttled-id");

    expect(result).toEqual({ status: "rate-limited" });
  });

  it("404 -> no-data", async () => {
    const mock = vi.fn(async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", mock);

    const result = await fetchReplayBytes("missing-id");

    expect(result).toEqual({ status: "no-data" });
  });

  it("network throw -> unreachable", async () => {
    const mock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", mock);

    const result = await fetchReplayBytes("any-id");

    expect(result).toEqual({ status: "unreachable" });
  });

  it("outbound URL is exactly the hardcoded host + encoded gameId, nothing else", async () => {
    const mock = vi.fn(async (url: string) => {
      expect(url).toBe(
        `${W3C_BASE_URL}/api/replays/${encodeURIComponent("weird id/with#chars")}`,
      );
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    vi.stubGlobal("fetch", mock);

    await fetchReplayBytes("weird id/with#chars");

    expect(mock).toHaveBeenCalledTimes(1);
  });
});
