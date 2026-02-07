/**
 * RecordingEngine - Core MediaRecorder lifecycle management
 *
 * Handles all MediaRecorder complexity: track monitoring, circuit breaker restarts,
 * visibility change handling, session state persistence, and error recovery.
 *
 * ARCHITECTURE RULE: Video blobs NEVER enter React state.
 * Blobs go directly to BufferManager.addChunk() - no blob URLs created here.
 */

import { detectCodec } from './CodecDetector';
import type { BufferManager } from './BufferManager';
import type { ClipStorage } from './ClipStorage';
import type { VideoQuality, SessionState } from '../types/storage';
import { VIDEO_QUALITY_PRESETS } from '../types/storage';

type RecordingState = 'inactive' | 'recording' | 'paused';

/**
 * RecordingEngine events:
 * - 'statechange': { state: RecordingState }
 * - 'chunk': { size: number, timestamp: number }
 * - 'error': { message: string, recoverable: boolean }
 * - 'track-recovered': {}
 * - 'track-failed': { message: string }
 * - 'circuit-breaker-restart': {}
 * - 'visibility-change': { hidden: boolean }
 * - 'recording-resumed': {}
 * - 'timer': { elapsedMs: number }
 */
export class RecordingEngine extends EventTarget {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private state: RecordingState = 'inactive';
  private startTime: number = 0;
  private trackWatchdogInterval: number | null = null;
  private circuitBreakerTimeout: number | null = null;
  private timerInterval: number | null = null;
  private bufferManager: BufferManager;
  private clipStorage: ClipStorage;
  private quality: VideoQuality = 'medium';
  private codec: string = '';
  private visibilityTimeout: number | null = null;
  private wasRecordingBeforeBackground: boolean = false;

  constructor(bufferManager: BufferManager, clipStorage: ClipStorage) {
    super();
    this.bufferManager = bufferManager;
    this.clipStorage = clipStorage;
  }

  /**
   * Start recording with the provided media stream.
   * Detects codec, initializes MediaRecorder, starts all monitoring systems.
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.state !== 'inactive') {
      throw new Error(`Cannot start recording: current state is ${this.state}`);
    }

    this.stream = stream;

    // Detect best codec for this device
    this.codec = await detectCodec();
    console.log(`[RecordingEngine] Using codec: ${this.codec}`);

    // Get quality configuration
    const qualityConfig = VIDEO_QUALITY_PRESETS[this.quality];
    console.log(
      `[RecordingEngine] Quality: ${qualityConfig.label} @ ${qualityConfig.bitrate / 1_000_000}Mbps`
    );

    // Create MediaRecorder
    this.recorder = new MediaRecorder(stream, {
      mimeType: this.codec,
      videoBitsPerSecond: qualityConfig.bitrate,
    });

    // Wire up chunk handler
    this.recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        try {
          // Store chunk directly - NO blob URLs created
          await this.bufferManager.addChunk(event.data);

          // Persist session state after every chunk
          await this.clipStorage.saveSessionState({
            id: 'current',
            recording: true,
            startTime: this.startTime,
            lastChunkTime: Date.now(),
            codec: this.codec,
            quality: this.quality,
          });

          // Notify listeners
          this.dispatchEvent(
            new CustomEvent('chunk', {
              detail: {
                size: event.data.size,
                timestamp: Date.now(),
              },
            })
          );
        } catch (error) {
          console.error('[RecordingEngine] Failed to save chunk:', error);
          this.dispatchEvent(
            new CustomEvent('error', {
              detail: {
                message: 'Failed to save recording chunk',
                recoverable: true,
              },
            })
          );
        }
      }
    };

    // Wire up error handler
    this.recorder.onerror = (event) => {
      console.error('[RecordingEngine] MediaRecorder error:', event);
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: {
            message: `MediaRecorder error: ${event}`,
            recoverable: false,
          },
        })
      );
    };

    // Start recording with 30-second timeslice
    this.recorder.start(30000);
    this.startTime = Date.now();

    // Start track watchdog - check every 5 seconds
    this.trackWatchdogInterval = window.setInterval(() => {
      this.checkTrackHealth();
    }, 5000);

    // Add ended listener on video track directly
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        console.warn('[RecordingEngine] Video track ended event fired');
        this.handleTrackEnded();
      });
    }

    // Start circuit breaker - restart every hour
    this.circuitBreakerTimeout = window.setTimeout(() => {
      this.circuitBreakerRestart();
    }, 60 * 60 * 1000);

    // Start timer - emit elapsed time every second
    this.timerInterval = window.setInterval(() => {
      const elapsedMs = Date.now() - this.startTime;
      this.dispatchEvent(
        new CustomEvent('timer', {
          detail: { elapsedMs },
        })
      );
    }, 1000);

    // Register visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Update state
    this.state = 'recording';
    this.dispatchEvent(
      new CustomEvent('statechange', {
        detail: { state: this.state },
      })
    );

    console.log('[RecordingEngine] Recording started');
  }

  /**
   * Stop recording and clean up all resources.
   * Does NOT stop the stream (caller manages stream lifecycle).
   */
  async stop(): Promise<void> {
    if (this.state === 'inactive') {
      return; // Already stopped
    }

    console.log('[RecordingEngine] Stopping recording...');

    // Clear all intervals and timeouts
    if (this.trackWatchdogInterval !== null) {
      window.clearInterval(this.trackWatchdogInterval);
      this.trackWatchdogInterval = null;
    }

    if (this.circuitBreakerTimeout !== null) {
      window.clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }

    if (this.timerInterval !== null) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.visibilityTimeout !== null) {
      window.clearTimeout(this.visibilityTimeout);
      this.visibilityTimeout = null;
    }

    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Stop recorder
    if (this.recorder && (this.recorder.state === 'recording' || this.recorder.state === 'paused')) {
      await new Promise<void>((resolve) => {
        if (this.recorder) {
          this.recorder.onstop = () => resolve();
          this.recorder.stop();
        } else {
          resolve();
        }
      });
    }

    // Clear session state
    await this.clipStorage.clearSessionState();

    // Update state
    this.state = 'inactive';
    this.recorder = null;
    this.dispatchEvent(
      new CustomEvent('statechange', {
        detail: { state: this.state },
      })
    );

    console.log('[RecordingEngine] Recording stopped');
  }

  /**
   * Track health check - called by watchdog interval.
   */
  private checkTrackHealth(): void {
    if (!this.stream) return;

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.warn('[RecordingEngine] No video track found');
      return;
    }

    if (videoTrack.readyState === 'ended') {
      console.warn('[RecordingEngine] Watchdog detected ended track');
      this.handleTrackEnded();
    }
  }

  /**
   * Handle video track ending unexpectedly.
   * Attempts to recover by requesting new stream.
   */
  private async handleTrackEnded(): Promise<void> {
    console.warn('[RecordingEngine] Video track ended - attempting recovery...');

    // Stop current recorder but keep recording intent
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }

    // Clear track watchdog
    if (this.trackWatchdogInterval !== null) {
      window.clearInterval(this.trackWatchdogInterval);
      this.trackWatchdogInterval = null;
    }

    try {
      // Get new stream with environment camera and quality constraints
      const qualityConfig = VIDEO_QUALITY_PRESETS[this.quality];
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: qualityConfig.width,
          height: qualityConfig.height,
        },
      });

      // Store new stream
      this.stream = newStream;

      // Restart recording with new stream
      // First set state to inactive so start() will work
      const preservedStartTime = this.startTime;
      this.state = 'inactive';
      await this.start(newStream);

      // Restore original start time (don't reset timer on recovery)
      this.startTime = preservedStartTime;

      this.dispatchEvent(new CustomEvent('track-recovered', { detail: {} }));
      console.log('[RecordingEngine] Track recovery successful');
    } catch (error) {
      console.error('[RecordingEngine] Track recovery failed:', error);
      this.state = 'inactive';
      this.dispatchEvent(
        new CustomEvent('track-failed', {
          detail: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      );
      this.dispatchEvent(
        new CustomEvent('statechange', {
          detail: { state: this.state },
        })
      );
    }
  }

  /**
   * Circuit breaker restart - preemptive restart every hour to prevent memory leaks.
   */
  private async circuitBreakerRestart(): Promise<void> {
    console.log('[RecordingEngine] Circuit breaker restart triggered');

    this.dispatchEvent(new CustomEvent('circuit-breaker-restart', { detail: {} }));

    const currentStream = this.stream;
    const preservedStartTime = this.startTime;

    if (!currentStream) {
      console.warn('[RecordingEngine] No stream available for circuit breaker restart');
      return;
    }

    // Stop recorder but keep stream alive
    if (this.recorder && (this.recorder.state === 'recording' || this.recorder.state === 'paused')) {
      await new Promise<void>((resolve) => {
        if (this.recorder) {
          this.recorder.onstop = () => resolve();
          this.recorder.stop();
        } else {
          resolve();
        }
      });
    }

    // Clear intervals/timeouts but don't remove visibility listener
    if (this.trackWatchdogInterval !== null) {
      window.clearInterval(this.trackWatchdogInterval);
      this.trackWatchdogInterval = null;
    }

    if (this.timerInterval !== null) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Wait 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Restart with same stream
    this.state = 'inactive';
    await this.start(currentStream);

    // Preserve start time (timer doesn't reset on circuit breaker)
    this.startTime = preservedStartTime;

    console.log('[RecordingEngine] Circuit breaker restart complete');
  }

  /**
   * Handle visibility change - stop recording if backgrounded for too long.
   * Arrow function for correct 'this' binding with addEventListener.
   */
  private handleVisibilityChange = (): void => {
    const hidden = document.hidden;

    this.dispatchEvent(
      new CustomEvent('visibility-change', {
        detail: { hidden },
      })
    );

    if (hidden) {
      console.log('[RecordingEngine] App backgrounded - setting timeout');
      this.wasRecordingBeforeBackground = this.state === 'recording';

      // If still hidden after 10 seconds, stop recording
      this.visibilityTimeout = window.setTimeout(() => {
        if (document.hidden && this.state === 'recording') {
          console.warn('[RecordingEngine] Stopping due to prolonged background state');
          this.stop();
          this.dispatchEvent(
            new CustomEvent('error', {
              detail: {
                message: 'Recording stopped - app in background too long',
                recoverable: true,
              },
            })
          );
        }
      }, 10000);
    } else {
      console.log('[RecordingEngine] App foregrounded');

      // Cancel background timeout
      if (this.visibilityTimeout !== null) {
        window.clearTimeout(this.visibilityTimeout);
        this.visibilityTimeout = null;
      }

      // Attempt to resume if was recording before background
      if (this.wasRecordingBeforeBackground && this.state === 'inactive') {
        console.log('[RecordingEngine] Attempting to resume recording...');
        this.dispatchEvent(new CustomEvent('recording-resumed', { detail: {} }));
        // Note: Actual restart would require new stream from caller
        // This event notifies UI to prompt for camera access again
      }
    }
  };

  /**
   * Set video quality preference.
   * Takes effect on next start().
   */
  setQuality(quality: VideoQuality): void {
    this.quality = quality;
    console.log(`[RecordingEngine] Quality set to: ${VIDEO_QUALITY_PRESETS[quality].label}`);
  }

  /**
   * Get current recording state.
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Get elapsed recording time in milliseconds.
   */
  getElapsedMs(): number {
    if (this.state === 'inactive') {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Check for interrupted session (crash detection).
   * Returns session state if recording was interrupted >2min ago.
   */
  async checkForInterruptedSession(): Promise<SessionState | null> {
    const session = await this.clipStorage.getSessionState();

    if (!session || !session.recording) {
      return null; // No active session or not recording
    }

    const timeSinceLastChunk = Date.now() - session.lastChunkTime;
    const twoMinutesMs = 2 * 60 * 1000;

    if (timeSinceLastChunk > twoMinutesMs) {
      console.warn('[RecordingEngine] Detected interrupted session:', session);
      return session;
    }

    return null;
  }
}
