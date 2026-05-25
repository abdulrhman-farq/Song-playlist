import type { TimelineDoc, TimelineEntry } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:timeline";
/**
 * Bump this whenever `defaultTimeline()` changes meaningfully. On
 * load, any persisted doc with a missing or older version is
 * replaced by the current default. Once the user edits, the new
 * version stamp is saved alongside their changes and survives.
 */
const SEED_VERSION = 2;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadTimeline(): TimelineDoc | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimelineDoc;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    if ((parsed.version ?? 0) < SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTimeline(doc: TimelineDoc): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...doc, version: SEED_VERSION }),
    );
  } catch {
    /* quota — ignore */
  }
}

/**
 * Real wedding-day schedule for رويـدا و عبدالرحمن (29 · 05 · 2026).
 */
export function defaultTimeline(): TimelineDoc {
  const mk = (time: string, role: string, name: string): TimelineEntry => ({
    id: uid(),
    time,
    role,
    name,
  });
  return {
    version: SEED_VERSION,
    entries: [
      mk("4:30 PM", "ميك اب ارتست", "لينا البغدادية"),
      mk("5:30 PM", "شعر", "نبيله"),
      mk("6:00 PM", "مساعدة العروس", "فريق أيمان الربيع"),
      mk("6:00 PM", "مصورة الجوال", "شهد"),
      mk("7:00 PM", "المصورة", "نوف الظاهري"),
      mk("11:30 PM", "", "الزفة"),
    ],
    footerMessage:
      "سعيدة بوجودكم معي في هذه اللحظات السعيدة،\nمتشوّقة لجميل حضوركم",
    signatureName: "رويـدا",
  };
}

export function newEntry(): TimelineEntry {
  return { id: uid(), time: "0:00 PM", role: "الوصف", name: "الاسم" };
}
