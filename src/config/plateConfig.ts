export interface PlateSettings {
  detectionConfidence: number; // default 0.5
  maxDetections: number;       // default 20
  ocrConfidence: number;       // default 60
  minTextLength: number;       // default 4
  minWidthFraction: number;    // default 0.05
  minAreaFraction: number;     // default 0
  minStableFrames: number;     // default 1
  cooldownMs: number;          // default 10_000
  globalThrottleMs: number;    // default 2_000
  maxPlateCaptures: number;    // default 200
  fullWidthDetection: boolean; // default false — use full width instead of 1:1 crop
}

export const DEFAULT_PLATE_SETTINGS: PlateSettings = {
  detectionConfidence: 0.5,
  maxDetections: 20,
  ocrConfidence: 60,
  minTextLength: 4,
  minWidthFraction: 0.12,
  minAreaFraction: 0,
  minStableFrames: 1,
  cooldownMs: 10_000,
  globalThrottleMs: 2_000,
  maxPlateCaptures: 200,
  fullWidthDetection: false,
};

export const PLATE_CONFIG = {
  // Vehicle classes eligible for plate detection (bicycles excluded)
  VEHICLE_CLASSES: ['car', 'truck', 'bus', 'motorcycle'] as const,

  // OCR pipeline
  MAX_QUEUE: 3,               // PlateReader drops requests if queue > this
  PLATE_REGION_FRACTION: 0.4, // fraction of vehicle crop height to take from bottom

  // IoU matching & stale tracking
  IOU_THRESHOLD: 0.4,
  STALE_TIMEOUT_MS: 2_000,   // prune tracked vehicle after 2s without detection

  // Visual flash duration after successful capture
  FLASH_DURATION_MS: 1_000,
} as const;

export type VehicleClass = (typeof PLATE_CONFIG.VEHICLE_CLASSES)[number];
