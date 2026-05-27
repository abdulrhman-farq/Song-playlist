"use client";

import { useEffect, useState } from "react";
import EditableBlock from "@/components/EditableBlock";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";
import {
  IconClock,
  IconClose,
  IconEdit,
  IconExport,
  IconGlobe,
  IconHome,
  IconImport,
  IconLibrary,
  IconMenu,
  IconMusic,
  IconPlus,
  IconShield,
  IconSparkle,
  IconTrash,
} from "@/components/icons";
import { useEditMode } from "@/lib/editMode";
import { useLockMode } from "@/lib/lockMode";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { RealtimeStatus } from "@/lib/realtimeSync";
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
  /** Realtime channel status — drives the "Live · synced" indicator. */
  realtimeStatus?: RealtimeStatus;
  onToggleLang: () => void;
  onImport: () => void;
  onExport: () => void;
  onSamples: () => void;
  onValidate: () => void;
  onClearAll: () => void;
  onAddSection: () => void;
  onScrollToSection: (sectionId: string) => void;
  onOpenTimeline: () => void;
  onOpenClipsWorkbench?: () => void;
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
  realtimeStatus,
  onToggleLang,
  onImport,
  onExport,
  onSamples,
  onValidate,
  onClearAll,
  onAddSection,
  onScrollToSection,
  onOpenTimeline,
  onOpenClipsWorkbench,
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
  const lock = useLockMode();

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
      <EditableBlock editKey="sidebar.brand" label="Sidebar brand">
      <div className="px-5 py-6 flex items-center gap-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(216, 146, 116,0.32)",
            boxShadow: "0 6px 14px -6px rgba(216, 146, 116,0.35)",
            flexShrink: 0,
          }}
        >
          <EditableImage
            editKey="sidebar.brand"
            fallbackSrc="/logo.png"
            fallbackAlt="Ruwaida's Wedding monogram"
            width={38}
            height={38}
            eager
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
            <EditableText editKey="sidebar.brandEyebrow" fallback="Maestro" />
          </div>
          <div
            className="font-display text-[18px] mt-0.5 truncate"
            style={{ color: "var(--text)" }}
          >
            <EditableText
              editKey="sidebar.brandTitle"
              fallback="Ruwaida's Wedding"
            />
          </div>
        </div>
      </div>
      </EditableBlock>

      {/* Realtime presence indicator — live when channel SUBSCRIBED */}
      <LiveIndicator status={realtimeStatus} />

      <div className="divider mx-5" />

      {/* Navigation-style group.
          The Home link is the active landing page; mark it
          aria-current so assistive tech announces it as the current
          page. The playlist/timeline entries are anchor-style jump
          targets within the same page, so they don't carry the
          attribute. */}
      <EditableBlock editKey="sidebar.nav" label="Sidebar nav">
      <nav aria-label="Primary" className="px-3 mt-3 space-y-1">
        <a href="#hero" className="nav-row" aria-current="page">
          <IconHome size={18} />
          <span>
            <EditableText editKey="sidebar.nav.home" fallback="Home" />
          </span>
        </a>
        <a href="#playlist" className="nav-row">
          <IconLibrary size={18} />
          <span>
            <EditableText
              editKey="sidebar.nav.playlist"
              fallback="Your playlist"
            />
          </span>
        </a>
        <button
          type="button"
          className="nav-row"
          onClick={actAndClose(onOpenTimeline)}
          aria-label={t.timeline}
        >
          <IconClock size={18} />
          <span>
            <EditableText editKey="sidebar.nav.timeline" fallback={t.timeline} />
          </span>
          <span
            className="ms-auto label-micro"
            style={{ color: "var(--gold-400)" }}
          >
            R · A
          </span>
        </button>
      </nav>
      </EditableBlock>

      {/* Sections jump-list */}
      <div className="px-5 mt-6 mb-2 flex items-center justify-between">
        <div className="label-micro">{t.sections}</div>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26 }}
          onClick={actAndClose(onAddSection)}
          title={t.addSection}
          aria-label={t.addSection}
        >
          <IconPlus size={13} />
        </button>
      </div>
      <div
        className="px-3 flex-1 min-h-0 overflow-y-auto space-y-0.5"
        style={{ minHeight: "20vh" }}
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
            // Light peach wash so the stats card lifts off the warm
            // sidebar panel — feels like a sub-panel, not a flat hole.
            background: "rgba(216, 146, 116, 0.06)",
            border: "1px solid rgba(216, 146, 116, 0.18)",
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

      {/* Actions — destructive ones hidden in Lock mode */}
      <div className="px-3 py-4 space-y-1">
        {!lock.locked && (
          <>
            <ActionRow icon={<IconSparkle size={16} />} onClick={actAndClose(onSamples)}>
              <EditableText editKey="sidebar.actions.sample" fallback={t.sample} />
            </ActionRow>
            <ActionRow icon={<IconImport size={16} />} onClick={actAndClose(onImport)}>
              <EditableText
                editKey="sidebar.actions.importJson"
                fallback={t.importJson}
              />
            </ActionRow>
          </>
        )}
        <ActionRow
          icon={<IconExport size={16} />}
          onClick={actAndClose(onExport)}
          disabled={tracks.length === 0}
        >
          <EditableText
            editKey="sidebar.actions.exportJson"
            fallback={t.exportJson}
          />
        </ActionRow>
        {hasYouTubeTracks && (
          <ActionRow
            icon={<IconShield size={16} />}
            onClick={actAndClose(onValidate)}
            disabled={validating}
          >
            <EditableText
              editKey="sidebar.actions.validate"
              fallback={validating ? t.validating : t.validate}
            />
          </ActionRow>
        )}
        {!lock.locked && onOpenClipsWorkbench && (
          <ActionRow
            icon={<IconMusic size={16} />}
            onClick={actAndClose(onOpenClipsWorkbench)}
          >
            <EditableText
              editKey="sidebar.actions.mixClips"
              fallback={t.clipsWorkbench}
            />
          </ActionRow>
        )}
        {!lock.locked && tracks.length > 0 && (
          <ActionRow
            icon={<IconTrash size={16} />}
            onClick={actAndClose(onClearAll)}
            tone="danger"
          >
            <EditableText
              editKey="sidebar.actions.clearAll"
              fallback={t.clearAll}
            />
          </ActionRow>
        )}
      </div>

      <div className="mt-auto px-3 pb-4 space-y-1">
        {/* Wedding-day Lock toggle — when ON, hides the composer, the
            destructive actions, the edit-page entry, and (in TrackList)
            the rename/delete/drag/trim affordances. */}
        <button
          type="button"
          onClick={() => lock.setLocked(!lock.locked)}
          className="nav-row"
          aria-pressed={lock.locked}
          style={{
            color: lock.locked ? "#050505" : "var(--gold-300)",
            background: lock.locked ? "var(--gold-400)" : undefined,
            fontWeight: lock.locked ? 600 : undefined,
          }}
          title={
            lock.locked
              ? "Unlock — full editing"
              : "Lock for the ceremony — disables edit/drag/delete"
          }
        >
          <IconShield size={16} />
          <span>
            {lock.locked ? "Locked for ceremony" : "Lock for ceremony"}
          </span>
          <span
            className="ms-auto label-micro"
            style={{
              color: lock.locked ? "#050505" : "var(--gold-400)",
              opacity: lock.locked ? 0.85 : 1,
            }}
          >
            {lock.locked ? "ON" : "OFF"}
          </span>
        </button>
        {edit.admin && !lock.locked && (
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
                <EditableText editKey="sidebar.adminBadge" fallback="ADMIN" />
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
              <span>
                <EditableText
                  editKey="sidebar.signOutLabel"
                  fallback="Sign out admin"
                />
              </span>
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

      {/* Desktop persistent sidebar — warm sepia panel slightly
          LIGHTER than the main app background so it reads as a
          translucent paper card floating over the canvas, instead of
          a black gap. Uses a gradient to subtle peach warmth. */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 bottom-0 z-30"
        style={{
          width: 280,
          insetInlineStart: 0,
          background:
            "linear-gradient(180deg, rgba(58, 44, 34, 0.65) 0%, rgba(42, 32, 26, 0.72) 100%)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderInlineEnd: "1px solid rgba(216, 146, 116, 0.16)",
          boxShadow: "8px 0 32px -16px rgba(0, 0, 0, 0.5)",
        }}
      >
        {content}
      </aside>

      {/* Mobile drawer — same warm-paper feel, slightly more opaque
          since it sits on top of the playlist with a dim scrim. */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: "rgba(26,19,16,0.6)", backdropFilter: "blur(6px)" }}
          onClick={close}
        >
          <div
            className="fixed top-0 bottom-0 fade-up"
            style={{
              insetInlineStart: 0,
              width: "min(320px, 88vw)",
              background:
                "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.96) 100%)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              borderInlineEnd: "1px solid rgba(216, 146, 116, 0.18)",
              boxShadow: "8px 0 32px -16px rgba(0, 0, 0, 0.5)",
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

/**
 * Tiny presence pill under the brand tile: pulsing peach dot +
 * "Live · synced" when the Supabase realtime channel is SUBSCRIBED,
 * a muted dot + "Offline" otherwise. Hidden until we know the
 * status (parent omits the prop = SSR/no-op).
 */
function LiveIndicator({ status }: { status?: RealtimeStatus }) {
  if (!status) return null;
  const isLive = status === "live";
  // Live = mid peach so it reads as positive within the monochrome
  // system. Offline = muted neutral. No leftover emerald greens.
  const dotColor = isLive ? "#ecb89a" : "#7c7c7c";
  const labelColor = isLive ? "var(--text-muted)" : "var(--text-faint)";
  const label =
    status === "live"
      ? "Live · synced"
      : status === "connecting"
        ? "Connecting…"
        : "Offline";
  return (
    <div
      className="px-5 pb-3 flex items-center gap-2"
      title={
        isLive
          ? "Realtime channel connected — edits sync to everyone"
          : "Realtime disconnected — changes are local until reconnect"
      }
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor,
          boxShadow: isLive
            ? "0 0 0 0 rgba(236,184,154,0.55)"
            : "none",
          animation: isLive ? "wp-live-pulse 1.8s ease-in-out infinite" : undefined,
          flexShrink: 0,
        }}
      />
      <span
        className="text-[11px] tnum"
        style={{
          color: labelColor,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <style jsx>{`
        @keyframes wp-live-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(236, 184, 154, 0.55);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(236, 184, 154, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(236, 184, 154, 0);
          }
        }
      `}</style>
    </div>
  );
}
