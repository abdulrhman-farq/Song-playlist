export function fmtTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—:—";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function uid(): string {
  const r =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((b) => b.toString(36))
          .join("")
          .slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `t_${r}${Date.now().toString(36).slice(-4)}`;
}

export function titleFromFilename(name: string): string {
  if (!name) return "Untitled";
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_\-]+/g, " ")
      .trim() || "Untitled"
  );
}

export function probeAudioDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      resolve(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
  });
}
