"use client";

import { useEffect, useMemo, useState } from "react";
import { parseDue } from "@/lib/dueDate";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  value: string | undefined;
  onChange: (iso: string) => void;
  onClose: () => void;
  lang: Language;
  t: Strings;
  /** Optional anchor — if provided, positions the picker near it instead of centered. */
  anchorRect?: DOMRect | null;
}

const WEEKDAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAYS_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

/**
 * Custom calendar + time picker rendered in the wedding peach
 * palette. Replaces the native datetime-local picker so the popup
 * stays on-brand instead of dropping into iOS's blue UI.
 *
 * Designed for mobile-first thumb reach: large day cells, a single
 * Time chip below the grid, Reset / Done in the footer.
 */
export default function DueDatePicker({
  value,
  onChange,
  onClose,
  lang,
  t,
  anchorRect,
}: Props) {
  const direction = dirOf(lang);
  const initial = useMemo(() => {
    const d = parseDue(value);
    return d ?? new Date();
  }, [value]);

  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Date>(initial);
  const [time, setTime] = useState<string>(() => {
    const hh = String(initial.getHours()).padStart(2, "0");
    const mm = String(initial.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const locale = lang === "ar" ? "ar" : "en-US";
  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  // Build 6×7 day grid for the visible month
  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  function commitDone() {
    const [hh, mm] = time.split(":").map((s) => parseInt(s, 10));
    const out = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      Number.isFinite(hh) ? hh : 0,
      Number.isFinite(mm) ? mm : 0,
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${out.getFullYear()}-${pad(out.getMonth() + 1)}-${pad(out.getDate())}T${pad(out.getHours())}:${pad(out.getMinutes())}`;
    onChange(iso);
    onClose();
  }

  function reset() {
    onChange("");
    onClose();
  }

  // Position: prefer near the anchor on desktop; centered modal on mobile.
  const positionStyle: React.CSSProperties = useMemo(() => {
    if (!anchorRect || typeof window === "undefined") {
      return {};
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pickerW = 300;
    const pickerH = 380;
    if (vw < 520) return {}; // mobile → use centered modal
    let top = anchorRect.bottom + 8;
    if (top + pickerH > vh - 12) top = anchorRect.top - pickerH - 8;
    let left = anchorRect.left;
    if (left + pickerW > vw - 12) left = vw - pickerW - 12;
    if (left < 12) left = 12;
    return {
      position: "fixed",
      top: Math.max(12, top),
      left,
    };
  }, [anchorRect]);

  const isAnchored = anchorRect && typeof window !== "undefined" && window.innerWidth >= 520;

  return (
    <div
      className="fixed inset-0 z-[80]"
      style={{
        background: isAnchored ? "transparent" : "rgba(8, 5, 4, 0.65)",
        backdropFilter: isAnchored ? undefined : "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
      dir={direction}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 300,
          maxWidth: "calc(100vw - 24px)",
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.98) 0%, rgba(46, 35, 28, 0.99) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.32)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.75)",
          color: "var(--text)",
          ...positionStyle,
        }}
      >
        {/* Header: month label + nav */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="font-display italic"
            style={{ color: "var(--text)", fontSize: 17 }}
          >
            {monthLabel}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="icon-btn"
              style={{ width: 30, height: 30, color: "var(--gold-300)" }}
              aria-label={t.pickerPrevMonth}
              title={t.pickerPrevMonth}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="icon-btn"
              style={{ width: 30, height: 30, color: "var(--gold-300)" }}
              aria-label={t.pickerNextMonth}
              title={t.pickerNextMonth}
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        {/* Weekday row */}
        <div
          className="grid mb-1"
          style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}
        >
          {(lang === "ar" ? WEEKDAYS_AR : WEEKDAYS_EN).map((w) => (
            <div
              key={w}
              className="text-center text-[10px]"
              style={{
                color: "var(--gold-400)",
                letterSpacing: "0.12em",
                padding: "4px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}
        >
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isToday = isSameDay(d, today);
            const isSelected = isSameDay(d, selected);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(d)}
                className="text-center rounded-full transition"
                style={{
                  height: 34,
                  fontSize: 13,
                  background: isSelected ? "var(--gold-400)" : "transparent",
                  color: isSelected
                    ? "#1a1310"
                    : !inMonth
                      ? "var(--text-faint)"
                      : isToday
                        ? "var(--gold-300)"
                        : "var(--text)",
                  fontWeight: isSelected || isToday ? 600 : 400,
                  border: isToday && !isSelected
                    ? "1px solid var(--gold-400)"
                    : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Time row */}
        <div
          className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(216, 146, 116, 0.18)" }}
        >
          <div
            className="text-[13px]"
            style={{ color: "var(--text-muted)", letterSpacing: "0.04em" }}
          >
            {t.pickerTime}
          </div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="tnum"
            style={{
              background: "rgba(216, 146, 116, 0.10)",
              border: "1px solid rgba(216, 146, 116, 0.28)",
              borderRadius: 8,
              color: "var(--gold-300)",
              padding: "5px 10px",
              fontSize: 13,
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Footer: Reset + Done */}
        <div
          className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(216, 146, 116, 0.18)" }}
        >
          <button
            type="button"
            onClick={reset}
            className="text-[13px]"
            style={{
              color: "var(--text-muted)",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t.pickerReset}
          </button>
          <button
            type="button"
            onClick={commitDone}
            className="text-[13px] font-semibold"
            style={{
              background: "var(--gold-400)",
              color: "#1a1310",
              padding: "7px 18px",
              borderRadius: 999,
              cursor: "pointer",
              boxShadow: "0 6px 14px -6px rgba(216, 146, 116, 0.45)",
            }}
          >
            {t.pickerDone}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build the 6×7 grid of dates covering the month containing `month`,
 * padded with the trailing days of the previous month and the
 * leading days of the next.
 */
function buildMonthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = first.getDay(); // 0..6 (Sun..Sat)
  const start = new Date(first);
  start.setDate(start.getDate() - startWeekday);
  const out: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === "left" ? (
        <polyline points="15 6 9 12 15 18" />
      ) : (
        <polyline points="9 6 15 12 9 18" />
      )}
    </svg>
  );
}
