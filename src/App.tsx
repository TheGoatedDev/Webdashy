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
import { RecordingControls } from './components/RecordingControls';
import { StatusStrip } from './components/StatusStrip';
import { StoragePanel } from './components/StoragePanel';
import { Toast } from './components/Toast';
import { ZoomControl } from './components/ZoomControl';
import { useBattery } from './hooks/useBattery';
import { useCamera } from './hooks/useCamera';
import { useDetection } from './hooks/useDetection';
import { useRecorder } from './hooks/useRecorder';
import { useStorage } from './hooks/useStorage';
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
  } = useAppStore();

  const { detections, modelLoading, modelError, stats: detectionStats } = useDetection(videoRef, detectionEnabled);

  // Request camera on mount
  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

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
      <DetectionOverlay detections={detections} videoRef={videoRef} stats={detectionStats} />

      {/* Model loading indicator */}
      {modelLoading && (
        <div className="fixed top-5 left-5 z-[5] font-display text-[10px] uppercase tracking-wider text-hud/50 transition-opacity duration-500">
          Loading detection model...
        </div>
      )}

      {/* Model error indicator */}
      {modelError && !modelLoading && (
        <div className="fixed top-5 left-5 z-[5] font-display text-[10px] uppercase tracking-wider text-red-400/70 transition-opacity duration-500">
          Detection unavailable
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
      <Toast />
    </div>
  );
}

export default App;
