import { useEffect, useState } from 'react';
import { getClipStorage } from '../services/ClipStorage';
import { useAppStore } from '../store/appStore';
import type { PlateCaptureMetadata } from '../types/storage';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  const secs = d.getSeconds().toString().padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

interface PlateEntryProps {
  meta: PlateCaptureMetadata;
  onDelete: (id: string) => void;
}

function PlateEntry({ meta, onDelete }: PlateEntryProps) {
  const [vehicleUrl, setVehicleUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getClipStorage()
      .getPlateCapture(meta.id)
      .then((capture) => {
        if (!capture) return;
        objectUrl = URL.createObjectURL(capture.vehicleImageBlob);
        setVehicleUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [meta.id]);

  return (
    <div className="flex items-center gap-3 border-b border-white/5 px-5 py-3">
      {/* Vehicle thumbnail */}
      <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-white/5">
        {vehicleUrl ? (
          <img
            src={vehicleUrl}
            alt="vehicle"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-white/10" />
        )}
      </div>

      {/* Plate info */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xl tracking-widest text-warn">
          {meta.plateText}
        </div>
        <div className="mt-0.5 flex items-center gap-3">
          <span className="font-display text-[10px] uppercase tracking-wider text-hud/70">
            {meta.vehicleClass}
          </span>
          <span className="font-mono text-[10px] text-white/35">
            {Math.round(meta.ocrConfidence)}% conf
          </span>
          <span className="font-mono text-[10px] text-white/30">
            {formatTime(meta.timestamp)}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(meta.id)}
        aria-label="Delete plate capture"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-white/30 transition-colors hover:border-red-500/40 hover:text-red-400/80"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface PlateGalleryProps {
  show: boolean;
}

export function PlateGallery({ show }: PlateGalleryProps) {
  const { plateCaptures, removePlateCaptureMetadata } = useAppStore();

  const handleDelete = async (id: string) => {
    try {
      await getClipStorage().deletePlateCapture(id);
      removePlateCaptureMetadata(id);
    } catch (err) {
      console.error('[PlateGallery] delete failed', err);
    }
  };

  return (
    <div
      className={`fixed bottom-12 left-0 right-0 z-[99] border-t border-hud/20 bg-black/90 backdrop-blur-lg transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ maxHeight: '60vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <span className="font-display text-[10px] font-medium uppercase tracking-widest text-white/40">
          Plate Gallery
        </span>
        <span className="font-mono text-[10px] text-white/30">
          {plateCaptures.length} captured
        </span>
      </div>

      {/* Entries */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 44px)' }}>
        {plateCaptures.length === 0 ? (
          <div className="px-5 py-8 text-center font-display text-xs text-white/25">
            No plates captured yet
          </div>
        ) : (
          plateCaptures.map((meta) => (
            <PlateEntry key={meta.id} meta={meta} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
