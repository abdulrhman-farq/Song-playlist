"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconExport,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import {
  defaultTimeline,
  loadTimeline,
  newEntry,
  saveTimeline,
} from "@/lib/timelineStorage";
import type { Strings } from "@/lib/i18n";
import type { Language, TimelineDoc, TimelineEntry } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  onClose: () => void;
}

/* Petal-dot used down the spine of the timeline. */
function PetalDot() {
  return (
    <svg viewBox="0 0 10 10" width="14" height="14" aria-hidden>
      <path
        d="M5 9 C 1 6, 1 2, 5 3 C 9 2, 9 6, 5 9 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function OrnamentDivider() {
  return (
    <svg
      viewBox="0 0 140 12"
      width="140"
      height="12"
      aria-hidden
      style={{ color: "var(--gold-300)" }}
    >
      <line
        x1="2"
        y1="6"
        x2="56"
        y2="6"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.55"
      />
      <path
        d="M 70 1 Q 64 6 70 11 Q 76 6 70 1 Z M 62 6 L 78 6"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.95"
      />
      <line
        x1="84"
        y1="6"
        x2="138"
        y2="6"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.55"
      />
    </svg>
  );
}

function Rings() {
  return (
    <svg
      width="56"
      height="26"
      viewBox="0 0 44 22"
      fill="none"
      aria-hidden
      style={{ color: "var(--gold-300)" }}
    >
      <circle cx="16" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="26" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M14 4 L 16 6 L 18 4 L 16 1 Z" fill="currentColor" />
    </svg>
  );
}

/* Tiny inline-editable string. Renders as a span; on click upgrades
   to a contentEditable that commits on blur or Enter. */
function Editable({
  value,
  onChange,
  enabled,
  className,
  style,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onChange(draft);
  };
  return (
    <span
      className={className}
      style={{
        ...style,
        outline: "none",
        borderBottom: enabled
          ? "1px dashed rgba(212,175,55,0.35)"
          : "1px dashed transparent",
        transition: "border-color var(--dur-fast) var(--ease-out)",
        cursor: enabled ? "text" : "default",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        display: multiline ? "block" : "inline-block",
      }}
      contentEditable={enabled}
      suppressContentEditableWarning
      onInput={(e) => setDraft((e.currentTarget.textContent ?? "").trim())}
      onBlur={commit}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      data-placeholder={placeholder}
    >
      {value}
    </span>
  );
}

export default function Timeline({ lang, t, onClose }: Props) {
  const [doc, setDoc] = useState<TimelineDoc>(() => defaultTimeline());
  const [editing, setEditing] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadTimeline();
    if (saved) setDoc(saved);
  }, []);

  useEffect(() => {
    saveTimeline(doc);
  }, [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateEntry(id: string, patch: Partial<TimelineEntry>) {
    setDoc((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }
  function addEntry() {
    setDoc((d) => ({ ...d, entries: [...d.entries, newEntry()] }));
  }
  function removeEntry(id: string) {
    setDoc((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }
  function reset() {
    if (!confirm(t.timelineResetConfirm)) return;
    setDoc(defaultTimeline());
  }

  /**
   * Capture the timeline card as a PNG sized for mobile share /
   * status. On phones with Web Share API and file-share capability
   * push straight to the share sheet; otherwise download.
   */
  async function exportAsImage() {
    if (!cardRef.current) return;
    const wasEditing = editing;
    setEditing(false);
    setExporting(true);
    setExportStatus(t.timelineExporting);
    // Give React + browser two frames to settle so the toolbar and
    // dashed edit underlines aren't part of the capture.
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const { toPng } = await import("html-to-image");
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      // Target 1080px-wide output (2× a 540px card → retina-crisp on phones,
      // perfect for WhatsApp / Stories / Reels).
      const targetWidth = 1080;
      const pixelRatio = Math.max(2, targetWidth / Math.max(1, rect.width));
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: "#0a0a0a",
        cacheBust: true,
        skipFonts: false,
      });
      const filename = `wedding-timeline-29-05-2026.png`;

      // Try Web Share API first (native share sheet on phones)
      let shared = false;
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "image/png" });
        const nav = navigator as Navigator & {
          canShare?: (data: ShareData) => boolean;
        };
        if (
          typeof nav.canShare === "function" &&
          nav.canShare({ files: [file] })
        ) {
          await nav.share({
            files: [file],
            title: "Wedding Day Timeline",
            text: "رويـدا و عبدالرحمن · 29 · 05 · 2026",
          });
          shared = true;
        }
      } catch {
        /* fall through to download */
      }

      if (!shared) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setExportStatus(t.timelineExportSaved);
      window.setTimeout(() => setExportStatus(null), 2000);
    } catch (err) {
      console.error("Timeline export failed:", err);
      setExportStatus(t.timelineExportFailed);
      window.setTimeout(() => setExportStatus(null), 2400);
    } finally {
      setExporting(false);
      if (wasEditing) setEditing(true);
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{ padding: "20px" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div
        ref={cardRef}
        className="contain-paint relative gpu"
        style={{
          width: "min(560px, 100%)",
          maxHeight: exporting ? "none" : "92vh",
          overflow: exporting ? "visible" : "auto",
          borderRadius: 22,
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(212,175,55,0.18), transparent 55%)," +
            " radial-gradient(ellipse at 100% 100%, rgba(34,197,94,0.08), transparent 60%)," +
            " linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-panel) 100%)",
          border: "1px solid var(--line-soft)",
          boxShadow: exporting ? "none" : "var(--shadow-xl)",
          animation: exporting ? "none" : "modal-in 0.4s var(--ease-spring)",
        }}
      >
        {/* Inner hairline frame */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 14,
            border: "1px solid rgba(212,175,55,0.22)",
            borderRadius: 14,
            pointerEvents: "none",
          }}
        />

        {/* Toolbar — excluded from the export capture via display:none */}
        <div
          className="sticky top-0 z-20"
          style={{
            display: exporting ? "none" : "flex",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(18,18,18,0.7) 100%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--line-subtle)",
            padding: "12px 20px",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn-base btn-ghost"
              onClick={() => setEditing((v) => !v)}
              style={{ padding: "7px 14px", fontSize: 11 }}
              disabled={exporting}
            >
              <IconEdit size={12} />
              <span>{editing ? t.timelineDone : t.timelineEdit}</span>
            </button>
            {editing && (
              <button
                type="button"
                className="btn-base btn-ghost"
                onClick={addEntry}
                style={{ padding: "7px 14px", fontSize: 11 }}
              >
                <IconPlus size={12} />
                <span>{t.timelineAdd}</span>
              </button>
            )}
            <button
              type="button"
              className="btn-base btn-gold"
              onClick={exportAsImage}
              disabled={exporting}
              style={{ padding: "7px 14px", fontSize: 11 }}
              title={t.timelineExport}
            >
              {exporting ? (
                <span className="spinner" />
              ) : (
                <IconExport size={12} />
              )}
              <span>
                {exportStatus ?? t.timelineExport}
              </span>
            </button>
            {editing && (
              <button
                type="button"
                className="btn-base btn-ghost"
                onClick={reset}
                style={{
                  padding: "7px 14px",
                  fontSize: 11,
                  color: "var(--danger)",
                  borderColor: "rgba(243,160,138,0.3)",
                }}
              >
                <IconTrash size={12} />
                <span>{t.timelineReset}</span>
              </button>
            )}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title={t.cancel}
            aria-label={t.cancel}
            disabled={exporting}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Card body */}
        <div
          className="relative"
          style={{
            padding: "44px 28px 36px",
          }}
        >
          {/* Crest */}
          <div
            className="flex flex-col items-center gap-1.5"
            style={{ marginBottom: 16 }}
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
              style={{ opacity: 0.9 }}
            >
              <circle
                cx="32"
                cy="32"
                r="30"
                stroke="var(--gold-400)"
                strokeWidth="0.8"
              />
              <circle
                cx="32"
                cy="32"
                r="24"
                stroke="var(--gold-500)"
                strokeWidth="0.5"
              />
              <path
                d="M32 8 Q22 32 32 56 Q42 32 32 8Z"
                fill="none"
                stroke="var(--gold-300)"
                strokeWidth="0.8"
              />
              <path
                d="M8 32 Q32 22 56 32 Q32 42 8 32Z"
                fill="none"
                stroke="var(--gold-300)"
                strokeWidth="0.8"
              />
              <circle cx="32" cy="32" r="3" fill="var(--gold-300)" />
            </svg>
            <div
              className="eyebrow"
              style={{ fontSize: 9, letterSpacing: "0.42em" }}
            >
              R · A · WEDDING
            </div>
          </div>

          {/* Header date */}
          <div
            className="text-center"
            style={{
              fontFamily: "'Tajawal', 'Markazi Text', serif",
              fontSize: 17,
              color: "var(--text)",
              lineHeight: 1.9,
              fontWeight: 500,
            }}
          >
            {t.timelineSubtitle}
          </div>

          {/* Names */}
          <div
            dir="ltr"
            className="text-center"
            style={{ margin: "22px 0 4px", lineHeight: 0.95 }}
          >
            <div
              className="font-display italic"
              style={{
                fontSize: 44,
                color: "var(--gold-300)",
                letterSpacing: "0.01em",
              }}
            >
              Ruwaida
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 38,
                color: "var(--text)",
                letterSpacing: "0.18em",
                marginTop: 4,
              }}
            >
              &amp; ABDULRAHMAN
            </div>
          </div>
          <div
            className="text-center"
            style={{
              fontFamily: "'Tajawal', 'Markazi Text', serif",
              fontSize: 19,
              color: "var(--text-dim)",
              letterSpacing: "0.04em",
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            رويـدا و عبدالرحمن
          </div>

          {/* Ornament */}
          <div className="flex justify-center" style={{ margin: "18px 0 10px" }}>
            <OrnamentDivider />
          </div>

          {/* Timeline */}
          <div className="relative" style={{ padding: "8px 4px" }}>
            {/* Dashed gold center spine */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 8,
                bottom: 8,
                left: "50%",
                width: 1,
                transform: "translateX(-0.5px)",
                background:
                  "repeating-linear-gradient(to bottom, var(--gold-400) 0, var(--gold-400) 4px, transparent 4px, transparent 8px)",
                opacity: 0.7,
              }}
            />

            {doc.entries.map((entry, idx) => {
              const odd = idx % 2 === 0; // first row is "odd" in 1-indexed CSS
              return (
                <div
                  key={entry.id}
                  className="relative grid items-center"
                  style={{
                    gridTemplateColumns: "1fr 30px 1fr",
                    gap: 10,
                    padding: "14px 0",
                  }}
                >
                  {/* Time */}
                  <div
                    style={{
                      gridColumn: odd ? 1 : 3,
                      textAlign: "center",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 24,
                      letterSpacing: "0.14em",
                      color: "var(--gold-300)",
                      direction: "ltr",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}
                  >
                    <Editable
                      value={entry.time}
                      onChange={(v) => updateEntry(entry.id, { time: v })}
                      enabled={editing}
                    />
                  </div>
                  {/* Dot */}
                  <div
                    className="flex items-center justify-center gpu"
                    style={{ color: "var(--gold-300)" }}
                  >
                    <PetalDot />
                  </div>
                  {/* Entry */}
                  <div
                    style={{
                      gridColumn: odd ? 3 : 1,
                      textAlign: "center",
                      fontFamily: "'Tajawal', 'Markazi Text', serif",
                      fontSize: 17,
                      color: "var(--text)",
                      lineHeight: 1.55,
                    }}
                  >
                    <Editable
                      value={entry.role}
                      onChange={(v) => updateEntry(entry.id, { role: v })}
                      enabled={editing}
                      style={{
                        color: "var(--text-dim)",
                        fontWeight: 400,
                        marginInlineEnd: 4,
                      }}
                    />
                    <Editable
                      value={entry.name}
                      onChange={(v) => updateEntry(entry.id, { name: v })}
                      enabled={editing}
                      style={{
                        color: "var(--gold-200)",
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  {editing && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeEntry(entry.id)}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        insetInlineStart: -8,
                        width: 28,
                        height: 28,
                        color: "var(--danger)",
                      }}
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <IconClose size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {editing && (
              <div className="text-center" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={addEntry}
                  className="btn-base btn-ghost"
                  style={{
                    padding: "6px 18px",
                    fontSize: 10,
                    borderStyle: "dashed",
                    borderColor: "rgba(212,175,55,0.45)",
                    color: "var(--gold-300)",
                  }}
                >
                  {t.timelineAdd}
                </button>
              </div>
            )}
          </div>

          {/* Second ornament */}
          <div className="flex justify-center" style={{ margin: "10px 0" }}>
            <OrnamentDivider />
          </div>

          {/* Rings */}
          <div className="flex justify-center" style={{ margin: "10px 0 16px" }}>
            <Rings />
          </div>

          {/* Footer message */}
          <div
            className="text-center"
            style={{
              fontFamily: "'Tajawal', 'Markazi Text', serif",
              fontSize: 16,
              lineHeight: 1.95,
              color: "var(--text-dim)",
              padding: "0 22px",
            }}
          >
            <Editable
              multiline
              value={doc.footerMessage}
              onChange={(v) => setDoc((d) => ({ ...d, footerMessage: v }))}
              enabled={editing}
            />
          </div>

          {/* Signature */}
          <div
            className="text-center"
            style={{
              marginTop: 24,
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}
          >
            {t.timelineSignedBy}
            <div
              style={{
                fontFamily: "'Tajawal', 'Markazi Text', serif",
                fontWeight: 700,
                fontSize: 24,
                color: "var(--gold-300)",
                letterSpacing: "0.04em",
                display: "block",
                marginTop: 6,
                textTransform: "none",
              }}
            >
              <Editable
                value={doc.signatureName}
                onChange={(v) => setDoc((d) => ({ ...d, signatureName: v }))}
                enabled={editing}
              />
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 12,
                color: "var(--text-muted)",
                letterSpacing: "0.22em",
                marginTop: 8,
                textTransform: "none",
              }}
            >
              R · A · 29 . 05 . 2026
            </div>
          </div>

          {/* Edit hint */}
          {editing && (
            <div
              className="text-center"
              style={{
                marginTop: 18,
                fontFamily: "'Tajawal', 'Markazi Text', serif",
                fontSize: 12,
                color: "var(--text-faint)",
              }}
            >
              {t.timelineHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
