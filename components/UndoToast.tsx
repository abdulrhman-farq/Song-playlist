"use client";

import { useEffect, useState } from "react";
import { UNDO_TIMEOUT, useUndoConsumer } from "@/lib/undo";

/**
 * Floating "Action · Undo" pill anchored to the bottom of the
 * viewport. Renders only when an undoable action is pending. Has a
 * thin peach progress bar that drains over the timeout window so the
 * user can see how much time they have left to undo.
 */
export default function UndoToast() {
  const ctx = useUndoConsumer();
  // Animated progress 0 → 100 over the timeout
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ctx?.current) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / UNDO_TIMEOUT) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(tick);
    }, 80);
    return () => clearInterval(tick);
  }, [ctx?.current]);

  if (!ctx || !ctx.current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-[90] fade-up"
      style={{
        transform: "translateX(-50%)",
        // Sit above the bottom player + safe area
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        minWidth: 260,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div
        className="flex items-center gap-3 rounded-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.98) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.32)",
          boxShadow: "0 18px 40px -16px rgba(0,0,0,0.7)",
          padding: "8px 6px 8px 16px",
        }}
      >
        <span
          className="text-[13px] truncate flex-1"
          style={{ color: "var(--text)" }}
        >
          {ctx.current.label}
        </span>
        <button
          type="button"
          onClick={ctx.runUndo}
          className="rounded-full text-[12px] font-semibold tnum"
          style={{
            background: "var(--gold-400)",
            color: "#1a1310",
            padding: "5px 14px",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          UNDO
        </button>
        <button
          type="button"
          onClick={ctx.dismiss}
          className="rounded-full"
          style={{
            color: "var(--text-faint)",
            padding: "4px",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {/* Time-left progress bar */}
      <div
        className="h-[2px] mt-[3px] mx-2 rounded-full overflow-hidden"
        style={{ background: "rgba(216, 146, 116, 0.12)" }}
      >
        <div
          style={{
            width: `${100 - progress}%`,
            height: "100%",
            background: "var(--gold-400)",
            transition: "width 80ms linear",
          }}
        />
      </div>
    </div>
  );
}
