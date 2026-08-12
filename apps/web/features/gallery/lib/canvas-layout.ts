/**
 * Deterministic chunk layout for the infinite gallery canvas.
 * Same chunk coordinates always yield the same card slots so
 * chunks can be destroyed/recreated without visual jumps.
 */

export const CHUNK_SIZE = 1280;
/** How many neighbor rings around the camera chunk stay mounted. */
export const CHUNK_RADIUS = 1;
/** Slots (card planes) per chunk. */
export const SLOTS_PER_CHUNK = 7;

export type CardSize = {
  w: number;
  h: number;
};

export type CanvasSlot = {
  /** Stable identity for this plane instance (unique across chunks). */
  instanceId: string;
  chunkX: number;
  chunkY: number;
  slot: number;
  /** World position of top-left of the card. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Maps onto finite media via modulo. */
  mediaIndex: number;
  /** Subtle resting rotation in degrees. */
  rotate: number;
};

const SIZE_VARIANTS: CardSize[] = [
  { w: 240, h: 300 },
  { w: 280, h: 210 },
  { w: 220, h: 220 },
  { w: 300, h: 200 },
  { w: 260, h: 320 },
  { w: 200, h: 260 },
  { w: 320, h: 240 },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded [0, 1) from integer seed. */
function seeded01(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function seededIn(seed: number, min: number, max: number): number {
  return min + seeded01(seed) * (max - min);
}

/**
 * Generate plane slots for one chunk. Layout is deterministic for (cx, cy).
 */
export function generateChunkSlots(cx: number, cy: number): CanvasSlot[] {
  const seed = hashString(`${cx},${cy}`);
  const slots: CanvasSlot[] = [];
  const pad = 48;

  for (let i = 0; i < SLOTS_PER_CHUNK; i++) {
    const s = seed + i * 9973;
    const size = SIZE_VARIANTS[i % SIZE_VARIANTS.length]!;
    const maxX = CHUNK_SIZE - size.w - pad;
    const maxY = CHUNK_SIZE - size.h - pad;

    // Soft grid + jitter keeps density even without hard collisions
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cellW = CHUNK_SIZE / 3;
    const cellH = CHUNK_SIZE / 3;
    const baseX = col * cellW + pad * 0.5;
    const baseY = row * cellH + pad * 0.5;
    const jitterX = seededIn(s + 1, -28, 48);
    const jitterY = seededIn(s + 2, -24, 40);

    const x = cx * CHUNK_SIZE + Math.min(maxX, Math.max(pad, baseX + jitterX));
    const y = cy * CHUNK_SIZE + Math.min(maxY, Math.max(pad, baseY + jitterY));

    slots.push({
      instanceId: `${cx}:${cy}:${i}`,
      chunkX: cx,
      chunkY: cy,
      slot: i,
      x,
      y,
      w: size.w,
      h: size.h,
      mediaIndex: Math.floor(seededIn(s + 5, 0, 1_000_000)),
      rotate: seededIn(s + 7, -2.2, 2.2),
    });
  }

  return slots;
}

const planeCache = new Map<string, CanvasSlot[]>();
const MAX_CACHE = 128;

export function generateChunkSlotsCached(
  cx: number,
  cy: number,
): CanvasSlot[] {
  const key = `${cx},${cy}`;
  const hit = planeCache.get(key);
  if (hit) {
    planeCache.delete(key);
    planeCache.set(key, hit);
    return hit;
  }
  const slots = generateChunkSlots(cx, cy);
  planeCache.set(key, slots);
  while (planeCache.size > MAX_CACHE) {
    const first = planeCache.keys().next().value;
    if (first != null) planeCache.delete(first);
    else break;
  }
  return slots;
}

export type ActiveChunk = {
  key: string;
  cx: number;
  cy: number;
};

/** 3×3 (or larger) neighborhood of chunks around camera. */
export function chunksAround(
  camX: number,
  camY: number,
  radius = CHUNK_RADIUS,
): ActiveChunk[] {
  const cx = Math.floor(-camX / CHUNK_SIZE);
  const cy = Math.floor(-camY / CHUNK_SIZE);
  const out: ActiveChunk[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      out.push({ key: `${x},${y}`, cx: x, cy: y });
    }
  }
  return out;
}

export function allSlotsForChunks(chunks: ActiveChunk[]): CanvasSlot[] {
  const slots: CanvasSlot[] = [];
  for (const c of chunks) {
    slots.push(...generateChunkSlotsCached(c.cx, c.cy));
  }
  return slots;
}
