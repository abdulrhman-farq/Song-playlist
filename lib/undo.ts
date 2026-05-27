"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Global "Action · Undo" system. Modeled on Gmail's "Message moved
 * to Trash · Undo" pattern: any destructive action calls
 * `pushUndo(label, undo)` which surfaces a floating toast with an
 * Undo button. Auto-dismisses after `UNDO_TIMEOUT_MS`; the user
 * pressing Undo runs the supplied callback to revert the change.
 *
 * Stack capacity is 1 — the toast always shows the *most recent*
 * undoable action. Pushing a new action while one is pending finalises
 * the previous one (so it can't be undone anymore) and replaces it.
 */
const UNDO_TIMEOUT_MS = 7_000;

export interface UndoableAction {
  id: number;
  label: string;
  /** Reverse the action. Runs once on Undo press. */
  undo: () => void;
}

interface UndoContextValue {
  current: UndoableAction | null;
  pushUndo: (label: string, undo: () => void) => void;
  runUndo: () => void;
  dismiss: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

let nextId = 1;

export function useUndoController(): UndoContextValue {
  const [current, setCurrent] = useState<UndoableAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setCurrent(null);
  }, [clearTimer]);

  const pushUndo = useCallback(
    (label: string, undo: () => void) => {
      clearTimer();
      const id = nextId++;
      setCurrent({ id, label, undo });
      timerRef.current = setTimeout(() => {
        setCurrent((prev) => (prev && prev.id === id ? null : prev));
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [clearTimer],
  );

  const runUndo = useCallback(() => {
    const c = current;
    if (!c) return;
    clearTimer();
    setCurrent(null);
    try {
      c.undo();
    } catch {
      /* swallow — undo should never crash the app */
    }
  }, [current, clearTimer]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { current, pushUndo, runUndo, dismiss };
}

export const UndoContextProvider = UndoContext.Provider;

/**
 * Hook for any component to surface an undo. No-op if no provider is
 * mounted (so the call sites don't need to defensively check).
 */
export function useUndo(): {
  pushUndo: (label: string, undo: () => void) => void;
} {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    return { pushUndo: () => {} };
  }
  return { pushUndo: ctx.pushUndo };
}

/** Used by the toast UI itself. */
export function useUndoConsumer(): UndoContextValue | null {
  return useContext(UndoContext);
}

export const UNDO_TIMEOUT = UNDO_TIMEOUT_MS;
