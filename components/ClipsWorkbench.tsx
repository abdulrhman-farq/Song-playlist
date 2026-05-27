"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconClock,
  IconClose,
  IconMusic,
  IconPause,
  IconPlay,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import { trapFocus } from "@/lib/focusTrap";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import { mergeClips, type MergeClip } from "@/lib/audioMerge";
import type { Language, Track, UploadTrack } from "@/types";

interface ClipDraft {
  /** Local ID for React keying. */
  id: string;
  trackId: string;
  startAt: number;
  endAt: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tracks: Track[];
  lang: Language;
  t: Strings;
  /** Reads the audio blob for an uploaded track. Same one the player uses. */
  getBlob: (trackId: string) => Promise<Blob | null>;
  /** Called once the merge finishes — orchestrator should add a new playlist track. */
  onMergeComplete: (args: {
    blob: Blob;
    title: string;
    duration: number;
  }) => Promise<void> | void;
}

function clipId(): string {
  return `clip_${Math.random().toString(36).slice(2, 10)}`;
}

function parseTimeInput(s: string): number | null {
  const v = s.trim();
  if (!v) return 0;
  // Accept mm:ss, h:mm:ss, or raw seconds
  if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  const parts = v.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map((p) => parseFloat(p));
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

export default function ClipsWorkbench({
  open,
  onClose,
  tracks,
  lang,
  t,
  getBlob,
  onMergeComplete,
}: Props) {
  const uploadTracks = tracks.filter(
    (x): x is UploadTrack => x.source === "upload",
  );

  const [clips, setClips] = useState<ClipDraft[]>([]);
  const [crossfade, setCrossfade] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  /* ── Per-clip preview engine ────────────────────────────
     Plays the source track between startAt and endAt so the
     user can audition the chosen range before merging. One
     clip plays at a time; clicking another stops the previous.
     Stops automatically at endAt via the timeupdate handler so
     mid-preview edits of endAt are respected. */
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewTime, setPreviewTime] = useState(0);

  // Mount a singleton <audio> once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    previewAudioRef.current = audio;
    return () => {
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // Track preview progress + auto-stop at endAt
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    function onTime() {
      const a = previewAudioRef.current;
      if (!a) return;
      setPreviewTime(a.currentTime);
      const cl = clips.find((c) => c.id === previewingId);
      if (!cl) return;
      if (a.currentTime >= cl.endAt) {
        a.pause();
        setPreviewingId(null);
      }
    }
    function onEnded() {
      setPreviewingId(null);
    }
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [previewingId, clips]);

  function stopPreview() {
    const a = previewAudioRef.current;
    if (a) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
    setPreviewingId(null);
  }

  async function togglePreview(clip: ClipDraft) {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewingId === clip.id) {
      stopPreview();
      return;
    }
    // Stop anything playing
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    // Load this clip's blob if it's not already the source. We key
    // by trackId rather than blob so switching between clips of the
    // same source reuses the object URL without re-fetching.
    const src = uploadTracks.find((x) => x.id === clip.trackId);
    if (!src) return;
    const wantUrl = `clip-src:${clip.trackId}`;
    if ((audio as HTMLAudioElement).dataset.srcKey !== wantUrl) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      const blob = await getBlob(clip.trackId);
      if (!blob) {
        setErr(`Audio for "${src.title}" not on this device`);
        return;
      }
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      audio.src = url;
      (audio as HTMLAudioElement).dataset.srcKey = wantUrl;
      // Wait briefly for metadata so currentTime seeking works
      const a = audio;
      await new Promise<void>((resolve) => {
        function onMeta() {
          a.removeEventListener("loadedmetadata", onMeta);
          resolve();
        }
        if (a.readyState >= 1) resolve();
        else a.addEventListener("loadedmetadata", onMeta);
      });
    }
    audio.currentTime = Math.max(0, clip.startAt);
    setPreviewTime(audio.currentTime);
    try {
      await audio.play();
      setPreviewingId(clip.id);
    } catch {
      setErr("Couldn't start preview (browser blocked autoplay?)");
    }
  }

  // Reset whenever the modal re-opens; also stop any preview when it closes
  useEffect(() => {
    if (open) {
      setClips([]);
      setCrossfade(0);
      setName("");
      setBusy(false);
      setStage(null);
      setProgress(0);
      setErr(null);
    } else {
      const a = previewAudioRef.current;
      if (a) {
        try {
          a.pause();
        } catch {
          /* ignore */
        }
      }
      setPreviewingId(null);
    }
  }, [open]);

  // Esc closes (unless busy)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  // Body scroll lock + focus trap
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (!open || !cardRef.current) return;
    return trapFocus(cardRef.current);
  }, [open]);

  if (!open) return null;

  function addClip(trackId: string) {
    const src = uploadTracks.find((x) => x.id === trackId);
    if (!src) return;
    const end =
      typeof src.duration === "number" && src.duration > 0 ? src.duration : 30;
    setClips((c) => [
      ...c,
      { id: clipId(), trackId, startAt: 0, endAt: end },
    ]);
  }

  function updateClip(id: string, patch: Partial<ClipDraft>) {
    setClips((c) => c.map((cl) => (cl.id === id ? { ...cl, ...patch } : cl)));
  }
  function removeClip(id: string) {
    setClips((c) => c.filter((cl) => cl.id !== id));
  }
  function moveClip(id: string, dir: -1 | 1) {
    setClips((c) => {
      const idx = c.findIndex((cl) => cl.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= c.length) return c;
      const next = c.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function build() {
    setErr(null);
    stopPreview();
    if (clips.length === 0) {
      setErr(t.noUploadsForMerge);
      return;
    }
    const mergeInput: MergeClip[] = clips.map((cl) => {
      const src = uploadTracks.find((x) => x.id === cl.trackId);
      return {
        trackId: cl.trackId,
        title: src?.title ?? "Clip",
        startAt: cl.startAt,
        endAt: cl.endAt,
      };
    });
    setBusy(true);
    setStage(t.mergeStageDecoding);
    setProgress(0);
    try {
      const result = await mergeClips(
        mergeInput,
        getBlob,
        { crossfadeSeconds: crossfade },
        (pct, st) => {
          setProgress(pct);
          if (st === "decoding") setStage(t.mergeStageDecoding);
          else if (st === "resampling") setStage(t.mergeStageResampling);
          else if (st === "merging") setStage(t.mergeStageMerging);
          else if (st === "encoding") setStage(t.mergeStageEncoding);
        },
      );
      const finalName =
        name.trim() ||
        mergeInput.map((m) => m.title).join(" + ").slice(0, 80);
      await onMergeComplete({
        blob: result.blob,
        title: finalName,
        duration: result.duration,
      });
      onClose();
    } catch (e) {
      console.error("merge failed", e);
      setErr(e instanceof Error ? e.message : t.mergeFailed);
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  const totalSec = clips.reduce(
    (s, cl) => s + Math.max(0, cl.endAt - cl.startAt),
    0,
  );

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        ref={cardRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ padding: 24, width: "min(640px, 100%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--gold-400)" }} aria-hidden>
              <IconMusic size={14} />
            </span>
            <div className="label-micro">{t.clipsWorkbench}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={busy}
            title={t.cancel}
            aria-label={t.cancel}
          >
            <IconClose size={14} />
          </button>
        </div>

        <h2
          id={titleId}
          className="font-display italic"
          style={{ fontSize: 22, color: "var(--text)" }}
        >
          {t.clipsWorkbenchTitle}
        </h2>
        <p
          className="text-[12px] mt-1"
          style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
        >
          {t.clipsWorkbenchSubtitle}
        </p>

        {uploadTracks.length === 0 ? (
          <div
            className="mt-5 px-4 py-6 rounded-lg text-center"
            style={{
              border: "1px dashed var(--line-soft)",
              background: "rgba(255,255,255,0.02)",
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {t.noUploadsForMerge}
          </div>
        ) : (
          <>
            {/* Clip list */}
            <div
              className="mt-4 flex flex-col gap-2"
              style={{ maxHeight: "40vh", overflowY: "auto", paddingInlineEnd: 4 }}
            >
              {clips.map((cl, idx) => {
                const src = uploadTracks.find((x) => x.id === cl.trackId);
                const dur = src?.duration ?? 0;
                return (
                  <div
                    key={cl.id}
                    className="rounded-md px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--line-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePreview(cl)}
                        disabled={busy}
                        aria-label={
                          previewingId === cl.id ? "Stop preview" : "Preview clip"
                        }
                        title={
                          previewingId === cl.id
                            ? "Stop preview"
                            : "Preview this range"
                        }
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            previewingId === cl.id
                              ? "var(--gold-400)"
                              : "rgba(212,175,55,0.15)",
                          color:
                            previewingId === cl.id ? "#050505" : "var(--gold-300)",
                          border: "1px solid var(--line-gold)",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all var(--dur-fast) var(--ease-out)",
                        }}
                      >
                        {previewingId === cl.id ? (
                          <IconPause size={12} />
                        ) : (
                          <IconPlay size={12} />
                        )}
                      </button>
                      <span
                        className="font-display italic truncate"
                        style={{
                          fontSize: 14,
                          color: "var(--text)",
                          flex: 1,
                        }}
                        title={src?.title}
                      >
                        {idx + 1}. {src?.title ?? "—"}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => moveClip(cl.id, -1)}
                        disabled={busy || idx === 0}
                        aria-label="Move up"
                        title="Move up"
                      >
                        <IconArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => moveClip(cl.id, 1)}
                        disabled={busy || idx === clips.length - 1}
                        aria-label="Move down"
                        title="Move down"
                      >
                        <IconArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{
                          width: 26,
                          height: 26,
                          color: "var(--danger)",
                        }}
                        onClick={() => removeClip(cl.id)}
                        disabled={busy}
                        aria-label="Remove clip"
                        title="Remove clip"
                      >
                        <IconClose size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <label className="block">
                        <span className="label-micro block mb-1">
                          {t.clipFrom}
                        </span>
                        <input
                          className="input-elegant tnum"
                          dir="ltr"
                          value={fmtTime(cl.startAt)}
                          onChange={(e) => {
                            const v = parseTimeInput(e.target.value);
                            if (v != null) updateClip(cl.id, { startAt: v });
                          }}
                          disabled={busy}
                          style={{ padding: "8px 10px", fontSize: 13 }}
                        />
                      </label>
                      <label className="block">
                        <span className="label-micro block mb-1">
                          {t.clipTo}
                        </span>
                        <input
                          className="input-elegant tnum"
                          dir="ltr"
                          value={fmtTime(cl.endAt)}
                          onChange={(e) => {
                            const v = parseTimeInput(e.target.value);
                            if (v != null) updateClip(cl.id, { endAt: v });
                          }}
                          disabled={busy}
                          style={{ padding: "8px 10px", fontSize: 13 }}
                        />
                      </label>
                    </div>
                    <div
                      className="mt-2 text-[10px] tnum flex items-center gap-2 flex-wrap"
                      style={{ color: "var(--text-faint)" }}
                    >
                      <IconClock size={9} />
                      <span>
                        {fmtTime(Math.max(0, cl.endAt - cl.startAt))}
                      </span>
                      {dur > 0 && (
                        <>
                          <span>·</span>
                          <span>source {fmtTime(dur)}</span>
                        </>
                      )}
                      {previewingId === cl.id && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--gold-300)" }}>
                            ▶ {fmtTime(previewTime)}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Preview progress bar — only renders while this
                        clip is being auditioned. Shows playhead within
                        the [startAt, endAt] window. */}
                    {previewingId === cl.id && cl.endAt > cl.startAt && (
                      <div
                        className="mt-1 progress-track"
                        style={{ height: 3 }}
                        aria-hidden
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((previewTime - cl.startAt) /
                                  (cl.endAt - cl.startAt)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Track picker for next clip */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className="label-micro"
                style={{ color: "var(--text-muted)" }}
              >
                {t.addClip}
              </span>
              <select
                className="input-elegant"
                disabled={busy}
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addClip(e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{ flex: 1, minWidth: 200, padding: "8px 10px", fontSize: 13 }}
              >
                <option value="">{t.pickTrack}…</option>
                {uploadTracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-base btn-ghost"
                onClick={() => uploadTracks[0] && addClip(uploadTracks[0].id)}
                disabled={busy || uploadTracks.length === 0}
                style={{ padding: "8px 14px", fontSize: 12 }}
              >
                <IconPlus size={12} />
                <span>{t.addClip}</span>
              </button>
            </div>

            {/* Cross-fade + name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              <div>
                <label className="label-micro block mb-1.5">
                  {t.crossfadeLabel} · {crossfade.toFixed(1)}s
                </label>
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={3}
                  step={0.1}
                  value={crossfade}
                  onChange={(e) => setCrossfade(parseFloat(e.target.value))}
                  disabled={busy}
                  aria-label={t.crossfadeLabel}
                />
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--text-faint)" }}
                >
                  {t.crossfadeHint}
                </div>
              </div>
              <div>
                <label className="label-micro block mb-1.5">
                  {t.newTrackName}
                </label>
                <input
                  className="input-elegant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                  placeholder="Mixed track"
                  style={{ padding: "8px 10px", fontSize: 13 }}
                />
              </div>
            </div>

            {/* Total + progress */}
            <div
              className="mt-4 flex items-center justify-between text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                {clips.length} clips · ~{fmtTime(totalSec)} after trim
              </span>
              {busy && stage && (
                <span className="flex items-center gap-2">
                  <span className="spinner" />
                  <span>{stage}</span>
                  <span className="tnum">{Math.round(progress * 100)}%</span>
                </span>
              )}
            </div>

            {/* Progress bar */}
            {busy && (
              <div className="mt-2 progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}

            {err && (
              <div
                className="text-[12px] mt-3"
                style={{ color: "var(--danger)" }}
              >
                {err}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                className="btn-base btn-ghost-quiet"
                onClick={onClose}
                disabled={busy}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn-base btn-gold"
                onClick={build}
                disabled={busy || clips.length === 0}
              >
                {busy ? (
                  <>
                    <span className="spinner" />
                    <span>{t.building}</span>
                  </>
                ) : (
                  <>
                    <IconMusic size={14} />
                    <span>{t.buildMerge}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
