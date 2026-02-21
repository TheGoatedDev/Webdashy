import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Detection } from '../services/ObjectDetector';
import { ObjectDetector } from '../services/ObjectDetector';
import { useAppStore } from '../store/appStore';

export interface DetectionStats {
  fps: number;
  inferenceMs: number;
  detectionCount: number;
}

export function useDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): { detections: Detection[]; modelLoading: boolean; modelError: string | null; stats: DetectionStats; frameRef: RefObject<ImageBitmap | null> } {
  const detectorRef = useRef<ObjectDetector | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [stats, setStats] = useState<DetectionStats>({ fps: 0, inferenceMs: 0, detectionCount: 0 });
  const busyRef = useRef<boolean>(false);
  const rafRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const frameRef = useRef<ImageBitmap | null>(null);

  // Load model when enabled becomes true
  useEffect(() => {
    if (!enabled) return;

    // Create detector instance once
    if (!detectorRef.current) {
      detectorRef.current = new ObjectDetector();
    }

    const detector = detectorRef.current;

    // Load model if not already loaded
    if (!detector.isLoaded()) {
      setModelLoading(true);
      setModelError(null);
      detector
        .load()
        .then(() => {
          setModelLoading(false);
        })
        .catch((error) => {
          console.error('[useDetection] Failed to load model:', error);
          setModelLoading(false);
          const message = error instanceof Error ? error.message : 'Unknown error';
          setModelError(message);
          useAppStore.getState().addToast('Detection unavailable — model failed to load', 'error');
        });
    }
  }, [enabled]);

  // Run detection loop via requestAnimationFrame with back-pressure
  useEffect(() => {
    if (!enabled || !detectorRef.current?.isLoaded() || !videoRef.current) {
      return;
    }

    const detector = detectorRef.current;
    const video = videoRef.current;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      if (busyRef.current) return; // skip if previous inference still running
      if (video.videoWidth === 0) return;

      busyRef.current = true;
      const { cropTop, cropBottom, plateSettings } = useAppStore.getState();
      const inferenceStart = performance.now();
      detector
        .detect(video, cropTop, cropBottom, plateSettings.fullWidthDetection)
        .then((result) => {
          if (!result) return;
          const { detections: results, frame } = result;
          frameRef.current?.close();
          frameRef.current = frame;
          const inferenceMs = performance.now() - inferenceStart;
          const now = performance.now();
          const frameTimes = frameTimesRef.current;
          frameTimes.push(now);
          // Keep only frames from the last 1 second
          while (frameTimes.length > 0 && now - frameTimes[0] > 1000) {
            frameTimes.shift();
          }
          setDetections(results);
          setStats({ fps: frameTimes.length, inferenceMs: Math.round(inferenceMs), detectionCount: results.length });
        })
        .catch((err) => {
          console.error('[useDetection]', err);
        })
        .finally(() => {
          busyRef.current = false;
        });
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      busyRef.current = false;
      frameRef.current?.close();
      frameRef.current = null;
    };
  }, [enabled, modelLoading, videoRef]);

  // Sync detection settings to ObjectDetector when they change
  useEffect(() => {
    const { plateSettings } = useAppStore.getState();
    detectorRef.current?.updateConfig({
      minConfidence: plateSettings.detectionConfidence,
      maxDetections: plateSettings.maxDetections,
    });
  }, []);

  useEffect(() => {
    return useAppStore.subscribe((state) => {
      const { detectionConfidence, maxDetections } = state.plateSettings;
      detectorRef.current?.updateConfig({
        minConfidence: detectionConfidence,
        maxDetections,
      });
    });
  }, []);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (!enabled && detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [enabled]);

  return { detections, modelLoading, modelError, stats, frameRef };
}
