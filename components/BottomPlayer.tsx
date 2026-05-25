"use client";

import {
  IconMore,
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

export default function BottomPlayer({
  lang,
  t,
  tracks,
  currentId,
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
  const current = currentId ? tracks.find((x) => x.id === currentId) ?? null : null;
  const idx = current ? tracks.findIndex((x) => x.id === current.id) : -1;
  const ytId = current?.source === "youtube" ? current.youtubeId : null;
  const thumb = ytThumbSmall(ytId);
  const progressPct =
    duration > 0 ? Math.min(100, ((position || 0) / duration) * 100) : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        padding: "12px 16px 14px",
        background:
          "linear-gradient(180deg, transparent 0%, rgba(5,5,5,0.85) 30%, rgba(5,5,5,0.96) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid var(--line-subtle)",
      }}
    >
      <div
        className="mx-auto max-w-[1400px] grid items-center gap-4"
        style={{
          gridTemplateColumns: "minmax(180px, 1fr) minmax(280px, 2fr) minmax(180px, 1fr)",
        }}
      >
        {/* Left: now playing */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="relative rounded-md overflow-hidden flex-shrink-0"
            style={{
              width: 52,
              height: 52,
              border: "1px solid var(--line-subtle)",
              background:
                "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(0,0,0,0.6))",
            }}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: "rgba(212,175,55,0.7)" }}
              >
                <IconMusic size={20} />
              </div>
            )}
            {isPlaying && current && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(212,175,55,0.6)",
                  borderRadius: 6,
                }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div
              className="font-display italic truncate text-[15px]"
              style={{ color: current ? "var(--text)" : "var(--text-faint)" }}
            >
              {current ? current.title : t.nothingPlaying}
            </div>
            <div
              className="mt-0.5 text-[11px] truncate flex items-center gap-2"
              style={{ color: "var(--text-muted)" }}
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
                      {current.source === "youtube" ? t.sourceYouTube : t.sourceUpload}
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
          </div>
        </div>

        {/* Center: transport + seek */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleShuffle}
              data-active={shuffle ? "true" : "false"}
              title={t.shuffle}
              aria-label={t.shuffle}
            >
              <IconShuffle size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onPrev}
              disabled={tracks.length === 0}
              title={t.previous}
              aria-label={t.previous}
            >
              {direction === "rtl" ? <IconNext size={16} /> : <IconPrev size={16} />}
            </button>
            <button
              type="button"
              className="btn-base btn-play"
              onClick={onPlayPause}
              disabled={!current && tracks.length === 0}
              style={{ width: 44, height: 44 }}
              title={isPlaying ? t.pause : t.play}
              aria-label={isPlaying ? t.pause : t.play}
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onNext}
              disabled={tracks.length === 0}
              title={t.next}
              aria-label={t.next}
            >
              {direction === "rtl" ? <IconPrev size={16} /> : <IconNext size={16} />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleRepeat}
              data-active={repeat ? "true" : "false"}
              title={t.repeat}
              aria-label={t.repeat}
            >
              <IconRepeat size={15} />
            </button>
          </div>

          <div className="w-full mt-1.5 flex items-center gap-3 px-2">
            <span
              className="text-[10px] tnum"
              style={{
                color: "var(--text-muted)",
                minWidth: 36,
                textAlign: "end",
              }}
            >
              {fmtTime(position)}
            </span>
            <div className="flex-1 relative">
              <input
                type="range"
                className="slider"
                min={0}
                max={duration && Number.isFinite(duration) ? duration : 0}
                step={0.1}
                value={Math.min(position || 0, duration || 0)}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                disabled={!current || !duration}
                aria-label="seek"
                style={{
                  background: `linear-gradient(90deg, var(--gold-400) 0%, var(--gold-300) ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%, rgba(255,255,255,0.12) 100%)`,
                  borderRadius: 999,
                }}
              />
            </div>
            <span
              className="text-[10px] tnum"
              style={{
                color: "var(--text-muted)",
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
            className="icon-btn"
            onClick={onToggleAutoplay}
            data-active={autoplay ? "true" : "false"}
            title={t.autoplay}
            aria-label={t.autoplay}
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
            className="icon-btn"
            onClick={onToggleMute}
            title={muted ? t.unmute : t.mute}
            aria-label={muted ? t.unmute : t.mute}
            style={{ width: 34, height: 34 }}
          >
            {muted || volume === 0 ? (
              <IconMute size={14} />
            ) : (
              <IconVol size={14} />
            )}
          </button>
          <input
            type="range"
            className="slider"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(parseFloat(e.target.value))}
            style={{ width: 100 }}
            aria-label={t.volume}
          />
        </div>
      </div>
    </div>
  );
}
