import { useEffect, useRef, useState } from 'react';
import type { ScanAttempt } from '../hooks/usePlateCapture';

interface ScanAttemptPopupProps {
  scanAttempt: ScanAttempt | null;
}

export function ScanAttemptPopup({ scanAttempt }: ScanAttemptPopupProps) {
  const [visible, setVisible] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scanAttempt) {
      setVisible(false);
      return;
    }

    // Revoke previous URL to avoid leaks
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
    }

    const url = URL.createObjectURL(scanAttempt.imageBlob);
    prevUrlRef.current = url;
    setObjectUrl(url);
    setVisible(true);

    return () => {
      // Cleanup on unmount
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
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

      {/* Vehicle thumbnail */}
      <div className="h-20 w-32 overflow-hidden rounded border border-white/20 bg-black/60 shadow-lg">
        <img
          src={objectUrl}
          alt="Scan attempt"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
