"use client";

import { useEffect } from "react";
import { IconCheck, IconClose, IconYT } from "@/components/icons";
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
  if (!r) return "#A38A72";
  if (r.kind === "ok") return "#5B8F5B";
  return "#C97B5B";
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
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !validating) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, validating, onClose]);

  if (!open) return null;

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const allDone = !validating && progress.done === progress.total && progress.total > 0;
  const broken = tracks.filter(
    (tr) => results[tr.youtubeId] && results[tr.youtubeId].kind !== "ok",
  ).length;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !validating) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(58,44,32,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        animation: "slideUp .18s ease",
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        className="stage-card paper-bg"
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          padding: 28,
          position: "relative",
          isolation: "isolate",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="label-tracked">{t.validateTitle}</div>
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 32, height: 32 }}
              onClick={onClose}
              disabled={validating}
              title={t.cancel}
            >
              <IconClose size={14} />
            </button>
          </div>

          <div
            className="font-italiana text-[26px] mb-1"
            style={{ color: "#3A2C20" }}
          >
            {validating
              ? t.validating
              : allDone
                ? broken === 0
                  ? t.allEmbedsOk
                  : `${broken} ${broken === 1 ? t.brokenEmbed : t.brokenEmbeds}`
                : t.validateTitle}
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 4,
              background: "rgba(58,44,32,0.12)",
              borderRadius: 999,
              overflow: "hidden",
              margin: "12px 0 18px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "linear-gradient(90deg, #E9B89A, #D89274)",
                transition: "width .2s ease",
              }}
            />
          </div>

          <div className="text-xs text-brownSoft mb-3" style={{ letterSpacing: "0.04em" }}>
            {progress.done} / {progress.total}
          </div>

          <div
            className="flex flex-col gap-2"
            style={{ overflowY: "auto", maxHeight: "44vh", paddingRight: 4 }}
          >
            {tracks.map((tr) => {
              const r = results[tr.youtubeId];
              const isOk = r?.kind === "ok";
              return (
                <div
                  key={tr.id}
                  className="flex items-center gap-3 px-3 py-2 rounded hairline"
                  style={{ background: "rgba(250,245,236,0.7)" }}
                >
                  <span style={{ color: "#C97B5B" }}>
                    <IconYT size={14} />
                  </span>
                  <div
                    className="font-cormorant text-[16px] flex-1 truncate"
                    title={tr.title}
                  >
                    {tr.title}
                  </div>
                  <div
                    className="text-[10px] tnum"
                    style={{
                      color: statusColor(r),
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontFamily: "'Cinzel', serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isOk ? (
                      <span className="inline-flex items-center gap-1">
                        <IconCheck size={12} />
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
              className="btn-primary"
              onClick={onClose}
              disabled={validating}
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
