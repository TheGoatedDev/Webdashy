/**
 * useRecorder - Recording engine integration hook
 *
 * Creates RecordingEngine, BufferManager, ClipStorage instances (once via useRef).
 * Wires up ALL RecordingEngine and BufferManager events to appStore.
 * Handles interrupted session detection on mount.
 *
 * ARCHITECTURE RULE: Video blobs NEVER enter React state.
 */

import { useRef, useEffect, useCallback } from 'react';
import { RecordingEngine } from '../services/RecordingEngine';
import { BufferManager } from '../services/BufferManager';
import { getClipStorage } from '../services/ClipStorage';
import { useAppStore } from '../store/appStore';
import type { SessionState } from '../types/storage';

interface UseRecorderReturn {
  state: 'inactive' | 'recording' | 'paused';
  elapsedMs: number;
  start: (stream: MediaStream) => Promise<void>;
  stop: () => Promise<void>;
  interruptedSession: SessionState | null;
}

export function useRecorder(): UseRecorderReturn {
  // Create service instances once
  const clipStorageRef = useRef(getClipStorage());
  const bufferManagerRef = useRef(new BufferManager(clipStorageRef.current));
  const engineRef = useRef(
    new RecordingEngine(bufferManagerRef.current, clipStorageRef.current)
  );

  const interruptedSessionRef = useRef<SessionState | null>(null);

  const {
    elapsedMs,
    setRecording,
    setElapsedMs,
    setRecordingError,
    addToast,
  } = useAppStore();

  // Check for interrupted session on mount
  useEffect(() => {
    const checkInterruptedSession = async () => {
      const session = await engineRef.current.checkForInterruptedSession();
      if (session) {
        interruptedSessionRef.current = session;
        console.warn('[useRecorder] Found interrupted session:', session);
      }
    };

    checkInterruptedSession();
  }, []);

  // Wire up RecordingEngine events
  useEffect(() => {
    const engine = engineRef.current;

    const handleStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ state: 'inactive' | 'recording' | 'paused' }>;
      setRecording(customEvent.detail.state === 'recording');
    };

    const handleTimer = (event: Event) => {
      const customEvent = event as CustomEvent<{ elapsedMs: number }>;
      setElapsedMs(customEvent.detail.elapsedMs);
    };

    const handleError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; recoverable: boolean }>;
      setRecordingError(customEvent.detail.message);
      addToast(customEvent.detail.message, 'error');
    };

    const handleTrackRecovered = () => {
      addToast('Camera reconnected', 'info');
    };

    const handleTrackFailed = () => {
      addToast('Camera disconnected', 'error');
    };

    // circuit-breaker-restart is silent (no user notification)
    const handleCircuitBreakerRestart = () => {
      console.log('[useRecorder] Circuit breaker restart occurred');
    };

    const handleRecordingResumed = () => {
      addToast('Recording resumed', 'info');
    };

    // Add event listeners
    engine.addEventListener('statechange', handleStateChange);
    engine.addEventListener('timer', handleTimer);
    engine.addEventListener('error', handleError);
    engine.addEventListener('track-recovered', handleTrackRecovered);
    engine.addEventListener('track-failed', handleTrackFailed);
    engine.addEventListener('circuit-breaker-restart', handleCircuitBreakerRestart);
    engine.addEventListener('recording-resumed', handleRecordingResumed);

    // Cleanup on unmount
    return () => {
      engine.removeEventListener('statechange', handleStateChange);
      engine.removeEventListener('timer', handleTimer);
      engine.removeEventListener('error', handleError);
      engine.removeEventListener('track-recovered', handleTrackRecovered);
      engine.removeEventListener('track-failed', handleTrackFailed);
      engine.removeEventListener('circuit-breaker-restart', handleCircuitBreakerRestart);
      engine.removeEventListener('recording-resumed', handleRecordingResumed);
    };
  }, [setRecording, setElapsedMs, setRecordingError, addToast]);

  // Wire up BufferManager events
  useEffect(() => {
    const bufferManager = bufferManagerRef.current;

    const handleStorageWarning = () => {
      addToast('Storage 80% full', 'warning');
    };

    const handleStorageCritical = () => {
      addToast('Storage critically low', 'warning');
    };

    const handleStorageFull = (event: Event) => {
      const customEvent = event as CustomEvent<{ usage: number; quota: number; quotaPercent: number }>;
      const message = `Storage full: ${customEvent.detail.quotaPercent.toFixed(1)}% used`;
      setRecordingError(message);
    };

    // Add event listeners
    bufferManager.addEventListener('storage-warning', handleStorageWarning);
    bufferManager.addEventListener('storage-critical', handleStorageCritical);
    bufferManager.addEventListener('storage-full', handleStorageFull);

    // Cleanup on unmount
    return () => {
      bufferManager.removeEventListener('storage-warning', handleStorageWarning);
      bufferManager.removeEventListener('storage-critical', handleStorageCritical);
      bufferManager.removeEventListener('storage-full', handleStorageFull);
    };
  }, [addToast, setRecordingError]);

  const start = useCallback(async (stream: MediaStream) => {
    await engineRef.current.start(stream);
  }, []);

  const stop = useCallback(async () => {
    await engineRef.current.stop();
  }, []);

  return {
    state: engineRef.current.getState(),
    elapsedMs,
    start,
    stop,
    interruptedSession: interruptedSessionRef.current,
  };
}
