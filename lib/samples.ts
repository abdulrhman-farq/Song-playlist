import type { Track } from "@/types";
import { uid } from "@/lib/format";

/**
 * A small starter set of YouTube embeds (no uploads required) so the
 * app is usable the moment it loads.
 */
export function createSamples(): Track[] {
  return [
    {
      id: uid(),
      source: "youtube",
      title: "الزفّة — Wedding Procession",
      youtubeId: "TpiUmTYqxk0",
      url: "https://www.youtube.com/watch?v=TpiUmTYqxk0",
      duration: null,
      note: "sample · ceremony",
    },
    {
      id: uid(),
      source: "youtube",
      title: "Canon in D — Pachelbel",
      youtubeId: "NlprozGcs80",
      url: "https://www.youtube.com/watch?v=NlprozGcs80",
      duration: null,
      note: "sample · classical",
    },
    {
      id: uid(),
      source: "youtube",
      title: "A Thousand Years — Acoustic",
      youtubeId: "rtOvBOTyX00",
      url: "https://www.youtube.com/watch?v=rtOvBOTyX00",
      duration: null,
      note: "sample · reception",
    },
  ];
}
