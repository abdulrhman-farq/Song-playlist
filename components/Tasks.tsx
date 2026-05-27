"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DueDatePicker from "@/components/DueDatePicker";
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import { useLockMode } from "@/lib/lockMode";
import {
  defaultTasks,
  loadTasks,
  newTask,
  saveTasks,
} from "@/lib/tasksStorage";
import { formatDue, isOverdue, parseDue } from "@/lib/dueDate";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { Language, TaskDoc, TaskEntry } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  onClose: () => void;
}

/**
 * Wedding-prep to-do board. Modal overlay (matching the Timeline)
 * with a peach-on-sepia premium look. Persists to localStorage; the
 * default seed is the couple's real Google Tasks list.
 *
 * - Tap the circle/check to toggle complete.
 * - Tap the title to edit it inline.
 * - Star toggles "important" sort priority.
 * - Trash deletes (with a confirm via native confirm() to keep the
 *   surface area small — the playlist already has a fancier dialog).
 */
export default function Tasks({ lang, t, onClose }: Props) {
  const direction = dirOf(lang);
  const lock = useLockMode();

  const [doc, setDoc] = useState<TaskDoc>(() => defaultTasks());
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);
  const newTitleRef = useRef<HTMLInputElement | null>(null);

  // Hydrate from localStorage on mount, then mark hydrated so the
  // save effect below doesn't immediately overwrite stored data with
  // the seed.
  useEffect(() => {
    const stored = loadTasks();
    if (stored) setDoc(stored);
    setHydrated(true);
  }, []);

  // Persist whenever the doc changes (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    saveTasks(doc);
  }, [doc, hydrated]);

  // Split open vs completed and sort chronologically:
  // - Open: earliest due first, no-due → bottom; starred floats inside
  //   each "has-due" / "no-due" group.
  // - Completed: most recent completion first.
  const { openEntries, completedEntries } = useMemo(() => {
    const open: TaskEntry[] = [];
    const done: TaskEntry[] = [];
    for (const e of doc.entries) {
      (e.done ? done : open).push(e);
    }
    const openSorted = open.slice().sort((a, b) => {
      const da = parseDue(a.due);
      const db = parseDue(b.due);
      // No-due sinks to the bottom.
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (da && db) {
        if (da.getTime() !== db.getTime()) {
          return da.getTime() - db.getTime();
        }
      }
      // Same date (or both undated): starred first.
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

  function update(id: string, patch: Partial<TaskEntry>) {
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function toggle(id: string) {
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
  }

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm(t.confirmDeleteTask)) {
      return;
    }
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }));
  }

  function addNewTask() {
    const fresh = { ...newTask(), title: "" };
    setDoc((prev) => ({ ...prev, entries: [fresh, ...prev.entries] }));
    setEditingId(fresh.id);
    // Focus the new row's title input after it mounts
    setTimeout(() => newTitleRef.current?.focus(), 0);
  }

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(216, 146, 116, 0.18)",
            background:
              "linear-gradient(90deg, rgba(216,146,116,0.07) 0%, transparent 60%)",
          }}
        >
          <div className="min-w-0">
            <div
              className="eyebrow"
              style={{ color: "var(--gold-400)", letterSpacing: "0.28em" }}
            >
              {t.tasksEyebrow}
            </div>
            <h2
              className="font-display italic mt-1 truncate"
              style={{
                fontSize: "clamp(22px, 2.6vw, 28px)",
                color: "var(--text)",
              }}
            >
              {t.tasksTitle}
            </h2>
            <div
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {openEntries.length} {t.tasksOpenLabel} ·{" "}
              {completedEntries.length} {t.tasksDoneLabel}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!lock.locked && (
              <button
                type="button"
                className="icon-btn"
                onClick={addNewTask}
                title={t.tasksAdd}
                aria-label={t.tasksAdd}
                style={{
                  background: "var(--gold-400)",
                  color: "#1a1310",
                  width: 36,
                  height: 36,
                }}
              >
                <IconPlus size={16} />
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              title={t.close}
              aria-label={t.close}
              style={{ width: 36, height: 36 }}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Body — scrollable list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {openEntries.length === 0 && completedEntries.length === 0 && (
            <div
              className="text-center py-12 italic"
              style={{ color: "var(--text-faint)" }}
            >
              {t.tasksEmpty}
            </div>
          )}

          {openEntries.map((e) => (
            <TaskRow
              key={e.id}
              entry={e}
              t={t}
              lang={lang}
              direction={direction}
              editing={editingId === e.id}
              titleRef={editingId === e.id ? newTitleRef : null}
              locked={lock.locked}
              onToggle={() => toggle(e.id)}
              onCommitTitle={(title) => {
                update(e.id, { title });
                setEditingId(null);
              }}
              onCancelTitle={() => setEditingId(null)}
              onStartEditTitle={() => setEditingId(e.id)}
              onCommitDue={(due) => {
                update(e.id, { due: due || undefined });
              }}
              onToggleStar={() => update(e.id, { starred: !e.starred })}
              onDelete={() => remove(e.id)}
            />
          ))}

          {completedEntries.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCompletedOpen((v) => !v)}
                className="w-full mt-4 px-3 py-2 flex items-center justify-between rounded-lg"
                style={{
                  background: "rgba(216, 146, 116, 0.04)",
                  border: "1px solid rgba(216, 146, 116, 0.14)",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
                aria-expanded={completedOpen}
              >
                <span>
                  {t.tasksCompletedHeading} ({completedEntries.length})
                </span>
                <span style={{ color: "var(--gold-400)" }}>
                  {completedOpen ? "▾" : "▸"}
                </span>
              </button>
              {completedOpen &&
                completedEntries.map((e) => (
                  <TaskRow
                    key={e.id}
                    entry={e}
                    t={t}
                    lang={lang}
                    direction={direction}
                    editing={editingId === e.id}
                    titleRef={null}
                    locked={lock.locked}
                    onToggle={() => toggle(e.id)}
                    onCommitTitle={(title) => {
                      update(e.id, { title });
                      setEditingId(null);
                    }}
                    onCancelTitle={() => setEditingId(null)}
                    onStartEditTitle={() => setEditingId(e.id)}
                    onCommitDue={(due) => {
                      update(e.id, { due: due || undefined });
                    }}
                    onToggleStar={() => update(e.id, { starred: !e.starred })}
                    onDelete={() => remove(e.id)}
                  />
                ))}
            </>
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
  direction: "ltr" | "rtl";
  editing: boolean;
  titleRef: React.Ref<HTMLInputElement> | null;
  locked: boolean;
  onToggle: () => void;
  onCommitTitle: (title: string) => void;
  onCancelTitle: () => void;
  onStartEditTitle: () => void;
  onCommitDue: (due: string) => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

function TaskRow({
  entry,
  t,
  lang,
  direction: _direction,
  editing,
  titleRef,
  locked,
  onToggle,
  onCommitTitle,
  onCancelTitle,
  onStartEditTitle,
  onCommitDue,
  onToggleStar,
  onDelete,
}: RowProps) {
  const [draftTitle, setDraftTitle] = useState(entry.title);
  useEffect(() => setDraftTitle(entry.title), [entry.title]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const dueLabel = formatDue(entry.due, lang);
  const completedLabel = entry.completedAt
    ? formatDue(entry.completedAt, lang)
    : "";
  const overdue = !entry.done && isOverdue(entry.due);

  function openPicker(e: React.MouseEvent) {
    if (locked) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAnchorRect(rect);
    setPickerOpen(true);
  }

  return (
    <div
      className="group flex items-start gap-3 px-3 py-3 rounded-lg"
      style={{
        background: entry.done
          ? "rgba(216, 146, 116, 0.03)"
          : "rgba(255, 255, 255, 0.02)",
        border: "1px solid",
        borderColor: entry.done
          ? "rgba(216, 146, 116, 0.10)"
          : "rgba(216, 146, 116, 0.16)",
        transition: "background 180ms ease",
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5"
        title={entry.done ? t.tasksMarkOpen : t.tasksMarkDone}
        aria-label={entry.done ? t.tasksMarkOpen : t.tasksMarkDone}
        aria-pressed={entry.done}
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "1.5px solid var(--gold-400)",
          background: entry.done ? "var(--gold-400)" : "transparent",
          color: entry.done ? "#1a1310" : "var(--gold-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {entry.done && <IconCheck size={12} />}
      </button>

      {/* Title + due */}
      <div className="min-w-0 flex-1">
        {editing && !locked ? (
          <input
            ref={titleRef ?? undefined}
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitTitle(draftTitle.trim());
              if (e.key === "Escape") onCancelTitle();
            }}
            onBlur={() => onCommitTitle(draftTitle.trim())}
            autoFocus
            className="w-full bg-transparent outline-none"
            style={{
              color: "var(--text)",
              fontSize: 15,
              borderBottom: "1px solid var(--gold-400)",
              padding: "2px 0",
            }}
            placeholder={t.tasksNewTitlePlaceholder}
          />
        ) : (
          <button
            type="button"
            onClick={locked ? undefined : onStartEditTitle}
            disabled={locked}
            className="text-start w-full"
            style={{
              fontSize: 15,
              color: entry.done ? "var(--text-muted)" : "var(--text)",
              textDecoration: entry.done ? "line-through" : "none",
              opacity: entry.done ? 0.75 : 1,
              cursor: locked ? "default" : "text",
              wordBreak: "break-word",
            }}
            title={locked ? entry.title : t.tasksEditTitle}
          >
            {entry.title || (
              <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>
                {t.tasksNewTitlePlaceholder}
              </span>
            )}
          </button>
        )}

        {entry.note && !editing && (
          <div
            className="mt-1 text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            {entry.note}
          </div>
        )}

        {/* Due chip — opens the native datetime picker on tap. The
            hidden datetime-local input sits behind the styled chip so
            the chip stays peach-on-sepia but iOS/Android still show
            their full calendar + time UI. The original due date stays
            visible after completion (matching Google Tasks), with a
            small "Completed …" line appended below. */}
        <div className="mt-1.5 flex flex-col gap-1 items-start">
          {entry.due ? (
            <button
              type="button"
              onClick={openPicker}
              disabled={locked}
              className="inline-flex items-center gap-1.5 rounded-full text-[12px]"
              style={{
                color: entry.done
                  ? "var(--text-muted)"
                  : overdue
                    ? "var(--danger)"
                    : "var(--gold-300)",
                border: "1px solid",
                borderColor: entry.done
                  ? "rgba(216, 146, 116, 0.15)"
                  : overdue
                    ? "rgba(243, 160, 138, 0.5)"
                    : "rgba(216, 146, 116, 0.3)",
                padding: "3px 10px",
                cursor: locked ? "default" : "pointer",
                opacity: entry.done ? 0.75 : 1,
              }}
              title={locked ? undefined : t.tasksEditDue}
            >
              <CalendarGlyph />
              <span>{dueLabel}</span>
            </button>
          ) : (
            !locked &&
            !entry.done && (
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-1.5 text-[12px] italic"
                style={{ color: "var(--text-faint)", cursor: "pointer" }}
              >
                <CalendarGlyph />
                <span>{t.tasksAddDue}</span>
              </button>
            )
          )}

          {entry.done && completedLabel && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "var(--text-faint)" }}
            >
              <CheckMini />
              <span>
                {t.tasksCompletedPrefix}: {completedLabel}
              </span>
            </span>
          )}

          {pickerOpen && (
            <DueDatePicker
              value={entry.due}
              onChange={(iso) => onCommitDue(iso)}
              onClose={() => setPickerOpen(false)}
              lang={lang}
              t={t}
              anchorRect={anchorRect}
            />
          )}
        </div>
      </div>

      {/* Star + delete */}
      {!locked && (
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onToggleStar}
            className="icon-btn"
            style={{
              width: 26,
              height: 26,
              color: entry.starred ? "var(--gold-400)" : "var(--text-faint)",
            }}
            title={entry.starred ? t.tasksUnstar : t.tasksStar}
            aria-label={entry.starred ? t.tasksUnstar : t.tasksStar}
            aria-pressed={entry.starred ?? false}
          >
            <StarGlyph filled={entry.starred ?? false} />
          </button>
          <button
            type="button"
            onClick={onStartEditTitle}
            className="icon-btn opacity-0 group-hover:opacity-100 transition"
            style={{ width: 26, height: 26 }}
            title={t.tasksEditTitle}
            aria-label={t.tasksEditTitle}
          >
            <IconEdit size={12} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="icon-btn opacity-0 group-hover:opacity-100 transition"
            style={{ width: 26, height: 26, color: "var(--danger)" }}
            title={t.delete}
            aria-label={t.delete}
          >
            <IconTrash size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Small inline icons (kept local so we don't grow icons.tsx) ── */

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

function CheckMini() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17 6 21 7.5 14 2 9.5 9 9 12 2" />
    </svg>
  );
}

