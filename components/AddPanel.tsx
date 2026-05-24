"use client";

import { useRef, useState } from "react";
import { IconPlus, IconUpload, OrnamentMark } from "@/components/icons";
import { parseYouTubeId } from "@/lib/youtube";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { Language } from "@/types";

const ACCEPTED_EXT = /\.(mp3|wav|m4a|ogg|aac|flac)$/i;

interface Props {
  lang: Language;
  t: Strings;
  onAddFiles: (files: File[]) => void;
  onAddYouTube: (args: { id: string; url: string; title: string }) => void;
}

export default function AddPanel({ lang, t, onAddFiles, onAddYouTube }: Props) {
  const direction = dirOf(lang);
  const [dragOver, setDragOver] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytErr, setYtErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickedFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter(
      (f) => f.type.startsWith("audio/") || ACCEPTED_EXT.test(f.name),
    );
    if (files.length) onAddFiles(files);
  }

  function submitYT() {
    setYtErr("");
    const id = parseYouTubeId(ytUrl);
    if (!id) {
      setYtErr(t.invalidYouTube);
      return;
    }
    onAddYouTube({ id, url: ytUrl.trim(), title: ytTitle.trim() });
    setYtUrl("");
    setYtTitle("");
  }

  return (
    <div className="stage-card p-7 flex flex-col gap-6">
      {/* Upload zone */}
      <div>
        <div className="label-tracked mb-3">{t.addAudio}</div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickedFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          className="border border-dashed rounded transition cursor-pointer text-center px-6 py-9"
          style={{
            borderColor: dragOver ? "#D89274" : "rgba(58,44,32,0.22)",
            background: dragOver
              ? "rgba(216,146,116,0.08)"
              : "rgba(244,236,223,0.5)",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
            multiple
            className="hidden"
            onChange={(e) => {
              pickedFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-2">
            <div style={{ color: "#D89274" }}>
              <IconUpload size={22} />
            </div>
            <div className="font-cormorant text-[19px] text-ink">
              {dragOver ? t.dropHere : t.chooseFiles}
            </div>
            <div
              className="text-xs text-brownSoft"
              style={{ letterSpacing: "0.04em" }}
            >
              {t.accepted}
            </div>
          </div>
        </div>
      </div>

      {/* Ornament divider */}
      <div className="flex items-center justify-center">
        <div className="divider-orn">
          <OrnamentMark size={8} />
        </div>
      </div>

      {/* YouTube form */}
      <div>
        <div className="label-tracked mb-3">{t.addYouTube}</div>
        <div className="flex flex-col gap-2.5">
          <input
            className="input-elegant"
            value={ytUrl}
            placeholder={t.ytPlaceholder}
            onChange={(e) => {
              setYtUrl(e.target.value);
              setYtErr("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitYT();
            }}
            dir="ltr"
          />
          <input
            className="input-elegant"
            value={ytTitle}
            placeholder={t.titleLabel}
            onChange={(e) => setYtTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitYT();
            }}
          />
          {ytErr && (
            <div className="text-xs" style={{ color: "#C97B5B" }}>
              {ytErr}
            </div>
          )}
          <button
            type="button"
            className="btn-primary mt-1"
            onClick={submitYT}
            style={{
              alignSelf: direction === "rtl" ? "flex-start" : "flex-end",
            }}
          >
            <IconPlus size={12} />
            <span>{t.add}</span>
          </button>
          <div
            className="text-[11px] mt-1 text-brownSoft"
            style={{ lineHeight: 1.5 }}
          >
            {t.youtubeNotice}
          </div>
        </div>
      </div>
    </div>
  );
}
