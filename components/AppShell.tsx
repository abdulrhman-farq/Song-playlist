"use client";

import type { ReactNode } from "react";
import { dir as dirOf } from "@/lib/i18n";
import type { Language } from "@/types";

interface Props {
  lang: Language;
  sidebar: ReactNode;
  bottomPlayer: ReactNode;
  children: ReactNode;
}

export default function AppShell({ lang, sidebar, bottomPlayer, children }: Props) {
  // The skip-link label flips by language so screen readers in Arabic
  // still get a localised announcement.
  const skipLabel = lang === "ar" ? "تخطّ إلى القائمة" : "Skip to playlist";
  return (
    <div className="min-h-screen relative" dir={dirOf(lang)}>
      {/* Keyboard-only skip link — first focusable element on the page */}
      <a href="#main" className="skip-link">
        {skipLabel}
      </a>
      {sidebar}
      <main
        id="main"
        className="relative"
        style={{
          paddingInlineStart: "var(--shell-pad-start, 0)",
          // Mobile player can be 2 rows tall (≤520px) → reserve more
          // bottom space so content doesn't sit under it.
          paddingBottom: "clamp(140px, 22vh, 200px)",
        }}
      >
        <style jsx>{`
          @media (min-width: 1024px) {
            main {
              --shell-pad-start: 280px;
            }
          }
        `}</style>
        <div
          className="mx-auto"
          style={{
            maxWidth: 1280,
            // Mobile-first: tight padding; expands on larger screens.
            padding: "clamp(20px, 4vw, 32px) clamp(14px, 4vw, 24px) 0",
          }}
        >
          {children}
        </div>
      </main>
      {bottomPlayer}
    </div>
  );
}
