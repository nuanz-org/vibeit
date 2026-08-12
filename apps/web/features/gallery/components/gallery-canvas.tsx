"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { LayoutGroup, useReducedMotion } from "motion/react";

import type { GalleryCard as GalleryCardType } from "@/lib/api/gallery";
import { cn } from "@/lib/utils";

import {
  allSlotsForChunks,
  CHUNK_SIZE,
  chunksAround,
  type CanvasSlot,
} from "../lib/canvas-layout";
import { CANVAS_PHYSICS } from "../lib/gallery-motion";
import { GalleryCanvasCard } from "./gallery-canvas-card";
import { GalleryFocus } from "./gallery-focus";

export type GalleryCanvasProps = {
  items: GalleryCardType[];
  className?: string;
  /** Called when pan approaches edges so parent can load more pages. */
  onNeedMore?: () => void;
  hasMore?: boolean;
};

type Cam = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
};

/**
 * Infinite 2D gallery canvas — Codrops-style chunk streaming + inertia pan.
 * Click a card to open it with a shared-element Motion storyboard.
 */
export function GalleryCanvas({
  items,
  className,
  onNeedMore,
  hasMore,
}: GalleryCanvasProps) {
  const reduce = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<Cam>({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const lastPtrRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [chunkKeys, setChunkKeys] = useState(() =>
    chunksAround(0, 0)
      .map((c) => c.key)
      .join("|"),
  );
  const [selected, setSelected] = useState<{
    instanceId: string;
    publicId: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const itemById = useMemo(() => {
    const m = new Map<string, GalleryCardType>();
    for (const it of items) m.set(it.publicId, it);
    return m;
  }, [items]);

  const itemsLen = items.length;

  const slots: Array<CanvasSlot & { card: GalleryCardType }> = useMemo(() => {
    if (itemsLen === 0) return [];
    const chunks = chunkKeys.split("|").map((key) => {
      const [cx, cy] = key.split(",").map(Number);
      return { key, cx: cx ?? 0, cy: cy ?? 0 };
    });
    const raw = allSlotsForChunks(chunks);
    return raw
      .map((slot) => {
        const card = items[slot.mediaIndex % itemsLen];
        if (!card) return null;
        return { ...slot, card };
      })
      .filter(Boolean) as Array<CanvasSlot & { card: GalleryCardType }>;
  }, [chunkKeys, items, itemsLen]);

  const applyTransform = useCallback(() => {
    const el = worldRef.current;
    if (!el) return;
    const { x, y } = camRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const syncChunks = useCallback(() => {
    const { x, y } = camRef.current;
    const next = chunksAround(x, y)
      .map((c) => c.key)
      .join("|");
    setChunkKeys((prev) => (prev === next ? prev : next));
  }, []);

  // Inertia + drag integration loop
  useEffect(() => {
    if (reduce) {
      applyTransform();
      return;
    }

    let alive = true;
    const tick = () => {
      if (!alive) return;
      const c = camRef.current;
      if (draggingRef.current) {
        c.vx = c.vx * (1 - CANVAS_PHYSICS.velocityLerp) + c.tx * CANVAS_PHYSICS.velocityLerp;
        c.vy = c.vy * (1 - CANVAS_PHYSICS.velocityLerp) + c.ty * CANVAS_PHYSICS.velocityLerp;
      } else {
        c.vx *= CANVAS_PHYSICS.velocityDecay;
        c.vy *= CANVAS_PHYSICS.velocityDecay;
        c.tx *= CANVAS_PHYSICS.velocityDecay;
        c.ty *= CANVAS_PHYSICS.velocityDecay;
      }

      const speed = Math.hypot(c.vx, c.vy);
      if (speed > CANVAS_PHYSICS.maxSpeed) {
        const s = CANVAS_PHYSICS.maxSpeed / speed;
        c.vx *= s;
        c.vy *= s;
      }

      if (
        speed > CANVAS_PHYSICS.restEpsilon ||
        draggingRef.current ||
        Math.hypot(c.tx, c.ty) > CANVAS_PHYSICS.restEpsilon
      ) {
        c.x += c.vx;
        c.y += c.vy;
        applyTransform();
        syncChunks();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [applyTransform, reduce, syncChunks]);

  useEffect(() => {
    setReady(true);
    // Center first view slightly into origin chunk
    camRef.current.x = -CHUNK_SIZE * 0.15;
    camRef.current.y = -CHUNK_SIZE * 0.12;
    applyTransform();
    syncChunks();
  }, [applyTransform, syncChunks]);

  // Request more gallery pages as the user explores
  useEffect(() => {
    if (!hasMore || !onNeedMore) return;
    const traveled = Math.hypot(camRef.current.x, camRef.current.y);
    if (traveled > CHUNK_SIZE * 0.6) onNeedMore();
  }, [chunkKeys, hasMore, onNeedMore]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (selected) return;
    if (e.button !== 0) return;
    // Clicks on cards must not start pan / capture — they open tool detail.
    const t = e.target as HTMLElement | null;
    if (t?.closest?.("[data-gallery-card]")) return;

    draggingRef.current = true;
    movedRef.current = false;
    setIsDragging(true);
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    camRef.current.tx = 0;
    camRef.current.ty = 0;
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current || selected) return;
    const dx = e.clientX - lastPtrRef.current.x;
    const dy = e.clientY - lastPtrRef.current.y;
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    if (Math.hypot(dx, dy) > 2) movedRef.current = true;

    if (reduce) {
      camRef.current.x += dx * CANVAS_PHYSICS.dragScale;
      camRef.current.y += dy * CANVAS_PHYSICS.dragScale;
      applyTransform();
      syncChunks();
      return;
    }

    camRef.current.tx = dx * CANVAS_PHYSICS.dragScale;
    camRef.current.ty = dy * CANVAS_PHYSICS.dragScale;
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    camRef.current.tx = 0;
    camRef.current.ty = 0;
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  // Non-passive wheel so we can pan without scrolling the page
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      if (selected) return;
      e.preventDefault();
      const dx = -e.deltaX * CANVAS_PHYSICS.wheelScale;
      const dy = -e.deltaY * CANVAS_PHYSICS.wheelScale;
      if (reduce) {
        camRef.current.x += dx;
        camRef.current.y += dy;
        applyTransform();
        syncChunks();
        return;
      }
      camRef.current.tx += dx * 0.35;
      camRef.current.ty += dy * 0.35;
      camRef.current.vx += dx * 0.2;
      camRef.current.vy += dy * 0.2;
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [applyTransform, reduce, selected, syncChunks]);

  // Keyboard pan when canvas focused
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (selected) return;
      const step = e.shiftKey ? 80 : 36;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = step;
      else if (e.key === "ArrowRight") dx = -step;
      else if (e.key === "ArrowUp") dy = step;
      else if (e.key === "ArrowDown") dy = -step;
      else return;
      e.preventDefault();
      camRef.current.x += dx;
      camRef.current.y += dy;
      if (!reduce) {
        camRef.current.vx += dx * 0.15;
        camRef.current.vy += dy * 0.15;
      }
      applyTransform();
      syncChunks();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [applyTransform, reduce, selected, syncChunks]);

  const handleSelect = useCallback((instanceId: string, publicId: string) => {
    // Open tool detail only — never auto-run the tool.
    setSelected({ instanceId, publicId });
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  const selectedCard = selected
    ? itemById.get(selected.publicId) ?? null
    : null;

  return (
    <LayoutGroup id="gallery-canvas">
      <div className={cn("relative min-h-0 flex-1", className)}>
        <div
          ref={viewportRef}
          tabIndex={0}
          role="application"
          aria-label="Infinite gallery canvas. Drag to pan, click a card for tool details."
          className={cn(
            "absolute inset-0 touch-none overflow-hidden outline-none",
            "bg-stage",
            isDragging ? "cursor-grabbing" : "cursor-grab",
            selected && "cursor-default",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* Soft vignette — depth without decorative grid */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(120%_90%_at_50%_40%,transparent_40%,color-mix(in_oklch,var(--background)_55%,transparent)_100%)]"
            aria-hidden
          />

          <div
            ref={worldRef}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: 1, height: 1 }}
          >
            {slots.map((slot, i) => (
              <GalleryCanvasCard
                key={slot.instanceId}
                slot={slot}
                card={slot.card}
                selected={selected?.instanceId === slot.instanceId}
                dimmed={
                  selected != null && selected.instanceId !== slot.instanceId
                }
                onSelect={handleSelect}
                index={i}
                ready={ready}
              />
            ))}
          </div>
        </div>

        <GalleryFocus
          card={selectedCard}
          instanceId={selected?.instanceId ?? null}
          onClose={handleClose}
        />
      </div>
    </LayoutGroup>
  );
}
