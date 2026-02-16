/**
 * StoragePanel - Slide-up technical readout panel
 *
 * Shows storage quota progress bar, buffer stats, saved size.
 * HUD-style data layout with display/mono font pairing.
 */

import type { StorageStats } from '../types/storage';

interface StoragePanelProps {
  show: boolean;
  stats: StorageStats | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function StoragePanel({ show, stats }: StoragePanelProps) {
  if (!stats) {
    return null;
  }

  const progressColor =
    stats.quotaPercent > 90 ? 'bg-rec' : stats.quotaPercent > 70 ? 'bg-warn' : 'bg-hud';

  return (
    <div
      className={`fixed bottom-12 left-0 right-0 z-[99] border-t border-hud/20 bg-black/85 px-5 py-4 backdrop-blur-lg transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Storage header + progress bar */}
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-medium uppercase tracking-widest text-white/40">
            Storage
          </span>
          <span className="font-mono text-xs text-white/60">{stats.quotaPercent.toFixed(1)}%</span>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(stats.quotaPercent, 100)}%` }}
          />
        </div>

        {/* Stats rows */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xs text-white/45">Buffer</span>
            <span className="font-mono text-xs text-white/80">
              {formatBytes(stats.bufferSizeBytes)}{' '}
              <span className="text-white/40">({formatDuration(stats.bufferDurationMs)})</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xs text-white/45">Saved</span>
            <span className="font-mono text-xs text-white/80">
              {formatBytes(stats.savedSizeBytes)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xs text-white/45">Total</span>
            <span className="font-mono text-xs text-white/80">
              {formatBytes(stats.quotaUsageBytes)}{' '}
              <span className="text-white/40">/ {formatBytes(stats.quotaTotalBytes)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
