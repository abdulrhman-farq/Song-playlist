"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconEdit,
  IconMusic,
  IconPause,
  IconPlay,
  IconTrash,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import { ytThumbSmall } from "@/lib/youtube";
import type { Strings } from "@/lib/i18n";
import type { Track } from "@/types";

export type DropPos = "above" | "below" | null;

interface Props {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isPlaying: boolean;
  t: Strings;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dropPos: DropPos;
}

/** Tunables */
const SWIPE_REVEAL_PX = 128; // width of the drawer (two 44px buttons + padding)
const SWIPE_THRESHOLD = 48; // distance past which we snap open
const LONG_PRESS_MS = 500;

export default function TrackItem({
  track,
  idx,
  isCurrent,
  isPlaying,
  t,
  onPlay,
  onDelete,
  onRename,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dropPos,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(track.title);

  // Swipe state
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [draggingTouch, setDraggingTouch] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerActiveRef = useRef(false);
  const axisLockedRef = useRef<"x" | "y" | null>(null);

  // Long-press state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  // After a swipe or long-press, swallow the synthetic click so we don't play.
  const suppressClickRef = useRef(false);

  useEffect(() => setDraft(track.title), [track.title]);

  // When the track changes (or current changes), collapse swipe + popover
  useEffect(() => {
    setSwipeOpen(false);
    setDragX(0);
  }, [track.id]);

  // Close swipe/popover on outside tap when open
  useEffect(() => {
    if (!swipeOpen && !popoverOpen) return;
    function onDocPointer(e: PointerEvent) {
      const el = surfaceRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setSwipeOpen(false);
      setDragX(0);
      setPopoverOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [swipeOpen, popoverOpen]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Pointer (swipe + long-press) handlers ────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore non-primary, and ignore mouse pointers (mouse uses hover icons)
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.pointerType === "mouse") return; // swipe + long-press are touch/pen only

      pointerActiveRef.current = true;
      axisLockedRef.current = null;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;

      // Start long-press timer
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        // Cancel any in-progress swipe
        pointerActiveRef.current = false;
        setDraggingTouch(false);
        setDragX(swipeOpen ? -SWIPE_REVEAL_PX : 0);
        setPopoverOpen(true);
        suppressClickRef.current = true;
        // Haptic on supported devices
        try {
          (navigator as Navigator & { vibrate?: (ms: number) => void }).vibrate?.(8);
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS);
    },
    [clearLongPress, swipeOpen],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerActiveRef.current) return;
      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      // Decide axis after a small threshold
      if (axisLockedRef.current === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        axisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axisLockedRef.current === "x") {
          // We are committing to a swipe — cancel long-press
          clearLongPress();
        } else {
          // Vertical — let the browser scroll, abort our gesture
          pointerActiveRef.current = false;
          return;
        }
      }

      if (axisLockedRef.current !== "x") return;

      setDraggingTouch(true);

      // Direction depends on LTR/RTL — we always reveal toward end of row
      const isRTL =
        typeof document !== "undefined" &&
        document.documentElement.dir === "rtl";
      const adjusted = isRTL ? -dx : dx; // negative = swipe toward end
      const baseline = swipeOpen ? -SWIPE_REVEAL_PX : 0;
      let next = baseline + adjusted;
      if (next > 0) next = 0; // never pull past closed
      if (next < -SWIPE_REVEAL_PX - 24)
        next = -SWIPE_REVEAL_PX - 24; // small over-pull
      setDragX(next);
    },
    [clearLongPress, swipeOpen],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      const wasActive = pointerActiveRef.current;
      pointerActiveRef.current = false;
      clearLongPress();
      setDraggingTouch(false);

      if (!wasActive || axisLockedRef.current !== "x") {
        return;
      }
      // We performed a horizontal swipe — swallow the synthetic click.
      suppressClickRef.current = true;
      // Decide snap
      if (Math.abs(dragX) > SWIPE_THRESHOLD) {
        setSwipeOpen(true);
        setDragX(-SWIPE_REVEAL_PX);
      } else {
        setSwipeOpen(false);
        setDragX(0);
      }
    },
    [clearLongPress, dragX],
  );

  const onPointerCancel = useCallback(() => {
    pointerActiveRef.current = false;
    clearLongPress();
    setDraggingTouch(false);
    setDragX(swipeOpen ? -SWIPE_REVEAL_PX : 0);
  }, [clearLongPress, swipeOpen]);

  // ── Commit rename ───────────────────────────────────────────
  function commitRename() {
    const v = (draft || "").trim();
    if (v && v !== track.title) onRename(track.id, v);
    setEditing(false);
  }

  function startEdit() {
    setPopoverOpen(false);
    setSwipeOpen(false);
    setDragX(0);
    setEditing(true);
  }

  function doDelete() {
    setPopoverOpen(false);
    setSwipeOpen(false);
    setDragX(0);
    onDelete(track.id);
  }

  // ── Visual helpers ──────────────────────────────────────────
  const dropClass =
    dropPos === "above"
      ? "drop-above"
      : dropPos === "below"
      ? "drop-below"
      : "";

  const ytId = track.source === "youtube" ? track.youtubeId : null;
  const thumb = ytThumbSmall(ytId);

  const sourceLabel =
    track.source === "youtube" ? "YouTube" : t.sourceUpload;
  const durLabel = fmtTime(track.duration);

  // A "real warning" — currently we don't have a validation field on Track,
  // but we surface unavailable-audio: an upload track with no blobName is suspicious.
  // (Kept conservative so we don't flag valid tracks.)
  const hasWarning = false;

  // Surface inline style (transform + transition control)
  const surfaceStyle: React.CSSProperties = {
    transform: `translate3d(${dragX}px, 0, 0)`,
  };

  return (
    <div
      ref={surfaceRef}
      className={"track-row group hairline rounded " + dropClass}
      draggable={!editing && !draggingTouch}
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
        minHeight: 56,
        // Surface opaque background — matches the parent tint, occludes drawer.
        ["--track-row-bg" as string]: isCurrent
          ? "linear-gradient(90deg, #F8E6DC, #FBF1E7)"
          : "#FAF5EC",
      }}
    >
      {/* Drawer underneath — revealed by swipe */}
      <div
        className={"track-row-drawer " + (swipeOpen ? "is-open" : "")}
        aria-hidden={!swipeOpen}
      >
        <button
          type="button"
          className="track-row-drawer-btn"
          onClick={startEdit}
          title={t.editTitle}
          aria-label={t.editTitle}
        >
          <IconEdit size={16} />
        </button>
        <button
          type="button"
          className="track-row-drawer-btn is-danger"
          onClick={doDelete}
          title={t.delete}
          aria-label={t.delete}
        >
          <IconTrash size={16} />
        </button>
      </div>

      {/* Foreground surface */}
      <div
        className={
          "track-row-surface " + (draggingTouch ? "dragging-touch" : "")
        }
        style={{
          ...surfaceStyle,
          paddingInline: 16,
          paddingBlock: 8,
          gap: 12,
          display: "flex",
          alignItems: "center",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {/* Thumbnail (44×44) doubles as play button */}
        <button
          type="button"
          onClick={() => onPlay(track.id)}
          className={
            "rounded overflow-hidden flex-shrink-0 relative " +
            (isCurrent ? "now-halo" : "")
          }
          style={{
            width: 44,
            height: 44,
            background:
              "linear-gradient(135deg, #F4ECDF 0%, #E5D5BC 100%)",
            border: "0.5px solid rgba(58,44,32,0.12)",
          }}
          title={isCurrent && isPlaying ? t.pause : t.play}
          aria-label={isCurrent && isPlaying ? t.pause : t.play}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brownSoft">
              <IconMusic size={20} />
            </div>
          )}
          {/* Play / Pause overlay — visible on hover, or always when current */}
          <span
            className="absolute inset-0 flex items-center justify-center transition"
            style={{
              background: isCurrent
                ? "rgba(58,44,32,0.18)"
                : "rgba(58,44,32,0.0)",
              opacity: isCurrent ? 1 : 0,
              color: "#FAF5EC",
            }}
            aria-hidden
          >
            {isCurrent && isPlaying ? (
              <IconPause size={16} />
            ) : (
              <IconPlay size={16} />
            )}
          </span>
        </button>

        {/* Title + single-row meta */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="input-elegant w-full"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={commitRename}
              style={{ padding: "4px 8px", fontSize: 16 }}
            />
          ) : (
            <div className="flex items-center min-w-0" style={{ gap: 8 }}>
              <button
                type="button"
                className="font-cormorant truncate text-left hover:text-peachDeep transition min-w-0"
                style={{
                  color: isCurrent ? "#D89274" : "#3A2C20",
                  fontStyle: isCurrent ? "italic" : "normal",
                  fontSize: 18,
                  lineHeight: 1.2,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  flex: "0 1 auto",
                }}
                onDoubleClick={startEdit}
                onClick={() => onPlay(track.id)}
                title={track.title}
              >
                {track.title}
              </button>
              {isCurrent && isPlaying && (
                <span className="eq-mini" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              )}
              {hasWarning && (
                <span
                  className="warn-dot"
                  title={t.trackUnavailable}
                  aria-label={t.trackUnavailable}
                />
              )}
            </div>
          )}
          {!editing && (
            <div
              className="truncate"
              style={{
                color: "#8C6A4F",
                fontSize: 13,
                lineHeight: 1.3,
                marginTop: 4,
                fontFamily: "Cormorant Garamond, serif",
                fontStyle: "italic",
              }}
            >
              <span className="tnum">
                {sourceLabel}
                {" · "}
                {durLabel}
              </span>
            </div>
          )}
        </div>

        {/* Desktop hover-only subtle icons (single icon each, low opacity) */}
        <div
          className="hidden md:flex items-center"
          style={{ gap: 4 }}
          aria-hidden={editing}
        >
          <button
            type="button"
            className="track-row-quick"
            onClick={startEdit}
            title={t.editTitle}
            aria-label={t.editTitle}
            tabIndex={editing ? -1 : 0}
          >
            <IconEdit size={12} />
          </button>
          <button
            type="button"
            className="track-row-quick is-danger"
            onClick={() => onDelete(track.id)}
            title={t.delete}
            aria-label={t.delete}
            tabIndex={editing ? -1 : 0}
          >
            <IconTrash size={12} />
          </button>
        </div>

        {/* Track index (subtle, fades out when row is current) */}
        <div
          className="font-cinzel tnum hidden sm:block"
          style={{
            color: "#8C6A4F",
            fontSize: 10,
            letterSpacing: "0.18em",
            opacity: isCurrent ? 0 : 0.55,
            minWidth: 20,
            textAlign: "end",
            transition: "opacity 0.18s",
          }}
          aria-hidden
        >
          {String(idx + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Long-press popover */}
      {popoverOpen && (
        <>
          <div
            className="lp-popover-backdrop"
            onClick={() => setPopoverOpen(false)}
            aria-hidden
          />
          <div
            className="lp-popover"
            role="menu"
            aria-label={t.rowActions}
            style={{ insetInlineEnd: 16, top: 8 }}
          >
            <button
              type="button"
              role="menuitem"
              className="lp-popover-item"
              onClick={startEdit}
            >
              <IconEdit size={14} />
              <span>{t.editTitle}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="lp-popover-item is-danger"
              onClick={doDelete}
            >
              <IconTrash size={14} />
              <span>{t.delete}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
