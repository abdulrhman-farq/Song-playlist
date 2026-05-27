"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconClose, IconPlus, IconTrash } from "@/components/icons";
import { useLockMode } from "@/lib/lockMode";
import {
  defaultGuests,
  loadGuests,
  newGuest,
  saveGuests,
  whatsappShareUrl,
} from "@/lib/guestsStorage";
import type { Strings } from "@/lib/i18n";
import { dir as dirOf } from "@/lib/i18n";
import type { GuestEntry, GuestStatus, Language } from "@/types";

interface Props {
  lang: Language;
  t: Strings;
  onClose: () => void;
}

type Filter = "all" | "attending" | "declined" | "pending" | "maybe";

/**
 * Guest book / RSVP tracker. Modeled after the Tasks modal so the
 * patterns feel familiar: filter chips, compact rows, peach pill
 * statuses, and an editable inline form for each guest.
 *
 * Persists to localStorage. Includes WhatsApp share helper so the
 * bride can send invitations straight from the row.
 */
export default function Guests({ lang, t, onClose }: Props) {
  const direction = dirOf(lang);
  const lock = useLockMode();

  const [doc, setDoc] = useState(() => defaultGuests());
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = loadGuests();
    if (stored) setDoc(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveGuests(doc);
  }, [doc, hydrated]);

  // Filter + counts
  const counts = useMemo(() => {
    const c = { all: 0, attending: 0, declined: 0, pending: 0, maybe: 0, seats: 0 };
    for (const g of doc.entries) {
      c.all++;
      c[g.status]++;
      if (g.status === "attending") c.seats += g.partySize ?? 1;
    }
    return c;
  }, [doc.entries]);

  const visible = useMemo(() => {
    if (filter === "all") return doc.entries;
    return doc.entries.filter((g) => g.status === filter);
  }, [doc.entries, filter]);

  function update(id: string, patch: Partial<GuestEntry>) {
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }

  function cycleStatus(g: GuestEntry) {
    const order: GuestStatus[] = ["pending", "attending", "maybe", "declined"];
    const next = order[(order.indexOf(g.status) + 1) % order.length];
    update(g.id, { status: next });
  }

  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm(t.guestsConfirmDelete)) {
      return;
    }
    setDoc((prev) => ({
      ...prev,
      entries: prev.entries.filter((g) => g.id !== id),
    }));
  }

  function addGuest() {
    const fresh = newGuest();
    setDoc((prev) => ({ ...prev, entries: [fresh, ...prev.entries] }));
    setEditingId(fresh.id);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t.guestsFilterAll, count: counts.all },
    { key: "attending", label: t.guestsFilterAttending, count: counts.attending },
    { key: "pending", label: t.guestsFilterPending, count: counts.pending },
    { key: "maybe", label: t.guestsFilterMaybe, count: counts.maybe },
    { key: "declined", label: t.guestsFilterDeclined, count: counts.declined },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center fade-up"
      style={{
        background: "rgba(8, 5, 4, 0.78)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
      dir={direction}
    >
      <div
        className="relative flex flex-col w-full max-w-[720px] my-4 mx-3 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(180deg, rgba(62, 47, 37, 0.96) 0%, rgba(46, 35, 28, 0.98) 100%)",
          border: "1px solid rgba(216, 146, 116, 0.22)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.75)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(216, 146, 116, 0.18)",
            background:
              "linear-gradient(90deg, rgba(216,146,116,0.07) 0%, transparent 60%)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="eyebrow"
                style={{ color: "var(--gold-400)", letterSpacing: "0.28em" }}
              >
                {t.guestsEyebrow}
              </div>
              <h2
                className="font-display italic mt-1 truncate"
                style={{
                  fontSize: "clamp(22px, 2.6vw, 28px)",
                  color: "var(--text)",
                }}
              >
                {t.guestsTitle}
              </h2>
              <div
                className="text-[12px] mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                {counts.all} {t.guestsInvitedLabel} · {counts.attending}{" "}
                {t.guestsAttendingLabel} · {counts.seats} {t.guestsSeats}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!lock.locked && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={addGuest}
                  title={t.guestsAdd}
                  aria-label={t.guestsAdd}
                  style={{
                    background: "var(--gold-400)",
                    color: "#1a1310",
                    width: 36,
                    height: 36,
                  }}
                >
                  <IconPlus size={16} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                title={t.close}
                aria-label={t.close}
                style={{ width: 36, height: 36 }}
              >
                <IconClose size={16} />
              </button>
            </div>
          </div>

          {/* Filter chips */}
          <div
            className="flex gap-2 mt-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1.5 rounded-full text-[12px] flex-shrink-0"
                  style={{
                    padding: "6px 12px",
                    background: active ? "var(--gold-400)" : "transparent",
                    color: active ? "#1a1310" : "var(--gold-300)",
                    border: "1px solid",
                    borderColor: active
                      ? "var(--gold-400)"
                      : "rgba(216, 146, 116, 0.28)",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                  }}
                >
                  <span>{f.label}</span>
                  <span
                    className="tnum text-[10px]"
                    style={{
                      opacity: 0.75,
                      background: active
                        ? "rgba(26, 19, 16, 0.18)"
                        : "rgba(216, 146, 116, 0.10)",
                      borderRadius: 999,
                      padding: "0 6px",
                    }}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visible.length === 0 ? (
            <div
              className="text-center py-12 italic"
              style={{ color: "var(--text-faint)" }}
            >
              {doc.entries.length === 0 ? t.guestsEmpty : t.guestsFilterEmpty}
            </div>
          ) : (
            visible.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                t={t}
                lang={lang}
                editing={editingId === g.id}
                nameRef={editingId === g.id ? nameInputRef : null}
                locked={lock.locked}
                onStartEdit={() => setEditingId(g.id)}
                onCommit={(patch) => {
                  update(g.id, patch);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onCycleStatus={() => cycleStatus(g)}
                onDelete={() => remove(g.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Row ─────────────────────────────────────────────────────── */

interface RowProps {
  guest: GuestEntry;
  t: Strings;
  lang: Language;
  editing: boolean;
  nameRef: React.Ref<HTMLInputElement> | null;
  locked: boolean;
  onStartEdit: () => void;
  onCommit: (patch: Partial<GuestEntry>) => void;
  onCancel: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
}

const STATUS_PALETTE: Record<
  GuestStatus,
  { bg: string; fg: string; border: string }
> = {
  attending: {
    bg: "rgba(216, 146, 116, 0.18)",
    fg: "var(--gold-300)",
    border: "rgba(216, 146, 116, 0.45)",
  },
  pending: {
    bg: "rgba(255, 255, 255, 0.04)",
    fg: "var(--text-muted)",
    border: "rgba(216, 146, 116, 0.18)",
  },
  maybe: {
    bg: "rgba(216, 146, 116, 0.08)",
    fg: "var(--gold-200)",
    border: "rgba(216, 146, 116, 0.30)",
  },
  declined: {
    bg: "rgba(243, 160, 138, 0.10)",
    fg: "var(--danger)",
    border: "rgba(243, 160, 138, 0.40)",
  },
};

function GuestRow({
  guest,
  t,
  lang: _lang,
  editing,
  nameRef,
  locked,
  onStartEdit,
  onCommit,
  onCancel,
  onCycleStatus,
  onDelete,
}: RowProps) {
  const [draftName, setDraftName] = useState(guest.name);
  const [draftPhone, setDraftPhone] = useState(guest.phone ?? "");
  const [draftParty, setDraftParty] = useState(String(guest.partySize ?? 1));
  useEffect(() => {
    setDraftName(guest.name);
    setDraftPhone(guest.phone ?? "");
    setDraftParty(String(guest.partySize ?? 1));
  }, [guest.name, guest.phone, guest.partySize]);

  function commit() {
    onCommit({
      name: draftName.trim() || guest.name || "—",
      phone: draftPhone.trim() || undefined,
      partySize: Math.max(1, parseInt(draftParty, 10) || 1),
    });
  }

  const palette = STATUS_PALETTE[guest.status];
  const statusLabel =
    guest.status === "attending"
      ? t.guestsStatusAttending
      : guest.status === "declined"
        ? t.guestsStatusDeclined
        : guest.status === "maybe"
          ? t.guestsStatusMaybe
          : t.guestsStatusPending;

  if (editing && !locked) {
    return (
      <div
        className="px-3 py-3 rounded-lg space-y-2"
        style={{
          background: "rgba(216, 146, 116, 0.06)",
          border: "1px solid rgba(216, 146, 116, 0.28)",
        }}
      >
        <input
          ref={nameRef ?? undefined}
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder={t.guestsNamePlaceholder}
          className="w-full bg-transparent outline-none"
          style={{
            color: "var(--text)",
            fontSize: 15,
            borderBottom: "1px solid var(--gold-400)",
            padding: "4px 0",
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="tel"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            placeholder={t.guestsPhonePlaceholder}
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{
              color: "var(--text)",
              border: "1px solid rgba(216, 146, 116, 0.24)",
              borderRadius: 6,
              padding: "6px 10px",
            }}
          />
          <input
            type="number"
            min={1}
            value={draftParty}
            onChange={(e) => setDraftParty(e.target.value)}
            className="bg-transparent outline-none text-[13px] tnum"
            style={{
              color: "var(--text)",
              border: "1px solid rgba(216, 146, 116, 0.24)",
              borderRadius: 6,
              padding: "6px 8px",
              width: 64,
            }}
            title={t.guestsPartySize}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDelete}
            style={{
              color: "var(--danger)",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <IconTrash size={14} />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-[12px]"
              style={{
                color: "var(--text-muted)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={commit}
              className="text-[12px] font-semibold"
              style={{
                background: "var(--gold-400)",
                color: "#1a1310",
                borderRadius: 999,
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              <IconCheck size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(216, 146, 116, 0.14)",
      }}
    >
      {/* Status pill — tap to cycle */}
      <button
        type="button"
        onClick={locked ? undefined : onCycleStatus}
        disabled={locked}
        className="flex-shrink-0 rounded-full text-[10px] font-semibold tnum"
        style={{
          background: palette.bg,
          color: palette.fg,
          border: `1px solid ${palette.border}`,
          padding: "4px 10px",
          letterSpacing: "0.04em",
          cursor: locked ? "default" : "pointer",
          minWidth: 80,
          textAlign: "center",
        }}
        title={t.guestsCycleStatus}
      >
        {statusLabel}
      </button>

      {/* Name + meta */}
      <button
        type="button"
        onClick={locked ? undefined : onStartEdit}
        disabled={locked}
        className="flex-1 min-w-0 text-start"
        style={{ cursor: locked ? "default" : "text" }}
      >
        <div
          className="truncate"
          style={{ color: "var(--text)", fontSize: 14, fontWeight: 500 }}
        >
          {guest.name || (
            <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>
              {t.guestsNamePlaceholder}
            </span>
          )}
        </div>
        {(guest.phone ||
          (guest.partySize && guest.partySize > 1) ||
          guest.note) && (
          <div
            className="truncate text-[11px] mt-0.5"
            style={{ color: "var(--text-faint)" }}
          >
            {guest.phone}
            {guest.phone && (guest.partySize ?? 1) > 1 && " · "}
            {(guest.partySize ?? 1) > 1 && `${guest.partySize} ${t.guestsSeats}`}
            {guest.note && ` · ${guest.note}`}
          </div>
        )}
      </button>

      {/* WhatsApp share */}
      {!locked && (
        <a
          href={whatsappShareUrl(guest, t.guestsShareMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            color: "var(--gold-300)",
          }}
          title={t.guestsShareWhatsapp}
          aria-label={t.guestsShareWhatsapp}
        >
          <WhatsappGlyph />
        </a>
      )}
    </div>
  );
}

function WhatsappGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
