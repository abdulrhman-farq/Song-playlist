"use client";

import type { ReactNode } from "react";
import { useEditMode, useIsHidden } from "@/lib/editMode";

interface Props {
  /** Stable identifier — used as the hidden-set key. */
  editKey: string;
  /** Friendly label shown in edit-mode hover header. */
  label?: string;
  children: ReactNode;
}

/**
 * Wraps a structural block so that:
 *  - In normal mode it's invisible (just renders children, or
 *    nothing if hidden).
 *  - In edit mode it draws a dashed gold outline + a small toolbar
 *    in the corner with a Show/Hide toggle.
 *  - When hidden AND edit mode is on, renders a slim "ghost" so the
 *    editor can find and restore the block.
 */
export default function EditableBlock({ editKey, label, children }: Props) {
  const { editing, setDraftHidden } = useEditMode();
  const hidden = useIsHidden(editKey);

  if (!editing) {
    return hidden ? null : <>{children}</>;
  }

  if (hidden) {
    return (
      <div
        style={{
          padding: "10px 14px",
          margin: "4px 0",
          border: "1px dashed rgba(212,175,55,0.45)",
          borderRadius: 10,
          background: "rgba(212,175,55,0.06)",
          color: "var(--gold-300, #e2bb42)",
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>{label ?? editKey} — hidden</span>
        <button
          type="button"
          onClick={() => setDraftHidden(editKey, false)}
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--gold-200, #eed172)",
            background: "transparent",
            border: "1px solid rgba(212,175,55,0.45)",
            padding: "4px 10px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          Show
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        outline: "1px dashed rgba(212,175,55,0.25)",
        outlineOffset: 4,
        borderRadius: 6,
      }}
    >
      <button
        type="button"
        onClick={() => setDraftHidden(editKey, true)}
        title={`Hide ${label ?? editKey}`}
        aria-label={`Hide ${label ?? editKey}`}
        style={{
          position: "absolute",
          top: -10,
          insetInlineEnd: -10,
          zIndex: 5,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "rgba(20,20,20,0.92)",
          color: "var(--gold-300, #e2bb42)",
          border: "1px solid rgba(212,175,55,0.45)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
        }}
      >
        ×
      </button>
      {children}
    </div>
  );
}
