export interface VehicleSettings {
  detectionConfidence: number; // default 0.5
  maxDetections: number; // default 20
  minWidthFraction: number; // default 0.12
  minAreaFraction: number; // default 0
  minStableFrames: number; // default 1
  cooldownMs: number; // default 10_000
  globalThrottleMs: number; // default 2_000
  maxVehicleCaptures: number; // default 200
  fullWidthDetection: boolean; // default false — use full width instead of 1:1 crop
  bboxPadding: number; // default 0 — extra pixels added to each side of drawn bounding boxes
}

export const DEFAULT_VEHICLE_SETTINGS: VehicleSettings = {
  detectionConfidence: 0.5,
  maxDetections: 20,
  minWidthFraction: 0.12,
  minAreaFraction: 0,
  minStableFrames: 1,
  cooldownMs: 10_000,
  globalThrottleMs: 2_000,
  maxVehicleCaptures: 200,
  fullWidthDetection: false,
  bboxPadding: 0,
};

export const VEHICLE_CONFIG = {
  // Vehicle classes eligible for capture (bicycles excluded)
  VEHICLE_CLASSES: ['car', 'truck', 'bus', 'motorcycle'] as const,

  // IoU matching & stale tracking
  IOU_THRESHOLD: 0.4,
  STALE_TIMEOUT_MS: 2_000, // prune tracked vehicle after 2s without detection

  // Visual flash duration after successful capture
  FLASH_DURATION_MS: 1_000,
} as const;

export type VehicleClass = (typeof VEHICLE_CONFIG.VEHICLE_CLASSES)[number];
