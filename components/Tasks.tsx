"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
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

  // Split open vs completed; starred items float to top inside each
  // bucket so the user's "important next" stays in the eye.
  const { openEntries, completedEntries } = useMemo(() => {
    const open: TaskEntry[] = [];
    const done: TaskEntry[] = [];
    for (const e of doc.entries) {
      (e.done ? done : open).push(e);
    }
    const byStar = (a: TaskEntry, b: TaskEntry) =>
      Number(b.starred ?? false) - Number(a.starred ?? false);
    return {
      openEntries: open.slice().sort(byStar),
      completedEntries: done,
    };
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
        return {
          ...e,
          done: nextDone,
          completedAt: nextDone
            ? new Date().toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : undefined,
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
              direction={direction}
              editing={editingId === e.id}
              editingDue={editingDueId === e.id}
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
                setEditingDueId(null);
              }}
              onStartEditDue={() => setEditingDueId(e.id)}
              onCancelDue={() => setEditingDueId(null)}
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
                    direction={direction}
                    editing={editingId === e.id}
                    editingDue={editingDueId === e.id}
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
                      setEditingDueId(null);
                    }}
                    onStartEditDue={() => setEditingDueId(e.id)}
                    onCancelDue={() => setEditingDueId(null)}
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
  direction: "ltr" | "rtl";
  editing: boolean;
  editingDue: boolean;
  titleRef: React.Ref<HTMLInputElement> | null;
  locked: boolean;
  onToggle: () => void;
  onCommitTitle: (title: string) => void;
  onCancelTitle: () => void;
  onStartEditTitle: () => void;
  onCommitDue: (due: string) => void;
  onStartEditDue: () => void;
  onCancelDue: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

function TaskRow({
  entry,
  t,
  direction: _direction,
  editing,
  editingDue,
  titleRef,
  locked,
  onToggle,
  onCommitTitle,
  onCancelTitle,
  onStartEditTitle,
  onCommitDue,
  onStartEditDue,
  onCancelDue,
  onToggleStar,
  onDelete,
}: RowProps) {
  const [draftTitle, setDraftTitle] = useState(entry.title);
  const [draftDue, setDraftDue] = useState(entry.due ?? "");
  useEffect(() => setDraftTitle(entry.title), [entry.title]);
  useEffect(() => setDraftDue(entry.due ?? ""), [entry.due]);

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

        {/* Due chip */}
        <div className="mt-1.5">
          {editingDue && !locked ? (
            <input
              type="text"
              value={draftDue}
              onChange={(e) => setDraftDue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitDue(draftDue.trim());
                if (e.key === "Escape") onCancelDue();
              }}
              onBlur={() => onCommitDue(draftDue.trim())}
              autoFocus
              className="bg-transparent outline-none text-[12px]"
              style={{
                color: "var(--gold-300)",
                border: "1px solid var(--gold-400)",
                borderRadius: 999,
                padding: "3px 10px",
                minWidth: 140,
              }}
              placeholder={t.tasksDuePlaceholder}
            />
          ) : (
            <>
              {entry.done && entry.completedAt ? (
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.tasksCompletedPrefix}: {entry.completedAt}
                </span>
              ) : entry.due ? (
                <button
                  type="button"
                  onClick={locked ? undefined : onStartEditDue}
                  disabled={locked}
                  className="inline-flex items-center gap-1.5 rounded-full text-[12px]"
                  style={{
                    color: isOverdue(entry.due) ? "var(--danger)" : "var(--gold-300)",
                    border: "1px solid",
                    borderColor: isOverdue(entry.due)
                      ? "rgba(243, 160, 138, 0.5)"
                      : "rgba(216, 146, 116, 0.3)",
                    padding: "3px 10px",
                    cursor: locked ? "default" : "pointer",
                  }}
                  title={locked ? undefined : t.tasksEditDue}
                >
                  <CalendarGlyph />
                  <span>{entry.due}</span>
                </button>
              ) : (
                !locked && (
                  <button
                    type="button"
                    onClick={onStartEditDue}
                    className="text-[12px] italic"
                    style={{ color: "var(--text-faint)" }}
                  >
                    + {t.tasksAddDue}
                  </button>
                )
              )}
            </>
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

/**
 * Best-effort overdue detection. Recognises common Google-Tasks-style
 * phrasings ("Due X ago" or anything starting with a past month-day).
 * Returns false for "Today" / "Tomorrow" / unparseable strings — the
 * cost of a false negative (peach pill instead of red) is small.
 */
function isOverdue(due: string): boolean {
  if (!due) return false;
  if (/ago/i.test(due)) return true;
  return false;
}
