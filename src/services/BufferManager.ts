import type { BufferChunk, StorageStats } from '../types/storage';
import type { ClipStorage } from './ClipStorage';

export class BufferManager extends EventTarget {
  private storage: ClipStorage;
  private maxDurationMs: number;
  private sequenceCounter: number = 0;

  constructor(storage: ClipStorage, maxDurationMs: number = 7_200_000) {
    super();
    this.storage = storage;
    this.maxDurationMs = maxDurationMs; // Default: 2 hours
  }

  async addChunk(blob: Blob): Promise<void> {
    // Check storage quota before writing
    const { usage, quota } = await this.storage.getStorageEstimate();
    const quotaPercent = quota > 0 ? (usage / quota) * 100 : 0;

    // Emit warnings based on quota thresholds
    if (quotaPercent > 95) {
      this.dispatchEvent(
        new CustomEvent('storage-full', {
          detail: { usage, quota, quotaPercent },
        }),
      );
      throw new Error(`Storage quota exceeded: ${quotaPercent.toFixed(1)}% used`);
    } else if (quotaPercent > 90) {
      this.dispatchEvent(
        new CustomEvent('storage-critical', {
          detail: { usage, quota, quotaPercent },
        }),
      );
    } else if (quotaPercent > 80) {
      this.dispatchEvent(
        new CustomEvent('storage-warning', {
          detail: { usage, quota, quotaPercent },
        }),
      );
    }

    // Create and store chunk
    const chunk: BufferChunk = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      size: blob.size,
      blob,
      sequenceNumber: this.sequenceCounter++,
    };

    await this.storage.addBufferChunk(chunk);

    // Enforce retention policy
    await this.enforceRetention();
  }

  private async enforceRetention(): Promise<void> {
    const cutoff = Date.now() - this.maxDurationMs;
    const oldChunks = await this.storage.getBufferChunksByTimestamp(cutoff);

    // Silent deletion - like a real dashcam
    for (const chunk of oldChunks) {
      await this.storage.deleteBufferChunk(chunk.id);
    }
  }

  async getStats(): Promise<StorageStats> {
    // Get all buffer chunks
    const bufferChunks = await this.storage.getAllBufferChunks();
    const bufferSizeBytes = bufferChunks.reduce((sum, chunk) => sum + chunk.size, 0);

    // Calculate buffer duration (newest - oldest timestamp)
    let bufferDurationMs = 0;
    if (bufferChunks.length > 0) {
      const timestamps = bufferChunks.map((c) => c.timestamp);
      const newest = Math.max(...timestamps);
      const oldest = Math.min(...timestamps);
      bufferDurationMs = newest - oldest;
    }

    // Get all saved clips
    const savedClips = await this.storage.getAllSavedClips();
    const savedSizeBytes = savedClips.reduce((sum, clip) => sum + clip.size, 0);

    // Get storage quota
    const { usage, quota } = await this.storage.getStorageEstimate();
    const quotaPercent = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      bufferChunks: bufferChunks.length,
      bufferSizeBytes,
      bufferDurationMs,
      savedClips: savedClips.length,
      savedSizeBytes,
      quotaUsageBytes: usage,
      quotaTotalBytes: quota,
      quotaPercent,
    };
  }

  async adaptBufferDuration(): Promise<void> {
    const { usage, quota } = await this.storage.getStorageEstimate();
    const availableSpace = quota - usage;

    // Adjust max duration based on available space
    if (availableSpace < 200_000_000) {
      // Less than 200MB: reduce to 30 minutes
      this.maxDurationMs = 30 * 60 * 1000;
      console.log('[BufferManager] Low storage: reduced buffer to 30 minutes');
    } else if (availableSpace < 500_000_000) {
      // Less than 500MB: reduce to 1 hour
      this.maxDurationMs = 60 * 60 * 1000;
      console.log('[BufferManager] Limited storage: reduced buffer to 1 hour');
    } else if (availableSpace > 2_000_000_000) {
      // More than 2GB: use default 2 hours
      this.maxDurationMs = 2 * 60 * 60 * 1000;
      console.log('[BufferManager] Ample storage: buffer at 2 hours');
    }

    // Enforce new retention policy
    await this.enforceRetention();
  }

  getMaxDurationMs(): number {
    return this.maxDurationMs;
  }

  async forceCleanup(count: number): Promise<void> {
    const allChunks = await this.storage.getAllBufferChunks();

    // Sort by timestamp (oldest first)
    allChunks.sort((a, b) => a.timestamp - b.timestamp);

    // Delete N oldest chunks
    const chunksToDelete = allChunks.slice(0, count);
    for (const chunk of chunksToDelete) {
      await this.storage.deleteBufferChunk(chunk.id);
    }

    console.log(`[BufferManager] Emergency cleanup: deleted ${chunksToDelete.length} chunks`);
  }
}
