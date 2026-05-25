"use client";

import { useEffect, useRef, useState } from "react";
import {
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

/* Wedding crest — uses the bride's calligraphic logo */
function Crest() {
  return (
    <div
      style={{
        width: 70,
        height: 84,
        display: "inline-block",
        position: "relative",
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          // Multiply blend so the cream wash background fuses with the
          // paper card behind it — gives the calligraphy a true ink-
          // on-paper feel instead of a pasted-in rectangle.
          mixBlendMode: "multiply",
        }}
      />
    </div>
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

/* Wraps a structural block (crest, ornament, etc.) and shows a
   small × button on hover when in edit mode. Hidden blocks render
   nothing. */
function RemovableBlock({
  hidden,
  editing,
  exporting,
  onRemove,
  label,
  children,
}: {
  hidden: boolean;
  editing: boolean;
  exporting: boolean;
  onRemove: () => void;
  label: string;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <div
      style={{
        position: "relative",
        // Outline shows in edit mode so users can see the boundaries
        outline:
          editing && !exporting
            ? "1px dashed rgba(216,146,116,0.18)"
            : "none",
        outlineOffset: 4,
        borderRadius: 4,
      }}
    >
      {children}
      {editing && !exporting && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={label}
          title={label}
          style={{
            position: "absolute",
            top: -6,
            insetInlineEnd: -6,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--w-paper)",
            border: "1px solid var(--w-line)",
            color: "var(--w-rose)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(58,44,32,0.18)",
            transition:
              "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.background = "var(--w-blush)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.background = "var(--w-paper)";
          }}
        >
          <IconClose size={11} />
        </button>
      )}
    </div>
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

  /** Lock background scroll using the iOS-safe position:fixed pattern.
   *  This freezes the page behind the modal without disabling touch
   *  scrolling inside the modal (the way `touch-action: none` does).
   *  We preserve the current scroll position and restore it on close.
   */
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

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

  /** Update any string field on the doc. */
  function setField<K extends keyof TimelineDoc>(key: K, value: TimelineDoc[K]) {
    setDoc((d) => ({ ...d, [key]: value }));
  }

  /** Whether a structural block (crest, ornament, rings, signature)
   *  is currently hidden. */
  function isHidden(key: NonNullable<TimelineDoc["hiddenBlocks"]>[number]) {
    return (doc.hiddenBlocks ?? []).includes(key);
  }

  function toggleBlock(key: NonNullable<TimelineDoc["hiddenBlocks"]>[number]) {
    setDoc((d) => {
      const set = new Set(d.hiddenBlocks ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...d, hiddenBlocks: [...set] };
    });
  }

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

    // Wait for the full custom font set to be loaded BEFORE we
    // snapshot — otherwise html-to-image falls back to system fonts
    // and the exported card looks plain. With next/font the CSS
    // family names are hashed, so we await `document.fonts.ready`
    // (which resolves once every font triggered by the document's
    // styles has loaded). The card is already rendered when this
    // runs, so every face used by the Timeline is in-flight.
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        // Force a layout read to ensure font-loading has started
        cardRef.current.getBoundingClientRect();
        await document.fonts.ready;
      }
    } catch {
      /* fonts API may not exist */
    }

    try {
      const { toPng } = await import("html-to-image");
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      // 2160px-wide target → genuinely retina-crisp on any phone,
      // sharp when printed. Minimum 3× pixel ratio guarantees clarity
      // even if the visible card is already wide.
      const targetWidth = 2160;
      const pixelRatio = Math.max(3, targetWidth / Math.max(1, rect.width));
      const dataUrl = await toPng(node, {
        pixelRatio,
        backgroundColor: "#FAF5EC",
        cacheBust: true,
        skipFonts: false,
        // Pin width/height to the actual rendered size so the canvas
        // scales purely via pixelRatio (no anti-alias interpolation).
        width: rect.width,
        height: rect.height,
        style: {
          // Make sure nothing's scaled / transformed during capture
          transform: "none",
          transformOrigin: "0 0",
        },
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
        zIndex: 200,
        // The overlay itself is the scroll container — iOS-reliable
        // pattern that doesn't fight with inner overflow on fixed
        // ancestors.
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        animation: "fade-in 0.18s var(--ease-out)",
      }}
      dir="rtl"
    >
      {/* Inner flex wrapper — centers vertically when content fits,
          otherwise lets the overlay scroll. min-height: 100% ensures
          backdrop clicks below the card still register as "close". */}
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "20px 20px 40px",
          boxSizing: "border-box",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !exporting) onClose();
        }}
      >
      <div
        className="wed-identity"
        style={{
          width: "min(460px, 100%)",
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

          {/* Crest — removable */}
          <RemovableBlock
            hidden={isHidden("crest")}
            editing={editing}
            exporting={exporting}
            onRemove={() => toggleBlock("crest")}
            label={t.delete}
          >
            <div
              className="flex flex-col items-center"
              style={{ gap: 6, marginTop: 6 }}
            >
              <Crest />
              {doc.crestEyebrow && (
                <div className="wed-eyebrow" style={{ fontSize: 8.5 }}>
                  <Editable
                    value={doc.crestEyebrow}
                    onChange={(v) => setField("crestEyebrow", v)}
                    enabled={editing}
                  />
                </div>
              )}
            </div>
          </RemovableBlock>

          {/* Date header — Arabic + Latin halves are independently editable */}
          {(doc.dateAr || doc.dateLatin) && (
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
              {doc.dateAr && (
                <Editable
                  value={doc.dateAr}
                  onChange={(v) => setField("dateAr", v)}
                  enabled={editing}
                />
              )}
              {doc.dateAr && doc.dateLatin && (
                <span style={{ margin: "0 4px" }}> </span>
              )}
              {doc.dateLatin && (
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
                  {doc.dateAr && <>·{" "}</>}
                  <Editable
                    value={doc.dateLatin}
                    onChange={(v) => setField("dateLatin", v)}
                    enabled={editing}
                  />
                  {doc.dateAr && <>{" "}·</>}
                </span>
              )}
            </div>
          )}

          {/* Names (Latin) */}
          {(doc.brideName || doc.groomName) && (
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
              {doc.brideName && (
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(28px, 8vw, 42px)",
                    fontFamily: "var(--w-serif-en)",
                    fontStyle: "italic",
                    letterSpacing: "0.01em",
                    color: "var(--w-peach-deep)",
                    lineHeight: 1.05,
                  }}
                >
                  <Editable
                    value={doc.brideName}
                    onChange={(v) => setField("brideName", v)}
                    enabled={editing}
                  />
                </span>
              )}
              {doc.groomName && (
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
                  <Editable
                    value={doc.groomName}
                    onChange={(v) => setField("groomName", v)}
                    enabled={editing}
                  />
                </span>
              )}
            </div>
          )}

          {/* Arabic names */}
          {doc.coupleArabic && (
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
              <Editable
                value={doc.coupleArabic}
                onChange={(v) => setField("coupleArabic", v)}
                enabled={editing}
              />
            </div>
          )}

          {/* Top ornament divider — removable */}
          <RemovableBlock
            hidden={isHidden("topOrnament")}
            editing={editing}
            exporting={exporting}
            onRemove={() => toggleBlock("topOrnament")}
            label={t.delete}
          >
            <div className="flex justify-center" style={{ margin: "18px 0 6px" }}>
              <OrnamentDivider />
            </div>
          </RemovableBlock>

          {/* Appointments label — editable, hides itself when cleared */}
          {doc.appointmentsLabel && (
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
                <Editable
                  value={doc.appointmentsLabel}
                  onChange={(v) => setField("appointmentsLabel", v)}
                  enabled={editing}
                />
              </span>
            </div>
          )}

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

          {/* Middle ornament — removable */}
          <RemovableBlock
            hidden={isHidden("midOrnament")}
            editing={editing}
            exporting={exporting}
            onRemove={() => toggleBlock("midOrnament")}
            label={t.delete}
          >
            <div className="flex justify-center" style={{ margin: "4px 0" }}>
              <OrnamentDivider />
            </div>
          </RemovableBlock>

          {/* Rings — removable */}
          <RemovableBlock
            hidden={isHidden("rings")}
            editing={editing}
            exporting={exporting}
            onRemove={() => toggleBlock("rings")}
            label={t.delete}
          >
            <div
              className="flex justify-center"
              style={{ margin: "10px 0 14px" }}
            >
              <Rings />
            </div>
          </RemovableBlock>

          {/* Footer message — editable, hides itself when cleared */}
          {doc.footerMessage && (
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
                onChange={(v) => setField("footerMessage", v)}
                enabled={editing}
              />
            </div>
          )}

          {/* Signature — removable whole block, also each line editable */}
          <RemovableBlock
            hidden={isHidden("signature")}
            editing={editing}
            exporting={exporting}
            onRemove={() => toggleBlock("signature")}
            label={t.delete}
          >
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
              {doc.signaturePreLabel && (
                <Editable
                  value={doc.signaturePreLabel}
                  onChange={(v) => setField("signaturePreLabel", v)}
                  enabled={editing}
                />
              )}
              {doc.signatureName && (
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
                    onChange={(v) => setField("signatureName", v)}
                    enabled={editing}
                  />
                </div>
              )}
              {doc.signatureFooter && (
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
                  <Editable
                    value={doc.signatureFooter}
                    onChange={(v) => setField("signatureFooter", v)}
                    enabled={editing}
                  />
                </div>
              )}
            </div>
          </RemovableBlock>

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
    </div>
  );
}
