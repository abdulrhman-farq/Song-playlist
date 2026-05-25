"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconDrag,
  IconEdit,
  IconPause,
  IconPlay,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  /** `null` for the implicit Unassigned section — only the play button is rendered. */
  sectionId: string | null;
  /** Number of tracks inside this section (used for delete confirmation copy + disabling play). */
  trackCount: number;
  /** Is this section's first track currently the active one? */
  hasActive: boolean;
  isPlaying: boolean;
  isFirst: boolean;
  isLast: boolean;

  onPlay: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;

  /** Drag handle props — supplied by parent so DnD state lives in TrackList. */
  onSectionDragStart?: (e: React.DragEvent) => void;
  onSectionDragEnd?: (e: React.DragEvent) => void;
}

/**
 * Section-level toolbar shown beneath each section title.
 * Always visible (not hover-gated), grouped horizontally.
 *
 *   play | grip | up | down | rename | duplicate | delete (inline confirm)
 */
export default function SectionToolbar({
  t,
  sectionId,
  trackCount,
  hasActive,
  isPlaying,
  isFirst,
  isLast,
  onPlay,
  onMoveUp,
  onMoveDown,
  onRename,
  onDuplicate,
  onDelete,
  onSectionDragStart,
  onSectionDragEnd,
}: Props) {
  const PlayIcon = hasActive && isPlaying ? IconPause : IconPlay;
  const isManaged = sectionId !== null;

  // Inline delete confirmation: first click reveals the confirm pill,
  // second click (or pressing the same delete) commits; clicking
  // anywhere else / pressing Escape cancels.
  const [confirming, setConfirming] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!confirming) return;
    function onDocDown(e: MouseEvent) {
      const node = wrapRef.current;
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setConfirming(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirming(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [confirming]);

  function handleDeleteClick() {
    if (!onDelete) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onDelete();
  }

  return (
    <div
      ref={wrapRef}
      className="flex items-center gap-1 flex-wrap"
      role="toolbar"
      aria-label={t.sections}
    >
      <button
        type="button"
        className="icon-btn"
        onClick={onPlay}
        disabled={trackCount === 0}
        aria-label={t.play}
        title={t.play}
        style={{
          width: 38,
          height: 38,
          background: trackCount > 0 ? "var(--gold-400)" : undefined,
          color: trackCount > 0 ? "#050505" : undefined,
        }}
      >
        <PlayIcon size={16} />
      </button>

      {isManaged && (
        <>
          {/* Drag handle — the section becomes draggable only when this handle owns the gesture. */}
          <span
            className="icon-btn"
            role="button"
            tabIndex={0}
            draggable
            onDragStart={onSectionDragStart}
            onDragEnd={onSectionDragEnd}
            aria-label={t.dragSectionHint}
            title={t.dragSectionHint}
            style={{
              cursor: "grab",
              color: "var(--text-faint)",
            }}
          >
            <IconDrag size={14} />
          </span>

          <button
            type="button"
            className="icon-btn"
            onClick={onMoveUp}
            disabled={isFirst}
            title={t.moveSectionUp}
            aria-label={t.moveSectionUp}
          >
            <IconArrowUp size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveDown}
            disabled={isLast}
            title={t.moveSectionDown}
            aria-label={t.moveSectionDown}
          >
            <IconArrowDown size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onRename}
            title={t.renameSection}
            aria-label={t.renameSection}
          >
            <IconEdit size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onDuplicate}
            title={t.duplicateSection}
            aria-label={t.duplicateSection}
          >
            <IconPlus size={14} />
          </button>

          {/* Delete with inline confirm pill */}
          {confirming ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              title={t.deleteSection}
              aria-label={t.confirmDelete}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 12px",
                borderRadius: 999,
                background: "rgba(243, 160, 138, 0.15)",
                border: "1px solid #f3a08a",
                color: "#f3a08a",
                fontSize: 12,
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              <IconTrash size={12} />
              <span>
                {t.confirmDelete} · {trackCount}{" "}
                {trackCount === 1 ? t.track : t.tracks}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn"
              style={{ color: "#f3a08a" }}
              onClick={handleDeleteClick}
              title={t.deleteSection}
              aria-label={t.deleteSection}
            >
              <IconTrash size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
