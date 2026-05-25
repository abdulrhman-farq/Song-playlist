"use client";

import { useState } from "react";
import { IconPlus, IconYT } from "@/components/icons";
import type { Strings } from "@/lib/i18n";
import { parseYouTubeId } from "@/lib/youtube";

interface Props {
  t: Strings;
  onAddYouTube: (args: { id: string; url: string; title: string }) => Promise<void> | void;
}

export default function YouTubeAddPanel({ t, onAddYouTube }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    const id = parseYouTubeId(url);
    if (!id) {
      setErr(t.invalidYouTube);
      return;
    }
    setBusy(true);
    try {
      await onAddYouTube({ id, url: url.trim(), title: title.trim() });
      setUrl("");
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 18,
        padding: "22px",
        border: "1px solid var(--line-subtle)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.0)) ",
      }}
    >
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          insetInlineEnd: -40,
          top: -40,
          width: 200,
          height: 200,
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(243,160,138,0.15), transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(243,160,138,0.12)",
              border: "1px solid rgba(243,160,138,0.3)",
              color: "#f3a08a",
            }}
          >
            <IconYT size={16} />
          </div>
          <div className="label-micro" style={{ color: "var(--text-dim)" }}>
            {t.addYouTube}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <input
            className="input-elegant"
            value={url}
            placeholder={t.ytPlaceholder}
            onChange={(e) => {
              setUrl(e.target.value);
              setErr(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            dir="ltr"
          />
          <input
            className="input-elegant"
            value={title}
            placeholder={t.titleLabel}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {err && (
            <div className="text-[12px]" style={{ color: "#f3a08a" }}>
              {err}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
            <div
              className="text-[11px] flex-1 min-w-0"
              style={{ color: "var(--text-faint)", lineHeight: 1.5 }}
            >
              {t.youtubeNotice}
            </div>
            <button
              type="button"
              className="btn-base btn-gold"
              onClick={submit}
              disabled={busy || !url.trim()}
            >
              {busy ? <span className="spinner" /> : <IconPlus size={14} />}
              <span>{busy ? t.youtubeFetching ?? t.add : t.add}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
