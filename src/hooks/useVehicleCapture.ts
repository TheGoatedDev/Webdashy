import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { VEHICLE_CONFIG } from '../config/vehicleConfig';
import { getClipStorage } from '../services/ClipStorage';
import type { Detection } from '../services/ObjectDetector';
import type { VehicleDebugInfo } from '../services/VehicleTracker';
import { VehicleTracker } from '../services/VehicleTracker';
import { useAppStore } from '../store/appStore';
import type { VehicleCapture } from '../types/storage';

export interface CapturedVehicle {
  imageBlob: Blob;
  timestamp: number;
  vehicleClass: string;
}

export interface UseVehicleCaptureResult {
  flashBboxes: Array<[number, number, number, number]>;
  vehicleDebugInfo: VehicleDebugInfo[];
  capturedVehicle: CapturedVehicle | null;
}

export function useVehicleCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  detections: Detection[],
  enabled: boolean,
  analyzedFrame: RefObject<ImageBitmap | null>,
): UseVehicleCaptureResult {
  const trackerRef = useRef<VehicleTracker | null>(null);
  const lastGlobalAttemptRef = useRef<number>(0);
  const [flashBboxes, setFlashBboxes] = useState<Array<[number, number, number, number]>>([]);
  const [capturedVehicle, setCapturedVehicle] = useState<CapturedVehicle | null>(null);
  const capturedVehicleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleDebugInfoRef = useRef<VehicleDebugInfo[]>([]);
  // Abort flag: set to true on disable/unmount; checked by in-flight async work.
  const abortRef = useRef(false);

  // Initialize tracker when enabled; cancel in-flight work when disabled
  useEffect(() => {
    if (!enabled) return;

    abortRef.current = false;
    trackerRef.current = new VehicleTracker();

    return () => {
      abortRef.current = true;
      trackerRef.current = null;
      if (capturedVehicleTimerRef.current) clearTimeout(capturedVehicleTimerRef.current);
    };
  }, [enabled]);

  // Process each detection update
  useEffect(() => {
    if (!enabled) return;

    const tracker = trackerRef.current;
    if (!tracker) return;

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const nowMs = Date.now();
    const vehicleSettings = useAppStore.getState().vehicleSettings;

    const eligible = tracker.update(detections, video.videoWidth, video.videoHeight, nowMs, {
      ...vehicleSettings,
      iouThreshold: VEHICLE_CONFIG.IOU_THRESHOLD,
      staleTimeoutMs: VEHICLE_CONFIG.STALE_TIMEOUT_MS,
    });

    // Always snapshot debug info after tracker update
    vehicleDebugInfoRef.current = tracker.getDebugInfo(nowMs, {
      cooldownMs: vehicleSettings.cooldownMs,
    });

    if (eligible.length === 0) return;

    // Global throttle: max one capture attempt per globalThrottleMs
    if (nowMs - lastGlobalAttemptRef.current < vehicleSettings.globalThrottleMs) return;
    lastGlobalAttemptRef.current = nowMs;

    // Require an analyzed frame before burning the vehicle's capture cooldown
    const frame = analyzedFrame.current;
    if (!frame) return;

    const { tracked, detection } = eligible[0];
    console.log('[useVehicleCapture] capturing vehicle', tracked.id, tracked.class, detection.bbox);
    tracker.markCaptureAttempt(tracked.id, nowMs);

    const [bx, by, bw, bh] = detection.bbox;
    const vehicleClass = tracked.class;
    const detectionScore = detection.score;
    const bbox = detection.bbox;

    void (async () => {
      const vehicleBitmap = await createImageBitmap(frame, bx, by, bw, bh).catch(() => null);
      if (!vehicleBitmap) return;

      try {
        const vehicleImageBlob = await new Promise<Blob>((resolve, reject) => {
          const vehicleCanvas = document.createElement('canvas');
          vehicleCanvas.width = bw;
          vehicleCanvas.height = bh;
          const vehicleCtx = vehicleCanvas.getContext('2d');
          if (!vehicleCtx) {
            reject(new Error('no 2d context'));
            return;
          }
          vehicleCtx.drawImage(vehicleBitmap, 0, 0);
          vehicleCanvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
            'image/jpeg',
            0.85,
          );
        });

        if (abortRef.current) return;

        // Show capture notification briefly
        if (capturedVehicleTimerRef.current) clearTimeout(capturedVehicleTimerRef.current);
        setCapturedVehicle({ imageBlob: vehicleImageBlob, timestamp: nowMs, vehicleClass });
        capturedVehicleTimerRef.current = setTimeout(() => setCapturedVehicle(null), 3000);

        const id = crypto.randomUUID();
        const capture: VehicleCapture = {
          id,
          timestamp: nowMs,
          vehicleImageBlob,
          vehicleClass,
          detectionScore,
          bbox,
        };

        const storage = getClipStorage();
        await storage.addVehicleCapture(capture);
        await storage.pruneOldVehicleCaptures(
          useAppStore.getState().vehicleSettings.maxVehicleCaptures,
        );

        if (abortRef.current) return;

        const { addVehicleCaptureMetadata } = useAppStore.getState();
        addVehicleCaptureMetadata({ id, timestamp: nowMs, vehicleClass, detectionScore, bbox });

        // Flash bbox briefly on capture
        setFlashBboxes((prev) => [...prev, bbox]);
        setTimeout(() => {
          setFlashBboxes((prev) => prev.filter((b) => b !== bbox));
        }, VEHICLE_CONFIG.FLASH_DURATION_MS);
      } catch (err: unknown) {
        console.error('[useVehicleCapture]', err);
      } finally {
        vehicleBitmap.close();
      }
    })();
  }, [detections, enabled, videoRef, analyzedFrame]);

  return { flashBboxes, vehicleDebugInfo: vehicleDebugInfoRef.current, capturedVehicle };
}
