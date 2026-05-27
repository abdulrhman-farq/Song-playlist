"use client";

import { useRef, useState } from "react";
import SectionToolbar from "@/components/SectionToolbar";
import TrackRow, { type DropPos } from "@/components/TrackRow";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { EmbedCheckResult } from "@/lib/ytApi";
import type { PlaylistSection, Track } from "@/types";

interface SectionLikeProps {
  id: string;
  label: string;
}

interface Props {
  lang: "en" | "ar";
  t: Strings;
  sections: PlaylistSection[];
  tracksBySection: Record<string, Track[]>;
  unassigned: Track[];
  currentId: string | null;
  isPlaying: boolean;
  validation: Record<string, EmbedCheckResult>;

  onPlayTrack: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onRenameTrack: (id: string, title: string) => void;
  onEditTrim: (id: string) => void;
  onPlaySection: (sectionId: string | null) => void;
  /** Move a track into a named section (null = unassign). */
  onAssignSection: (trackId: string, sectionId: string | null) => void;

  onRenameSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (id: string, dir: -1 | 1) => void;
  onDuplicateSection: (id: string) => void;
  onReorderSections: (fromId: string, toId: string, pos: "above" | "below") => void;

  // Track-level DnD
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onSectionDragOver: (e: React.DragEvent, sectionId: string | null) => void;
  onSectionDrop: (e: React.DragEvent, sectionId: string | null) => void;
  dragOverId: string | null;
  dropPos: DropPos;
  dragOverSection: string | null | "none";

  registerSectionRef: (id: string, el: HTMLElement | null) => void;
}

/** Internal mime type used to distinguish section-drag from track-drag. */
const SECTION_DRAG_MIME = "application/x-playlist-section";

export default function TrackList(props: Props) {
  const {
    sections,
    tracksBySection,
    unassigned,
    onReorderSections,
  } = props;

  /** ID of the section currently being dragged (via header grip). */
  const sectionDragIdRef = useRef<string | null>(null);
  /** ID of the section header being hovered + position relative to it. */
  const [sectionDragOverId, setSectionDragOverId] = useState<string | null>(
    null,
  );
  const [sectionDropPos, setSectionDropPos] = useState<"above" | "below" | null>(
    null,
  );

  function onSectionDragStart(e: React.DragEvent, id: string) {
    sectionDragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    try {
      // Mark this drag as a section move so header listeners only react
      // to peer sections (not track drags).
      e.dataTransfer.setData(SECTION_DRAG_MIME, id);
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* ignore */
    }
  }
  function onSectionDragEnd() {
    sectionDragIdRef.current = null;
    setSectionDragOverId(null);
    setSectionDropPos(null);
  }
  function onSectionHeaderDragOver(e: React.DragEvent, targetId: string) {
    // Only respond if a section is being dragged (not a track).
    if (!sectionDragIdRef.current) return;
    if (sectionDragIdRef.current === targetId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const above = e.clientY - rect.top < rect.height / 2;
    setSectionDragOverId(targetId);
    setSectionDropPos(above ? "above" : "below");
  }
  function onSectionHeaderDragLeave(_e: React.DragEvent, targetId: string) {
    if (sectionDragOverId === targetId) {
      setSectionDragOverId(null);
      setSectionDropPos(null);
    }
  }
  function onSectionHeaderDrop(e: React.DragEvent, targetId: string) {
    const fromId = sectionDragIdRef.current;
    if (!fromId) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = sectionDropPos ?? "above";
    if (fromId !== targetId) {
      onReorderSections(fromId, targetId, pos);
    }
    sectionDragIdRef.current = null;
    setSectionDragOverId(null);
    setSectionDropPos(null);
  }

  return (
    <div id="playlist" className="flex flex-col gap-8 fade-up">
      {sections.map((sec, idx) => {
        const list = tracksBySection[sec.id] ?? [];
        return (
          <SectionBlock
            key={sec.id}
            section={sec}
            isFirst={idx === 0}
            isLast={idx === sections.length - 1}
            tracks={list}
            sectionDropIndicator={
              sectionDragOverId === sec.id ? sectionDropPos : null
            }
            onSectionDragStart={(e) => onSectionDragStart(e, sec.id)}
            onSectionDragEnd={onSectionDragEnd}
            onSectionHeaderDragOver={(e) => onSectionHeaderDragOver(e, sec.id)}
            onSectionHeaderDragLeave={(e) =>
              onSectionHeaderDragLeave(e, sec.id)
            }
            onSectionHeaderDrop={(e) => onSectionHeaderDrop(e, sec.id)}
            {...props}
          />
        );
      })}

      {unassigned.length > 0 && (
        <SectionBlock
          section={null}
          isFirst={false}
          isLast
          tracks={unassigned}
          sectionDropIndicator={null}
          {...props}
        />
      )}
    </div>
  );
}

type SectionBlockProps = Props & {
  section: SectionLikeProps | null;
  isFirst: boolean;
  isLast: boolean;
  tracks: Track[];
  sectionDropIndicator: "above" | "below" | null;
  onSectionDragStart?: (e: React.DragEvent) => void;
  onSectionDragEnd?: (e: React.DragEvent) => void;
  onSectionHeaderDragOver?: (e: React.DragEvent) => void;
  onSectionHeaderDragLeave?: (e: React.DragEvent) => void;
  onSectionHeaderDrop?: (e: React.DragEvent) => void;
};

function SectionBlock({
  section,
  isFirst,
  isLast,
  tracks,
  sections,
  sectionDropIndicator,
  t,
  currentId,
  isPlaying,
  validation,
  onPlayTrack,
  onDeleteTrack,
  onRenameTrack,
  onEditTrim,
  onPlaySection,
  onAssignSection,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
  onDuplicateSection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onSectionDragOver,
  onSectionDrop,
  dragOverId,
  dropPos,
  dragOverSection,
  registerSectionRef,
  onSectionDragStart,
  onSectionDragEnd,
  onSectionHeaderDragOver,
  onSectionHeaderDragLeave,
  onSectionHeaderDrop,
}: SectionBlockProps) {
  const sectionId = section?.id ?? null;
  const isDropTarget =
    section ? dragOverSection === section.id : dragOverSection === null;

  const total = tracks.reduce(
    (s, x) =>
      s +
      (typeof x.duration === "number" && Number.isFinite(x.duration)
        ? x.duration
        : 0),
    0,
  );

  const hasActiveHere = tracks.some((tr) => tr.id === currentId);

  return (
    <section
      ref={(el) => {
        // Real sections register under their own id; the implicit
        // Unassigned block registers under a stable sentinel so the
        // sidebar jump list can scroll to it too.
        registerSectionRef(section?.id ?? "__unassigned__", el);
      }}
      data-section-id={sectionId ?? "__unassigned__"}
      className={isDropTarget ? "section-drop-target" : undefined}
      onDragOver={(e) => onSectionDragOver(e, sectionId)}
      onDrop={(e) => onSectionDrop(e, sectionId)}
      style={{ position: "relative" }}
    >
      {/* Section-level drop indicator (drawn relative to header) */}
      {sectionDropIndicator && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            background: "var(--gold-400)",
            borderRadius: 999,
            boxShadow: "0 0 12px rgba(216, 146, 116, 0.6)",
            top: sectionDropIndicator === "above" ? -10 : undefined,
            bottom: sectionDropIndicator === "below" ? -10 : undefined,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}

      {/* Section header — title + meta on one row, toolbar on its own row below. */}
      <header
        className="px-2 mb-3 relative"
        onDragOver={
          section ? (e) => onSectionHeaderDragOver?.(e) : undefined
        }
        onDragLeave={
          section ? (e) => onSectionHeaderDragLeave?.(e) : undefined
        }
        onDrop={section ? (e) => onSectionHeaderDrop?.(e) : undefined}
        style={
          hasActiveHere
            ? {
                background:
                  "linear-gradient(90deg, rgba(216, 146, 116,0.10) 0%, rgba(216, 146, 116,0.04) 50%, transparent 100%)",
                borderRadius: 10,
                paddingInline: 12,
                paddingBlock: 8,
                boxShadow: "inset 3px 0 0 var(--gold-400)",
              }
            : undefined
        }
      >
        {hasActiveHere && (
          <div
            aria-hidden
            className="absolute pointer-events-none gpu"
            style={{
              insetInlineStart: -16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--gold-400)",
              boxShadow:
                "0 0 12px rgba(216, 146, 116,0.75), 0 0 24px rgba(216,146,116,0.55)",
              animation: "glow-pulse 2.2s ease-in-out infinite",
            }}
          />
        )}
        <div className="min-w-0">
          <div
            className="eyebrow flex items-center gap-2"
            style={{
              color: hasActiveHere ? "var(--gold-300)" : "var(--gold-400)",
            }}
          >
            <span>{t.sections}</span>
            {hasActiveHere && (
              <span
                style={{
                  color: "var(--gold-300)",
                  letterSpacing: "0.18em",
                  fontWeight: 600,
                }}
              >
                · {t.nowPlaying}
              </span>
            )}
          </div>
          <h2
            className="font-display italic mt-1 truncate"
            style={{
              fontSize: "clamp(22px, 2.4vw, 30px)",
              color: "var(--text)",
              letterSpacing: "0.01em",
            }}
            title={section?.label ?? t.sectionUnassigned}
          >
            {section?.label ?? t.sectionUnassigned}
          </h2>
          <div
            className="text-[12px] mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {tracks.length} {tracks.length === 1 ? t.track : t.tracks} ·{" "}
            <span className="tnum">{fmtTime(total)}</span>
          </div>
        </div>

        <div className="mt-2">
          <SectionToolbar
            t={t}
            sectionId={sectionId}
            trackCount={tracks.length}
            hasActive={hasActiveHere}
            isPlaying={isPlaying}
            isFirst={isFirst}
            isLast={isLast}
            onPlay={() => onPlaySection(sectionId)}
            onMoveUp={
              section ? () => onMoveSection(section.id, -1) : undefined
            }
            onMoveDown={
              section ? () => onMoveSection(section.id, 1) : undefined
            }
            onRename={section ? () => onRenameSection(section.id) : undefined}
            onDuplicate={
              section ? () => onDuplicateSection(section.id) : undefined
            }
            onDelete={section ? () => onDeleteSection(section.id) : undefined}
            onSectionDragStart={section ? onSectionDragStart : undefined}
            onSectionDragEnd={section ? onSectionDragEnd : undefined}
          />
        </div>
      </header>

      {/* Unassigned block: bulk "Move all to section" picker so the
          user doesn't have to assign tracks one by one. Only rendered
          when there's at least one real section to pick. */}
      {!section && sections.length > 0 && tracks.length > 0 && (
        <div
          className="mx-2 mb-3 px-3 py-2 rounded-lg flex items-center gap-2 flex-wrap"
          style={{
            background: "rgba(216, 146, 116, 0.06)",
            border: "1px solid rgba(216, 146, 116, 0.2)",
          }}
        >
          <span
            className="text-[12px]"
            style={{ color: "var(--text-muted)" }}
          >
            {t.assignAllToSection}
          </span>
          <select
            className="bg-transparent text-[12px] tnum"
            style={{
              color: "var(--gold-300)",
              border: "1px solid rgba(216, 146, 116, 0.25)",
              borderRadius: 6,
              padding: "3px 6px",
            }}
            defaultValue=""
            onChange={(e) => {
              const targetId = e.target.value;
              if (!targetId) return;
              for (const tr of tracks) {
                onAssignSection(tr.id, targetId);
              }
              // Reset so the picker can be reused
              e.target.value = "";
            }}
            aria-label={t.assignAllToSection}
          >
            <option value="" disabled>
              {t.pickSection}
            </option>
            {sections.map((s) => (
              <option key={s.id} value={s.id} style={{ color: "#1a1310" }}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Body */}
      {tracks.length === 0 ? (
        <div
          className="rounded-lg px-5 py-8 text-center"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed var(--line-subtle)",
            color: "var(--text-faint)",
            fontStyle: "italic",
            fontSize: 14,
          }}
        >
          —
        </div>
      ) : (
        <div className="flex flex-col">
          {tracks.map((tr, i) => (
            <TrackRow
              key={tr.id}
              track={tr}
              idx={i}
              isCurrent={tr.id === currentId}
              isPlaying={tr.id === currentId && isPlaying}
              t={t}
              validation={
                tr.source === "youtube"
                  ? validation[tr.youtubeId] ?? null
                  : null
              }
              onPlay={onPlayTrack}
              onDelete={onDeleteTrack}
              onRename={onRenameTrack}
              onEditTrim={onEditTrim}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dropPos={dragOverId === tr.id ? dropPos : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
