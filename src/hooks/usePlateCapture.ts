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

export interface ScanAttempt {
  imageBlob: Blob;
  timestamp: number;
  vehicleClass: string;
}

export interface UsePlateCaptureResult {
  flashBboxes: Array<[number, number, number, number]>;
  vehicleDebugInfo: VehicleDebugInfo[];
  scanAttempt: ScanAttempt | null;
}

export function usePlateCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  detections: Detection[],
  enabled: boolean,
  analyzedFrame: RefObject<ImageBitmap | null>,
): UsePlateCaptureResult {
  const trackerRef = useRef<VehicleTracker | null>(null);
  const readerRef = useRef<PlateReader | null>(null);
  const lastGlobalAttemptRef = useRef<number>(0);
  const [flashBboxes, setFlashBboxes] = useState<Array<[number, number, number, number]>>([]);
  const [scanAttempt, setScanAttempt] = useState<ScanAttempt | null>(null);
  const scanAttemptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleDebugInfoRef = useRef<VehicleDebugInfo[]>([]);
  // Abort flag: set to true on disable/unmount; checked by in-flight async work.
  // Lives in a ref so it survives across detections changes without triggering rerenders.
  const abortRef = useRef(false);

  // Initialize tracker and reader when enabled; cancel in-flight work when disabled
  useEffect(() => {
    if (!enabled) return;

    abortRef.current = false;
    trackerRef.current = new VehicleTracker();
    readerRef.current = new PlateReader();

    return () => {
      abortRef.current = true;
      void readerRef.current?.terminate();
      readerRef.current = null;
      trackerRef.current = null;
      if (scanAttemptTimerRef.current) clearTimeout(scanAttemptTimerRef.current);
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
    const plateSettings = useAppStore.getState().plateSettings;

    const eligible = tracker.update(detections, video.videoWidth, video.videoHeight, nowMs, {
      ...plateSettings,
      iouThreshold: PLATE_CONFIG.IOU_THRESHOLD,
      staleTimeoutMs: PLATE_CONFIG.STALE_TIMEOUT_MS,
    });

    // Always snapshot debug info after tracker update
    vehicleDebugInfoRef.current = tracker.getDebugInfo(nowMs, { cooldownMs: plateSettings.cooldownMs });

    if (eligible.length === 0) return;

    // Global throttle: max one capture attempt per globalThrottleMs
    if (nowMs - lastGlobalAttemptRef.current < plateSettings.globalThrottleMs) return;
    lastGlobalAttemptRef.current = nowMs;

    // Require an analyzed frame before burning the vehicle's capture cooldown
    const frame = analyzedFrame.current;
    if (!frame) return;

    const { tracked, detection } = eligible[0];
    console.log('[PlateCapture] scanning vehicle', tracked.id, tracked.class, detection.bbox);
    tracker.markCaptureAttempt(tracked.id, nowMs);

    const [bx, by, bw, bh] = detection.bbox;
    const vehicleId = tracked.id;
    const vehicleClass = tracked.class;
    const detectionScore = detection.score;
    const bbox = detection.bbox;

    void (async () => {
      // Zero-copy crop — avoids canvas→JPEG→decode round-trip for OCR
      const vehicleBitmap = await createImageBitmap(frame, bx, by, bw, bh).catch(() => null);
      if (!vehicleBitmap) return; // Frame was closed between check and crop

      try {
        // Create JPEG blob separately for popup/storage display
        const vehicleImageBlob = await new Promise<Blob>((resolve, reject) => {
          const vehicleCanvas = document.createElement('canvas');
          vehicleCanvas.width = bw;
          vehicleCanvas.height = bh;
          const vehicleCtx = vehicleCanvas.getContext('2d');
          if (!vehicleCtx) { reject(new Error('no 2d context')); return; }
          vehicleCtx.drawImage(vehicleBitmap, 0, 0);
          vehicleCanvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
            'image/jpeg',
            0.85,
          );
        });

        if (abortRef.current) return;

        // Show popup immediately — before OCR, regardless of result
        if (scanAttemptTimerRef.current) clearTimeout(scanAttemptTimerRef.current);
        setScanAttempt({ imageBlob: vehicleImageBlob, timestamp: nowMs, vehicleClass });
        scanAttemptTimerRef.current = setTimeout(() => setScanAttempt(null), 3000);

        const currentSettings = useAppStore.getState().plateSettings;
        const result = await reader.read(vehicleBitmap, {
          ocrConfidence: currentSettings.ocrConfidence,
          minTextLength: currentSettings.minTextLength,
        });

        if (abortRef.current) return;

        if (!result) {
          console.log('[PlateCapture] no plate found');
        } else {
          console.log('[PlateCapture] plate read:', result.text, `(${result.confidence}% conf)`);
        }

        // Save all attempts — plateText/ocrConfidence/plateRegionBlob are optional
        const id = crypto.randomUUID();
        const capture: PlateCapture = {
          id,
          timestamp: nowMs,
          vehicleImageBlob,
          plateRegionBlob: result?.plateRegionBlob,
          plateText: result?.text,
          ocrConfidence: result?.confidence,
          vehicleClass,
          detectionScore,
          bbox,
        };

        const storage = getClipStorage();
        await storage.addPlateCapture(capture);
        await storage.pruneOldPlateCaptures(useAppStore.getState().plateSettings.maxPlateCaptures);

        if (abortRef.current) return;

        const { addPlateCaptureMetadata, addToast } = useAppStore.getState();
        addPlateCaptureMetadata({
          id,
          timestamp: nowMs,
          plateText: result?.text,
          ocrConfidence: result?.confidence,
          vehicleClass,
          detectionScore,
          bbox,
        });

        // Flash and toast only on successful OCR
        if (result) {
          tracker.setPlateText(vehicleId, result.text);
          addToast(`Plate: ${result.text}`, 'info');
          setFlashBboxes((prev) => [...prev, bbox]);
          setTimeout(() => {
            setFlashBboxes((prev) => prev.filter((b) => b !== bbox));
          }, PLATE_CONFIG.FLASH_DURATION_MS);
        }
      } catch (err: unknown) {
        console.error('[usePlateCapture]', err);
      } finally {
        vehicleBitmap.close();
      }
    })();
  }, [detections, enabled, videoRef]);

  return { flashBboxes, vehicleDebugInfo: vehicleDebugInfoRef.current, scanAttempt };
}
