/**
 * CodecDetector - Runtime codec detection with test-record-verify
 *
 * Goes beyond MediaRecorder.isTypeSupported() by actually recording a short
 * test clip and verifying playback. Results cached in localStorage.
 */

import { getMediaStream } from './DevStream';

const CODEC_LADDER = [
  'video/webm; codecs=vp9',
  'video/webm; codecs=vp8',
  'video/webm',
  'video/mp4; codecs=h264',
] as const;

const STORAGE_KEY = 'webdashy_codec';

export class CodecDetector {
  /**
   * Detect best supported codec by testing actual recording + playback.
   * Results are cached in localStorage for fast subsequent startups.
   */
  async detectCodec(): Promise<string> {
    // Check cache first
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && MediaRecorder.isTypeSupported(cached)) {
      console.log(`[CodecDetector] Using cached codec: ${cached}`);
      return cached;
    }

    console.log('[CodecDetector] Running codec detection tests...');

    // Test each codec in priority order
    for (const codec of CODEC_LADDER) {
      // Skip if browser doesn't claim to support it
      if (!MediaRecorder.isTypeSupported(codec)) {
        console.log(`[CodecDetector] Skipping ${codec} - not supported by browser`);
        continue;
      }

      // Test actual record + verify
      console.log(`[CodecDetector] Testing ${codec}...`);
      const verified = await this.testRecordAndVerify(codec);

      if (verified) {
        console.log(`[CodecDetector] ✓ Verified ${codec}`);
        localStorage.setItem(STORAGE_KEY, codec);
        return codec;
      } else {
        console.warn(`[CodecDetector] ✗ Failed verification for ${codec}`);
      }
    }

    throw new Error('No supported video codec found on this device');
  }

  /**
   * Test-record a 2-second clip and verify playback works.
   *
   * IMPORTANT: This is the ONLY place in the codebase where blob URLs are created.
   * They are revoked immediately after the metadata check.
   */
  private async testRecordAndVerify(mimeType: string): Promise<boolean> {
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let blobUrl: string | null = null;

    try {
      // Get camera stream with small resolution for speed
      stream = await getMediaStream({
        video: { width: 320, height: 240 },
      });

      // Create recorder with test codec
      recorder = new MediaRecorder(stream, { mimeType });

      // Collect chunks
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Start recording
      recorder.start();

      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Stop recording
      recorder.stop();

      // Wait for onstop event
      await new Promise<void>((resolve, reject) => {
        if (!recorder) {
          reject(new Error('Recorder is null'));
          return;
        }
        recorder.onstop = () => resolve();
        recorder.onerror = (event) => reject(new Error(`Recorder error: ${event}`));
      });

      // Create blob from chunks
      const blob = new Blob(chunks, { type: mimeType });

      // Verify playback
      const video = document.createElement('video');
      blobUrl = URL.createObjectURL(blob);
      video.src = blobUrl;

      // Wait for metadata load (success) or error (failure)
      const playable = await Promise.race([
        new Promise<boolean>((resolve) => {
          video.onloadedmetadata = () => resolve(true);
        }),
        new Promise<boolean>((resolve) => {
          video.onerror = () => resolve(false);
        }),
        // Timeout after 5 seconds
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5000);
        }),
      ]);

      return playable;
    } catch (error) {
      console.warn(`[CodecDetector] Test failed for ${mimeType}:`, error);
      return false;
    } finally {
      // CRITICAL: Clean up blob URL immediately
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      // CRITICAL: Release camera
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    }
  }
}

/**
 * Standalone function for convenience.
 * Creates a detector instance and runs detection.
 */
export async function detectCodec(): Promise<string> {
  const detector = new CodecDetector();
  return detector.detectCodec();
}
