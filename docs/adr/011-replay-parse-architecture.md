# ADR 011: Replay Parse Architecture

**Status:** Accepted
**Date:** 2026-07-02
**Phase:** 08-replay-parsing

---

## Context

Phase 8 (replay parsing, REPLAY-01..08) needs a decided parse-location
architecture and a client-side upload size cap before any feature server
function is written — every downstream server plan in this phase (manual
upload, auto-pull, the semantic signal layer, the monotonic-max write path)
assumes an answer to "where does `.w3g` binary parsing actually run?" and
"how big a file can a user upload?"

RESEARCH.md flagged two of the three planning-gate spikes (D-08) as needing
empirical resolution before planning could proceed with confidence:

1. **Spike 1 (parse cost):** w3gjs parse time/memory for a real `.w3g` file
   had no published benchmark (RESEARCH Assumption A2, Open Question 1) — is
   inline serverless parsing viable, or does it need a background job
   architecture this project's stack does not currently have?
2. **Spike 2 (endpoint):** whether the public w3champions
   `GET /api/replays/{gameId}` endpoint actually returns parseable bytes
   without authentication (RESEARCH Spike 2, cited from source but never
   functionally exercised against a live server).

(The third D-08 spike — wc3v fork feasibility against w3gjs 4.1.0's internals,
RESEARCH Pitfall 2 / Open Question 3 — is out of scope for this ADR. It is
gated separately at plan 08-13's go/no-go checkpoint per D-07's descope valve,
and does not block the base w3gjs signal architecture decided here.)

A third, previously-cited-but-unverified constraint (RESEARCH Pitfall 1) also
needed a concrete number attached before any upload UI could be built: Vercel's
serverless request-body limit combined with TanStack Start's full in-memory
`FormData` buffering.

### What needed deciding

1. **Parse location** — client-side, inline in a serverless server function,
   or a separate background job.
2. **Client-side upload size cap** — a concrete number, not "keep it small."

---

## Decision

### 1. Spikes resolved with `scripts/spike-replay-parse.ts` (real replay, real endpoint)

A real 1v1 replay (122.0 KB, ~9.2 min game, WC3 build 6117, version 2.00,
matchup NvU, 2 players — `NvU`, `mal151#3742` vs `Rayoyo#4711`) was auto-fetched
from the public w3champions replay-download endpoint
(`GET /api/replays/6a460e52ea6bb176a026d3b2`) per the Task 1 checkpoint's
user-authorized auto-fetch path, committed as
`src/lib/__fixtures__/1v1-sample.w3g`, and used to run both spikes together in
`scripts/spike-replay-parse.ts`.

**Spike 1 — parse cost (measured, not assumed):**

| Run | Wall-clock parse time | Heap delta | Vercel 60s headroom | Vercel 2GB headroom |
|-----|-----------------------|------------|----------------------|----------------------|
| Committed fixture (disk read) | ~147.6ms | -1.3 MB (net GC noise) | 99.75% | 100.07% |
| Live endpoint fetch (fresh bytes) | ~111.0ms | +4.7 MB | 99.81% | 99.78% |

Both runs correctly extracted `buildNumber: 6117`, `version: "2.00"`,
`matchup: "NvU"`, and `players.length: 2` — confirming w3gjs 4.1.0's typed
`ParserOutput`/`Player` API exposes every REPLAY-01 signal directly, exactly as
RESEARCH's Standard Stack section claimed from the package's type
definitions.

Parse time is **two to three orders of magnitude** under Vercel's 60-second
Hobby-plan timeout, and heap delta is noise-level (single-digit MB, well
within GC variance) against the 2 GB memory ceiling. RESEARCH's Assumption A1
("`.w3g` files are historically small — tens of KB to low single-digit MB even
for long games") holds for this real sample at 122 KB for a 9-minute game.
w3gjs is an event-stream parser (not a game-state simulator like wc3v), so
parse cost scales with action-log length, not board complexity — a
team/FFA replay with more players and a longer duration will cost more, but
even a generous 10x multiplier on the measured numbers here (≈1.5s, ≈50MB)
stays comfortably within Vercel's limits.

**Spike 2 — endpoint (functionally confirmed, not just cited):**

`GET /api/replays/{gameId}` returned `200 OK` with real
`application/octet-stream` bytes, no bearer token or API key required. The
downloaded bytes begin with the literal WC3 replay header
(`"Warcraft III recorded game"`) and were independently re-parsed by w3gjs
with identical results to the disk-committed fixture — confirming the
endpoint's bytes are directly usable with zero transformation, as
RESEARCH's source-code citation (`ReplaysController.cs`) claimed.

### 2. Parse INLINE inside the principal-keyed replay server function

Both manual upload (REPLAY-04) and auto-pull (REPLAY-05) parse `.w3g` bytes
**synchronously, inline, inside the request-scoped server function** —
`createServerFn(...).middleware([authMiddleware]).handler(...)`, the same
lexically-visible pattern established in ADR 009 Fix 2 and reused by
`src/server/w3champions.ts`. No client-side parsing, no separate background
job or queue.

**Why inline (not client-side):**

- w3gjs needs Node `Buffer` APIs; shipping the parser to the browser bundle
  would bloat the client and still require a round-trip to the server for the
  DB write (monotonic-max upsert, ADR 007 principal-keying) — no benefit over
  parsing where the write already happens.
- The pure semantic signal layer (`replay-signals.ts`, D-11) stays a
  zero-I/O deep module regardless of where the raw w3gjs parse call sits;
  moving the parse to the client would not simplify that layer, only add a
  second code path (browser + server) for the same w3gjs dependency.

**Why inline (not a background job):**

- The measured parse cost (~110-150ms, negligible memory) does not approach
  Vercel's serverless timeout or memory ceiling — there is no latency or
  resource pressure that a background job would relieve.
- A background job would require infrastructure this project does not have
  (a queue, a worker runtime, a polling/webhook completion path) for zero
  measured benefit. RESEARCH's Assumption A2 concern ("if wrong, inline
  parsing is not viable") is resolved: it is viable, by a wide margin.
- The `gameId` cache-gate (D-17, Pattern 3) already skips re-parsing on any
  cache hit, further reducing the steady-state parse volume this endpoint
  needs to absorb per request.

**Scope note:** this decision covers the base w3gjs signal layer
(REPLAY-01/02/04-08). If the wc3v advanced-analysis layer (REPLAY-03) is
integrated per D-06, its parse cost is a **separate, later measurement** at
plan 08-13's go/no-go checkpoint — wc3v performs additional game-state
simulation beyond event-stream parsing and could have materially different
cost characteristics. This ADR's inline decision is not assumed to
automatically extend to wc3v without that checkpoint's own evidence.

### 3. Client-side upload size cap: 4 MB, enforced before any upload request fires

RESEARCH Pitfall 1 identified two compounding constraints on manual upload
(REPLAY-04) size:

1. **Vercel's request-body limit** — serverless functions reject payloads
   over roughly 4.5 MB with `413 FUNCTION_PAYLOAD_TOO_LARGE`.
2. **TanStack Start's full in-memory `FormData` buffering** — `request.formData()`
   loads the entire multipart body into memory before the handler runs, with
   no streaming and no pre-handler size check, compounding with (not
   bypassing) Vercel's ceiling.

Given the measured real-world fixture is 122 KB for a 9-minute game, and
RESEARCH's Assumption A1 holds that even long/team games stay in the
low-single-digit-MB range, a **4 MB client-side cap** is generous relative to
realistic replay sizes while staying safely under Vercel's ~4.5 MB body
ceiling (leaving headroom for multipart/FormData framing overhead, not just
the raw file bytes).

**Downstream requirement (binding on plan 08-12, the manual-upload plan):**
the upload UI MUST reject files over 4 MB **client-side, before the upload
request is sent**, with a clear rejection message (e.g. "Replay file is too
large — WC3 replays are typically under 1 MB; files over 4 MB are not
supported"). This is a UX guard, not a security boundary — the server
function itself should also reject oversized bodies defensively (the
`authMiddleware` handler can check `Content-Length` or the parsed buffer size
before invoking w3gjs), consistent with this project's pattern of not
trusting client-side checks alone for anything security- or
resource-relevant.

---

## Consequences

**Positive:**

- **No background-job infrastructure needed.** The measured parse cost stays
  comfortably within existing serverless limits — no queue, worker runtime,
  or polling/webhook completion path has to be designed, built, or operated
  for this phase.
- **One code path, one dependency surface.** w3gjs is imported exactly where
  the DB write already happens (`authMiddleware`-protected server functions),
  matching the existing `src/server/w3champions.ts` structure — no client
  bundle exposure, no dual browser/server parsing implementation.
- **Concrete, evidence-based upload cap.** Plan 08-12 has a specific number
  (4 MB) and a specific rationale (Vercel body limit headroom + realistic
  file-size margin) instead of a vague "keep it small" instruction.
- **`gameId` cache-gate compounds the margin.** D-17's dedupe-on-`gameId`
  means the measured per-parse cost is only paid once per unique replay, not
  once per view/request.

**Negative / trade-offs:**

- **No numeric benchmark for team/FFA or very long replays.** Only a single
  1v1, ~9-minute fixture was measured. The 10x-multiplier extrapolation in
  Decision §1 is a reasoned estimate, not a second measured data point. If a
  pathological replay (e.g. an hours-long FFA game) turns out to cost
  meaningfully more than 10x, this ADR's margin claim should be re-verified
  against a real long/team-game fixture before merging 08-11/08-12.
- **wc3v's parse cost is explicitly deferred, not covered here.** This ADR
  only resolves the base w3gjs signal layer's parse-location question; the
  wc3v advanced-analysis layer needs its own cost measurement at the 08-13
  go/no-go checkpoint before this ADR's "inline is fine" conclusion can be
  assumed to extend to it.
- **4 MB cap is a client-side UX guard, not a hard security boundary on its
  own.** A malicious or buggy client could still send an oversized or
  malformed body; the server-side defensive check called out in Decision §3
  is required, not optional, to close that gap (Rule 2 — this is a
  correctness/security requirement for 08-11/08-12, not a nice-to-have).

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-------------------|
| Client-side parsing (parse in the browser before upload) | w3gjs needs Node `Buffer` APIs; would bloat the client bundle and still require a server round-trip for the DB write — no benefit, added complexity of two parse code paths. |
| Background job / queue-based parsing | Measured parse cost (~110-150ms, negligible memory) shows no latency or resource pressure a background job would relieve; would add queue/worker infrastructure this project's stack does not have, for zero measured benefit. |
| A stricter upload cap (e.g. 1 MB) matching only the measured fixture's size | Too aggressive relative to RESEARCH's Assumption A1 (long/team games can run into low-single-digit MB); would reject legitimate long or team-game replay uploads that still parse trivially fast per the measured numbers. |
| A looser upload cap (e.g. 4.5 MB, matching Vercel's raw limit exactly) | Leaves no headroom for multipart/FormData framing overhead on top of the raw file bytes — risks an edge-case `413` for a file just under the file-size cap but over the wire-format-inflated request size. |
| Deferring the upload cap decision to plan 08-12 | Plan 08-12 is a downstream consumer of this architecture decision, not the place to first discover Vercel's body-limit constraint — RESEARCH Pitfall 1 explicitly flagged this as a Wave-0 concern that should be resolved before any upload server function is written. |

---

## Related Decisions

- **D-08** — replay-parsing planning-gate spikes; Spikes 1 and 2 resolved by
  this ADR, Spike 3 (wc3v) deferred to plan 08-13's go/no-go checkpoint
- **D-06/D-07** — wc3v fork attempted alongside w3gjs, with a descope valve to
  Phase 8.x if the fork proves heavy; this ADR's inline-parse decision does
  not extend to wc3v without a separate measurement
- **D-17** — `gameId`-keyed parsed-result cache; a known `gameId` is never
  re-parsed, reducing steady-state parse volume against the margin measured
  here
- **RESEARCH.md Pitfall 1** — Vercel 4.5 MB body limit + TanStack Start's full
  in-memory `FormData` buffering; source of the 4 MB client-side cap decided
  in §3
- **RESEARCH.md Assumption A1/A2** — real-world `.w3g` file size and parse-cost
  assumptions; both now empirically confirmed (not just assumed) by
  `scripts/spike-replay-parse.ts`
- **ADR 007** — `authedServerFn`/`authMiddleware` principal-keyed authorization
  convention; the replay server functions this ADR's parse-location decision
  applies to are built on this pattern
- **ADR 009** — progress-persistence design; Fix 2's "createServerFn must be
  lexically visible" rule applies identically to the new replay server
  functions (Pitfall 4 in RESEARCH.md restates this rule for this phase)
