"use client";

/**
 * Live Wedding Mode — distraction-free production control center.
 *
 * Mounted as a full-screen modal during the ceremony. Reads timeline +
 * tasks from local storage on mount and refreshes on tab focus /
 * visibility change (same pattern as components/HomeRecap.tsx).
 *
 * Wiring into the sidebar is intentionally NOT done here — the merge
 * step will introduce the trigger. This component only renders + reads.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strings } from "@/lib/i18n";
import { defaultTasks, loadTasks } from "@/lib/tasksStorage";
import { defaultTimeline, loadTimeline } from "@/lib/timelineStorage";
import { parseDue } from "@/lib/dueDate";
import type { TaskEntry as Task, TimelineEntry } from "@/types";
import type { Language, Track } from "@/types";

/* ── Types ───────────────────────────────────────────────────────────── */

export type VendorState =
  | "ready"
  | "playing"
  | "set"
  | "standby"
  | "onsite";

export interface VendorStatus {
  /** Stable id for future keying. */
  id: string;
  /** i18n string key for the label, resolved via strings[lang][labelKey]. */
  labelKey: keyof typeof strings.en;
  /** i18n string key for the state. */
  stateKey: keyof typeof strings.en;
  /** Visual state hint — drives the dot colour. */
  tone: VendorState;
}

export interface LiveModeProps {
  lang: Language;
  t: typeof strings.en;
  onClose: () => void;
  /** Currently-playing track, if any. Passed in by PlaylistApp. */
  currentTrack?: Track | null;
  /** The track queued after the current one. */
  nextTrack?: Track | null;
  /** Whether the player is actively playing. */
  isPlaying?: boolean;
  /** Optional override of the hardcoded vendor list. */
  vendors?: VendorStatus[];
}

/* ── Constants ──────────────────────────────────────────────────────── */

/**
 * Empty by default — vendor mock data was removed at the user's
 * request ("don't invent vendors"). The bride supplies her real
 * vendors via the (forthcoming) editor or by passing a `vendors`
 * prop. Until that exists, the panel is hidden.
 */
const DEFAULT_VENDORS: VendorStatus[] = [];

const VENDOR_DOT: Record<VendorState, string> = {
  ready: "#7aa37a",
  playing: "#d89274",
  set: "#b8956a",
  standby: "#a38a72",
  onsite: "#8c6a4f",
};

/* ── Helpers ────────────────────────────────────────────────────────── */

/**
 * Parse an "HH:mm" (or "H:mm") clock string against today and return a
 * Date. Returns null if the string is unparseable.
 */
function parseClock(time: string | undefined, base: Date): Date | null {
  if (!time) return null;
  const trimmed = time.trim();
  // Accept "HH:mm", "H:mm", optionally followed by AM/PM.
  const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Format a Date as "h:mm AM/PM" for the header clock. */
function formatClock(d: Date, lang: Language): string {
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return fmt.format(d);
}

/** Compact countdown like "2h 48m" / "8m 12s" / "48s" / "now". */
function formatCountdown(deltaMs: number, lang: Language): string {
  if (deltaMs <= 0) return lang === "ar" ? "الآن" : "now";
  const totalSec = Math.floor(deltaMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (lang === "ar") {
    if (h > 0) return `${h}س ${m}د`;
    if (m > 0) return `${m}د ${String(s).padStart(2, "0")}ث`;
    return `${s}ث`;
  }
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Best-effort title accessor honouring lang preference. */
function pickTitle(
  primary: string,
  alt: string | undefined,
  lang: Language,
): { display: string; sub?: string } {
  // Many timeline/task entries store the Arabic title in `title` and an
  // optional English mirror in `titleEn`. When the UI is English, surface
  // the English line first if available; show the original as a sub.
  if (lang === "en" && alt && alt.trim().length > 0) {
    return { display: alt, sub: primary };
  }
  if (lang === "ar" && alt && alt.trim().length > 0 && alt !== primary) {
    return { display: primary, sub: alt };
  }
  return { display: primary };
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function LiveMode({
  lang,
  t,
  onClose,
  currentTrack = null,
  nextTrack = null,
  isPlaying = false,
  vendors = DEFAULT_VENDORS,
}: LiveModeProps): JSX.Element {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const mountedRef = useRef<boolean>(true);

  /** Pull persisted state. Safe to call repeatedly. */
  const refresh = useCallback(() => {
    try {
      const tl = loadTimeline();
      setTimeline(tl ? tl.entries : defaultTimeline().entries);
    } catch {
      setTimeline([]);
    }
    try {
      const tk = loadTasks();
      setTasks(tk ? tk.entries : defaultTasks().entries);
    } catch {
      setTasks([]);
    }
  }, []);

  // Initial load + refresh on focus / visibility change.
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Tick the clock + countdown every second.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (mountedRef.current) setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // ESC to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Next future timeline entry against current clock. */
  const nextMoment = useMemo<{
    entry: TimelineEntry;
    when: Date;
  } | null>(() => {
    const candidates = timeline
      .map((entry) => {
        const when = parseClock(entry.time, now);
        return when ? { entry, when } : null;
      })
      .filter(
        (x): x is { entry: TimelineEntry; when: Date } =>
          x !== null && x.when.getTime() > now.getTime(),
      )
      .sort((a, b) => a.when.getTime() - b.when.getTime());
    return candidates[0] ?? null;
  }, [timeline, now]);

  /** Top 3 open tasks, sorted by due date (closest first). */
  const activeTasks = useMemo<Task[]>(() => {
    const open = tasks.filter((task) => !task.done);
    return [...open]
      .sort((a, b) => {
        const da = parseDue(a.due);
        const db = parseDue(b.due);
        if (da && db) return da.getTime() - db.getTime();
        if (da) return -1;
        if (db) return 1;
        return 0;
      })
      .slice(0, 3);
  }, [tasks]);

  const headerClock = formatClock(now, lang);

  const nextMomentTitles = nextMoment
    ? pickTitle(nextMoment.entry.name, nextMoment.entry.role, lang)
    : null;

  const countdownLabel = nextMoment
    ? formatCountdown(nextMoment.when.getTime() - now.getTime(), lang)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live wedding mode"
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(216,146,116,0.16) 0%, transparent 55%), linear-gradient(180deg, rgba(38, 28, 22, 0.99) 0%, rgba(26, 19, 16, 1) 100%)",
        color: "var(--text)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid rgba(216, 146, 116, 0.18)",
        }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#d89274",
              boxShadow: "0 0 12px rgba(216, 146, 116, 0.7)",
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-meta)",
              fontSize: "var(--text-eyebrow)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--gold-300)",
            }}
          >
            {t.liveModeBadge}
          </span>
          <span
            aria-hidden
            style={{
              opacity: 0.4,
              fontSize: "var(--text-meta)",
            }}
          >
            ·
          </span>
          <span
            className="tnum"
            style={{
              fontFamily: "var(--font-meta)",
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {headerClock}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.liveModeClose}
          className="btn-iconic"
          style={{
            background: "rgba(216, 146, 116, 0.07)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </header>

      {/* Scroll body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {/* Next moment */}
        <section aria-labelledby="live-next-moment">
          <SectionLabel id="live-next-moment">{t.liveNextMoment}</SectionLabel>
          {nextMoment && nextMomentTitles && countdownLabel ? (
            <div
              className="wp-ambient-glow"
              style={{
                marginTop: "var(--space-4)",
                padding: "var(--space-6)",
                background:
                  "linear-gradient(180deg, rgba(216, 146, 116, 0.10), rgba(216, 146, 116, 0.05))",
                border: "1px solid rgba(216, 146, 116, 0.22)",
                borderRadius: 8,
                boxShadow:
                  "0 24px 48px -30px rgba(0, 0, 0, 0.7), 0 6px 14px -8px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                className="flex flex-wrap items-baseline"
                style={{ gap: "var(--space-4)" }}
              >
                <span
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-meta)",
                    fontSize: "clamp(32px, 6vw, 44px)",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    color: "var(--text)",
                    lineHeight: 1,
                  }}
                >
                  {formatClock(nextMoment.when, lang)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-meta)",
                    fontSize: "var(--text-meta)",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--gold-300)",
                  }}
                >
                  {t.liveInCountdown}
                </span>
                <span
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-meta)",
                    fontSize: "clamp(20px, 3.5vw, 28px)",
                    fontWeight: 500,
                    color: "var(--gold-400)",
                  }}
                >
                  {countdownLabel}
                </span>
              </div>

              <h2
                style={{
                  marginTop: "var(--space-4)",
                  marginBottom: 0,
                  fontFamily: "var(--font-display)",
                  fontStyle: "var(--font-display-italic-style)",
                  fontSize: "clamp(28px, 5vw, 36px)",
                  fontWeight: 500,
                  lineHeight: 1.15,
                  color: "var(--text)",
                }}
              >
                {nextMomentTitles.display}
              </h2>
              {nextMomentTitles.sub ? (
                <p
                  style={{
                    marginTop: "var(--space-2)",
                    marginBottom: 0,
                    fontFamily: "var(--font-meta)",
                    fontSize: "var(--text-body)",
                    color: "var(--text-faint)",
                  }}
                >
                  {nextMomentTitles.sub}
                </p>
              ) : null}

            </div>
          ) : (
            <EmptyLine>{t.liveNoMoment}</EmptyLine>
          )}
        </section>

        {/* Now playing */}
        <section aria-labelledby="live-now-playing">
          <SectionLabel id="live-now-playing">{t.liveNowPlaying}</SectionLabel>
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-4)",
              background: "rgba(216, 146, 116, 0.07)",
              border: "1px solid rgba(216, 146, 116, 0.18)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <div
              className={`nowart ${isPlaying ? "playing" : ""}`}
              aria-hidden
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "var(--font-display-italic-style)",
                  fontSize: "var(--text-title)",
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentTrack ? currentTrack.title : t.liveNothingPlaying}
              </div>
              {nextTrack ? (
                <div
                  style={{
                    marginTop: "var(--space-1)",
                    fontFamily: "var(--font-meta)",
                    fontSize: "var(--text-meta)",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    style={{
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: "var(--gold-300)",
                    }}
                  >
                    {t.liveUpNext}
                  </span>{" "}
                  · {nextTrack.title}
                </div>
              ) : null}
            </div>
            {isPlaying ? (
              <span
                aria-hidden
                className="eq"
                style={{ alignSelf: "center" }}
              >
                <span />
                <span />
                <span />
                <span />
              </span>
            ) : null}
          </div>
        </section>

        {/* Active tasks */}
        <section aria-labelledby="live-active-tasks">
          <SectionLabel id="live-active-tasks">
            {t.liveActiveTasks}
          </SectionLabel>
          {activeTasks.length > 0 ? (
            <ul
              style={{
                marginTop: "var(--space-4)",
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {activeTasks.map((task) => {
                const titles = pickTitle(task.title, task.note, lang);
                const due = parseDue(task.due);
                const dueLabel = due ? formatClock(due, lang) : null;
                return (
                  <li
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(216, 146, 116, 0.16)",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        border: "1px solid #8c6a4f",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--text-title)",
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {titles.display}
                    </span>
                    {dueLabel ? (
                      <span
                        className="tnum"
                        style={{
                          fontFamily: "var(--font-meta)",
                          fontSize: "var(--text-meta)",
                          letterSpacing: "0.06em",
                          color: "var(--gold-400)",
                          flexShrink: 0,
                        }}
                      >
                        {dueLabel}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyLine>{t.liveNoTasks}</EmptyLine>
          )}
        </section>

        {/* Vendor status — only rendered when real vendors are provided. */}
        {vendors.length > 0 && (
        <section aria-labelledby="live-vendor-status">
          <SectionLabel id="live-vendor-status">
            {t.liveVendorStatus}
          </SectionLabel>
          <ul
            style={{
              marginTop: "var(--space-4)",
              listStyle: "none",
              padding: 0,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--space-2)",
            }}
          >
            {vendors.map((vendor) => (
              <li
                key={vendor.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(216, 146, 116, 0.14)",
                  borderRadius: 6,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: VENDOR_DOT[vendor.tone],
                    boxShadow: `0 0 8px ${VENDOR_DOT[vendor.tone]}66`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-title)",
                    color: "var(--text)",
                  }}
                >
                  {t[vendor.labelKey]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-meta)",
                    fontSize: "var(--text-eyebrow)",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--gold-300)",
                  }}
                >
                  {t[vendor.stateKey]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        )}
      </div>
    </div>
  );
}

/* ── Small presentational helpers ───────────────────────────────────── */

function SectionLabel({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <h3
      id={id}
      style={{
        margin: 0,
        fontFamily: "var(--font-meta)",
        fontSize: "var(--text-eyebrow)",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: "var(--gold-300)",
        fontWeight: 500,
      }}
    >
      {children}
    </h3>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p
      style={{
        marginTop: "var(--space-4)",
        marginBottom: 0,
        fontFamily: "var(--font-display)",
        fontStyle: "var(--font-display-italic-style)",
        fontSize: "var(--text-body)",
        color: "var(--text-faint)",
      }}
    >
      {children}
    </p>
  );
}
