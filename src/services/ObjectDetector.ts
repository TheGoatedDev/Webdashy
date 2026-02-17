import * as ort from 'onnxruntime-web';

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

const MODEL_URL = '/models/yolov8n.onnx';

const COCO_LABELS = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
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
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
];

type DrawingContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export class ObjectDetector {
  private session: ort.InferenceSession | null = null;
  private config: DetectionConfig = {
    targetClasses: ['car', 'person', 'truck', 'bus', 'bicycle', 'motorcycle'],
    minConfidence: 0.5,
    maxDetections: 20,
  };
  private targetClassSet: Set<string>;
  private inputName = 'images';
  private outputName = 'output0';
  private canvasCtx: DrawingContext | null = null;
  private letterbox: { scale: number; padX: number; padY: number } = { scale: 1, padX: 0, padY: 0 };

  constructor() {
    this.targetClassSet = new Set(this.config.targetClasses);
  }

  async load(): Promise<void> {
    const startTime = performance.now();
    this.session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['webgl', 'wasm'],
    });
    this.inputName = this.session.inputNames[0];
    this.outputName = this.session.outputNames[0];
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`[ObjectDetector] YOLOv8n loaded in ${loadTime}ms`);
  }

  private getCanvasCtx(): DrawingContext {
    if (this.canvasCtx) return this.canvasCtx;

    const MODEL_SIZE = 640;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
      this.canvasCtx = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = MODEL_SIZE;
      canvas.height = MODEL_SIZE;
      this.canvasCtx = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;
    }
    return this.canvasCtx;
  }

  private preprocess(video: HTMLVideoElement): ort.Tensor {
    const MODEL_SIZE = 640;
    const ctx = this.getCanvasCtx();

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Letterbox: scale to fit within 640x640, maintaining aspect ratio
    const scale = Math.min(MODEL_SIZE / vw, MODEL_SIZE / vh);
    const scaledW = Math.round(vw * scale);
    const scaledH = Math.round(vh * scale);
    const padX = (MODEL_SIZE - scaledW) / 2;
    const padY = (MODEL_SIZE - scaledH) / 2;

    this.letterbox = { scale, padX, padY };

    // Fill with gray (YOLO standard padding value)
    ctx.fillStyle = 'rgb(114, 114, 114)';
    ctx.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE);
    ctx.drawImage(video, padX, padY, scaledW, scaledH);

    const imageData = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = imageData.data;

    // Convert RGBA Uint8Array to Float32 NCHW tensor [1, 3, 640, 640]
    const numPixels = MODEL_SIZE * MODEL_SIZE;
    const float32 = new Float32Array(3 * numPixels);
    for (let i = 0; i < numPixels; i++) {
      float32[i] = rgba[i * 4] / 255; // R
      float32[numPixels + i] = rgba[i * 4 + 1] / 255; // G
      float32[2 * numPixels + i] = rgba[i * 4 + 2] / 255; // B
    }

    return new ort.Tensor('float32', float32, [1, 3, MODEL_SIZE, MODEL_SIZE]);
  }

  private postprocess(output: ort.Tensor, videoWidth: number, videoHeight: number): Detection[] {
    const data = output.data as Float32Array;
    // Output shape: [1, 84, 8400]
    // Rows 0-3: cx, cy, w, h in model space (640x640)
    // Rows 4-83: class scores for 80 COCO classes
    const NUM_CANDIDATES = 8400;

    const candidates: Detection[] = [];

    for (let i = 0; i < NUM_CANDIDATES; i++) {
      const cx = data[0 * NUM_CANDIDATES + i];
      const cy = data[1 * NUM_CANDIDATES + i];
      const w = data[2 * NUM_CANDIDATES + i];
      const h = data[3 * NUM_CANDIDATES + i];

      // Find best class and its score
      let maxScore = 0;
      let classIdx = 0;
      for (let row = 4; row < 84; row++) {
        const score = data[row * NUM_CANDIDATES + i];
        if (score > maxScore) {
          maxScore = score;
          classIdx = row - 4;
        }
      }

      if (maxScore < this.config.minConfidence) continue;

      const label = COCO_LABELS[classIdx];
      if (!this.targetClassSet.has(label)) continue;

      // Convert from model space to video pixel space using letterbox info
      const { scale, padX, padY } = this.letterbox;
      const x = (cx - w / 2 - padX) / scale;
      const y = (cy - h / 2 - padY) / scale;
      const bw = w / scale;
      const bh = h / scale;

      // Clip to video bounds
      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      const clampedW = Math.min(bw, videoWidth - clampedX);
      const clampedH = Math.min(bh, videoHeight - clampedY);

      candidates.push({
        class: label,
        score: maxScore,
        bbox: [clampedX, clampedY, clampedW, clampedH],
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Apply NMS
    const kept = this.nms(candidates);

    return kept.slice(0, this.config.maxDetections);
  }

  private nms(detections: Detection[], iouThreshold = 0.45): Detection[] {
    const result: Detection[] = [];
    const suppressed = new Array<boolean>(detections.length).fill(false);

    for (let i = 0; i < detections.length; i++) {
      if (suppressed[i]) continue;
      result.push(detections[i]);
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed[j]) continue;
        if (this.iou(detections[i].bbox, detections[j].bbox) > iouThreshold) {
          suppressed[j] = true;
        }
      }
    }

    return result;
  }

  private iou(a: [number, number, number, number], b: [number, number, number, number]): number {
    const [ax, ay, aw, ah] = a;
    const [bx, by, bw, bh] = b;

    const interX1 = Math.max(ax, bx);
    const interY1 = Math.max(ay, by);
    const interX2 = Math.min(ax + aw, bx + bw);
    const interY2 = Math.min(ay + ah, by + bh);

    const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
    if (interArea === 0) return 0;

    const aArea = aw * ah;
    const bArea = bw * bh;

    return interArea / (aArea + bArea - interArea);
  }

  async detect(video: HTMLVideoElement, _timestampMs: number): Promise<Detection[]> {
    if (!this.session || !video || video.videoWidth === 0) {
      return [];
    }

    const inputTensor = this.preprocess(video);
    const output = await this.session.run({ [this.inputName]: inputTensor });
    const outputTensor = output[this.outputName];

    return this.postprocess(outputTensor, video.videoWidth, video.videoHeight);
  }

  isLoaded(): boolean {
    return this.session !== null;
  }

  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
      this.canvasCtx = null;
      console.log('[ObjectDetector] Model disposed');
    }
  }
}
