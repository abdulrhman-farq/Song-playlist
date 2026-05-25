"use client";

import { useEffect, useRef } from "react";
import { useEditMode, useEditableText } from "@/lib/editMode";

interface Props {
  /** Stable identifier — used as the override-map key. */
  editKey: string;
  /** Source text shown when no override exists. */
  fallback: string;
  /** Optional element override (defaults to span). */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  /** Treat the text as multiline (preserves newlines on edit). */
  multiline?: boolean;
}

/**
 * Drop-in editable text. Renders the (possibly overridden) text
 * value; in edit mode it upgrades to contentEditable and pushes
 * changes back into the draft store.
 */
export default function EditableText({
  editKey,
  fallback,
  as: Tag = "span",
  className,
  style,
  multiline,
}: Props) {
  const { editing, setDraftOverride } = useEditMode();
  const value = useEditableText(editKey, fallback);
  const ref = useRef<HTMLElement | null>(null);

  // Keep the DOM in sync when the source value changes externally
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const next = (el.textContent ?? "").trim();
    if (next !== value) setDraftOverride(editKey, next);
  };

  const Element = Tag as unknown as "span";
  return (
    <Element
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      className={className}
      style={{
        ...style,
        cursor: editing ? "text" : style?.cursor,
        outline: "none",
        borderBottom: editing
          ? "1px dashed rgba(212,175,55,0.55)"
          : "1px dashed transparent",
        transition: "border-color 0.15s ease",
        whiteSpace: multiline ? "pre-wrap" : undefined,
      }}
      contentEditable={editing}
      suppressContentEditableWarning
      onBlur={editing ? commit : undefined}
      onKeyDown={
        editing
          ? (e) => {
              if (!multiline && e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).blur();
              }
            }
          : undefined
      }
      data-edit-key={editing ? editKey : undefined}
    >
      {value}
    </Element>
  );
}
