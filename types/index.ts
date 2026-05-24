export type TrackSource = "upload" | "youtube";

export interface BaseTrack {
  id: string;
  title: string;
  source: TrackSource;
  /** Duration in seconds, if known. */
  duration?: number;
  /** ISO timestamp the track was added. */
  addedAt: string;
}

export interface UploadTrack extends BaseTrack {
  source: "upload";
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface YouTubeTrack extends BaseTrack {
  source: "youtube";
  /** The 11-character YouTube video id. */
  videoId: string;
  /** The original URL the user pasted. */
  url: string;
}

export type Track = UploadTrack | YouTubeTrack;

export interface Playlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
}

export interface ExportedPlaylist {
  version: 1;
  exportedAt: string;
  playlist: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    tracks: ExportedTrack[];
  };
}

export type ExportedTrack =
  | (Omit<UploadTrack, "source"> & { source: "upload" })
  | (Omit<YouTubeTrack, "source"> & { source: "youtube" });

export type Language = "ar" | "en";
