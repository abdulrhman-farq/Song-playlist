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
  return (
    <div className="min-h-screen relative" dir={dirOf(lang)}>
      {sidebar}
      <main
        className="relative"
        style={{
          paddingInlineStart: "var(--shell-pad-start, 0)",
          paddingBottom: 140,
        }}
      >
        <style jsx>{`
          @media (min-width: 1024px) {
            main {
              --shell-pad-start: 280px;
            }
          }
        `}</style>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "32px 24px 0" }}>
          {children}
        </div>
      </main>
      {bottomPlayer}
    </div>
  );
}
