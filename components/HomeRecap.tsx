"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import { loadTasks, defaultTasks } from "@/lib/tasksStorage";
import { loadTimeline, defaultTimeline } from "@/lib/timelineStorage";
import type {
  Language,
  PlaylistSection,
  TaskDoc,
  TimelineDoc,
  Track,
} from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  tracks: Track[];
  totalSeconds: number;
  sections: PlaylistSection[];
  onOpenTimeline: () => void;
  onOpenTasks: () => void;
}

/**
 * "At-a-glance" panel that surfaces what's coming up across every
 * feature in one tap. Sits between the hero and the composer:
 * - Playlist card: track + section counts → scrolls to #playlist
 * - Wedding Day card: first 2 timeline moments → opens Timeline
 * - To-Do card: next open tasks + counts → opens Tasks
 *
 * Reads from localStorage on mount; falls back to the same defaults
 * the modals would seed with so the cards never render empty before
 * the user has visited them.
 */
export default function HomeRecap({
  lang,
  t,
  tracks,
  totalSeconds,
  sections,
  onOpenTimeline,
  onOpenTasks,
}: Props) {
  const direction = dirOf(lang);
  const [timeline, setTimeline] = useState<TimelineDoc>(() => defaultTimeline());
  const [tasksDoc, setTasksDoc] = useState<TaskDoc>(() => defaultTasks());

  useEffect(() => {
    const tl = loadTimeline();
    if (tl) setTimeline(tl);
    const tk = loadTasks();
    if (tk) setTasksDoc(tk);
  }, []);

  // Keep recap fresh: re-read storage when the page becomes visible
  // again (covers the flow: open Tasks → tick something → close →
  // see updated count on the home recap).
  useEffect(() => {
    function refresh() {
      const tl = loadTimeline();
      if (tl) setTimeline(tl);
      const tk = loadTasks();
      if (tk) setTasksDoc(tk);
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const openTasks = useMemo(
    () => tasksDoc.entries.filter((e) => !e.done),
    [tasksDoc.entries],
  );
  const doneTasks = useMemo(
    () => tasksDoc.entries.filter((e) => e.done),
    [tasksDoc.entries],
  );
  const nextTasks = useMemo(() => {
    const starred = openTasks
      .filter((e) => e.starred)
      .slice(0, 3);
    if (starred.length >= 3) return starred;
    const fill = openTasks.filter((e) => !e.starred);
    return [...starred, ...fill].slice(0, 3);
  }, [openTasks]);

  const nextMoments = useMemo(
    () => timeline.entries.slice(0, 2),
    [timeline.entries],
  );

  function scrollToPlaylist() {
    const el = document.getElementById("playlist");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      className="fade-up grid grid-cols-1 md:grid-cols-3 gap-3"
      aria-label={t.recapAria}
      dir={direction}
    >
      {/* Playlist */}
      <RecapCard
        eyebrow={t.recapPlaylistEyebrow}
        title={t.recapPlaylistTitle}
        meta={
          tracks.length === 0
            ? t.recapPlaylistEmpty
            : `${tracks.length} ${tracks.length === 1 ? t.track : t.tracks} · ${fmtTime(totalSeconds)}`
        }
        body={
          sections.length > 0
            ? `${sections.length} ${sections.length === 1 ? t.recapSectionSingular : t.recapSectionPlural}`
            : t.recapPlaylistTagline
        }
        onClick={scrollToPlaylist}
      >
        <NoteIcon />
      </RecapCard>

      {/* Wedding day timeline */}
      <RecapCard
        eyebrow={t.recapTimelineEyebrow}
        title={timeline.brideName?.trim() || t.recapTimelineTitle}
        meta={timeline.dateLatin || timeline.dateAr || "29 · 05 · 2026"}
        body={
          nextMoments.length === 0
            ? t.recapTimelineEmpty
            : nextMoments
                .map((m) => `${m.time} · ${m.name || m.role}`.trim())
                .join("\n")
        }
        onClick={onOpenTimeline}
      >
        <ClockIcon />
      </RecapCard>

      {/* Tasks */}
      <RecapCard
        eyebrow={t.recapTasksEyebrow}
        title={t.recapTasksTitle}
        meta={`${openTasks.length} ${t.tasksOpenLabel} · ${doneTasks.length} ${t.tasksDoneLabel}`}
        body={
          nextTasks.length === 0
            ? t.recapTasksEmpty
            : nextTasks
                .map((tk) => `• ${tk.title}${tk.due ? ` — ${tk.due}` : ""}`)
                .join("\n")
        }
        onClick={onOpenTasks}
      >
        <CheckIcon />
      </RecapCard>
    </section>
  );
}

/* ── Card ────────────────────────────────────────────────────── */

interface CardProps {
  eyebrow: string;
  title: string;
  meta: string;
  body: string;
  onClick: () => void;
  children: React.ReactNode;
}

function RecapCard({ eyebrow, title, meta, body, onClick, children }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-start rounded-xl p-4 group transition"
      style={{
        background:
          "linear-gradient(165deg, rgba(216, 146, 116, 0.08) 0%, rgba(216, 146, 116, 0.02) 100%)",
        border: "1px solid rgba(216, 146, 116, 0.22)",
        boxShadow: "0 10px 30px -18px rgba(0,0,0,0.55)",
        cursor: "pointer",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="eyebrow"
          style={{ color: "var(--gold-300)", letterSpacing: "0.22em" }}
        >
          {eyebrow}
        </div>
        <span
          className="flex-shrink-0 rounded-full p-1.5 transition group-hover:scale-110"
          style={{
            background: "rgba(216, 146, 116, 0.14)",
            color: "var(--gold-300)",
            border: "1px solid rgba(216, 146, 116, 0.24)",
          }}
          aria-hidden
        >
          {children}
        </span>
      </div>
      <div
        className="font-display italic truncate"
        style={{ color: "var(--text)", fontSize: 19, lineHeight: 1.2 }}
        title={title}
      >
        {title}
      </div>
      <div
        className="text-[12px] tnum"
        style={{ color: "var(--gold-400)" }}
      >
        {meta}
      </div>
      <div
        className="text-[12px] mt-auto whitespace-pre-line"
        style={{ color: "var(--text-muted)" }}
      >
        {body}
      </div>
    </button>
  );
}

/* ── Inline icons ────────────────────────────────────────────── */

function NoteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
