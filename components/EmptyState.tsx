"use client";

import EditableText from "@/components/EditableText";
import { IconMusic, IconSparkle, OrnamentMark } from "@/components/icons";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  onSamples: () => void;
}

export default function EmptyState({ t, onSamples }: Props) {
  return (
    <div
      className="relative overflow-hidden text-center fade-up"
      style={{
        borderRadius: 20,
        border: "1px solid var(--line-subtle)",
        background:
          "linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(255,255,255,0.0) 100%)",
        padding: "56px 32px",
      }}
    >
      <div
        className="absolute pointer-events-none inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.10), transparent 70%)",
        }}
      />

      <div className="relative">
        <div
          className="inline-flex items-center justify-center mb-5"
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(34,197,94,0.06))",
            border: "1px solid rgba(212,175,55,0.32)",
            color: "var(--gold-300)",
            boxShadow: "0 18px 36px -16px rgba(212,175,55,0.4)",
          }}
        >
          <IconMusic size={28} />
        </div>

        <div className="eyebrow flex items-center justify-center gap-2">
          <OrnamentMark size={7} color="#d4af37" />
          <EditableText editKey="emptyState.subtitle" fallback={t.subtitle} />
          <OrnamentMark size={7} color="#d4af37" />
        </div>

        <EditableText
          as="h3"
          editKey="emptyState.title"
          fallback={t.addFirst}
          className="font-display italic mt-3"
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            color: "var(--text)",
          }}
        />

        <EditableText
          as="p"
          editKey="emptyState.hint"
          fallback={t.emptyHint}
          multiline
          className="mt-3 mx-auto"
          style={{
            color: "var(--text-muted)",
            fontSize: 15,
            lineHeight: 1.7,
            maxWidth: 460,
            display: "block",
          }}
        />

        <div className="mt-6">
          <button
            type="button"
            className="btn-base btn-gold"
            onClick={onSamples}
          >
            <IconSparkle size={14} />
            <span>{t.sample}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
