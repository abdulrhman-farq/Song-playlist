"use client";

import { useRef, useState } from "react";
import { IconUpload } from "@/components/icons";
import type { Strings } from "@/lib/i18n";
import { useMagneticCursor } from "@/lib/useMagneticCursor";

const ACCEPTED = /\.(mp3|wav|m4a|ogg|aac|flac)$/i;

interface Props {
  t: Strings;
  onAddFiles: (files: File[]) => void;
}

export default function UploadPanel({ t, onAddFiles }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const magnet = useMagneticCursor();

  function pick(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter(
      (f) => f.type.startsWith("audio/") || ACCEPTED.test(f.name),
    );
    if (files.length === 0) return;
    setBusy(true);
    Promise.resolve(onAddFiles(files)).finally(() => setBusy(false));
  }

  return (
    <div
      onMouseMove={magnet.onMouseMove}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ref.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      className="magnetic relative overflow-hidden cursor-pointer contain-paint"
      style={{
        borderRadius: 18,
        padding: "26px 22px",
        border: dragOver
          ? "1px dashed var(--gold-400)"
          : "1px dashed var(--line-soft)",
        background: dragOver
          ? "rgba(212,175,55,0.07)"
          : "rgba(255,255,255,0.03)",
      }}
    >
      <input
        ref={ref}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Subtle glow on hover/drag */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        aria-hidden
        style={{
          opacity: dragOver ? 1 : 0.45,
          background:
            "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(212,175,55,0.10), transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className="flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(212,175,55,0.10)",
            border: "1px solid rgba(212,175,55,0.28)",
            color: "var(--gold-300)",
          }}
        >
          {busy ? <span className="spinner" /> : <IconUpload size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-micro" style={{ color: "var(--gold-400)" }}>
            {t.addAudio}
          </div>
          <div
            className="font-display italic mt-1"
            style={{ fontSize: 20, color: "var(--text)" }}
          >
            {dragOver ? t.dropHere : t.chooseFiles}
          </div>
          <div
            className="text-[12px] mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {t.accepted}
          </div>
        </div>
      </div>
    </div>
  );
}
