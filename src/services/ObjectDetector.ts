// Side-effect import to register WebGL backend before COCO-SSD uses it
import '@tensorflow/tfjs';
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Detection {
  class: string;
  score: number;
  bbox: [x: number, y: number, width: number, height: number];
}

export interface DetectionConfig {
  targetClasses: string[];
  minConfidence: number;
  maxDetections: number;
}

export class ObjectDetector {
  private model: ObjectDetection | null = null;
  private config: DetectionConfig = {
    targetClasses: ['car', 'person', 'truck', 'bus', 'bicycle', 'motorcycle'],
    minConfidence: 0.5,
    maxDetections: 20,
  };

  async load(): Promise<void> {
    const startTime = performance.now();
    this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`[ObjectDetector] Model loaded in ${loadTime}ms`);
  }

  async detect(video: HTMLVideoElement): Promise<Detection[]> {
    // Return empty array if model not loaded or video not ready
    if (!this.model || !video || video.videoWidth === 0) {
      return [];
    }

    const predictions = await this.model.detect(video, this.config.maxDetections);

    // Filter to target classes with sufficient confidence
    const filtered = predictions.filter(
      (pred) =>
        this.config.targetClasses.includes(pred.class) && pred.score >= this.config.minConfidence,
    );

    // Map to Detection interface
    return filtered.map((pred) => ({
      class: pred.class,
      score: pred.score,
      bbox: pred.bbox as [number, number, number, number],
    }));
  }

  isLoaded(): boolean {
    return this.model !== null;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log('[ObjectDetector] Model disposed');
    }
  }
}
