import { useEffect, useState } from 'react';
import type { ScanAttempt } from '../hooks/usePlateCapture';

interface ScanAttemptPopupProps {
  scanAttempt: ScanAttempt | null;
}

export function ScanAttemptPopup({ scanAttempt }: ScanAttemptPopupProps) {
  const [visible, setVisible] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!scanAttempt) {
      setVisible(false);
      return;
    }

    const url = URL.createObjectURL(scanAttempt.imageBlob);
    setObjectUrl(url);
    setVisible(true);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [scanAttempt]);

  if (!scanAttempt || !objectUrl) return null;

  const time = new Date(scanAttempt.timestamp).toLocaleTimeString([], {
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
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warn" />
        <span>Scanning</span>
        <span className="text-hud/40">{scanAttempt.vehicleClass}</span>
        <span className="ml-auto text-hud/30">{time}</span>
      </div>

      {/* Vehicle thumbnail — natural bbox aspect ratio, height-capped */}
      <div className="overflow-hidden rounded border border-white/20 bg-black/60 shadow-lg">
        <img
          src={objectUrl}
          alt="Scan attempt"
          className="max-h-20 w-auto max-w-48"
        />
      </div>
    </div>
  );
}
