/**
 * DevStream - Development video stream utility
 *
 * In dev mode, attempts to load a video file from public/ and convert it to
 * a MediaStream via captureStream(). Falls back to real getUserMedia if no
 * video file found or on error.
 *
 * In production, always delegates directly to getUserMedia with zero overhead.
 */

/**
 * Get a MediaStream for camera input, using a dev video file if available.
 *
 * @param constraints - MediaStreamConstraints for getUserMedia
 * @returns MediaStream from dev video (in dev mode) or real camera
 */
export async function getMediaStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
  // Production: always use real camera
  if (!import.meta.env.DEV) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  // Development: try to load a dev video file
  try {
    const devPaths = ['/dev-camera.webm', '/dev-camera.mp4'];

    for (const path of devPaths) {
      // Check if file exists (HEAD request to avoid downloading)
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
          // File exists, load it
          console.log(`[DevStream] Using dev video: ${path}`);
          return await loadVideoStream(path);
        }
      } catch (error) {}
    }

    // No dev video file found, fall back to real camera
    console.log('[DevStream] No dev video found, using real camera');
    return navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // Any error in dev path, fall back to real camera
    console.warn('[DevStream] Error loading dev video, falling back to real camera:', error);
    return navigator.mediaDevices.getUserMedia(constraints);
  }
}

/**
 * Load a video file and convert it to a MediaStream via captureStream().
 *
 * @param path - Path to video file (relative to public/)
 * @returns MediaStream from the video element
 */
async function loadVideoStream(path: string): Promise<MediaStream> {
  const video = document.createElement('video');
  video.src = path;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  // Wait for video to be ready to play
  await video.play();

  // Capture the video as a MediaStream
  // Note: captureStream() is not in all TypeScript lib types
  const streamVideo = video as HTMLVideoElement & { captureStream(): MediaStream };
  return streamVideo.captureStream();
}
