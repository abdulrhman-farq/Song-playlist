"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

const ACCEPTED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a"];
const ACCEPTED_EXT = [".mp3", ".wav", ".m4a"];

function isAccepted(file: File): boolean {
  if (ACCEPTED.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

interface Props {
  lang: Language;
  onFiles: (files: File[]) => void;
}

export default function UploadDropzone({ lang, onFiles }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter(isAccepted);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`rounded-2xl border-2 border-dashed transition cursor-pointer p-8 text-center flex flex-col items-center gap-3 ${
        isDragOver
          ? "border-gold-400 bg-gold-400/10"
          : "border-gold-400/30 hover:border-gold-400/60 hover:bg-gold-400/5"
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-gold-400/15 flex items-center justify-center text-gold-300">
        <UploadIcon width={22} height={22} />
      </div>
      <div>
        <div className="text-cream-50 font-medium">{t(lang, "upload")}</div>
        <div className="text-sm text-cream-100/60 mt-1">{t(lang, "uploadHint")}</div>
      </div>
      <button
        type="button"
        className="ghost-button rounded-full px-4 py-1.5 text-sm"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {t(lang, "uploadButton")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
