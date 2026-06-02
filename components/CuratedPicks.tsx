"use client";

import { IconClose } from "@/components/icons";
import { useLockMode } from "@/lib/lockMode";
import {
  khalijiRomanceSuggestions,
  youtubeSearchUrl,
  type CuratedTrack,
} from "@/lib/khalijiRomance";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  onClose: () => void;
  /**
   * Optional — when set, the "Add to playlist" button on each row
   * prefills the YouTube composer with the song's title. The host
   * still pastes the real URL after picking from YouTube search.
   */
  onPrefillComposer?: (title: string) => void;
}

/**
 * Curated Khaliji-romance picker. Each row pairs a confident song
 * suggestion with a "Search on YouTube" deep-link. We deliberately
 * don't embed a YouTube id ourselves — instead the host opens the
 * search, picks the right official upload, copies the URL, and
 * pastes it into the YouTubeAddPanel. This avoids shipping broken
 * embeds when uploads get removed or the wrong cover lands.
 */
export default function CuratedPicks({
  lang,
  t,
  onClose,
  onPrefillComposer,
}: Props) {
  const direction = dirOf(lang);
  const lock = useLockMode();

  return (
    <div
      dir={direction}
      className="fixed inset-0 z-[60] flex items-stretch justify-center fade-up"
      style={{
        background: "rgba(8, 5, 4, 0.78)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-[720px] my-4 mx-3 rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.98) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.22)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.75)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{
            borderBottom: "1px solid rgba(216, 146, 116, 0.18)",
            background:
              "linear-gradient(90deg, rgba(216,146,116,0.07) 0%, transparent 60%)",
          }}
        >
          <div className="min-w-0">
            <div
              className="eyebrow"
              style={{ color: "var(--gold-400)", letterSpacing: "0.28em" }}
            >
              {t.curatedEyebrow}
            </div>
            <h2
              className="font-display italic mt-1 truncate"
              style={{
                fontSize: "clamp(22px, 2.6vw, 28px)",
                color: "var(--text)",
              }}
            >
              {t.curatedKhalijiRomanceTitle}
            </h2>
            <div
              className="text-[12px] mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              {khalijiRomanceSuggestions.length} {t.curatedSongCount}
            </div>
          </div>
          <button
            type="button"
            className="icon-btn flex-shrink-0"
            onClick={onClose}
            title={t.close}
            aria-label={t.close}
            style={{ width: 36, height: 36 }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Hint */}
        <div
          className="px-5 py-3 text-[12px]"
          style={{
            background: "rgba(216, 146, 116, 0.05)",
            color: "var(--text-muted)",
            borderBottom: "1px solid rgba(216, 146, 116, 0.14)",
          }}
        >
          {t.curatedHint}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {khalijiRomanceSuggestions.map((s, i) => (
            <Row
              key={s.searchQuery + i}
              song={s}
              t={t}
              lang={lang}
              locked={lock.locked}
              onPrefillComposer={onPrefillComposer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  song: CuratedTrack;
  t: Strings;
  lang: Language;
  locked: boolean;
  onPrefillComposer?: (title: string) => void;
}

function Row({ song, t, lang, locked, onPrefillComposer }: RowProps) {
  const primaryTitle = lang === "ar" ? song.title : song.titleLatin ?? song.title;
  const primaryArtist =
    lang === "ar" ? song.artist : song.artistLatin ?? song.artist;
  const subTitle = lang === "ar" ? song.titleLatin : song.title;
  const subArtist = lang === "ar" ? song.artistLatin : song.artist;

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-lg"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(216, 146, 116, 0.16)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="font-display italic truncate"
          style={{ color: "var(--text)", fontSize: 15 }}
          title={primaryTitle}
        >
          {primaryTitle}
        </div>
        <div
          className="truncate text-[12px] mt-0.5"
          style={{ color: "var(--gold-300)" }}
        >
          {primaryArtist}
        </div>
        {subTitle && subTitle !== primaryTitle && (
          <div
            className="truncate text-[10px] mt-0.5"
            style={{ color: "var(--text-faint)", letterSpacing: "0.04em" }}
          >
            {subTitle} · {subArtist}
          </div>
        )}
      </div>

      <a
        href={youtubeSearchUrl(song.searchQuery)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold"
        style={{
          background: "var(--gold-400)",
          color: "#1a1310",
          padding: "6px 12px",
          letterSpacing: "0.04em",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        title={t.curatedOpenYoutube}
      >
        <YoutubeGlyph />
        <span>{t.curatedOpenYoutube}</span>
      </a>

      {onPrefillComposer && !locked && (
        <button
          type="button"
          onClick={() => onPrefillComposer(`${song.title} — ${song.artist}`)}
          className="flex-shrink-0 rounded-full text-[11px]"
          style={{
            color: "var(--gold-300)",
            border: "1px solid rgba(216, 146, 116, 0.28)",
            padding: "6px 12px",
            letterSpacing: "0.04em",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title={t.curatedPrefillTitle}
        >
          {t.curatedPrefillLabel}
        </button>
      )}
    </div>
  );
}

function YoutubeGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M21.6 7.2c-.2-1-1-1.8-2-2-1.7-.4-8.6-.4-8.6-.4s-6.9 0-8.6.4c-1 .2-1.8 1-2 2-.4 1.7-.4 4.8-.4 4.8s0 3 .4 4.8c.2 1 1 1.8 2 2 1.7.4 8.6.4 8.6.4s6.9 0 8.6-.4c1-.2 1.8-1 2-2 .4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM9.6 15.2V8.8l5.8 3.2-5.8 3.2z" />
    </svg>
  );
}
