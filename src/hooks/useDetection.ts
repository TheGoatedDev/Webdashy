import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ObjectDetector } from '../services/ObjectDetector';
import type { Detection } from '../services/ObjectDetector';

export function useDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean
): { detections: Detection[]; modelLoading: boolean } {
  const detectorRef = useRef<ObjectDetector | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

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
        })
        .catch((error) => {
          console.error('[useDetection] Failed to load model:', error);
          setModelLoading(false);
        });
    }
  }, [enabled]);

  // Run detection loop
  useEffect(() => {
    if (!enabled || !detectorRef.current?.isLoaded() || !videoRef.current) {
      return;
    }

    const detector = detectorRef.current;
    const video = videoRef.current;
    let cancelled = false;

    const DETECTION_INTERVAL_MS = 200; // ~5 FPS

    const runDetection = async () => {
      if (cancelled) return;

      const now = performance.now();
      const timeSinceLastDetection = now - lastDetectionTimeRef.current;

      // Throttle to target FPS
      if (timeSinceLastDetection >= DETECTION_INTERVAL_MS) {
        try {
          const results = await detector.detect(video);
          if (!cancelled) {
            setDetections(results);
            lastDetectionTimeRef.current = now;
          }
        } catch (error) {
          console.error('[useDetection] Detection error:', error);
        }
      }

      // Schedule next frame
      if (!cancelled) {
        animationFrameRef.current = requestAnimationFrame(runDetection);
      }
    };

    // Start the loop
    animationFrameRef.current = requestAnimationFrame(runDetection);

    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, videoRef]);

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
