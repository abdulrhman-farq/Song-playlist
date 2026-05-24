export type TrackSource = "upload" | "youtube";

export interface BaseTrack {
  id: string;
  title: string;
  source: TrackSource;
  /** Duration in seconds, if known. */
  duration: number | null;
  /** Free-form sub-line shown beneath the title (filename, "sample · classical", etc.). */
  note?: string;
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

export interface PersistedSettings {
  name: string;
  tracks: Track[];
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
