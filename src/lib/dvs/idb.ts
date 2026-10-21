/**
 * IndexedDB-backed storage for the zustand persist middleware.
 *
 * Replaces the old localStorage adapter: localStorage caps out around 5 MB and
 * the previous fallback silently stripped photos and signatures from archived
 * jobs once the quota was hit. IndexedDB has orders of magnitude more room, so
 * saved jobs keep their photos and signature.
 *
 * One-time migration: if IndexedDB has nothing yet but the legacy localStorage
 * key exists (data saved by the earlier build), it is copied over and the
 * legacy key is removed.
 */

const DB_NAME = "dvs-field-suite";
const STORE_NAME = "kv";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const memoryFallback = new Map<string, string>();
const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let failed = false;

export const STORAGE_ERROR_EVENT = "dvs-storage-error";

function reportFailure() {
  if (failed) return;
  failed = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORAGE_ERROR_EVENT));
}

/** Write everything queued to IndexedDB now. Resolves true when it all landed. */
export async function flushStorage(): Promise<boolean> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = [...pending.entries()];
  pending.clear();
  let ok = true;
  for (const [name, value] of batch) {
    try {
      await idbSet(name, value);
    } catch {
      ok = false;
    }
  }
  if (ok) failed = false;
  else reportFailure();
  return ok;
}

/** Ask the browser not to evict this origin's data under storage pressure. */
export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* best effort */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => void flushStorage());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushStorage();
  });
}

/** Async key/value storage matching zustand's StateStorage contract. */
export const idbStorage = {
  async getItem(name: string): Promise<string | null> {
    const queued = pending.get(name);
    if (queued !== undefined) return queued;
    try {
      const hit = await idbGet(name);
      if (hit !== null) return hit;
      // One-time migration from the legacy localStorage build.
      const legacy = localStorage.getItem(name);
      if (legacy !== null) {
        try {
          await idbSet(name, legacy);
          localStorage.removeItem(name);
        } catch {
          /* keep the legacy copy if the migration write fails */
        }
        return legacy;
      }
      return memoryFallback.get(name) ?? null;
    } catch {
      reportFailure();
      return memoryFallback.get(name) ?? null;
    }
  },
  /** Debounced: the whole state is serialized, so batch rapid edits into one write. */
  async setItem(name: string, value: string): Promise<void> {
    memoryFallback.set(name, value);
    pending.set(name, value);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flushStorage(), 600);
  },
  async removeItem(name: string): Promise<void> {
    memoryFallback.delete(name);
    pending.delete(name);
    try {
      await idbRemove(name);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
