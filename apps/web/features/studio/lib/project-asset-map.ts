/**
 * Maps Studio tool slots → local asset ids (IndexedDB).
 * Does not store image bytes — see local-asset-store.ts.
 */

const DB_NAME = "aiditr-project-asset-map";
const DB_VERSION = 1;
const STORE = "bindings";

export type SlotBindings = Record<string, string>;

type BindingRow = {
  /** `${toolId}::${slotId}` */
  key: string;
  toolId: string;
  slotId: string;
  localAssetId: string;
  updatedAt: number;
};

function bindingKey(toolId: string, slotId: string): string {
  return `${toolId}::${slotId}`;
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
        const os = db.createObjectStore(STORE, { keyPath: "key" });
        os.createIndex("byTool", "toolId", { unique: false });
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

export async function setSlotBinding(
  toolId: string,
  slotId: string,
  localAssetId: string | null,
): Promise<void> {
  if (!toolId.trim() || !slotId.trim()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const key = bindingKey(toolId, slotId);
    if (localAssetId == null || !localAssetId.trim()) {
      await idbReq(store.delete(key));
    } else {
      const row: BindingRow = {
        key,
        toolId,
        slotId,
        localAssetId: localAssetId.trim(),
        updatedAt: Date.now(),
      };
      await idbReq(store.put(row));
    }
  } finally {
    db.close();
  }
}

export async function getSlotBindings(toolId: string): Promise<SlotBindings> {
  if (!toolId.trim()) return {};
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("byTool");
    const rows = await idbReq<BindingRow[]>(index.getAll(toolId));
    const out: SlotBindings = {};
    for (const row of rows ?? []) {
      if (row?.slotId && row.localAssetId) {
        out[row.slotId] = row.localAssetId;
      }
    }
    return out;
  } finally {
    db.close();
  }
}

export async function getSlotBinding(
  toolId: string,
  slotId: string,
): Promise<string | null> {
  const all = await getSlotBindings(toolId);
  return all[slotId] ?? null;
}
