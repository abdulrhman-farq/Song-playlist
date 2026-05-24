"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { youtubeThumbnail } from "@/lib/youtube";
import type { Language, Track } from "@/types";

interface Props {
  lang: Language;
  track: Track | null;
  trackUrl: string | null; // resolved object URL for upload tracks
  onNext: () => void;
  onPrev: () => void;
  onDurationDetected: (id: string, duration: number) => void;
  canPlay: boolean;
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead?: boolean) => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existing?.();
      resolve();
    };
    if (!document.querySelector('script[data-yt-api="1"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.dataset.ytApi = "1";
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

export default function Player({
  lang,
  track,
  trackUrl,
  onNext,
  onPrev,
  onDurationDetected,
  canPlay,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const trackId = track?.id ?? null;
  const trackSource = track?.source ?? null;

  /* ---- YouTube player lifecycle ---- */
  useEffect(() => {
    if (trackSource !== "youtube") return;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !ytHostRef.current || !window.YT) return;
      if (ytPlayerRef.current) return;
      const placeholder = document.createElement("div");
      ytHostRef.current.innerHTML = "";
      ytHostRef.current.appendChild(placeholder);
      ytPlayerRef.current = new window.YT.Player(placeholder, {
        height: "200",
        width: "200",
        videoId: track?.source === "youtube" ? track.videoId : undefined,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            const p = ytPlayerRef.current;
            if (!p) return;
            p.setVolume(Math.round((muted ? 0 : volume) * 100));
            const d = p.getDuration();
            if (d > 0 && track && track.source === "youtube") {
              setDuration(d);
              onDurationDetected(track.id, d);
            }
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              p.playVideo();
            }
          },
          onStateChange: (e: { data: number }) => {
            const YT = window.YT!;
            if (e.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              const p = ytPlayerRef.current;
              if (p) {
                const d = p.getDuration();
                if (d > 0) setDuration(d);
              }
            } else if (
              e.data === YT.PlayerState.PAUSED ||
              e.data === YT.PlayerState.BUFFERING ||
              e.data === YT.PlayerState.CUED ||
              e.data === YT.PlayerState.UNSTARTED
            ) {
              setIsPlaying(e.data === YT.PlayerState.BUFFERING);
            } else if (e.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              onNext();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackSource]);

  // Destroy YouTube player when leaving YouTube mode entirely.
  useEffect(() => {
    if (trackSource === "youtube") return;
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
      if (ytHostRef.current) ytHostRef.current.innerHTML = "";
    }
  }, [trackSource]);

  // Load a new YouTube video when the trackId changes (still YouTube).
  useEffect(() => {
    if (trackSource !== "youtube" || !track || track.source !== "youtube") return;
    const p = ytPlayerRef.current;
    if (!p || !ytReadyRef.current) {
      pendingPlayRef.current = false;
      return;
    }
    pendingPlayRef.current = true;
    try {
      p.loadVideoById(track.videoId);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  /* ---- Audio element side effects ---- */
  useEffect(() => {
    if (trackSource === "upload" && audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
    if (trackSource === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      ytPlayerRef.current.setVolume(Math.round((muted ? 0 : volume) * 100));
    }
  }, [volume, muted, trackSource]);

  // When track changes and source is upload, reset state and (re)start play.
  useEffect(() => {
    if (!track) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    setCurrentTime(0);
    setDuration(track.duration ?? 0);
    if (track.source === "upload") {
      // wait for metadata; play happens in audio element handler
    }
  }, [trackId, track]);

  /* ---- Time tracking for YouTube ---- */
  useEffect(() => {
    if (trackSource !== "youtube") return;
    const id = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current) return;
      if (seeking) return;
      try {
        const c = p.getCurrentTime();
        if (Number.isFinite(c)) setCurrentTime(c);
        const d = p.getDuration();
        if (Number.isFinite(d) && d > 0 && Math.abs(d - duration) > 0.5) {
          setDuration(d);
          if (track && track.source === "youtube" && (!track.duration || Math.abs(track.duration - d) > 1)) {
            onDurationDetected(track.id, d);
          }
        }
      } catch {
        /* ignore */
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [trackSource, seeking, duration, track, onDurationDetected]);

  /* ---- Controls ---- */
  const togglePlay = useCallback(() => {
    if (!track || !canPlay) return;
    if (track.source === "upload") {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        void a.play().catch(() => {
          /* ignore */
        });
      } else {
        a.pause();
      }
    } else {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current) {
        pendingPlayRef.current = true;
        return;
      }
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    }
  }, [track, canPlay, isPlaying]);

  const seek = useCallback(
    (sec: number) => {
      if (!track) return;
      if (track.source === "upload" && audioRef.current) {
        audioRef.current.currentTime = sec;
        setCurrentTime(sec);
      } else if (track.source === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.seekTo(sec, true);
        setCurrentTime(sec);
      }
    },
    [track],
  );

  // Keyboard shortcut: space toggles play if focus isn't in a text field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== " " && e.code !== "Space") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      togglePlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="luxury-card p-5 sticky bottom-4 z-30 shadow-gold">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-ink-700 border border-gold-400/15">
          {track?.source === "youtube" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={youtubeThumbnail(track.videoId)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gold-300/60">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V6l11-2v12" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="17" cy="16" r="3" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-gold-300/70">
            {track ? t(lang, "nowPlaying") : t(lang, "nothingPlaying")}
          </div>
          <div className="truncate font-serif text-lg text-cream-50 mt-0.5">
            {track ? track.title : "—"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={!track}
            aria-label={t(lang, "previous")}
            title={t(lang, "previous")}
            className="icon-button"
          >
            <PrevIcon width={20} height={20} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!track || !canPlay}
            aria-label={isPlaying ? t(lang, "pause") : t(lang, "play")}
            title={isPlaying ? t(lang, "pause") : t(lang, "play")}
            className="w-12 h-12 rounded-full gold-button flex items-center justify-center"
          >
            {isPlaying ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!track}
            aria-label={t(lang, "next")}
            title={t(lang, "next")}
            className="icon-button"
          >
            <NextIcon width={20} height={20} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-cream-100/55 tabular-nums w-12 text-end" dir="ltr">
          {formatDuration(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onMouseDown={() => setSeeking(true)}
          onTouchStart={() => setSeeking(true)}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          onMouseUp={(e) => {
            seek(Number((e.target as HTMLInputElement).value));
            setSeeking(false);
          }}
          onTouchEnd={(e) => {
            seek(Number((e.target as HTMLInputElement).value));
            setSeeking(false);
          }}
          disabled={!track || duration <= 0}
          className="gold-range flex-1"
          style={{
            background: duration
              ? `linear-gradient(90deg, #efc759 0%, #d39520 ${progressPct}%, rgba(251,248,241,0.18) ${progressPct}%, rgba(251,248,241,0.18) 100%)`
              : undefined,
          }}
          aria-label="seek"
        />
        <span className="text-xs text-cream-100/55 tabular-nums w-12" dir="ltr">
          {formatDuration(duration)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label={t(lang, "volume")}
          onClick={() => setMuted((m) => !m)}
          className="icon-button"
        >
          {muted || volume === 0 ? (
            <VolumeMuteIcon width={18} height={18} />
          ) : (
            <VolumeIcon width={18} height={18} />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            setMuted(v === 0);
          }}
          className="gold-range w-32"
          aria-label={t(lang, "volume")}
        />
      </div>

      {/* Hidden YouTube iframe host (audio-only via offscreen frame). */}
      <div ref={ytHostRef} className="yt-frame-host" aria-hidden="true" />

      {/* Native audio element for uploaded files. */}
      <audio
        ref={audioRef}
        src={track?.source === "upload" ? trackUrl ?? undefined : undefined}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          const d = a.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
            if (track && track.source === "upload" && (!track.duration || Math.abs(track.duration - d) > 1)) {
              onDurationDetected(track.id, d);
            }
          }
        }}
        onTimeUpdate={(e) => {
          if (!seeking) setCurrentTime(e.currentTarget.currentTime);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onNext();
        }}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}
