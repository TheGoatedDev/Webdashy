/**
 * StoragePanel - Slide-up panel with storage statistics
 *
 * Shows: GB used, buffer duration, quota %.
 * CSS transition: translateY slide animation.
 * Position: fixed, bottom 48px, z-index 99.
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

  return (
    <div className={`storage-panel ${show ? 'show' : ''}`}>
      <div className="storage-panel-content">
        <div className="stat-row">
          <span className="stat-label">Buffer:</span>
          <span className="stat-value">
            {formatBytes(stats.bufferSizeBytes)} ({formatDuration(stats.bufferDurationMs)})
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Saved:</span>
          <span className="stat-value">{formatBytes(stats.savedSizeBytes)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total:</span>
          <span className="stat-value">
            {formatBytes(stats.quotaUsageBytes)} / {formatBytes(stats.quotaTotalBytes)} (
            {stats.quotaPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
