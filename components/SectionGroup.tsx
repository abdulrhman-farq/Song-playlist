"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconFolder,
  IconTrash,
} from "@/components/icons";
import { fmtTime } from "@/lib/format";
import type { Strings } from "@/lib/i18n";
import type { PlaylistSection, Track } from "@/types";

interface Props {
  section: PlaylistSection | null; // null = "Unassigned"
  isFirst: boolean;
  isLast: boolean;
  tracks: Track[];
  t: Strings;
  onMoveSection: (id: string, direction: -1 | 1) => void;
  onRenameSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onSectionDragOver: (e: React.DragEvent, sectionId: string | null) => void;
  onSectionDrop: (e: React.DragEvent, sectionId: string | null) => void;
  isDropTarget: boolean;
  children: React.ReactNode;
}

export default function SectionGroup({
  section,
  isFirst,
  isLast,
  tracks,
  t,
  onMoveSection,
  onRenameSection,
  onDeleteSection,
  onSectionDragOver,
  onSectionDrop,
  isDropTarget,
  children,
}: Props) {
  const total = tracks.reduce(
    (s, x) =>
      s +
      (typeof x.duration === "number" && Number.isFinite(x.duration) ? x.duration : 0),
    0,
  );

  return (
    <section
      className="rounded-lg transition"
      onDragOver={(e) => onSectionDragOver(e, section?.id ?? null)}
      onDrop={(e) => onSectionDrop(e, section?.id ?? null)}
      style={{
        outline: isDropTarget ? "2px dashed rgba(216,146,116,0.7)" : "none",
        outlineOffset: -4,
        padding: "8px 4px",
      }}
    >
      <div className="flex items-center gap-3 px-2 mb-2 mt-1">
        <span style={{ color: "#D89274" }}>
          <IconFolder size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-italiana text-[22px] truncate"
            style={{ color: "#3A2C20", letterSpacing: "0.02em" }}
            title={section?.label ?? t.sectionUnassigned}
          >
            {section?.label ?? t.sectionUnassigned}
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{
              color: "#8C6A4F",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {tracks.length} {tracks.length === 1 ? t.track : t.tracks} ·{" "}
            <span className="tnum" style={{ color: "#3A2C20" }}>
              {fmtTime(total)}
            </span>
          </div>
        </div>

        {section && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 30, height: 30 }}
              onClick={() => onMoveSection(section.id, -1)}
              disabled={isFirst}
              title={t.moveSectionUp}
            >
              <IconArrowUp size={12} />
            </button>
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 30, height: 30 }}
              onClick={() => onMoveSection(section.id, 1)}
              disabled={isLast}
              title={t.moveSectionDown}
            >
              <IconArrowDown size={12} />
            </button>
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 30, height: 30 }}
              onClick={() => onRenameSection(section.id)}
              title={t.renameSection}
            >
              <IconEdit size={12} />
            </button>
            <button
              type="button"
              className="btn-iconic"
              style={{ width: 30, height: 30, color: "#C97B5B" }}
              onClick={() => onDeleteSection(section.id)}
              title={t.deleteSection}
            >
              <IconTrash size={12} />
            </button>
          </div>
        )}
      </div>

      {tracks.length === 0 ? (
        <div
          className="text-center py-6 px-4 rounded hairline"
          style={{
            background: "rgba(250,245,236,0.4)",
            color: "#A38A72",
            fontStyle: "italic",
            fontSize: 14,
          }}
        >
          —
        </div>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </section>
  );
}
