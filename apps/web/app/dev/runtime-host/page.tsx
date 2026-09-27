"use client";

/**
 * M2a3/M2a4 smoke page: social-frame mount/update/capture (+ optional logo data URL).
 * Not a product surface — remove or gate before public launch (M9).
 */

import { useCallback, useRef, useState, type CSSProperties } from "react";

import { Alert } from "@/components/icons";
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

  const inputCls =
    "block h-9 w-full rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-[180ms] ease-standard hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none";
  const labelCls = "flex flex-col gap-1.5 text-[12.5px] font-medium text-fg";

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 pt-8 pb-16 text-fg">
      <h1 className="t-h3">Dev · Runtime host (M2a4)</h1>
      <p className="mt-1 mb-5 text-[14px] text-muted">
        Social-frame reference tool: params, motion, logo slot, PNG capture.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill status={status} />
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void runMount()}>
          Mount
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void runUpdate()}>
          Update params
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void runSetLogo()}>
          Set logo
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void runCapture()}>
          Capture PNG
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void runDispose()}>
          Dispose
        </button>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        <label className={labelCls}>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Accent
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-9 w-full cursor-pointer rounded-[8px] border border-border bg-bg p-1"
          />
        </label>
        <label className={labelCls}>
          Background
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-9 w-full cursor-pointer rounded-[8px] border border-border bg-bg p-1"
          />
        </label>
        <label className={labelCls}>
          <span>
            Speed{" "}
            <span className="t-mono text-[11.5px] font-normal text-muted">
              {speed.toFixed(2)}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="range"
            style={{ "--pct": `${(speed / 3) * 100}%` } as CSSProperties}
          />
        </label>
        <label className={labelCls}>
          Motion
          <select
            value={motionPreset}
            onChange={(e) =>
              setMotionPreset(e.target.value as "pulse" | "drift" | "none")
            }
            className={inputCls}
          >
            <option value="pulse">Pulse</option>
            <option value="drift">Drift</option>
            <option value="none">Still</option>
          </select>
        </label>
        <label className="flex items-end gap-2 text-[12.5px] font-medium text-fg">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="size-4 accent-fg"
          />
          Show grid
        </label>
      </div>

      {ready ? (
        <pre className="t-mono overflow-auto rounded-[8px] border border-border bg-band px-4 py-3 text-[12px] text-fg">
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
        <p role="alert" className="mt-4 flex items-start gap-2 text-[13.5px] text-fg">
          <Alert size={14} className="mt-0.5 shrink-0" />
          <span>Error: {lastError}</span>
        </p>
      ) : null}

      <div
        className={`mt-4 grid items-start gap-4 ${previewUrl ? "grid-cols-[1fr_180px]" : "grid-cols-1"}`}
      >
        <div className="mx-auto h-[480px] w-full max-w-[320px] overflow-hidden rounded-[12px] border border-border bg-workspace">
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
            className="h-auto w-full rounded-[12px] border border-border bg-surface"
          />
        ) : null}
      </div>

      <h2 className="t-label mt-6 text-muted">Log</h2>
      <ul className="t-mono mt-2 text-[12px] text-muted">
        {log.map((line, i) => (
          <li key={`${i}-${line}`} className="py-0.5">
            {line}
          </li>
        ))}
      </ul>
    </main>
  );
}

function StatusPill({ status }: { status: RuntimeHostStatus }) {
  return (
    <span
      className={`t-label inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-[10px] ${
        status === "error" ? "text-fg" : "text-muted"
      }`}
    >
      {status === "error" ? (
        <Alert size={11} />
      ) : (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${
            status === "ready"
              ? "bg-accent-text"
              : status === "loading"
                ? "live-dot bg-accent-text"
                : "border border-border-strong"
          }`}
        />
      )}
      {status}
    </span>
  );
}
