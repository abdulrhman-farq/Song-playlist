"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DueDatePicker from "@/components/DueDatePicker";
import { IconClose, IconPlus } from "@/components/icons";
import { useLockMode } from "@/lib/lockMode";
import {
  formatDueMeta,
  isOverdue,
  isToday,
  isUpcoming,
  parseDue,
} from "@/lib/dueDate";
import {
  defaultTasks,
  loadTasks,
  newTask,
  saveTasks,
} from "@/lib/tasksStorage";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { Language, TaskDoc, TaskEntry } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  onClose: () => void;
}

type FilterKey = "all" | "today" | "upcoming" | "important" | "completed";

const SWIPE_THRESHOLD = 64; // px before commit
const SWIPE_LEFT_REVEAL = 168; // px for the two-button reveal
const SWIPE_RIGHT_COMPLETE = 96; // px for the single complete action
const SWIPE_SPRING = "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)";
const LONG_PRESS_MS = 500;

const PRIORITY_CYCLE: Array<TaskEntry["priority"]> = [
  undefined,
  "low",
  "med",
  "high",
];

function nextPriority(p: TaskEntry["priority"]): TaskEntry["priority"] {
  const idx = PRIORITY_CYCLE.indexOf(p ?? undefined);
  const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
  return next;
}

function priorityColor(p: TaskEntry["priority"]): string | null {
  if (p === "high") return "var(--danger)";
  if (p === "med") return "var(--gold-400)";
  return null;
}

/**
 * Wedding-prep to-do board (v3 redesign).
 *
 * The list is the centrepiece: a tight, single-line row carrying the
 * checkbox, title + meta sub-line, and a priority dot. Filter chips
 * under the header let the bride flick between All / Today /
 * Upcoming / Important / Completed; swipe right marks complete,
 * swipe left reveals Reschedule + Delete. Long-press surfaces an
 * inline peach popover with the full ops set. Tapping the title
 * expands an inline drawer with note / linked song / vendor /
 * reminder fields.
 */
export default function Tasks({ lang, t, onClose }: Props) {
  const direction = dirOf(lang);
  const lock = useLockMode();

  const [doc, setDoc] = useState<TaskDoc>(() => defaultTasks());
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const newTitleRef = useRef<HTMLInputElement | null>(null);

  // Hydrate
  useEffect(() => {
    const stored = loadTasks();
    if (stored) setDoc(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveTasks(doc);
  }, [doc, hydrated]);

  /* ── sort + bucket ─────────────────────────────────────── */
  const { openEntries, completedEntries } = useMemo(() => {
    const open: TaskEntry[] = [];
    const done: TaskEntry[] = [];
    for (const e of doc.entries) (e.done ? done : open).push(e);

    const openSorted = open.slice().sort((a, b) => {
      // Pinned floats above everything else
      const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
      if (pinDiff !== 0) return pinDiff;
      const da = parseDue(a.due);
      const db = parseDue(b.due);
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (da && db && da.getTime() !== db.getTime()) {
        return da.getTime() - db.getTime();
      }
      const starDiff =
        Number(b.starred ?? false) - Number(a.starred ?? false);
      if (starDiff !== 0) return starDiff;
      return 0;
    });

    const doneSorted = done.slice().sort((a, b) => {
      const da = parseDue(a.completedAt);
      const db = parseDue(b.completedAt);
      if (da && db) return db.getTime() - da.getTime();
      if (da) return -1;
      if (db) return 1;
      return 0;
    });

    return { openEntries: openSorted, completedEntries: doneSorted };
  }, [doc.entries]);

  /* ── filter the visible open list ──────────────────────── */
  const filteredOpen = useMemo(() => {
    if (filter === "all") return openEntries;
    if (filter === "today") {
      return openEntries.filter((e) => isToday(e.due) || isOverdue(e.due));
    }
    if (filter === "upcoming") {
      return openEntries.filter((e) => isUpcoming(e.due));
    }
    if (filter === "important") {
      return openEntries.filter(
        (e) => e.starred || e.priority === "high" || e.pinned,
      );
    }
    if (filter === "completed") return [];
    return openEntries;
  }, [openEntries, filter]);

  const showCompletedSection = filter === "all" || filter === "completed";
  const completedToShow =
    filter === "completed" ? completedEntries : completedEntries;

  /* ── mutators ──────────────────────────────────────────── */
  const update = useCallback((id: string, patch: Partial<TaskEntry>) => {
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => {
        if (e.id !== id) return e;
        const nextDone = !e.done;
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const isoDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        return {
          ...e,
          done: nextDone,
          completedAt: nextDone ? isoDate : undefined,
        };
      }),
    }));
  }, []);

  const remove = useCallback(
    (id: string) => {
      // Animate-out first; the row sets pendingDeleteId on itself so
      // the parent doesn't have to time it.
      if (
        typeof window !== "undefined" &&
        !window.confirm(t.confirmDeleteTask)
      ) {
        setPendingDeleteId(null);
        return;
      }
      setPendingDeleteId(id);
      window.setTimeout(() => {
        setDoc((prev) => ({
          ...prev,
          entries: prev.entries.filter((e) => e.id !== id),
        }));
        setPendingDeleteId(null);
      }, 220);
    },
    [t.confirmDeleteTask],
  );

  const addNewTask = useCallback(() => {
    const fresh = { ...newTask(), title: "" };
    setDoc((prev) => ({ ...prev, entries: [fresh, ...prev.entries] }));
    setEditingTitleId(fresh.id);
    setExpandedId(null);
    if (filter === "completed") setFilter("all");
    window.setTimeout(() => newTitleRef.current?.focus(), 0);
  }, [filter]);

  const cyclePriority = useCallback(
    (id: string) => {
      const target = doc.entries.find((e) => e.id === id);
      if (!target) return;
      update(id, { priority: nextPriority(target.priority) });
    },
    [doc.entries, update],
  );

  const togglePinned = useCallback(
    (id: string) => {
      const target = doc.entries.find((e) => e.id === id);
      if (!target) return;
      update(id, { pinned: !target.pinned });
    },
    [doc.entries, update],
  );

  /* ── header counts (live, not filter-dependent) ────────── */
  const openCount = openEntries.length;
  const doneCount = completedEntries.length;

  /* ── render ────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center fade-up"
      style={{
        background: "rgba(8, 5, 4, 0.78)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
      dir={direction}
    >
      <style>{TASKS_V3_CSS}</style>
      <div
        className="relative flex flex-col w-full max-w-[720px] my-4 mx-3 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.98) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.22)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.75)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-4 pt-4 pb-3"
          style={{
            borderBottom: "1px solid rgba(216, 146, 116, 0.18)",
            background:
              "linear-gradient(90deg, rgba(216,146,116,0.07) 0%, transparent 60%)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="eyebrow"
                style={{
                  color: "var(--gold-400)",
                  letterSpacing: "0.28em",
                  fontFamily: "var(--font-display, serif)",
                }}
              >
                {t.tasksEyebrow}
              </div>
              <h2
                className="font-display italic mt-1 truncate"
                style={{
                  fontSize: "clamp(22px, 2.6vw, 28px)",
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                {t.tasksTitle}
              </h2>
              <div
                className="mt-1 tnum"
                style={{
                  color: "var(--text-muted)",
                  fontSize: 12,
                  letterSpacing: "0.02em",
                }}
              >
                {openCount} {t.tasksOpenSuffix} · {doneCount}{" "}
                {t.tasksDoneSuffix}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!lock.locked && (
                <button
                  type="button"
                  className="tasks-add-btn"
                  onClick={addNewTask}
                  title={t.tasksAdd}
                  aria-label={t.tasksAdd}
                >
                  <IconPlus size={18} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                title={t.close}
                aria-label={t.close}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                }}
              >
                <IconClose size={16} />
              </button>
            </div>
          </div>

          {/* Filter chips */}
          <div
            className="mt-3 -mx-1 px-1 flex items-center gap-2 overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
            role="tablist"
            aria-label={t.tasksFilterAll}
          >
            {(
              [
                ["all", t.tasksFilterAll],
                ["today", t.tasksFilterToday],
                ["upcoming", t.tasksFilterUpcoming],
                ["important", t.tasksFilterImportant],
                ["completed", t.tasksFilterCompleted],
              ] as Array<[FilterKey, string]>
            ).map(([key, label]) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(key)}
                  className="tasks-filter-chip"
                  data-active={active ? "true" : "false"}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "8px 12px 16px" }}
        >
          {filter !== "completed" && filteredOpen.length === 0 && (
            <EmptyMessage label={t.tasksFilterEmpty} />
          )}

          {filter !== "completed" &&
            filteredOpen.map((e) => (
              <TaskRow
                key={e.id}
                entry={e}
                t={t}
                lang={lang}
                locked={lock.locked}
                expanded={expandedId === e.id}
                editingTitle={editingTitleId === e.id}
                titleRefIfNew={
                  editingTitleId === e.id ? newTitleRef : null
                }
                pendingDelete={pendingDeleteId === e.id}
                onToggleExpanded={() =>
                  setExpandedId((cur) => (cur === e.id ? null : e.id))
                }
                onStartEditTitle={() => setEditingTitleId(e.id)}
                onCommitTitle={(title) => {
                  update(e.id, { title });
                  setEditingTitleId(null);
                }}
                onCancelTitle={() => setEditingTitleId(null)}
                onCommitDue={(due) => update(e.id, { due: due || undefined })}
                onToggleDone={() => toggleDone(e.id)}
                onCyclePriority={() => cyclePriority(e.id)}
                onDelete={() => remove(e.id)}
                onTogglePinned={() => togglePinned(e.id)}
                onUpdate={(patch) => update(e.id, patch)}
              />
            ))}

          {/* Completed section */}
          {showCompletedSection && completedToShow.length > 0 && (
            <>
              {filter !== "completed" && (
                <button
                  type="button"
                  onClick={() => setCompletedOpen((v) => !v)}
                  className="tasks-completed-toggle"
                  aria-expanded={completedOpen}
                >
                  <span style={{ fontFamily: "var(--font-display, serif)" }}>
                    {t.tasksCompletedHeading} ({completedToShow.length})
                  </span>
                  <span style={{ color: "var(--gold-400)" }}>
                    {completedOpen ? "▾" : "▸"}
                  </span>
                </button>
              )}

              {(filter === "completed" || completedOpen) &&
                completedToShow.map((e) => (
                  <TaskRow
                    key={e.id}
                    entry={e}
                    t={t}
                    lang={lang}
                    locked={lock.locked}
                    expanded={expandedId === e.id}
                    editingTitle={editingTitleId === e.id}
                    titleRefIfNew={null}
                    pendingDelete={pendingDeleteId === e.id}
                    onToggleExpanded={() =>
                      setExpandedId((cur) => (cur === e.id ? null : e.id))
                    }
                    onStartEditTitle={() => setEditingTitleId(e.id)}
                    onCommitTitle={(title) => {
                      update(e.id, { title });
                      setEditingTitleId(null);
                    }}
                    onCancelTitle={() => setEditingTitleId(null)}
                    onCommitDue={(due) =>
                      update(e.id, { due: due || undefined })
                    }
                    onToggleDone={() => toggleDone(e.id)}
                    onCyclePriority={() => cyclePriority(e.id)}
                    onDelete={() => remove(e.id)}
                    onTogglePinned={() => togglePinned(e.id)}
                    onUpdate={(patch) => update(e.id, patch)}
                  />
                ))}
            </>
          )}

          {filter === "completed" && completedEntries.length === 0 && (
            <EmptyMessage label={t.tasksFilterEmpty} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Row ─────────────────────────────────────────────────────── */

interface RowProps {
  entry: TaskEntry;
  t: Strings;
  lang: Language;
  locked: boolean;
  expanded: boolean;
  editingTitle: boolean;
  titleRefIfNew: React.Ref<HTMLInputElement> | null;
  pendingDelete: boolean;
  onToggleExpanded: () => void;
  onStartEditTitle: () => void;
  onCommitTitle: (title: string) => void;
  onCancelTitle: () => void;
  onCommitDue: (due: string) => void;
  onToggleDone: () => void;
  onCyclePriority: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
  onUpdate: (patch: Partial<TaskEntry>) => void;
}

function TaskRow({
  entry,
  t,
  lang,
  locked,
  expanded,
  editingTitle,
  titleRefIfNew,
  pendingDelete,
  onToggleExpanded,
  onStartEditTitle,
  onCommitTitle,
  onCancelTitle,
  onCommitDue,
  onToggleDone,
  onCyclePriority,
  onDelete,
  onTogglePinned,
  onUpdate,
}: RowProps) {
  const [draftTitle, setDraftTitle] = useState(entry.title);
  useEffect(() => setDraftTitle(entry.title), [entry.title]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Swipe state
  const [dx, setDx] = useState(0); // current x-offset
  const [swipeMode, setSwipeMode] = useState<"none" | "left" | "right">(
    "none",
  );
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  // Reset swipe when filter / expand changes a sibling
  useEffect(() => {
    if (expanded) {
      setDx(0);
      setSwipeMode("none");
    }
  }, [expanded]);

  const overdue = !entry.done && isOverdue(entry.due);
  const today = !entry.done && isToday(entry.due);
  const dueMeta = formatDueMeta(entry.due, lang);
  const completedMeta = entry.completedAt
    ? formatDueMeta(entry.completedAt, lang)
    : "";

  const pColor = priorityColor(entry.priority);

  /* ── Pointer handlers (swipe + long press) ─────────────── */
  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function onPointerDown(ev: React.PointerEvent) {
    if (locked) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    startX.current = ev.clientX;
    startY.current = ev.clientY;
    swiping.current = false;
    longPressTriggered.current = false;
    setAnimating(false);

    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      if (!swiping.current && !longPressTriggered.current) {
        longPressTriggered.current = true;
        setMenuOpen(true);
      }
    }, LONG_PRESS_MS);
  }

  function onPointerMove(ev: React.PointerEvent) {
    if (locked) return;
    const deltaX = ev.clientX - startX.current;
    const deltaY = ev.clientY - startY.current;
    if (!swiping.current) {
      if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
        swiping.current = true;
        clearLongPress();
      } else if (Math.abs(deltaY) > 8) {
        // vertical scroll wins
        clearLongPress();
        return;
      } else {
        return;
      }
    }
    // Adjust for RTL — swipe direction reads from the visual start
    // edge: in LTR positive dx pulls the row right, in RTL we mirror.
    const adjusted = deltaX;
    // Clamp to symmetric reveal widths
    const max = SWIPE_LEFT_REVEAL + 24;
    const clamped = Math.max(-max, Math.min(max, adjusted));
    setDx(clamped);
    if (clamped > 6) setSwipeMode("right");
    else if (clamped < -6) setSwipeMode("left");
    else setSwipeMode("none");
  }

  function commitSwipe() {
    setAnimating(true);
    if (dx > SWIPE_RIGHT_COMPLETE) {
      // Slide all the way then toggle
      setDx(360);
      window.setTimeout(() => {
        onToggleDone();
        setDx(0);
        setSwipeMode("none");
        setAnimating(false);
      }, 220);
    } else if (dx < -SWIPE_LEFT_REVEAL) {
      // Settle into the open reveal position
      setDx(-SWIPE_LEFT_REVEAL);
      setSwipeMode("left");
    } else if (dx < -SWIPE_THRESHOLD) {
      setDx(-SWIPE_LEFT_REVEAL);
      setSwipeMode("left");
    } else {
      setDx(0);
      setSwipeMode("none");
    }
  }

  function onPointerUp() {
    clearLongPress();
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (swiping.current) {
      swiping.current = false;
      commitSwipe();
    } else {
      // tap on the row surface: collapse swipe reveal if any
      if (swipeMode !== "none" && dx !== 0) {
        setAnimating(true);
        setDx(0);
        setSwipeMode("none");
      }
    }
  }

  function onPointerCancel() {
    clearLongPress();
    swiping.current = false;
    longPressTriggered.current = false;
    setAnimating(true);
    setDx(0);
    setSwipeMode("none");
  }

  function resetSwipe() {
    setAnimating(true);
    setDx(0);
    setSwipeMode("none");
  }

  /* ── DueDatePicker anchor ─────────────────────────────── */
  function openPicker(ev: React.MouseEvent<HTMLButtonElement>) {
    if (locked) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    setPickerAnchor(rect);
    setPickerOpen(true);
  }

  return (
    <div
      className="tasks-row-shell"
      data-pending-delete={pendingDelete ? "true" : "false"}
    >
      {/* Reveal: right-swipe = complete (peach BG) */}
      <div
        className="tasks-swipe-bg tasks-swipe-bg-complete"
        style={{ opacity: swipeMode === "right" ? 1 : 0 }}
        aria-hidden
      >
        <span>{t.tasksSwipeComplete}</span>
      </div>
      {/* Reveal: left-swipe = reschedule + delete */}
      <div
        className="tasks-swipe-bg tasks-swipe-bg-left"
        style={{ opacity: swipeMode === "left" ? 1 : 0 }}
        aria-hidden={swipeMode !== "left"}
      >
        <button
          type="button"
          className="tasks-swipe-btn tasks-swipe-btn-reschedule"
          onClick={(e) => {
            e.stopPropagation();
            resetSwipe();
            const rect = (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect();
            setPickerAnchor(rect);
            setPickerOpen(true);
          }}
        >
          {t.tasksSwipeReschedule}
        </button>
        <button
          type="button"
          className="tasks-swipe-btn tasks-swipe-btn-delete"
          onClick={(e) => {
            e.stopPropagation();
            resetSwipe();
            onDelete();
          }}
        >
          {t.tasksSwipeDelete}
        </button>
      </div>

      {/* Foreground row — the thing that translates */}
      <div
        className="tasks-row"
        data-done={entry.done ? "true" : "false"}
        data-expanded={expanded ? "true" : "false"}
        data-pinned={entry.pinned ? "true" : "false"}
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: animating ? SWIPE_SPRING : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="tasks-row-main">
          {/* Checkbox */}
          <button
            type="button"
            className="tasks-check"
            data-done={entry.done ? "true" : "false"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
            title={entry.done ? t.tasksMarkOpen : t.tasksMarkDone}
            aria-label={entry.done ? t.tasksMarkOpen : t.tasksMarkDone}
            aria-pressed={entry.done}
          >
            {entry.done && (
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Title + meta (tap to expand / edit) */}
          <div className="tasks-body">
            {editingTitle && !locked ? (
              <input
                ref={titleRefIfNew ?? undefined}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitTitle(draftTitle.trim());
                  if (e.key === "Escape") onCancelTitle();
                }}
                onBlur={() => onCommitTitle(draftTitle.trim())}
                autoFocus
                className="tasks-title-input"
                placeholder={t.tasksNewTitlePlaceholder}
              />
            ) : (
              <button
                type="button"
                className="tasks-title-btn"
                data-done={entry.done ? "true" : "false"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (locked) return;
                  onToggleExpanded();
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!locked) onStartEditTitle();
                }}
              >
                {entry.title || (
                  <span
                    style={{
                      color: "var(--text-faint)",
                      fontStyle: "italic",
                    }}
                  >
                    {t.tasksNewTitlePlaceholder}
                  </span>
                )}
              </button>
            )}

            <div className="tasks-meta">
              {dueMeta && (
                <span
                  className="tasks-meta-due"
                  data-overdue={overdue ? "true" : "false"}
                  data-today={today ? "true" : "false"}
                >
                  {dueMeta}
                </span>
              )}
              {overdue && (
                <span className="tasks-badge tasks-badge-overdue">
                  {t.tasksBadgeOverdue}
                </span>
              )}
              {!overdue && today && (
                <span className="tasks-badge tasks-badge-today">
                  {t.tasksBadgeToday}
                </span>
              )}
              {entry.starred && <span className="tasks-meta-star">★</span>}
              {entry.pinned && <span className="tasks-meta-pin">◆</span>}
              {entry.done && completedMeta && (
                <span className="tasks-meta-done">
                  {t.tasksCompletedPrefix} · {completedMeta}
                </span>
              )}
            </div>

            {entry.category && (
              <div className="tasks-cat-row">
                <span className="tasks-cat-chip">{entry.category}</span>
              </div>
            )}
          </div>

          {/* Priority dot */}
          {!locked ? (
            <button
              type="button"
              className="tasks-priority"
              onClick={(e) => {
                e.stopPropagation();
                onCyclePriority();
              }}
              title={t.tasksPriorityCycle}
              aria-label={t.tasksPriorityCycle}
              style={{
                background: pColor ?? "transparent",
                borderColor: pColor ?? "rgba(216, 146, 116, 0.32)",
              }}
            />
          ) : (
            <span
              className="tasks-priority"
              aria-hidden
              style={{
                background: pColor ?? "transparent",
                borderColor: pColor ?? "rgba(216, 146, 116, 0.32)",
              }}
            />
          )}
        </div>

        {/* Expanded inline details */}
        {expanded && (
          <div className="tasks-details" onPointerDown={(e) => e.stopPropagation()}>
            <DetailsField
              label={t.tasksDetailsNoteLabel}
              value={entry.note ?? ""}
              placeholder={t.tasksDetailsNotePlaceholder}
              multiline
              locked={locked}
              onCommit={(v) => onUpdate({ note: v || undefined })}
            />
            <DetailsField
              label={t.tasksDetailsSongLabel}
              value={entry.linkedSong ?? ""}
              placeholder={t.tasksDetailsSongPlaceholder}
              locked={locked}
              onCommit={(v) => onUpdate({ linkedSong: v || undefined })}
            />
            <DetailsField
              label={t.tasksDetailsVendorLabel}
              value={entry.vendor ?? ""}
              placeholder={t.tasksDetailsVendorPlaceholder}
              locked={locked}
              onCommit={(v) => onUpdate({ vendor: v || undefined })}
            />
            <div className="tasks-details-reminder">
              <label className="tasks-details-reminder-label">
                <span className="tasks-details-label-text">
                  {t.tasksDetailsReminderLabel}
                </span>
                <span className="tasks-details-reminder-hint">
                  {t.tasksDetailsReminderHint}
                </span>
              </label>
              <button
                type="button"
                className="tasks-toggle"
                data-on={entry.reminder ? "true" : "false"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (locked) return;
                  onUpdate({ reminder: !entry.reminder });
                }}
                role="switch"
                aria-checked={entry.reminder ?? false}
                disabled={locked}
              >
                <span className="tasks-toggle-knob" />
              </button>
            </div>
          </div>
        )}

        {/* Long-press menu */}
        {menuOpen && (
          <LongPressMenu
            t={t}
            entry={entry}
            onClose={() => setMenuOpen(false)}
            onEdit={() => {
              setMenuOpen(false);
              onStartEditTitle();
            }}
            onReschedule={(rect) => {
              setMenuOpen(false);
              setPickerAnchor(rect);
              setPickerOpen(true);
            }}
            onTogglePin={() => {
              setMenuOpen(false);
              onTogglePinned();
            }}
            onDelete={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        )}

        {/* Hidden anchor for reschedule from menu when no rect */}
        {pickerOpen && (
          <DueDatePicker
            value={entry.due}
            onChange={(iso) => onCommitDue(iso)}
            onClose={() => setPickerOpen(false)}
            lang={lang}
            t={t}
            anchorRect={pickerAnchor}
          />
        )}

        {/* Hidden quick-open chip when no due — small affordance in
            expanded view so we still expose "Add due" without crowding
            the meta line. */}
        {expanded && !entry.due && !entry.done && !locked && (
          <div className="tasks-details-due-row">
            <button
              type="button"
              className="tasks-add-due-chip"
              onClick={(e) => openPicker(e)}
            >
              <CalendarGlyph />
              <span>{t.tasksAddDue}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Details inline field ───────────────────────────────────── */

interface DetailsFieldProps {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  locked: boolean;
  onCommit: (v: string) => void;
}

function DetailsField({
  label,
  value,
  placeholder,
  multiline,
  locked,
  onCommit,
}: DetailsFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commonProps = {
    value: draft,
    placeholder,
    disabled: locked,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setDraft(e.target.value),
    onBlur: () => {
      if (draft !== value) onCommit(draft);
    },
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    className: "tasks-details-input",
  };

  return (
    <div className="tasks-details-field">
      <div className="tasks-details-label-text">{label}</div>
      {multiline ? (
        <textarea {...commonProps} rows={2} />
      ) : (
        <input type="text" {...commonProps} />
      )}
    </div>
  );
}

/* ── Long-press menu ─────────────────────────────────────── */

interface LongPressMenuProps {
  t: Strings;
  entry: TaskEntry;
  onClose: () => void;
  onEdit: () => void;
  onReschedule: (rect: DOMRect) => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function LongPressMenu({
  t,
  entry,
  onClose,
  onEdit,
  onReschedule,
  onTogglePin,
  onDelete,
}: LongPressMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(ev: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) onClose();
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="tasks-longpress-menu"
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className="tasks-longpress-item"
        onClick={onEdit}
      >
        {t.tasksMenuEdit}
      </button>
      <button
        type="button"
        role="menuitem"
        className="tasks-longpress-item"
        onClick={(e) =>
          onReschedule((e.currentTarget as HTMLElement).getBoundingClientRect())
        }
      >
        {t.tasksMenuReschedule}
      </button>
      <button
        type="button"
        role="menuitem"
        className="tasks-longpress-item"
        onClick={onTogglePin}
      >
        {entry.pinned ? t.tasksMenuUnpin : t.tasksMenuPin}
      </button>
      <button
        type="button"
        role="menuitem"
        className="tasks-longpress-item tasks-longpress-item-danger"
        onClick={onDelete}
      >
        {t.tasksMenuDelete}
      </button>
    </div>
  );
}

/* ── Misc helpers ───────────────────────────────────────── */

function EmptyMessage({ label }: { label: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 16px",
        color: "var(--text-faint)",
        fontStyle: "italic",
        fontSize: 14,
      }}
    >
      {label}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

/* ── Component-local CSS ──────────────────────────────────────
   Kept in this file rather than globals.css so the redesign is a
   single-file change and easy to back out. Only safe utilities and
   data-attribute selectors. */

const TASKS_V3_CSS = `
.tasks-add-btn {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--gold-400);
  color: #1a1310;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  box-shadow: 0 8px 18px -8px rgba(216, 146, 116, 0.55);
  transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 200ms ease;
}
.tasks-add-btn:hover { transform: translateY(-1px); }
.tasks-add-btn:active { transform: scale(0.94); }

.tasks-filter-chip {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1;
  letter-spacing: 0.02em;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid rgba(216, 146, 116, 0.28);
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease,
              transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
}
.tasks-filter-chip:hover {
  border-color: rgba(216, 146, 116, 0.55);
  color: var(--text);
}
.tasks-filter-chip[data-active="true"] {
  background: var(--gold-400);
  color: #1a1310;
  border-color: var(--gold-400);
  font-weight: 600;
}

.tasks-row-shell {
  position: relative;
  margin-bottom: 4px;
  border-radius: 12px;
  overflow: hidden;
  animation: tasks-row-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.tasks-row-shell[data-pending-delete="true"] {
  animation: tasks-row-out 220ms ease-in both;
}

@keyframes tasks-row-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tasks-row-out {
  from { opacity: 1; transform: translateX(0); max-height: 120px; }
  to   { opacity: 0; transform: translateX(-100%); max-height: 0; }
}

.tasks-swipe-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 12px;
  pointer-events: none;
  transition: opacity 180ms ease;
}
.tasks-swipe-bg-complete {
  background: linear-gradient(90deg,
    var(--gold-400) 0%,
    rgba(216, 146, 116, 0.7) 100%);
  color: #1a1310;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.06em;
  justify-content: flex-start;
}
.tasks-swipe-bg-left {
  background: rgba(20, 13, 10, 0.4);
  border: 1px solid rgba(216, 146, 116, 0.18);
  justify-content: flex-end;
  gap: 8px;
  pointer-events: none;
}
.tasks-swipe-bg-left[style*="opacity: 1"] {
  pointer-events: auto;
}
.tasks-swipe-btn {
  height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 160ms ease;
}
.tasks-swipe-btn:active { transform: scale(0.96); }
.tasks-swipe-btn-reschedule {
  background: rgba(216, 146, 116, 0.18);
  color: var(--gold-300);
  border: 1px solid rgba(216, 146, 116, 0.42);
}
.tasks-swipe-btn-delete {
  background: var(--danger);
  color: #1a1310;
}

.tasks-row {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(216, 146, 116, 0.16);
  border-radius: 12px;
  touch-action: pan-y;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.tasks-row[data-done="true"] {
  background: rgba(216, 146, 116, 0.04);
  border-color: rgba(216, 146, 116, 0.10);
}
.tasks-row[data-pinned="true"] {
  border-color: rgba(216, 146, 116, 0.42);
  box-shadow: inset 0 0 0 1px rgba(216, 146, 116, 0.12);
}

.tasks-row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  min-height: 52px;
}

.tasks-check {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1.5px solid var(--gold-400);
  background: transparent;
  color: var(--gold-300);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Ensure 44px hit target via padding mask */
  position: relative;
  transition: background 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 160ms ease;
}
.tasks-check::before {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: 999px;
}
.tasks-check[data-done="true"] {
  background: var(--gold-400);
  color: #1a1310;
  transform: scale(1);
}
.tasks-check:active { transform: scale(0.92); }

.tasks-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tasks-title-btn,
.tasks-title-input {
  background: transparent;
  border: none;
  padding: 0;
  text-align: start;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0.01em;
  word-break: break-word;
  cursor: pointer;
  width: 100%;
  outline: none;
  font-family: inherit;
}
.tasks-title-btn[data-done="true"] {
  color: var(--text-muted);
  text-decoration: line-through;
  opacity: 0.7;
  transition: opacity 200ms ease, color 200ms ease;
}
.tasks-title-input {
  border-bottom: 1px solid var(--gold-400);
  padding: 2px 0;
}

.tasks-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.2;
}
.tasks-meta-due {
  color: var(--text-muted);
}
.tasks-meta-due[data-overdue="true"] {
  color: var(--danger);
  font-weight: 500;
}
.tasks-meta-due[data-today="true"] {
  color: var(--gold-300);
  font-weight: 500;
}
.tasks-meta-star {
  color: var(--gold-400);
  font-size: 12px;
  line-height: 1;
}
.tasks-meta-pin {
  color: var(--gold-300);
  font-size: 10px;
  line-height: 1;
}
.tasks-meta-done {
  color: var(--text-faint);
  font-size: 11px;
}

.tasks-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
}
.tasks-badge-overdue {
  background: rgba(243, 160, 138, 0.16);
  color: var(--danger);
  border: 1px solid rgba(243, 160, 138, 0.42);
}
.tasks-badge-today {
  background: rgba(216, 146, 116, 0.16);
  color: var(--gold-300);
  border: 1px solid rgba(216, 146, 116, 0.42);
}

.tasks-cat-row {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tasks-cat-chip {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--gold-300);
  border: 1px solid rgba(216, 146, 116, 0.32);
  background: transparent;
}

.tasks-priority {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 1px solid;
  background: transparent;
  cursor: pointer;
  position: relative;
  padding: 0;
  transition: transform 160ms ease, background 180ms ease;
}
.tasks-priority::before {
  content: "";
  position: absolute;
  inset: -16px;
  border-radius: 999px;
}
.tasks-priority:active { transform: scale(0.85); }

.tasks-details {
  border-top: 1px solid rgba(216, 146, 116, 0.14);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: tasks-details-in 240ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes tasks-details-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.tasks-details-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tasks-details-label-text {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold-400);
  font-family: var(--font-display, serif);
}
.tasks-details-input {
  width: 100%;
  background: rgba(216, 146, 116, 0.06);
  border: 1px solid rgba(216, 146, 116, 0.22);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 36px;
  transition: border-color 180ms ease, background 180ms ease;
}
.tasks-details-input:focus {
  border-color: var(--gold-400);
  background: rgba(216, 146, 116, 0.10);
}
.tasks-details-input:disabled {
  opacity: 0.6;
  cursor: default;
}

.tasks-details-reminder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;
}
.tasks-details-reminder-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tasks-details-reminder-hint {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}
.tasks-toggle {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(216, 146, 116, 0.32);
  background: rgba(216, 146, 116, 0.10);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: background 200ms ease, border-color 200ms ease;
}
.tasks-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.tasks-toggle-knob {
  position: absolute;
  top: 2px;
  inset-inline-start: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--gold-300);
  transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1),
              background 200ms ease;
}
.tasks-toggle[data-on="true"] {
  background: var(--gold-400);
  border-color: var(--gold-400);
}
.tasks-toggle[data-on="true"] .tasks-toggle-knob {
  transform: translateX(20px);
  background: #1a1310;
}
[dir="rtl"] .tasks-toggle[data-on="true"] .tasks-toggle-knob {
  transform: translateX(-20px);
}

.tasks-details-due-row {
  padding: 0 12px 12px;
}
.tasks-add-due-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  background: transparent;
  color: var(--text-faint);
  border: 1px dashed rgba(216, 146, 116, 0.32);
  font-size: 12px;
  cursor: pointer;
  font-style: italic;
}
.tasks-add-due-chip:hover { color: var(--gold-300); }

.tasks-completed-toggle {
  width: 100%;
  margin-top: 16px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(216, 146, 116, 0.04);
  border: 1px solid rgba(216, 146, 116, 0.14);
  color: var(--text-muted);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 0.04em;
}

.tasks-longpress-menu {
  position: absolute;
  z-index: 4;
  top: 8px;
  inset-inline-start: 48px;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(62, 47, 37, 0.98) 0%, rgba(46, 35, 28, 0.99) 100%);
  border: 1px solid rgba(216, 146, 116, 0.32);
  border-radius: 12px;
  box-shadow: 0 16px 32px -12px rgba(0, 0, 0, 0.6);
  padding: 4px;
  min-width: 168px;
  animation: tasks-menu-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes tasks-menu-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.tasks-longpress-item {
  text-align: start;
  padding: 8px 12px;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: background 160ms ease;
}
.tasks-longpress-item:hover {
  background: rgba(216, 146, 116, 0.10);
}
.tasks-longpress-item-danger {
  color: var(--danger);
}
`;
