import type { VehicleSettings } from '../config/vehicleConfig';
import { useAppStore } from '../store/appStore';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] uppercase tracking-wider text-white/50">
          {label}
        </span>
        <span className="font-mono text-[12px] text-hud">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-hud"
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border-b border-white/10 pb-1">
        <span className="font-display text-[10px] uppercase tracking-widest text-white/30">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SettingsModal() {
  const {
    showSettings,
    toggleSettings,
    vehicleSettings,
    setVehicleSettings,
    resetVehicleSettings,
    debugOverlay,
    toggleDebugOverlay,
  } = useAppStore();

  if (!showSettings) return null;

  function update<K extends keyof VehicleSettings>(key: K, value: VehicleSettings[K]) {
    setVehicleSettings({ [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleSettings();
      }}
    >
      <div className="flex w-[340px] max-h-[80vh] flex-col rounded-sm border border-white/10 bg-black/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="font-display text-[13px] uppercase tracking-widest text-white/70">
            Settings
          </span>
          <button
            type="button"
            onClick={toggleSettings}
            aria-label="Close settings"
            className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/70 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          <Section title="Detection">
            <div className="flex items-center justify-between">
              <span className="font-display text-[11px] uppercase tracking-wider text-white/50">
                Full-width zone
              </span>
              <button
                type="button"
                onClick={() => update('fullWidthDetection', !vehicleSettings.fullWidthDetection)}
                aria-label="Toggle full-width detection zone"
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${vehicleSettings.fullWidthDetection ? 'bg-hud/60' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${vehicleSettings.fullWidthDetection ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            <SliderRow
              label="Confidence threshold"
              value={vehicleSettings.detectionConfidence}
              min={0.1}
              max={1.0}
              step={0.05}
              display={pct(vehicleSettings.detectionConfidence)}
              onChange={(v) => update('detectionConfidence', v)}
            />
            <SliderRow
              label="Max detections"
              value={vehicleSettings.maxDetections}
              min={1}
              max={50}
              step={1}
              display={String(vehicleSettings.maxDetections)}
              onChange={(v) => update('maxDetections', v)}
            />
            <SliderRow
              label="Bbox padding"
              value={vehicleSettings.bboxPadding}
              min={0}
              max={50}
              step={1}
              display={`${vehicleSettings.bboxPadding}px`}
              onChange={(v) => update('bboxPadding', v)}
            />
          </Section>

          <Section title="Vehicle Capture">
            <SliderRow
              label="Min vehicle width"
              value={vehicleSettings.minWidthFraction}
              min={0}
              max={0.3}
              step={0.01}
              display={pct(vehicleSettings.minWidthFraction)}
              onChange={(v) => update('minWidthFraction', v)}
            />
            <SliderRow
              label="Min vehicle area"
              value={vehicleSettings.minAreaFraction}
              min={0}
              max={0.2}
              step={0.01}
              display={pct(vehicleSettings.minAreaFraction)}
              onChange={(v) => update('minAreaFraction', v)}
            />
            <SliderRow
              label="Stable frames"
              value={vehicleSettings.minStableFrames}
              min={1}
              max={10}
              step={1}
              display={String(vehicleSettings.minStableFrames)}
              onChange={(v) => update('minStableFrames', v)}
            />
            <SliderRow
              label="Vehicle cooldown"
              value={vehicleSettings.cooldownMs}
              min={1_000}
              max={60_000}
              step={1_000}
              display={secs(vehicleSettings.cooldownMs)}
              onChange={(v) => update('cooldownMs', v)}
            />
            <SliderRow
              label="Global throttle"
              value={vehicleSettings.globalThrottleMs}
              min={500}
              max={10_000}
              step={500}
              display={secs(vehicleSettings.globalThrottleMs)}
              onChange={(v) => update('globalThrottleMs', v)}
            />
            <SliderRow
              label="Max stored vehicles"
              value={vehicleSettings.maxVehicleCaptures}
              min={10}
              max={1000}
              step={10}
              display={String(vehicleSettings.maxVehicleCaptures)}
              onChange={(v) => update('maxVehicleCaptures', v)}
            />
          </Section>

          <Section title="Debug">
            <div className="flex items-center justify-between">
              <span className="font-display text-[11px] uppercase tracking-wider text-white/50">
                Debug overlay
              </span>
              <button
                type="button"
                onClick={toggleDebugOverlay}
                aria-label="Toggle debug overlay"
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${debugOverlay ? 'bg-rec/60' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${debugOverlay ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={resetVehicleSettings}
            className="w-full rounded border border-white/10 px-3 py-1.5 font-display text-[11px] uppercase tracking-wider text-white/40 hover:border-white/20 hover:text-white/60 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
