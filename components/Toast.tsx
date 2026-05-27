"use client";

interface Props {
  message: string | null;
}

/**
 * Always renders a polite live region so screen readers can announce
 * subsequent toasts; the visible pill only mounts when a message is
 * present so it doesn't take pointer space. `role="status"` carries an
 * implicit `aria-live="polite"`; the explicit attribute is duplicated
 * for older AT.
 */
export default function Toast({ message }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Wrapper is always mounted so the live region exists from the
      // first paint — without this, the first toast can be missed by
      // screen readers that subscribe to live regions lazily.
      style={{ position: "absolute", pointerEvents: "none", width: 0, height: 0 }}
    >
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
