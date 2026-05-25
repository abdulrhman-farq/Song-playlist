export type TrackSource = "upload" | "youtube";

export interface BaseTrack {
  id: string;
  title: string;
  source: TrackSource;
  /** Duration in seconds, if known. */
  duration: number | null;
  /** Free-form sub-line shown beneath the title (filename, "sample · classical", etc.). */
  note?: string;
  /** Optional custom start time in seconds — skip past intros. */
  startAt?: number;
  /** Optional custom end time in seconds — stop before outros. */
  endAt?: number;
  /** Optional section grouping — see `Playlist.sections`. */
  sectionId?: string;
}

export interface UploadTrack extends BaseTrack {
  source: "upload";
  blobName: string;
  mimeType?: string;
  fileSize?: number;
}

export interface YouTubeTrack extends BaseTrack {
  source: "youtube";
  /** 11-char YouTube video id. */
  youtubeId: string;
  /** Original URL the user pasted. */
  url: string;
}

export type Track = UploadTrack | YouTubeTrack;

/**
 * A named grouping of tracks (e.g. "Cocktail", "Entrance"). Tracks
 * reference their section via `Track.sectionId`. Order in the
 * `sections` array determines display order; sectionless tracks
 * render in an implicit "Unassigned" group at the top.
 */
export interface PlaylistSection {
  id: string;
  /** Display label. Authors can include both languages, eg. "Cocktail · ساعة الكوكتيل". */
  label: string;
}

export interface PersistedSettings {
  name: string;
  tracks: Track[];
  sections?: PlaylistSection[];
  volume: number;
  autoplay: boolean;
  shuffle: boolean;
  repeat: boolean;
}

export interface ExportedTrackYouTube {
  id: string;
  source: "youtube";
  title: string;
  youtubeId: string;
  url: string;
  duration: number | null;
  note?: string;
}

export interface ExportedPlaylist {
  _meta: {
    app: "wedding-playlist";
    version: 1;
    exportedAt: string;
  };
  name: string;
  tracks: ExportedTrackYouTube[];
  stats?: {
    uploadedSkipped: number;
  };
}

export type Language = "ar" | "en";

/**
 * Wedding-day timeline entry. The order in the persisted `entries`
 * array drives display order; we don't sort by time so a user can
 * intentionally reorder.
 */
export interface TimelineEntry {
  id: string;
  /** Free-form time string (e.g. "1:00 PM"). */
  time: string;
  /** Role / activity (e.g. "الهيرستايلست", "Hairstylist"). */
  role: string;
  /** Person or venue (e.g. "لينا فهد"). */
  name: string;
}

export interface TimelineDoc {
  entries: TimelineEntry[];
  /** Closing message above the signature. */
  footerMessage: string;
  /** Signature display name (default: "رويـدا"). */
  signatureName: string;
  /** Seed-version stamp; bumped when defaults change so storage auto-migrates. */
  version?: number;
}
