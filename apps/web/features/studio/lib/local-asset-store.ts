/**
 * Local-first personalization media (IndexedDB).
 * Studio slot binds use this instead of POST /api/v1/assets.
 * @see md/local-first-assets.md
 */

const DB_NAME = "aiditr-local-assets";
const DB_VERSION = 1;
const STORE = "assets";

export const LOCAL_ASSET_MAX_BYTES = 10 * 1024 * 1024;
export const LOCAL_ASSET_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
};

export type LocalAssetRecord = {
  id: string;
  mime: string;
  name: string;
  byteLength: number;
  width?: number;
  height?: number;
  createdAt: number;
  lastUsedAt: number;
  /** Stored in IDB only */
  blob: Blob;
};

export class LocalAssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalAssetValidationError";
  }
}

function normalizeMime(raw: string | undefined | null): string {
  const ct = (raw || "").split(";")[0]?.trim().toLowerCase() || "";
  return MIME_ALIASES[ct] ?? ct;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () =>
      reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB request failed"));
  });
}

/** In-memory object URL cache: localAssetId → blob: URL */
const objectUrlCache = new Map<string, string>();

async function readImageSize(
  blob: Blob,
): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      const size = { width: bmp.width, height: bmp.height };
      bmp.close();
      return size;
    } catch {
      /* fall through */
    }
  }
  return {};
}

function inferMimeFromName(name: string | undefined): string {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export async function putLocalAsset(file: File | Blob, name?: string): Promise<LocalAssetRecord> {
  const fileName = file instanceof File ? file.name : name;
  const mime = normalizeMime(file.type) || inferMimeFromName(fileName);
  if (!LOCAL_ASSET_ALLOWED_MIME.has(mime)) {
    throw new LocalAssetValidationError(
      `content type not allowed: ${mime || "(empty)"}; allowed: png, jpeg, webp`,
    );
  }
  if (!file.size) {
    throw new LocalAssetValidationError("empty file");
  }
  if (file.size > LOCAL_ASSET_MAX_BYTES) {
    throw new LocalAssetValidationError(
      `file too large: ${file.size} bytes (max ${LOCAL_ASSET_MAX_BYTES})`,
    );
  }

  const blob =
    file instanceof Blob && file.type === mime
      ? file
      : new Blob([await file.arrayBuffer()], { type: mime });
  const size = await readImageSize(blob);
  const now = Date.now();
  const record: LocalAssetRecord = {
    id: newId(),
    mime,
    name:
      (file instanceof File ? file.name : name) ||
      `upload.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`,
    byteLength: blob.size,
    width: size.width,
    height: size.height,
    createdAt: now,
    lastUsedAt: now,
    blob,
  };

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put(record));
  } finally {
    db.close();
  }
  return record;
}

export async function getLocalAsset(
  id: string,
): Promise<LocalAssetRecord | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await idbReq<LocalAssetRecord | undefined>(
      tx.objectStore(STORE).get(id),
    );
    return row ?? null;
  } finally {
    db.close();
  }
}

export async function touchLocalAsset(id: string): Promise<void> {
  const row = await getLocalAsset(id);
  if (!row) return;
  row.lastUsedAt = Date.now();
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put(row));
  } finally {
    db.close();
  }
}

export async function deleteLocalAsset(id: string): Promise<void> {
  revokeLocalObjectUrl(id);
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

/**
 * Resolve a stable object URL for harness/img tags.
 * Cached per id; call {@link revokeLocalObjectUrl} on clear/replace.
 */
export async function getLocalObjectUrl(id: string): Promise<string | null> {
  const cached = objectUrlCache.get(id);
  if (cached) {
    void touchLocalAsset(id);
    return cached;
  }
  const row = await getLocalAsset(id);
  if (!row?.blob) return null;
  const url = URL.createObjectURL(row.blob);
  objectUrlCache.set(id, url);
  void touchLocalAsset(id);
  return url;
}

export function revokeLocalObjectUrl(id: string): void {
  const url = objectUrlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(id);
  }
}

/** Test helper: clear URL cache without touching IDB. */
export function clearLocalObjectUrlCache(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
