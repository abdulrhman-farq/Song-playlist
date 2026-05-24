"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddPanel from "@/components/AddPanel";
import Header from "@/components/Header";
import PlayerBar from "@/components/Player";
import TrackItem, { type DropPos } from "@/components/TrackItem";
import Toast from "@/components/Toast";
import { fmtTime, probeAudioDuration, titleFromFilename, uid } from "@/lib/format";
import { dir as dirOf, strings } from "@/lib/i18n";
import { createSamples } from "@/lib/samples";
import {
  clearBlobs,
  deleteBlob,
  getBlob,
  loadLanguage,
  loadMeta,
  putBlob,
  sanitizeTracksForSave,
  saveLanguage,
  saveMeta,
} from "@/lib/storage";
import { fetchYouTubeTitle } from "@/lib/youtube";
import type {
  ExportedPlaylist,
  ExportedTrackYouTube,
  Language,
  Track,
  UploadTrack,
  YouTubeTrack,
} from "@/types";

/* ── YouTube IFrame API loader (shared) ───────────────────────────────── */

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (s: number, allowSeekAhead?: boolean) => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    target: HTMLElement | string,
    opts: Record<string, unknown>,
  ) => YTPlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
    UNSTARTED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<YTNamespace> | null = null;
function loadYouTubeAPI(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (ytReady) return ytReady;
  ytReady = new Promise<YTNamespace>((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    if (!document.querySelector('script[data-wp-yt-api="1"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.wpYtApi = "1";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
  });
  return ytReady;
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function PlaylistApp() {
  // Language
  const [lang, setLang] = useState<Language>("en");
  const t = strings[lang];

  // Playlist
  const [playlistName, setPlaylistName] = useState<string>(strings.en.untitled);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Transport state
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  // Modes
  const [autoplay, setAutoplay] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // UX
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Refs
  const audioUrlCache = useRef<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytPollRef = useRef<number | null>(null);
  const currentIdRef = useRef<string | null>(null);

  /* ── Load saved state on mount ───────────────────────────── */
  useEffect(() => {
    const savedLang =
      loadLanguage() ??
      (typeof navigator !== "undefined" &&
      navigator.language?.toLowerCase().startsWith("ar")
        ? "ar"
        : "en");
    setLang(savedLang);

    const saved = loadMeta();
    if (saved) {
      setPlaylistName(saved.name || strings[savedLang].untitled);
      setTracks(Array.isArray(saved.tracks) ? saved.tracks : []);
      if (typeof saved.volume === "number") setVolume(saved.volume);
      if (typeof saved.autoplay === "boolean") setAutoplay(saved.autoplay);
      if (typeof saved.shuffle === "boolean") setShuffle(saved.shuffle);
      if (typeof saved.repeat === "boolean") setRepeat(saved.repeat);
    } else {
      setPlaylistName(strings[savedLang].untitled);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── HTML lang/dir ──────────────────────────────────────── */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
    saveLanguage(lang);
  }, [lang]);

  /* ── Persist metadata ──────────────────────────────────── */
  useEffect(() => {
    if (!loaded) return;
    saveMeta({
      name: playlistName,
      tracks: sanitizeTracksForSave(tracks),
      volume,
      autoplay,
      shuffle,
      repeat,
    });
  }, [loaded, playlistName, tracks, volume, autoplay, shuffle, repeat]);

  /* ── Toast helper ──────────────────────────────────────── */
  const toastTimer = useRef<number | null>(null);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  /* ── Audio URL cache for uploaded blobs ────────────────── */
  async function getAudioUrl(track: UploadTrack): Promise<string | null> {
    const cached = audioUrlCache.current[track.id];
    if (cached) return cached;
    const blob = await getBlob(track.id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    audioUrlCache.current[track.id] = url;
    return url;
  }

  // Revoke all on unmount
  useEffect(
    () => () => {
      Object.values(audioUrlCache.current).forEach((u) => URL.revokeObjectURL(u));
      if (ytPollRef.current) window.clearInterval(ytPollRef.current);
    },
    [],
  );

  /* ── Add files ─────────────────────────────────────────── */
  const handleAddFiles = useCallback(
    async (files: File[]) => {
      const added: UploadTrack[] = [];
      for (const file of files) {
        const id = uid();
        try {
          await putBlob(id, file);
        } catch {
          /* best-effort */
        }
        const dur = await probeAudioDuration(file).catch(() => null);
        added.push({
          id,
          source: "upload",
          title: titleFromFilename(file.name),
          duration: dur,
          note: file.name,
          blobName: file.name,
          mimeType: file.type || "audio/*",
          fileSize: file.size,
        });
      }
      setTracks((prev) => [...prev, ...added]);
      flash(`+ ${added.length} ${added.length === 1 ? t.track : t.tracks}`);
    },
    [flash, t.track, t.tracks],
  );

  /* ── Add YouTube ───────────────────────────────────────── */
  const handleAddYouTube = useCallback(
    async ({ id, url, title }: { id: string; url: string; title: string }) => {
      let finalTitle = title;
      if (!finalTitle) {
        const fetched = await fetchYouTubeTitle(id);
        finalTitle = fetched ?? `YouTube · ${id}`;
      }
      const tr: YouTubeTrack = {
        id: uid(),
        source: "youtube",
        title: finalTitle,
        youtubeId: id,
        url,
        duration: null,
      };
      setTracks((prev) => [...prev, tr]);
      flash("+ " + finalTitle);
    },
    [flash],
  );

  /* ── Samples ──────────────────────────────────────────── */
  const handleLoadSamples = useCallback(() => {
    const s = createSamples();
    setTracks((prev) => [...prev, ...s]);
    flash(`+ ${s.length} ${t.tracks}`);
  }, [flash, t.tracks]);

  /* ── Stop / teardown ───────────────────────────────────── */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {
        /* ignore */
      }
    }
    if (ytPollRef.current) window.clearInterval(ytPollRef.current);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  /* ── Track ops ─────────────────────────────────────────── */
  const handleDelete = useCallback(
    async (id: string) => {
      const tr = tracks.find((x) => x.id === id);
      if (tr && tr.source === "upload") {
        await deleteBlob(id).catch(() => {});
        const url = audioUrlCache.current[id];
        if (url) {
          URL.revokeObjectURL(url);
          delete audioUrlCache.current[id];
        }
      }
      setTracks((prev) => prev.filter((x) => x.id !== id));
      if (currentId === id) {
        stopPlayback();
        setCurrentId(null);
      }
    },
    [currentId, stopPlayback, tracks],
  );

  const handleRename = useCallback((id: string, title: string) => {
    setTracks((prev) => prev.map((x) => (x.id === id ? { ...x, title } : x)));
  }, []);

  const handleRenamePlaylist = useCallback((name: string) => {
    setPlaylistName(name);
  }, []);

  function moveTrack(fromId: string, toId: string, pos: DropPos) {
    setTracks((prev) => {
      const from = prev.findIndex((x) => x.id === fromId);
      const to = prev.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      let insertAt = next.findIndex((x) => x.id === toId);
      if (insertAt < 0) insertAt = next.length;
      if (pos === "below") insertAt += 1;
      next.splice(insertAt, 0, moved);
      return next;
    });
  }

  const handleClearAll = useCallback(async () => {
    if (!confirm(t.confirmClear)) return;
    await clearBlobs();
    Object.values(audioUrlCache.current).forEach((u) => URL.revokeObjectURL(u));
    audioUrlCache.current = {};
    stopPlayback();
    setCurrentId(null);
    setTracks([]);
  }, [stopPlayback, t.confirmClear]);

  /* ── Import / Export ───────────────────────────────────── */
  const handleExport = useCallback(() => {
    const ytOnly = tracks.filter(
      (x): x is YouTubeTrack => x.source === "youtube",
    );
    const data: ExportedPlaylist = {
      _meta: {
        app: "wedding-playlist",
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      name: playlistName,
      tracks: ytOnly.map<ExportedTrackYouTube>((x) => ({
        id: x.id,
        source: "youtube",
        title: x.title,
        youtubeId: x.youtubeId,
        url: x.url,
        duration: x.duration,
        note: x.note,
      })),
      stats: {
        uploadedSkipped: tracks.filter((x) => x.source === "upload").length,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (playlistName || "wedding-playlist").replace(
        /[^\w؀-ۿ\-]+/g,
        "_",
      ) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(t.toastExported);
  }, [flash, playlistName, tracks, t.toastExported]);

  const handleImport = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text) as ExportedPlaylist;
        if (data.name) setPlaylistName(data.name);
        if (Array.isArray(data.tracks)) {
          const incoming: YouTubeTrack[] = data.tracks
            .filter((x) => x.source === "youtube" && x.youtubeId)
            .map((x) => ({
              id: uid(),
              source: "youtube",
              title: x.title || "Untitled",
              youtubeId: x.youtubeId,
              url: x.url,
              duration: x.duration ?? null,
              note: x.note,
            }));
          setTracks((prev) => [...prev, ...incoming]);
          flash(`+ ${incoming.length} ${t.tracks}`);
        }
      } catch {
        alert(t.importErr);
      }
    };
    inp.click();
  }, [flash, t.importErr, t.tracks]);

  /* ── Playback engine ───────────────────────────────────── */

  function startYTPoll() {
    if (ytPollRef.current) window.clearInterval(ytPollRef.current);
    ytPollRef.current = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const c = p.getCurrentTime();
        if (Number.isFinite(c)) setPosition(c);
        const d = p.getDuration();
        if (Number.isFinite(d) && d > 0) {
          setDuration(d);
        }
      } catch {
        /* ignore */
      }
    }, 400);
  }

  // Track-end handler stored in a ref so the YT listeners can call the latest version
  const handleTrackEndedRef = useRef<() => void>(() => {});

  // Switch current track
  useEffect(() => {
    if (!currentId) return;
    const track = tracks.find((x) => x.id === currentId);
    if (!track) return;

    // Tear down previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {
        /* ignore */
      }
    }
    if (ytPollRef.current) window.clearInterval(ytPollRef.current);
    setPosition(0);

    if (track.source === "upload") {
      (async () => {
        const url = await getAudioUrl(track);
        if (!url) {
          flash(t.audioMissing);
          return;
        }
        const a = audioRef.current;
        if (!a) return;
        a.src = url;
        a.volume = muted ? 0 : volume;
        try {
          await a.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      })();
    } else if (track.source === "youtube") {
      (async () => {
        const YT = await loadYouTubeAPI();
        if (!ytPlayerRef.current) {
          ytPlayerRef.current = new YT.Player("yt-host", {
            height: "1",
            width: "1",
            videoId: track.youtubeId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              disablekb: 1,
            },
            events: {
              onReady: (e: { target: YTPlayerInstance }) => {
                e.target.setVolume(Math.round((muted ? 0 : volume) * 100));
                e.target.playVideo();
                startYTPoll();
              },
              onStateChange: (e: { data: number; target: YTPlayerInstance }) => {
                const S = YT.PlayerState;
                if (e.data === S.PLAYING) setIsPlaying(true);
                else if (e.data === S.PAUSED) setIsPlaying(false);
                else if (e.data === S.ENDED) {
                  setIsPlaying(false);
                  handleTrackEndedRef.current();
                }
                if (e.data === S.PLAYING || e.data === S.BUFFERING) {
                  try {
                    const d = e.target.getDuration();
                    if (d) {
                      setDuration(d);
                      const trkId = currentIdRef.current;
                      if (trkId) {
                        setTracks((prev) =>
                          prev.map((x) =>
                            x.id === trkId && !x.duration ? { ...x, duration: d } : x,
                          ),
                        );
                      }
                    }
                  } catch {
                    /* ignore */
                  }
                }
              },
            },
          });
        } else {
          ytPlayerRef.current.loadVideoById(track.youtubeId);
          ytPlayerRef.current.setVolume(Math.round((muted ? 0 : volume) * 100));
          startYTPoll();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Mirror currentId for use inside event listeners
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  // Create the singleton <audio> element once
  useEffect(() => {
    if (audioRef.current) return;
    const a = new Audio();
    a.preload = "metadata";
    a.addEventListener("timeupdate", () => setPosition(a.currentTime));
    a.addEventListener("loadedmetadata", () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        const trkId = currentIdRef.current;
        if (trkId) {
          setTracks((prev) =>
            prev.map((x) =>
              x.id === trkId && !x.duration ? { ...x, duration: d } : x,
            ),
          );
        }
      }
    });
    a.addEventListener("play", () => setIsPlaying(true));
    a.addEventListener("pause", () => setIsPlaying(false));
    a.addEventListener("ended", () => {
      setIsPlaying(false);
      handleTrackEndedRef.current();
    });
    audioRef.current = a;
  }, []);

  // Live volume update
  useEffect(() => {
    const v = muted ? 0 : volume;
    if (audioRef.current) audioRef.current.volume = v;
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(Math.round(v * 100));
      } catch {
        /* ignore */
      }
    }
  }, [volume, muted]);

  /* ── Transport ─────────────────────────────────────────── */
  const handlePlayPause = useCallback(() => {
    if (!currentId) {
      if (tracks.length) setCurrentId(tracks[0].id);
      return;
    }
    const track = tracks.find((x) => x.id === currentId);
    if (!track) return;
    if (track.source === "upload") {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) void a.play().catch(() => {});
      else a.pause();
    } else {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const state = p.getPlayerState();
        if (state === 1) p.pauseVideo();
        else p.playVideo();
      } catch {
        /* ignore */
      }
    }
  }, [currentId, tracks]);

  function nextIndex(currIdx: number, direction: 1 | -1): number {
    if (tracks.length === 0) return -1;
    if (shuffle && direction > 0) {
      if (tracks.length === 1) return 0;
      let n: number;
      do {
        n = Math.floor(Math.random() * tracks.length);
      } while (n === currIdx);
      return n;
    }
    let n = currIdx + direction;
    if (n < 0) n = tracks.length - 1;
    if (n >= tracks.length) n = 0;
    return n;
  }

  const handleNext = useCallback(() => {
    const i = tracks.findIndex((x) => x.id === currentId);
    const n = nextIndex(i, 1);
    if (n >= 0) setCurrentId(tracks[n].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, tracks, shuffle]);

  const handlePrev = useCallback(() => {
    const i = tracks.findIndex((x) => x.id === currentId);
    const n = nextIndex(i, -1);
    if (n >= 0) setCurrentId(tracks[n].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, tracks, shuffle]);

  const handleTrackEnded = useCallback(() => {
    if (repeat) {
      const track = tracks.find((x) => x.id === currentId);
      if (!track) return;
      if (track.source === "upload") {
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = 0;
        void a.play().catch(() => {});
      } else {
        try {
          ytPlayerRef.current?.seekTo(0, true);
          ytPlayerRef.current?.playVideo();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (autoplay) handleNext();
    else setIsPlaying(false);
  }, [autoplay, currentId, handleNext, repeat, tracks]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  const handleSeek = useCallback(
    (s: number) => {
      setPosition(s);
      const track = tracks.find((x) => x.id === currentId);
      if (!track) return;
      if (track.source === "upload") {
        if (audioRef.current) audioRef.current.currentTime = s;
      } else {
        try {
          ytPlayerRef.current?.seekTo(s, true);
        } catch {
          /* ignore */
        }
      }
    },
    [currentId, tracks],
  );

  const handlePlay = useCallback(
    (id: string) => {
      if (id === currentId) handlePlayPause();
      else setCurrentId(id);
    },
    [currentId, handlePlayPause],
  );

  /* ── Drag-and-drop ─────────────────────────────────────── */
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);
  const dragIdRef = useRef<string | null>(null);

  function onDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* ignore */
    }
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const above = e.clientY - rect.top < rect.height / 2;
    setDragOverId(id);
    setDropPos(above ? "above" : "below");
  }
  function onDragLeave(_e: React.DragEvent, id: string) {
    if (dragOverId === id) {
      setDragOverId(null);
      setDropPos(null);
    }
  }
  function onDrop(e: React.DragEvent, id: string) {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (!fromId || fromId === id) return;
    moveTrack(fromId, id, dropPos);
    dragIdRef.current = null;
    setDragOverId(null);
    setDropPos(null);
  }

  /* ── Keyboard shortcut: space toggles play ──────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== " " && e.code !== "Space") return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      handlePlayPause();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePlayPause]);

  /* ── Derived ──────────────────────────────────────────── */
  const totalSeconds = useMemo(
    () =>
      tracks.reduce(
        (s, x) => s + (typeof x.duration === "number" && Number.isFinite(x.duration) ? x.duration : 0),
        0,
      ),
    [tracks],
  );

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen relative" dir={dirOf(lang)}>
      <div
        className="fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, #F4ECDF 0%, #EBE0CE 50%, #E5D5BC 100%)",
        }}
        aria-hidden
      />

      <div className="relative">
        <div
          className="mx-auto max-w-7xl px-6 py-8"
          style={{ paddingBottom: 160 }}
        >
          <div className="stage-card paper-bg p-2">
            <div style={{ position: "relative", zIndex: 1 }}>
              <Header
                playlistName={playlistName}
                onRename={handleRenamePlaylist}
                t={t}
                lang={lang}
                onToggleLang={() =>
                  setLang((l) => (l === "ar" ? "en" : "ar"))
                }
                onImport={handleImport}
                onExport={handleExport}
                onSamples={handleLoadSamples}
                onClearAll={handleClearAll}
                hasTracks={tracks.length > 0}
              />

              <div
                className="px-8 pb-8 grid grid-cols-12 gap-6"
                style={{ minHeight: 480 }}
              >
                <div className="col-span-12 lg:col-span-4">
                  <AddPanel
                    lang={lang}
                    t={t}
                    onAddFiles={handleAddFiles}
                    onAddYouTube={handleAddYouTube}
                  />
                </div>

                <div className="col-span-12 lg:col-span-8">
                  <div className="stage-card p-6">
                    <div className="flex items-baseline justify-between mb-4 px-1">
                      <div className="label-tracked">
                        {tracks.length}{" "}
                        {tracks.length === 1 ? t.track : t.tracks}
                      </div>
                      <div className="label-tracked">
                        {t.total} ·{" "}
                        <span className="tnum" style={{ color: "#3A2C20" }}>
                          {fmtTime(totalSeconds)}
                        </span>
                      </div>
                    </div>

                    {tracks.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        <div
                          className="inline-flex items-center justify-center rounded-full mb-4"
                          style={{
                            width: 72,
                            height: 72,
                            background: "rgba(216,146,116,0.10)",
                            border: "0.5px solid rgba(216,146,116,0.30)",
                          }}
                        >
                          <span style={{ color: "#D89274", fontSize: 28 }}>♪</span>
                        </div>
                        <div
                          className="font-italiana text-[28px]"
                          style={{ color: "#D89274" }}
                        >
                          {t.addFirst}
                        </div>
                        <div
                          className="font-cormorant text-[16px] mt-2 max-w-md mx-auto"
                          style={{
                            color: "#6B4A35",
                            lineHeight: 1.5,
                            fontStyle: "italic",
                          }}
                        >
                          {t.emptyHint}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {tracks.map((tr, i) => (
                          <TrackItem
                            key={tr.id}
                            track={tr}
                            idx={i}
                            isCurrent={tr.id === currentId}
                            isPlaying={tr.id === currentId && isPlaying}
                            t={t}
                            onPlay={handlePlay}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            dropPos={dragOverId === tr.id ? dropPos : null}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 text-xs text-brownSoft">
                    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoplay}
                        onChange={(e) => setAutoplay(e.target.checked)}
                        style={{ accentColor: "#D89274" }}
                      />
                      <span style={{ letterSpacing: "0.05em" }}>{t.autoplay}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <div
              className="font-amiri text-[15px]"
              style={{ color: "#D89274" }}
            >
              {t.footerNote}
            </div>
          </div>
        </div>

        <PlayerBar
          tracks={tracks}
          currentId={currentId}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          volume={volume}
          muted={muted}
          repeat={repeat}
          shuffle={shuffle}
          lang={lang}
          t={t}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolume={(v) => {
            setVolume(v);
            setMuted(false);
          }}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleRepeat={() => setRepeat((r) => !r)}
          onToggleShuffle={() => setShuffle((s) => !s)}
        />

        {/* Hidden YouTube host */}
        <div className="youtube-host">
          <div id="yt-host" />
        </div>

        <Toast message={toast} />
      </div>
    </div>
  );
}
