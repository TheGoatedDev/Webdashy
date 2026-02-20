import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { Detection } from '../services/ObjectDetector';
import type { DetectionStats } from '../hooks/useDetection';
import { useAppStore } from '../store/appStore';

interface DetectionOverlayProps {
  detections: Detection[];
  videoRef: RefObject<HTMLVideoElement | null>;
  stats: DetectionStats;
}

export function DetectionOverlay({ detections, videoRef, stats }: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { cropTop, cropBottom, debugOverlay } = useAppStore();

  // Draw detections and crop region on canvas
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
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const videoAspect = videoW / videoH;
    const canvasAspect = canvas.width / canvas.height;

    // Calculate object-fit: cover transformation
    let coverScale: number;
    let offsetX = 0;
    let offsetY = 0;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas - crop sides
      coverScale = canvas.height / videoH;
      offsetX = (canvas.width - videoW * coverScale) / 2;
    } else {
      // Video is taller than canvas - crop top/bottom
      coverScale = canvas.width / videoW;
      offsetY = (canvas.height - videoH * coverScale) / 2;
    }

    // Draw crop region darkened areas (outside crop bounds) using cover-space coords
    const topBarY = offsetY;
    const topBarH = (cropTop / 100) * videoH * coverScale;
    const bottomBarY = offsetY + (cropBottom / 100) * videoH * coverScale;
    const bottomBarH = canvas.height - bottomBarY;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    if (topBarH > 0) {
      ctx.fillRect(0, topBarY, canvas.width, topBarH);
    }
    if (bottomBarH > 0) {
      ctx.fillRect(0, bottomBarY, canvas.width, bottomBarH);
    }

    // Compute effective detection region (mirrors preprocess math)
    const cropHeight = videoH * (cropBottom - cropTop) / 100;
    let cropXStart: number;
    let cropWidth: number;
    if (videoW > cropHeight) {
      cropWidth = cropHeight;
      cropXStart = (videoW - cropWidth) / 2;
    } else {
      cropWidth = videoW;
      cropXStart = 0;
    }

    // Debug: draw transparent red box for the actual detection zone
    if (debugOverlay) {
      const zoneX = cropXStart * coverScale + offsetX;
      const zoneY = (videoH * cropTop / 100) * coverScale + offsetY;
      const zoneW = cropWidth * coverScale;
      const zoneH = cropHeight * coverScale;

      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fillRect(zoneX, zoneY, zoneW, zoneH);

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(zoneX + 1, zoneY + 1, zoneW - 2, zoneH - 2);
      ctx.setLineDash([]);

      // Label the detection zone
      ctx.font = "bold 11px 'Chakra Petch', monospace";
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillText('DETECTION ZONE', zoneX + 8, zoneY + 16);
    }

    // Draw each detection
    for (const detection of detections) {
      const [x, y, width, height] = detection.bbox;

      // Transform bbox coordinates from video space to canvas space
      const canvasX = x * coverScale + offsetX;
      const canvasY = y * coverScale + offsetY;
      const canvasWidth = width * coverScale;
      const canvasHeight = height * coverScale;

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

    // Debug: draw stats panel in bottom-left
    if (debugOverlay) {
      const lines = [
        `FPS: ${stats.fps}`,
        `INFERENCE: ${stats.inferenceMs}ms`,
        `OBJECTS: ${stats.detectionCount}`,
        `CROP: ${cropTop}%-${cropBottom}%`,
        `RES: ${videoW}x${videoH}`,
        `MODEL: ${Math.round(cropWidth / videoW * 100)}% W`,
      ];

      const lineHeight = 16;
      const panelPadding = 8;
      const panelWidth = 170;
      const panelHeight = lines.length * lineHeight + panelPadding * 2;
      const panelX = 8;
      const panelY = canvas.height - panelHeight - 8;

      // Panel background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 4);
      ctx.fill();

      // Panel border
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 4);
      ctx.stroke();

      // Text
      ctx.font = "11px 'Chakra Petch', monospace";
      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], panelX + panelPadding, panelY + panelPadding + (i + 1) * lineHeight - 3);
      }
    }
  }, [detections, videoRef, cropTop, cropBottom, debugOverlay, stats]);

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
