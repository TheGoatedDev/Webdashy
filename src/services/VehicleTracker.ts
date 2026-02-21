import { PLATE_CONFIG } from '../config/plateConfig';
import type { Detection } from './ObjectDetector';

interface TrackedVehicle {
  id: string;
  bbox: [number, number, number, number];
  class: string;
  score: number;
  consecutiveLargeFrames: number;
  lastSeenMs: number;
  lastCaptureAttemptMs: number;
  plateText: string | null;
  areaFraction: number;
  widthFraction: number;
}

export interface VehicleDebugInfo {
  id: string;
  bbox: [number, number, number, number];
  areaFraction: number;
  widthFraction: number;
  consecutiveLargeFrames: number;
  cooldownRemainingMs: number; // 0 = not on cooldown
  plateText: string | null;
}

export interface EligibleVehicle {
  tracked: TrackedVehicle;
  detection: Detection;
}

export interface VehicleTrackerConfig {
  iouThreshold: number;
  staleTimeoutMs: number;
  minAreaFraction: number;
  minWidthFraction: number;
  minStableFrames: number;
  cooldownMs: number;
}

function iou(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const intersection = ix * iy;
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

export class VehicleTracker {
  private vehicles = new Map<string, TrackedVehicle>();
  private nextId = 0;

  update(
    detections: Detection[],
    videoWidth: number,
    videoHeight: number,
    nowMs: number,
    config: VehicleTrackerConfig,
  ): EligibleVehicle[] {
    const frameArea = videoWidth * videoHeight;

    const vehicleDetections = detections.filter((d) =>
      (PLATE_CONFIG.VEHICLE_CLASSES as readonly string[]).includes(d.class),
    );

    const matched = new Set<string>();
    const eligible: EligibleVehicle[] = [];

    for (const detection of vehicleDetections) {
      let bestId: string | null = null;
      let bestIou: number = config.iouThreshold;

      for (const [id, tracked] of this.vehicles) {
        const score = iou(detection.bbox, tracked.bbox);
        if (score > bestIou) {
          bestIou = score;
          bestId = id;
        }
      }

      const bboxArea = detection.bbox[2] * detection.bbox[3];
      const areaFraction = bboxArea / frameArea;
      const widthFraction = detection.bbox[2] / videoWidth;
      const isLarge =
        areaFraction >= config.minAreaFraction &&
        widthFraction >= config.minWidthFraction;

      if (bestId !== null) {
        const tracked = this.vehicles.get(bestId)!;
        tracked.bbox = detection.bbox;
        tracked.score = detection.score;
        tracked.lastSeenMs = nowMs;
        tracked.areaFraction = areaFraction;
        tracked.widthFraction = widthFraction;
        tracked.consecutiveLargeFrames = isLarge
          ? tracked.consecutiveLargeFrames + 1
          : 0;
        matched.add(bestId);

        const cooldownOk = nowMs - tracked.lastCaptureAttemptMs > config.cooldownMs;
        const stableOk = tracked.consecutiveLargeFrames >= config.minStableFrames;
        if (isLarge && cooldownOk && stableOk) {
          eligible.push({ tracked, detection });
        }
      } else {
        const id = `v${this.nextId++}`;
        const tracked: TrackedVehicle = {
          id,
          bbox: detection.bbox,
          class: detection.class,
          score: detection.score,
          consecutiveLargeFrames: isLarge ? 1 : 0,
          lastSeenMs: nowMs,
          lastCaptureAttemptMs: 0,
          plateText: null,
          areaFraction,
          widthFraction,
        };
        this.vehicles.set(id, tracked);
        matched.add(id);
      }
    }

    // Prune stale vehicles
    for (const [id, tracked] of this.vehicles) {
      if (nowMs - tracked.lastSeenMs > config.staleTimeoutMs) {
        this.vehicles.delete(id);
      }
    }

    return eligible;
  }

  markCaptureAttempt(vehicleId: string, nowMs: number): void {
    const tracked = this.vehicles.get(vehicleId);
    if (tracked) {
      tracked.lastCaptureAttemptMs = nowMs;
      tracked.consecutiveLargeFrames = 0;
    }
  }

  setPlateText(vehicleId: string, text: string): void {
    const tracked = this.vehicles.get(vehicleId);
    if (tracked) {
      tracked.plateText = text;
    }
  }

  getDebugInfo(nowMs: number, config: { cooldownMs: number }): VehicleDebugInfo[] {
    return Array.from(this.vehicles.values()).map((v) => {
      const elapsed = nowMs - v.lastCaptureAttemptMs;
      const cooldownRemainingMs =
        v.lastCaptureAttemptMs > 0
          ? Math.max(0, config.cooldownMs - elapsed)
          : 0;
      return {
        id: v.id,
        bbox: v.bbox,
        areaFraction: v.areaFraction,
        widthFraction: v.widthFraction,
        consecutiveLargeFrames: v.consecutiveLargeFrames,
        cooldownRemainingMs,
        plateText: v.plateText,
      };
    });
  }
}
