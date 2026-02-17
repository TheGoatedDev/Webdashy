import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Detection } from '../services/ObjectDetector';

export function useDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): { detections: Detection[]; modelLoading: boolean } {
  const workerRef = useRef<Worker | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const busyRef = useRef(false);
  const rafRef = useRef(0);

  // Create worker and load model
  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker(
      new URL('../services/detection.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'loaded') {
        setModelLoading(false);
        setModelLoaded(true);
      } else if (type === 'detections') {
        setDetections(e.data.detections);
        busyRef.current = false;
      } else if (type === 'error') {
        console.error('[useDetection]', e.data.error);
        busyRef.current = false;
      }
    };

    setModelLoading(true);
    worker.postMessage({ type: 'load' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      setModelLoaded(false);
      setDetections([]);
    };
  }, [enabled]);

  // Detection loop via requestAnimationFrame
  useEffect(() => {
    if (!enabled || !modelLoaded || !videoRef.current) return;

    const video = videoRef.current;
    const worker = workerRef.current;
    if (!worker) return;

    let cancelled = false;
    let lastSendTime = 0;
    const MIN_INTERVAL = 66; // ~15 FPS cap

    const tick = (): void => {
      if (cancelled) return;

      const now = performance.now();
      if (!busyRef.current && now - lastSendTime >= MIN_INTERVAL && video.readyState >= 2) {
        busyRef.current = true;
        lastSendTime = now;

        createImageBitmap(video)
          .then((frame) => {
            if (cancelled) {
              frame.close();
              busyRef.current = false;
              return;
            }
            worker.postMessage({ type: 'detect', frame }, [frame]);
          })
          .catch(() => {
            busyRef.current = false;
          });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, modelLoaded, videoRef]);

  return { detections, modelLoading };
}
