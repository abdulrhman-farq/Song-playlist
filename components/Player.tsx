"use client";

import {
  IconMute,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
  IconVol,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import { ytThumbSmall } from "@/lib/youtube";
import type { Language, Track } from "@/types";

interface Props {
  tracks: Track[];
  currentId: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: boolean;
  shuffle: boolean;
  lang: Language;
  t: Strings;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (s: number) => void;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
}

export default function PlayerBar({
  tracks,
  currentId,
  isPlaying,
  position,
  duration,
  volume,
  muted,
  repeat,
  shuffle,
  lang,
  t,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
}: Props) {
  const direction = dirOf(lang);
  const current = currentId ? tracks.find((x) => x.id === currentId) ?? null : null;
  const idx = current ? tracks.findIndex((x) => x.id === current.id) : -1;
  const ytId = current?.source === "youtube" ? current.youtubeId : null;
  const thumb = ytThumbSmall(ytId);

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50">
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-2">
        <div className="stage-card flex items-center gap-4 px-5 py-4 flex-wrap md:flex-nowrap">
          {/* Now playing */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={"nowart " + (isPlaying ? "playing" : "")}>
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ borderRadius: 4 }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="label-tracked mb-0.5">
                {current ? t.nowPlaying : t.nothingPlaying}
              </div>
              <div
                className="font-cormorant text-[18px] text-ink truncate"
                style={{
                  fontStyle: current ? "normal" : "italic",
                  opacity: current ? 1 : 0.5,
                }}
              >
                {current ? current.title : "—"}
              </div>
              {current && (
                <div className="flex items-center gap-2 mt-0.5">
                  {isPlaying && (
                    <span className="eq">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  <span
                    className="text-xs text-brownSoft"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {idx + 1} / {tracks.length}
                  </span>
                  <span className="text-xs text-taupe">·</span>
                  <span className="chip" style={{ fontSize: 8 }}>
                    {current.source === "youtube" ? t.sourceYouTube : t.sourceUpload}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-iconic"
              onClick={onPrev}
              title={t.previous}
              disabled={tracks.length === 0}
            >
              {direction === "rtl" ? <IconNext size={16} /> : <IconPrev size={16} />}
            </button>
            <button
              type="button"
              className="btn-iconic"
              onClick={onPlayPause}
              disabled={!current && tracks.length === 0}
              style={{
                width: 50,
                height: 50,
                background: "#3A2C20",
                color: "#FAF5EC",
                borderColor: "#3A2C20",
              }}
              title={isPlaying ? t.pause : t.play}
            >
              {isPlaying ? <IconPause size={20} /> : <IconPlay size={20} />}
            </button>
            <button
              type="button"
              className="btn-iconic"
              onClick={onNext}
              title={t.next}
              disabled={tracks.length === 0}
            >
              {direction === "rtl" ? <IconPrev size={16} /> : <IconNext size={16} />}
            </button>
          </div>

          {/* Seek */}
          <div className="flex-[2] min-w-0 flex items-center gap-3 px-2 w-full md:w-auto">
            <span
              className="text-xs text-brownSoft tnum"
              style={{
                minWidth: 38,
                textAlign: "right",
                letterSpacing: "0.06em",
              }}
            >
              {fmtTime(position)}
            </span>
            <input
              type="range"
              min={0}
              max={duration && Number.isFinite(duration) ? duration : 0}
              step={0.1}
              value={Math.min(position || 0, duration || 0)}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              disabled={!current || !duration}
              className="flex-1"
              aria-label="seek"
            />
            <span
              className="text-xs text-brownSoft tnum"
              style={{ minWidth: 38, letterSpacing: "0.06em" }}
            >
              {fmtTime(duration)}
            </span>
          </div>

          {/* Modes + volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-iconic"
              onClick={onToggleShuffle}
              title={t.shuffle}
              style={
                shuffle
                  ? { color: "#D89274", borderColor: "#D89274" }
                  : undefined
              }
            >
              <IconShuffle size={15} />
            </button>
            <button
              type="button"
              className="btn-iconic"
              onClick={onToggleRepeat}
              title={t.repeat}
              style={
                repeat ? { color: "#D89274", borderColor: "#D89274" } : undefined
              }
            >
              <IconRepeat size={15} />
            </button>
            <div className="flex items-center gap-2 px-2">
              <button
                type="button"
                className="btn-iconic"
                onClick={onToggleMute}
                title={muted ? t.unmute : t.mute}
                style={{ width: 32, height: 32 }}
              >
                {muted || volume === 0 ? (
                  <IconMute size={14} />
                ) : (
                  <IconVol size={14} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => onVolume(parseFloat(e.target.value))}
                style={{ width: 80 }}
                aria-label={t.mute}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
