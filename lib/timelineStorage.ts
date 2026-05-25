import type { TimelineDoc, TimelineEntry } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:timeline";

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
    return parsed;
  } catch {
    return null;
  }
}

export function saveTimeline(doc: TimelineDoc): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    /* quota — ignore */
  }
}

/**
 * Seed schedule used on first load. Mirrors the bride-prep cadence
 * from the original handoff but easy to overwrite.
 */
export function defaultTimeline(): TimelineDoc {
  const mk = (time: string, role: string, name: string): TimelineEntry => ({
    id: uid(),
    time,
    role,
    name,
  });
  return {
    entries: [
      mk("1:00 PM", "الهيرستايلست", "لينا فهد"),
      mk("2:00 PM", "صالون الأظافر", "Glowy Spa"),
      mk("2:30 PM", "الميك أب مع", "غفران العلوان"),
      mk("3:00 PM", "مساعدة العروس", "إيمان الربيع"),
      mk("4:00 PM", "بداية التصوير مع", "هيفاء العيسى"),
      mk("6:00 PM", "الانطلاق إلى القاعة", "زفّة"),
      mk("8:00 PM", "بدء الحفل", "رويدا و عبدالرحمن"),
    ],
    footerMessage:
      "سعيدة بوجودكم معي في هذه اللحظات السعيدة،\nمتشوّقة لجميل حضوركم",
    signatureName: "رويـدا",
  };
}

export function newEntry(): TimelineEntry {
  return { id: uid(), time: "0:00 PM", role: "الوصف", name: "الاسم" };
}
