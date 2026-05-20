/**
 * Encrypted-ish local persistence layer for offline-first mode.
 *
 * Uses IndexedDB when available, falling back to localStorage. Sensitive
 * payloads are obfuscated with a lightweight XOR cipher keyed off the
 * current origin — not a substitute for server-side auth, but it prevents
 * casual inspection of cached student data in shared devices.
 */

const DB_NAME = "aura-offline";
const DB_VERSION = 1;
const STORE = "kv";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function cipherKey(): string {
  try {
    return `aura:${typeof location !== "undefined" ? location.origin : "local"}`;
  } catch {
    return "aura:local";
  }
}

function obfuscate(text: string): string {
  const key = cipherKey();
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  if (typeof btoa === "undefined") return out;
  try {
    return btoa(unescape(encodeURIComponent(out)));
  } catch {
    return out;
  }
}

function deobfuscate(payload: string): string {
  const key = cipherKey();
  let text = payload;
  if (typeof atob !== "undefined") {
    try {
      text = decodeURIComponent(escape(atob(payload)));
    } catch {
      text = payload;
    }
  }
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function lsKey(key: string): string {
  return `aura:offline:${key}`;
}

export async function offlineGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
          const raw = req.result as string | undefined;
          if (!raw) return resolve(null);
          try {
            resolve(JSON.parse(deobfuscate(raw)) as T);
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(lsKey(key));
  if (!raw) return null;
  try {
    return JSON.parse(deobfuscate(raw)) as T;
  } catch {
    return null;
  }
}

export async function offlineSet<T>(key: string, value: T): Promise<void> {
  const payload = obfuscate(JSON.stringify(value));
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(payload, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(lsKey(key), payload);
  } catch {
    // quota — silently drop, not worth crashing the app
  }
}

export async function offlineDelete(key: string): Promise<void> {
  const db = await openDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(lsKey(key));
  } catch {
    /* ignore */
  }
}