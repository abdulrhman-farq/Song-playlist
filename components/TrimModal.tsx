"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconClock, IconClose, IconTrash } from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { Language, Track } from "@/types";

interface Props {
  open: boolean;
  track: Track | null;
  /** Current playhead position when modal opened, in seconds. */
  currentPosition: number;
  /** Whether `currentPosition` refers to this track (i.e. it's actively playing). */
  positionIsForThisTrack: boolean;
  onClose: () => void;
  onSave: (id: string, startAt: number | null, endAt: number | null) => void;
  t: Strings;
  lang: Language;
}

/** Parse a "mm:ss" or "h:mm:ss" string to seconds, or null if blank, or NaN if bad. */
function parseTime(input: string): number | null | typeof NaN {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return Number.NaN;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n))) return Number.NaN;
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return Number.NaN;
}

function formatForInput(s: number | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0) return "";
  return fmtTime(s);
}

export default function TrimModal({
  open,
  track,
  currentPosition,
  positionIsForThisTrack,
  onClose,
  onSave,
  t,
  lang,
}: Props) {
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && track) {
      setStartStr(formatForInput(track.startAt));
      setEndStr(formatForInput(track.endAt));
      setErr(null);
    }
  }, [open, track]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !track) return null;

  function save() {
    const start = parseTime(startStr);
    const end = parseTime(endStr);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setErr("Use mm:ss");
      return;
    }
    const sNum = start === null ? null : Number(start);
    const eNum = end === null ? null : Number(end);
    if (sNum != null && eNum != null && eNum <= sNum) {
      setErr("End must be after start");
      return;
    }
    if (track && onSave) onSave(track.id, sNum, eNum);
    onClose();
  }

  function clearTrim() {
    setStartStr("");
    setEndStr("");
    setErr(null);
    if (track) onSave(track.id, null, null);
    onClose();
  }

  const dur = track.duration;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        className="stage-card paper-bg"
        style={{
          width: "min(440px, 92vw)",
          padding: 28,
          position: "relative",
          isolation: "isolate",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="label-tracked inline-flex items-center gap-2">
              <IconClock size={10} />
              {t.trimTitle}
            </div>
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 32, height: 32 }}
              onClick={onClose}
              title={t.cancel}
            >
              <IconClose size={14} />
            </button>
          </div>

          <div
            className="font-cormorant text-[20px] truncate"
            style={{ color: "#3A2C20" }}
            title={track.title}
          >
            {track.title}
          </div>

          <div
            className="text-xs text-brownSoft mt-1"
            style={{ letterSpacing: "0.04em" }}
          >
            {t.trimSubtitle}
            {dur ? ` · ${t.total.toLowerCase()} ${fmtTime(dur)}` : ""}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div>
              <label className="label-tracked mb-1 block">{t.startAt}</label>
              <input
                className="input-elegant w-full tnum"
                value={startStr}
                placeholder="0:00"
                onChange={(e) => {
                  setStartStr(e.target.value);
                  setErr(null);
                }}
                dir="ltr"
              />
              {positionIsForThisTrack && currentPosition > 0 && (
                <button
                  type="button"
                  className="text-[10px] mt-1.5"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#D89274",
                  }}
                  onClick={() => setStartStr(fmtTime(currentPosition))}
                >
                  ↑ {t.setToCurrent}
                </button>
              )}
            </div>
            <div>
              <label className="label-tracked mb-1 block">{t.endAt}</label>
              <input
                className="input-elegant w-full tnum"
                value={endStr}
                placeholder={dur ? fmtTime(dur) : "—:—"}
                onChange={(e) => {
                  setEndStr(e.target.value);
                  setErr(null);
                }}
                dir="ltr"
              />
              {positionIsForThisTrack && currentPosition > 0 && (
                <button
                  type="button"
                  className="text-[10px] mt-1.5"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#D89274",
                  }}
                  onClick={() => setEndStr(fmtTime(currentPosition))}
                >
                  ↑ {t.setToCurrent}
                </button>
              )}
            </div>
          </div>

          {err && (
            <div className="text-xs mt-3" style={{ color: "#C97B5B" }}>
              {err}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 gap-2 flex-wrap">
            <button
              type="button"
              className="btn-ghost"
              onClick={clearTrim}
              disabled={track.startAt == null && track.endAt == null}
              style={{ color: "#C97B5B", borderColor: "rgba(201,123,91,0.35)" }}
            >
              <IconTrash size={12} />
              <span>{t.clearTrim}</span>
            </button>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                {t.cancel}
              </button>
              <button type="button" className="btn-primary" onClick={save}>
                <IconCheck size={12} />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
