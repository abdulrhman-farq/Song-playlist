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
import { ConfirmDialog, PromptDialog } from "@/components/Dialog";
import { LockModeProvider, UnlockedOnly, useLockMode } from "@/lib/lockMode";
import EditModeToolbar from "@/components/EditModeToolbar";
import EditableBlock from "@/components/EditableBlock";
import EditableText from "@/components/EditableText";
import { EditModeProvider } from "@/lib/editMode";
import type { DropPos } from "@/components/TrackRow";
import { probeAudioDuration, titleFromFilename } from "@/lib/format";
import { dir as dirOf, strings } from "@/lib/i18n";
import { createSamples } from "@/lib/samples";
import { createDefaultSections } from "@/lib/sections";
import {
  deleteBlob,
  getBlob,
  loadLanguage,
  putBlob,
  saveLanguage,
} from "@/lib/storage";
import { useRealtimePlaylist } from "@/lib/realtimeSync";
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
const ClipsWorkbench = dynamic(() => import("@/components/ClipsWorkbench"), {
  ssr: false,
});

/* ── Component ────────────────────────────────────────────────────────── */

export default function PlaylistApp() {
  // Language (still purely local — language preference is per-device)
  const [lang, setLang] = useState<Language>("en");
  const t = strings[lang];

  // ── Realtime-backed playlist state ───────────────────────────
  // The hook owns every cross-client field (name, tracks, sections,
  // autoplay/shuffle/repeat/volume) and pushes updates over Supabase
  // Realtime so every connected browser stays in sync.
  const rt = useRealtimePlaylist(strings.en.untitled);
  const tracks = rt.tracks;
  const sections = rt.sections;
  const playlistName = rt.settings.name;
  const loaded = rt.loaded;
  const realtimeStatus = rt.status;

  // Settings: alias the hook setters so the rest of the component
  // reads as before. These call Supabase under the hood.
  const volume = rt.settings.volume;
  const autoplay = rt.settings.autoplay;
  const shuffle = rt.settings.shuffle;
  const repeat = rt.settings.repeat;
  const setVolume = rt.setVolume;
  const setAutoplay = rt.setAutoplay;
  const setShuffle = rt.setShuffle;
  const setRepeat = rt.setRepeat;

  const [currentId, setCurrentId] = useState<string | null>(null);

  // Seed defaults once if the DB starts empty
  const seededRef = useRef(false);

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

  // Transport state (transient, not synced)
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  // UX
  const [toast, setToast] = useState<string | null>(null);
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
  const [clipsWorkbenchOpen, setClipsWorkbenchOpen] = useState(false);

  /** Single state-machine for the prompt/confirm dialogs that used
   *  to be browser-native `prompt()` / `confirm()` calls. */
  type DialogState =
    | { kind: "none" }
    | { kind: "add-section" }
    | { kind: "rename-section"; id: string; current: string }
    | { kind: "confirm-clear" };
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
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

  /* ── Load language preference on mount (still local-only) ── */
  useEffect(() => {
    const savedLang =
      loadLanguage() ??
      (typeof navigator !== "undefined" &&
      navigator.language?.toLowerCase().startsWith("ar")
        ? "ar"
        : "en");
    setLang(savedLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── HTML lang/dir ──────────────────────────────────────── */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
    saveLanguage(lang);
  }, [lang]);

  /* ── Seed default sections once if the DB is empty ──────── */
  useEffect(() => {
    if (!loaded || seededRef.current) return;
    if (sections.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const defaults = createDefaultSections(strings[lang]);
    void rt.replaceAll({
      sections: defaults.map((s) => ({ label: s.label })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, sections.length, lang]);

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
      let addedCount = 0;
      for (const file of files) {
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
          const dur = await probeAudioDuration(blob).catch(() => null);
          // Insert into Supabase first to obtain the row id, then key
          // the local IndexedDB blob under that same id so playback
          // resolution (getBlob(track.id)) works without translation.
          const id = await rt.addTrack({
            source: "upload",
            title: titleFromFilename(file.name),
            blobName: extracted ? outputName : file.name,
            note: file.name,
            duration: dur,
          });
          try {
            await putBlob(id, blob);
          } catch {
            /* best-effort */
          }
          addedCount += 1;
        } catch {
          flash(t.extractionFailed.replace("{name}", file.name));
        } finally {
          if (needsExtraction) setUploadProgress(null);
        }
      }
      if (addedCount > 0) {
        flash(`+ ${addedCount} ${addedCount === 1 ? t.track : t.tracks}`);
      }
    },
    [flash, rt, t.extractionFailed, t.track, t.tracks],
  );

  /* ── DJ Clips Workbench — accept the merged WAV blob and add as
        a new upload-source track so it plays like any uploaded mp3. */
  const handleMergeComplete = useCallback(
    async (args: { blob: Blob; title: string; duration: number }) => {
      const id = await rt.addTrack({
        source: "upload",
        title: args.title,
        blobName: `${args.title}.wav`,
        note: `mixed · ${Math.round(args.duration)}s`,
        duration: args.duration,
      });
      try {
        await putBlob(id, args.blob);
      } catch {
        /* best effort */
      }
      flash(t.mergeSuccess);
    },
    [rt, flash, t.mergeSuccess],
  );

  const handleOpenClipsWorkbench = useCallback(
    () => setClipsWorkbenchOpen(true),
    [],
  );
  const handleCloseClipsWorkbench = useCallback(
    () => setClipsWorkbenchOpen(false),
    [],
  );

  /* ── Add YouTube ───────────────────────────────────────── */
  const handleAddYouTube = useCallback(
    async ({ id, url, title }: { id: string; url: string; title: string }) => {
      let finalTitle = title;
      if (!finalTitle) {
        const fetched = await fetchYouTubeTitle(id);
        finalTitle = fetched ?? `YouTube · ${id}`;
      }
      await rt.addTrack({
        source: "youtube",
        title: finalTitle,
        youtubeId: id,
        url,
        duration: null,
      });
      flash("+ " + finalTitle);
    },
    [flash, rt],
  );

  /* ── Samples ──────────────────────────────────────────── */
  const handleLoadSamples = useCallback(async () => {
    const s = createSamples();
    for (const sample of s) {
      if (sample.source !== "youtube") continue;
      await rt.addTrack({
        source: "youtube",
        title: sample.title,
        youtubeId: sample.youtubeId,
        url: sample.url,
        note: sample.note,
        duration: sample.duration,
      });
    }
    flash(`+ ${s.length} ${t.tracks}`);
  }, [flash, rt, t.tracks]);

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
      await rt.removeTrack(id);
      if (currentId === id) {
        stopPlayback();
        setCurrentId(null);
      }
    },
    [currentId, rt, stopPlayback, tracks],
  );

  const handleRename = useCallback(
    (id: string, title: string) => {
      void rt.renameTrack(id, title);
    },
    [rt],
  );

  /* ── Section ops ───────────────────────────────────────── */
  const handleAddSection = useCallback(() => {
    setDialog({ kind: "add-section" });
  }, []);

  const handleRenameSection = useCallback(
    (id: string) => {
      const current = sections.find((s) => s.id === id);
      if (!current) return;
      setDialog({ kind: "rename-section", id, current: current.label });
    },
    [sections],
  );

  const handleDeleteSection = useCallback(
    (id: string) => {
      void rt.removeSection(id);
    },
    [rt],
  );

  const handleMoveSection = useCallback(
    (id: string, direction: -1 | 1) => {
      void rt.moveSection(id, direction);
    },
    [rt],
  );

  /**
   * Drag-reorder: move section `fromId` to land above or below `toId`.
   * We compute the up/down delta and call moveSection repeatedly.
   */
  const handleReorderSections = useCallback(
    async (fromId: string, toId: string, pos: "above" | "below") => {
      if (fromId === toId) return;
      const fromIdx = sections.findIndex((s) => s.id === fromId);
      const toIdx = sections.findIndex((s) => s.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      let desiredIdx = toIdx;
      if (pos === "below") desiredIdx += 1;
      if (desiredIdx > fromIdx) desiredIdx -= 1;
      const delta = desiredIdx - fromIdx;
      if (delta === 0) return;
      const step: -1 | 1 = delta > 0 ? 1 : -1;
      for (let i = 0; i < Math.abs(delta); i++) {
        // Sequentially nudge; each move updates Supabase + waits for
        // the row to come back over realtime before computing the next.
        await rt.moveSection(fromId, step);
      }
    },
    [rt, sections],
  );

  /**
   * Clone a section's label + every track inside it. New section lands
   * directly after the source; new tracks get fresh IDs in the same
   * order. Uploaded blobs are NOT cloned in IndexedDB — duplicate
   * upload rows reference the same blob key (same id is impossible
   * since UUIDs are fresh, so duplicate uploads on remote devices
   * are unplayable until that device uploads its own copy).
   */
  const handleDuplicateSection = useCallback(
    async (id: string) => {
      const sourceIdx = sections.findIndex((s) => s.id === id);
      if (sourceIdx < 0) return;
      const source = sections[sourceIdx];
      const newSectionId = await rt.addSection(`${source.label} (copy)`);
      const sourceTracks = tracks.filter((tr) => tr.sectionId === id);
      for (const tr of sourceTracks) {
        if (tr.source === "youtube") {
          await rt.addTrack({
            source: "youtube",
            title: tr.title,
            youtubeId: tr.youtubeId,
            url: tr.url,
            note: tr.note,
            duration: tr.duration,
            sectionId: newSectionId,
          });
        } else {
          await rt.addTrack({
            source: "upload",
            title: tr.title,
            blobName: tr.blobName,
            note: tr.note,
            duration: tr.duration,
            sectionId: newSectionId,
          });
        }
      }
    },
    [rt, sections, tracks],
  );

  const handleAssignSection = useCallback(
    (trackId: string, sectionId: string | null) => {
      void rt.moveTrackToSection(trackId, sectionId);
    },
    [rt],
  );

  const handleSaveTrim = useCallback(
    (id: string, startAt: number | null, endAt: number | null) => {
      void rt.updateTrack(id, { startAt, endAt });
      flash(t.trimSaved);
    },
    [flash, rt, t.trimSaved],
  );

  const handleRenamePlaylist = useCallback(
    (name: string) => {
      rt.setName(name);
    },
    [rt],
  );

  function moveTrack(fromId: string, toId: string, pos: DropPos) {
    if (pos == null) return;
    void rt.moveTrack(fromId, toId, pos);
  }

  /** Drop a track onto a section header (or into an empty section). */
  function dropOnSection(fromId: string, sectionId: string | null) {
    void rt.moveTrackToSection(fromId, sectionId);
  }

  const handleClearAllRequest = useCallback(() => {
    setDialog({ kind: "confirm-clear" });
  }, []);

  const handleClearAll = useCallback(async () => {
    // Local cleanup first (blobs/object URLs live on this device)
    const uploadIds = tracks
      .filter((tr) => tr.source === "upload")
      .map((tr) => tr.id);
    for (const id of uploadIds) {
      await deleteBlob(id).catch(() => {});
    }
    Object.values(audioUrlCache.current).forEach((u) => URL.revokeObjectURL(u));
    audioUrlCache.current = {};
    stopPlayback();
    setCurrentId(null);
    await rt.clearAllTracks();
  }, [rt, stopPlayback, t.confirmClear, tracks]);

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
        if (data.name) rt.setName(data.name);
        if (Array.isArray(data.tracks)) {
          let count = 0;
          for (const x of data.tracks) {
            if (x.source !== "youtube" || !x.youtubeId) continue;
            await rt.addTrack({
              source: "youtube",
              title: x.title || "Untitled",
              youtubeId: x.youtubeId,
              url: x.url,
              duration: x.duration ?? null,
              note: x.note,
            });
            count += 1;
          }
          flash(`+ ${count} ${t.tracks}`);
        }
      } catch {
        alert(t.importErr);
      }
    };
    inp.click();
  }, [flash, rt, t.importErr, t.tracks]);

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
          // Remote-uploaded track without a local blob — surface a
          // helpful message rather than silently failing.
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
                        const cur = tracks.find((x) => x.id === trkId);
                        if (cur && !cur.duration) {
                          void rt.updateTrack(trkId, { duration: d });
                        }
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
          // Persist newly-probed duration so other clients see it too
          void rt.updateTrack(trkId, { duration: d });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** What plays after the current track ends (respects shuffle/repeat).
   *  Used by BottomPlayer's "Next up" preview. Doesn't predict shuffle's
   *  exact pick — shows the next sequential as a stand-in when shuffle is
   *  on, marking that the order is randomised. */
  const nextUpTrack: Track | null = useMemo(() => {
    if (orderedTracks.length === 0) return null;
    const i = orderedTracks.findIndex((x) => x.id === currentId);
    if (i < 0) return orderedTracks[0];
    if (repeat) return orderedTracks[i];
    let n = i + 1;
    if (n >= orderedTracks.length) {
      if (orderedTracks.length === 1) return null;
      n = 0; // wraps
    }
    return orderedTracks[n];
  }, [orderedTracks, currentId, repeat]);

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

  /* ── DJ keyboard shortcuts ───────────────────────────────
        Space → play/pause
        ←     → previous track   (→ in RTL)
        →     → next track       (← in RTL)
        M     → toggle mute
        Bail when focus is in a text input / contentEditable. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        lang === "ar" ? handleNext() : handlePrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        lang === "ar" ? handlePrev() : handleNext();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMuted((m) => !m);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePlayPause, handleNext, handlePrev, lang]);

  /* ── Derived ──────────────────────────────────────────── */
  const totalSeconds = useMemo(
    () =>
      tracks.reduce(
        (s, x) => s + (typeof x.duration === "number" && Number.isFinite(x.duration) ? x.duration : 0),
        0,
      ),
    [tracks],
  );

  // handleAssignSection is exposed via the realtime hook for future
  // use (e.g. SectionToolbar drag-into-section). Suppress unused-var.
  void handleAssignSection;
  void loaded;

  /* ── Memoised transport toggles ─────────────────────────
     Stable function identities keep the memoised BottomPlayer + Sidebar
     from re-rendering on every state tick. */
  const handleToggleLang = useCallback(() => {
    setLang((l) => (l === "ar" ? "en" : "ar"));
  }, []);
  const handleOpenTimeline = useCallback(() => setTimelineOpen(true), []);
  const handleCloseTimeline = useCallback(() => setTimelineOpen(false), []);
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    setMuted(false);
  }, [setVolume]);
  const handleToggleMute = useCallback(() => setMuted((m) => !m), []);
  const handleToggleRepeat = useCallback(
    () => setRepeat(!repeat),
    [repeat, setRepeat],
  );
  const handleToggleShuffle = useCallback(
    () => setShuffle(!shuffle),
    [shuffle, setShuffle],
  );
  const handleToggleAutoplay = useCallback(
    () => setAutoplay(!autoplay),
    [autoplay, setAutoplay],
  );
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
    <LockModeProvider>
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
          realtimeStatus={realtimeStatus}
          onToggleLang={handleToggleLang}
          onImport={handleImport}
          onExport={handleExport}
          onSamples={handleLoadSamples}
          onValidate={handleValidate}
          onClearAll={handleClearAllRequest}
          onAddSection={handleAddSection}
          onScrollToSection={scrollToSection}
          onOpenTimeline={handleOpenTimeline}
          onOpenClipsWorkbench={handleOpenClipsWorkbench}
        />
      }
      bottomPlayer={
        <EditableBlock editKey="player.dock" label="Bottom player dock">
          <BottomPlayer
            lang={lang}
            t={t}
            tracks={orderedTracks}
            currentId={currentId}
            nextTrack={nextUpTrack}
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

        {/* Composer — upload + YouTube. Hidden in wedding-day Lock mode
            so the laptop is safe to hand to anyone during the ceremony. */}
        <UnlockedOnly>
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
        </UnlockedOnly>

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

      {clipsWorkbenchOpen && (
        <ClipsWorkbench
          open={clipsWorkbenchOpen}
          onClose={handleCloseClipsWorkbench}
          tracks={tracks}
          lang={lang}
          t={t}
          getBlob={getBlob}
          onMergeComplete={handleMergeComplete}
        />
      )}

      <PromptDialog
        open={dialog.kind === "add-section"}
        title={t.addSection}
        description={t.renameSection}
        placeholder={t.sectionUnassigned}
        confirmLabel={t.add}
        cancelLabel={t.cancel}
        dir={lang === "ar" ? "rtl" : "ltr"}
        onSubmit={(label) => {
          void rt.addSection(label);
          setDialog({ kind: "none" });
        }}
        onClose={() => setDialog({ kind: "none" })}
      />

      <PromptDialog
        open={dialog.kind === "rename-section"}
        title={t.renameSection}
        defaultValue={dialog.kind === "rename-section" ? dialog.current : ""}
        confirmLabel={t.save}
        cancelLabel={t.cancel}
        dir={lang === "ar" ? "rtl" : "ltr"}
        onSubmit={(label) => {
          if (dialog.kind === "rename-section") {
            void rt.renameSection(dialog.id, label);
          }
          setDialog({ kind: "none" });
        }}
        onClose={() => setDialog({ kind: "none" })}
      />

      <ConfirmDialog
        open={dialog.kind === "confirm-clear"}
        title={t.clearAll}
        description={t.confirmClear}
        confirmLabel={t.clearAll}
        cancelLabel={t.cancel}
        destructive
        dir={lang === "ar" ? "rtl" : "ltr"}
        onConfirm={() => {
          void handleClearAll();
        }}
        onClose={() => setDialog({ kind: "none" })}
      />

      {timelineOpen && (
        <Timeline
          lang={lang}
          t={t}
          onClose={handleCloseTimeline}
        />
      )}
    </AppShell>
    </LockModeProvider>
    </EditModeProvider>
  );
}
