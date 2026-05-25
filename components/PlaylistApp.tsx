"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import Sidebar from "@/components/Sidebar";
import PlaylistHero from "@/components/PlaylistHero";
import TrackList from "@/components/TrackList";
import UploadPanel, { type UploadProgress } from "@/components/UploadPanel";
import { extractAudio, isVideoFile } from "@/lib/audioExtraction";
import YouTubeAddPanel from "@/components/YouTubeAddPanel";
import EmptyState from "@/components/EmptyState";
import BottomPlayer from "@/components/BottomPlayer";
import Toast from "@/components/Toast";
import EditModeToolbar from "@/components/EditModeToolbar";
import EditableBlock from "@/components/EditableBlock";
import EditableText from "@/components/EditableText";
import { EditModeProvider } from "@/lib/editMode";
import type { DropPos } from "@/components/TrackRow";
import { fmtTime, probeAudioDuration, titleFromFilename, uid } from "@/lib/format";
import { dir as dirOf, strings } from "@/lib/i18n";
import { createSamples } from "@/lib/samples";
import { createDefaultSections } from "@/lib/sections";
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
import {
  checkEmbedsBatch,
  loadYouTubeAPI,
  type EmbedCheckResult,
  type YTPlayerInstance,
} from "@/lib/ytApi";
import type {
  ExportedPlaylist,
  ExportedTrackYouTube,
  Language,
  PlaylistSection,
  Track,
  UploadTrack,
  YouTubeTrack,
} from "@/types";

/* ── Deferred imports ─────────────────────────────────────────────────
   These three only mount when the user opens them — there's no value
   in shipping them in the initial bundle. `ssr: false` because they
   each touch browser-only APIs (window/localStorage) and aren't part
   of the first paint anyway. Each lazy chunk lands separately so the
   first-render JS budget stays tight. */
const Timeline = dynamic(() => import("@/components/Timeline"), {
  ssr: false,
});
const TrimModal = dynamic(() => import("@/components/TrimModal"), {
  ssr: false,
});
const ValidationModal = dynamic(() => import("@/components/ValidationModal"), {
  ssr: false,
});

/* ── Component ────────────────────────────────────────────────────────── */

export default function PlaylistApp() {
  // Language
  const [lang, setLang] = useState<Language>("en");
  const t = strings[lang];

  // Playlist
  const [playlistName, setPlaylistName] = useState<string>(strings.en.untitled);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sections, setSections] = useState<PlaylistSection[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  /**
   * The track list ordered by section: for each section (in section
   * order), append tracks belonging to it (preserving their relative
   * order in `tracks`). Unassigned tracks come last. This is what
   * next/prev navigation walks.
   */
  const orderedTracks = useMemo<Track[]>(() => {
    const bySection: Record<string, Track[]> = {};
    const unassigned: Track[] = [];
    for (const tr of tracks) {
      const sid = tr.sectionId;
      if (sid && sections.some((s) => s.id === sid)) {
        (bySection[sid] ??= []).push(tr);
      } else {
        unassigned.push(tr);
      }
    }
    const out: Track[] = [];
    for (const sec of sections) {
      if (bySection[sec.id]) out.push(...bySection[sec.id]);
    }
    out.push(...unassigned);
    return out;
  }, [tracks, sections]);

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
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgress | null>(null);

  // YouTube embed validation
  const [validation, setValidation] = useState<Record<string, EmbedCheckResult>>({});
  const [validating, setValidating] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationProgress, setValidationProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

  // Trim editor
  const [trimEditId, setTrimEditId] = useState<string | null>(null);
  // Timeline overlay
  const [timelineOpen, setTimelineOpen] = useState(false);
  /** Mirror of the active track's endAt so playback listeners can check it. */
  const endAtRef = useRef<number | null>(null);
  /** DOM refs to each section block — used by the sidebar to scroll to a section. */
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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
      if (Array.isArray(saved.sections) && saved.sections.length > 0) {
        setSections(saved.sections);
      } else {
        setSections(createDefaultSections(strings[savedLang]));
      }
      if (typeof saved.volume === "number") setVolume(saved.volume);
      if (typeof saved.autoplay === "boolean") setAutoplay(saved.autoplay);
      if (typeof saved.shuffle === "boolean") setShuffle(saved.shuffle);
      if (typeof saved.repeat === "boolean") setRepeat(saved.repeat);
    } else {
      setPlaylistName(strings[savedLang].untitled);
      setSections(createDefaultSections(strings[savedLang]));
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
      sections,
      volume,
      autoplay,
      shuffle,
      repeat,
    });
  }, [loaded, playlistName, tracks, sections, volume, autoplay, shuffle, repeat]);

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
        const needsExtraction = isVideoFile(file);
        try {
          if (needsExtraction) {
            setUploadProgress({ name: file.name, pct: 0 });
          }
          const { blob, outputName, extracted } = await extractAudio(
            file,
            (pct) => {
              if (needsExtraction) {
                setUploadProgress({ name: file.name, pct });
              }
            },
          );
          try {
            await putBlob(id, blob);
          } catch {
            /* best-effort */
          }
          const dur = await probeAudioDuration(blob).catch(() => null);
          added.push({
            id,
            source: "upload",
            title: titleFromFilename(file.name),
            duration: dur,
            note: file.name,
            blobName: extracted ? outputName : file.name,
            mimeType: blob.type || file.type || "audio/*",
            fileSize: blob.size,
          });
        } catch {
          flash(t.extractionFailed.replace("{name}", file.name));
        } finally {
          if (needsExtraction) setUploadProgress(null);
        }
      }
      if (added.length > 0) {
        setTracks((prev) => [...prev, ...added]);
        flash(`+ ${added.length} ${added.length === 1 ? t.track : t.tracks}`);
      }
    },
    [flash, t.extractionFailed, t.track, t.tracks],
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

  /* ── Validate YouTube embeds ───────────────────────────── */
  const handleValidate = useCallback(async () => {
    const ytIds = tracks
      .filter((x): x is YouTubeTrack => x.source === "youtube")
      .map((x) => x.youtubeId);
    if (ytIds.length === 0) {
      flash(t.noYouTubeTracks);
      return;
    }
    setValidating(true);
    setValidationOpen(true);
    setValidationProgress({ done: 0, total: ytIds.length });
    // Clear any prior results so the badges visually reset
    setValidation({});
    try {
      const results = await checkEmbedsBatch(
        ytIds,
        (done, total) => setValidationProgress({ done, total }),
        3,
      );
      const flat: Record<string, EmbedCheckResult> = {};
      results.forEach((v, k) => {
        flat[k] = v;
      });
      setValidation(flat);
      const broken = Array.from(results.values()).filter((v) => v.kind !== "ok").length;
      flash(
        broken === 0
          ? t.allEmbedsOk
          : `${broken} ${broken === 1 ? t.brokenEmbed : t.brokenEmbeds}`,
      );
    } finally {
      setValidating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, flash]);

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

  /* ── Section ops ───────────────────────────────────────── */
  const handleAddSection = useCallback(() => {
    const label = prompt(t.addSection + " — " + t.renameSection);
    if (!label) return;
    setSections((prev) => [...prev, { id: uid(), label: label.trim() }]);
  }, [t.addSection, t.renameSection]);

  const handleRenameSection = useCallback(
    (id: string) => {
      const current = sections.find((s) => s.id === id);
      if (!current) return;
      const label = prompt(t.renameSection, current.label);
      if (label == null) return;
      const trimmed = label.trim();
      if (!trimmed) return;
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, label: trimmed } : s)),
      );
    },
    [sections, t.renameSection],
  );

  const handleDeleteSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setTracks((prev) =>
      prev.map((tr) => (tr.sectionId === id ? { ...tr, sectionId: undefined } : tr)),
    );
  }, []);

  const handleMoveSection = useCallback((id: string, direction: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  /**
   * Drag-reorder: move section `fromId` to land above or below `toId`.
   * Mirrors the track-row pattern.
   */
  const handleReorderSections = useCallback(
    (fromId: string, toId: string, pos: "above" | "below") => {
      if (fromId === toId) return;
      setSections((prev) => {
        const fromIdx = prev.findIndex((s) => s.id === fromId);
        const toIdx = prev.findIndex((s) => s.id === toId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const next = prev.slice();
        const [moved] = next.splice(fromIdx, 1);
        let insertAt = next.findIndex((s) => s.id === toId);
        if (insertAt < 0) insertAt = next.length;
        if (pos === "below") insertAt += 1;
        next.splice(insertAt, 0, moved);
        return next;
      });
    },
    [],
  );

  /**
   * Clone a section's label + every track inside it. New section lands
   * directly after the source; new tracks get fresh IDs and are
   * inserted after the source's tracks so playback order stays sane.
   *
   * Upload tracks are cloned by reference (same blob id is shared)
   * which is fine for read playback — duplicates point at the same
   * audio data. Deleting one duplicate does NOT delete the blob
   * (handleDelete only purges the blob when deleting any single
   * track that owns it, which is still correct for the original).
   */
  const handleDuplicateSection = useCallback((id: string) => {
    setSections((prevSections) => {
      const idx = prevSections.findIndex((s) => s.id === id);
      if (idx < 0) return prevSections;
      const source = prevSections[idx];
      const newSectionId = uid();
      const cloned: PlaylistSection = {
        id: newSectionId,
        label: `${source.label} (copy)`,
      };
      const next = prevSections.slice();
      next.splice(idx + 1, 0, cloned);

      // Clone all tracks belonging to the source section, in their
      // current order, into the new section. Done inside the same
      // setSections to read the latest sections; track clone happens
      // in a separate setTracks below.
      setTracks((prevTracks) => {
        const sourceTracks = prevTracks.filter((tr) => tr.sectionId === id);
        if (sourceTracks.length === 0) return prevTracks;
        const clones: Track[] = sourceTracks.map((tr) => {
          if (tr.source === "youtube") {
            return {
              ...tr,
              id: uid(),
              sectionId: newSectionId,
            };
          }
          return {
            ...tr,
            id: uid(),
            sectionId: newSectionId,
          };
        });
        // Insert the clones right after the last source-section track
        // so they sit visually adjacent to the new section header.
        let insertAt = prevTracks.length;
        for (let i = prevTracks.length - 1; i >= 0; i--) {
          if (prevTracks[i].sectionId === id) {
            insertAt = i + 1;
            break;
          }
        }
        const out = prevTracks.slice();
        out.splice(insertAt, 0, ...clones);
        return out;
      });

      return next;
    });
  }, []);

  const handleAssignSection = useCallback(
    (trackId: string, sectionId: string | null) => {
      setTracks((prev) =>
        prev.map((tr) =>
          tr.id === trackId
            ? { ...tr, sectionId: sectionId ?? undefined }
            : tr,
        ),
      );
    },
    [],
  );

  const handleSaveTrim = useCallback(
    (id: string, startAt: number | null, endAt: number | null) => {
      setTracks((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                startAt: startAt ?? undefined,
                endAt: endAt ?? undefined,
              }
            : x,
        ),
      );
      flash(t.trimSaved);
    },
    [flash, t.trimSaved],
  );

  const handleRenamePlaylist = useCallback((name: string) => {
    setPlaylistName(name);
  }, []);

  function moveTrack(fromId: string, toId: string, pos: DropPos) {
    setTracks((prev) => {
      const target = prev.find((x) => x.id === toId);
      if (!target) return prev;
      // Adopt the target's section so cross-section drops "stick".
      const updated = prev.map((x) =>
        x.id === fromId ? { ...x, sectionId: target.sectionId } : x,
      );
      const from = updated.findIndex((x) => x.id === fromId);
      if (from < 0) return prev;
      const [moved] = updated.splice(from, 1);
      let insertAt = updated.findIndex((x) => x.id === toId);
      if (insertAt < 0) insertAt = updated.length;
      if (pos === "below") insertAt += 1;
      updated.splice(insertAt, 0, moved);
      return updated;
    });
  }

  /** Drop a track onto a section header (or into an empty section). */
  function dropOnSection(fromId: string, sectionId: string | null) {
    setTracks((prev) => {
      if (!prev.some((x) => x.id === fromId)) return prev;
      const updated = prev.map((x) =>
        x.id === fromId ? { ...x, sectionId: sectionId ?? undefined } : x,
      );
      const fromIdx = updated.findIndex((x) => x.id === fromId);
      const [moved] = updated.splice(fromIdx, 1);
      // Place after the last track currently in that section, or at end.
      let insertAt = updated.length;
      for (let i = updated.length - 1; i >= 0; i--) {
        if ((updated[i].sectionId ?? null) === sectionId) {
          insertAt = i + 1;
          break;
        }
      }
      updated.splice(insertAt, 0, moved);
      return updated;
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

    const startAt =
      typeof track.startAt === "number" && Number.isFinite(track.startAt) && track.startAt > 0
        ? track.startAt
        : undefined;
    const endAt =
      typeof track.endAt === "number" && Number.isFinite(track.endAt) && track.endAt > 0
        ? track.endAt
        : undefined;
    endAtRef.current = endAt ?? null;

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
        const seekToStart = () => {
          if (startAt != null) {
            try {
              a.currentTime = startAt;
            } catch {
              /* ignore */
            }
          }
        };
        a.addEventListener("loadedmetadata", seekToStart, { once: true });
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
              start: startAt,
              end: endAt,
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
          ytPlayerRef.current.loadVideoById({
            videoId: track.youtubeId,
            startSeconds: startAt,
            endSeconds: endAt,
          });
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
    a.addEventListener("timeupdate", () => {
      setPosition(a.currentTime);
      const end = endAtRef.current;
      if (end != null && a.currentTime >= end) {
        a.pause();
        setIsPlaying(false);
        handleTrackEndedRef.current();
      }
    });
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

  function nextIndex(list: Track[], currIdx: number, direction: 1 | -1): number {
    if (list.length === 0) return -1;
    if (shuffle && direction > 0) {
      if (list.length === 1) return 0;
      let n: number;
      do {
        n = Math.floor(Math.random() * list.length);
      } while (n === currIdx);
      return n;
    }
    let n = currIdx + direction;
    if (n < 0) n = list.length - 1;
    if (n >= list.length) n = 0;
    return n;
  }

  const handleNext = useCallback(() => {
    const i = orderedTracks.findIndex((x) => x.id === currentId);
    const n = nextIndex(orderedTracks, i, 1);
    if (n >= 0) setCurrentId(orderedTracks[n].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, orderedTracks, shuffle]);

  const handlePrev = useCallback(() => {
    const i = orderedTracks.findIndex((x) => x.id === currentId);
    const n = nextIndex(orderedTracks, i, -1);
    if (n >= 0) setCurrentId(orderedTracks[n].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, orderedTracks, shuffle]);

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

  /** Hero primary-play button: if nothing's queued, start with first ordered track. */
  const handlePrimaryPlay = useCallback(() => {
    if (currentId) {
      handlePlayPause();
      return;
    }
    if (orderedTracks.length > 0) setCurrentId(orderedTracks[0].id);
  }, [currentId, handlePlayPause, orderedTracks]);

  /** Section play: jump to that section's first track. */
  const handlePlaySection = useCallback(
    (sectionId: string | null) => {
      const list = orderedTracks.filter(
        (tr) => (tr.sectionId ?? null) === sectionId,
      );
      if (list.length === 0) return;
      const first = list[0];
      if (first.id === currentId) handlePlayPause();
      else setCurrentId(first.id);
    },
    [orderedTracks, currentId, handlePlayPause],
  );

  function registerSectionRef(id: string, el: HTMLElement | null) {
    sectionRefs.current[id] = el;
  }
  function scrollToSection(id: string) {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Drag-and-drop ─────────────────────────────────────── */
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);
  /** Section the dragged track is hovering over (`null` = Unassigned). */
  const [dragOverSection, setDragOverSection] = useState<
    string | null | "none"
  >("none");
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
    setDragOverSection("none");
  }

  function onSectionDragOver(e: React.DragEvent, sectionId: string | null) {
    if (!dragIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(sectionId);
  }
  function onSectionDrop(e: React.DragEvent, sectionId: string | null) {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (!fromId) return;
    // If the actual drop target is a TrackItem inside, onDrop already
    // handled it; only act when this fires without a track drop.
    if (!dragOverId) {
      dropOnSection(fromId, sectionId);
    }
    dragIdRef.current = null;
    setDragOverSection("none");
    setDragOverId(null);
    setDropPos(null);
  }

  /* Tracks grouped by section, in section order. */
  const tracksBySection = useMemo<Record<string, Track[]>>(() => {
    const groups: Record<string, Track[]> = {};
    for (const sec of sections) groups[sec.id] = [];
    const unassigned: Track[] = [];
    for (const tr of tracks) {
      const sid = tr.sectionId;
      if (sid && groups[sid]) groups[sid].push(tr);
      else unassigned.push(tr);
    }
    groups["__unassigned__"] = unassigned;
    return groups;
  }, [tracks, sections]);

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

  /* ── Memoised transport toggles ─────────────────────────
     Wrapping these in useCallback keeps the function identity stable
     across renders, which lets the memoised BottomPlayer + Sidebar
     skip work when nothing relevant changed (the player otherwise
     re-renders on every state tick because props would be new arrow
     literals each time). */
  const handleToggleLang = useCallback(() => {
    setLang((l) => (l === "ar" ? "en" : "ar"));
  }, []);
  const handleOpenTimeline = useCallback(() => setTimelineOpen(true), []);
  const handleCloseTimeline = useCallback(() => setTimelineOpen(false), []);
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    setMuted(false);
  }, []);
  const handleToggleMute = useCallback(() => setMuted((m) => !m), []);
  const handleToggleRepeat = useCallback(() => setRepeat((r) => !r), []);
  const handleToggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const handleToggleAutoplay = useCallback(() => setAutoplay((a) => !a), []);
  const handleOpenTrim = useCallback((id: string) => setTrimEditId(id), []);
  const handleCloseTrim = useCallback(() => setTrimEditId(null), []);
  const handleCloseValidation = useCallback(
    () => setValidationOpen(false),
    [],
  );

  /* ── Render ───────────────────────────────────────────── */
  const hasYouTubeTracks = tracks.some((x) => x.source === "youtube");
  const unassigned = tracksBySection["__unassigned__"] ?? [];

  return (
    <EditModeProvider>
    <EditModeToolbar />
    <AppShell
      lang={lang}
      sidebar={
        <Sidebar
          lang={lang}
          t={t}
          playlistName={playlistName}
          totalSeconds={totalSeconds}
          tracks={tracks}
          sections={sections}
          hasYouTubeTracks={hasYouTubeTracks}
          validating={validating}
          onToggleLang={handleToggleLang}
          onImport={handleImport}
          onExport={handleExport}
          onSamples={handleLoadSamples}
          onValidate={handleValidate}
          onClearAll={handleClearAll}
          onAddSection={handleAddSection}
          onScrollToSection={scrollToSection}
          onOpenTimeline={handleOpenTimeline}
        />
      }
      bottomPlayer={
        <EditableBlock editKey="player.dock" label="Bottom player dock">
          <BottomPlayer
            lang={lang}
            t={t}
            tracks={orderedTracks}
            currentId={currentId}
            isPlaying={isPlaying}
            position={position}
            duration={duration}
            volume={volume}
            muted={muted}
            shuffle={shuffle}
            repeat={repeat}
            autoplay={autoplay}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            onSeek={handleSeek}
            onVolume={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleRepeat={handleToggleRepeat}
            onToggleShuffle={handleToggleShuffle}
            onToggleAutoplay={handleToggleAutoplay}
          />
        </EditableBlock>
      }
    >
      <div className="flex flex-col gap-10">
        <EditableBlock editKey="hero" label="Hero">
        <PlaylistHero
          lang={lang}
          t={t}
          playlistName={playlistName}
          onRenamePlaylist={handleRenamePlaylist}
          tracks={tracks}
          totalSeconds={totalSeconds}
          hasCurrent={!!currentId}
          isPlaying={isPlaying}
          shuffle={shuffle}
          repeat={repeat}
          onPrimaryPlay={handlePrimaryPlay}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onMore={handleImport}
          hasYouTubeTracks={hasYouTubeTracks}
        />
        </EditableBlock>

        {/* Composer — upload + YouTube */}
        <EditableBlock editKey="composer" label="Composer (upload + YouTube)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up">
          <UploadPanel
            t={t}
            onAddFiles={handleAddFiles}
            progress={uploadProgress}
          />
          <YouTubeAddPanel t={t} onAddYouTube={handleAddYouTube} />
        </div>
        </EditableBlock>

        {/* Track list or empty state */}
        {tracks.length === 0 ? (
          <EmptyState t={t} onSamples={handleLoadSamples} />
        ) : (
          <TrackList
            lang={lang}
            t={t}
            sections={sections}
            tracksBySection={tracksBySection}
            unassigned={unassigned}
            currentId={currentId}
            isPlaying={isPlaying}
            validation={validation}
            onPlayTrack={handlePlay}
            onDeleteTrack={handleDelete}
            onRenameTrack={handleRename}
            onEditTrim={handleOpenTrim}
            onPlaySection={handlePlaySection}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
            onMoveSection={handleMoveSection}
            onDuplicateSection={handleDuplicateSection}
            onReorderSections={handleReorderSections}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onSectionDragOver={onSectionDragOver}
            onSectionDrop={onSectionDrop}
            dragOverId={dragOverId}
            dropPos={dropPos}
            dragOverSection={dragOverSection}
            registerSectionRef={registerSectionRef}
          />
        )}

        <EditableBlock editKey="footerNote" label="Footer note">
        <div className="text-center pt-4 pb-2">
          <EditableText
            as="div"
            editKey="footerNote"
            fallback={t.footerNote}
            className="font-arabic-display"
            style={{ color: "var(--gold-400)", fontSize: 15 }}
          />
        </div>
        </EditableBlock>
      </div>

      {/* Hidden YouTube host */}
      <div className="youtube-host">
        <div id="yt-host" />
      </div>

      <Toast message={toast} />

      {/* Dynamic-imported modals — only mount once the user opens them
          so their JS doesn't ride the initial bundle. */}
      {validationOpen && (
        <ValidationModal
          open={validationOpen}
          onClose={handleCloseValidation}
          tracks={tracks.filter((x): x is YouTubeTrack => x.source === "youtube")}
          results={validation}
          progress={validationProgress}
          validating={validating}
          t={t}
          lang={lang}
        />
      )}

      {trimEditId != null && (
        <TrimModal
          open={trimEditId != null}
          track={trimEditId ? tracks.find((x) => x.id === trimEditId) ?? null : null}
          currentPosition={position}
          positionIsForThisTrack={trimEditId === currentId}
          onClose={handleCloseTrim}
          onSave={handleSaveTrim}
          t={t}
          lang={lang}
        />
      )}

      {timelineOpen && (
        <Timeline
          lang={lang}
          t={t}
          onClose={handleCloseTimeline}
        />
      )}
    </AppShell>
    </EditModeProvider>
  );
}
