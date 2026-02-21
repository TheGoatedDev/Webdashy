/**
 * AppStore - Zustand store for UI state management
 *
 * ARCHITECTURE RULE: Video blobs NEVER enter this store.
 * Services handle blob storage, this store only manages UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VehicleSettings } from '../config/vehicleConfig';
import { DEFAULT_VEHICLE_SETTINGS } from '../config/vehicleConfig';
import type { StorageStats, StorageWarningLevel, VehicleCaptureMetadata } from '../types/storage';

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
  cropCenterX: number;

  // Zoom state
  zoomLevel: number;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  zoomSupported: boolean;

  // Vehicle capture state
  vehicleCaptures: VehicleCaptureMetadata[];
  showVehicleGallery: boolean;
  vehicleCaptureEnabled: boolean;

  // Settings state
  vehicleSettings: VehicleSettings;
  showSettings: boolean;

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
  setCropCenterX: (x: number) => void;
  setZoomCapabilities: (min: number, max: number, step: number) => void;
  setZoomLevel: (level: number) => void;
  addToast: (message: string, type: 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Vehicle capture actions
  toggleVehicleGallery: () => void;
  toggleVehicleCapture: () => void;
  addVehicleCaptureMetadata: (meta: VehicleCaptureMetadata) => void;
  removeVehicleCaptureMetadata: (id: string) => void;
  setVehicleCaptures: (captures: VehicleCaptureMetadata[]) => void;

  // Settings actions
  setVehicleSettings: (partial: Partial<VehicleSettings>) => void;
  resetVehicleSettings: () => void;
  toggleSettings: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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
      cropCenterX: 50,
      zoomLevel: 1,
      zoomMin: 1,
      zoomMax: 1,
      zoomStep: 0.1,
      zoomSupported: false,
      vehicleCaptures: [],
      showVehicleGallery: false,
      vehicleCaptureEnabled: true,
      vehicleSettings: DEFAULT_VEHICLE_SETTINGS,
      showSettings: false,
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

      setCropCenterX: (x) => set({ cropCenterX: x }),

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

      toggleVehicleGallery: () =>
        set((state) => ({ showVehicleGallery: !state.showVehicleGallery })),

      toggleVehicleCapture: () =>
        set((state) => ({ vehicleCaptureEnabled: !state.vehicleCaptureEnabled })),

      addVehicleCaptureMetadata: (meta) =>
        set((state) => ({
          vehicleCaptures: [meta, ...state.vehicleCaptures].slice(
            0,
            state.vehicleSettings.maxVehicleCaptures,
          ),
        })),

      removeVehicleCaptureMetadata: (id) =>
        set((state) => ({ vehicleCaptures: state.vehicleCaptures.filter((c) => c.id !== id) })),

      setVehicleCaptures: (captures) => set({ vehicleCaptures: captures }),

      setVehicleSettings: (partial) =>
        set((state) => ({ vehicleSettings: { ...state.vehicleSettings, ...partial } })),

      resetVehicleSettings: () => set({ vehicleSettings: DEFAULT_VEHICLE_SETTINGS }),

      toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
    }),
    {
      name: 'webdashy-settings',
      partialize: (state) => ({
        cropTop: state.cropTop,
        cropBottom: state.cropBottom,
        cropCenterX: state.cropCenterX,
        vehicleCaptureEnabled: state.vehicleCaptureEnabled,
        vehicleSettings: state.vehicleSettings,
      }),
    },
  ),
);
