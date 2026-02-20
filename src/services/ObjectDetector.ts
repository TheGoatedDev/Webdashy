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

const COCO_LABELS: string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush',
];

interface LetterboxInfo {
  scale: number;
  padX: number;
  padY: number;
  cropOffsetX: number;
  cropOffsetY: number;
}

export class ObjectDetector {
  private session: ort.InferenceSession | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: DetectionConfig = {
    targetClasses: [
      'car', 'person', 'truck', 'bus', 'bicycle', 'motorcycle',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
    ],
    minConfidence: 0.5,
    maxDetections: 20,
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 640;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D context for ObjectDetector canvas');
    this.ctx = ctx;
  }

  async load(): Promise<void> {
    const startTime = performance.now();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    this.session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`[ObjectDetector] Model loaded in ${loadTime}ms`);
  }

  async detect(
    video: HTMLVideoElement,
    cropTop: number,
    cropBottom: number,
  ): Promise<Detection[]> {
    if (!this.session || !video || video.videoWidth === 0) {
      return [];
    }

    const { tensor, letterbox } = this.preprocess(video, cropTop, cropBottom);
    const feeds: Record<string, ort.Tensor> = { images: tensor };
    const results = await this.session.run(feeds);
    const outputName = this.session.outputNames[0];
    const output = results[outputName];
    return this.postprocess(output, letterbox, video.videoWidth, video.videoHeight);
  }

  private preprocess(
    video: HTMLVideoElement,
    cropTop: number,
    cropBottom: number,
  ): { tensor: ort.Tensor; letterbox: LetterboxInfo } {
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const sy = Math.round(vh * cropTop / 100);
    const sh = Math.round(vh * (cropBottom - cropTop) / 100);

    // Center-crop horizontally when source is wider than tall
    let sx: number;
    let sw: number;
    if (vw > sh) {
      sw = sh;
      sx = Math.round((vw - sw) / 2);
    } else {
      sw = vw;
      sx = 0;
    }

    const cropOffsetX = sx;
    const cropOffsetY = sy;

    // Calculate letterbox scale using cropped dimensions
    const scale = Math.min(640 / sw, 640 / sh);
    const scaledW = Math.round(sw * scale);
    const scaledH = Math.round(sh * scale);
    const padX = (640 - scaledW) / 2;
    const padY = (640 - scaledH) / 2;

    // Fill with gray padding
    this.ctx.fillStyle = 'rgb(114, 114, 114)';
    this.ctx.fillRect(0, 0, 640, 640);

    // Draw cropped region into letterboxed area
    this.ctx.drawImage(
      video,
      sx, sy, sw, sh,
      padX, padY, scaledW, scaledH,
    );

    const imageData = this.ctx.getImageData(0, 0, 640, 640);
    const { data } = imageData;
    const numPixels = 640 * 640;
    const float32 = new Float32Array(3 * numPixels);

    for (let i = 0; i < numPixels; i++) {
      float32[i] = data[i * 4] / 255;               // R
      float32[numPixels + i] = data[i * 4 + 1] / 255; // G
      float32[numPixels * 2 + i] = data[i * 4 + 2] / 255; // B
    }

    const tensor = new ort.Tensor('float32', float32, [1, 3, 640, 640]);
    return { tensor, letterbox: { scale, padX, padY, cropOffsetX, cropOffsetY } };
  }

  private postprocess(
    output: ort.Tensor,
    letterbox: LetterboxInfo,
    videoWidth: number,
    videoHeight: number,
  ): Detection[] {
    const { scale, padX, padY, cropOffsetX, cropOffsetY } = letterbox;
    const data = output.data as Float32Array;
    const dims = output.dims;
    // YOLOv8 output shape: [1, 84, num_detections] — 84 = 4 bbox + 80 classes
    const numDetections = dims[2];

    const detections: Detection[] = [];

    for (let i = 0; i < numDetections; i++) {
      // cx, cy, w, h in model space (640x640)
      const cx = data[i];
      const cy = data[numDetections + i];
      const w = data[2 * numDetections + i];
      const h = data[3 * numDetections + i];

      // Find best class
      let maxScore = 0;
      let maxClassIdx = 0;
      for (let c = 0; c < 80; c++) {
        const score = data[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassIdx = c;
        }
      }

      if (maxScore < this.config.minConfidence) continue;

      const className = COCO_LABELS[maxClassIdx];
      if (!this.config.targetClasses.includes(className)) continue;

      // Map from model space to full-frame video pixel space
      const x = (cx - w / 2 - padX) / scale + cropOffsetX;
      const y = (cy - h / 2 - padY) / scale + cropOffsetY;
      const bw = w / scale;
      const bh = h / scale;

      // Clip to full video bounds
      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      const clampedW = Math.min(bw, videoWidth - clampedX);
      const clampedH = Math.min(bh, videoHeight - clampedY);

      if (clampedW <= 0 || clampedH <= 0) continue;

      detections.push({
        class: className,
        score: maxScore,
        bbox: [clampedX, clampedY, clampedW, clampedH],
      });
    }

    // Non-Maximum Suppression
    return this.nms(detections, 0.45).slice(0, this.config.maxDetections);
  }

  private nms(detections: Detection[], iouThreshold: number): Detection[] {
    const sorted = [...detections].sort((a, b) => b.score - a.score);
    const keep: Detection[] = [];

    for (const det of sorted) {
      let suppressed = false;
      for (const kept of keep) {
        if (this.iou(det.bbox, kept.bbox) > iouThreshold) {
          suppressed = true;
          break;
        }
      }
      if (!suppressed) keep.push(det);
    }

    return keep;
  }

  private iou(
    a: [number, number, number, number],
    b: [number, number, number, number],
  ): number {
    const ax2 = a[0] + a[2];
    const ay2 = a[1] + a[3];
    const bx2 = b[0] + b[2];
    const by2 = b[1] + b[3];

    const interX1 = Math.max(a[0], b[0]);
    const interY1 = Math.max(a[1], b[1]);
    const interX2 = Math.min(ax2, bx2);
    const interY2 = Math.min(ay2, by2);

    const interW = Math.max(0, interX2 - interX1);
    const interH = Math.max(0, interY2 - interY1);
    const interArea = interW * interH;

    const aArea = a[2] * a[3];
    const bArea = b[2] * b[3];
    const unionArea = aArea + bArea - interArea;

    return unionArea === 0 ? 0 : interArea / unionArea;
  }

  isLoaded(): boolean {
    return this.session !== null;
  }

  dispose(): void {
    if (this.session) {
      this.session.release().catch(() => {});
      this.session = null;
      console.log('[ObjectDetector] Model disposed');
    }
  }
}
