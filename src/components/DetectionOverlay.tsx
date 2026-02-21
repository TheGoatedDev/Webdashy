import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { DetectionStats } from '../hooks/useDetection';
import type { CropRegion, Detection } from '../services/ObjectDetector';
import type { VehicleDebugInfo } from '../services/VehicleTracker';
import { useAppStore } from '../store/appStore';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function bboxIou(a: [number, number, number, number], b: [number, number, number, number]): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const intersection = ix * iy;
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

interface DetectionOverlayProps {
  detections: Detection[];
  videoRef: RefObject<HTMLVideoElement | null>;
  stats: DetectionStats;
  flashBboxes?: Array<[number, number, number, number]>;
  vehicleDebugInfo?: VehicleDebugInfo[];
  cropRegionRef: RefObject<CropRegion | null>;
}

export function DetectionOverlay({
  detections,
  videoRef,
  stats,
  flashBboxes,
  vehicleDebugInfo,
  cropRegionRef,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { cropTop, cropBottom, debugOverlay, vehicleSettings } = useAppStore();
  const { fullWidthDetection } = vehicleSettings;

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

    // Debug: draw transparent red box for the actual detection zone
    if (debugOverlay) {
      const cropRegion = cropRegionRef.current;
      const zoneX = (cropRegion?.sx ?? 0) * coverScale + offsetX;
      const zoneY = (cropRegion?.sy ?? (videoH * cropTop) / 100) * coverScale + offsetY;
      const zoneW = (cropRegion?.sw ?? videoW) * coverScale;
      const zoneH = (cropRegion?.sh ?? (videoH * (cropBottom - cropTop)) / 100) * coverScale;

      ctx.fillStyle = 'rgba(255, 59, 48, 0.15)';
      ctx.fillRect(zoneX, zoneY, zoneW, zoneH);

      ctx.strokeStyle = 'rgba(255, 59, 48, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(zoneX + 1, zoneY + 1, zoneW - 2, zoneH - 2);
      ctx.setLineDash([]);

      // Label the detection zone
      ctx.font = "bold 11px 'Chakra Petch', monospace";
      ctx.fillStyle = 'rgba(255, 59, 48, 0.8)';
      ctx.fillText('DETECTION ZONE', zoneX + 8, zoneY + 16);
    }

    // Padding in canvas pixels
    const pad = vehicleSettings.bboxPadding * coverScale;

    // Draw each detection
    for (const detection of detections) {
      const [x, y, width, height] = detection.bbox;

      // Transform bbox coordinates from video space to canvas space, then expand by padding
      const canvasX = x * coverScale + offsetX - pad;
      const canvasY = y * coverScale + offsetY - pad;
      const canvasWidth = width * coverScale + pad * 2;
      const canvasHeight = height * coverScale + pad * 2;

      // Check if this bbox is currently flashing (vehicle just captured)
      const isFlashing = flashBboxes?.some((fb) => bboxIou(detection.bbox, fb) >= 0.3) ?? false;

      // Choose color: flash/person → warn yellow, vehicles → hud teal
      const isPerson = detection.class === 'person';
      const color = isFlashing ? '#ffd60a' : isPerson ? '#ffd60a' : '#00d4aa';

      // Draw rounded rectangle border (thicker when flashing)
      ctx.strokeStyle = color;
      ctx.lineWidth = isFlashing ? 3 : 2;
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

      // Find matching tracker debug entry for this detection (when debug overlay is on)
      const dbgEntry = debugOverlay
        ? (vehicleDebugInfo?.find((d) => bboxIou(detection.bbox, d.bbox) >= 0.3) ?? null)
        : null;

      let debugLine: string | null = null;
      if (dbgEntry) {
        const areaStr = `A:${Math.round(dbgEntry.areaFraction * 100)}%`;
        const widthStr = `W:${Math.round(dbgEntry.widthFraction * 100)}%`;
        const frameStr = `F:${Math.min(dbgEntry.consecutiveLargeFrames, vehicleSettings.minStableFrames)}/${vehicleSettings.minStableFrames}`;
        const suffix =
          dbgEntry.cooldownRemainingMs > 0
            ? `COOL ${Math.ceil(dbgEntry.cooldownRemainingMs / 1000)}s`
            : '';
        debugLine = `${areaStr} ${widthStr} ${frameStr}${suffix ? ` ${suffix}` : ''}`;
      }

      // Measure text for background pill
      const padding = 4;
      const lineH = 11;
      ctx.font = "11px 'Chakra Petch', monospace";
      const mainWidth = ctx.measureText(label).width;
      let debugWidth = 0;
      if (debugLine) {
        ctx.font = "10px 'Chakra Petch', monospace";
        debugWidth = ctx.measureText(debugLine).width;
      }
      const pillWidth = Math.max(mainWidth, debugWidth) + padding * 2;
      const pillHeight = debugLine ? lineH + padding * 2 + lineH + 2 : lineH + padding * 2;

      // Position label above box (or below if too close to top)
      const labelY = canvasY > pillHeight + 4 ? canvasY - 4 : canvasY + canvasHeight + 4;

      // Draw background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      roundRectPath(ctx, canvasX, labelY - pillHeight, pillWidth, pillHeight, 3);
      ctx.fill();

      // Draw main label
      ctx.font = "11px 'Chakra Petch', monospace";
      ctx.fillStyle = 'white';
      ctx.fillText(label, canvasX + padding, labelY - padding - (debugLine ? lineH + 4 : 2));

      // Draw debug line
      if (debugLine && dbgEntry) {
        ctx.font = "10px 'Chakra Petch', monospace";
        const areaOk = dbgEntry.areaFraction >= vehicleSettings.minAreaFraction;
        const widthOk = dbgEntry.widthFraction >= vehicleSettings.minWidthFraction;
        const eligible = areaOk && widthOk;
        ctx.fillStyle =
          dbgEntry.cooldownRemainingMs > 0
            ? 'rgba(255, 59, 48, 0.85)'
            : eligible
              ? '#ffd60a'
              : 'rgba(255,255,255,0.5)';
        ctx.fillText(debugLine, canvasX + padding, labelY - padding - 2);
      }
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }, [
    detections,
    videoRef,
    cropTop,
    cropBottom,
    debugOverlay,
    vehicleSettings,
    stats,
    flashBboxes,
    vehicleDebugInfo,
    cropRegionRef,
  ]);

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

  // Compute stats for the debug panel (reads video dims at render time)
  const video = videoRef.current;
  const videoW = video?.videoWidth ?? 0;
  const videoH = video?.videoHeight ?? 0;
  const cropHeight = (videoH * (cropBottom - cropTop)) / 100;
  const cropWidth = !fullWidthDetection && videoW > cropHeight ? cropHeight : videoW;
  const modelPct = videoW > 0 ? Math.round((cropWidth / videoW) * 100) : 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1]"
      />
      {debugOverlay && (
        <div className="fixed top-14 right-4 z-[100] min-w-[160px] rounded border border-rec/40 bg-black/70 px-2 py-1.5 font-mono text-[11px] text-rec/90 pointer-events-none">
          <div>FPS: {stats.fps}</div>
          <div>INFERENCE: {stats.inferenceMs}ms</div>
          <div>OBJECTS: {stats.detectionCount}</div>
          <div>
            CROP: {cropTop}%–{cropBottom}%
          </div>
          <div>
            RES: {videoW}x{videoH}
          </div>
          <div>MODEL: {modelPct}% W</div>
        </div>
      )}
    </>
  );
}
