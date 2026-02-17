import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Detection } from '../services/ObjectDetector';
import { ObjectDetector } from '../services/ObjectDetector';
import { useAppStore } from '../store/appStore';

export function useDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): { detections: Detection[]; modelLoading: boolean } {
  const detectorRef = useRef<ObjectDetector | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const rafRef = useRef<number>(0);

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
      const { cropTop, cropBottom } = useAppStore.getState();
      detector
        .detect(video, cropTop, cropBottom)
        .then((results) => {
          setDetections(results);
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
    };
  }, [enabled, modelLoading, videoRef]);

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
