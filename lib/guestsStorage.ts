import type { GuestDoc, GuestEntry, GuestStatus } from "@/types";
import { uid } from "@/lib/format";

const KEY = "wedding-playlist:v1:guests";
/**
 * Bump whenever defaultGuests() changes meaningfully. v2 ships the
 * couple's real Mazoom guest list (60 invitees with phone + RSVP
 * status) so the bride doesn't have to type them in.
 */
const SEED_VERSION = 2;

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
 * Real wedding guest list, exported from the couple's Mazoom
 * dashboard (beta.mazoom.sa/67394) on 2026-05-15. 60 invitees,
 * mostly extended family + close friends. Status reflects the live
 * RSVP at export time: attending / declined / pending.
 */
export function defaultGuests(): GuestDoc {
  const mk = (
    name: string,
    status: GuestStatus,
    partySize: number,
    phone: string | undefined,
  ): GuestEntry => ({
    id: uid(),
    name,
    status,
    partySize,
    ...(phone ? { phone } : {}),
  });
  return {
    version: SEED_VERSION,
    entries: [
      mk("المكرمة رويدا المحيسن", "attending", 1, "966539008422"),
      mk("المكرمة يارا الدخيل", "declined", 1, "966551314144"),
      mk("المكرمة وفا الفهد", "attending", 1, "966564880089"),
      mk("المكرمة وفا السويل", "pending", 1, "966534033333"),
      mk("المكرمة وسميه العامر", "attending", 1, "966504454985"),
      mk("المكرمة وجد الحمدان", "attending", 1, "966553051216"),
      mk("المكرمة والدة طارق القحطاني", "pending", 1, "966508888558"),
      mk("المكرمة هدى العتيبي", "attending", 1, "966508540400"),
      mk("المكرمة نوره الصفار", "attending", 1, "966583882877"),
      mk("المكرمة نوره الدويهيس", "pending", 1, "966503419991"),
      mk("المكرمة نوره الحمدان", "pending", 1, "966503913615"),
      mk("المكرمة نوال العجب", "attending", 1, "966555289098"),
      mk("المكرمة نوال السليم", "attending", 1, "966504886783"),
      mk("المكرمة نوال الزامل", "attending", 1, "966555222603"),
      mk("المكرمة نسيم الفهد", "attending", 1, "966505467423"),
      mk("المكرمة ندى الناجم", "attending", 3, "966550322627"),
      mk("المكرمة نازك الغفيص", "attending", 1, "966505482092"),
      mk("المكرمة ناديه البسام", "pending", 1, "966567333336"),
      mk("المكرمة موضي النقيدان", "attending", 1, "966543287228"),
      mk("المكرمة موضي العميل", "attending", 1, "966503201511"),
      mk("المكرمة موضي الراشد", "attending", 1, "966505206207"),
      mk("المكرمة مها الغثبر", "attending", 1, "966500051231"),
      mk("المكرمة منيره المزيني", "attending", 1, "966504284808"),
      mk("المكرمة منيره السديري", "attending", 1, "966555428690"),
      mk("المكرمة منى السويل", "attending", 1, "966504132510"),
      mk("المكرمة ملاك الفهد", "declined", 1, "966536682288"),
      mk("المكرمة ملاك البليهد", "attending", 1, "966506338078"),
      mk("المكرمة مشاعل العماج", "attending", 1, "966562337969"),
      mk("المكرمة مزنه الصقعبي", "declined", 3, "966505110990"),
      mk("المكرمة مريم المديني", "attending", 1, "966505427827"),
      mk("المكرمة مريم الجعيب", "declined", 1, "966503147457"),
      mk("المكرمة ليلى القاسم", "attending", 1, "966555532333"),
      mk("المكرمة لميا العثمان", "pending", 1, "966554471141"),
      mk("المكرمة فوزيه العبدالسلام", "attending", 1, "966555106096"),
      mk("المكرمة فاطمه العامر", "attending", 1, "966506152585"),
      mk("المكرمة غزيل النقيدان", "attending", 1, "966542504504"),
      mk("المكرمة عليا العامر", "attending", 1, "966544499884"),
      mk("المكرمة عزه الشهري", "attending", 1, "966553739400"),
      mk("المكرمة شهد النقيدان", "pending", 1, "966536937274"),
      mk("المكرمة حرم خالد الخلف", "pending", 1, "966555414554"),
      mk("المكرمة سميرة الجهني", "attending", 1, "966504153498"),
      mk("المكرمة سلمى الطخيم", "attending", 1, "966504434450"),
      mk("المكرمة سعاد الناجم", "attending", 1, "966506846002"),
      mk("المكرمة لطيفه بنت صالح المحيسن", "attending", 1, "966555431366"),
      mk("المكرمة ساره بنت صالح المحيسن", "attending", 1, "966559220888"),
      mk("المكرمة غالية بنت فهد المحيسن", "pending", 1, "966550144898"),
      mk("المكرمة حرم عبد الرحمن بن صالح المحيسن", "attending", 3, "966547777580"),
      mk("المكرمة هيفاء الشويمان", "attending", 1, "966505455737"),
      mk("المكرمة حرم فهد بن صالح المحيسن", "attending", 2, "966531555000"),
      mk("المكرمة حرم على الكريدا", "attending", 1, "966555807298"),
      mk("المكرمة حرم خالد بن صالح المحيسن", "attending", 1, "966556430943"),
      mk("المكرمة حرم صالح بن خالد المحيسن", "attending", 1, "966566651367"),
      mk("المكرمة والدة طلال الباحوث", "attending", 1, "966545656108"),
      mk("المكرمة رويدا الغليقة", "attending", 1, "966559881083"),
      mk("المكرمة عهود بنت عبد المحسن الشعيل", "attending", 1, "966557786807"),
      mk("المكرمة ريم النقيدان", "attending", 1, "966554959565"),
      mk("المكرمة رقيه العيدي", "attending", 1, "966553303394"),
      mk("المكرمة عواطف النصبان", "attending", 3, "966503481714"),
      mk("المكرمة نوره الحميد", "attending", 1, "966583556550"),
      mk("المكرمة أسماء بنت علي الياسين", "attending", 1, "966506274989"),
    ],
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
