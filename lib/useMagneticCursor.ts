"use client";

import { useCallback, useRef } from "react";

/**
 * Tracks the cursor inside the bound element and writes `--mx`/`--my`
 * custom properties as percentages, used by the `.magnetic`
 * spotlight CSS class. Uses requestAnimationFrame so the DOM write
 * is coalesced to the next paint.
 */
export function useMagneticCursor() {
  const elRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const next = useRef<{ x: number; y: number } | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    const target = elRef.current;
    const pt = next.current;
    if (!target || !pt) return;
    target.style.setProperty("--mx", `${pt.x}%`);
    target.style.setProperty("--my", `${pt.y}%`);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      elRef.current = el;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      next.current = { x, y };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  return { onMouseMove } as const;
}
