"use client";

import { memo, useEffect, useRef, useState } from "react";
import EditableText from "@/components/EditableText";
import {
  IconArrowDown,
  IconArrowUp,
  IconMusic,
  IconMute,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
  IconVol,
  IconYT,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import { ytThumbSmall } from "@/lib/youtube";
import type { Language, Track } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  tracks: Track[];
  currentId: string | null;
  /** Track that will play after the current one ends (respects shuffle/repeat). */
  nextTrack?: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  autoplay: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (s: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleAutoplay: () => void;
}

function BottomPlayerImpl({
  lang,
  t,
  tracks,
  currentId,
  nextTrack,
  isPlaying,
  position,
  duration,
  volume,
  muted,
  shuffle,
  repeat,
  autoplay,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onToggleAutoplay,
}: Props) {
  const direction = dirOf(lang);
  const current = currentId
    ? tracks.find((x) => x.id === currentId) ?? null
    : null;
  const idx = current ? tracks.findIndex((x) => x.id === current.id) : -1;
  const ytId = current?.source === "youtube" ? current.youtubeId : null;
  const thumb = ytThumbSmall(ytId);

  // Text-cross fade key — bumps whenever current track changes
  const [crossKey, setCrossKey] = useState(0);
  const prevIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentId !== prevIdRef.current) {
      prevIdRef.current = currentId;
      setCrossKey((k) => k + 1);
    }
  }, [currentId]);

  // Local seek state so dragging the bar doesn't fight live updates
  const [seekValue, setSeekValue] = useState<number | null>(null);
  const dragRef = useRef(false);

  // Collapsed = compact floating pill instead of the full transport bar.
  // Persisted to localStorage so the choice survives reload — guests who
  // want full screen for the playlist won't have the player re-spring up
  // every refresh.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("wp-player-collapsed") === "1") {
        setCollapsed(true);
      }
    } catch {
      /* SSR or storage-disabled — ignore */
    }
  }, []);
  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem("wp-player-collapsed", next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const displayPos = seekValue ?? position ?? 0;
  const progressPct =
    duration > 0 ? Math.min(100, (displayPos / duration) * 100) : 0;
  const volPct = (muted ? 0 : volume) * 100;

  // Collapsed mode — render only a small floating pill at the bottom
  // edge. Keeps the play/pause + an expand arrow within thumb reach,
  // but frees the rest of the viewport for the playlist.
  if (collapsed) {
    return (
      <div
        className="fixed bottom-3 gpu"
        style={{
          insetInlineEnd: 12,
          zIndex: "var(--z-player)" as unknown as number,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px 6px 6px",
          borderRadius: 999,
          background:
            "linear-gradient(180deg, rgba(58,44,34,0.92) 0%, rgba(42,32,26,0.96) 100%)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(216, 146, 116, 0.22)",
          boxShadow: "0 12px 28px -12px rgba(0,0,0,0.6)",
        }}
      >
        <button
          type="button"
          className="btn-base btn-play gpu"
          onClick={onPlayPause}
          disabled={!current && tracks.length === 0}
          style={{ width: 34, height: 34 }}
          title={isPlaying ? t.pause : t.play}
          aria-label={isPlaying ? t.pause : t.play}
        >
          {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
        </button>
        <button
          type="button"
          className="icon-btn magnet"
          onClick={() => toggleCollapsed(false)}
          style={{ width: 28, height: 28 }}
          title="Show player"
          aria-label="Show player"
        >
          <IconArrowUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 gpu"
      style={{
        padding: "8px 14px 10px",
        background:
          "linear-gradient(180deg, transparent 0%, rgba(26,19,16,0.88) 28%, rgba(26,19,16,0.96) 100%)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid var(--line-subtle)",
        zIndex: "var(--z-player)" as unknown as number,
      }}
    >
      {/* Hide button — floats top-right of the bar, collapses the player
          to a small floating pill until the user expands it again. */}
      <button
        type="button"
        onClick={() => toggleCollapsed(true)}
        className="icon-btn"
        style={{
          position: "absolute",
          top: 4,
          insetInlineEnd: 8,
          width: 24,
          height: 24,
          zIndex: 2,
        }}
        title="Hide player"
        aria-label="Hide player"
      >
        <IconArrowDown size={13} />
      </button>
      {/* Ambient gold haze when actively playing */}
      {isPlaying && current && (
        <div
          aria-hidden
          className="absolute pointer-events-none gpu"
          style={{
            insetInlineStart: "10%",
            top: "-50%",
            width: 360,
            height: 200,
            background:
              "radial-gradient(ellipse at center, rgba(216, 146, 116,0.18), transparent 70%)",
            filter: "blur(20px)",
            animation: "ambient-drift 18s ease-in-out infinite alternate",
            opacity: 0.7,
          }}
        />
      )}

      <div
        className="mx-auto max-w-[1400px] grid items-center gap-3 relative wp-player-grid"
      >
        {/* Left: now playing */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="relative rounded-md overflow-hidden flex-shrink-0 gpu"
            style={{
              width: 56,
              height: 56,
              border: "1px solid var(--line-subtle)",
              background:
                "linear-gradient(135deg, rgba(216, 146, 116,0.2), rgba(0,0,0,0.6))",
            }}
          >
            {/* Halo when playing */}
            {isPlaying && current && (
              <span
                className="now-halo"
                style={{ inset: -5, borderRadius: 10 }}
                aria-hidden
              />
            )}
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={crossKey}
                src={thumb}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover text-cross"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: "rgba(216, 146, 116,0.7)" }}
              >
                <IconMusic size={22} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div
              key={`title-${crossKey}`}
              className="font-display italic truncate text-cross"
              style={{
                fontSize: 15,
                color: current ? "var(--text)" : "var(--text-faint)",
              }}
              title={current?.title}
            >
              {current ? (
                current.title
              ) : (
                <EditableText
                  editKey="player.nothingPlaying"
                  fallback={t.nothingPlaying}
                />
              )}
            </div>
            <div
              className="mt-0.5 truncate flex items-center gap-2"
              style={{ color: "var(--text-muted)", fontSize: 11 }}
            >
              {current ? (
                <>
                  <span
                    className={
                      "chip " +
                      (current.source === "youtube"
                        ? "chip-youtube"
                        : "chip-upload")
                    }
                    style={{ fontSize: 9, padding: "2px 7px" }}
                  >
                    {current.source === "youtube" ? (
                      <IconYT size={8} />
                    ) : (
                      <IconMusic size={8} />
                    )}
                    <span>
                      {current.source === "youtube" ? (
                        <EditableText
                          editKey="player.sourceYouTube"
                          fallback={t.sourceYouTube}
                        />
                      ) : (
                        <EditableText
                          editKey="player.sourceUpload"
                          fallback={t.sourceUpload}
                        />
                      )}
                    </span>
                  </span>
                  <span style={{ letterSpacing: "0.04em" }}>
                    {idx + 1} / {tracks.length}
                  </span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            {/* Next-up preview — one-glance heads-up for the DJ */}
            {current && nextTrack && nextTrack.id !== current.id && (
              <div
                className="mt-0.5 truncate text-[10px]"
                style={{
                  color: "var(--text-faint)",
                  letterSpacing: "0.02em",
                }}
                title={`Next: ${nextTrack.title}`}
              >
                <span
                  style={{
                    color: "var(--gold-300)",
                    fontFamily: "var(--font-tracked)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginInlineEnd: 6,
                  }}
                >
                  Next
                </span>
                {nextTrack.title}
              </div>
            )}
          </div>
        </div>

        {/* Center: transport + seek */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="icon-btn magnet"
              onClick={onToggleShuffle}
              data-active={shuffle ? "true" : "false"}
              title={t.shuffle}
              aria-label={t.shuffle}
              aria-pressed={shuffle}
            >
              <IconShuffle size={15} />
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              onClick={onPrev}
              disabled={tracks.length === 0}
              title={t.previous}
              aria-label={t.previous}
            >
              {direction === "rtl" ? (
                <IconNext size={16} />
              ) : (
                <IconPrev size={16} />
              )}
            </button>
            <button
              type="button"
              className="btn-base btn-play gpu"
              onClick={onPlayPause}
              disabled={!current && tracks.length === 0}
              style={{ width: 46, height: 46 }}
              title={isPlaying ? t.pause : t.play}
              aria-label={isPlaying ? t.pause : t.play}
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              onClick={onNext}
              disabled={tracks.length === 0}
              title={t.next}
              aria-label={t.next}
            >
              {direction === "rtl" ? (
                <IconPrev size={16} />
              ) : (
                <IconNext size={16} />
              )}
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              onClick={onToggleRepeat}
              data-active={repeat ? "true" : "false"}
              title={t.repeat}
              aria-label={t.repeat}
              aria-pressed={repeat}
            >
              <IconRepeat size={15} />
            </button>
          </div>

          {/* Premium seek bar */}
          <div className="w-full mt-2 flex items-center gap-3 px-2">
            <span
              className="tnum"
              style={{
                color: "var(--text-muted)",
                fontSize: 10,
                minWidth: 36,
                textAlign: "end",
              }}
            >
              {fmtTime(displayPos)}
            </span>
            <div className="flex-1 relative" style={{ height: 14 }}>
              <div
                className="progress-track absolute left-0 right-0 top-1/2"
                style={{ transform: "translateY(-50%)" }}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                className="slider absolute inset-0 w-full"
                min={0}
                max={duration && Number.isFinite(duration) ? duration : 0}
                step={0.1}
                value={Math.min(displayPos, duration || 0)}
                onChange={(e) => setSeekValue(parseFloat(e.target.value))}
                onMouseDown={() => {
                  dragRef.current = true;
                }}
                onMouseUp={(e) => {
                  dragRef.current = false;
                  onSeek(parseFloat((e.target as HTMLInputElement).value));
                  setSeekValue(null);
                }}
                onTouchStart={() => {
                  dragRef.current = true;
                }}
                onTouchEnd={(e) => {
                  dragRef.current = false;
                  onSeek(parseFloat((e.target as HTMLInputElement).value));
                  setSeekValue(null);
                }}
                onBlur={() => {
                  if (seekValue != null) {
                    onSeek(seekValue);
                    setSeekValue(null);
                  }
                }}
                disabled={!current || !duration}
                aria-label={t.play + " — seek"}
                style={{
                  background: "transparent",
                  margin: 0,
                  padding: 0,
                  height: 14,
                }}
              />
            </div>
            <span
              className="tnum"
              style={{
                color: "var(--text-muted)",
                fontSize: 10,
                minWidth: 36,
              }}
            >
              {fmtTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: volume + extras */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="icon-btn magnet"
            onClick={onToggleAutoplay}
            data-active={autoplay ? "true" : "false"}
            title={t.autoplay}
            aria-label={t.autoplay}
            aria-pressed={autoplay}
            style={{ width: 34, height: 34 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 6 8 6 8 18 4 18" />
              <polygon
                points="10 7 18 12 10 17 10 7"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn magnet"
            onClick={onToggleMute}
            title={muted ? t.unmute : t.mute}
            aria-label={muted ? t.unmute : t.mute}
            aria-pressed={muted}
            style={{ width: 34, height: 34 }}
          >
            {muted || volume === 0 ? (
              <IconMute size={14} />
            ) : (
              <IconVol size={14} />
            )}
          </button>

          {/* Volume track with progress fill */}
          <div className="relative" style={{ width: 110, height: 14 }}>
            <div
              className="progress-track absolute left-0 right-0 top-1/2"
              style={{ transform: "translateY(-50%)" }}
            >
              <div
                className="progress-fill"
                style={{ width: `${volPct}%` }}
              />
            </div>
            <input
              type="range"
              className="slider absolute inset-0 w-full"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              aria-label={t.volume}
              style={{ background: "transparent", height: 14, margin: 0, padding: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(BottomPlayerImpl);
