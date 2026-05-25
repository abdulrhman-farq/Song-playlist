"use client";

import { useEffect, useState } from "react";
import {
  IconClock,
  IconDrag,
  IconEdit,
  IconMusic,
  IconPlay,
  IconTrash,
  IconUpload,
  IconWarn,
  IconYT,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import { ytThumbSmall } from "@/lib/youtube";
import type { Strings } from "@/lib/i18n";
import type { EmbedCheckResult } from "@/lib/ytApi";
import type { Track } from "@/types";

export type DropPos = "above" | "below" | null;

interface Props {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isPlaying: boolean;
  t: Strings;
  validation: EmbedCheckResult | null;
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

export default function TrackItem({
  track,
  idx,
  isCurrent,
  isPlaying,
  t,
  validation,
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

  useEffect(() => setDraft(track.title), [track.title]);

  function commit() {
    const v = (draft || "").trim();
    if (v && v !== track.title) onRename(track.id, v);
    setEditing(false);
  }

  const dropClass =
    dropPos === "above" ? "drop-above" : dropPos === "below" ? "drop-below" : "";

  const ytId = track.source === "youtube" ? track.youtubeId : null;
  const thumb = ytThumbSmall(ytId);

  return (
    <div
      className={
        "track-row group flex items-center gap-3 px-4 py-3 rounded hairline " +
        dropClass
      }
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, track.id)}
      onDragOver={(e) => onDragOver(e, track.id)}
      onDragLeave={(e) => onDragLeave(e, track.id)}
      onDrop={(e) => onDrop(e, track.id)}
      style={{
        background: isCurrent
          ? "linear-gradient(90deg, rgba(216,146,116,0.10), rgba(216,146,116,0.04))"
          : "rgba(250,245,236,0.6)",
        borderColor: isCurrent
          ? "rgba(216,146,116,0.40)"
          : "rgba(58,44,32,0.10)",
      }}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-taupe opacity-30 group-hover:opacity-100 transition"
        title={t.dragHint}
      >
        <IconDrag size={14} />
      </div>

      {/* Index / play button */}
      <button
        type="button"
        onClick={() => onPlay(track.id)}
        className="relative flex items-center justify-center rounded"
        style={{
          width: 40,
          height: 40,
          background: "rgba(244,236,223,0.6)",
          border: "0.5px solid rgba(58,44,32,0.12)",
        }}
        title={t.play}
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
            <span
              className="font-cinzel text-[10px] group-hover:opacity-0 transition"
              style={{ color: "#8C6A4F", letterSpacing: "0.1em" }}
            >
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              style={{ color: "#D89274" }}
            >
              <IconPlay size={14} />
            </span>
          </>
        )}
      </button>

      {/* Artwork */}
      <div
        className="rounded overflow-hidden flex-shrink-0"
        style={{
          width: 44,
          height: 44,
          background: "linear-gradient(135deg, #F4ECDF 0%, #E5D5BC 100%)",
          border: "0.5px solid rgba(58,44,32,0.12)",
        }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brownSoft">
            <IconMusic size={18} />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            className="input-elegant w-full"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={commit}
            style={{ padding: "6px 10px", fontSize: 16 }}
          />
        ) : (
          <button
            type="button"
            className="font-cormorant text-[19px] truncate w-full text-left hover:text-peachDeep transition"
            style={{
              color: isCurrent ? "#D89274" : "#3A2C20",
              fontStyle: isCurrent ? "italic" : "normal",
            }}
            onDoubleClick={() => setEditing(true)}
            onClick={() => onPlay(track.id)}
            title={track.title}
          >
            {track.title}
          </button>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className={
              "chip " + (track.source === "youtube" ? "youtube" : "upload")
            }
          >
            {track.source === "youtube" ? (
              <IconYT size={9} />
            ) : (
              <IconUpload size={9} />
            )}
            <span>
              {track.source === "youtube" ? t.sourceYouTube : t.sourceUpload}
            </span>
          </span>
          {validation && validation.kind !== "ok" && (
            <span
              className="chip"
              style={{
                color: "#C97B5B",
                borderColor: "rgba(201,123,91,0.55)",
                background: "rgba(201,123,91,0.08)",
              }}
              title={t.embedDisabledHint}
            >
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
              className="chip"
              style={{
                color: "#957251",
                borderColor: "rgba(149,114,81,0.45)",
              }}
              title={`${fmtTime(track.startAt)} – ${fmtTime(track.endAt)}`}
            >
              <IconClock size={9} />
              <span>{t.trimNote}</span>
            </span>
          )}
          {track.note && (
            <span className="text-xs text-taupe italic truncate">
              {track.note}
            </span>
          )}
        </div>
      </div>

      {/* Duration */}
      <div
        className="text-sm text-brownSoft tnum"
        style={{ minWidth: 50, textAlign: "right" }}
      >
        {fmtTime(track.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition">
        {onEditTrim && (
          <button
            type="button"
            className="btn-iconic"
            style={{ width: 32, height: 32 }}
            onClick={() => onEditTrim(track.id)}
            title={t.trimTitle}
          >
            <IconClock size={13} />
          </button>
        )}
        <button
          type="button"
          className="btn-iconic"
          style={{ width: 32, height: 32 }}
          onClick={() => setEditing(true)}
          title={t.editTitle}
        >
          <IconEdit size={13} />
        </button>
        <button
          type="button"
          className="btn-iconic"
          style={{ width: 32, height: 32, color: "#C97B5B" }}
          onClick={() => onDelete(track.id)}
          title={t.delete}
        >
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}
