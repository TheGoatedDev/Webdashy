export const PLATE_CONFIG = {
  // Eligibility thresholds
  MIN_AREA_FRACTION: 0,       // bbox area must be ≥0% of frame area
  MIN_WIDTH_FRACTION: 0.05,   // bbox width must be ≥5% of frame width

  // Vehicle classes eligible for plate detection (bicycles excluded)
  VEHICLE_CLASSES: ['car', 'truck', 'bus', 'motorcycle'] as const,

  // Rate limiting
  COOLDOWN_MS: 10_000,         // 10s cooldown per vehicle after any capture attempt
  MIN_STABLE_FRAMES: 3,        // consecutive large frames required before capture
  GLOBAL_THROTTLE_MS: 2_000,  // max 1 capture attempt every 2s globally
  MAX_QUEUE: 3,                // PlateReader drops requests if queue > this

  // IoU matching & stale tracking
  IOU_THRESHOLD: 0.4,
  STALE_TIMEOUT_MS: 2_000,    // prune tracked vehicle after 2s without detection

  // OCR quality filters
  MIN_OCR_CONFIDENCE: 60,     // Tesseract confidence threshold (0-100)
  MIN_TEXT_LENGTH: 4,          // minimum characters for a valid plate

  // Preprocessing: fraction of vehicle crop height to take from bottom
  PLATE_REGION_FRACTION: 0.6,

  // Storage cap
  MAX_PLATE_CAPTURES: 200,

  // Visual flash duration after successful capture
  FLASH_DURATION_MS: 1_000,
} as const;

export type VehicleClass = (typeof PLATE_CONFIG.VEHICLE_CLASSES)[number];
