import { PSM, createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { PLATE_CONFIG } from '../config/plateConfig';

export interface PlateResult {
  text: string;
  confidence: number;
  plateRegionBlob: Blob;
}

export class PlateReader {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private queue = 0;

  private async init(): Promise<void> {
    this.worker = await createWorker('eng');
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
  }

  private async ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  async read(
    vehicleBitmap: ImageBitmap,
    config: { ocrConfidence: number; minTextLength: number },
  ): Promise<PlateResult | null> {
    if (this.queue >= PLATE_CONFIG.MAX_QUEUE) {
      return null;
    }
    this.queue++;
    try {
      await this.ensureInit();
      if (!this.worker) return null;

      // Preprocess: take lower PLATE_REGION_FRACTION of the vehicle crop
      const regionHeight = Math.round(
        vehicleBitmap.height * PLATE_CONFIG.PLATE_REGION_FRACTION,
      );
      const regionY = vehicleBitmap.height - regionHeight;

      // Upscale small plate regions — Tesseract needs ~20-30px character height minimum
      const MIN_HEIGHT = 80;
      const scale = regionHeight < MIN_HEIGHT ? MIN_HEIGHT / regionHeight : 1;
      const canvasW = Math.round(vehicleBitmap.width * scale);
      const canvasH = Math.round(regionHeight * scale);

      const canvas = new OffscreenCanvas(canvasW, canvasH);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw the plate region (upscaled if needed)
      ctx.drawImage(
        vehicleBitmap,
        0,
        regionY,
        vehicleBitmap.width,
        regionHeight,
        0,
        0,
        canvasW,
        canvasH,
      );

      // Manual grayscale + moderate contrast via pixel manipulation.
      // ctx.filter on OffscreenCanvas can be silently unsupported — avoid it.
      const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
      const data = imageData.data;
      const CONTRAST = 1.8;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.min(255, Math.max(0, (gray - 128) * CONTRAST + 128));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
        // alpha unchanged
      }
      ctx.putImageData(imageData, 0, 0);

      // Pass canvas directly to Tesseract — avoids a JPEG re-encode/decode round-trip.
      // Tesseract.js internally calls convertToBlob() as PNG when given a canvas.
      const result = await this.worker.recognize(canvas);
      const rawText = result.data.text.trim();
      console.log('[PlateReader] raw OCR output:', JSON.stringify(rawText), 'confidence:', result.data.confidence);

      const text = rawText.replace(/[^A-Z0-9]/g, '');
      const confidence = result.data.confidence;

      if (
        confidence < config.ocrConfidence ||
        text.length < config.minTextLength
      ) {
        return null;
      }

      // Generate PNG blob for storage only after OCR succeeds
      const plateRegionBlob = await canvas.convertToBlob({ type: 'image/png' });
      return { text, confidence, plateRegionBlob };
    } finally {
      this.queue--;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initPromise = null;
    }
  }
}
