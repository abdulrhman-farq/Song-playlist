import type { GuestDoc, GuestEntry } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:guests";
const SEED_VERSION = 1;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadGuests(): GuestDoc | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDoc;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    if ((parsed.version ?? 0) < SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuests(doc: GuestDoc): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...doc, version: SEED_VERSION }),
    );
  } catch {
    /* quota — ignore */
  }
}

/**
 * Default seed — empty list so the bride builds her own guest book.
 * (The other features all ship with the couple's real data; the guest
 * list is too personal to seed.)
 */
export function defaultGuests(): GuestDoc {
  return {
    version: SEED_VERSION,
    entries: [],
  };
}

export function newGuest(): GuestEntry {
  return { id: uid(), name: "", status: "pending", partySize: 1 };
}

/**
 * Build the WhatsApp share URL for a given guest. Falls back to the
 * generic chat URL when no phone is set so the host can pick the
 * contact manually inside WhatsApp.
 */
export function whatsappShareUrl(
  guest: GuestEntry,
  message: string,
): string {
  const text = encodeURIComponent(message);
  if (!guest.phone) return `https://wa.me/?text=${text}`;
  // Strip non-digits from phone so wa.me accepts it.
  const phone = guest.phone.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Parse a free-form pasted list into guest entries. Accepts:
 *  - One name per line (minimum)
 *  - Comma / tab / pipe separated: name, phone, partySize, side, note
 * Empty lines and the first line if it looks like a header (contains
 * "name" / "اسم") are skipped.
 */
export function parseBulkGuests(raw: string): GuestEntry[] {
  const out: GuestEntry[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Skip a header row if first line looks like one
    if (
      i === 0 &&
      /\b(name|اسم|guest|مدعو)\b/i.test(line) &&
      /[,|\t]/.test(line)
    ) {
      continue;
    }
    const cells = line
      .split(/\s*[,|\t]\s*/)
      .map((c) => c.trim())
      .filter(Boolean);
    const [name, phone, partySize, side, note] = cells;
    if (!name) continue;
    const entry: GuestEntry = {
      id: uid(),
      name,
      status: "pending",
      partySize: 1,
    };
    if (phone) entry.phone = phone;
    if (partySize) {
      const n = parseInt(partySize, 10);
      if (Number.isFinite(n) && n > 0) entry.partySize = n;
    }
    if (side === "bride" || side === "groom" || side === "both") {
      entry.side = side;
    } else if (side === "العروس") {
      entry.side = "bride";
    } else if (side === "العريس") {
      entry.side = "groom";
    }
    if (note) entry.note = note;
    out.push(entry);
  }
  return out;
}
