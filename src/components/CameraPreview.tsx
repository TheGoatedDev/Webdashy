/**
 * CameraPreview - Fullscreen video element for camera feed
 *
 * Displays the camera stream in a fullscreen viewport with object-fit cover.
 * Critical iOS settings: autoPlay, playsInline, muted.
 */

import { forwardRef, useCallback, useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  ({ stream }, forwardedRef) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Merge forwarded ref with internal ref
    const setRefs = useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
        }
      },
      [forwardedRef],
    );

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <video
        ref={setRefs}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 h-full w-full bg-black object-cover"
      />
    );
  },
);

CameraPreview.displayName = 'CameraPreview';
