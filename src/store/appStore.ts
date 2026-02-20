/**
 * AppStore - Zustand store for UI state management
 *
 * ARCHITECTURE RULE: Video blobs NEVER enter this store.
 * Services handle blob storage, this store only manages UI state.
 */

import { create } from 'zustand';
import type { StorageStats, StorageWarningLevel } from '../types/storage';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface AppState {
  // Recording state
  isRecording: boolean;
  elapsedMs: number;
  recordingError: string | null;

  // Camera state
  cameraError: string | null;
  cameraReady: boolean;

  // Storage state
  storageStats: StorageStats | null;
  storageWarningLevel: StorageWarningLevel;
  showStoragePanel: boolean;

  // Battery state
  isPluggedIn: boolean;
  batteryLevel: number | null;
  showBatteryWarning: boolean;

  // Detection state
  detectionEnabled: boolean;
  debugOverlay: boolean;

  // Crop region state
  cropTop: number;
  cropBottom: number;

  // Zoom state
  zoomLevel: number;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  zoomSupported: boolean;

  // Toast messages
  toasts: Toast[];

  // Actions
  setRecording: (recording: boolean) => void;
  setElapsedMs: (ms: number) => void;
  setRecordingError: (error: string | null) => void;
  setCameraError: (error: string | null) => void;
  setCameraReady: (ready: boolean) => void;
  setStorageStats: (stats: StorageStats) => void;
  setStorageWarningLevel: (level: StorageWarningLevel) => void;
  toggleStoragePanel: () => void;
  setBatteryState: (pluggedIn: boolean, level: number | null) => void;
  toggleDetection: () => void;
  toggleDebugOverlay: () => void;
  setCropRegion: (top: number, bottom: number) => void;
  setZoomCapabilities: (min: number, max: number, step: number) => void;
  setZoomLevel: (level: number) => void;
  addToast: (message: string, type: 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isRecording: false,
  elapsedMs: 0,
  recordingError: null,
  cameraError: null,
  cameraReady: false,
  storageStats: null,
  storageWarningLevel: 'ok',
  showStoragePanel: false,
  isPluggedIn: true,
  batteryLevel: null,
  showBatteryWarning: false,
  detectionEnabled: true,
  debugOverlay: false,
  cropTop: 0,
  cropBottom: 100,
  zoomLevel: 1,
  zoomMin: 1,
  zoomMax: 1,
  zoomStep: 0.1,
  zoomSupported: false,
  toasts: [],

  // Actions
  setRecording: (recording) => set({ isRecording: recording }),

  setElapsedMs: (ms) => set({ elapsedMs: ms }),

  setRecordingError: (error) => set({ recordingError: error }),

  setCameraError: (error) => set({ cameraError: error }),

  setCameraReady: (ready) => set({ cameraReady: ready }),

  setStorageStats: (stats) => set({ storageStats: stats }),

  setStorageWarningLevel: (level) => set({ storageWarningLevel: level }),

  toggleStoragePanel: () => set((state) => ({ showStoragePanel: !state.showStoragePanel })),

  setBatteryState: (pluggedIn, level) => set({ isPluggedIn: pluggedIn, batteryLevel: level }),

  toggleDetection: () => set((state) => ({ detectionEnabled: !state.detectionEnabled })),

  toggleDebugOverlay: () => set((state) => ({ debugOverlay: !state.debugOverlay })),

  setCropRegion: (top, bottom) => set({ cropTop: top, cropBottom: bottom }),

  setZoomCapabilities: (min, max, step) =>
    set({ zoomMin: min, zoomMax: max, zoomStep: step, zoomSupported: true, zoomLevel: min }),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  addToast: (message, type) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
