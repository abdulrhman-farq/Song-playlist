"use client";

import { useEffect, useRef, useState } from "react";
import { useEditMode, useEditableText } from "@/lib/editMode";

interface Props {
  /** Stable identifier — used as the override-map key prefix. */
  editKey: string;
  fallbackHref: string;
  fallbackText: string;
  /** Default target attribute (defaults to "_self"). */
  fallbackTarget?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: never;
}

/**
 * Drop-in editable <a>. Renders an anchor whose href / text / target
 * may be overridden via the site-wide edit mode. Clicking the link
 * in edit mode opens a small popover instead of navigating.
 */
export default function EditableLink({
  editKey,
  fallbackHref,
  fallbackText,
  fallbackTarget = "_self",
  className,
  style,
}: Props) {
  const { editing, setDraftOverride } = useEditMode();
  const href = useEditableText(`${editKey}.href`, fallbackHref);
  const text = useEditableText(`${editKey}.text`, fallbackText);
  const target = useEditableText(`${editKey}.target`, fallbackTarget);

  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hrefDraft, setHrefDraft] = useState(href);
  const [textDraft, setTextDraft] = useState(text);
  const [targetDraft, setTargetDraft] = useState(target);

  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setHrefDraft(href);
      setTextDraft(text);
      setTargetDraft(target);
    }
  }, [open, href, text, target]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const pop = popoverRef.current;
        if (!pop) return;
        const focusable = pop.querySelectorAll<HTMLElement>(
          'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function save() {
    const nextHref = hrefDraft.trim() || fallbackHref;
    const nextText = textDraft;
    const nextTarget = targetDraft === "_blank" ? "_blank" : "_self";
    if (nextHref !== href) setDraftOverride(`${editKey}.href`, nextHref);
    if (nextText !== text) setDraftOverride(`${editKey}.text`, nextText);
    if (nextTarget !== target) setDraftOverride(`${editKey}.target`, nextTarget);
    setOpen(false);
  }

  const rel = target === "_blank" ? "noopener noreferrer" : undefined;

  if (!editing) {
    return (
      <a href={href} target={target} rel={rel} className={className} style={style}>
        {text}
      </a>
    );
  }

  return (
    <span
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-block",
        outline: hovering || open ? "2px solid rgba(216, 146, 116,0.55)" : "2px solid transparent",
        outlineOffset: 2,
        borderRadius: 4,
        transition: "outline-color 0.15s ease",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <a
        href={href}
        target={target}
        rel={rel}
        className={className}
        style={{ ...style, cursor: "pointer" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {text}
      </a>

      {(hovering || open) && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -8,
            insetInlineEnd: -8,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "rgba(20,20,20,0.92)",
            color: "var(--gold-300, #ecb89a)",
            border: "1px solid rgba(216, 146, 116,0.45)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </span>
      )}

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Edit link: ${editKey}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineStart: 0,
            zIndex: 260,
            width: 280,
            padding: 12,
            borderRadius: 12,
            background: "rgba(20,20,20,0.96)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid rgba(216, 146, 116,0.45)",
            boxShadow: "0 20px 48px -16px rgba(0,0,0,0.8)",
            color: "var(--text, #fafafa)",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            textAlign: "start",
            cursor: "default",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold-300, #ecb89a)",
              fontFamily: "var(--font-tracked)",
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            Edit link
          </div>

          <label style={labelStyle}>Link text</label>
          <input
            ref={firstFieldRef}
            type="text"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>URL</label>
          <input
            type="url"
            value={hrefDraft}
            placeholder="https://…"
            onChange={(e) => setHrefDraft(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Open in</label>
          <select
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}
          >
            <option value="_self">Same window</option>
            <option value="_blank">New tab</option>
          </select>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setOpen(false)} style={pill("ghost")}>
              Cancel
            </button>
            <button type="button" onClick={save} style={pill("gold")}>
              Save
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-muted, #a3a3a3)",
  fontFamily: "var(--font-tracked)",
  fontWeight: 500,
  marginBottom: 4,
  marginTop: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--line-soft, rgba(255,255,255,0.1))",
  borderRadius: 8,
  padding: "7px 10px",
  color: "var(--text, #fafafa)",
  fontFamily: "var(--font-body)",
  fontSize: 12,
  outline: "none",
};

function pill(tone: "ghost" | "gold"): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid",
    cursor: "pointer",
    fontFamily: "var(--font-tracked)",
    fontWeight: 500,
  };
  if (tone === "gold") {
    return {
      ...base,
      background: "var(--gold-400, #d89274)",
      color: "#1a1310",
      borderColor: "var(--gold-400, #d89274)",
    };
  }
  return {
    ...base,
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.18)",
  };
}
