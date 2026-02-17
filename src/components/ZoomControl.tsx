/**
 * ZoomControl - Vertical zoom slider for camera zoom
 *
 * Position: Fixed left side, vertically centered.
 * Only renders when the device camera supports zoom.
 * Dashcam HUD aesthetic with thin track and hud-colored thumb.
 */

import { useAppStore } from '../store/appStore';

interface ZoomControlProps {
  onZoomChange: (level: number) => void;
}

export function ZoomControl({ onZoomChange }: ZoomControlProps) {
  const { zoomLevel, zoomMin, zoomMax, zoomStep, zoomSupported } = useAppStore();

  if (!zoomSupported) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(Number(e.target.value));
  };

  const displayZoom = zoomLevel.toFixed(1);

  return (
    <div className="fixed left-5 top-1/2 z-[100] flex -translate-y-1/2 flex-col items-center gap-3">
      <span className="font-mono text-[10px] tracking-wider text-hud/70">
        {displayZoom}x
      </span>

      <input
        type="range"
        min={zoomMin}
        max={zoomMax}
        step={zoomStep}
        value={zoomLevel}
        onChange={handleChange}
        aria-label="Camera zoom"
        className="zoom-slider h-32 w-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-hud [writing-mode:vertical-lr] [direction:rtl]"
      />

      <span className="font-mono text-[10px] tracking-wider text-white/30">
        Z
      </span>
    </div>
  );
}
