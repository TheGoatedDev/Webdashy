/**
 * DebugToggle - Small toggle button for detection debug overlay
 *
 * Position: Top-right corner of the viewport.
 * Only renders when detection is enabled.
 * Toggles the debug overlay which shows the detection zone (red box),
 * FPS, inference time, and other diagnostic info.
 */

import { useAppStore } from '../store/appStore';

export function DebugToggle() {
  const { detectionEnabled, debugOverlay, toggleDebugOverlay } = useAppStore();

  if (!detectionEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggleDebugOverlay}
      aria-label="Toggle detection debug overlay"
      className={`fixed top-4 right-4 z-[100] flex h-8 w-8 items-center justify-center rounded-sm border transition-all duration-200 ${
        debugOverlay
          ? 'border-rec/60 bg-rec/20 text-rec shadow-[0_0_8px_rgba(255,59,48,0.3)]'
          : 'border-white/20 bg-black/40 text-white/40 hover:border-white/40 hover:text-white/60'
      }`}
      title="Debug overlay"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        {/* Bug icon */}
        <path d="M8 2l1.88 1.88" />
        <path d="M14.12 3.88L16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9" />
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
        <path d="M6 13H2" />
        <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
        <path d="M22 13h-4" />
        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
      </svg>
    </button>
  );
}
