import type { Playlist, Track } from "@/types";

const PLAYLIST_KEY = "wedding-playlist:v1:playlist";
const LANG_KEY = "wedding-playlist:v1:lang";
const DB_NAME = "wedding-playlist";
const DB_STORE = "audio-blobs";
const DB_VERSION = 1;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadPlaylist(): Playlist | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PLAYLIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Playlist;
    if (!parsed || !Array.isArray(parsed.tracks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlaylist(playlist: Playlist): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlist));
  } catch {
    // ignore quota errors
  }
}

export function loadLanguage(): "ar" | "en" | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(LANG_KEY);
  return value === "ar" || value === "en" ? value : null;
}

export function saveLanguage(lang: "ar" | "en"): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LANG_KEY, lang);
}

/* ---------------- IndexedDB for uploaded audio blobs ---------------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAudioBlob(id: string, blob: Blob): Promise<void> {
  if (!isBrowser() || !("indexedDB" in window)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  if (!isBrowser() || !("indexedDB" in window)) return null;
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deleteAudioBlob(id: string): Promise<void> {
  if (!isBrowser() || !("indexedDB" in window)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Rebuild object URLs for any uploaded tracks by reading their blobs
 * back from IndexedDB. Returns a map of track id → object URL.
 * Tracks whose blob is missing are silently skipped — they will be
 * shown as unplayable in the UI.
 */
export async function rehydrateUploadUrls(
  tracks: Track[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const t of tracks) {
    if (t.source !== "upload") continue;
    const blob = await getAudioBlob(t.id);
    if (blob) {
      result[t.id] = URL.createObjectURL(blob);
    }
  }
  return result;
}
