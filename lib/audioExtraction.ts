/**
 * Client-side audio extraction.
 *
 * Given a File that may be either pure audio (mp3, wav, m4a, …) or a video
 * container (mp4, mov, webm, mkv, m4v, avi), return a Blob that's playable
 * via <audio>. Audio files pass through unchanged. Video files are decoded
 * by the browser and re-encoded as a fresh audio blob — no server, no
 * ffmpeg.wasm download, no extra deps.
 *
 * Strategy (in order):
 *   1. If it's already audio, return as-is. Fast path.
 *   2. Try `AudioContext.decodeAudioData` on the file's raw bytes. For most
 *      mp4/m4v/mov files the browser can decode the AAC audio track directly
 *      this way — much faster than realtime, no playback needed. Encode the
 *      resulting AudioBuffer as a 16-bit PCM WAV.
 *   3. Fallback: stream the file through an offscreen <video>, route audio
 *      via MediaElementAudioSource + MediaStreamAudioDestination, capture
 *      with MediaRecorder as audio/webm;codecs=opus. Runs at 1× wall-clock.
 */

export const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|ogg|aac|flac)$/i;
export const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|mkv|m4v|avi)$/i;

export interface ExtractedAudio {
  /** The resulting audio blob, safe to store and feed to <audio>. */
  blob: Blob;
  /** Filename to suggest for the blob (e.g. "clip.mp4" → "clip.audio.wav"). */
  outputName: string;
  /** True if extraction ran (false = original audio was returned as-is). */
  extracted: boolean;
}

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.test(file.name);
}

export function isAudioFile(file: File): boolean {
  if (file.type && file.type.startsWith("audio/")) return true;
  return AUDIO_EXTENSIONS.test(file.name);
}

/** Accept either audio OR video. Used by drop-zone filters. */
export function isSupportedMediaFile(file: File): boolean {
  return isAudioFile(file) || isVideoFile(file);
}

function swapExt(name: string, newExt: string): string {
  const stripped = name.replace(/\.[^./\\]+$/, "");
  return `${stripped}.audio.${newExt}`;
}

/**
 * Main entry point. `onProgress` reports 0..1 during extraction; called once
 * with 1 after a fast-path audio file. Throws on unrecoverable failure.
 */
export async function extractAudio(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ExtractedAudio> {
  if (isAudioFile(file)) {
    onProgress?.(1);
    return { blob: file, outputName: file.name, extracted: false };
  }
  if (!isVideoFile(file)) {
    // Unknown type — try decodeAudioData; if that fails, throw.
    return extractViaDecodeAudioData(file, onProgress).catch(() => {
      throw new Error("Unsupported file type");
    });
  }

  // Video: try fast WebAudio decode first; fall back to MediaRecorder capture.
  try {
    return await extractViaDecodeAudioData(file, onProgress);
  } catch {
    return await extractViaMediaRecorder(file, onProgress);
  }
}

/* ─── Strategy 1: AudioContext.decodeAudioData → WAV ─────────────────── */

async function extractViaDecodeAudioData(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ExtractedAudio> {
  onProgress?.(0.02);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(0.15);

  const AudioCtor =
    typeof window !== "undefined"
      ? (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
      : undefined;
  if (!AudioCtor) throw new Error("AudioContext not available");

  const ctx = new AudioCtor();
  let audioBuffer: AudioBuffer;
  try {
    // decodeAudioData copies the buffer internally; some engines also detach
    // the input. Slice defensively so callers retain the original File bytes.
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    // Closing is async on some platforms — fire-and-forget.
    void ctx.close().catch(() => {});
  }
  onProgress?.(0.65);

  const wav = audioBufferToWav(audioBuffer);
  onProgress?.(1);
  return {
    blob: new Blob([wav], { type: "audio/wav" }),
    outputName: swapExt(file.name, "wav"),
    extracted: true,
  };
}

/** Encode an AudioBuffer as a 16-bit PCM WAV (little-endian, interleaved). */
function audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
  const numChannels = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const numFrames = buf.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const out = new ArrayBuffer(bufferSize);
  const view = new DataView(out);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels and convert float [-1,1] → int16
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buf.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let s = channels[c][i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      // Symmetric mapping: 0 → 0, +1 → 32767, -1 → -32768
      const int16 = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  return out;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/* ─── Strategy 2: <video> → MediaRecorder → audio/webm ───────────────── */

async function extractViaMediaRecorder(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ExtractedAudio> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder not available");
  }
  // Pick the best supported codec. Opus is widely supported; fall back to
  // generic webm if needed.
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) throw new Error("No supported recorder mime type");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true; // we capture via WebAudio graph, not the element's output
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  // Keep it offscreen but attached (some browsers stall otherwise).
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  document.body.appendChild(video);

  const cleanup = () => {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
    try {
      video.removeAttribute("src");
      video.load();
    } catch {
      /* ignore */
    }
    if (video.parentNode) video.parentNode.removeChild(video);
    URL.revokeObjectURL(url);
  };

  try {
    await new Promise<void>((res, rej) => {
      const onErr = () => rej(new Error("Video load error"));
      if (video.readyState >= 1) {
        res();
        return;
      }
      video.addEventListener("loadedmetadata", () => res(), { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) throw new Error("AudioContext not available");

    const ctx = new AudioCtor();
    const source = ctx.createMediaElementSource(video);
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);
    // We deliberately do NOT connect to ctx.destination — silent capture.

    const recorder = new MediaRecorder(dest.stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const total = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : 0;
    let progressInterval: number | null = null;
    const updateProgress = () => {
      if (total > 0) {
        const pct = Math.min(0.98, video.currentTime / total);
        onProgress?.(pct);
      }
    };

    const finished = new Promise<Blob>((res, rej) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        res(blob);
      };
      recorder.onerror = (ev: Event) => rej(ev);
    });

    recorder.start(500);
    onProgress?.(0.02);
    try {
      await video.play();
    } catch (err) {
      recorder.stop();
      void ctx.close().catch(() => {});
      throw err;
    }
    progressInterval = window.setInterval(updateProgress, 250);

    await new Promise<void>((res) => {
      const onEnded = () => res();
      video.addEventListener("ended", onEnded, { once: true });
    });

    if (progressInterval != null) window.clearInterval(progressInterval);
    if (recorder.state !== "inactive") recorder.stop();
    const blob = await finished;
    void ctx.close().catch(() => {});

    onProgress?.(1);
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    return {
      blob,
      outputName: swapExt(file.name, ext),
      extracted: true,
    };
  } finally {
    cleanup();
  }
}
