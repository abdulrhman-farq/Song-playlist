"use client";

import { useEffect, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconClock,
  IconClose,
  IconEdit,
  IconExport,
  IconGlobe,
  IconHeart,
  IconHome,
  IconImport,
  IconLibrary,
  IconMenu,
  IconPlus,
  IconShield,
  IconSparkle,
  IconTrash,
  OrnamentMark,
} from "@/components/icons";
import { useEditMode } from "@/lib/editMode";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { Language, PlaylistSection, Track } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  playlistName: string;
  totalSeconds: number;
  tracks: Track[];
  sections: PlaylistSection[];
  hasYouTubeTracks: boolean;
  validating: boolean;
  onToggleLang: () => void;
  onImport: () => void;
  onExport: () => void;
  onSamples: () => void;
  onValidate: () => void;
  onClearAll: () => void;
  onAddSection: () => void;
  onScrollToSection: (sectionId: string) => void;
  onOpenTimeline: () => void;
}

export default function Sidebar({
  lang,
  t,
  playlistName,
  totalSeconds,
  tracks,
  sections,
  hasYouTubeTracks,
  validating,
  onToggleLang,
  onImport,
  onExport,
  onSamples,
  onValidate,
  onClearAll,
  onAddSection,
  onScrollToSection,
  onOpenTimeline,
}: Props) {
  const [open, setOpen] = useState(false);

  // Close mobile drawer when route-like state changes (e.g. user picks an action)
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const edit = useEditMode();

  function close() {
    setOpen(false);
  }
  function actAndClose(fn: () => void) {
    return () => {
      fn();
      close();
    };
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(212,175,55,0.32)",
            boxShadow: "0 6px 14px -6px rgba(212,175,55,0.35)",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ruwaida's Wedding"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 35%",
              display: "block",
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="eyebrow truncate" style={{ letterSpacing: "0.28em" }}>
            Maestro
          </div>
          <div
            className="font-display text-[18px] mt-0.5 truncate"
            style={{ color: "var(--text)" }}
          >
            Ruwaida's Wedding
          </div>
        </div>
      </div>

      <div className="divider mx-5" />

      {/* Navigation-style group */}
      <nav className="px-3 mt-3 space-y-1">
        <a href="#hero" className="nav-row">
          <IconHome size={18} />
          <span>Home</span>
        </a>
        <a href="#playlist" className="nav-row">
          <IconLibrary size={18} />
          <span>Your playlist</span>
        </a>
        <button
          type="button"
          className="nav-row"
          onClick={actAndClose(onOpenTimeline)}
        >
          <IconClock size={18} />
          <span>{t.timeline}</span>
          <span
            className="ms-auto label-micro"
            style={{ color: "var(--gold-400)" }}
          >
            R · A
          </span>
        </button>
      </nav>

      {/* Sections jump-list */}
      <div className="px-5 mt-6 mb-2 flex items-center justify-between">
        <div className="label-micro">{t.sections}</div>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          onClick={actAndClose(onAddSection)}
          title={t.addSection}
        >
          <IconPlus size={13} />
        </button>
      </div>
      <div
        className="px-3 flex-1 min-h-0 overflow-y-auto space-y-0.5"
        style={{ maxHeight: "32vh" }}
      >
        {sections.length === 0 && (
          <div
            className="px-3 text-[12px] italic"
            style={{ color: "var(--text-faint)" }}
          >
            —
          </div>
        )}
        {sections.map((s) => {
          const count = tracks.filter((tr) => tr.sectionId === s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={actAndClose(() => onScrollToSection(s.id))}
              className="nav-row group"
            >
              <span className="truncate flex-1">{s.label}</span>
              <span
                className="text-[10px] tnum"
                style={{ color: "var(--text-faint)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Playlist stats card */}
      <div className="px-5 mt-4">
        <div
          className="rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--line-subtle)",
          }}
        >
          <div className="label-micro mb-1">{playlistName}</div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {tracks.length} {tracks.length === 1 ? t.track : t.tracks}
            </div>
            <div
              className="text-[12px] tnum"
              style={{ color: "var(--text)" }}
            >
              {fmtTime(totalSeconds)}
            </div>
          </div>
        </div>
      </div>

      <div className="divider mx-5 mt-5" />

      {/* Actions */}
      <div className="px-3 py-4 space-y-1">
        <ActionRow icon={<IconSparkle size={16} />} onClick={actAndClose(onSamples)}>
          {t.sample}
        </ActionRow>
        <ActionRow icon={<IconImport size={16} />} onClick={actAndClose(onImport)}>
          {t.importJson}
        </ActionRow>
        <ActionRow
          icon={<IconExport size={16} />}
          onClick={actAndClose(onExport)}
          disabled={tracks.length === 0}
        >
          {t.exportJson}
        </ActionRow>
        {hasYouTubeTracks && (
          <ActionRow
            icon={<IconShield size={16} />}
            onClick={actAndClose(onValidate)}
            disabled={validating}
          >
            {validating ? t.validating : t.validate}
          </ActionRow>
        )}
        {tracks.length > 0 && (
          <ActionRow
            icon={<IconTrash size={16} />}
            onClick={actAndClose(onClearAll)}
            tone="danger"
          >
            {t.clearAll}
          </ActionRow>
        )}
      </div>

      <div className="mt-auto px-3 pb-4 space-y-1">
        {edit.admin && (
          <>
            <button
              type="button"
              onClick={actAndClose(() => edit.enterEdit())}
              className="nav-row"
              data-tone="default"
              style={{ color: "var(--gold-300)" }}
            >
              <IconEdit size={16} />
              <span>Edit page</span>
              <span
                className="ms-auto label-micro"
                style={{ color: "var(--gold-400)" }}
              >
                ADMIN
              </span>
            </button>
            <button
              type="button"
              onClick={actAndClose(() => edit.signOut())}
              className="nav-row"
              style={{ fontSize: 11, opacity: 0.7 }}
              title="Sign out of admin"
            >
              <IconClose size={14} />
              <span>Sign out admin</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={actAndClose(onToggleLang)}
          className="nav-row"
        >
          <IconGlobe size={16} />
          <span>{lang === "ar" ? "English" : "العربية"}</span>
          <span className="ms-auto label-micro" style={{ color: "var(--gold-400)" }}>
            {lang === "ar" ? "AR" : "EN"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile open button — floats over hero */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn lg:hidden fixed top-4 z-40 surface-glass"
        aria-label="Open menu"
        style={{ insetInlineStart: 16 }}
      >
        <IconMenu size={20} />
      </button>

      {/* Desktop persistent sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 bottom-0 z-30"
        style={{
          width: 280,
          insetInlineStart: 0,
          background: "rgba(10, 10, 10, 0.6)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderInlineEnd: "1px solid var(--line-subtle)",
        }}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={close}
        >
          <div
            className="fixed top-0 bottom-0 fade-up"
            style={{
              insetInlineStart: 0,
              width: "min(320px, 88vw)",
              background: "rgba(10, 10, 10, 0.96)",
              backdropFilter: "blur(28px) saturate(160%)",
              WebkitBackdropFilter: "blur(28px) saturate(160%)",
              borderInlineEnd: "1px solid var(--line-soft)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="icon-btn absolute top-3"
              style={{ insetInlineEnd: 8 }}
              aria-label="Close"
            >
              <IconClose size={16} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function ActionRow({
  icon,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="nav-row"
      data-tone={tone}
    >
      <span style={{ opacity: 0.85 }}>{icon}</span>
      <span>{children}</span>
    </button>
  );
}
