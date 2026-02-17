import * as ort from 'onnxruntime-web';
import { ObjectDetector } from './ObjectDetector';

// Run ONNX directly in this worker — no nested workers
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

const detector = new ObjectDetector();

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'load') {
    try {
      await detector.load();
      self.postMessage({ type: 'loaded' });
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) });
    }
    return;
  }

  if (type === 'detect') {
    const frame = e.data.frame as ImageBitmap;
    try {
      const detections = await detector.detect(frame);
      self.postMessage({ type: 'detections', detections });
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) });
    } finally {
      frame.close();
    }
  }
};
