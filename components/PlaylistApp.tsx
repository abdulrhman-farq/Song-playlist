"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import UploadDropzone from "@/components/UploadDropzone";
import YouTubeInput from "@/components/YouTubeInput";
import TrackItem from "@/components/TrackItem";
import Player from "@/components/Player";
import ImportExportButtons from "@/components/ImportExportButtons";
import { createSamplePlaylist } from "@/lib/samples";
import { dir, t } from "@/lib/i18n";
import { uid } from "@/lib/format";
import { fetchYouTubeTitle } from "@/lib/youtube";
import {
  deleteAudioBlob,
  loadLanguage,
  loadPlaylist,
  putAudioBlob,
  rehydrateUploadUrls,
  saveLanguage,
  savePlaylist,
} from "@/lib/storage";
import type {
  ExportedPlaylist,
  Language,
  Playlist,
  Track,
  UploadTrack,
  YouTubeTrack,
} from "@/types";

export default function PlaylistApp() {
  const [lang, setLang] = useState<Language>("en");
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);

  const dragSrcRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* ---------- initial load ---------- */
  useEffect(() => {
    // Language
    const savedLang = loadLanguage();
    if (savedLang) {
      setLang(savedLang);
    } else if (typeof navigator !== "undefined") {
      setLang(navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en");
    }

    // Playlist
    const saved = loadPlaylist();
    const initial = saved ?? createSamplePlaylist();
    setPlaylist(initial);

    // Rehydrate object URLs from IndexedDB
    rehydrateUploadUrls(initial.tracks).then(setUrlMap).catch(() => {
      /* ignore */
    });
  }, []);

  /* ---------- HTML attrs ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir(lang);
  }, [lang]);

  /* ---------- persistence ---------- */
  useEffect(() => {
    if (playlist) savePlaylist(playlist);
  }, [playlist]);

  /* ---------- helpers ---------- */
  const tracks = playlist?.tracks ?? [];
  const activeIndex = useMemo(
    () => (activeId ? tracks.findIndex((tr) => tr.id === activeId) : -1),
    [activeId, tracks],
  );
  const activeTrack = activeIndex >= 0 ? tracks[activeIndex] : null;

  const isTrackPlayable = useCallback(
    (tr: Track) => {
      if (tr.source === "youtube") return true;
      return Boolean(urlMap[tr.id]);
    },
    [urlMap],
  );

  const mutate = useCallback(
    (mut: (pl: Playlist) => Playlist) => {
      setPlaylist((prev) => {
        if (!prev) return prev;
        const next = mut(prev);
        next.updatedAt = new Date().toISOString();
        return next;
      });
    },
    [],
  );

  /* ---------- uploads ---------- */
  const handleFiles = useCallback(
    async (files: File[]) => {
      const newTracks: UploadTrack[] = [];
      const urlPatch: Record<string, string> = {};
      for (const file of files) {
        const id = uid();
        const url = URL.createObjectURL(file);
        urlPatch[id] = url;
        const title = file.name.replace(/\.[^.]+$/, "");
        const duration = await tryReadDuration(url).catch(() => undefined);
        newTracks.push({
          id,
          source: "upload",
          title,
          fileName: file.name,
          mimeType: file.type || "audio/*",
          fileSize: file.size,
          duration,
          addedAt: new Date().toISOString(),
        });
        try {
          await putAudioBlob(id, file);
        } catch {
          /* persistence is best-effort */
        }
      }
      setUrlMap((prev) => ({ ...prev, ...urlPatch }));
      mutate((pl) => ({ ...pl, tracks: [...pl.tracks, ...newTracks] }));
    },
    [mutate],
  );

  /* ---------- YouTube ---------- */
  const handleYouTube = useCallback(
    async (videoId: string, originalUrl: string) => {
      const title = (await fetchYouTubeTitle(videoId)) ?? "YouTube video";
      const tr: YouTubeTrack = {
        id: uid(),
        source: "youtube",
        title,
        videoId,
        url: originalUrl,
        addedAt: new Date().toISOString(),
      };
      mutate((pl) => ({ ...pl, tracks: [...pl.tracks, tr] }));
    },
    [mutate],
  );

  /* ---------- track ops ---------- */
  const removeTrack = useCallback(
    (id: string) => {
      const tr = playlist?.tracks.find((x) => x.id === id);
      mutate((pl) => ({ ...pl, tracks: pl.tracks.filter((x) => x.id !== id) }));
      if (tr?.source === "upload") {
        const url = urlMap[id];
        if (url) URL.revokeObjectURL(url);
        setUrlMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        deleteAudioBlob(id).catch(() => {
          /* ignore */
        });
      }
      if (activeId === id) {
        setActiveId(null);
      }
    },
    [activeId, mutate, playlist, urlMap],
  );

  const renameTrack = useCallback(
    (id: string, title: string) => {
      mutate((pl) => ({
        ...pl,
        tracks: pl.tracks.map((x) => (x.id === id ? { ...x, title } : x)),
      }));
    },
    [mutate],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0) return;
      mutate((pl) => {
        const next = pl.tracks.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return { ...pl, tracks: next };
      });
    },
    [mutate],
  );

  const moveUp = (idx: number) => reorder(idx, Math.max(0, idx - 1));
  const moveDown = (idx: number) => reorder(idx, Math.min(tracks.length - 1, idx + 1));

  /* ---------- playback ---------- */
  const playTrack = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const goNext = useCallback(() => {
    if (!autoplay) return;
    if (activeIndex < 0) return;
    const next = tracks[activeIndex + 1];
    if (next) setActiveId(next.id);
    else setActiveId(null);
  }, [activeIndex, autoplay, tracks]);

  const goPrev = useCallback(() => {
    if (activeIndex <= 0) return;
    const prev = tracks[activeIndex - 1];
    if (prev) setActiveId(prev.id);
  }, [activeIndex, tracks]);

  const updateDuration = useCallback(
    (id: string, duration: number) => {
      mutate((pl) => ({
        ...pl,
        tracks: pl.tracks.map((x) => (x.id === id ? { ...x, duration } : x)),
      }));
    },
    [mutate],
  );

  /* ---------- import / clear ---------- */
  const onImport = useCallback((data: ExportedPlaylist) => {
    // Revoke existing object URLs first.
    setUrlMap((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return {};
    });
    const imported: Playlist = {
      id: data.playlist.id || uid(),
      name: data.playlist.name || "Imported Playlist",
      createdAt: data.playlist.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: data.playlist.tracks.map((tr) => {
        if (tr.source === "youtube") {
          return {
            id: tr.id || uid(),
            source: "youtube",
            title: tr.title,
            videoId: tr.videoId,
            url: tr.url,
            duration: tr.duration,
            addedAt: tr.addedAt || new Date().toISOString(),
          } satisfies YouTubeTrack;
        }
        return {
          id: tr.id || uid(),
          source: "upload",
          title: tr.title,
          fileName: tr.fileName,
          mimeType: tr.mimeType,
          fileSize: tr.fileSize,
          duration: tr.duration,
          addedAt: tr.addedAt || new Date().toISOString(),
        } satisfies UploadTrack;
      }),
    };
    setActiveId(null);
    setPlaylist(imported);
    rehydrateUploadUrls(imported.tracks).then(setUrlMap).catch(() => {
      /* ignore */
    });
  }, []);

  const onClear = useCallback(() => {
    setActiveId(null);
    setUrlMap((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return {};
    });
    mutate((pl) => ({ ...pl, tracks: [] }));
    // also clear blobs in background
    tracks.forEach((tr) => {
      if (tr.source === "upload") {
        deleteAudioBlob(tr.id).catch(() => {
          /* ignore */
        });
      }
    });
  }, [mutate, tracks]);

  /* ---------- drag-and-drop ---------- */
  const onDragStart = (idx: number) => {
    dragSrcRef.current = idx;
  };
  const onDragEnter = (idx: number) => {
    setDragOverIdx(idx);
  };
  const onDragEnd = () => {
    const from = dragSrcRef.current;
    const to = dragOverIdx;
    if (from != null && to != null && from !== to) reorder(from, to);
    dragSrcRef.current = null;
    setDragOverIdx(null);
  };

  /* ---------- language ---------- */
  const toggleLang = () => {
    setLang((prev) => {
      const next: Language = prev === "ar" ? "en" : "ar";
      saveLanguage(next);
      return next;
    });
  };

  if (!playlist) {
    return (
      <main className="min-h-screen flex items-center justify-center text-cream-100/60">
        Loading…
      </main>
    );
  }

  const isRtl = lang === "ar";
  const trackUrl = activeTrack?.source === "upload" ? urlMap[activeTrack.id] ?? null : null;
  const canPlayActive = activeTrack ? isTrackPlayable(activeTrack) : false;

  return (
    <main className="min-h-screen px-4 sm:px-6 pb-32" dir={dir(lang)}>
      <div className="max-w-5xl mx-auto">
        <Header lang={lang} onToggleLang={toggleLang} />

        <div className="grid gap-6 md:grid-cols-5 mt-2">
          <section className="md:col-span-2 luxury-card p-5 space-y-5">
            <h2
              className={`${
                isRtl ? "font-bold" : "font-serif"
              } text-xl text-cream-50 flex items-center gap-2`}
            >
              {t(lang, "addTracks")}
              <span className="divider flex-1" />
            </h2>
            <UploadDropzone lang={lang} onFiles={handleFiles} />
            <YouTubeInput lang={lang} onAdd={handleYouTube} />
          </section>

          <section className="md:col-span-3 luxury-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2
                className={`${
                  isRtl ? "font-bold" : "font-serif"
                } text-xl text-cream-50 flex items-center gap-2`}
              >
                {t(lang, "playlist")}
                <span className="text-sm font-normal text-cream-100/55">
                  {tracks.length} {tracks.length === 1 ? t(lang, "track") : t(lang, "tracks")}
                </span>
              </h2>
              <label className="inline-flex items-center gap-2 text-xs text-cream-100/60 select-none">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                  className="accent-gold-400"
                />
                {t(lang, "autoplayNext")}
              </label>
            </div>

            <ImportExportButtons
              lang={lang}
              playlist={playlist}
              onImport={onImport}
              onClear={onClear}
            />

            <div className="mt-4 space-y-2">
              {tracks.length === 0 ? (
                <div className="text-center py-10 px-4 fade-in">
                  <div className="text-cream-50 font-medium">{t(lang, "empty")}</div>
                  <div className="text-sm text-cream-100/55 mt-1">{t(lang, "emptyHint")}</div>
                </div>
              ) : (
                tracks.map((tr, idx) => (
                  <TrackItem
                    key={tr.id}
                    lang={lang}
                    track={tr}
                    index={idx}
                    total={tracks.length}
                    isActive={tr.id === activeId}
                    isPlaying={tr.id === activeId}
                    isPlayable={isTrackPlayable(tr)}
                    onPlayPause={() => playTrack(tr.id)}
                    onMoveUp={() => moveUp(idx)}
                    onMoveDown={() => moveDown(idx)}
                    onDelete={() => removeTrack(tr.id)}
                    onRename={(title) => renameTrack(tr.id, title)}
                    onDragStart={() => onDragStart(idx)}
                    onDragEnter={() => onDragEnter(idx)}
                    onDragEnd={onDragEnd}
                    isDragging={dragSrcRef.current === idx}
                    isDropTarget={dragOverIdx === idx && dragSrcRef.current !== idx}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="mt-6">
          <Player
            lang={lang}
            track={activeTrack}
            trackUrl={trackUrl}
            onNext={goNext}
            onPrev={goPrev}
            onDurationDetected={updateDuration}
            canPlay={canPlayActive}
          />
        </div>

        <footer className="mt-10 text-center text-xs text-cream-100/40">
          {t(lang, "deployHint")}
        </footer>
      </div>
    </main>
  );
}

function tryReadDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    const done = (val?: number) => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onErr);
      resolve(val);
    };
    const onMeta = () => {
      const d = audio.duration;
      done(Number.isFinite(d) && d > 0 ? d : undefined);
    };
    const onErr = () => done(undefined);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onErr);
    // Safety timeout
    setTimeout(() => done(undefined), 4000);
  });
}
