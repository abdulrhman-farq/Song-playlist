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
   Edit-mode infrastructure
   - Admin gate: a single URL flag `?admin=1` flips the localStorage
     `wedding-edit:admin` to "1". Anyone without it never sees edit
     UI. (Trivially defeatable from devtools — that's fine for a
     wedding planning tool, the storage backend's RLS protects
     against malicious writes.)
   - Edit overrides: a flat key→value map persisted in localStorage.
     Components call useEditableText(key, fallback) to read the
     current value; in edit mode the value can be replaced inline.
   - Hidden blocks: an array of keys persisted in localStorage. Any
     block whose key is in the array renders nothing.
   - Two stages: draft (in-progress edits live in state only) and
     committed (saved to localStorage). Cancel discards drafts.
   ───────────────────────────────────────────────────────────── */

const ADMIN_KEY = "wedding-edit:admin";
const OVERRIDES_KEY = "wedding-edit:overrides:v1";
const HIDDEN_KEY = "wedding-edit:hidden:v1";

type Overrides = Record<string, string>;
type Hidden = string[];

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_KEY) === "1";
}

export function setAdmin(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(ADMIN_KEY, "1");
  else window.localStorage.removeItem(ADMIN_KEY);
}

interface EditCtx {
  /** Is the visitor authorised to see the edit UI at all? */
  admin: boolean;
  /** Is edit mode actively on (toolbar + inline editors visible)? */
  editing: boolean;
  /** Are there unsaved draft changes? */
  dirty: boolean;
  /** Committed overrides (after Save). */
  overrides: Overrides;
  /** Pending overrides being edited but not yet saved. */
  draftOverrides: Overrides;
  /** Hidden block keys (committed). */
  hidden: Hidden;
  /** Hidden block keys including any pending changes. */
  draftHidden: Hidden;

  enterEdit: () => void;
  setDraftOverride: (key: string, value: string) => void;
  setDraftHidden: (key: string, hide: boolean) => void;
  save: () => void;
  cancel: () => void;
  exit: () => void;
  /** Permanently drop everything. */
  resetAll: () => void;
  /** Admin sign-out (clears the admin flag). */
  signOut: () => void;
}

const Ctx = createContext<EditCtx | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState(false);
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [hidden, setHidden] = useState<Hidden>([]);
  const [draftOverrides, setDraftOverrides] = useState<Overrides>({});
  const [draftHidden, setDraftHiddenState] = useState<Hidden>([]);

  // Bootstrap from localStorage + URL flag
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const flag = params.get("admin");
      if (flag === "1") setAdmin(true);
      if (flag === "0") setAdmin(false);
      if (flag !== null) {
        params.delete("admin");
        const search = params.toString();
        const url =
          window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
        window.history.replaceState({}, "", url);
      }
    } catch {
      /* ignore */
    }
    setAdminState(isAdmin());
    setOverrides(readJSON<Overrides>(OVERRIDES_KEY, {}));
    setHidden(readJSON<Hidden>(HIDDEN_KEY, []));
  }, []);

  const dirty = useMemo(() => {
    if (Object.keys(draftOverrides).length !== Object.keys(overrides).length) {
      return true;
    }
    for (const k of Object.keys(draftOverrides)) {
      if (draftOverrides[k] !== overrides[k]) return true;
    }
    if (draftHidden.length !== hidden.length) return true;
    const a = new Set(draftHidden);
    for (const h of hidden) if (!a.has(h)) return true;
    return false;
  }, [draftOverrides, overrides, draftHidden, hidden]);

  const enterEdit = useCallback(() => {
    if (!isAdmin()) return;
    setDraftOverrides({ ...overrides });
    setDraftHiddenState([...hidden]);
    setEditing(true);
  }, [overrides, hidden]);

  const setDraftOverride = useCallback((key: string, value: string) => {
    setDraftOverrides((d) => ({ ...d, [key]: value }));
  }, []);

  const setDraftHidden = useCallback((key: string, hide: boolean) => {
    setDraftHiddenState((d) => {
      const set = new Set(d);
      if (hide) set.add(key);
      else set.delete(key);
      return [...set];
    });
  }, []);

  const save = useCallback(() => {
    setOverrides(draftOverrides);
    setHidden(draftHidden);
    writeJSON(OVERRIDES_KEY, draftOverrides);
    writeJSON(HIDDEN_KEY, draftHidden);
    setEditing(false);
  }, [draftOverrides, draftHidden]);

  const cancel = useCallback(() => {
    setDraftOverrides({ ...overrides });
    setDraftHiddenState([...hidden]);
    setEditing(false);
  }, [overrides, hidden]);

  const exit = useCallback(() => {
    setEditing(false);
  }, []);

  const resetAll = useCallback(() => {
    setOverrides({});
    setHidden([]);
    setDraftOverrides({});
    setDraftHiddenState([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(OVERRIDES_KEY);
      window.localStorage.removeItem(HIDDEN_KEY);
    }
    setEditing(false);
  }, []);

  const signOut = useCallback(() => {
    setAdmin(false);
    setAdminState(false);
    setEditing(false);
  }, []);

  const value = useMemo<EditCtx>(
    () => ({
      admin,
      editing,
      dirty,
      overrides,
      draftOverrides,
      hidden,
      draftHidden,
      enterEdit,
      setDraftOverride,
      setDraftHidden,
      save,
      cancel,
      exit,
      resetAll,
      signOut,
    }),
    [
      admin,
      editing,
      dirty,
      overrides,
      draftOverrides,
      hidden,
      draftHidden,
      enterEdit,
      setDraftOverride,
      setDraftHidden,
      save,
      cancel,
      exit,
      resetAll,
      signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditMode(): EditCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditMode must be used inside <EditModeProvider>");
  return ctx;
}

/** Read the current (possibly overridden) text for a key. */
export function useEditableText(key: string, fallback: string): string {
  const { editing, draftOverrides, overrides } = useEditMode();
  const source = editing ? draftOverrides : overrides;
  return source[key] ?? fallback;
}

/** Whether a given structural block is hidden. */
export function useIsHidden(key: string): boolean {
  const { editing, draftHidden, hidden } = useEditMode();
  const list = editing ? draftHidden : hidden;
  return list.includes(key);
}
