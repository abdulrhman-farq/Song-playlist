"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EditableBlock from "@/components/EditableBlock";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";
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
        style={{
          padding: "clamp(20px, 5vw, var(--space-8)) clamp(16px, 4vw, var(--space-7))",
        }}
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
              className="relative overflow-hidden gpu"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 22,
                boxShadow:
                  "0 30px 60px -20px rgba(0,0,0,0.7), 0 12px 30px -10px rgba(216, 146, 116,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, #FAF5EC 0%, #EBE0CE 100%)",
              }}
            >
              <EditableImage
                editKey="hero.artwork"
                fallbackSrc="/logo.png"
                fallbackAlt="Ruwaida's Wedding monogram"
                width={240}
                height={240}
                eager
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 35%",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>

        {/* Text + actions */}
        <div className="flex flex-col justify-end">
          {/* Eyebrow row with countdown chip */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="eyebrow flex items-center gap-2">
              <IconSparkle size={11} />
              <span>
                <EditableText editKey="hero.eyebrow" fallback={t.eyebrow} />
              </span>
            </div>
            <CountdownChip
              label={countdown.label}
              days={countdown.daysAway}
              state={
                countdown.isPast
                  ? "past"
                  : countdown.isToday
                  ? "today"
                  : countdown.daysAway === 1
                  ? "oneNight"
                  : "many"
              }
            />
          </div>

          <h1
            className="font-arabic-display mt-4 leading-none gpu"
            style={{
              fontSize: "var(--fs-hero)",
              letterSpacing: "0.01em",
              color: "var(--text)",
            }}
          >
            <EditableText editKey="hero.coupleAr" fallback={t.coupleAr} />
          </h1>

          <div
            className="mt-2 font-display italic"
            style={{
              fontSize: "var(--fs-3xl)",
              color: "var(--gold-300)",
              fontWeight: 500,
            }}
          >
            <EditableText editKey="hero.coupleLatin" fallback={t.coupleLatin} />
          </div>

          <div
            className="mt-3 italic shimmer-text font-display"
            style={{
              fontSize: "var(--fs-lg)",
              letterSpacing: "0.02em",
            }}
          >
            <EditableText editKey="hero.tagline" fallback={t.inTheAir} />
          </div>

          <div
            className="mt-4 flex items-center gap-2 flex-wrap"
            style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}
          >
            <span>
              {tracks.length} {tracks.length === 1 ? t.track : t.tracks}
            </span>
            <OrnamentMark size={6} color="#d89274" />
            <span className="tnum">{fmtTime(totalSeconds)}</span>
            {uploadCount > 0 && (
              <>
                <OrnamentMark size={6} color="#d89274" />
                <span>
                  {uploadCount} {t.sourceUpload}
                </span>
              </>
            )}
            {ytCount > 0 && (
              <>
                <OrnamentMark size={6} color="#d89274" />
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
          <EditableBlock editKey="hero.actions" label="Hero action row">
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
              aria-label={t.shuffle}
              aria-pressed={shuffle}
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
              aria-label={t.repeat}
              aria-pressed={repeat}
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
          </EditableBlock>
        </div>
      </div>
    </section>
  );
}

type CountdownState = "past" | "today" | "oneNight" | "many";

function CountdownChip({
  label,
  days,
  state,
}: {
  label: string;
  days: number;
  state: CountdownState;
}) {
  const isClose = days >= 0 && days <= 3;
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        background: isClose
          ? "rgba(216, 146, 116,0.14)"
          : "rgba(255,255,255,0.04)",
        color: isClose ? "var(--gold-200)" : "var(--text-dim)",
        border: `1px solid ${
          isClose ? "rgba(216, 146, 116,0.45)" : "var(--line-soft)"
        }`,
        boxShadow: isClose
          ? "0 10px 24px -14px rgba(216, 146, 116,0.45)"
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
      <span>
        <EditableText editKey={`hero.countdown.${state}`} fallback={label} />
      </span>
    </span>
  );
}
