"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconClose } from "@/components/icons";
import { trapFocus } from "@/lib/focusTrap";

/* ─────────────────────────────────────────────────────────────
   Drop-in replacements for window.prompt() and window.confirm().
   Both render through the same dark-theme modal-card surface as
   TrimModal / ValidationModal so the experience stays cohesive
   instead of falling back to the OS browser UI.
   ───────────────────────────────────────────────────────────── */

interface PromptProps {
  open: boolean;
  title: string;
  description?: string;
  /** Initial value placed in the input. */
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Called with the trimmed value when the user submits. */
  onSubmit: (value: string) => void;
  onClose: () => void;
  dir?: "rtl" | "ltr";
}

export function PromptDialog({
  open,
  title,
  description,
  defaultValue = "",
  placeholder,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onClose,
  dir = "ltr",
}: PromptProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      // Defer focus so the dialog has rendered + browser can place caret
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !cardRef.current) return;
    return trapFocus(cardRef.current);
  }, [open]);

  if (!open) return null;

  function submit() {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={dir}
    >
      <div
        ref={cardRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ padding: 22, width: "min(420px, 100%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div id={titleId} className="label-micro">
            {title}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={cancelLabel}
            title={cancelLabel}
          >
            <IconClose size={14} />
          </button>
        </div>

        {description && (
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--text-muted)", lineHeight: 1.55 }}
          >
            {description}
          </p>
        )}

        <input
          ref={inputRef}
          className="input-elegant"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
        />

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            className="btn-base btn-ghost-quiet"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-base btn-gold"
            onClick={submit}
            disabled={!value.trim()}
          >
            <IconCheck size={14} />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tints the confirm button red — use for destructive actions. */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  dir?: "rtl" | "ltr";
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onClose,
  dir = "ltr",
}: ConfirmProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !cardRef.current) return;
    return trapFocus(cardRef.current);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={dir}
    >
      <div
        ref={cardRef}
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ padding: 22, width: "min(420px, 100%)" }}
      >
        <div id={titleId} className="label-micro mb-2">
          {title}
        </div>
        {description && (
          <p
            className="text-[14px]"
            style={{ color: "var(--text-dim)", lineHeight: 1.6 }}
          >
            {description}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            className="btn-base btn-ghost-quiet"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? "btn-base btn-ghost" : "btn-base btn-gold"}
            style={
              destructive
                ? {
                    color: "var(--danger)",
                    borderColor: "rgba(243,160,138,0.4)",
                  }
                : undefined
            }
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
