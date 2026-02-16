/**
 * StatusStrip - Bottom edge HUD overlay with recording status
 *
 * Layout: pulsing dot + "REC" label + monospace timer | battery + stats hint.
 * Translucent dark bar with top border accent and backdrop blur.
 */

interface StatusStripProps {
  isRecording: boolean;
  elapsedMs: number;
  isPluggedIn: boolean;
  onToggleStats: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function StatusStrip({
  isRecording,
  elapsedMs,
  isPluggedIn,
  onToggleStats,
}: StatusStripProps) {
  if (!isRecording) {
    return null;
  }

  return (
    <button
      type="button"
      className="fixed bottom-0 left-0 right-0 z-[100] flex h-12 cursor-pointer items-center justify-between border-t border-white/10 bg-black/70 px-5 backdrop-blur-md"
      onClick={onToggleStats}
    >
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 animate-rec-pulse rounded-full bg-rec" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-rec">
          Rec
        </span>
        <span className="font-mono text-sm tracking-wide text-white/90">
          {formatTime(elapsedMs)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {!isPluggedIn && <span className="text-sm">🔋</span>}
        <span className="font-display text-[10px] uppercase tracking-wider text-white/35">
          Tap for stats
        </span>
      </div>
    </button>
  );
}
