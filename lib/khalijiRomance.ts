/**
 * Curated Khaliji romance suggestions — well-known artists + songs
 * the host can pick from. Each entry deliberately ships the SEARCH
 * query, not a YouTube ID, so we never embed a broken video. The
 * host opens the search in a new tab, picks the official video, and
 * pastes the URL into the YouTubeAddPanel composer.
 */
export interface CuratedTrack {
  title: string;        // Arabic title
  titleLatin?: string;  // Latin transliteration / English
  artist: string;       // Arabic artist name
  artistLatin?: string;
  /** Pre-built YouTube search query, encoded as the host expects. */
  searchQuery: string;
}

export const khalijiRomanceSuggestions: CuratedTrack[] = [
  {
    title: "أبعاد",
    titleLatin: "Ab'aad",
    artist: "محمد عبده",
    artistLatin: "Mohammed Abdo",
    searchQuery: "محمد عبده أبعاد",
  },
  {
    title: "هلا والله",
    titleLatin: "Hala Wallah",
    artist: "محمد عبده",
    artistLatin: "Mohammed Abdo",
    searchQuery: "محمد عبده هلا والله",
  },
  {
    title: "يا حبيب الروح",
    titleLatin: "Ya Habib Al-Rouh",
    artist: "محمد عبده",
    artistLatin: "Mohammed Abdo",
    searchQuery: "محمد عبده يا حبيب الروح",
  },
  {
    title: "بسألك",
    titleLatin: "Bas'alak",
    artist: "عبد المجيد عبد الله",
    artistLatin: "Abdul Majeed Abdullah",
    searchQuery: "عبد المجيد عبد الله بسألك",
  },
  {
    title: "أحبك وأعشقك",
    titleLatin: "Aheb'k Wa A'shqak",
    artist: "عبد المجيد عبد الله",
    artistLatin: "Abdul Majeed Abdullah",
    searchQuery: "عبد المجيد عبد الله أحبك وأعشقك",
  },
  {
    title: "حبيبة قلبي",
    titleLatin: "Habibat Qalbi",
    artist: "عبد المجيد عبد الله",
    artistLatin: "Abdul Majeed Abdullah",
    searchQuery: "عبد المجيد عبد الله حبيبة قلبي",
  },
  {
    title: "تعلق فيك",
    titleLatin: "Ta'alaq Feek",
    artist: "راشد الماجد",
    artistLatin: "Rashed Al Majid",
    searchQuery: "راشد الماجد تعلق فيك",
  },
  {
    title: "يا كل عمري",
    titleLatin: "Ya Kul Omri",
    artist: "راشد الماجد",
    artistLatin: "Rashed Al Majid",
    searchQuery: "راشد الماجد يا كل عمري",
  },
  {
    title: "بحبك وحشتيني",
    titleLatin: "Bahebak Wahashtini",
    artist: "حسين الجسمي",
    artistLatin: "Hussain Al Jassmi",
    searchQuery: "حسين الجسمي بحبك وحشتيني",
  },
  {
    title: "بوضعك",
    titleLatin: "Bowad'ak",
    artist: "حسين الجسمي",
    artistLatin: "Hussain Al Jassmi",
    searchQuery: "حسين الجسمي بوضعك",
  },
  {
    title: "ما لي خيار",
    titleLatin: "Mali Khiyar",
    artist: "ماجد المهندس",
    artistLatin: "Majid Al Mohandis",
    searchQuery: "ماجد المهندس ما لي خيار",
  },
  {
    title: "حبيبي",
    titleLatin: "Habibi",
    artist: "نوال الكويتية",
    artistLatin: "Nawal Al Kuwaitia",
    searchQuery: "نوال الكويتية حبيبي",
  },
  {
    title: "معنى الحب",
    titleLatin: "Ma'na Al Hub",
    artist: "وعد",
    artistLatin: "Waed",
    searchQuery: "وعد معنى الحب",
  },
  {
    title: "صار العشق فينا",
    titleLatin: "Sar Al Eshq Feena",
    artist: "بلقيس",
    artistLatin: "Balqees",
    searchQuery: "بلقيس صار العشق فينا",
  },
  {
    title: "كيفك أنت",
    titleLatin: "Keefak Enta",
    artist: "نوال الزغبي",
    artistLatin: "Nawal Al Zoghbi",
    searchQuery: "نوال الزغبي كيفك أنت",
  },
];

/** Builds a YouTube results URL the user can open in a new tab. */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
