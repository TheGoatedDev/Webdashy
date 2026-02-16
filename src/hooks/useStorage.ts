/**
 * useStorage - Storage statistics hook
 *
 * Polls storage stats every 10 seconds while recording is active.
 * Refreshes on mount.
 */

import { useCallback, useEffect, useState } from 'react';
import { BufferManager } from '../services/BufferManager';
import { getClipStorage } from '../services/ClipStorage';
import { useAppStore } from '../store/appStore';
import type { StorageStats } from '../types/storage';

interface UseStorageReturn {
  stats: StorageStats | null;
  refreshStats: () => Promise<void>;
  isLoading: boolean;
}

// Singleton instances for storage polling
const clipStorage = getClipStorage();
const bufferManager = new BufferManager(clipStorage);

export function useStorage(): UseStorageReturn {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isRecording, setStorageStats } = useAppStore();

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats = await bufferManager.getStats();
      setStats(newStats);
      setStorageStats(newStats);
    } catch (error) {
      console.error('[useStorage] Failed to fetch storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setStorageStats]);

  // Refresh on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Poll every 10 seconds while recording
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      refreshStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [isRecording, refreshStats]);

  return {
    stats,
    refreshStats,
    isLoading,
  };
}
