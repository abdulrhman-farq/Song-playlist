"use client";

import { GlobeIcon, SparkleIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  lang: Language;
  onToggleLang: () => void;
}

export default function Header({ lang, onToggleLang }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 pt-8 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-ink-900 shadow-gold">
          <SparkleIcon width={22} height={22} />
        </div>
        <div>
          <h1
            className={`text-2xl sm:text-3xl leading-tight ${
              lang === "ar" ? "font-bold" : "font-serif font-semibold"
            } text-cream-50`}
          >
            {t(lang, "appTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-cream-100/55 mt-0.5">
            {t(lang, "appSubtitle")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleLang}
        className="ghost-button rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
        aria-label="Toggle language"
      >
        <GlobeIcon width={16} height={16} />
        <span>{t(lang, "languageToggle")}</span>
      </button>
    </header>
  );
}
