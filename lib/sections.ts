import type { PlaylistSection } from "@/types";
import type { Strings } from "@/lib/i18n";
import { uid } from "@/lib/format";

/**
 * The four wedding-day sections every new playlist starts with.
 * Labels are bilingual so they read well in either language and
 * don't change on language toggle.
 */
export function createDefaultSections(t: Strings): PlaylistSection[] {
  return [
    { id: uid(), label: `${t.sectionCocktail} · ساعة الكوكتيل` },
    { id: uid(), label: `${t.sectionEntrance} · الزفّة` },
    { id: uid(), label: `${t.sectionFirstDance} · الرقصة الأولى` },
    { id: uid(), label: `${t.sectionParty} · الحفلة` },
  ];
}
