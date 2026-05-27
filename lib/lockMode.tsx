"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ─────────────────────────────────────────────────────────────
   Wedding-day Lock mode
   - Persists in localStorage per-device (does NOT sync via
     Supabase — locking is an operational choice for whoever is
     running the laptop at the venue, not a playlist property).
   - When locked, components consult `useLockMode().locked` and
     hide / disable destructive controls (edit, delete, drag,
     trim, rename, clear-all, composer, etc.). Playback and
     transport remain fully usable.
   ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = "wedding-playlist:locked";

interface LockCtx {
  /** True when wedding-day mode is engaged. */
  locked: boolean;
  /** Toggle the flag. */
  setLocked: (v: boolean) => void;
}

const Ctx = createContext<LockCtx | null>(null);

export function LockModeProvider({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setLockedState(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setLocked = useCallback((v: boolean) => {
    setLockedState(v);
    if (typeof window === "undefined") return;
    try {
      if (v) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ locked, setLocked }), [locked, setLocked]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLockMode(): LockCtx {
  const ctx = useContext(Ctx);
  // Safe to use outside provider — returns a no-op fallback so
  // server-prerender doesn't blow up.
  if (!ctx) return { locked: false, setLocked: () => undefined };
  return ctx;
}

/** Renders children only when the playlist is NOT locked. */
export function UnlockedOnly({ children }: { children: ReactNode }) {
  const { locked } = useLockMode();
  if (locked) return null;
  return <>{children}</>;
}
