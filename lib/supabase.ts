import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public connection details for the realtime playlist DB. The
 * publishable key is intentionally embedded — it's the modern,
 * RLS-gated equivalent of an anon key. All writes are constrained
 * by the row-level-security policies defined in the migration.
 */
const SUPABASE_URL = "https://czuruornutpvymdphbmn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_65xdVNli8M1cNTd74RWUmg_y__1a6rq";

/** Fixed UUID for the single shared wedding playlist row. */
export const PLAYLIST_ID = "00000000-0000-0000-0000-000000000001" as const;

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Build-time safety — return a stub so static prerender doesn't blow up
    return {} as SupabaseClient;
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 12 } },
    });
  }
  return _client;
}

/** Row shapes — match the `wedding_playlists` / `wedding_sections` / `wedding_tracks` tables. */
export interface PlaylistRow {
  id: string;
  name: string;
  autoplay: boolean;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  playlist_id: string;
  label: string;
  position: number;
}

export interface TrackRow {
  id: string;
  playlist_id: string;
  section_id: string | null;
  source: "upload" | "youtube";
  title: string;
  youtube_id: string | null;
  url: string | null;
  note: string | null;
  duration: number | null;
  start_at: number | null;
  end_at: number | null;
  blob_name: string | null;
  position: number;
}
