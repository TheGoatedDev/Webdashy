/**
 * Toast - HUD-style notification system
 *
 * Reads from appStore toasts array.
 * Color-coded left border accent by type.
 * Slide-in animation from top.
 */

import { useAppStore } from '../store/appStore';

const borderColors: Record<string, string> = {
  info: 'border-l-hud',
  warning: 'border-l-warn',
  error: 'border-l-rec',
};

export function Toast() {
  const toasts = useAppStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-6 left-1/2 z-[300] flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-[90vw] animate-toast-in rounded border-l-[3px] bg-black/85 px-4 py-3 font-display text-sm tracking-wide shadow-lg backdrop-blur-md ${borderColors[toast.type] ?? ''}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
