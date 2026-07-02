# Replay Fixtures

Real `.w3g` Warcraft III replay files used as test/benchmark fixtures for the
replay-parsing phase (Phase 8). These are the vehicle for the Nyquist
"real-binary" check — replay parsing logic (w3gjs, the semantic signal layer,
wc3v) is verified against actual game files, not hand-crafted mocks, because
the `.w3g` wire format has no official specification and subtle
version/patch-dependent quirks only surface against real data.

## Convention

- Keep fixtures **small**. Do not commit large binaries — a short 1v1 replay
  (tens of KB to a few hundred KB) is sufficient for parser-behavior and
  benchmark coverage. Do not add multi-MB team/FFA replays as fixtures without
  a specific reason documented here.
- Every fixture MUST be sourced from the public, unauthenticated w3champions
  replay-download endpoint (`GET /api/replays/{gameId}`) or an equivalent
  legitimately-obtained real game — never synthetically generated.
- Document each fixture below: filename, source, matchup, and what it's used
  for.

## Fixtures

| File | Source | Matchup | Duration | Used by |
|------|--------|---------|----------|---------|
| `1v1-sample.w3g` | `GET /api/replays/{gameId}` (w3champions, gameId `6a460e52ea6bb176a026d3b2`) | 1v1 ranked | 505s (~8.4 min) | `scripts/spike-replay-parse.ts` (08-01 parse-cost + endpoint spike); reusable by downstream parser unit tests |

## Legitimacy note (08-01 checkpoint)

`w3gjs@4.1.0` (the npm package used to parse these fixtures) was
human-verified before install per the plan's `checkpoint:human-verify` gate:
version 4.1.0, MIT license, repository `github.com/PBug90/w3gjs`, single
dependency `protobufjs`, no install/postinstall scripts. Approved 2026-07-02.
