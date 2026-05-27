/**
 * Trap keyboard focus inside `container` while it's mounted/open.
 *
 * Returns a cleanup function. While active:
 *   - Tab / Shift+Tab cycles only among focusable elements inside the
 *     container (Tab off the last focuses the first; Shift+Tab off the
 *     first focuses the last).
 *   - The currently-focused element at activation time is remembered
 *     and restored when cleanup runs.
 *   - Focus is moved into the container on activation if it isn't
 *     already there.
 *
 * Esc handling and "click-outside to close" stay the caller's
 * responsibility — this is a focus trap, nothing more.
 */
export function trapFocus(container: HTMLElement): () => void {
  if (typeof document === "undefined") return () => {};

  const previouslyFocused =
    (document.activeElement as HTMLElement | null) ?? null;

  function focusable(): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        [
          "a[href]",
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
          "[contenteditable='true']",
        ].join(","),
      ),
    ).filter((el) => !el.hasAttribute("aria-hidden"));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const items = focusable();
    if (items.length === 0) {
      e.preventDefault();
      container.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Move focus inside on activation if it isn't already.
  if (!container.contains(document.activeElement)) {
    const items = focusable();
    if (items.length > 0) items[0].focus();
    else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }
  }

  document.addEventListener("keydown", onKey, true);

  return () => {
    document.removeEventListener("keydown", onKey, true);
    // Restore prior focus if it's still in the document.
    if (previouslyFocused && document.contains(previouslyFocused)) {
      try {
        previouslyFocused.focus();
      } catch {
        /* ignore */
      }
    }
  };
}
