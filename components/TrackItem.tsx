"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  EditIcon,
  GripIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons";
import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Language, Track } from "@/types";
import { youtubeThumbnail } from "@/lib/youtube";

interface Props {
  lang: Language;
  track: Track;
  index: number;
  total: number;
  isActive: boolean;
  isPlaying: boolean;
  isPlayable: boolean;
  onPlayPause: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
}

export default function TrackItem({
  lang,
  track,
  index,
  total,
  isActive,
  isPlaying,
  isPlayable,
  onPlayPause,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  isDropTarget,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(track.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commitRename() {
    const value = draftTitle.trim();
    if (value && value !== track.title) {
      onRename(value);
    }
    setEditing(false);
  }

  const sourceLabel = track.source === "youtube" ? t(lang, "sourceYouTube") : t(lang, "sourceUpload");

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => e.preventDefault()}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl border transition ${
        isActive
          ? "bg-gold-400/10 border-gold-400/50"
          : "bg-ink-800/60 border-gold-400/10 hover:border-gold-400/30"
      } ${isDragging ? "dragging" : ""} ${isDropTarget ? "drop-target" : ""}`}
    >
      <button
        type="button"
        aria-label={t(lang, "moveUp")}
        title={t(lang, "moveUp")}
        className="icon-button cursor-grab"
      >
        <GripIcon width={18} height={18} />
      </button>

      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-ink-700 border border-gold-400/15">
        {track.source === "youtube" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={youtubeThumbnail(track.videoId)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gold-300/70">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V6l11-2v12" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="17" cy="16" r="3" />
            </svg>
          </div>
        )}
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!isPlayable}
          aria-label={isActive && isPlaying ? t(lang, "pause") : t(lang, "play")}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition disabled:hidden text-cream-50"
        >
          {isActive && isPlaying ? (
            <PauseIcon width={20} height={20} />
          ) : (
            <PlayIcon width={20} height={20} />
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraftTitle(track.title);
                  setEditing(false);
                }
              }}
              className="flex-1 bg-ink-900 border border-gold-400/40 rounded-lg px-2 py-1 text-cream-50 outline-none focus:border-gold-400 text-sm"
            />
            <button
              type="button"
              onClick={commitRename}
              aria-label={t(lang, "save")}
              className="icon-button text-gold-300"
            >
              <CheckIcon width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftTitle(track.title);
                setEditing(false);
              }}
              aria-label={t(lang, "cancel")}
              className="icon-button"
            >
              <XIcon width={16} height={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div
                className={`truncate font-medium ${
                  isActive ? "text-gold-200" : "text-cream-50"
                }`}
                title={track.title}
              >
                {track.title}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-cream-100/55 mt-0.5">
              {track.source === "youtube" ? (
                <span className="inline-flex items-center gap-1 text-gold-300/80">
                  <YouTubeIcon width={12} height={12} />
                  {sourceLabel}
                </span>
              ) : (
                <span className="text-gold-300/80">{sourceLabel}</span>
              )}
              <span className="opacity-40">·</span>
              <span>{formatDuration(track.duration)}</span>
              {!isPlayable && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-red-300" title={t(lang, "unplayableHint")}>
                    {t(lang, "unplayable")}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={t(lang, "moveUp")}
            title={t(lang, "moveUp")}
            className="icon-button"
          >
            <ArrowUpIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={t(lang, "moveDown")}
            title={t(lang, "moveDown")}
            className="icon-button"
          >
            <ArrowDownIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t(lang, "rename")}
            title={t(lang, "rename")}
            className="icon-button"
          >
            <EditIcon width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t(lang, "delete")}
            title={t(lang, "delete")}
            className="icon-button hover:!text-red-300"
          >
            <TrashIcon width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}
