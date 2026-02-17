/**
 * CropRegionControl - Vertical dual-slider for detection crop region
 *
 * Position: Fixed right side, vertically centered.
 * Only renders when detection is enabled.
 * Controls cropTop and cropBottom percentages (0-100) for the ONNX detection zone.
 * Dashcam HUD aesthetic matching ZoomControl.
 */

import { useAppStore } from '../store/appStore';

const MIN_GAP = 10; // Minimum gap between cropTop and cropBottom (%)

export function CropRegionControl() {
  const { detectionEnabled, cropTop, cropBottom, setCropRegion } = useAppStore();

  if (!detectionEnabled) return null;

  const handleTopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTop = Number(e.target.value);
    // Enforce minimum gap: cropTop must be at least MIN_GAP below cropBottom
    const clamped = Math.min(newTop, cropBottom - MIN_GAP);
    setCropRegion(clamped, cropBottom);
  };

  const handleBottomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBottom = Number(e.target.value);
    // Enforce minimum gap: cropBottom must be at least MIN_GAP above cropTop
    const clamped = Math.max(newBottom, cropTop + MIN_GAP);
    setCropRegion(cropTop, clamped);
  };

  return (
    <div className="fixed right-5 top-1/2 z-[100] flex -translate-y-1/2 flex-col items-center gap-3">
      <span className="font-mono text-[10px] tracking-wider text-hud/70">
        {cropTop}-{cropBottom}%
      </span>

      {/* Top crop slider — controls the upper crop boundary */}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={cropTop}
        onChange={handleTopChange}
        aria-label="Crop top boundary"
        className="h-24 w-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-hud [writing-mode:vertical-lr] [direction:rtl]"
      />

      {/* Bottom crop slider — controls the lower crop boundary */}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={cropBottom}
        onChange={handleBottomChange}
        aria-label="Crop bottom boundary"
        className="h-24 w-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-hud [writing-mode:vertical-lr] [direction:rtl]"
      />

      <span className="font-mono text-[10px] tracking-wider text-white/30">
        CROP
      </span>
    </div>
  );
}
