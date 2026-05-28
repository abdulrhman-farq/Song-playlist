"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Invitation from "@/components/Invitation";
import { loadLanguage } from "@/lib/storage";
import { strings } from "@/lib/i18n";
import type { Language } from "@/types";

/**
 * Public per-guest invitation page. Shared via deep-link like
 *   /invite?g={guestId}
 * The page reads the guest from localStorage so it works offline
 * and so RSVP replies are persisted on the guest's device without
 * needing a backend. The host sees the updated reply on her own
 * device because she's the one writing the seed.
 */
function InviteInner() {
  const sp = useSearchParams();
  const guestId = sp.get("g") ?? undefined;
  const [lang, setLang] = useState<Language>("ar");

  useEffect(() => {
    const saved =
      loadLanguage() ??
      (typeof navigator !== "undefined" &&
      navigator.language?.toLowerCase().startsWith("ar")
        ? "ar"
        : "en");
    setLang(saved);
  }, []);

  return <Invitation lang={lang} t={strings[lang]} guestId={guestId} />;
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteInner />
    </Suspense>
  );
}
