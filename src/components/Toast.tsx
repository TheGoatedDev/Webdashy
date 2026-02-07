/**
 * Toast - Notification system
 *
 * Reads from appStore toasts array.
 * Position: fixed, top 24px, centered.
 * Color coding: info=neutral, warning=amber border-left, error=red border-left.
 * Slide-in animation from top.
 */

import { useAppStore } from '../store/appStore';

export function Toast() {
  const toasts = useAppStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
