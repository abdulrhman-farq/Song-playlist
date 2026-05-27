import type { Language } from "@/types";

/**
 * Parse a stored `due` string. Returns a Date when the value is an
 * ISO datetime / date (the new format written by the datetime-local
 * picker), null when it's free-form legacy text the user pasted in
 * before the picker existed — in which case the caller should show
 * the raw string as a fallback.
 */
export function parseDue(due: string | undefined | null): Date | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** True if the stored value carries a time component (T-separated). */
export function dueHasTime(due: string | undefined | null): boolean {
  if (!due) return false;
  return due.includes("T");
}

/**
 * Render a stored `due` value for display:
 * - "Today, 8:00 PM" / "Tomorrow, 9:30 AM" / "Yesterday"
 * - "Due 3 days ago" for past dates with no time
 * - "Fri, 29 May at 11:30 PM" otherwise
 *
 * Legacy free-form strings (parseDue → null) are returned as-is so
 * pre-picker entries keep working.
 */
export function formatDue(
  due: string | undefined | null,
  lang: Language,
): string {
  if (!due) return "";
  const d = parseDue(due);
  if (!d) return due;
  const locale = lang === "ar" ? "ar" : "en-US";
  const hasTime = dueHasTime(due);

  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(d) - startOfDay(now)) / 86_400_000,
  );

  const time = hasTime
    ? d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    : "";

  const todayLabel = lang === "ar" ? "اليوم" : "Today";
  const tomorrowLabel = lang === "ar" ? "غدًا" : "Tomorrow";
  const yesterdayLabel = lang === "ar" ? "أمس" : "Yesterday";
  const atSep = lang === "ar" ? "،" : ",";

  if (dayDiff === 0) return hasTime ? `${todayLabel}${atSep} ${time}` : todayLabel;
  if (dayDiff === 1) return hasTime ? `${tomorrowLabel}${atSep} ${time}` : tomorrowLabel;
  if (dayDiff === -1) return hasTime ? `${yesterdayLabel}${atSep} ${time}` : yesterdayLabel;
  if (dayDiff < -1) {
    const days = Math.abs(dayDiff);
    if (lang === "ar") return `متأخّرة منذ ${days} يوم`;
    return `Due ${days} day${days === 1 ? "" : "s"} ago`;
  }

  const dateStr = d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!hasTime) return dateStr;
  const atWord = lang === "ar" ? "في" : "at";
  return `${dateStr} ${atWord} ${time}`;
}

/**
 * Return a value suitable for `<input type="datetime-local" value="…">`
 * (YYYY-MM-DDTHH:MM in local time). Empty string when no due / legacy
 * unparseable string.
 */
export function toDatetimeLocalValue(due: string | undefined | null): string {
  const d = parseDue(due);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Past-due check that works with both new ISO values and legacy
 * "Due X ago" strings.
 */
export function isOverdue(due: string | undefined | null): boolean {
  if (!due) return false;
  const d = parseDue(due);
  if (d) return d.getTime() < Date.now();
  return /ago/i.test(due);
}
