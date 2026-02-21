import { useEffect, useState } from 'react';
import { getClipStorage } from '../services/ClipStorage';
import { useAppStore } from '../store/appStore';
import type { VehicleCaptureMetadata } from '../types/storage';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  const secs = d.getSeconds().toString().padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

interface VehicleEntryProps {
  meta: VehicleCaptureMetadata;
  onDelete: (id: string) => void;
}

function VehicleEntry({ meta, onDelete }: VehicleEntryProps) {
  const [vehicleUrl, setVehicleUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getClipStorage()
      .getVehicleCapture(meta.id)
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
      {/* Vehicle thumbnail — natural bbox aspect ratio, height-capped */}
      <div className="flex-shrink-0 overflow-hidden rounded-sm bg-white/5">
        {vehicleUrl ? (
          <img src={vehicleUrl} alt="vehicle" className="max-h-12 w-auto max-w-32" />
        ) : (
          <div className="h-12 w-20 animate-pulse bg-white/10" />
        )}
      </div>

      {/* Vehicle info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="font-display text-[11px] uppercase tracking-wider text-hud/80">
            {meta.vehicleClass}
          </span>
          <span className="font-mono text-[10px] text-white/35">
            {Math.round(meta.detectionScore * 100)}% conf
          </span>
          <span className="font-mono text-[10px] text-white/30">{formatTime(meta.timestamp)}</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(meta.id)}
        aria-label="Delete vehicle capture"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-white/10 text-white/30 transition-colors hover:border-rec/40 hover:text-rec/80"
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
          aria-hidden="true"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function VehicleGallery() {
  const {
    showVehicleGallery,
    toggleVehicleGallery,
    vehicleCaptures,
    removeVehicleCaptureMetadata,
  } = useAppStore();

  if (!showVehicleGallery) return null;

  const handleDelete = async (id: string) => {
    try {
      await getClipStorage().deleteVehicleCapture(id);
      removeVehicleCaptureMetadata(id);
    } catch (err) {
      console.error('[VehicleGallery] delete failed', err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close vehicle gallery"
        className="fixed inset-0 z-[200] bg-black/70"
        onClick={toggleVehicleGallery}
      />
      {/* Panel */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex w-[520px] max-w-[95vw] max-h-[80vh] flex-col rounded-sm border border-white/10 bg-black/95 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-[13px] uppercase tracking-widest text-white/70">
                Vehicle Gallery
              </span>
              <span className="font-mono text-[10px] text-white/30">
                {vehicleCaptures.length} captured
              </span>
            </div>
            <button
              type="button"
              onClick={toggleVehicleGallery}
              aria-label="Close vehicle gallery"
              className="flex h-6 w-6 items-center justify-center rounded text-white/40 transition-colors hover:text-white/70"
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
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Entries */}
          <div className="overflow-y-auto">
            {vehicleCaptures.length === 0 ? (
              <div className="px-5 py-8 text-center font-display text-xs text-white/25">
                No vehicles captured yet
              </div>
            ) : (
              vehicleCaptures.map((meta) => (
                <VehicleEntry key={meta.id} meta={meta} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
