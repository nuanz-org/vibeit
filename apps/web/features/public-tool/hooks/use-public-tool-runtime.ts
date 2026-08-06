"use client";

import { useCallback, useRef, useState } from "react";

import type { ToolParams } from "@repo/contracts";

import {
  RuntimeCompileError,
  compilePublicTool,
} from "@/lib/api/runtime-compile";
import {
  RuntimeBridgeError,
  waitForPaintFrames,
  type ReadyMessage,
  type RuntimeHostHandle,
  type RuntimeHostStatus,
} from "@/runtime";

function formatErr(err: unknown): string {
  if (err instanceof RuntimeBridgeError) {
    return `${err.code}: ${err.message}`;
  }
  if (err instanceof RuntimeCompileError) {
    const detail =
      err.details && err.details.length > 0
        ? ` (${err.details.join("; ")})`
        : "";
    return `Compile failed: ${err.message}${detail}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown runtime error";
}

export type UsePublicToolRuntimeOptions = {
  publicId: string;
  /** Logging / mount tool id (publicId is fine). */
  runtimeToolId: string;
  defaultParams?: ToolParams | null;
};

/**
 * Thin public runtime (M7e): compile-by-publicId + mount + apply version defaults.
 * No draft persist, no Control chrome, no owner APIs.
 */
export function usePublicToolRuntime(options: UsePublicToolRuntimeOptions) {
  const hostRef = useRef<RuntimeHostHandle>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const compileCacheRef = useRef<{ key: string; js: string } | null>(null);

  const [status, setStatus] = useState<RuntimeHostStatus>("idle");
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveModuleSource = useCallback(async (): Promise<string> => {
    const publicId = optsRef.current.publicId;
    const cached = compileCacheRef.current;
    if (cached && cached.key === publicId) {
      return cached.js;
    }
    const js = await compilePublicTool(publicId);
    compileCacheRef.current = { key: publicId, js };
    return js;
  }, []);

  const onStatusChange = useCallback((s: RuntimeHostStatus) => {
    setStatus(s);
  }, []);

  const onReady = useCallback(
    async (_message: ReadyMessage) => {
      setError(null);
      setBusy(true);
      setMounted(false);
      try {
        const host = hostRef.current;
        if (!host) return;

        const opts = optsRef.current;
        const moduleSource = await resolveModuleSource();
        const defaults = opts.defaultParams ?? {};

        await host.mountTool(defaults, undefined, {
          toolId: opts.runtimeToolId,
          target: "canvas2d",
          moduleSource,
        });

        if (Object.keys(defaults).length > 0) {
          await host.updateParams(defaults);
        }
        await waitForPaintFrames();
        setMounted(true);
      } catch (err) {
        setError(formatErr(err));
        setMounted(false);
      } finally {
        setBusy(false);
      }
    },
    [resolveModuleSource],
  );

  const onBridgeError = useCallback((err: RuntimeBridgeError) => {
    setError(`${err.code}: ${err.message}`);
  }, []);

  return {
    hostRef,
    status,
    mounted,
    busy,
    error,
    onStatusChange,
    onReady,
    onBridgeError,
  };
}
