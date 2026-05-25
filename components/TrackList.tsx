"use client";

import { forwardRef } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconPause,
  IconPlay,
  IconTrash,
} from "@/components/icons";
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

  onRenameSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (id: string, dir: -1 | 1) => void;

  // DnD
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

export default function TrackList(props: Props) {
  const {
    sections,
    tracksBySection,
    unassigned,
    t,
  } = props;

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
          {...props}
        />
      )}
    </div>
  );
}

function SectionBlock({
  section,
  isFirst,
  isLast,
  tracks,
  t,
  currentId,
  isPlaying,
  validation,
  onPlayTrack,
  onDeleteTrack,
  onRenameTrack,
  onEditTrim,
  onPlaySection,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
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
}: Props & {
  section: SectionLikeProps | null;
  isFirst: boolean;
  isLast: boolean;
  tracks: Track[];
}) {
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
  const PlayIconForSection = hasActiveHere && isPlaying ? IconPause : IconPlay;

  return (
    <section
      ref={(el) => {
        if (section) registerSectionRef(section.id, el);
      }}
      data-section-id={sectionId ?? "__unassigned__"}
      className={isDropTarget ? "section-drop-target" : undefined}
      onDragOver={(e) => onSectionDragOver(e, sectionId)}
      onDrop={(e) => onSectionDrop(e, sectionId)}
    >
      {/* Section header */}
      <header className="flex items-end justify-between gap-4 px-2 mb-3">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-2" style={{ color: "var(--gold-400)" }}>
            <span>{t.sections}</span>
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onPlaySection(sectionId)}
            disabled={tracks.length === 0}
            aria-label={t.play}
            title={t.play}
            style={{
              width: 42,
              height: 42,
              background: tracks.length > 0 ? "var(--gold-400)" : undefined,
              color: tracks.length > 0 ? "#050505" : undefined,
            }}
          >
            <PlayIconForSection size={18} />
          </button>
          {section && (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onMoveSection(section.id, -1)}
                disabled={isFirst}
                title={t.moveSectionUp}
                aria-label={t.moveSectionUp}
              >
                <IconArrowUp size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onMoveSection(section.id, 1)}
                disabled={isLast}
                title={t.moveSectionDown}
                aria-label={t.moveSectionDown}
              >
                <IconArrowDown size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onRenameSection(section.id)}
                title={t.renameSection}
                aria-label={t.renameSection}
              >
                <IconEdit size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ color: "#f3a08a" }}
                onClick={() => onDeleteSection(section.id)}
                title={t.deleteSection}
                aria-label={t.deleteSection}
              >
                <IconTrash size={14} />
              </button>
            </>
          )}
        </div>
      </header>

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
