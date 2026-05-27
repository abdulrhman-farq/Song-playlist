import type { TaskDoc, TaskEntry } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:tasks";
/**
 * Bump this whenever `defaultTasks()` changes meaningfully. On load,
 * any persisted doc with a missing or older version is replaced by
 * the current default. Once the user edits, the new version stamp is
 * saved alongside their changes and survives.
 *
 * v2: due/completedAt switched from free-form display strings to ISO
 * datetimes so the native datetime picker can edit them and so we
 * can compute relative phrasing ("Today, 8:00 PM").
 *
 * v3: TaskEntry extended with `priority`, `category`, `linkedSong`,
 * `vendor`, `reminder`, `pinned`. Old docs missing the new fields
 * are simply replaced by the new seed on first load so the upgrade
 * looks polished out of the box.
 */
const SEED_VERSION = 3;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadTasks(): TaskDoc | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TaskDoc;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    if ((parsed.version ?? 0) < SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTasks(doc: TaskDoc): void {
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
 * Real wedding-prep checklist for رويـدا و عبدالرحمن — mirrors the
 * couple's Google Tasks "To do list abdulrhman &ruwaida" board so a
 * guest doesn't have to re-key it. Open items first, completed at the
 * bottom. User can edit / add / tick any of them inside the app.
 */
export function defaultTasks(): TaskDoc {
  const mk = (
    title: string,
    due: string | undefined,
    done: boolean,
    extras: Partial<TaskEntry> = {},
  ): TaskEntry => ({
    id: uid(),
    title,
    due,
    done,
    ...extras,
  });
  return {
    version: SEED_VERSION,
    entries: [
      // ── Open ─────────────────────────────────────────────
      // ISO dates / datetimes so the native picker can edit them.
      // Anchor: wedding day = Friday 2026-05-29.
      mk("تسديد السيارة", "2026-05-20", false, {
        category: "الموردين",
        priority: "high",
      }),
      mk("دلكة", "2026-05-27", false, { category: "مهم", priority: "med" }),
      mk("بتجي رويدا عندي قبل زواج الرجال", "2026-05-28T18:00", false, {
        category: "العائلة",
        priority: "high",
      }),
      mk("اضافر قبل الزواج بيوم", "2026-05-28T20:00", false, {
        category: "مهم",
        priority: "med",
      }),
      mk("عشاء الرجال", "2026-05-28T09:30", false, {
        category: "العائلة",
        priority: "high",
      }),
      mk("زفة الرجال", "2026-05-29T23:30", false, {
        category: "الزفة",
        priority: "high",
      }),
      mk("زفة رويدا", "2026-05-29T23:34", false, {
        category: "الزفة",
        priority: "high",
      }),
      mk("عشاء الحريم", "2026-05-30T01:00", false, {
        category: "العائلة",
        priority: "med",
      }),
      mk("الدخلي الي الله يجيبها", "2026-05-30T03:00", false, {
        category: "العائلة",
      }),
      mk("رموش موعد 30 بالصالون وبنفس الوقت شعر", "2026-05-30T17:00", false, {
        note: "Nailsholic",
        category: "الموردين",
        priority: "med",
      }),
      mk("بنروح اهل زوجتي", "2026-05-30T19:00", false, {
        category: "العائلة",
      }),
      mk("نروح اهلي", "2026-05-31T19:10", false, { category: "العائلة" }),
      mk("السفرة الذهاب", "2026-06-02T15:00", false, { priority: "low" }),
      mk("العودة", "2026-06-11T18:30", false, { priority: "low" }),
      mk("العودة للاجازة", "2026-06-24T08:00", false, { priority: "low" }),

      // ── Completed ────────────────────────────────────────
      mk("ليزر", undefined, true, {
        completedAt: "2026-05-24",
        category: "مهم",
      }),
      mk(
        "تجهيز شنطة يوم الزواج ومالعد الزواج الي بالفندق واللستة",
        undefined,
        true,
        { completedAt: "2026-05-23", category: "مهم" },
      ),
      mk("رينساج", undefined, true, {
        completedAt: "2026-05-22",
        category: "مهم",
      }),
      mk("حمام مغربي", undefined, true, {
        completedAt: "2026-05-22",
        category: "مهم",
      }),
      mk("اسنان", undefined, true, {
        completedAt: "2026-05-22",
        category: "مهم",
      }),
      mk("العجلان", undefined, true, {
        completedAt: "2026-05-18",
        category: "الموردين",
      }),
      mk("رتوش شفايف", undefined, true, {
        completedAt: "2026-05-18",
        category: "مهم",
      }),
    ],
  };
}

export function newTask(): TaskEntry {
  return { id: uid(), title: "", done: false };
}
