// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * /replays — the dedicated Replay Analysis surface (D-13, REPLAY-04/05/07).
 *
 * Two ingest paths, one report:
 *   - Drag-drop (or click-to-browse) a `.w3g` file → `useUploadReplayMutation`.
 *   - "Pull recent replays from w3champions" → `usePullReplaysMutation`.
 *
 * Both mutations return the same `ReplayReport` shape from
 * `src/server/replay.ts` (uploadReplay / pullReplays). CRITICAL CONTRACT
 * (08-11): the actionable report below is rendered directly from that
 * mutation RESULT — never from `getReplayAnalysis`, whose `actual` field is
 * always `null` (no per-principal "last report" store exists, see that
 * handler's doc comment).
 *
 * Report rendering (REPLAY-07 / D-16): every signal is rendered as an
 * actual-vs-target line tied to its node's title — never a bare number.
 * `null` actual (a signal that couldn't be measured from this replay) still
 * shows the node + target so the report never silently drops a row.
 *
 * Authed-only surface (D-13): neither hook has a signed-out branch (mirrors
 * `SyncW3championsButton`'s assumption), so this route gates its own body on
 * `useSession()` and shows a sign-in prompt when signed out, and renders
 * nothing while the session is resolving (AUTH-02 / T-04-06b precedent —
 * prevents a CTA flash on refresh).
 *
 * Styling: functional, unstyled-but-clear placeholders (inline styles,
 * matching `/preview/auto-advance`'s convention) — exact copy/marker styling
 * is deferred to the UI-SPEC pass.
 */

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { allNodes } from "content-collections";
import { useSession } from "#/lib/auth-client";
import { useUploadReplayMutation } from "#/hooks/useUploadReplayMutation";
import { usePullReplaysMutation } from "#/hooks/usePullReplaysMutation";
import type { ReplayReport, ReplaySignalItem } from "#/server/replay";

export const Route = createFileRoute("/replays")({
  component: ReplaysRoute,
});

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

/** Mirrors the ADR 011 §3 4 MB cap enforced by `useUploadReplayMutation` — used here only for the immediate inline UX check. */
const MAX_REPLAY_BYTES = 4 * 1024 * 1024;

/** The FormData field name `uploadReplay` reads the file from (matches src/server/replay.ts). */
const UPLOAD_FIELD_NAME = "file";

/** nodeId -> title lookup for the report (REPLAY-07 — every signal must be tied to a node title, never a bare id/number). */
const nodeTitleById = new Map<string, string>(allNodes.map((n) => [n.id, n.title]));

function nodeTitle(nodeId: string): string {
  return nodeTitleById.get(nodeId) ?? nodeId;
}

/** Timing signals (ms since match start) render as mm:ss; magnitude signals render as a plain number. */
function isTimingSignal(signal: ReplaySignalItem["signal"]): boolean {
  return signal === "buildOrderTiming" || signal === "heroTiming" || signal === "expansionTiming";
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** One actionable report line: "you did X at Y; target for {node} is Z" (REPLAY-07 / D-16) — never a bare stat. */
function formatSignalLine(item: ReplaySignalItem): string {
  const title = nodeTitle(item.nodeId);
  const timing = isTimingSignal(item.signal);
  const targetText = timing ? `before ${formatMs(item.target)}` : `at least ${item.target}`;

  if (item.actual === null) {
    return `${title} — no measurement available from this replay (target: ${targetText}).`;
  }

  const actualText = timing ? formatMs(item.actual) : String(item.actual);
  return `You did ${actualText} — target for "${title}" is ${targetText}.`;
}

// ---------------------------------------------------------------------------
// Route component
// ---------------------------------------------------------------------------

function ReplaysRoute() {
  const { data: session, isPending: sessionPending } = useSession();

  // isPending renders null (empty slot) to prevent a CTA flash on refresh,
  // mirroring SiteHeader's AUTH-02 precedent.
  if (sessionPending) return null;

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          backgroundColor: "var(--color-obsidian-950)",
          color: "var(--color-rune-100, #eee)",
          fontFamily: "var(--font-display)",
          fontSize: "15px",
          textAlign: "center",
          padding: "24px",
        }}
      >
        Sign in with Battle.net to upload or pull replays for analysis.
      </div>
    );
  }

  return <ReplaysSurface />;
}

function ReplaysSurface() {
  const uploadMutation = useUploadReplayMutation();
  const pullMutation = usePullReplaysMutation();

  const [report, setReport] = useState<ReplayReport | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(files: FileList | null) {
    setLocalError(null);
    const file = files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".w3g")) {
      setLocalError("Only .w3g replay files are supported.");
      return;
    }
    if (file.size > MAX_REPLAY_BYTES) {
      setLocalError(
        "Replay file is too large — WC3 replays are typically under 1 MB; files over 4 MB are not supported.",
      );
      return;
    }

    const formData = new FormData();
    formData.append(UPLOAD_FIELD_NAME, file);
    uploadMutation.mutate(formData, { onSuccess: setReport });
  }

  const isBusy = uploadMutation.isPending || pullMutation.isPending;

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-obsidian-950)",
        color: "var(--color-rune-100, #eee)",
        fontFamily: "var(--font-display)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "720px",
        marginInline: "auto",
      }}
    >
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Replay Analysis</h1>
        <p style={{ fontSize: "13px", opacity: 0.75, marginTop: "6px" }}>
          Upload a `.w3g` replay or pull your recent games from w3champions to get
          actionable, node-tied feedback.
        </p>
      </div>

      {/* Drag-drop uploader (REPLAY-04) */}
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          style={{
            border: `2px dashed ${dragActive ? "var(--color-rune-500, #6a5acd)" : "var(--color-obsidian-600, #333)"}`,
            borderRadius: "10px",
            padding: "32px",
            textAlign: "center",
            cursor: "pointer",
            fontSize: "14px",
            opacity: uploadMutation.isPending ? 0.6 : 1,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".w3g"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploadMutation.isPending
            ? "Analyzing replay…"
            : "Drag and drop a .w3g replay here, or click to select a file."}
        </div>

        {/* Client-side rejection — shown inline, never silently dropped (ADR 011 §3). */}
        {localError && (
          <p style={{ color: "var(--color-destructive, #e5484d)", fontSize: "13px", marginTop: "8px" }}>
            {localError}
          </p>
        )}
        {!localError && uploadMutation.error && (
          <p style={{ color: "var(--color-destructive, #e5484d)", fontSize: "13px", marginTop: "8px" }}>
            {uploadMutation.error.message}
          </p>
        )}
      </div>

      {/* Auto-pull CTA (REPLAY-05) */}
      <div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => pullMutation.mutate(undefined, { onSuccess: setReport })}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid var(--color-rune-500, #6a5acd)",
            backgroundColor: "var(--color-rune-600, #4b3f9e)",
            color: "var(--color-rune-100, #fff)",
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isBusy ? "default" : "pointer",
            opacity: isBusy ? 0.6 : 1,
          }}
        >
          {pullMutation.isPending ? "Pulling replays…" : "Pull recent replays from w3champions"}
        </button>
      </div>

      {/* Actionable report (REPLAY-07 / D-16) — rendered from the mutation RESULT. */}
      {report && (
        <section
          style={{
            borderTop: "1px solid var(--color-obsidian-600, #333)",
            paddingTop: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px" }}>
            Analysis report
          </h2>

          {report.signals.length === 0 ? (
            <p style={{ fontSize: "13px", opacity: 0.75 }}>
              No mechanical signals were measured from this replay.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {report.signals.map((item, i) => (
                <li key={`${item.nodeId}-${item.signal}-${i}`} style={{ fontSize: "13px" }}>
                  {formatSignalLine(item)}
                </li>
              ))}
            </ul>
          )}

          {report.advanced.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 8px" }}>
                Nodes advanced
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {report.advanced.map((nodeId) => (
                  <li key={nodeId} style={{ fontSize: "13px" }}>
                    {nodeTitle(nodeId)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
