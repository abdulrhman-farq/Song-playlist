"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditMode, useEditableText } from "@/lib/editMode";

interface Props {
  /** Stable identifier — used as the override-map key prefix. */
  editKey: string;
  /** Source URL used when no override exists. */
  fallbackSrc: string;
  /** Alt text used when no override exists. */
  fallbackAlt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Intrinsic width — set explicitly to prevent CLS. */
  width?: number;
  /** Intrinsic height — set explicitly to prevent CLS. */
  height?: number;
  /** When true, eagerly request the image (use for above-the-fold art). */
  eager?: boolean;
}

/**
 * Drop-in editable <img>. Renders the (possibly overridden) src/alt
 * pair; in edit mode it surfaces a small popover (URL, file upload,
 * alt text). Uploaded files are stored as base64 data URLs inside
 * the override value so persistence is just a string, no blob URL
 * lifecycle to manage across reloads.
 */
export default function EditableImage({
  editKey,
  fallbackSrc,
  fallbackAlt,
  className,
  style,
  width,
  height,
  eager,
}: Props) {
  const { editing, setDraftOverride } = useEditMode();
  const src = useEditableText(`${editKey}.src`, fallbackSrc);
  const alt = useEditableText(`${editKey}.alt`, fallbackAlt);

  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [urlDraft, setUrlDraft] = useState(src);
  const [altDraft, setAltDraft] = useState(alt);
  const [error, setError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Re-seed drafts whenever the popover opens so it always reflects
  // the current committed/draft value.
  useEffect(() => {
    if (open) {
      setUrlDraft(src);
      setAltDraft(alt);
      setError(null);
    }
  }, [open, src, alt]);

  // Focus first field on open
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Esc to close, click-outside to close, Tab trap.
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

  const onFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    // ~4MB safety bound — base64 inflates ~33%, keep <5MB localStorage budget.
    if (file.size > 4 * 1024 * 1024) {
      setError("Image too large (max 4MB).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setUrlDraft(result);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  }, []);

  function save() {
    const nextSrc = urlDraft.trim() || fallbackSrc;
    const nextAlt = altDraft;
    if (nextSrc !== src) setDraftOverride(`${editKey}.src`, nextSrc);
    if (nextAlt !== alt) setDraftOverride(`${editKey}.alt`, nextAlt);
    setOpen(false);
  }

  function cancel() {
    setOpen(false);
  }

  // Non-edit-mode render: plain <img> with explicit intrinsic
  // dimensions + async decoding. width/height are advisory hints so the
  // browser can reserve layout space before the bitmap downloads
  // (prevents CLS); they don't override CSS sizing.
  if (!editing) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-block",
        width: style?.width ?? "100%",
        height: style?.height ?? "100%",
        outline: hovering || open ? "2px solid rgba(212,175,55,0.55)" : "2px solid transparent",
        outlineOffset: 2,
        borderRadius: 6,
        transition: "outline-color 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      />

      {(hovering || open) && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            insetInlineEnd: 4,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "rgba(20,20,20,0.92)",
            color: "var(--gold-300, #e2bb42)",
            border: "1px solid rgba(212,175,55,0.45)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            pointerEvents: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }}
        >
          {/* pencil */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </span>
      )}

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Edit image: ${editKey}`}
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
            border: "1px solid rgba(212,175,55,0.45)",
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
              color: "var(--gold-300, #e2bb42)",
              fontFamily: "var(--font-tracked)",
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            Edit image
          </div>

          <label style={labelStyle}>Replace from URL</label>
          <input
            ref={firstFieldRef}
            type="url"
            value={urlDraft.startsWith("data:") ? "" : urlDraft}
            placeholder={urlDraft.startsWith("data:") ? "(uploaded image)" : "https://…"}
            onChange={(e) => setUrlDraft(e.target.value)}
            style={inputStyle}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={pill("ghost")}
            >
              Upload file
            </button>
            <span style={{ color: "var(--text-faint, #737373)", fontSize: 10 }}>
              {urlDraft.startsWith("data:") ? "Image attached" : "PNG / JPG · max 4MB"}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              // Reset so the same file can be picked again later.
              e.target.value = "";
            }}
          />

          <label style={labelStyle}>Alt text</label>
          <input
            type="text"
            value={altDraft}
            onChange={(e) => setAltDraft(e.target.value)}
            style={inputStyle}
          />

          {error && (
            <div style={{ color: "var(--danger, #f3a08a)", fontSize: 11, marginTop: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={cancel} style={pill("ghost")}>
              Cancel
            </button>
            <button type="button" onClick={save} style={pill("gold")}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
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
      background: "var(--gold-400, #d4af37)",
      color: "#050505",
      borderColor: "var(--gold-400, #d4af37)",
    };
  }
  return {
    ...base,
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.18)",
  };
}
