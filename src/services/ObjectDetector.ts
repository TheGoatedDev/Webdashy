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

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite';

export interface CropRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface DetectionResult {
  detections: Detection[];
  frame: ImageBitmap;
  cropRegion: CropRegion;
}

export class ObjectDetector {
  private detector: MPObjectDetector | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameCanvas: HTMLCanvasElement;
  private frameCtx: CanvasRenderingContext2D;
  private lastFrame: ImageBitmap | null = null;
  private config: DetectionConfig = {
    targetClasses: [
      'car',
      'person',
      'truck',
      'bus',
      'bicycle',
      'motorcycle',
      'bird',
      'cat',
      'dog',
      'horse',
      'sheep',
      'cow',
      'elephant',
      'bear',
      'zebra',
      'giraffe',
    ],
    minConfidence: 0.5,
    maxDetections: 20,
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 0;
    this.canvas.height = 0;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Could not get 2D context for ObjectDetector canvas');
    this.ctx = ctx;

    this.frameCanvas = document.createElement('canvas');
    this.frameCanvas.width = 0;
    this.frameCanvas.height = 0;
    const frameCtx = this.frameCanvas.getContext('2d', { willReadFrequently: false });
    if (!frameCtx) throw new Error('Could not get 2D context for ObjectDetector frameCanvas');
    this.frameCtx = frameCtx;
  }

  async load(): Promise<void> {
    const startTime = performance.now();

    const vision = await FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm`,
    );

    this.detector = await MPObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      categoryAllowlist: this.config.targetClasses,
      scoreThreshold: this.config.minConfidence,
      maxResults: this.config.maxDetections,
    });

    const loadTime = Math.round(performance.now() - startTime);
    console.log(`[ObjectDetector] Model loaded in ${loadTime}ms`);
  }

  async detect(
    video: HTMLVideoElement,
    cropTop: number,
    cropBottom: number,
    fullWidthDetection = false,
    cropCenterX = 50,
  ): Promise<DetectionResult | null> {
    if (!this.detector || !video || video.videoWidth === 0) {
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Capture full frame snapshot before inference
    if (this.frameCanvas.width !== vw || this.frameCanvas.height !== vh) {
      this.frameCanvas.width = vw;
      this.frameCanvas.height = vh;
    }
    this.frameCtx.drawImage(video, 0, 0, vw, vh);

    const sy = Math.round((vh * cropTop) / 100);
    const sh = Math.round((vh * (cropBottom - cropTop)) / 100);

    // Center-crop horizontally when source is wider than tall (skip when fullWidthDetection)
    let sx: number;
    let sw: number;
    if (!fullWidthDetection && vw > sh) {
      sw = sh;
      sx = Math.round((cropCenterX / 100) * (vw - sw));
    } else {
      sw = vw;
      sx = 0;
    }

    // Resize canvas only when dimensions change to avoid GPU texture reallocation
    if (this.canvas.width !== sw || this.canvas.height !== sh) {
      this.canvas.width = sw;
      this.canvas.height = sh;
    }

    // Draw cropped video region onto canvas (1:1 pixel mapping — no scaling)
    this.ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    const results = this.detector.detectForVideo(this.canvas, performance.now());

    const detections = (results.detections ?? [])
      .map((det) => {
        const cat = det.categories?.[0];
        const box = det.boundingBox;
        if (!cat || !box) return null;

        // Translate from crop-local coords back to full video pixel space
        const x = box.originX + sx;
        const y = box.originY + sy;
        const w = box.width;
        const h = box.height;

        // Clip to full video bounds
        const clampedX = Math.max(0, x);
        const clampedY = Math.max(0, y);
        const clampedW = Math.min(w, vw - clampedX);
        const clampedH = Math.min(h, vh - clampedY);

        if (clampedW <= 0 || clampedH <= 0) return null;

        return {
          class: cat.categoryName,
          score: cat.score,
          bbox: [clampedX, clampedY, clampedW, clampedH] as [number, number, number, number],
        };
      })
      .filter((d): d is Detection => d !== null);

    const frame = await createImageBitmap(this.frameCanvas);
    this.lastFrame?.close();
    this.lastFrame = frame;

    return { detections, frame, cropRegion: { sx, sy, sw, sh } };
  }

  async updateConfig(config: Partial<DetectionConfig>): Promise<void> {
    Object.assign(this.config, config);
    if (this.detector) {
      this.detector.setOptions({
        scoreThreshold: this.config.minConfidence,
        maxResults: this.config.maxDetections,
      });
    }
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
    this.lastFrame?.close();
    this.lastFrame = null;
  }
}
