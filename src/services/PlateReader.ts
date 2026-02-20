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
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
  }

  private async ensureInit(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  async read(vehicleImageBlob: Blob): Promise<PlateResult | null> {
    if (this.queue >= PLATE_CONFIG.MAX_QUEUE) {
      return null;
    }
    this.queue++;
    try {
      await this.ensureInit();
      if (!this.worker) return null;

      // Preprocess: take lower PLATE_REGION_FRACTION of the vehicle crop
      const bitmap = await createImageBitmap(vehicleImageBlob);
      const regionHeight = Math.round(
        bitmap.height * PLATE_CONFIG.PLATE_REGION_FRACTION,
      );
      const regionY = bitmap.height - regionHeight;

      const canvas = new OffscreenCanvas(bitmap.width, regionHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return null;
      }

      // Apply grayscale + high contrast to improve OCR accuracy
      ctx.filter = 'grayscale(1) contrast(3) brightness(1.1)';
      ctx.drawImage(
        bitmap,
        0,
        regionY,
        bitmap.width,
        regionHeight,
        0,
        0,
        bitmap.width,
        regionHeight,
      );
      bitmap.close();

      const plateRegionBlob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: 0.9,
      });

      const result = await this.worker.recognize(plateRegionBlob);
      const rawText = result.data.text.trim();
      const text = rawText.replace(/[^A-Z0-9]/g, '');
      const confidence = result.data.confidence;

      if (
        confidence < PLATE_CONFIG.MIN_OCR_CONFIDENCE ||
        text.length < PLATE_CONFIG.MIN_TEXT_LENGTH
      ) {
        return null;
      }

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
