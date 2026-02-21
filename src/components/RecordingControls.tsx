/**
 * RecordingControls - Floating action button for record/stop
 *
 * Position: Fixed bottom-right, above status strip.
 * Not recording: Thin white ring with red fill circle.
 * Recording: Pulsing red glow ring with white stop square.
 */

interface RecordingControlsProps {
  isRecording: boolean;
  onToggle: () => void;
}

export function RecordingControls({ isRecording, onToggle }: RecordingControlsProps) {
  return (
    <button
      type="button"
      className={`fixed bottom-24 right-6 z-[101] flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-95 ${
        isRecording
          ? 'animate-glow border-rec bg-black/30'
          : 'border-white/25 bg-black/20 hover:border-white/40'
      }`}
      onClick={onToggle}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        <div className="h-6 w-6 rounded bg-white" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-rec shadow-[0_0_12px_rgba(255,59,48,0.3)]" />
      )}
    </button>
  );
}
