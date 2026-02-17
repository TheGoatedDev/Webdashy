import { FilesetResolver, ObjectDetector as MPObjectDetector } from '@mediapipe/tasks-vision';

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

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';

export class ObjectDetector {
  private detector: MPObjectDetector | null = null;
  private config: DetectionConfig = {
    targetClasses: ['car', 'person', 'truck', 'bus', 'bicycle', 'motorcycle'],
    minConfidence: 0.5,
    maxDetections: 20,
  };

  async load(): Promise<void> {
    const startTime = performance.now();
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    this.detector = await MPObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite',
      },
      runningMode: 'VIDEO',
      scoreThreshold: this.config.minConfidence,
      maxResults: this.config.maxDetections,
      categoryAllowlist: this.config.targetClasses,
    });
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`[ObjectDetector] Model loaded in ${loadTime}ms`);
  }

  detect(video: HTMLVideoElement, timestampMs: number): Detection[] {
    if (!this.detector || !video || video.videoWidth === 0) {
      return [];
    }

    const result = this.detector.detectForVideo(video, timestampMs);

    return result.detections
      .filter((d) => d.boundingBox && d.categories.length > 0)
      .map((d) => {
        const box = d.boundingBox as {
          originX: number;
          originY: number;
          width: number;
          height: number;
        };
        const category = d.categories[0];
        return {
          class: category.categoryName,
          score: category.score,
          bbox: [box.originX, box.originY, box.width, box.height] as [
            number,
            number,
            number,
            number,
          ],
        };
      });
  }

  isLoaded(): boolean {
    return this.detector !== null;
  }

  dispose(): void {
    if (this.detector) {
      this.detector.close();
      this.detector = null;
      console.log('[ObjectDetector] Model disposed');
    }
  }
}
