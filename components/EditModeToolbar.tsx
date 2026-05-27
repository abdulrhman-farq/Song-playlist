"use client";

import { useEffect } from "react";
import { useEditMode } from "@/lib/editMode";

/**
 * Floating top-center toolbar that's only visible while edit mode
 * is active. Surfaces Save / Cancel / Exit and shows the unsaved-
 * changes hint.
 */
export default function EditModeToolbar() {
  const { editing, dirty, save, cancel, exit, resetAll } = useEditMode();

  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        cancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, save, cancel]);

  if (!editing) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(20,20,20,0.92)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(216, 146, 116,0.45)",
        boxShadow: "0 20px 48px -16px rgba(0,0,0,0.8)",
        animation: "fade-in 0.2s ease",
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "var(--gold-300, #ecb89a)",
          fontFamily: "var(--font-tracked)",
          fontWeight: 500,
        }}
      >
        Editing
      </span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <span
        style={{
          fontSize: 11,
          color: dirty ? "#fef3c7" : "rgba(255,255,255,0.55)",
          minWidth: 92,
        }}
      >
        {dirty ? "Unsaved changes" : "No changes"}
      </span>
      <button
        type="button"
        onClick={cancel}
        style={pill({ tone: "ghost" })}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={save}
        disabled={!dirty}
        style={pill({ tone: dirty ? "gold" : "ghost" })}
      >
        Save & Exit
      </button>
      <button
        type="button"
        onClick={resetAll}
        title="Reset all edits"
        style={pill({ tone: "danger" })}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={exit}
        title="Exit without saving but keep drafts in memory"
        style={pill({ tone: "ghost" })}
      >
        Exit
      </button>
    </div>
  );
}

function pill({ tone }: { tone: "ghost" | "gold" | "danger" }): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid",
    cursor: "pointer",
    fontFamily: "var(--font-tracked)",
    fontWeight: 500,
    transition: "transform .15s ease, background .15s ease",
  };
  if (tone === "gold") {
    return {
      ...base,
      background: "var(--gold-400, #d89274)",
      color: "#050505",
      borderColor: "var(--gold-400, #d89274)",
    };
  }
  if (tone === "danger") {
    return {
      ...base,
      background: "transparent",
      color: "#f3a08a",
      borderColor: "rgba(243,160,138,0.35)",
    };
  }
  return {
    ...base,
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.18)",
  };
}
