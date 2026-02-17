/**
 * useCamera - Camera stream management hook
 *
 * Handles getUserMedia with environment-facing camera configuration,
 * friendly error messages, and cleanup on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getMediaStream } from '../services/DevStream';
import { useAppStore } from '../store/appStore';

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
  setZoom: (level: number) => void;
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { setCameraError, setCameraReady, setZoomCapabilities, setZoomLevel } = useAppStore();

  const requestCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraError(null);

      const mediaStream = await getMediaStream({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraReady(true);

      // Check zoom capabilities
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.zoom) {
          setZoomCapabilities(
            capabilities.zoom.min,
            capabilities.zoom.max,
            capabilities.zoom.step,
          );
        }
      }
    } catch (err) {
      let errorMessage = 'Camera is not available right now';

      if (err instanceof Error) {
        // NotAllowedError = user denied permission
        if (err.name === 'NotAllowedError') {
          errorMessage =
            'Camera access denied. Please enable camera permissions in your browser settings.';
        }
        // NotFoundError = no camera device found
        else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        }
      }

      setError(errorMessage);
      setCameraError(errorMessage);
      setCameraReady(false);
    }
  }, [setCameraError, setCameraReady, setZoomCapabilities]);

  const setZoom = useCallback(
    (level: number) => {
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      if (!videoTrack) return;

      videoTrack
        .applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] })
        .then(() => setZoomLevel(level))
        .catch(() => {
          // Silently fail — device may not support this zoom level
        });
    },
    [setZoomLevel],
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
      setStream(null);
      setCameraReady(false);
    }
  }, [setCameraReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  return {
    stream,
    error,
    requestCamera,
    stopCamera,
    setZoom,
  };
}
