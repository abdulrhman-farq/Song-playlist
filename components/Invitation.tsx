"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultGuests,
  loadGuests,
  saveGuests,
} from "@/lib/guestsStorage";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { GuestEntry, GuestStatus, Language } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  /**
   * When set, the card runs in "guest mode": no editor chrome, the
   * RSVP form is visible, and the form writes the reply back to the
   * guestbook entry whose id matches.
   */
  guestId?: string;
  /** Show the share controls + close button (host-side preview). */
  hostMode?: boolean;
  /** Close handler for the host-mode modal. */
  onClose?: () => void;
}

/**
 * The wedding invitation card — shared with guests via a deep link
 * (?g={guestId}). Reads the guest list from localStorage to find the
 * guest's name and current RSVP, lets them update the reply, and
 * writes it back so the bride sees it on next refresh.
 *
 * Visually anchored to the peach-on-warm-sepia palette used elsewhere
 * in the app, with serif display type for the names + date and
 * sans-serif for body copy.
 */
export default function Invitation({
  lang,
  t,
  guestId,
  hostMode = false,
  onClose,
}: Props) {
  const direction = dirOf(lang);
  const [doc, setDoc] = useState(() => defaultGuests());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadGuests();
    if (stored) setDoc(stored);
    setHydrated(true);
  }, []);

  const guest = useMemo<GuestEntry | null>(() => {
    if (!guestId) return null;
    return doc.entries.find((g) => g.id === guestId) ?? null;
  }, [doc.entries, guestId]);

  function reply(status: GuestStatus) {
    if (!guest) return;
    setDoc((prev) => {
      const next = {
        ...prev,
        entries: prev.entries.map((g) =>
          g.id === guest.id ? { ...g, status } : g,
        ),
      };
      saveGuests(next);
      return next;
    });
    const label =
      status === "attending"
        ? t.invitationRsvpThanks
        : status === "declined"
          ? t.invitationRsvpDeclined
          : t.invitationRsvpMaybe;
    setToast(label);
    window.setTimeout(() => setToast(null), 3500);
  }

  function shareLink(): string {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.pathname = "/invite";
    if (guest) url.searchParams.set("g", guest.id);
    else url.searchParams.delete("g");
    return url.toString();
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareLink());
      setToast(t.invitationCopied);
      window.setTimeout(() => setToast(null), 3000);
    } catch {
      setToast(t.invitationCopyFailed);
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  // Wedding day countdown
  const countdown = useMemo(() => {
    const target = new Date("2026-05-29T20:00:00+03:00");
    const ms = target.getTime() - Date.now();
    if (ms <= 0) return null;
    const d = Math.floor(ms / 86_400_000);
    if (d === 0) return t.invitationCountdownToday;
    if (d === 1) return t.invitationCountdownTomorrow;
    return `${d} ${lang === "ar" ? "ليالٍ تفصلنا" : "nights to go"}`;
  }, [lang, t.invitationCountdownToday, t.invitationCountdownTomorrow]);

  return (
    <div
      dir={direction}
      className={
        hostMode
          ? "fixed inset-0 z-[60] flex items-stretch justify-center fade-up"
          : "min-h-screen flex items-center justify-center"
      }
      style={
        hostMode
          ? {
              background: "rgba(8, 5, 4, 0.78)",
              backdropFilter: "blur(8px)",
            }
          : {
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(216,146,116,0.18) 0%, transparent 55%), linear-gradient(180deg, rgba(38, 28, 22, 1) 0%, rgba(26, 19, 16, 1) 100%)",
              padding: "16px",
            }
      }
      onClick={hostMode ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] my-4 mx-3 rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.99) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.28)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.75)",
        }}
      >
        {/* Top ornament */}
        <div
          aria-hidden
          style={{
            height: 2,
            background:
              "linear-gradient(90deg, transparent 0%, var(--gold-400) 50%, transparent 100%)",
          }}
        />

        <div style={{ padding: "32px 24px 24px" }}>
          {/* Eyebrow */}
          <div
            className="text-center eyebrow"
            style={{
              color: "var(--gold-300)",
              letterSpacing: "0.32em",
              fontSize: 11,
            }}
          >
            {t.invitationEyebrow}
          </div>

          {/* Couple names */}
          <h1
            className="text-center font-display italic mt-4"
            style={{
              color: "var(--text)",
              fontSize: "clamp(28px, 6vw, 40px)",
              lineHeight: 1.15,
              letterSpacing: "0.02em",
            }}
          >
            {lang === "ar" ? t.coupleAr : t.coupleLatin}
          </h1>
          <div
            className="text-center mt-2"
            style={{
              color: "var(--gold-300)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 16,
              letterSpacing: "0.04em",
            }}
          >
            {lang === "ar" ? t.coupleLatin : t.coupleAr}
          </div>

          {/* Ornament divider */}
          <div
            aria-hidden
            className="mx-auto my-6 flex items-center justify-center gap-3"
            style={{ color: "var(--gold-400)" }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(216,146,116,0.6))",
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                opacity="0.5"
              />
            </svg>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(270deg, transparent, rgba(216,146,116,0.6))",
              }}
            />
          </div>

          {/* Date + venue */}
          <div className="text-center" style={{ lineHeight: 1.6 }}>
            <div
              className="font-display italic"
              style={{
                color: "var(--text)",
                fontSize: 22,
                letterSpacing: "0.02em",
              }}
            >
              {t.invitationDateLine}
            </div>
            <div
              className="mt-1"
              style={{ color: "var(--text-muted)", fontSize: 13 }}
            >
              {t.invitationVenue}
            </div>
            {countdown && (
              <div
                className="mt-3 inline-block rounded-full"
                style={{
                  color: "var(--gold-300)",
                  background: "rgba(216, 146, 116, 0.10)",
                  border: "1px solid rgba(216, 146, 116, 0.28)",
                  padding: "4px 14px",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                }}
              >
                {countdown}
              </div>
            )}
          </div>

          {/* Message */}
          <p
            className="text-center mt-6 font-display italic"
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {t.invitationMessage}
          </p>

          {/* Guest greeting + RSVP (only when invited via link) */}
          {guest && hydrated && (
            <div
              className="mt-6 rounded-xl p-4"
              style={{
                background: "rgba(216, 146, 116, 0.06)",
                border: "1px solid rgba(216, 146, 116, 0.22)",
              }}
            >
              <div
                className="text-center"
                style={{ color: "var(--text-muted)", fontSize: 12 }}
              >
                {t.invitationGreeting}
              </div>
              <div
                className="text-center font-display italic mt-1"
                style={{ color: "var(--text)", fontSize: 18 }}
              >
                {guest.name}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <RsvpButton
                  active={guest.status === "attending"}
                  onClick={() => reply("attending")}
                  label={t.invitationWillAttend}
                  tone="primary"
                />
                <RsvpButton
                  active={guest.status === "maybe"}
                  onClick={() => reply("maybe")}
                  label={t.invitationMaybe}
                />
                <RsvpButton
                  active={guest.status === "declined"}
                  onClick={() => reply("declined")}
                  label={t.invitationCantAttend}
                />
              </div>
            </div>
          )}

          {/* Host controls (preview mode) */}
          {hostMode && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={copyShareLink}
                className="text-[12px] font-semibold"
                style={{
                  background: "var(--gold-400)",
                  color: "#1a1310",
                  borderRadius: 999,
                  padding: "8px 18px",
                  cursor: "pointer",
                }}
              >
                {t.invitationCopyLink}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[12px]"
                style={{
                  color: "var(--text-muted)",
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
          )}
        </div>

        {/* Bottom ornament */}
        <div
          aria-hidden
          style={{
            height: 2,
            background:
              "linear-gradient(90deg, transparent 0%, var(--gold-400) 50%, transparent 100%)",
          }}
        />

        {/* Toast */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="absolute left-1/2 fade-up"
            style={{
              bottom: 14,
              transform: "translateX(-50%)",
              background: "rgba(26, 19, 16, 0.96)",
              border: "1px solid rgba(216, 146, 116, 0.32)",
              color: "var(--text)",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

interface RsvpProps {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "primary" | "default";
}

function RsvpButton({ active, onClick, label, tone = "default" }: RsvpProps) {
  const isPrimary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-semibold transition"
      style={{
        background: active
          ? "var(--gold-400)"
          : isPrimary
            ? "rgba(216, 146, 116, 0.14)"
            : "transparent",
        color: active
          ? "#1a1310"
          : isPrimary
            ? "var(--gold-300)"
            : "var(--text-muted)",
        border: active
          ? "1px solid var(--gold-400)"
          : "1px solid rgba(216, 146, 116, 0.32)",
        borderRadius: 999,
        padding: "8px 16px",
        cursor: "pointer",
        letterSpacing: "0.04em",
        minWidth: 100,
      }}
    >
      {label}
    </button>
  );
}
