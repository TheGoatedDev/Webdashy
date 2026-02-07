/**
 * StatusStrip - Bottom edge overlay with recording status
 *
 * Layout (left to right): pulsing red dot, "REC", HH:MM:SS timer, spacer,
 * battery icon (when unplugged), "Tap for stats".
 *
 * Background: rgba(0,0,0,0.6) + backdrop-filter: blur(4px).
 * Height: 48px, position fixed bottom 0, z-index 100.
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

export function StatusStrip({ isRecording, elapsedMs, isPluggedIn, onToggleStats }: StatusStripProps) {
  if (!isRecording) {
    return null;
  }

  return (
    <div className="status-strip" onClick={onToggleStats}>
      <div className="status-left">
        <div className="rec-dot" />
        <span className="rec-label">REC</span>
        <span className="timer">{formatTime(elapsedMs)}</span>
      </div>
      <div className="status-right">
        {!isPluggedIn && <span className="battery-icon">🔋</span>}
        <span className="stats-hint">Tap for stats</span>
      </div>
    </div>
  );
}
