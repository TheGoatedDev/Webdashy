/**
 * ErrorScreen - Fullscreen error states
 *
 * Three types:
 * 1. camera-denied: Camera icon, "Camera Access Required", friendly text, "Open Settings" button
 * 2. storage-full: "Storage Full" heading, explanation, "Continue Recording" button
 * 3. codec-unsupported: "Video Recording Not Supported", try Chrome/Edge
 *
 * Position: fixed, full viewport, z-index 200.
 */

type ErrorType = 'camera-denied' | 'storage-full' | 'codec-unsupported';

interface ErrorScreenProps {
  type: ErrorType;
  message?: string;
  onAction?: () => void;
}

export function ErrorScreen({ type, message, onAction }: ErrorScreenProps) {
  if (type === 'camera-denied') {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">📷</div>
          <h1>Camera Access Required</h1>
          <p>{message || 'WebDashy needs camera access to record video.'}</p>
          <p className="error-help">Please enable camera permissions in your browser settings and reload the page.</p>
          {onAction && (
            <button className="error-action" onClick={onAction}>
              Open Settings
            </button>
          )}
        </div>
      </div>
    );
  }

  if (type === 'storage-full') {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">💾</div>
          <h1>Storage Full</h1>
          <p>{message || 'Your device storage is full. Recording has been stopped.'}</p>
          <p className="error-help">Free up space by deleting old saved clips or other files on your device.</p>
          {onAction && (
            <button className="error-action" onClick={onAction}>
              Continue Recording
            </button>
          )}
        </div>
      </div>
    );
  }

  if (type === 'codec-unsupported') {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h1>Video Recording Not Supported</h1>
          <p>{message || 'Your browser does not support the video codecs required for recording.'}</p>
          <p className="error-help">Please try using Chrome, Edge, or another modern browser.</p>
        </div>
      </div>
    );
  }

  return null;
}
