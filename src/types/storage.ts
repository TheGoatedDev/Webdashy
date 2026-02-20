import type { DBSchema } from 'idb';

export interface BufferChunk {
  id: string; // crypto.randomUUID()
  timestamp: number; // Date.now() when chunk was recorded
  size: number; // blob.size in bytes
  blob: Blob; // Raw video blob
  sequenceNumber: number; // Incrementing counter for ordering
}

export interface SavedClip {
  id: string;
  timestamp: number;
  duration: number; // Duration in milliseconds
  chunkIds: string[]; // References to buffer chunks (if still available)
  triggerType: 'manual' | 'accelerometer';
  size: number; // Total size in bytes
  blob: Blob; // Concatenated video blob
}

export interface SessionState {
  id: string; // Always 'current'
  recording: boolean;
  startTime: number;
  lastChunkTime: number;
  codec: string;
  quality: VideoQuality;
}

export type VideoQuality = 'low' | 'medium' | 'high';

export interface VideoQualityConfig {
  width: number;
  height: number;
  bitrate: number; // bits per second
  label: string;
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualityConfig> = {
  low: { width: 854, height: 480, bitrate: 1_000_000, label: '480p' },
  medium: { width: 1280, height: 720, bitrate: 2_500_000, label: '720p' },
  high: { width: 1920, height: 1080, bitrate: 5_000_000, label: '1080p' },
};

export interface PlateCapture {
  id: string;
  timestamp: number;
  vehicleImageBlob: Blob;
  plateRegionBlob: Blob;
  plateText: string;
  ocrConfidence: number;
  vehicleClass: string;
  detectionScore: number;
  bbox: [number, number, number, number];
}

export interface PlateCaptureMetadata {
  id: string;
  timestamp: number;
  plateText: string;
  ocrConfidence: number;
  vehicleClass: string;
  detectionScore: number;
  bbox: [number, number, number, number];
}

export interface DashcamDB extends DBSchema {
  buffer: {
    key: string;
    value: BufferChunk;
    indexes: { 'by-timestamp': number; 'by-sequence': number };
  };
  saved: {
    key: string;
    value: SavedClip;
    indexes: { 'by-timestamp': number };
  };
  session: {
    key: string;
    value: SessionState;
  };
  plates: {
    key: string;
    value: PlateCapture;
    indexes: { 'by-timestamp': number };
  };
}

export interface StorageStats {
  bufferChunks: number;
  bufferSizeBytes: number;
  bufferDurationMs: number;
  savedClips: number;
  savedSizeBytes: number;
  quotaUsageBytes: number;
  quotaTotalBytes: number;
  quotaPercent: number;
}

export type StorageWarningLevel = 'ok' | 'warning' | 'critical' | 'full';
