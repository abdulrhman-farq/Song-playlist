/**
 * Shared YouTube IFrame API typings and loader.
 *
 * The IFrame API can only be loaded once per document; if multiple
 * components race to inject the <script> tag we'd lose
 * onYouTubeIframeAPIReady wiring. Keeping a single shared promise
 * here means every caller awaits the same load.
 */

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (s: number, allowSeekAhead?: boolean) => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (
    arg:
      | string
      | { videoId: string; startSeconds?: number; endSeconds?: number },
  ) => void;
  cueVideoById: (
    arg:
      | string
      | { videoId: string; startSeconds?: number; endSeconds?: number },
  ) => void;
  destroy: () => void;
}

export interface YTNamespace {
  Player: new (
    target: HTMLElement | string,
    opts: Record<string, unknown>,
  ) => YTPlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
    UNSTARTED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<YTNamespace> | null = null;

export function loadYouTubeAPI(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (ytReady) return ytReady;
  ytReady = new Promise<YTNamespace>((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    if (!document.querySelector('script[data-wp-yt-api="1"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.wpYtApi = "1";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
  });
  return ytReady;
}

/**
 * Probe a single YouTube video by spinning up a hidden cued (not
 * playing) IFrame player and listening for `onReady` vs `onError`.
 *
 * Error codes returned by the IFrame API:
 *   - 2   invalid id format
 *   - 5   HTML5 player error
 *   - 100 video not found / private / removed
 *   - 101 embedding not allowed by the uploader
 *   - 150 same as 101 (different surface)
 */
export type EmbedCheckResult =
  | { kind: "ok" }
  | { kind: "invalid" }
  | { kind: "removed" }
  | { kind: "embed-disabled" }
  | { kind: "error"; code: number };

export async function checkEmbed(
  videoId: string,
  timeoutMs = 6000,
): Promise<EmbedCheckResult> {
  if (typeof window === "undefined") {
    return { kind: "error", code: -1 };
  }
  const YT = await loadYouTubeAPI();
  return new Promise<EmbedCheckResult>((resolve) => {
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(host);
    let settled = false;
    let player: YTPlayerInstance | null = null;
    const finish = (res: EmbedCheckResult) => {
      if (settled) return;
      settled = true;
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      if (host.parentNode) host.parentNode.removeChild(host);
      resolve(res);
    };
    const timer = window.setTimeout(() => {
      finish({ kind: "error", code: -2 });
    }, timeoutMs);
    try {
      player = new YT.Player(host, {
        height: "1",
        width: "1",
        videoId,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            window.clearTimeout(timer);
            finish({ kind: "ok" });
          },
          onError: (e: { data: number }) => {
            window.clearTimeout(timer);
            if (e.data === 2) finish({ kind: "invalid" });
            else if (e.data === 100) finish({ kind: "removed" });
            else if (e.data === 101 || e.data === 150)
              finish({ kind: "embed-disabled" });
            else finish({ kind: "error", code: e.data });
          },
        },
      });
    } catch {
      window.clearTimeout(timer);
      finish({ kind: "error", code: -3 });
    }
  });
}

/**
 * Validate every YouTube id in `ids` with a small concurrency window
 * so we don't hammer the user's browser with hundreds of iframes.
 */
export async function checkEmbedsBatch(
  ids: string[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 3,
): Promise<Map<string, EmbedCheckResult>> {
  const out = new Map<string, EmbedCheckResult>();
  const queue = ids.slice();
  let done = 0;
  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      if (!id) break;
      try {
        const res = await checkEmbed(id);
        out.set(id, res);
      } catch {
        out.set(id, { kind: "error", code: -4 });
      }
      done += 1;
      onProgress?.(done, ids.length);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, worker);
  await Promise.all(workers);
  return out;
}
