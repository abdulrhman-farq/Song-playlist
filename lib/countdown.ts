import type { Strings } from "@/lib/i18n";

/** ISO date of the wedding ceremony. */
export const WEDDING_DATE_ISO = "2026-05-29T18:00:00+03:00";

export interface CountdownInfo {
  /** Whole-day count to the wedding (positive = future). */
  daysAway: number;
  /** Convenience: is the wedding day today? */
  isToday: boolean;
  /** Convenience: has it already happened? */
  isPast: boolean;
  /** Localised label describing the state. */
  label: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function computeCountdown(t: Strings, now: Date = new Date()): CountdownInfo {
  const target = new Date(WEDDING_DATE_ISO);
  const today0 = startOfDay(now);
  const target0 = startOfDay(target);
  const msPerDay = 86_400_000;
  const daysAway = Math.round((target0.getTime() - today0.getTime()) / msPerDay);

  if (daysAway < 0) {
    return {
      daysAway,
      isToday: false,
      isPast: true,
      label: t.afterWedding,
    };
  }
  if (daysAway === 0) {
    return {
      daysAway,
      isToday: true,
      isPast: false,
      label: t.theDayHasArrived,
    };
  }
  if (daysAway === 1) {
    return {
      daysAway,
      isToday: false,
      isPast: false,
      label: t.oneNightAway,
    };
  }
  return {
    daysAway,
    isToday: false,
    isPast: false,
    label: `${daysAway} ${t.nightsAway}`,
  };
}
