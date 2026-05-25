/**
 * Client-side audio clip merger for the DJ workflow.
 *
 * - Takes N clips (each = source uploaded track + start/end in seconds)
 * - Decodes each via Web Audio API
 * - Slices to the requested time range
 * - Concatenates with an optional triangular cross-fade between adjacent clips
 * - Encodes the result as a 16-bit PCM WAV Blob
 *
 * Pure browser — no ffmpeg, no server. Works on every modern browser
 * with `AudioContext` + `decodeAudioData`. YouTube tracks cannot be
 * merged (their raw audio is not exposed by the IFrame API); attempt
 * to merge them throws.
 */

export interface MergeClip {
  /** Source uploaded-track ID. Used to look up the blob. */
  trackId: string;
  /** Friendly label, used in error messages. */
  title: string;
  /** Start time within the source, seconds (≥ 0). */
  startAt: number;
  /** End time within the source, seconds (must be > startAt). */
  endAt: number;
}

export interface MergeOptions {
  /** Cross-fade duration between adjacent clips, seconds. 0 = hard cut. */
  crossfadeSeconds?: number;
  /** Output sample rate. Falls back to the first clip's rate. */
  sampleRate?: number;
  /** Force mono (1) or stereo (2). Defaults to max channels among inputs (capped to 2). */
  channels?: 1 | 2;
}

export type ProgressFn = (pct: number, stage: string) => void;

export interface MergeResult {
  /** WAV-encoded blob ready to be stored / played. */
  blob: Blob;
  /** Duration of the merged audio, in seconds. */
  duration: number;
  /** Computed sample rate. */
  sampleRate: number;
  /** Computed channel count. */
  channels: number;
}

/**
 * Merge an ordered list of audio clips into a single WAV blob.
 *
 * @param clips Source clips in playback order.
 * @param getBlob Async lookup — pass the same getter used by the player
 *                (probably wraps IndexedDB `getBlob(trackId)`).
 * @param options Cross-fade and rate overrides.
 * @param onProgress Optional progress callback (0..1 with a stage label).
 */
export async function mergeClips(
  clips: MergeClip[],
  getBlob: (trackId: string) => Promise<Blob | null>,
  options: MergeOptions = {},
  onProgress?: ProgressFn,
): Promise<MergeResult> {
  if (clips.length === 0) {
    throw new Error("No clips to merge");
  }
  for (const c of clips) {
    if (!Number.isFinite(c.startAt) || c.startAt < 0) {
      throw new Error(`Clip "${c.title}" has invalid start time`);
    }
    if (!Number.isFinite(c.endAt) || c.endAt <= c.startAt) {
      throw new Error(`Clip "${c.title}" has invalid end time`);
    }
  }

  // ── 1. Decode every clip into an in-memory AudioBuffer ──────────
  const Ctx =
    typeof window !== "undefined"
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : undefined;
  if (!Ctx) throw new Error("Web Audio API not available");
  // Decoding context — sample rate is picked later from the source.
  const decodeCtx = new Ctx();
  const decoded: AudioBuffer[] = [];

  try {
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const blob = await getBlob(clip.trackId);
      if (!blob) {
        throw new Error(`Audio for "${clip.title}" is not on this device`);
      }
      const arrayBuf = await blob.arrayBuffer();
      const full = await decodeCtx.decodeAudioData(arrayBuf.slice(0));

      // Slice [startAt, endAt] into a fresh buffer
      const startSample = Math.max(0, Math.floor(clip.startAt * full.sampleRate));
      const endSample = Math.min(full.length, Math.floor(clip.endAt * full.sampleRate));
      const length = Math.max(0, endSample - startSample);
      if (length === 0) {
        throw new Error(`Clip "${clip.title}" is empty after trimming`);
      }
      const sliced = decodeCtx.createBuffer(
        full.numberOfChannels,
        length,
        full.sampleRate,
      );
      for (let ch = 0; ch < full.numberOfChannels; ch++) {
        sliced.copyToChannel(
          full.getChannelData(ch).subarray(startSample, endSample),
          ch,
        );
      }
      decoded.push(sliced);
      onProgress?.((i + 1) / clips.length * 0.45, "decoding");
    }
  } finally {
    try {
      await decodeCtx.close();
    } catch {
      /* some browsers throw on close */
    }
  }

  // ── 2. Plan the merge ──────────────────────────────────────────
  const sampleRate =
    options.sampleRate ?? decoded[0].sampleRate ?? 44100;
  const channels =
    options.channels ??
    (Math.min(2, Math.max(...decoded.map((b) => b.numberOfChannels))) as 1 | 2);
  const crossfadeSec = Math.max(0, options.crossfadeSeconds ?? 0);

  // Resample any clip whose rate doesn't match by linear interpolation.
  // OfflineAudioContext does proper resampling — use it.
  const resampled: AudioBuffer[] = [];
  for (let i = 0; i < decoded.length; i++) {
    const buf = decoded[i];
    if (buf.sampleRate === sampleRate && buf.numberOfChannels === channels) {
      resampled.push(buf);
      continue;
    }
    const targetLength = Math.ceil((buf.length / buf.sampleRate) * sampleRate);
    const off = new OfflineAudioContext(channels, targetLength, sampleRate);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start(0);
    const out = await off.startRendering();
    resampled.push(out);
    onProgress?.(0.45 + ((i + 1) / decoded.length) * 0.15, "resampling");
  }

  // ── 3. Compute output length with cross-fade overlap ───────────
  const xfadeSamples = Math.floor(crossfadeSec * sampleRate);
  let totalLength = 0;
  for (let i = 0; i < resampled.length; i++) {
    totalLength += resampled[i].length;
    if (i > 0) {
      const overlap = Math.min(
        xfadeSamples,
        resampled[i].length,
        resampled[i - 1].length,
      );
      totalLength -= overlap;
    }
  }

  // ── 4. Composite into the output buffer ────────────────────────
  // Use a plain typed-array per channel — simpler than another AudioBuffer.
  const out: Float32Array[] = [];
  for (let c = 0; c < channels; c++) out.push(new Float32Array(totalLength));

  let writeOffset = 0;
  for (let i = 0; i < resampled.length; i++) {
    const buf = resampled[i];
    const overlapIn =
      i === 0 ? 0 : Math.min(xfadeSamples, buf.length, resampled[i - 1].length);
    const overlapOut =
      i === resampled.length - 1
        ? 0
        : Math.min(xfadeSamples, buf.length, resampled[i + 1].length);

    const placeAt = writeOffset - overlapIn;

    for (let c = 0; c < channels; c++) {
      const src =
        c < buf.numberOfChannels
          ? buf.getChannelData(c)
          : buf.getChannelData(buf.numberOfChannels - 1); // mono → stereo dup
      const dst = out[c];

      for (let j = 0; j < buf.length; j++) {
        let sample = src[j];
        // Fade in over the leading overlapIn samples
        if (j < overlapIn) {
          const fade = j / overlapIn;
          sample *= fade;
        }
        // Fade out over the trailing overlapOut samples
        const tailStart = buf.length - overlapOut;
        if (overlapOut > 0 && j >= tailStart) {
          const fade = (buf.length - j) / overlapOut;
          sample *= fade;
        }
        const pos = placeAt + j;
        if (pos >= 0 && pos < totalLength) {
          dst[pos] += sample;
        }
      }
    }
    writeOffset = placeAt + buf.length;
    onProgress?.(0.6 + ((i + 1) / resampled.length) * 0.3, "merging");
  }

  // Soft clip in case overlaps push past ±1
  for (let c = 0; c < channels; c++) {
    const data = out[c];
    for (let i = 0; i < data.length; i++) {
      const x = data[i];
      data[i] = x > 1 ? 1 : x < -1 ? -1 : x;
    }
  }

  // ── 5. Encode WAV ──────────────────────────────────────────────
  onProgress?.(0.95, "encoding");
  const wav = encodeWAV(out, sampleRate);

  return {
    blob: new Blob([wav], { type: "audio/wav" }),
    duration: totalLength / sampleRate,
    sampleRate,
    channels,
  };
}

/* ── 16-bit PCM WAV encoder ─────────────────────────────────────── */

function encodeWAV(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const numSamples = channels[0].length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels and convert float→int16
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      const int = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, int, true);
      offset += 2;
    }
  }
  return buffer;
}

function writeString(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
