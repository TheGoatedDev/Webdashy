import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { Detection } from '../services/ObjectDetector';

interface DetectionOverlayProps {
  detections: Detection[];
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function DetectionOverlay({ detections, videoRef }: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw detections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || video.videoWidth === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get video and canvas dimensions
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;

    // Calculate object-fit: cover transformation
    let scale: number;
    let offsetX = 0;
    let offsetY = 0;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - crop sides
      scale = canvas.height / video.videoHeight;
      offsetX = (canvas.width - video.videoWidth * scale) / 2;
    } else {
      // Video is taller than canvas - crop top/bottom
      scale = canvas.width / video.videoWidth;
      offsetY = (canvas.height - video.videoHeight * scale) / 2;
    }

    // Draw each detection
    for (const detection of detections) {
      const [x, y, width, height] = detection.bbox;

      // Transform bbox coordinates from video space to canvas space
      const canvasX = x * scale + offsetX;
      const canvasY = y * scale + offsetY;
      const canvasWidth = width * scale;
      const canvasHeight = height * scale;

      // Choose color based on class
      const isPerson = detection.class === 'person';
      const color = isPerson ? '#ffd60a' : '#00d4aa'; // Yellow for people, HUD teal for vehicles

      // Draw rounded rectangle border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      const radius = 4;
      ctx.moveTo(canvasX + radius, canvasY);
      ctx.lineTo(canvasX + canvasWidth - radius, canvasY);
      ctx.quadraticCurveTo(canvasX + canvasWidth, canvasY, canvasX + canvasWidth, canvasY + radius);
      ctx.lineTo(canvasX + canvasWidth, canvasY + canvasHeight - radius);
      ctx.quadraticCurveTo(
        canvasX + canvasWidth,
        canvasY + canvasHeight,
        canvasX + canvasWidth - radius,
        canvasY + canvasHeight,
      );
      ctx.lineTo(canvasX + radius, canvasY + canvasHeight);
      ctx.quadraticCurveTo(
        canvasX,
        canvasY + canvasHeight,
        canvasX,
        canvasY + canvasHeight - radius,
      );
      ctx.lineTo(canvasX, canvasY + radius);
      ctx.quadraticCurveTo(canvasX, canvasY, canvasX + radius, canvasY);
      ctx.closePath();
      ctx.stroke();

      // Draw label
      const label = `${detection.class} ${Math.round(detection.score * 100)}%`;
      ctx.font = "11px 'Chakra Petch', monospace";
      ctx.globalAlpha = 1;

      // Measure text for background pill
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 11;
      const padding = 4;
      const pillWidth = textWidth + padding * 2;
      const pillHeight = textHeight + padding * 2;

      // Position label above box (or below if too close to top)
      const labelY = canvasY > pillHeight + 4 ? canvasY - 4 : canvasY + canvasHeight + 4;

      // Draw background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(canvasX, labelY - pillHeight, pillWidth, pillHeight, 3);
      ctx.fill();

      // Draw text
      ctx.fillStyle = 'white';
      ctx.fillText(label, canvasX + padding, labelY - padding - 2);
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }, [detections, videoRef]);

  // Sync canvas size with video element display size using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    });

    resizeObserver.observe(video);

    // Initial size
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    return () => {
      resizeObserver.disconnect();
    };
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1]"
    />
  );
}
