/**
 * CameraPreview - Fullscreen video element for camera feed
 *
 * Displays the camera stream in a fullscreen viewport with object-fit cover.
 * Critical iOS settings: autoPlay, playsInline, muted.
 */

import { useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="camera-preview"
    />
  );
}
