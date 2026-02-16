/**
 * ErrorScreen - Fullscreen HUD-style error states
 *
 * Three types: camera-denied, storage-full, codec-unsupported.
 * Cinematic dark overlay with geometric icon frame and technical typography.
 */

type ErrorType = 'camera-denied' | 'storage-full' | 'codec-unsupported';

interface ErrorScreenProps {
  type: ErrorType;
  message?: string;
  onAction?: () => void;
}

function ErrorContent({
  icon,
  title,
  message,
  help,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  help: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm">
      <div className="max-w-sm text-center">
        {/* Icon in geometric frame */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center border border-white/15">
          <span className="text-4xl">{icon}</span>
        </div>

        <h1 className="font-display mb-4 text-xl font-semibold uppercase tracking-wide">{title}</h1>
        <p className="mb-3 font-display text-sm leading-relaxed text-white/75">{message}</p>
        <p className="font-display text-xs leading-relaxed text-white/40">{help}</p>

        {onAction && actionLabel && (
          <button
            type="button"
            className="mt-8 cursor-pointer rounded border border-hud/30 bg-hud/10 px-8 py-3 font-display text-sm font-medium tracking-wide text-hud transition-colors duration-200 hover:bg-hud/20 active:scale-[0.98]"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorScreen({ type, message, onAction }: ErrorScreenProps) {
  if (type === 'camera-denied') {
    return (
      <ErrorContent
        icon="📷"
        title="Camera Access Required"
        message={message || 'WebDashy needs camera access to record video.'}
        help="Enable camera permissions in your browser settings and reload the page."
        actionLabel="Open Settings"
        onAction={onAction}
      />
    );
  }

  if (type === 'storage-full') {
    return (
      <ErrorContent
        icon="💾"
        title="Storage Full"
        message={message || 'Your device storage is full. Recording has been stopped.'}
        help="Free up space by deleting old saved clips or other files on your device."
        actionLabel="Continue Recording"
        onAction={onAction}
      />
    );
  }

  if (type === 'codec-unsupported') {
    return (
      <ErrorContent
        icon="⚠️"
        title="Recording Not Supported"
        message={message || 'Your browser does not support the required video codecs.'}
        help="Please try using Chrome, Edge, or another modern browser."
      />
    );
  }

  return null;
}
