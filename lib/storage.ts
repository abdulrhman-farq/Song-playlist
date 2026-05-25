import type { Language, PersistedSettings, Track } from "@/types";

const META_KEY = "wedding-playlist:v1";
const LANG_KEY = "wp:lang";
const DB_NAME = "wedding-playlist";
const DB_STORE = "blobs";
const DB_VERSION = 1;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/* ───────────── localStorage: metadata + language ───────────── */

export function loadMeta(): PersistedSettings | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSettings;
    if (!parsed || !Array.isArray(parsed.tracks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMeta(data: PersistedSettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function loadLanguage(): Language | null {
  if (!isBrowser()) return null;
  const v = window.localStorage.getItem(LANG_KEY);
  return v === "ar" || v === "en" ? v : null;
}

export function saveLanguage(lang: Language): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LANG_KEY, lang);
}

/* ───────────── IndexedDB: audio blobs ───────────── */

function openDB(): Promise<IDBDatabase> {
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

export async function putBlob(key: string, blob: Blob): Promise<void> {
  if (!isBrowser() || !("indexedDB" in window)) return;
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
  db.close();
}

export async function getBlob(key: string): Promise<Blob | null> {
  if (!isBrowser() || !("indexedDB" in window)) return null;
  const db = await openDB();
  const blob = await new Promise<Blob | null>((res, rej) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const r = tx.objectStore(DB_STORE).get(key);
    r.onsuccess = () => res((r.result as Blob | undefined) ?? null);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return blob;
}

export async function deleteBlob(key: string): Promise<void> {
  if (!isBrowser() || !("indexedDB" in window)) return;
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function clearBlobs(): Promise<void> {
  if (!isBrowser() || !("indexedDB" in window)) return;
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

/** Strip non-serializable fields from tracks before persisting. */
export function sanitizeTracksForSave(tracks: Track[]): Track[] {
  return tracks.map((tr) =>
    tr.source === "upload"
      ? {
          id: tr.id,
          source: "upload",
          title: tr.title,
          duration: tr.duration,
          note: tr.note,
          startAt: tr.startAt,
          endAt: tr.endAt,
          sectionId: tr.sectionId,
          blobName: tr.blobName,
          mimeType: tr.mimeType,
          fileSize: tr.fileSize,
        }
      : {
          id: tr.id,
          source: "youtube",
          title: tr.title,
          duration: tr.duration,
          note: tr.note,
          startAt: tr.startAt,
          endAt: tr.endAt,
          sectionId: tr.sectionId,
          youtubeId: tr.youtubeId,
          url: tr.url,
        },
  );
}
