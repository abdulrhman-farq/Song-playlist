"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  PLAYLIST_ID,
  supabase,
  type PlaylistRow,
  type SectionRow,
  type TrackRow,
} from "@/lib/supabase";
import type {
  PlaylistSection,
  Track,
  UploadTrack,
  YouTubeTrack,
} from "@/types";

/* ─────────────────────────── ID helpers ─────────────────────────── */

/**
 * Supabase rejects non-UUID primary keys for our schema. The legacy
 * `uid()` helper produced `t_xxx`-style strings — we now generate
 * RFC-4122 UUIDs for every new row so they round-trip through
 * Postgres cleanly.
 */
export function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (sufficiently random for our single-playlist use case)
  const rand = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${rand(8)}-${rand(4)}-4${rand(3)}-${((Math.random() * 4) | 8).toString(16)}${rand(3)}-${rand(12)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string | null | undefined): boolean {
  return !!s && UUID_RE.test(s);
}

/* ─────────────────────────── Row ↔ Track ─────────────────────────── */

function rowToTrack(row: TrackRow): Track {
  const common = {
    id: row.id,
    title: row.title,
    duration: row.duration ?? null,
    note: row.note ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    sectionId: row.section_id ?? undefined,
  };
  if (row.source === "youtube") {
    const yt: YouTubeTrack = {
      ...common,
      source: "youtube",
      youtubeId: row.youtube_id ?? "",
      url: row.url ?? "",
    };
    return yt;
  }
  const up: UploadTrack = {
    ...common,
    source: "upload",
    blobName: row.blob_name ?? "",
  };
  return up;
}

function rowToSection(row: SectionRow): PlaylistSection {
  return { id: row.id, label: row.label };
}

/** Sort tracks by `(section order, position)`. */
function orderTracks(rows: TrackRow[], sections: SectionRow[]): Track[] {
  const sectionOrder = new Map<string, number>();
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);
  sortedSections.forEach((s, i) => sectionOrder.set(s.id, i));
  const sorted = [...rows].sort((a, b) => {
    const ao = a.section_id ? sectionOrder.get(a.section_id) ?? 9999 : 9999;
    const bo = b.section_id ? sectionOrder.get(b.section_id) ?? 9999 : 9999;
    if (ao !== bo) return ao - bo;
    return a.position - b.position;
  });
  return sorted.map(rowToTrack);
}

function orderSections(rows: SectionRow[]): PlaylistSection[] {
  return [...rows].sort((a, b) => a.position - b.position).map(rowToSection);
}

/* ─────────────────────────── Hook types ─────────────────────────── */

export interface PlaylistSettings {
  name: string;
  autoplay: boolean;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
}

export type RealtimeStatus = "idle" | "connecting" | "live" | "offline" | "error";

export interface AddTrackInput {
  title: string;
  source: "upload" | "youtube";
  youtubeId?: string;
  url?: string;
  blobName?: string;
  note?: string | null;
  duration?: number | null;
  sectionId?: string | null;
}

export interface UpdateTrackInput {
  title?: string;
  note?: string | null;
  startAt?: number | null;
  endAt?: number | null;
  duration?: number | null;
  sectionId?: string | null;
}

export interface UseRealtimePlaylistResult {
  /** True once initial data has been fetched (either from DB or cache). */
  loaded: boolean;
  /** Live connection status of the realtime channel. */
  status: RealtimeStatus;

  tracks: Track[];
  sections: PlaylistSection[];
  settings: PlaylistSettings;

  /* ─ Settings ─ */
  setName: (name: string) => void;
  setAutoplay: (v: boolean) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (v: boolean) => void;
  setVolume: (v: number) => void;

  /* ─ Tracks ─ */
  addTrack: (input: AddTrackInput) => Promise<string>;
  updateTrack: (id: string, patch: UpdateTrackInput) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  /** Reorder: place `id` immediately above/below `targetId`. */
  moveTrack: (id: string, targetId: string, where: "above" | "below") => Promise<void>;
  /** Drop a track at the end of `sectionId` (or unassigned when null). */
  moveTrackToSection: (id: string, sectionId: string | null) => Promise<void>;
  /** Atomic title rename helper. */
  renameTrack: (id: string, title: string) => Promise<void>;

  /* ─ Sections ─ */
  addSection: (label: string) => Promise<string>;
  renameSection: (id: string, label: string) => Promise<void>;
  removeSection: (id: string) => Promise<void>;
  /** Reorder by ±1 within the section list. */
  moveSection: (id: string, direction: -1 | 1) => Promise<void>;

  /* ─ Bulk ─ */
  replaceAll: (input: {
    name?: string;
    sections?: { label: string }[];
    tracks?: (AddTrackInput & { sectionIdx?: number | null })[];
    /** Clear existing rows before writing. */
    clear?: boolean;
  }) => Promise<void>;
  clearAllTracks: () => Promise<void>;
}

/* ─────────────────────── Local read-through cache ─────────────────────── */

const CACHE_KEY = "wedding-playlist:rt-cache:v1";

interface CacheShape {
  tracks: TrackRow[];
  sections: SectionRow[];
  playlist: PlaylistRow | null;
}

function readCache(): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || !Array.isArray(parsed.tracks) || !Array.isArray(parsed.sections)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: CacheShape): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore quota */
  }
}

/* ─────────────────────── Position math (floats) ─────────────────────── */

function nextPosition(rows: { position: number }[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.position)) + 1;
}

function positionBetween(before: number | null, after: number | null): number {
  if (before == null && after == null) return 1;
  if (before == null && after != null) return after - 1;
  if (before != null && after == null) return before + 1;
  return ((before as number) + (after as number)) / 2;
}

/* ─────────────────────────── The hook ─────────────────────────── */

export function useRealtimePlaylist(initialName: string): UseRealtimePlaylistResult {
  const [tracksRows, setTracksRows] = useState<TrackRow[]>([]);
  const [sectionsRows, setSectionsRows] = useState<SectionRow[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  // Mirror to refs so async mutations always see fresh state without
  // re-creating callbacks on every render.
  const tracksRef = useRef<TrackRow[]>([]);
  const sectionsRef = useRef<SectionRow[]>([]);
  tracksRef.current = tracksRows;
  sectionsRef.current = sectionsRows;

  /* ── Hydrate from local cache for instant first paint ── */
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setTracksRows(cached.tracks);
      setSectionsRows(cached.sections);
      if (cached.playlist) setPlaylist(cached.playlist);
      setLoaded(true);
    }
  }, []);

  /* ── Persist read-through cache whenever DB data updates ── */
  useEffect(() => {
    if (!loaded) return;
    writeCache({
      tracks: tracksRows,
      sections: sectionsRows,
      playlist,
    });
  }, [loaded, tracksRows, sectionsRows, playlist]);

  /* ── Initial fetch + realtime subscription ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: number | null = null;

    async function loadInitial(): Promise<void> {
      try {
        const sb = supabase();
        const [plRes, secRes, trRes] = await Promise.all([
          sb.from("wedding_playlists").select("*").eq("id", PLAYLIST_ID).maybeSingle(),
          sb.from("wedding_sections").select("*").eq("playlist_id", PLAYLIST_ID),
          sb.from("wedding_tracks").select("*").eq("playlist_id", PLAYLIST_ID),
        ]);
        if (cancelled) return;
        if (plRes.data) setPlaylist(plRes.data as PlaylistRow);
        setSectionsRows((secRes.data as SectionRow[]) ?? []);
        setTracksRows((trRes.data as TrackRow[]) ?? []);
        setLoaded(true);
      } catch {
        // Network error — keep cached state, mark offline
        setStatus("offline");
      }
    }

    function applyTrackChange(payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: TrackRow | Record<string, never>;
      old: TrackRow | Record<string, never>;
    }): void {
      setTracksRows((prev) => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as TrackRow).id;
          return prev.filter((r) => r.id !== oldId);
        }
        const next = payload.new as TrackRow;
        const idx = prev.findIndex((r) => r.id === next.id);
        if (idx < 0) return [...prev, next];
        const copy = prev.slice();
        copy[idx] = next;
        return copy;
      });
    }

    function applySectionChange(payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: SectionRow | Record<string, never>;
      old: SectionRow | Record<string, never>;
    }): void {
      setSectionsRows((prev) => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as SectionRow).id;
          return prev.filter((r) => r.id !== oldId);
        }
        const next = payload.new as SectionRow;
        const idx = prev.findIndex((r) => r.id === next.id);
        if (idx < 0) return [...prev, next];
        const copy = prev.slice();
        copy[idx] = next;
        return copy;
      });
    }

    function applyPlaylistChange(payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: PlaylistRow | Record<string, never>;
    }): void {
      if (payload.eventType === "DELETE") return;
      setPlaylist(payload.new as PlaylistRow);
    }

    function subscribe(): void {
      const sb = supabase();
      channel = sb
        .channel(`wedding-playlist:${PLAYLIST_ID}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wedding_tracks",
            filter: `playlist_id=eq.${PLAYLIST_ID}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => applyTrackChange(payload),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wedding_sections",
            filter: `playlist_id=eq.${PLAYLIST_ID}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => applySectionChange(payload),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wedding_playlists",
            filter: `id=eq.${PLAYLIST_ID}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => applyPlaylistChange(payload),
        )
        .subscribe((s) => {
          if (cancelled) return;
          if (s === "SUBSCRIBED") {
            setStatus("live");
            // Re-fetch on (re)connect so we don't miss events that
            // happened while we were offline.
            void loadInitial();
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            setStatus("offline");
            // Schedule a reconnect attempt
            if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
            reconnectTimer = window.setTimeout(() => {
              if (cancelled) return;
              if (channel) {
                try {
                  void supabase().removeChannel(channel);
                } catch {
                  /* ignore */
                }
                channel = null;
              }
              setStatus("connecting");
              subscribe();
            }, 3000);
          }
        });
    }

    void loadInitial();
    subscribe();

    function handleOnline(): void {
      if (channel) {
        try {
          void supabase().removeChannel(channel);
        } catch {
          /* ignore */
        }
        channel = null;
      }
      setStatus("connecting");
      subscribe();
    }
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (channel) {
        try {
          void supabase().removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived: ordered domain objects ── */
  const sections = useMemo(() => orderSections(sectionsRows), [sectionsRows]);
  const tracks = useMemo(
    () => orderTracks(tracksRows, sectionsRows),
    [tracksRows, sectionsRows],
  );

  const settings: PlaylistSettings = useMemo(
    () => ({
      name: playlist?.name ?? initialName,
      autoplay: playlist?.autoplay ?? true,
      shuffle: playlist?.shuffle ?? false,
      repeat: playlist?.repeat ?? false,
      volume: playlist?.volume ?? 0.8,
    }),
    [playlist, initialName],
  );

  /* ── Helper to ensure the playlist row exists ── */
  const ensurePlaylist = useCallback(async (): Promise<void> => {
    if (playlist) return;
    try {
      const sb = supabase();
      await sb.from("wedding_playlists").upsert({
        id: PLAYLIST_ID,
        name: initialName,
      });
    } catch {
      /* ignore */
    }
  }, [playlist, initialName]);

  /* ── Settings mutations (debounced via just-fire-and-forget) ── */
  const updatePlaylist = useCallback(
    async (patch: Partial<Omit<PlaylistRow, "id" | "updated_at">>): Promise<void> => {
      try {
        await ensurePlaylist();
        const sb = supabase();
        await sb.from("wedding_playlists").update(patch).eq("id", PLAYLIST_ID);
      } catch {
        /* offline — drop */
      }
    },
    [ensurePlaylist],
  );

  const setName = useCallback(
    (name: string) => {
      // Optimistic local for settings (typing should feel instant)
      setPlaylist((p) =>
        p
          ? { ...p, name }
          : ({
              id: PLAYLIST_ID,
              name,
              autoplay: true,
              shuffle: false,
              repeat: false,
              volume: 0.8,
              updated_at: new Date().toISOString(),
            } satisfies PlaylistRow),
      );
      void updatePlaylist({ name });
    },
    [updatePlaylist],
  );
  const setAutoplay = useCallback(
    (v: boolean) => {
      setPlaylist((p) => (p ? { ...p, autoplay: v } : p));
      void updatePlaylist({ autoplay: v });
    },
    [updatePlaylist],
  );
  const setShuffle = useCallback(
    (v: boolean) => {
      setPlaylist((p) => (p ? { ...p, shuffle: v } : p));
      void updatePlaylist({ shuffle: v });
    },
    [updatePlaylist],
  );
  const setRepeat = useCallback(
    (v: boolean) => {
      setPlaylist((p) => (p ? { ...p, repeat: v } : p));
      void updatePlaylist({ repeat: v });
    },
    [updatePlaylist],
  );
  const setVolume = useCallback(
    (v: number) => {
      setPlaylist((p) => (p ? { ...p, volume: v } : p));
      void updatePlaylist({ volume: v });
    },
    [updatePlaylist],
  );

  /* ── Track mutations ── */

  const addTrack = useCallback(
    async (input: AddTrackInput): Promise<string> => {
      await ensurePlaylist();
      const id = newUuid();
      const sectionId = input.sectionId ?? null;
      // Compute position: end of the target section.
      const inSection = tracksRef.current.filter(
        (r) => (r.section_id ?? null) === sectionId,
      );
      const position = nextPosition(inSection);
      const row: TrackRow = {
        id,
        playlist_id: PLAYLIST_ID,
        section_id: sectionId,
        source: input.source,
        title: input.title,
        youtube_id: input.youtubeId ?? null,
        url: input.url ?? null,
        note: input.note ?? null,
        duration: input.duration ?? null,
        start_at: null,
        end_at: null,
        blob_name: input.blobName ?? null,
        position,
      };
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_tracks").insert(row);
        if (error) {
          // Offline fallback: stash locally so the user still sees it
          setTracksRows((prev) => [...prev, row]);
        }
      } catch {
        setTracksRows((prev) => [...prev, row]);
      }
      return id;
    },
    [ensurePlaylist],
  );

  const updateTrack = useCallback(
    async (id: string, patch: UpdateTrackInput): Promise<void> => {
      const dbPatch: Partial<TrackRow> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.note !== undefined) dbPatch.note = patch.note;
      if (patch.startAt !== undefined) dbPatch.start_at = patch.startAt;
      if (patch.endAt !== undefined) dbPatch.end_at = patch.endAt;
      if (patch.duration !== undefined) dbPatch.duration = patch.duration;
      if (patch.sectionId !== undefined) dbPatch.section_id = patch.sectionId;
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_tracks").update(dbPatch).eq("id", id);
        if (error) {
          // Offline fallback: still apply locally
          setTracksRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...dbPatch } : r)),
          );
        }
      } catch {
        setTracksRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...dbPatch } : r)),
        );
      }
    },
    [],
  );

  const renameTrack = useCallback(
    async (id: string, title: string): Promise<void> => {
      await updateTrack(id, { title });
    },
    [updateTrack],
  );

  const removeTrack = useCallback(async (id: string): Promise<void> => {
    try {
      const sb = supabase();
      const { error } = await sb.from("wedding_tracks").delete().eq("id", id);
      if (error) {
        setTracksRows((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      setTracksRows((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  const moveTrack = useCallback(
    async (id: string, targetId: string, where: "above" | "below"): Promise<void> => {
      const all = tracksRef.current;
      const target = all.find((r) => r.id === targetId);
      if (!target) return;
      const targetSection = target.section_id ?? null;
      const inSection = all
        .filter((r) => (r.section_id ?? null) === targetSection && r.id !== id)
        .sort((a, b) => a.position - b.position);
      const targetIdx = inSection.findIndex((r) => r.id === targetId);
      if (targetIdx < 0) return;

      let before: number | null;
      let after: number | null;
      if (where === "above") {
        before = targetIdx > 0 ? inSection[targetIdx - 1].position : null;
        after = inSection[targetIdx].position;
      } else {
        before = inSection[targetIdx].position;
        after = targetIdx + 1 < inSection.length ? inSection[targetIdx + 1].position : null;
      }
      const newPos = positionBetween(before, after);
      const patch: Partial<TrackRow> = {
        position: newPos,
        section_id: targetSection,
      };
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_tracks").update(patch).eq("id", id);
        if (error) {
          setTracksRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          );
        }
      } catch {
        setTracksRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
      }
    },
    [],
  );

  const moveTrackToSection = useCallback(
    async (id: string, sectionId: string | null): Promise<void> => {
      const inSection = tracksRef.current.filter(
        (r) => (r.section_id ?? null) === sectionId && r.id !== id,
      );
      const position = nextPosition(inSection);
      const patch: Partial<TrackRow> = {
        section_id: sectionId,
        position,
      };
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_tracks").update(patch).eq("id", id);
        if (error) {
          setTracksRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          );
        }
      } catch {
        setTracksRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
      }
    },
    [],
  );

  /* ── Section mutations ── */

  const addSection = useCallback(
    async (label: string): Promise<string> => {
      await ensurePlaylist();
      const id = newUuid();
      const position = nextPosition(sectionsRef.current);
      const row: SectionRow = {
        id,
        playlist_id: PLAYLIST_ID,
        label,
        position,
      };
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_sections").insert(row);
        if (error) {
          setSectionsRows((prev) => [...prev, row]);
        }
      } catch {
        setSectionsRows((prev) => [...prev, row]);
      }
      return id;
    },
    [ensurePlaylist],
  );

  const renameSection = useCallback(
    async (id: string, label: string): Promise<void> => {
      try {
        const sb = supabase();
        const { error } = await sb.from("wedding_sections").update({ label }).eq("id", id);
        if (error) {
          setSectionsRows((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)));
        }
      } catch {
        setSectionsRows((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)));
      }
    },
    [],
  );

  const removeSection = useCallback(async (id: string): Promise<void> => {
    // Unassign any tracks in this section first (so the FK delete cascades cleanly)
    const affected = tracksRef.current.filter((r) => r.section_id === id);
    try {
      const sb = supabase();
      if (affected.length > 0) {
        await sb.from("wedding_tracks").update({ section_id: null }).eq("section_id", id);
      }
      const { error } = await sb.from("wedding_sections").delete().eq("id", id);
      if (error) {
        setSectionsRows((prev) => prev.filter((r) => r.id !== id));
        setTracksRows((prev) =>
          prev.map((r) => (r.section_id === id ? { ...r, section_id: null } : r)),
        );
      }
    } catch {
      setSectionsRows((prev) => prev.filter((r) => r.id !== id));
      setTracksRows((prev) =>
        prev.map((r) => (r.section_id === id ? { ...r, section_id: null } : r)),
      );
    }
  }, []);

  const moveSection = useCallback(
    async (id: string, direction: -1 | 1): Promise<void> => {
      const sorted = [...sectionsRef.current].sort((a, b) => a.position - b.position);
      const idx = sorted.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= sorted.length) return;

      // Swap with neighbour — compute a position that puts us on the
      // other side of the neighbour.
      const neighbour = sorted[targetIdx];
      let before: number | null;
      let after: number | null;
      if (direction === -1) {
        before = targetIdx > 0 ? sorted[targetIdx - 1].position : null;
        after = neighbour.position;
      } else {
        before = neighbour.position;
        after = targetIdx + 1 < sorted.length ? sorted[targetIdx + 1].position : null;
      }
      const newPos = positionBetween(before, after);
      try {
        const sb = supabase();
        const { error } = await sb
          .from("wedding_sections")
          .update({ position: newPos })
          .eq("id", id);
        if (error) {
          setSectionsRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, position: newPos } : r)),
          );
        }
      } catch {
        setSectionsRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, position: newPos } : r)),
        );
      }
    },
    [],
  );

  /* ── Bulk ops ── */

  const clearAllTracks = useCallback(async (): Promise<void> => {
    try {
      const sb = supabase();
      const { error } = await sb
        .from("wedding_tracks")
        .delete()
        .eq("playlist_id", PLAYLIST_ID);
      if (error) {
        setTracksRows([]);
      }
    } catch {
      setTracksRows([]);
    }
  }, []);

  const replaceAll = useCallback(
    async (input: {
      name?: string;
      sections?: { label: string }[];
      tracks?: (AddTrackInput & { sectionIdx?: number | null })[];
      clear?: boolean;
    }): Promise<void> => {
      await ensurePlaylist();
      const sb = supabase();
      if (input.clear) {
        await sb.from("wedding_tracks").delete().eq("playlist_id", PLAYLIST_ID);
        await sb.from("wedding_sections").delete().eq("playlist_id", PLAYLIST_ID);
      }
      if (input.name) {
        await sb.from("wedding_playlists").update({ name: input.name }).eq("id", PLAYLIST_ID);
      }
      const sectionIds: string[] = [];
      if (input.sections && input.sections.length > 0) {
        const baseLen = input.clear ? 0 : sectionsRef.current.length;
        const rows: SectionRow[] = input.sections.map((s, i) => {
          const id = newUuid();
          sectionIds.push(id);
          return {
            id,
            playlist_id: PLAYLIST_ID,
            label: s.label,
            position: baseLen + i + 1,
          };
        });
        await sb.from("wedding_sections").insert(rows);
      }
      if (input.tracks && input.tracks.length > 0) {
        const trackRows: TrackRow[] = input.tracks.map((tr, i) => {
          const sectionId =
            tr.sectionIdx != null && tr.sectionIdx >= 0 && tr.sectionIdx < sectionIds.length
              ? sectionIds[tr.sectionIdx]
              : tr.sectionId ?? null;
          return {
            id: newUuid(),
            playlist_id: PLAYLIST_ID,
            section_id: sectionId,
            source: tr.source,
            title: tr.title,
            youtube_id: tr.youtubeId ?? null,
            url: tr.url ?? null,
            note: tr.note ?? null,
            duration: tr.duration ?? null,
            start_at: null,
            end_at: null,
            blob_name: tr.blobName ?? null,
            position: i + 1,
          };
        });
        await sb.from("wedding_tracks").insert(trackRows);
      }
    },
    [ensurePlaylist],
  );

  return {
    loaded,
    status,
    tracks,
    sections,
    settings,
    setName,
    setAutoplay,
    setShuffle,
    setRepeat,
    setVolume,
    addTrack,
    updateTrack,
    removeTrack,
    moveTrack,
    moveTrackToSection,
    renameTrack,
    addSection,
    renameSection,
    removeSection,
    moveSection,
    replaceAll,
    clearAllTracks,
  };
}

/* ─────────────────────── Playability helper ─────────────────────── */

/**
 * A track is playable on this device when:
 * - it's a YouTube embed (always streamable), or
 * - it's an upload AND we have the blob in local IndexedDB for it.
 *
 * Uploaded blobs are device-local — remote collaborators see the
 * track row but can't play the audio. Use this to disable play
 * affordances for those rows.
 */
export function isTrackPlayable(track: Track, hasLocalBlob: boolean): boolean {
  if (track.source === "youtube") return true;
  return hasLocalBlob;
}
