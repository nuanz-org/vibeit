"use client";

/**
 * M2a3/M2a4 smoke page: social-frame mount/update/capture (+ optional logo data URL).
 * Not a product surface — remove or gate before public launch (M9).
 */

import { useCallback, useRef, useState } from "react";

import {
  RuntimeBridgeError,
  RuntimeHost,
  captureFrameWireToBlob,
  type ReadyMessage,
  type RuntimeHostHandle,
  type RuntimeHostStatus,
  type ToolIntrospection,
} from "@/runtime";

/** Tiny purple mark as data URL so setAssets works without upload (M2a6 = real upload). */
const DEMO_LOGO_DATA_URL =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill="#1a1a24"/>
      <circle cx="64" cy="64" r="36" fill="#7c5cff"/>
      <text x="64" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#fff">V</text>
    </svg>`,
  );

export default function DevRuntimeHostPage() {
  const hostRef = useRef<RuntimeHostHandle>(null);
  const [status, setStatus] = useState<RuntimeHostStatus>("idle");
  const [ready, setReady] = useState<ReadyMessage | null>(null);
  const [introspection, setIntrospection] = useState<ToolIntrospection | null>(
    null,
  );
  const [title, setTitle] = useState("Your vibe");
  const [accent, setAccent] = useState("#7c5cff");
  const [bg, setBg] = useState("#0b0b12");
  const [speed, setSpeed] = useState(1);
  const [motionPreset, setMotionPreset] = useState<"pulse" | "drift" | "none">(
    "pulse",
  );
  const [showGrid, setShowGrid] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const pushLog = useCallback((line: string) => {
    setLog((prev) =>
      [`${new Date().toISOString().slice(11, 19)}  ${line}`, ...prev].slice(
        0,
        50,
      ),
    );
  }, []);

  const onReady = useCallback(
    (message: ReadyMessage) => {
      setReady(message);
      pushLog(
        `READY target=${message.target} captureFrame=${String(message.capabilities?.captureFrame)}`,
      );
    },
    [pushLog],
  );

  function formatErr(err: unknown): string {
    if (err instanceof RuntimeBridgeError) {
      return `${err.code}: ${err.message}`;
    }
    if (err instanceof Error) return err.message;
    return "unknown error";
  }

  function currentParams() {
    return {
      title,
      accent,
      bg,
      speed,
      motionPreset,
      showGrid,
      logoSlot: "logo",
    };
  }

  async function runMount() {
    setLastError(null);
    try {
      const info = await hostRef.current?.mountTool(currentParams());
      if (info) {
        setIntrospection(info);
        pushLog(
          `mount social-frame → schema=${info.paramSchema.length} slots=${info.assetSlots.map((s) => s.id).join(",")}`,
        );
      }
    } catch (err) {
      const msg = formatErr(err);
      setLastError(msg);
      pushLog(`mount error → ${msg}`);
    }
  }

  async function runUpdate() {
    setLastError(null);
    try {
      await hostRef.current?.updateParams(currentParams());
      pushLog(
        `update → title=${title} motion=${motionPreset} grid=${String(showGrid)}`,
      );
    } catch (err) {
      const msg = formatErr(err);
      setLastError(msg);
      pushLog(`update error → ${msg}`);
    }
  }

  async function runSetLogo() {
    setLastError(null);
    try {
      await hostRef.current?.setAssets({ logo: DEMO_LOGO_DATA_URL });
      pushLog("setAssets → logo (demo data URL)");
    } catch (err) {
      const msg = formatErr(err);
      setLastError(msg);
      pushLog(`setAssets error → ${msg}`);
    }
  }

  async function runCapture() {
    setLastError(null);
    try {
      const frame = await hostRef.current?.captureFrame();
      if (!frame) return;
      const blob = captureFrameWireToBlob(frame);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      pushLog(
        `captureFrame → ${frame.mimeType} bytes≈${frame.byteLength ?? "?"} b64len=${frame.base64.length}`,
      );
    } catch (err) {
      const msg = formatErr(err);
      setLastError(msg);
      pushLog(`capture error → ${msg}`);
    }
  }

  async function runDispose() {
    setLastError(null);
    try {
      await hostRef.current?.disposeTool();
      setIntrospection(null);
      pushLog("dispose → ok");
    } catch (err) {
      const msg = formatErr(err);
      setLastError(msg);
      pushLog(`dispose error → ${msg}`);
    }
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>
        Dev · Runtime host (M2a4)
      </h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: "1.25rem" }}>
        Social-frame reference tool: params, motion, logo slot, PNG capture.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <StatusPill status={status} />
        <button type="button" onClick={() => void runMount()}>
          mount
        </button>
        <button type="button" onClick={() => void runUpdate()}>
          update params
        </button>
        <button type="button" onClick={() => void runSetLogo()}>
          set logo
        </button>
        <button type="button" onClick={() => void runCapture()}>
          capture PNG
        </button>
        <button type="button" onClick={() => void runDispose()}>
          dispose
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
          fontSize: 13,
        }}
      >
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label>
          Accent
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <label>
          Background
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            style={{ display: "block", marginTop: 4 }}
          />
        </label>
        <label>
          Speed ({speed.toFixed(2)})
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label>
          Motion
          <select
            value={motionPreset}
            onChange={(e) =>
              setMotionPreset(e.target.value as "pulse" | "drift" | "none")
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            <option value="pulse">Pulse</option>
            <option value="drift">Drift</option>
            <option value="none">Still</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Show grid
        </label>
      </div>

      {ready ? (
        <pre
          style={{
            background: "#111",
            color: "#d4d4d8",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            fontSize: 12,
            overflow: "auto",
          }}
        >
          {JSON.stringify(
            {
              ready,
              introspection: introspection
                ? {
                    defaultParams: introspection.defaultParams,
                    schema: introspection.paramSchema.map((f) => f.name),
                    slots: introspection.assetSlots.map((s) => s.id),
                  }
                : null,
            },
            null,
            2,
          )}
        </pre>
      ) : null}

      {lastError ? (
        <p style={{ color: "#b91c1c", fontSize: 14 }}>Error: {lastError}</p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: previewUrl ? "1fr 180px" : "1fr",
          gap: "1rem",
          marginTop: "1rem",
          alignItems: "start",
        }}
      >
        <div
          style={{
            height: 480,
            maxWidth: 320,
            margin: "0 auto",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e4e4e7",
            background: "#0a0a0c",
          }}
        >
          <RuntimeHost
            ref={hostRef}
            onReady={onReady}
            onStatusChange={(s) => {
              setStatus(s);
              pushLog(`status → ${s}`);
            }}
            onBridgeError={(err) => {
              setLastError(`${err.code}: ${err.message}`);
              pushLog(`bridge error → ${err.code}: ${err.message}`);
            }}
            onUnhandledError={(msg) => {
              pushLog(`unhandled frame error → ${msg.code}: ${msg.message}`);
            }}
          />
        </div>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Captured frame"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              background: "#fff",
            }}
          />
        ) : null}
      </div>

      <h2 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Log</h2>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 12,
          color: "#3f3f46",
        }}
      >
        {log.map((line, i) => (
          <li key={`${i}-${line}`} style={{ padding: "0.2rem 0" }}>
            {line}
          </li>
        ))}
      </ul>
    </main>
  );
}

function StatusPill({ status }: { status: RuntimeHostStatus }) {
  const color =
    status === "ready"
      ? "#15803d"
      : status === "error"
        ? "#b91c1c"
        : status === "loading"
          ? "#a16207"
          : "#52525b";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        background: `${color}18`,
        color,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}
