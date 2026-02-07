/**
 * RecordingControls - Floating action button for record/stop
 *
 * Position: Fixed bottom-right, above status strip.
 * Not recording: White circle with red inner circle.
 * Recording: Red circle with white square stop icon.
 * Touch feedback: scale(0.95) on press.
 */

interface RecordingControlsProps {
  isRecording: boolean;
  onToggle: () => void;
}

export function RecordingControls({ isRecording, onToggle }: RecordingControlsProps) {
  return (
    <button
      className={`recording-fab ${isRecording ? 'recording' : ''}`}
      onClick={onToggle}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        <div className="stop-icon" />
      ) : (
        <div className="record-icon" />
      )}
    </button>
  );
}
