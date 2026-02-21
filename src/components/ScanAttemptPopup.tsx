import { useEffect, useState } from 'react';
import type { CapturedVehicle } from '../hooks/useVehicleCapture';

interface ScanAttemptPopupProps {
  capturedVehicle: CapturedVehicle | null;
}

export function ScanAttemptPopup({ capturedVehicle }: ScanAttemptPopupProps) {
  const [visible, setVisible] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!capturedVehicle) {
      setVisible(false);
      return;
    }

    const url = URL.createObjectURL(capturedVehicle.imageBlob);
    setObjectUrl(url);
    setVisible(true);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [capturedVehicle]);

  if (!capturedVehicle || !objectUrl) return null;

  const time = new Date(capturedVehicle.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`fixed bottom-24 left-4 z-[200] flex flex-col gap-1 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Label row */}
      <div className="flex items-center gap-2 font-display text-[10px] uppercase tracking-wider text-hud/70">
        <span>Captured</span>
        <span className="text-hud/40">{capturedVehicle.vehicleClass}</span>
        <span className="ml-auto text-hud/30">{time}</span>
      </div>

      {/* Vehicle thumbnail — natural bbox aspect ratio, height-capped */}
      <div className="overflow-hidden rounded border border-white/20 bg-black/60 shadow-lg">
        <img src={objectUrl} alt="Captured vehicle" className="max-h-20 w-auto max-w-48" />
      </div>
    </div>
  );
}
