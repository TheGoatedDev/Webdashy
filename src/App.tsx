/**
 * App - Root component
 *
 * Composes all hooks and components.
 * Camera requested on mount.
 * Error screens take priority.
 * All state through hooks + Zustand.
 */

import { useEffect } from 'react';
import { CameraPreview } from './components/CameraPreview';
import { ErrorScreen } from './components/ErrorScreen';
import { RecordingControls } from './components/RecordingControls';
import { StatusStrip } from './components/StatusStrip';
import { StoragePanel } from './components/StoragePanel';
import { Toast } from './components/Toast';
import { useBattery } from './hooks/useBattery';
import { useCamera } from './hooks/useCamera';
import { useRecorder } from './hooks/useRecorder';
import { useStorage } from './hooks/useStorage';
import { useAppStore } from './store/appStore';

function App() {
  const { stream, error: cameraError, requestCamera, stopCamera } = useCamera();
  const { start, stop } = useRecorder();
  const { stats } = useStorage();
  const { isPluggedIn } = useBattery();

  const { isRecording, elapsedMs, recordingError, showStoragePanel, toggleStoragePanel } =
    useAppStore();

  // Request camera on mount
  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

  // Handle record/stop toggle
  const handleToggle = async () => {
    if (isRecording) {
      await stop();
      stopCamera();
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
    <div id="app">
      <CameraPreview stream={stream} />
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
