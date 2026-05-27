"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  IconClock,
  IconEdit,
  IconMusic,
  IconPlay,
  IconTrash,
  IconWarn,
  IconYT,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { EmbedCheckResult } from "@/lib/ytApi";
import { ytThumbSmall } from "@/lib/youtube";
import type { Track } from "@/types";

export type DropPos = "above" | "below" | null;

interface Props {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isPlaying: boolean;
  validation: EmbedCheckResult | null;
  t: Strings;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onEditTrim?: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPos: DropPos;
}

function TrackRowImpl({
  track,
  idx,
  isCurrent,
  isPlaying,
  validation,
  t,
  onPlay,
  onDelete,
  onRename,
  onEditTrim,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPos,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(track.title);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(track.title), [track.title]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const v = (draft || "").trim();
    if (v && v !== track.title) onRename(track.id, v);
    setEditing(false);
  }

  const dropClass =
    dropPos === "above"
      ? "drop-above"
      : dropPos === "below"
        ? "drop-below"
        : "";
  const ytId = track.source === "youtube" ? track.youtubeId : null;
  const thumb = ytThumbSmall(ytId);

  const titleColor = isCurrent ? "var(--gold-400)" : "var(--text)";

  return (
    <div
      className={`track-row ${dropClass}`}
      data-current={isCurrent ? "true" : "false"}
      style={{
        gridTemplateColumns:
          "32px 44px minmax(0, 1fr) auto auto",
      }}
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, track.id)}
      onDragOver={(e) => onDragOver(e, track.id)}
      onDragLeave={(e) => onDragLeave(e, track.id)}
      onDrop={(e) => onDrop(e, track.id)}
    >
      {/* Index / play swap */}
      <button
        type="button"
        onClick={() => onPlay(track.id)}
        className="index-or-play flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          color: isCurrent ? "var(--gold-400)" : "var(--text-muted)",
        }}
        aria-label={isCurrent && isPlaying ? t.pause : t.play}
        title={isCurrent && isPlaying ? t.pause : t.play}
      >
        {isCurrent && isPlaying ? (
          <span className="eq">
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : (
          <>
            <span className="index-num text-[13px] tnum">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="play-affordance" style={{ color: "var(--text)" }}>
              <IconPlay size={14} />
            </span>
          </>
        )}
      </button>

      {/* Artwork */}
      <div
        className="relative rounded-md overflow-hidden"
        style={{
          width: 40,
          height: 40,
          background:
            "linear-gradient(135deg, rgba(216, 146, 116,0.12) 0%, rgba(0,0,0,0.6) 100%)",
          border: "1px solid var(--line-subtle)",
        }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "rgba(216, 146, 116,0.6)" }}
          >
            <IconMusic size={18} />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            className="input-elegant"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={commit}
            style={{ padding: "6px 10px", fontSize: 14 }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPlay(track.id)}
              onDoubleClick={() => setEditing(true)}
              className="block w-full text-left transition"
              style={{
                color: titleColor,
                fontSize: 15,
                fontWeight: isCurrent ? 600 : 500,
                // Full title always visible — wraps to as many lines
                // as the title needs instead of clipping with an
                // ellipsis. word-break: break-word handles long URLs
                // or unbroken Arabic strings.
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: 1.3,
              }}
              title={track.title}
            >
              {track.title}
            </button>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span
                className={
                  "chip " +
                  (track.source === "youtube" ? "chip-youtube" : "chip-upload")
                }
              >
                {track.source === "youtube" ? (
                  <IconYT size={9} />
                ) : (
                  <IconMusic size={9} />
                )}
                <span>
                  {track.source === "youtube" ? t.sourceYouTube : t.sourceUpload}
                </span>
              </span>
              {validation && validation.kind !== "ok" && (
                <span className="chip chip-warn" title={t.embedDisabledHint}>
                  <IconWarn size={9} />
                  <span>
                    {validation.kind === "embed-disabled"
                      ? t.validEmbedDisabled
                      : validation.kind === "removed"
                        ? t.validRemoved
                        : validation.kind === "invalid"
                          ? t.validInvalid
                          : t.validError}
                  </span>
                </span>
              )}
              {(track.startAt != null || track.endAt != null) && (
                <span
                  className="chip chip-trim"
                  title={`${fmtTime(track.startAt)} – ${fmtTime(track.endAt)}`}
                >
                  <IconClock size={9} />
                  <span>{t.trimNote}</span>
                </span>
              )}
              {track.note && (
                <span
                  className="text-[11px] italic truncate"
                  style={{ color: "var(--text-faint)" }}
                >
                  {track.note}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Duration */}
      <div
        className="tnum text-[12px]"
        style={{
          color: "var(--text-muted)",
          minWidth: 48,
          textAlign: "end",
        }}
      >
        {fmtTime(track.duration)}
      </div>

      {/* Hover actions */}
      <div className="hover-only flex items-center gap-1">
        {onEditTrim && (
          <button
            type="button"
            className="icon-btn"
            style={{ width: 30, height: 30 }}
            onClick={() => onEditTrim(track.id)}
            title={t.trimTitle}
            aria-label={t.trimTitle}
          >
            <IconClock size={14} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          style={{ width: 30, height: 30 }}
          onClick={() => setEditing(true)}
          title={t.editTitle}
          aria-label={t.editTitle}
        >
          <IconEdit size={14} />
        </button>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 30, height: 30, color: "#f3a08a" }}
          onClick={() => onDelete(track.id)}
          title={t.delete}
          aria-label={t.delete}
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Memoised so a re-render of the parent (PlaylistApp) doesn't cascade
 * to every row. Identity-stable handlers from useCallback let React's
 * shallow compare skip rows whose props haven't actually changed.
 */
const TrackRow = memo(TrackRowImpl);
export default TrackRow;
