"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconClock, IconClose, IconTrash } from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { Language, Track } from "@/types";

interface Props {
  open: boolean;
  track: Track | null;
  currentPosition: number;
  positionIsForThisTrack: boolean;
  onClose: () => void;
  onSave: (id: string, startAt: number | null, endAt: number | null) => void;
  t: Strings;
  lang: Language;
}

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
    if (track) onSave(track.id, sNum, eNum);
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
  const hasTrim = track.startAt != null || track.endAt != null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="modal-card" style={{ padding: 24, width: "min(460px, 100%)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--gold-400)" }}>
              <IconClock size={14} />
            </span>
            <div className="label-micro">{t.trimTitle}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title={t.cancel}
          >
            <IconClose size={14} />
          </button>
        </div>

        <div
          className="font-display italic truncate"
          style={{ fontSize: 22, color: "var(--text)" }}
          title={track.title}
        >
          {track.title}
        </div>
        <div
          className="text-[12px] mt-1"
          style={{ color: "var(--text-muted)", letterSpacing: "0.03em" }}
        >
          {t.trimSubtitle}
          {dur ? ` · ${t.total.toLowerCase()} ${fmtTime(dur)}` : ""}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div>
            <label className="label-micro mb-1.5 block">{t.startAt}</label>
            <input
              className="input-elegant tnum"
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
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--gold-400)",
                  fontWeight: 500,
                }}
                onClick={() => setStartStr(fmtTime(currentPosition))}
              >
                ↑ {t.setToCurrent}
              </button>
            )}
          </div>
          <div>
            <label className="label-micro mb-1.5 block">{t.endAt}</label>
            <input
              className="input-elegant tnum"
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
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--gold-400)",
                  fontWeight: 500,
                }}
                onClick={() => setEndStr(fmtTime(currentPosition))}
              >
                ↑ {t.setToCurrent}
              </button>
            )}
          </div>
        </div>

        {err && (
          <div
            className="text-[12px] mt-3"
            style={{ color: "#f3a08a" }}
          >
            {err}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 gap-2 flex-wrap">
          <button
            type="button"
            className="btn-base btn-ghost"
            onClick={clearTrim}
            disabled={!hasTrim}
            style={{ color: "#f3a08a", borderColor: "rgba(243,160,138,0.3)" }}
          >
            <IconTrash size={12} />
            <span>{t.clearTrim}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-base btn-ghost-quiet" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="button" className="btn-base btn-gold" onClick={save}>
              <IconCheck size={14} />
              <span>{t.save}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
