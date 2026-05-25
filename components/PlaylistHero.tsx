"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconMore,
  IconPause,
  IconPlay,
  IconRepeat,
  IconShuffle,
  IconSparkle,
  OrnamentMark,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import { computeCountdown } from "@/lib/countdown";
import type { Strings } from "@/lib/i18n";
import { useMagneticCursor } from "@/lib/useMagneticCursor";
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
  isPlaying,
  shuffle,
  repeat,
  onPrimaryPlay,
  onToggleShuffle,
  onToggleRepeat,
  onMore,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlistName);
  const inputRef = useRef<HTMLInputElement>(null);
  const magnet = useMagneticCursor();

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
  const countdown = useMemo(() => computeCountdown(t), [t]);
  const playLabel = isPlaying ? t.pause : t.play;
  const ButtonIcon = isPlaying ? IconPause : IconPlay;

  return (
    <section
      id="hero"
      className="relative overflow-hidden contain-paint fade-up magnetic"
      onMouseMove={magnet.onMouseMove}
      style={{
        borderRadius: "var(--rad-2xl)",
        border: "1px solid var(--line-subtle)",
        minHeight: 420,
      }}
    >
      {/* Cinematic gradient backdrop */}
      <div className="absolute inset-0 hero-gradient gpu" aria-hidden />

      {/* Aurora — gpu-promoted, transform/opacity only */}
      <div
        className="absolute pointer-events-none gpu"
        aria-hidden
        style={{
          insetInlineStart: "6%",
          top: "12%",
          width: 320,
          height: 320,
          opacity: 0.55,
        }}
      >
        <div className="aurora w-full h-full rounded-full" />
      </div>

      {/* Soft vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      {/* Content */}
      <div
        className="relative grid grid-cols-1 md:grid-cols-[260px,1fr] gap-8 md:gap-10"
        style={{ padding: "var(--space-8) var(--space-7)" }}
      >
        {/* Artwork — breathing + ring pulse when playing */}
        <div className="flex md:block justify-center">
          <div
            className="relative breathe gpu"
            style={{
              width: 240,
              height: 240,
              borderRadius: 22,
            }}
          >
            {isPlaying && (
              <>
                <span className="ring-pulse" />
                <span className="ring-pulse delay-1" />
                <span className="ring-pulse delay-2" />
                <span
                  className="now-halo"
                  style={{ inset: -16 }}
                  aria-hidden
                />
              </>
            )}
            <div
              className="hero-art relative overflow-hidden gpu"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 22,
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
                  width="135"
                  height="135"
                  aria-hidden
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }}
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
        </div>

        {/* Text + actions */}
        <div className="flex flex-col justify-end">
          {/* Eyebrow row with countdown chip */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="eyebrow flex items-center gap-2">
              <IconSparkle size={11} />
              <span>{t.eyebrow}</span>
            </div>
            <CountdownChip label={countdown.label} days={countdown.daysAway} />
          </div>

          <h1
            className="font-arabic-display mt-4 leading-none gpu"
            style={{
              fontSize: "var(--fs-hero)",
              letterSpacing: "0.01em",
              color: "var(--text)",
            }}
          >
            {t.coupleAr}
          </h1>

          <div
            className="mt-2 font-display italic"
            style={{
              fontSize: "var(--fs-3xl)",
              color: "var(--gold-300)",
              fontWeight: 500,
            }}
          >
            {t.coupleLatin}
          </div>

          <div
            className="mt-3 italic shimmer-text font-display"
            style={{
              fontSize: "var(--fs-lg)",
              letterSpacing: "0.02em",
            }}
          >
            {t.inTheAir}
          </div>

          <div
            className="mt-4 flex items-center gap-2 flex-wrap"
            style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}
          >
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
              className="btn-base btn-play gpu"
              onClick={onPrimaryPlay}
              disabled={tracks.length === 0}
              style={{ width: 64, height: 64 }}
              aria-label={playLabel}
              title={playLabel}
            >
              <ButtonIcon size={28} />
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              data-active={shuffle ? "true" : "false"}
              onClick={onToggleShuffle}
              title={t.shuffle}
              style={{ width: 44, height: 44 }}
              disabled={tracks.length === 0}
            >
              <IconShuffle size={18} />
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              data-active={repeat ? "true" : "false"}
              onClick={onToggleRepeat}
              title={t.repeat}
              style={{ width: 44, height: 44 }}
              disabled={tracks.length === 0}
            >
              <IconRepeat size={18} />
            </button>
            <button
              type="button"
              className="icon-btn magnet"
              onClick={onMore}
              title="More"
              style={{ width: 44, height: 44 }}
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

function CountdownChip({ label, days }: { label: string; days: number }) {
  const isClose = days >= 0 && days <= 3;
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        background: isClose
          ? "rgba(212,175,55,0.14)"
          : "rgba(255,255,255,0.04)",
        color: isClose ? "var(--gold-200)" : "var(--text-dim)",
        border: `1px solid ${
          isClose ? "rgba(212,175,55,0.45)" : "var(--line-soft)"
        }`,
        boxShadow: isClose
          ? "0 10px 24px -14px rgba(212,175,55,0.45)"
          : undefined,
      }}
    >
      {isClose && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--gold-300)",
            boxShadow: "0 0 8px var(--gold-300)",
            display: "inline-block",
          }}
          className="breathe"
        />
      )}
      <span>{label}</span>
    </span>
  );
}
