/**
 * App - Root component
 *
 * Composes all hooks and components.
 * Camera requested on mount.
 * Error screens take priority.
 * All state through hooks + Zustand.
 */

import { useEffect, useRef } from 'react';
import { CameraPreview } from './components/CameraPreview';
import { CropRegionControl } from './components/CropRegionControl';
import { DebugToggle } from './components/DebugToggle';
import { DetectionOverlay } from './components/DetectionOverlay';
import { ErrorScreen } from './components/ErrorScreen';
import { PlateGallery } from './components/PlateGallery';
import { RecordingControls } from './components/RecordingControls';
import { StatusStrip } from './components/StatusStrip';
import { StoragePanel } from './components/StoragePanel';
import { Toast } from './components/Toast';
import { ZoomControl } from './components/ZoomControl';
import { useBattery } from './hooks/useBattery';
import { useCamera } from './hooks/useCamera';
import { useDetection } from './hooks/useDetection';
import { usePlateCapture } from './hooks/usePlateCapture';
import { useRecorder } from './hooks/useRecorder';
import { useStorage } from './hooks/useStorage';
import { getClipStorage } from './services/ClipStorage';
import { useAppStore } from './store/appStore';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { stream, error: cameraError, requestCamera, setZoom } = useCamera();
  const { start, stop } = useRecorder();
  const { stats } = useStorage();
  const { isPluggedIn } = useBattery();

  const {
    isRecording,
    elapsedMs,
    recordingError,
    showStoragePanel,
    toggleStoragePanel,
    detectionEnabled,
    showPlateGallery,
    togglePlateGallery,
    plateCaptureEnabled,
    setPlateCaptures,
  } = useAppStore();

  const { detections, modelLoading, modelError, stats: detectionStats } = useDetection(videoRef, detectionEnabled);
  const { flashBboxes, vehicleDebugInfo } = usePlateCapture(videoRef, detections, detectionEnabled && plateCaptureEnabled);

  // Request camera on mount
  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

  // Load plate capture metadata from IndexedDB on mount
  useEffect(() => {
    getClipStorage()
      .getAllPlateCaptureMetadata()
      .then((captures) => {
        setPlateCaptures(captures.sort((a, b) => b.timestamp - a.timestamp));
      })
      .catch((err: unknown) => {
        console.error('[App] Failed to load plate captures:', err);
      });
  }, [setPlateCaptures]);

  // Handle record/stop toggle
  const handleToggle = async () => {
    if (isRecording) {
      await stop();
    } else {
      if (stream) {
        await start(stream);
      }
    }
  };

  // Show error screens (highest priority)
  if (cameraError) {
    return <ErrorScreen type="camera-denied" message={cameraError} />;
  }

  if (recordingError?.includes('Storage')) {
    return <ErrorScreen type="storage-full" message={recordingError} />;
  }

  return (
    <div id="app" className="relative h-full w-full overflow-hidden">
      <CameraPreview ref={videoRef} stream={stream} />

      {/* Detection overlay */}
      <DetectionOverlay
        detections={detections}
        videoRef={videoRef}
        stats={detectionStats}
        flashBboxes={flashBboxes}
        vehicleDebugInfo={vehicleDebugInfo}
      />

      {/* Model loading indicator */}
      {modelLoading && (
        <div className="fixed top-5 left-5 z-[5] font-display text-[10px] uppercase tracking-wider text-hud/50 transition-opacity duration-500">
          Loading detection model...
        </div>
      )}

      {/* Model error indicator */}
      {modelError && !modelLoading && (
        <div className="fixed top-5 left-5 z-[5] font-display text-[10px] uppercase tracking-wider text-red-400/70 transition-opacity duration-500">
          Detection unavailable: {modelError}
        </div>
      )}

      {/* Cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)]" />

      {/* Viewfinder corner marks */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        <div className="absolute top-5 left-5 h-6 w-6 border-t border-l border-white/20" />
        <div className="absolute top-5 right-5 h-6 w-6 border-t border-r border-white/20" />
        <div className="absolute bottom-5 left-5 h-6 w-6 border-b border-l border-white/20" />
        <div className="absolute bottom-5 right-5 h-6 w-6 border-b border-r border-white/20" />
      </div>

      <DebugToggle />

      {/* Plate gallery toggle button */}
      {detectionEnabled && (
        <button
          type="button"
          onClick={togglePlateGallery}
          aria-label="Toggle plate gallery"
          className={`fixed top-14 right-4 z-[100] flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ${
            showPlateGallery
              ? 'border-warn/60 bg-warn/20 text-warn shadow-[0_0_8px_rgba(255,214,10,0.3)]'
              : 'border-white/20 bg-black/40 text-white/40 hover:border-white/40 hover:text-white/60'
          }`}
          title="Plate gallery"
        >
          {/* License plate icon */}
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
            <rect x="2" y="7" width="20" height="10" rx="2" />
            <path d="M7 11h2M11 11h2M15 11h2" />
          </svg>
        </button>
      )}

      <ZoomControl onZoomChange={setZoom} />
      <CropRegionControl />
      <RecordingControls isRecording={isRecording} onToggle={handleToggle} />
      <StatusStrip
        isRecording={isRecording}
        elapsedMs={elapsedMs}
        isPluggedIn={isPluggedIn}
        onToggleStats={toggleStoragePanel}
      />
      <StoragePanel show={showStoragePanel} stats={stats} />
      <PlateGallery show={showPlateGallery} />
      <Toast />
    </div>
  );
}

export default App;
