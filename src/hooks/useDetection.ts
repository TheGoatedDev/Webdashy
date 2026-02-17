import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Detection } from '../services/ObjectDetector';
import { ObjectDetector } from '../services/ObjectDetector';

export function useDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): { detections: Detection[]; modelLoading: boolean } {
  const detectorRef = useRef<ObjectDetector | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      detector
        .load()
        .then(() => {
          setModelLoading(false);
          setModelLoaded(true);
        })
        .catch((error) => {
          console.error('[useDetection] Failed to load model:', error);
          setModelLoading(false);
        });
    }
  }, [enabled]);

  // Run detection loop
  useEffect(() => {
    if (!enabled || !modelLoaded || !detectorRef.current?.isLoaded() || !videoRef.current) {
      return;
    }

    const detector = detectorRef.current;
    const video = videoRef.current;
    let cancelled = false;

    const DETECTION_INTERVAL_MS = 66; // ~15 FPS

    const runDetection = async () => {
      if (cancelled) return;

      try {
        const results = await detector.detect(video, performance.now());
        if (!cancelled) {
          setDetections(results);
        }
      } catch (error) {
        console.error('[useDetection] Detection error:', error);
      }

      if (!cancelled) {
        timerRef.current = setTimeout(runDetection, DETECTION_INTERVAL_MS);
      }
    };

    timerRef.current = setTimeout(runDetection, DETECTION_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, modelLoaded, videoRef]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (!enabled && detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [enabled]);

  return { detections, modelLoading };
}
