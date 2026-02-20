import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PLATE_CONFIG } from '../config/plateConfig';
import type { Detection } from '../services/ObjectDetector';
import { PlateReader } from '../services/PlateReader';
import type { VehicleDebugInfo } from '../services/VehicleTracker';
import { VehicleTracker } from '../services/VehicleTracker';
import { getClipStorage } from '../services/ClipStorage';
import { useAppStore } from '../store/appStore';
import type { PlateCapture } from '../types/storage';

export interface UsePlateCaptureResult {
  flashBboxes: Array<[number, number, number, number]>;
  vehicleDebugInfo: VehicleDebugInfo[];
}

export function usePlateCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  detections: Detection[],
  enabled: boolean,
): UsePlateCaptureResult {
  const trackerRef = useRef<VehicleTracker | null>(null);
  const readerRef = useRef<PlateReader | null>(null);
  const lastGlobalAttemptRef = useRef<number>(0);
  const [flashBboxes, setFlashBboxes] = useState<Array<[number, number, number, number]>>([]);
  const [vehicleDebugInfo, setVehicleDebugInfo] = useState<VehicleDebugInfo[]>([]);

  // Initialize tracker and reader when enabled
  useEffect(() => {
    if (!enabled) return;

    trackerRef.current = new VehicleTracker();
    readerRef.current = new PlateReader();

    return () => {
      void readerRef.current?.terminate();
      readerRef.current = null;
      trackerRef.current = null;
    };
  }, [enabled]);

  // Process each detection update
  useEffect(() => {
    if (!enabled) return;

    const tracker = trackerRef.current;
    const reader = readerRef.current;
    if (!tracker || !reader) return;

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const nowMs = Date.now();
    const eligible = tracker.update(detections, video.videoWidth, video.videoHeight, nowMs);

    // Always snapshot debug info after tracker update
    setVehicleDebugInfo(tracker.getDebugInfo(nowMs));

    if (eligible.length === 0) return;

    // Global throttle: max one capture attempt per GLOBAL_THROTTLE_MS
    if (nowMs - lastGlobalAttemptRef.current < PLATE_CONFIG.GLOBAL_THROTTLE_MS) return;
    lastGlobalAttemptRef.current = nowMs;

    const { tracked, detection } = eligible[0];
    tracker.markCaptureAttempt(tracked.id, nowMs);

    // Crop the vehicle bbox from video using OffscreenCanvas
    const [bx, by, bw, bh] = detection.bbox;
    const vehicleCanvas = new OffscreenCanvas(bw, bh);
    const vehicleCtx = vehicleCanvas.getContext('2d');
    if (!vehicleCtx) return;

    vehicleCtx.drawImage(video, bx, by, bw, bh, 0, 0, bw, bh);

    const vehicleId = tracked.id;
    const vehicleClass = tracked.class;
    const detectionScore = detection.score;
    const bbox = detection.bbox;

    vehicleCanvas
      .convertToBlob({ type: 'image/jpeg', quality: 0.85 })
      .then(async (vehicleImageBlob) => {
        const result = await reader.read(vehicleImageBlob);
        if (!result) return;

        const id = crypto.randomUUID();
        const capture: PlateCapture = {
          id,
          timestamp: nowMs,
          vehicleImageBlob,
          plateRegionBlob: result.plateRegionBlob,
          plateText: result.text,
          ocrConfidence: result.confidence,
          vehicleClass,
          detectionScore,
          bbox,
        };

        const storage = getClipStorage();
        await storage.addPlateCapture(capture);
        await storage.pruneOldPlateCaptures(PLATE_CONFIG.MAX_PLATE_CAPTURES);

        const { addPlateCaptureMetadata, addToast } = useAppStore.getState();
        addPlateCaptureMetadata({
          id,
          timestamp: nowMs,
          plateText: result.text,
          ocrConfidence: result.confidence,
          vehicleClass,
          detectionScore,
          bbox,
        });

        tracker.setPlateText(vehicleId, result.text);
        addToast(`Plate: ${result.text}`, 'info');

        // Flash the captured vehicle bbox for FLASH_DURATION_MS
        setFlashBboxes((prev) => [...prev, bbox]);
        setTimeout(() => {
          setFlashBboxes((prev) => prev.filter((b) => b !== bbox));
        }, PLATE_CONFIG.FLASH_DURATION_MS);
      })
      .catch((err: unknown) => {
        console.error('[usePlateCapture]', err);
      });
  }, [detections, enabled, videoRef]);

  return { flashBboxes, vehicleDebugInfo };
}
