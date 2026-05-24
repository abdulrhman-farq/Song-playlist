/**
 * Extract the 11-character video id from any common YouTube URL shape.
 * Returns null if no id can be found.
 */
export function parseYouTubeId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("youtu.be")) {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host.includes("youtube.com") || host.includes("music.youtube.com")) {
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = url.pathname.match(/\/(embed|shorts)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  }
  return null;
}

export function ytThumb(id: string | null | undefined): string | null {
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function ytThumbSmall(id: string | null | undefined): string | null {
  return id ? `https://i.ytimg.com/vi/${id}/default.jpg` : null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Fetch a human-readable title for a YouTube video using the public
 * oEmbed endpoint (no API key required). Returns null on any failure.
 */
export async function fetchYouTubeTitle(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        youtubeWatchUrl(id),
      )}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || null;
  } catch {
    return null;
  }
}
