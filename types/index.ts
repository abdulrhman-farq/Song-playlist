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

/**
 * Wedding-prep to-do entry. Keeps the shape lightweight on purpose —
 * `due` and `completedAt` are display strings so the user can paste
 * whatever phrasing they want ("Today", "Fri, 29 May at 11:30 PM",
 * "Due 1 week ago") without us forcing them through a date parser.
 */
export interface TaskEntry {
  id: string;
  title: string;
  /** Free-form due-date string. Empty = no due date. */
  due?: string;
  /** Optional sub-line under the title (e.g. salon name "Nailsholic"). */
  note?: string;
  done: boolean;
  /** Free-form completion date string for the "Completed" section. */
  completedAt?: string;
  /** Marked important — drives a peach star + sort priority. */
  starred?: boolean;
  /** Priority level — drives the small dot at row's end. */
  priority?: "low" | "med" | "high";
  /** Optional Arabic-first category label (single value, e.g. "الموردين"). */
  category?: string;
  /** Optional linked-song free-text reference. */
  linkedSong?: string;
  /** Optional vendor / contact free-text reference. */
  vendor?: string;
  /** Reminder toggle stub — UI only for now. */
  reminder?: boolean;
  /** Pinned to the top of the open list (above date sort). */
  pinned?: boolean;
}

export interface TaskDoc {
  entries: TaskEntry[];
  /** Seed-version stamp; bumped when defaults change so storage auto-migrates. */
  version?: number;
}

/**
 * Guest list / RSVP entry. Tracks who's invited, who replied,
 * inspired by Saudi mazoom-style invitation platforms.
 */
export type GuestStatus = "pending" | "attending" | "declined" | "maybe";

export interface GuestEntry {
  id: string;
  name: string;
  phone?: string;
  status: GuestStatus;
  /** Bride / groom side — useful for capacity planning. */
  side?: "bride" | "groom" | "both";
  /** Number of seats this person brings (default 1). */
  partySize?: number;
  note?: string;
}

export interface GuestDoc {
  entries: GuestEntry[];
  version?: number;
}

/**
 * Every header / footer block on the printable timeline. Empty
 * string for a field means the block is hidden — the user removed
 * it. Reset-to-default restores all.
 */
export interface TimelineDoc {
  // Header
  /** Tracked label under the crest. Empty = hide. */
  crestEyebrow: string;
  /** Arabic side of the date line. */
  dateAr: string;
  /** Latin side of the date line. */
  dateLatin: string;
  /** Bride's first name in display italic (top of monogram). */
  brideName: string;
  /** Groom's name in display tracked caps. */
  groomName: string;
  /** Arabic couple name. */
  coupleArabic: string;
  /** Label above the appointments table. */
  appointmentsLabel: string;

  entries: TimelineEntry[];

  /** Closing message above the signature. */
  footerMessage: string;
  /** Tracked tag above the signature name. */
  signaturePreLabel: string;
  /** Signature display name. */
  signatureName: string;
  /** Tracked footer line (date stamp). */
  signatureFooter: string;

  /**
   * Which removable structural blocks the user has hidden.
   * Editable-text removal is handled by setting the field above to "".
   */
  hiddenBlocks?: Array<
    | "crest"
    | "topOrnament"
    | "midOrnament"
    | "rings"
    | "signature"
  >;

  /** Seed-version stamp; bumped when defaults change so storage auto-migrates. */
  version?: number;
}
