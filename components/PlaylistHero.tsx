"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconHeart,
  IconMore,
  IconPause,
  IconPlay,
  IconRepeat,
  IconShuffle,
  IconSparkle,
  OrnamentMark,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { Language, Track } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  playlistName: string;
  onRenamePlaylist: (name: string) => void;
  tracks: Track[];
  totalSeconds: number;
  hasCurrent: boolean;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: boolean;
  onPrimaryPlay: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onMore: () => void;
  hasYouTubeTracks: boolean;
}

export default function PlaylistHero({
  lang,
  t,
  playlistName,
  onRenamePlaylist,
  tracks,
  totalSeconds,
  hasCurrent,
  isPlaying,
  shuffle,
  repeat,
  onPrimaryPlay,
  onToggleShuffle,
  onToggleRepeat,
  onMore,
  hasYouTubeTracks,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlistName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(playlistName), [playlistName]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const v = (draft || "").trim();
    onRenamePlaylist(v || t.untitled);
    setEditing(false);
  }

  const uploadCount = tracks.filter((x) => x.source === "upload").length;
  const ytCount = tracks.filter((x) => x.source === "youtube").length;
  const playLabel = isPlaying ? t.pause : tracks.length === 0 ? t.play : t.play;
  const ButtonIcon = isPlaying ? IconPause : IconPlay;

  return (
    <section
      id="hero"
      className="relative overflow-hidden rounded-2xl fade-up"
      style={{
        borderRadius: 24,
        border: "1px solid var(--line-subtle)",
        minHeight: 380,
      }}
    >
      {/* Background gradient layer */}
      <div className="absolute inset-0 hero-gradient" aria-hidden />

      {/* Aurora glow behind artwork */}
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          insetInlineStart: "8%",
          top: "14%",
          width: 260,
          height: 260,
          opacity: 0.55,
        }}
      >
        <div className="aurora w-full h-full rounded-full" />
      </div>

      {/* Fine grain & vignette overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative grid grid-cols-1 md:grid-cols-[260px,1fr] gap-8 p-8 md:p-10">
        {/* Artwork */}
        <div className="flex md:block justify-center">
          <div
            className="hero-art relative overflow-hidden"
            style={{
              width: 220,
              height: 220,
              borderRadius: 18,
              boxShadow:
                "0 30px 60px -20px rgba(0,0,0,0.7), 0 12px 30px -10px rgba(212,175,55,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              <svg
                viewBox="0 0 100 100"
                width="120"
                height="120"
                aria-hidden
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}
              >
                <defs>
                  <linearGradient id="art-stroke" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#fff7d6" />
                    <stop offset="50%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#fff7d6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#art-stroke)"
                  strokeWidth="0.6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="none"
                  stroke="url(#art-stroke)"
                  strokeWidth="0.4"
                  opacity="0.65"
                />
                <path
                  d="M50 18 Q35 50 50 82 Q65 50 50 18Z"
                  fill="none"
                  stroke="url(#art-stroke)"
                  strokeWidth="0.5"
                />
                <path
                  d="M18 50 Q50 35 82 50 Q50 65 18 50Z"
                  fill="none"
                  stroke="url(#art-stroke)"
                  strokeWidth="0.5"
                />
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fontFamily="Cormorant Garamond, serif"
                  fontSize="20"
                  fontStyle="italic"
                  fill="url(#art-stroke)"
                >
                  R &amp; A
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Text + actions */}
        <div className="flex flex-col justify-end">
          <div className="eyebrow flex items-center gap-2">
            <IconSparkle size={11} />
            <span>{t.eyebrow}</span>
          </div>

          <h1
            className="font-arabic-display mt-4 leading-none"
            style={{
              fontSize: "clamp(40px, 6vw, 84px)",
              letterSpacing: "0.01em",
              color: "var(--text)",
            }}
          >
            {t.coupleAr}
          </h1>

          <div
            className="mt-2 font-display italic"
            style={{
              fontSize: "clamp(20px, 2.6vw, 30px)",
              color: "var(--gold-300)",
            }}
          >
            {t.coupleLatin}
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap text-[12px]" style={{ color: "var(--text-muted)" }}>
            <span>{t.subtitle}</span>
            <OrnamentMark size={6} color="#d4af37" />
            <span>
              {tracks.length} {tracks.length === 1 ? t.track : t.tracks}
            </span>
            <OrnamentMark size={6} color="#d4af37" />
            <span className="tnum">{fmtTime(totalSeconds)}</span>
            {uploadCount > 0 && (
              <>
                <OrnamentMark size={6} color="#d4af37" />
                <span>
                  {uploadCount} {t.sourceUpload}
                </span>
              </>
            )}
            {ytCount > 0 && (
              <>
                <OrnamentMark size={6} color="#d4af37" />
                <span>
                  {ytCount} {t.sourceYouTube}
                </span>
              </>
            )}
          </div>

          {/* Editable playlist name */}
          <div className="mt-5">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={inputRef}
                  className="input-elegant"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  style={{ width: 280, fontStyle: "italic" }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={commit}
                  title={t.save}
                >
                  <IconCheck size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setEditing(false)}
                  title={t.cancel}
                >
                  <IconClose size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-display italic flex items-center gap-2 group"
                style={{
                  fontSize: 22,
                  color: "var(--text-dim)",
                }}
                title={t.editTitle}
              >
                <span>{playlistName || t.untitled}</span>
                <span
                  className="opacity-0 group-hover:opacity-100 transition"
                  style={{ color: "var(--text-muted)" }}
                >
                  <IconEdit size={14} />
                </span>
              </button>
            )}
          </div>

          {/* Primary action row */}
          <div className="mt-7 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="btn-base btn-play"
              onClick={onPrimaryPlay}
              disabled={tracks.length === 0}
              style={{ width: 60, height: 60 }}
              aria-label={playLabel}
              title={playLabel}
            >
              <ButtonIcon size={26} />
            </button>
            <button
              type="button"
              className="icon-btn"
              data-active={shuffle ? "true" : "false"}
              onClick={onToggleShuffle}
              title={t.shuffle}
              style={{ width: 42, height: 42 }}
              disabled={tracks.length === 0}
            >
              <IconShuffle size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              data-active={repeat ? "true" : "false"}
              onClick={onToggleRepeat}
              title={t.repeat}
              style={{ width: 42, height: 42 }}
              disabled={tracks.length === 0}
            >
              <IconRepeat size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onMore}
              title="More"
              style={{ width: 42, height: 42 }}
              aria-label="More"
            >
              <IconMore size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
