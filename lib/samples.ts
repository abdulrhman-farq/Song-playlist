import type { Playlist } from "@/types";
import { uid } from "@/lib/format";

/**
 * Build a small starter playlist made entirely of YouTube embeds so it
 * works the first time the app loads — no uploads required.
 *
 * The picks are timeless wedding/processional pieces that are widely
 * known and embeddable on YouTube.
 */
export function createSamplePlaylist(): Playlist {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "Wedding Day",
    createdAt: now,
    updatedAt: now,
    tracks: [
      {
        id: uid(),
        source: "youtube",
        title: "Canon in D — Pachelbel",
        videoId: "Ptk_1Dc2iPY",
        url: "https://www.youtube.com/watch?v=Ptk_1Dc2iPY",
        addedAt: now,
      },
      {
        id: uid(),
        source: "youtube",
        title: "Wedding March — Mendelssohn",
        videoId: "EHXVxL0gxxg",
        url: "https://www.youtube.com/watch?v=EHXVxL0gxxg",
        addedAt: now,
      },
      {
        id: uid(),
        source: "youtube",
        title: "A Thousand Years — The Piano Guys",
        videoId: "DcHKOC64KnE",
        url: "https://www.youtube.com/watch?v=DcHKOC64KnE",
        addedAt: now,
      },
    ],
  };
}
