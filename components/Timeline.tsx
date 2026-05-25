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

/* ── Ornaments ──────────────────────────────────────────────── */

function PetalDot() {
  return (
    <svg viewBox="0 0 10 10" width="13" height="13" aria-hidden>
      <path d="M5 9 C 1 6, 1 2, 5 3 C 9 2, 9 6, 5 9 Z" fill="currentColor" />
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
      style={{ color: "var(--w-peach-deep)" }}
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
      width="48"
      height="22"
      viewBox="0 0 44 22"
      fill="none"
      aria-hidden
      style={{ color: "var(--w-peach-deep)" }}
    >
      <circle cx="16" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="26" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M14 4 L 16 6 L 18 4 L 16 1 Z" fill="currentColor" />
    </svg>
  );
}

/* Wedding-monogram crest in champagne gold */
function Crest() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke="var(--w-gold)"
        strokeWidth="0.8"
      />
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="var(--w-gold-deep)"
        strokeWidth="0.5"
      />
      <path
        d="M32 8 Q22 32 32 56 Q42 32 32 8Z"
        fill="none"
        stroke="var(--w-peach-deep)"
        strokeWidth="0.8"
      />
      <path
        d="M8 32 Q32 22 56 32 Q32 42 8 32Z"
        fill="none"
        stroke="var(--w-peach-deep)"
        strokeWidth="0.8"
      />
      <circle cx="32" cy="32" r="3" fill="var(--w-peach-deep)" />
    </svg>
  );
}

/* ── Inline editable text ──────────────────────────────────── */

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
      className={`wed-editable ${className ?? ""}`}
      data-editing={enabled ? "true" : "false"}
      style={{
        ...style,
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

/* ── Main ──────────────────────────────────────────────────── */

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
      if (e.key === "Escape" && !exporting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, exporting]);

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

  async function exportAsImage() {
    if (!cardRef.current) return;
    const wasEditing = editing;
    setEditing(false);
    setExporting(true);
    setExportStatus(t.timelineExporting);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const { toPng } = await import("html-to-image");
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      // 1080px-wide retina-crisp target — perfect for phone share / stories
      const targetWidth = 1080;
      const pixelRatio = Math.max(2, targetWidth / Math.max(1, rect.width));
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: "#FAF5EC",
        cacheBust: true,
        skipFonts: false,
      });
      const filename = `wedding-timeline-29-05-2026.png`;

      // Native share on mobile when possible
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !exporting) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(58, 44, 32, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 200,
        animation: "fade-in 0.18s var(--ease-out)",
      }}
      dir="rtl"
    >
      <div
        className="wed-identity"
        style={{
          width: "min(460px, 100%)",
          maxHeight: exporting ? "none" : "92vh",
          overflow: exporting ? "visible" : "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Toolbar — sits OUTSIDE the captured card */}
        <div
          style={{
            display: exporting ? "none" : "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="wed-btn"
            onClick={() => setEditing((v) => !v)}
            disabled={exporting}
          >
            <IconEdit size={11} />
            <span>{editing ? t.timelineDone : t.timelineEdit}</span>
          </button>
          {editing && (
            <button type="button" className="wed-btn" onClick={addEntry}>
              <IconPlus size={11} />
              <span>{t.timelineAdd}</span>
            </button>
          )}
          <button
            type="button"
            className="wed-btn wed-btn-gold"
            onClick={exportAsImage}
            disabled={exporting}
            title={t.timelineExport}
          >
            {exporting ? (
              <span
                className="spinner"
                style={{
                  width: 12,
                  height: 12,
                  borderColor: "rgba(250,245,236,0.4)",
                  borderTopColor: "var(--w-paper)",
                }}
              />
            ) : (
              <IconExport size={11} />
            )}
            <span>{exportStatus ?? t.timelineExport}</span>
          </button>
          {editing && (
            <button
              type="button"
              className="wed-btn wed-btn-danger"
              onClick={reset}
            >
              <IconTrash size={11} />
              <span>{t.timelineReset}</span>
            </button>
          )}
          <button
            type="button"
            className="wed-btn"
            onClick={onClose}
            disabled={exporting}
            aria-label={t.cancel}
            title={t.cancel}
            style={{ paddingInline: 12 }}
          >
            <IconClose size={11} />
          </button>
        </div>

        {/* THE CAPTURED CARD */}
        <div
          ref={cardRef}
          className="wed-paper"
          style={{
            position: "relative",
            border: "0.8px solid rgba(58,44,32,0.15)",
            borderRadius: 4,
            padding: "52px 32px 46px",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.6) inset, 0 30px 60px -30px rgba(58,44,32,0.45), 0 8px 20px -10px rgba(58,44,32,0.25)",
            overflow: "hidden",
            background:
              "radial-gradient(ellipse 60% 40% at 8% 100%, rgba(233,184,154,0.40), transparent 60%)," +
              " radial-gradient(ellipse 50% 35% at 95% 5%, rgba(233,184,154,0.32), transparent 65%)," +
              " linear-gradient(180deg, var(--w-paper) 0%, var(--w-ivory) 100%)",
            animation: exporting ? "none" : "modal-in 0.32s var(--ease-spring)",
          }}
        >
          {/* Inner hairline frame */}
          <div className="wed-frame" aria-hidden />

          {/* Crest */}
          <div
            className="flex flex-col items-center"
            style={{ gap: 6, marginTop: 6 }}
          >
            <Crest />
            <div className="wed-eyebrow" style={{ fontSize: 8.5 }}>
              R · A · WEDDING
            </div>
          </div>

          {/* Date header — day of week + full date for clarity */}
          <div
            className="text-center"
            style={{
              fontFamily: "var(--w-serif-ar)",
              fontSize: 17,
              color: "var(--w-ink)",
              lineHeight: 1.9,
              fontWeight: 500,
              marginTop: 16,
            }}
          >
            الجمعة
            <span
              style={{
                fontFamily: "var(--w-display-en)",
                fontSize: 16,
                letterSpacing: "0.22em",
                color: "var(--w-rose)",
                margin: "0 10px",
                fontWeight: 500,
              }}
            >
              · FRIDAY ·
            </span>
            ٢٩ مايو
            <span
              style={{
                fontFamily: "var(--w-display-en)",
                fontSize: 16,
                letterSpacing: "0.22em",
                color: "var(--w-rose)",
                margin: "0 8px",
                fontWeight: 500,
              }}
            >
              · 2026
            </span>
          </div>

          {/* Names (Latin) */}
          <div
            dir="ltr"
            className="text-center"
            style={{
              marginTop: 24,
              marginBottom: 6,
              fontFamily: "var(--w-display-en)",
              color: "var(--w-brown)",
              lineHeight: 0.95,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 42,
                fontFamily: "var(--w-serif-en)",
                fontStyle: "italic",
                letterSpacing: "0.01em",
                color: "var(--w-peach-deep)",
              }}
            >
              Ruwaida
            </span>
            <span
              style={{
                display: "block",
                fontSize: 38,
                fontFamily: "var(--w-display-en)",
                letterSpacing: "0.16em",
                color: "var(--w-brown)",
                marginTop: 2,
              }}
            >
              &amp; ABDULRAHMAN
            </span>
          </div>

          {/* Arabic names */}
          <div
            className="text-center"
            style={{
              fontFamily: "var(--w-serif-ar)",
              fontSize: 19,
              color: "var(--w-brown)",
              letterSpacing: "0.04em",
              marginTop: 8,
              fontWeight: 700,
            }}
          >
            رويـدا و عبدالرحمن
          </div>

          {/* Ornament divider */}
          <div className="flex justify-center" style={{ margin: "18px 0 6px" }}>
            <OrnamentDivider />
          </div>

          {/* Appointments label — makes the purpose unambiguous when shared */}
          <div
            className="text-center"
            style={{
              marginTop: 8,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontFamily: "var(--w-label-en)",
                fontSize: 10,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: "var(--w-brown-soft)",
              }}
            >
              المواعيد · APPOINTMENTS
            </span>
          </div>

          {/* Timeline */}
          <div
            style={{ position: "relative", margin: "8px 0 18px", padding: "0 4px" }}
          >
            {/* Dashed center spine (gold) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 6,
                bottom: 6,
                left: "50%",
                width: 1,
                transform: "translateX(-0.5px)",
                background:
                  "repeating-linear-gradient(to bottom, var(--w-gold-deep) 0, var(--w-gold-deep) 4px, transparent 4px, transparent 8px)",
                opacity: 0.75,
              }}
            />

            {doc.entries.map((entry, idx) => {
              const odd = idx % 2 === 0;
              return (
                <div
                  key={entry.id}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1fr 30px 1fr",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 0",
                  }}
                >
                  <div
                    style={{
                      gridColumn: odd ? 1 : 3,
                      textAlign: "center",
                      fontFamily: "var(--w-display-en)",
                      fontSize: 24,
                      letterSpacing: "0.18em",
                      color: "var(--w-rose)",
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
                  <div
                    className="flex items-center justify-center"
                    style={{ color: "var(--w-rose)" }}
                  >
                    <PetalDot />
                  </div>
                  <div
                    style={{
                      gridColumn: odd ? 3 : 1,
                      textAlign: "center",
                      fontFamily: "var(--w-serif-ar)",
                      fontSize: 19,
                      color: "var(--w-ink)",
                      lineHeight: 1.5,
                      fontWeight: 400,
                    }}
                  >
                    <Editable
                      value={entry.role}
                      onChange={(v) => updateEntry(entry.id, { role: v })}
                      enabled={editing}
                      style={{
                        color: "var(--w-brown-soft)",
                        fontWeight: 400,
                        marginInlineEnd: 4,
                        fontSize: 15,
                      }}
                    />
                    {entry.role && entry.name && <br />}
                    <Editable
                      value={entry.name}
                      onChange={(v) => updateEntry(entry.id, { name: v })}
                      enabled={editing}
                      style={{
                        color: "var(--w-ink)",
                        fontWeight: 700,
                        fontSize: 20,
                      }}
                    />
                  </div>

                  {editing && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        insetInlineStart: -8,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: "transparent",
                        border: "none",
                        color: "var(--w-brown-soft)",
                        cursor: "pointer",
                        opacity: 0.45,
                        transition:
                          "opacity var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.background =
                          "rgba(216,146,116,0.14)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.45";
                        e.currentTarget.style.background = "transparent";
                      }}
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <IconClose size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {editing && (
              <div className="text-center" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={addEntry}
                  style={{
                    background: "transparent",
                    border: "0.6px dashed var(--w-peach-deep)",
                    color: "var(--w-brown)",
                    fontFamily: "var(--w-label-en)",
                    fontSize: 9.5,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    padding: "6px 18px",
                    borderRadius: 999,
                    cursor: "pointer",
                    opacity: 0.85,
                    transition:
                      "opacity var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.background =
                      "rgba(233,184,154,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.85";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  + إضافة موعد
                </button>
              </div>
            )}
          </div>

          {/* Second ornament before footer */}
          <div className="flex justify-center" style={{ margin: "4px 0" }}>
            <OrnamentDivider />
          </div>

          {/* Rings */}
          <div className="flex justify-center" style={{ margin: "10px 0 14px" }}>
            <Rings />
          </div>

          {/* Footer message */}
          <div
            className="text-center"
            style={{
              fontFamily: "var(--w-serif-ar)",
              fontSize: 15,
              lineHeight: 1.95,
              color: "var(--w-brown)",
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
              marginTop: 22,
              fontFamily: "var(--w-label-en)",
              fontSize: 9.5,
              color: "var(--w-brown-soft)",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
            }}
          >
            عـــــروســـــكــــم
            <div
              style={{
                fontFamily: "var(--w-serif-ar)",
                fontWeight: 700,
                fontSize: 24,
                color: "var(--w-peach-deep)",
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
                fontFamily: "var(--w-display-en)",
                fontSize: 11,
                color: "var(--w-brown-soft)",
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
                fontFamily: "var(--w-body-ar)",
                fontSize: 12,
                color: "var(--w-brown-soft)",
                opacity: 0.8,
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
