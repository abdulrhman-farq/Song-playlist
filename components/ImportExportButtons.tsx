"use client";

import { useRef } from "react";
import { DownloadIcon, UploadIcon, TrashIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { ExportedPlaylist, Language, Playlist } from "@/types";

interface Props {
  lang: Language;
  playlist: Playlist;
  onImport: (data: ExportedPlaylist) => void;
  onClear: () => void;
}

export default function ImportExportButtons({ lang, playlist, onImport, onClear }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function exportNow() {
    const data: ExportedPlaylist = {
      version: 1,
      exportedAt: new Date().toISOString(),
      playlist: {
        id: playlist.id,
        name: playlist.name,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        tracks: playlist.tracks.map((tr) =>
          tr.source === "upload"
            ? {
                id: tr.id,
                source: "upload",
                title: tr.title,
                duration: tr.duration,
                addedAt: tr.addedAt,
                fileName: tr.fileName,
                mimeType: tr.mimeType,
                fileSize: tr.fileSize,
              }
            : {
                id: tr.id,
                source: "youtube",
                title: tr.title,
                duration: tr.duration,
                addedAt: tr.addedAt,
                videoId: tr.videoId,
                url: tr.url,
              },
        ),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = playlist.name.replace(/[^a-zA-Z0-9-_ ]+/g, "").trim() || "playlist";
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportedPlaylist;
      if (
        !parsed ||
        parsed.version !== 1 ||
        !parsed.playlist ||
        !Array.isArray(parsed.playlist.tracks)
      ) {
        throw new Error("invalid");
      }
      if (!confirm(t(lang, "importConfirm"))) return;
      onImport(parsed);
    } catch {
      alert(t(lang, "importError"));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="ghost-button rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
        onClick={exportNow}
        disabled={playlist.tracks.length === 0}
      >
        <DownloadIcon width={14} height={14} />
        {t(lang, "export")}
      </button>
      <button
        type="button"
        className="ghost-button rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
        onClick={() => fileRef.current?.click()}
      >
        <UploadIcon width={14} height={14} />
        {t(lang, "importJson")}
      </button>
      <button
        type="button"
        className="rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 border border-red-500/30 text-red-300 hover:bg-red-500/10 transition disabled:opacity-40"
        onClick={() => {
          if (playlist.tracks.length === 0) return;
          if (confirm(t(lang, "clearConfirm"))) onClear();
        }}
        disabled={playlist.tracks.length === 0}
      >
        <TrashIcon width={14} height={14} />
        {t(lang, "clearAll")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
