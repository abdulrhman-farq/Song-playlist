"use client";

import { useState } from "react";
import { YouTubeIcon } from "@/components/icons";
import { extractYouTubeId } from "@/lib/youtube";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  lang: Language;
  onAdd: (videoId: string, url: string) => Promise<void> | void;
}

export default function YouTubeInput({ lang, onAdd }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const id = extractYouTubeId(value);
    if (!id) {
      setError(t(lang, "youtubeInvalid"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onAdd(id, value.trim());
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 relative">
          <span className="absolute top-1/2 -translate-y-1/2 start-3 text-gold-300/70 pointer-events-none">
            <YouTubeIcon width={18} height={18} />
          </span>
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!busy) submit();
              }
            }}
            placeholder={t(lang, "youtubePlaceholder")}
            className="w-full ps-10 pe-3 py-2.5 rounded-xl bg-ink-800 border border-gold-400/20 text-cream-50 placeholder-cream-100/40 outline-none focus:border-gold-400/60 transition"
            dir="ltr"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="gold-button rounded-xl px-4 py-2.5 whitespace-nowrap"
        >
          {busy ? t(lang, "youtubeFetching") : t(lang, "youtubeAdd")}
        </button>
      </div>
      {error && <div className="text-red-300 text-sm">{error}</div>}
      <div className="text-xs text-cream-100/50 leading-relaxed">
        {t(lang, "youtubeNote")}
      </div>
    </div>
  );
}
