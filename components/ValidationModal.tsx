"use client";

import { useEffect, useId, useRef } from "react";
import { IconCheck, IconClose, IconShield, IconYT } from "@/components/icons";
import { trapFocus } from "@/lib/focusTrap";
import type { Strings } from "@/lib/i18n";
import type { EmbedCheckResult } from "@/lib/ytApi";
import type { Language, YouTubeTrack } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  tracks: YouTubeTrack[];
  results: Record<string, EmbedCheckResult>;
  progress: { done: number; total: number };
  validating: boolean;
  t: Strings;
  lang: Language;
}

function statusLabel(r: EmbedCheckResult | undefined, t: Strings): string {
  if (!r) return t.validatingTrack;
  switch (r.kind) {
    case "ok":
      return t.validOk;
    case "embed-disabled":
      return t.validEmbedDisabled;
    case "removed":
      return t.validRemoved;
    case "invalid":
      return t.validInvalid;
    case "error":
      return `${t.validError} (${r.code})`;
  }
}

function statusColor(r: EmbedCheckResult | undefined): string {
  if (!r) return "var(--text-faint)";
  // Light peach for "ok" so it reads as positive without leaving
  // the monochrome system. Danger keeps a soft red since the
  // user genuinely needs to see "this won't play".
  if (r.kind === "ok") return "var(--peach-200)";
  return "var(--danger)";
}

export default function ValidationModal({
  open,
  onClose,
  tracks,
  results,
  progress,
  validating,
  t,
  lang,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !validating) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, validating, onClose]);

  // Keep focus inside the modal while open; restore on close.
  useEffect(() => {
    if (!open) return;
    const node = cardRef.current;
    if (!node) return;
    return trapFocus(node);
  }, [open]);

  if (!open) return null;

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const allDone =
    !validating && progress.done === progress.total && progress.total > 0;
  const broken = tracks.filter(
    (tr) => results[tr.youtubeId] && results[tr.youtubeId].kind !== "ok",
  ).length;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !validating) onClose();
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        ref={cardRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={validating}
        style={{ padding: 24 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--gold-400)" }} aria-hidden>
              <IconShield size={16} />
            </span>
            <div className="label-micro">{t.validateTitle}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={validating}
            title={t.cancel}
            aria-label={t.cancel}
          >
            <IconClose size={14} />
          </button>
        </div>

        <div
          id={titleId}
          className="font-display italic"
          style={{ fontSize: 24, color: "var(--text)" }}
        >
          {validating
            ? t.validating
            : allDone
              ? broken === 0
                ? t.allEmbedsOk
                : `${broken} ${broken === 1 ? t.brokenEmbed : t.brokenEmbeds}`
              : t.validateTitle}
        </div>

        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 999,
            overflow: "hidden",
            margin: "14px 0 14px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--gold-400), var(--gold-300))",
              transition: "width 0.2s var(--ease-out)",
            }}
          />
        </div>

        <div
          className="text-[11px] mb-3"
          style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}
        >
          {progress.done} / {progress.total}
        </div>

        <div
          className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1"
          style={{ maxHeight: "48vh" }}
        >
          {tracks.map((tr) => {
            const r = results[tr.youtubeId];
            const isOk = r?.kind === "ok";
            return (
              <div
                key={tr.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--line-subtle)",
                }}
              >
                <span style={{ color: "#f3a08a" }}>
                  <IconYT size={14} />
                </span>
                <div
                  className="font-display italic text-[14px] flex-1 truncate"
                  style={{ color: "var(--text)" }}
                  title={tr.title}
                >
                  {tr.title}
                </div>
                <div
                  className="text-[10px] tnum"
                  style={{
                    color: statusColor(r),
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isOk ? (
                    <span className="inline-flex items-center gap-1">
                      <IconCheck size={11} />
                      {t.validOk}
                    </span>
                  ) : (
                    statusLabel(r, t)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end mt-4">
          <button
            type="button"
            className="btn-base btn-gold"
            onClick={onClose}
            disabled={validating}
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}
