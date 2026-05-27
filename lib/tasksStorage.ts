import type { TaskDoc, TaskEntry } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:tasks";
/**
 * Bump this whenever `defaultTasks()` changes meaningfully. On load,
 * any persisted doc with a missing or older version is replaced by
 * the current default. Once the user edits, the new version stamp is
 * saved alongside their changes and survives.
 */
const SEED_VERSION = 1;

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
      mk("تسديد السيارة", "Due 1 week ago", false),
      mk("دلكة", "Today", false),
      mk("بتجي رويدا عندي قبل زواج الرجال", "Tomorrow, 6:00 PM", false),
      mk("اضافر قبل الزواج بيوم", "Tomorrow, 8:00 PM", false),
      mk("عشاء الرجال", "Tomorrow, 9:30 AM", false),
      mk("زفة الرجال", "Fri, 29 May at 11:30 PM", false),
      mk("زفة رويدا", "Fri, 29 May at 11:34 PM", false),
      mk("عشاء الحريم", "Sat, 30 May at 1:00 AM", false),
      mk("الدخلي الي الله يجيبها", "Sat, 30 May at 3:00 AM", false),
      mk("رموش موعد 30 بالصالون وبنفس الوقت شعر", "Sat, 30 May at 5:00 PM", false, {
        note: "Nailsholic",
      }),
      mk("بنروح اهل زوجتي", "Sat, 30 May at 7:00 PM", false),
      mk("نروح اهلي", "Sun, 31 May at 7:10 PM", false),
      mk("السفرة الذهاب", "Tue, 2 Jun at 3:00 PM", false),
      mk("العودة", "Thu, 11 Jun at 6:30 PM", false),
      mk("العودة للاجازة", "Wed, 24 Jun at 8:00 AM", false),

      // ── Completed ────────────────────────────────────────
      mk("ليزر", undefined, true, { completedAt: "Sun, 24 May" }),
      mk(
        "تجهيز شنطة يوم الزواج ومالعد الزواج الي بالفندق واللستة",
        undefined,
        true,
        { completedAt: "Sat, 23 May" },
      ),
      mk("رينساج", undefined, true, { completedAt: "Fri, 22 May" }),
      mk("حمام مغربي", undefined, true, { completedAt: "Fri, 22 May" }),
      mk("اسنان", undefined, true, { completedAt: "Fri, 22 May" }),
      mk("العجلان", undefined, true, { completedAt: "Mon, 18 May" }),
      mk("رتوش شفايف", undefined, true, { completedAt: "Mon, 18 May" }),
    ],
  };
}

export function newTask(): TaskEntry {
  return { id: uid(), title: "", done: false };
}
