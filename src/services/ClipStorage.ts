import { openDB, type IDBPDatabase } from 'idb';
import type { DashcamDB, BufferChunk, SavedClip, SessionState } from '../types/storage';

export class ClipStorage {
  private db: IDBPDatabase<DashcamDB> | null = null;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<DashcamDB>('dashcam-storage', 1, {
      upgrade(db) {
        // Buffer store for rolling circular buffer
        const bufferStore = db.createObjectStore('buffer', { keyPath: 'id' });
        bufferStore.createIndex('by-timestamp', 'timestamp');
        bufferStore.createIndex('by-sequence', 'sequenceNumber');

        // Saved clips store for permanent storage
        const savedStore = db.createObjectStore('saved', { keyPath: 'id' });
        savedStore.createIndex('by-timestamp', 'timestamp');

        // Session state store for recording status
        db.createObjectStore('session', { keyPath: 'id' });
      },
    });

    // Request persistent storage on first initialization
    await this.requestPersistentStorage();
  }

  private async ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[ClipStorage] Persistent storage: ${isPersisted}`);
      return isPersisted;
    }
    console.warn('[ClipStorage] Persistent storage API not available');
    return false;
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }

  private async retryWrite<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 200
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[ClipStorage] Write attempt ${attempt + 1}/${maxRetries} failed:`,
          error
        );

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`[ClipStorage] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `[ClipStorage] Write failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  // Buffer chunk operations
  async addBufferChunk(chunk: BufferChunk): Promise<void> {
    await this.ensureInit();
    await this.retryWrite(async () => {
      await this.db!.add('buffer', chunk);
    });
  }

  async deleteBufferChunk(id: string): Promise<void> {
    await this.ensureInit();
    await this.db!.delete('buffer', id);
  }

  async getBufferChunksByTimestamp(before: number): Promise<BufferChunk[]> {
    await this.ensureInit();
    const tx = this.db!.transaction('buffer', 'readonly');
    const index = tx.store.index('by-timestamp');
    const range = IDBKeyRange.upperBound(before, true);
    return await index.getAll(range);
  }

  async getAllBufferChunks(): Promise<BufferChunk[]> {
    await this.ensureInit();
    return await this.db!.getAll('buffer');
  }

  async getBufferChunkCount(): Promise<number> {
    await this.ensureInit();
    return await this.db!.count('buffer');
  }

  // Saved clip operations
  async addSavedClip(clip: SavedClip): Promise<void> {
    await this.ensureInit();
    await this.retryWrite(async () => {
      await this.db!.add('saved', clip);
    });
  }

  async deleteSavedClip(id: string): Promise<void> {
    await this.ensureInit();
    await this.db!.delete('saved', id);
  }

  async getAllSavedClips(): Promise<SavedClip[]> {
    await this.ensureInit();
    return await this.db!.getAll('saved');
  }

  // Session state operations
  async saveSessionState(state: SessionState): Promise<void> {
    await this.ensureInit();
    await this.db!.put('session', state);
  }

  async getSessionState(): Promise<SessionState | undefined> {
    await this.ensureInit();
    return await this.db!.get('session', 'current');
  }

  async clearSessionState(): Promise<void> {
    await this.ensureInit();
    await this.db!.delete('session', 'current');
  }
}

// Singleton instance
let instance: ClipStorage | null = null;

export function getClipStorage(): ClipStorage {
  if (!instance) {
    instance = new ClipStorage();
  }
  return instance;
}
