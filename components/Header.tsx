"use client";

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconExport,
  IconGlobe,
  IconImport,
  IconShield,
  IconSparkle,
  IconTrash,
  LogoMark,
  OrnamentMark,
} from "@/components/icons";
import { dir as dirOf, type Strings } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  playlistName: string;
  onRename: (name: string) => void;
  t: Strings;
  lang: Language;
  onToggleLang: () => void;
  onImport: () => void;
  onExport: () => void;
  onSamples: () => void;
  onClearAll: () => void;
  onValidate: () => void;
  hasYouTubeTracks: boolean;
  validating: boolean;
  hasTracks: boolean;
}

export default function Header({
  playlistName,
  onRename,
  t,
  lang,
  onToggleLang,
  onImport,
  onExport,
  onSamples,
  onClearAll,
  onValidate,
  hasYouTubeTracks,
  validating,
  hasTracks,
}: Props) {
  const direction = dirOf(lang);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlistName);

  useEffect(() => setDraft(playlistName), [playlistName]);

  function commit() {
    const v = (draft || "").trim();
    onRename(v || t.untitled);
    setEditing(false);
  }

  return (
    <header className="relative px-8 pt-6 pb-8">
      {/* Top action bar */}
      <div className="flex justify-between items-center gap-3 mb-6 flex-wrap">
        <button
          type="button"
          className="btn-ghost"
          onClick={onToggleLang}
          title={t.language}
          style={{ gap: 6 }}
        >
          <IconGlobe size={13} />
          <span>{lang === "ar" ? "EN" : "ع"}</span>
        </button>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onImport}>
            <IconImport size={13} />
            <span>{t.importJson}</span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onExport}
            disabled={!hasTracks}
          >
            <IconExport size={13} />
            <span>{t.exportJson}</span>
          </button>
          <button type="button" className="btn-ghost" onClick={onSamples}>
            <IconSparkle size={13} />
            <span>{t.sample}</span>
          </button>
          {hasYouTubeTracks && (
            <button
              type="button"
              className="btn-ghost"
              onClick={onValidate}
              disabled={validating}
              title={t.validateHint}
            >
              <IconShield size={13} />
              <span>{validating ? t.validating : t.validate}</span>
            </button>
          )}
          {hasTracks && (
            <button
              type="button"
              className="btn-ghost"
              onClick={onClearAll}
              style={{
                color: "#C97B5B",
                borderColor: "rgba(201,123,91,0.35)",
              }}
            >
              <IconTrash size={13} />
              <span>{t.clearAll}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="label-tracked">{t.eyebrow}</div>
        <div className="flex items-center gap-3 mt-1">
          <LogoMark size={32} />
        </div>
        <h1
          className="font-italiana text-[44px] leading-none mt-1"
          style={{ color: "#D89274", letterSpacing: "0.04em" }}
        >
          {t.coupleAr}
        </h1>
        <div
          className="font-cinzel text-[10px] mt-1"
          style={{
            letterSpacing: "0.42em",
            color: "#8C6A4F",
            textTransform: "uppercase",
          }}
        >
          {t.coupleLatin}
        </div>
        <div className="divider-orn mt-2">
          <OrnamentMark />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="label-tracked">{t.playlistLabel}</div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              className="input-elegant text-center"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              style={{
                minWidth: 280,
                fontFamily:
                  direction === "rtl"
                    ? "'Markazi Text', 'Amiri', serif"
                    : "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 22,
              }}
            />
            <button
              type="button"
              className="btn-iconic"
              onClick={commit}
              title={t.save}
            >
              <IconCheck size={16} />
            </button>
            <button
              type="button"
              className="btn-iconic"
              onClick={() => setEditing(false)}
              title={t.cancel}
            >
              <IconClose size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="font-cormorant italic text-[28px] mt-1 px-3 py-1 rounded hover:bg-ivory/60 transition"
            style={{ color: "#3A2C20" }}
            onClick={() => setEditing(true)}
            title={t.editTitle}
          >
            {playlistName || t.untitled}
          </button>
        )}
      </div>
    </header>
  );
}
