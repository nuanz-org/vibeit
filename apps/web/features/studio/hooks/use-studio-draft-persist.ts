"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AssetSlots, ToolAssets, ToolParams } from "@repo/contracts";

import { patchToolDraft } from "@/lib/api/tools";

import {
  draftSnapshot,
  paramsToDraftBag,
  toolAssetsToDraftBag,
} from "../lib/draft-assets";

export type DraftSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 600;

export type UseStudioDraftPersistOptions = {
  /** API tool id — null/undefined disables persist (fixtures). */
  toolId?: string | null;
  params: ToolParams;
  assets: ToolAssets;
  assetSlots: AssetSlots;
  /**
   * When true, changes after the baseline seed are auto-saved.
   * Set true only after hydrate completes so we do not PATCH on load.
   */
  ready: boolean;
};

/**
 * M5d: debounced auto-save of Studio params + asset bindings via M5c API.
 * Fixture path (no toolId) stays local-only.
 */
export function useStudioDraftPersist(options: UseStudioDraftPersistOptions) {
  const { toolId, params, assets, assetSlots, ready } = options;

  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const baselineRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const latestRef = useRef({ params, assets, assetSlots, toolId });
  latestRef.current = { params, assets, assetSlots, toolId };

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    const { toolId: id, params: p, assets: a, assetSlots: slots } =
      latestRef.current;
    if (!id) return;

    const snap = draftSnapshot(p, a, slots);
    if (baselineRef.current === snap) {
      setStatus((s) => (s === "dirty" ? "saved" : s));
      return;
    }

    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    setStatus("saving");
    setError(null);
    try {
      await patchToolDraft(id, {
        draftParams: paramsToDraftBag(p),
        draftAssets: toolAssetsToDraftBag(a, slots),
      });
      baselineRef.current = snap;
      setLastSavedAt(new Date().toISOString());
      setStatus("saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void flush();
      }
    }
  }, []);

  const saveNow = useCallback(() => {
    clearTimer();
    void flush();
  }, [clearTimer, flush]);

  // Seed baseline once ready so hydrate does not trigger a save.
  useEffect(() => {
    if (!toolId || !ready) {
      if (!toolId) {
        baselineRef.current = null;
        setStatus("idle");
      }
      return;
    }
    if (baselineRef.current == null) {
      baselineRef.current = draftSnapshot(params, assets, assetSlots);
      setStatus("idle");
    }
  }, [toolId, ready, params, assets, assetSlots]);

  // Debounced dirty → save
  useEffect(() => {
    if (!toolId || !ready || baselineRef.current == null) return;

    const snap = draftSnapshot(params, assets, assetSlots);
    if (snap === baselineRef.current) {
      clearTimer();
      setStatus((s) => (s === "dirty" || s === "error" ? "saved" : s));
      return;
    }

    setStatus((s) => (s === "saving" ? s : "dirty"));
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, DEBOUNCE_MS);

    return clearTimer;
  }, [toolId, ready, params, assets, assetSlots, clearTimer, flush]);

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      clearTimer();
      if (!toolId || baselineRef.current == null) return;
      const { params: p, assets: a, assetSlots: slots } = latestRef.current;
      const snap = draftSnapshot(p, a, slots);
      if (snap !== baselineRef.current) {
        // fire-and-forget; page may unload
        void patchToolDraft(toolId, {
          draftParams: paramsToDraftBag(p),
          draftAssets: toolAssetsToDraftBag(a, slots),
        }).catch(() => {
          /* ignore unload errors */
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, [toolId]);

  return {
    status,
    error,
    lastSavedAt,
    saveNow,
    enabled: Boolean(toolId),
  };
}
